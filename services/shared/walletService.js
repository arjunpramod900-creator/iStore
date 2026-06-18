import Wallet from "../../models/Wallet.js";
import WalletTransaction from "../../models/WalletTransaction.js";

/* =========================================
   CREATE WALLET
========================================= */
export const createWallet = async (userId) => {
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        wallet = await Wallet.create({ userId, balance: 0 });
    }
    return wallet;
};

/* =========================================
   GET WALLET
========================================= */
export const getWallet = async (userId) => {
    return await createWallet(userId);
};

/* =========================================
   GET BALANCE
========================================= */
export const getBalance = async (userId) => {
    const wallet = await createWallet(userId);
    return wallet.balance;
};

/* =========================================
   CREDIT WALLET
   FIX: deduplication guard prevents double
   refund on retries for full-order refunds.
   NOTE: item-level refunds pass a unique
   transactionId to distinguish them.
========================================= */
export const creditWallet = async ({
    userId,
    amount,
    transactionType,
    description    = "",
    orderId        = null,
    transactionId  = null,   /* optional unique key for item-level dedup */
}) => {
    /* DEDUPLICATION — skip if already processed */
    if (orderId) {
        const dedupQuery = { orderId, transactionType };

        /* For item-level transactions use transactionId (itemId) to distinguish
           multiple credits on the same order */
        if (transactionId) {
            dedupQuery.description = { $regex: transactionId };
        }

        const existing = await WalletTransaction.findOne(dedupQuery);
        if (existing) {
            const wallet = await createWallet(userId);
            return wallet;
        }
    }

    const wallet = await createWallet(userId);
    wallet.balance += amount;
    await wallet.save();

    await WalletTransaction.create({
        walletId:     wallet._id,
        userId,
        orderId,
        amount,
        type:         "Credit",
        transactionType,
        description,
        balanceAfter: wallet.balance,
    });

    return wallet;
};

/* =========================================
   DEBIT WALLET
========================================= */
export const debitWallet = async ({
    userId,
    amount,
    transactionType,
    description = "",
    orderId     = null,
}) => {
    const wallet = await createWallet(userId);

    if (wallet.balance < amount) {
        return { success: false, message: "Insufficient wallet balance" };
    }

    wallet.balance -= amount;
    await wallet.save();

    await WalletTransaction.create({
        walletId:     wallet._id,
        userId,
        orderId,
        amount,
        type:         "Debit",
        transactionType,
        description,
        balanceAfter: wallet.balance,
    });

    return { success: true, wallet };
};