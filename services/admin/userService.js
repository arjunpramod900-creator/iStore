import User from "../../models/User.js"



/* ============================
   LOAD USERS
============================ */

export const getUsersService =
async (queryData) => {

const search =
queryData.search || ""

const status =
queryData.status || "all"

const joined =
queryData.joined || "all"

const page =
parseInt(queryData.page) || 1

const limit = 5

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
new Date(

today.setDate(
today.getDate() - 30
)

)

}



if (joined === "year") {

dateFilter =
new Date(

today.setFullYear(
today.getFullYear() - 1
)

)

}



query.createdAt = {

$gte: dateFilter

}

}



/* USERS */

const users =
await User.find(query)

.sort({ createdAt: -1 })

.skip(skip)

.limit(limit)



/* TOTAL FILTERED */

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



return {

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

}



/* ============================
   GET USER BY ID
============================ */

export const getUserByIdService =
async (userId) => {

return await User.findById(userId)

}



/* ============================
   TOGGLE BLOCK USER
============================ */

export const toggleBlockUserService =
async (userId) => {

const user =
await User.findById(userId)



if (!user) {

throw new Error(
"User not found"
)

}



/* TOGGLE */

user.isBlocked =
!user.isBlocked



await user.save()



return user

}



/* ============================
   DELETE USER
============================ */

export const deleteUserService =
async (userId) => {

const user =
await User.findById(userId)



if (!user) {

throw new Error(
"User not found"
)

}



await User.findByIdAndDelete(
userId
)

}