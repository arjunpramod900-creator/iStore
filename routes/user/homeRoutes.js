import express from "express";
import authController from "../../controllers/user/authController.js";

const router = express.Router();

router.get("/", authController.loadHome);

export default router;