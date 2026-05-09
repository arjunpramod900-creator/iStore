import express from "express"

const router = express.Router()



import multer from "multer"

const storage = multer.memoryStorage()

const upload = multer({

storage

})



import adminAuthMiddleware
from "../../middleware/adminAuthMiddleware.js"



import {

loadProducts,

renderAddProduct,

addProduct,

deleteProduct

}

from "../../controllers/admin/adminProductController.js"



/* ============================
   PRODUCT MANAGEMENT
============================ */

router.get(

"/products",

adminAuthMiddleware,

loadProducts

)



/* ============================
   RENDER ADD PRODUCT
============================ */

router.get(

"/products/add",

adminAuthMiddleware,

renderAddProduct

)



/* ============================
   ADD PRODUCT
============================ */

router.post(

"/products/add",

adminAuthMiddleware,

upload.fields([

{

name: "thumbnail",

maxCount: 1

},

{

name: "variantImages",

maxCount: 10

}

]),

addProduct

)



/* ============================
   DELETE PRODUCT
============================ */

router.patch(

"/products/:id",

adminAuthMiddleware,

deleteProduct

)



export default router