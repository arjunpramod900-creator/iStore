import express from "express"
import adminAuthMiddleware from "../../middleware/adminAuthMiddleware.js"

const router = express.Router()



/* ============================
   USER MANAGEMENT
============================ */

router.get(
"/users",
adminAuthMiddleware,
(req, res) => {

res.render(
"admin/users",
{
page: "users"
}
)

}
)



export default router