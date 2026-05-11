import express from "express"

const router = express.Router()

import {
    loadAllProducts
} from "../../controllers/user/productController.js"

router.get(
    "/products",
    loadAllProducts
)

export default router