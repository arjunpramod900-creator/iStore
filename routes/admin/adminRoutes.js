import express from "express"
import adminAuthMiddleware from "../../middleware/adminAuthMiddleware.js"
import {
   loadUsers,
   toggleBlockUser,
   viewUserDetails,
   deleteUser
}
from "../../controllers/admin/adminUserController.js"

import upload from "../../middleware/multer.js"
import {

loadCategories,
renderAddCategory,
addCategory,
renderEditCategory,
updateCategory,
deleteCategory,
restoreCategory,
permanentDeleteCategory

}

from "../../controllers/admin/adminCategoryController.js"

import {
loadProducts,
renderAddProduct,
addProduct,
renderEditProduct,
updateProduct,
deleteProduct
}
from "../../controllers/admin/adminProductController.js"

const router = express.Router()



/* ============================
   USER MANAGEMENT
============================ */


router.get(

"/users",

adminAuthMiddleware,

loadUsers

)

router.get(

"/users/:id",

adminAuthMiddleware,

viewUserDetails

)

router.patch(

"/block-user/:id",

adminAuthMiddleware,

toggleBlockUser

)

router.delete(
"/users/delete/:id",
adminAuthMiddleware,
deleteUser
)

/* ============================
   CATEGORY MANAGEMENT
============================ */

router.get(
"/categories",
adminAuthMiddleware,
loadCategories
)

router.get(
"/add-category",
adminAuthMiddleware,
renderAddCategory
)

router.post(
"/add-category",
adminAuthMiddleware,
upload.single("image"),
addCategory
)

/* EDIT CATEGORY */

router.get(
"/edit-category/:id",
adminAuthMiddleware,
renderEditCategory
)

router.post(
"/edit-category/:id",
adminAuthMiddleware,
upload.single("image"),
updateCategory
)

/* SOFT DELETE */

router.patch(
"/delete-category/:id",
adminAuthMiddleware,
deleteCategory
)

/* RESTORE */

router.patch(
"/restore-category/:id",
adminAuthMiddleware,
restoreCategory
)

/* PERMANENT DELETE */

router.delete(
"/permanent-delete-category/:id",
adminAuthMiddleware,
permanentDeleteCategory
)

/* ============================
   PRODUCT MANAGEMENT
============================ */

router.get(

"/products",

adminAuthMiddleware,

loadProducts

)



router.get(

"/products/add",

adminAuthMiddleware,

renderAddProduct

)



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

/* edit product*/

router.get(

"/products/edit/:id",

adminAuthMiddleware,

renderEditProduct

)

router.post(

"/products/edit/:id",

adminAuthMiddleware,

upload.fields([

{
name: "thumbnail",
maxCount: 1
}

]),

updateProduct

)


router.patch(

"/delete-product/:id",

adminAuthMiddleware,

deleteProduct

)

export default router
