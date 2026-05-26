import express from "express"

import {

    isLoggedIn

} from "../../middleware/authMiddleware.js"

import userBlockCheckMiddleware
from "../../middleware/userBlockCheckMiddleware.js"

import {

    loadCheckoutPage

} from "../../controllers/user/checkoutController.js"

const router =
express.Router()



/* =========================================
   LOAD CHECKOUT
========================================= */

router.get(

    "/checkout",

    isLoggedIn,

    userBlockCheckMiddleware,

    loadCheckoutPage

)



export default router