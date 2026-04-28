import User from "../../models/User.js"



/* ============================
   LOAD USERS PAGE
============================ */

export const loadUsers = async (req, res) => {

try {

/* FETCH USERS */

const users =
await User.find()
.sort({ createdAt: -1 })



/* COUNT USERS */

const totalUsers =
await User.countDocuments()

const activeUsers =
await User.countDocuments({
isBlocked: false
})

const blockedUsers =
await User.countDocuments({
isBlocked: true
})



/* RENDER PAGE */

res.render(
"admin/users",
{
page: "users",
users,
totalUsers,
activeUsers,
blockedUsers
}
)

}

catch (error) {

console.log(error)

res.redirect("/admin/dashboard")

}

}