import express from "express"
import adminAuthMiddleware from "../../middleware/adminAuthMiddleware.js"
import {

loadUsers,
toggleBlockUser

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



router.patch(

"/block-user/:id",

adminAuthMiddleware,

toggleBlockUser

)

export default router
