import express from "express";
const router = express.Router();

import adminAuthMiddleware from "../../middleware/adminAuthMiddleware.js";

import {
  loadOffersPage,
  addOffer,
  editOffer,
  deleteOffer,
} from "../../controllers/admin/adminOfferController.js";

/* =========================================
   OFFERS LIST
========================================= */

router.get("/offers", adminAuthMiddleware, loadOffersPage);

/* =========================================
   ADD OFFER
========================================= */

router.post("/offers/add", adminAuthMiddleware, addOffer);

/* =========================================
   EDIT OFFER
========================================= */

router.post("/offers/edit/:id", adminAuthMiddleware, editOffer);

/* =========================================
   DELETE OFFER
========================================= */

router.patch("/offers/delete/:id", adminAuthMiddleware, deleteOffer);

export default router;
