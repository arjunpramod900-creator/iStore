import express from "express"

const router = express.Router()

import {

    loadAllProducts,

    loadProductDetails

} from "../../controllers/user/productController.js"



/* ================================
   ALL PRODUCTS
================================ */

router.get(

    "/products",

    loadAllProducts

)



/* ================================
   PRODUCT DETAILS
================================ */

router.get(

    "/products/:id",

    loadProductDetails

)



export default router