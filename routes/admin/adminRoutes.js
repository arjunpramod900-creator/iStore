import express from "express"
import adminAuthMiddleware from "../../middleware/adminAuthMiddleware.js"
import {

loadUsers,
toggleBlockUser,
viewUserDetails,
deleteUser

}

from "../../controllers/admin/adminUserController.js"

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

export default router
