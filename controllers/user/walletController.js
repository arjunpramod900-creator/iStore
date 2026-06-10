import {
  loadWalletService,
} from "../../services/user/walletService.js";

/* =========================================
   LOAD WALLET PAGE
========================================= */

export const loadWalletPage =
async (
  req,
  res,
) => {

  try {

    const userId =
      req.session.userId;

    const {
      page = 1,
    } = req.query;

    const response =
      await loadWalletService(
        userId,
        page,
      );

    res.render(
      "user/wallet",
      {

        page: "wallet",

        wallet:
          response.wallet,

        transactions:
          response.transactions,

        pagination:
          response.pagination,

      },
    );

  }

  catch (error) {

    console.log(
      "Load Wallet Error:",
      error,
    );

    return res.redirect(
      "/profile",
    );

  }

};