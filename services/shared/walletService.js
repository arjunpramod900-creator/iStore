import Wallet from "../../models/Wallet.js";

import WalletTransaction from "../../models/WalletTransaction.js";

/* =========================================
   CREATE WALLET
========================================= */

export const createWallet =
async (userId) => {

    let wallet =
    await Wallet.findOne({
        userId,
    });

    if (!wallet) {

        wallet =
        await Wallet.create({

            userId,

            balance: 0,

        });

    }

    return wallet;

};

/* =========================================
   GET WALLET
========================================= */

export const getWallet =
async (userId) => {

    return await createWallet(
        userId
    );

};

/* =========================================
   GET BALANCE
========================================= */

export const getBalance =
async (userId) => {

    const wallet =
    await createWallet(
        userId
    );

    return wallet.balance;

};

/* =========================================
   CREDIT WALLET
========================================= */

export const creditWallet =
async ({

    userId,

    amount,

    transactionType,

    description = "",

    orderId = null,

}) => {

    const wallet =
    await createWallet(
        userId
    );

    wallet.balance += amount;

    await wallet.save();

    await WalletTransaction.create({

        walletId:
        wallet._id,

        userId,

        orderId,

        amount,

        type: "Credit",

        transactionType,

        description,

        balanceAfter:
        wallet.balance,

    });

    return wallet;

};

/* =========================================
   DEBIT WALLET
========================================= */

export const debitWallet =
async ({

    userId,

    amount,

    transactionType,

    description = "",

    orderId = null,

}) => {

    const wallet =
    await createWallet(
        userId
    );

    if (
        wallet.balance < amount
    ) {

        return {

            success: false,

            message:
            "Insufficient wallet balance",

        };

    }

    wallet.balance -= amount;

    await wallet.save();

    await WalletTransaction.create({

        walletId:
        wallet._id,

        userId,

        orderId,

        amount,

        type: "Debit",

        transactionType,

        description,

        balanceAfter:
        wallet.balance,

    });

    return {

        success: true,

        wallet,

    };

};