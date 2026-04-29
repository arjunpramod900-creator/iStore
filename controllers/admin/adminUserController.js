
import User from "../../models/User.js"

/* ============================
   LOAD USERS PAGE
============================ */

export const loadUsers = async (req, res) => {

try {

/* QUERY PARAMS */

const search =
req.query.search || ""

const status =
req.query.status || "all"

const joined =
req.query.joined || "all"

const page =
parseInt(req.query.page) || 1

const limit = 5   // users per page

const skip =
(page - 1) * limit



let query = {}

/* SEARCH */

if (search) {

query.$or = [

{
fullName: {
$regex: search,
$options: "i"
}
},

{
email: {
$regex: search,
$options: "i"
}
},

{
phoneNumber: {
$regex: search,
$options: "i"
}
}

]

}



/* STATUS */

if (status === "active") {

query.isBlocked = false

}

if (status === "blocked") {

query.isBlocked = true

}



/* JOINED FILTER */

if (joined !== "all") {

const today = new Date()

let dateFilter

if (joined === "30days") {

dateFilter =
new Date(today.setDate(today.getDate() - 30))

}

if (joined === "year") {

dateFilter =
new Date(today.setFullYear(today.getFullYear() - 1))

}

query.createdAt = {

$gte: dateFilter

}

}



/* FETCH USERS WITH PAGINATION */

const users =
await User.find(query)
.sort({ createdAt: -1 })
.skip(skip)
.limit(limit)



/* TOTAL FILTERED USERS */

const totalFilteredUsers =
await User.countDocuments(query)



/* TOTAL PAGES */

const totalPages =
Math.ceil(
totalFilteredUsers / limit
)



/* COUNTS */

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



res.render(
"admin/users",
{
page: "users",
users,

totalUsers,
activeUsers,
blockedUsers,

search,
status,
joined,

currentPage: page,
totalPages,
limit,
totalFilteredUsers
}
)

}

catch (error) {

console.log(error)

res.redirect("/admin/dashboard")

}

}
/* ============================
   BLOCK / UNBLOCK USER
============================ */

export const toggleBlockUser = async (req, res) => {

try {

const userId =
req.params.id



const user =
await User.findById(userId)



if (!user) {

return res.json({
success: false
})

}



/* TOGGLE STATUS */

user.isBlocked =
!user.isBlocked



await user.save()



res.json({
success: true
})

}

catch (error) {

console.log(error)

res.json({
success: false
})

}

}