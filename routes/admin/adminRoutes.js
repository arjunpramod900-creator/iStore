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
   addCategory
 } 
from "../../controllers/admin/adminCategoryController.js"
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

export default router
