import {

getUsersService,

getUserByIdService,

toggleBlockUserService,

deleteUserService

}

from "../../services/admin/userService.js"



/* ============================
   LOAD USERS PAGE
============================ */

export const loadUsers =
async (req, res) => {

try {

const data =
await getUsersService(
req.query
)

res.render(

"admin/users",

{

page: "users",

...data

}

)

}

catch (error) {

console.log(error)

res.redirect(
"/admin/dashboard"
)

}

}



/* ============================
   VIEW USER DETAILS
============================ */

export const viewUserDetails =
async (req, res) => {

try {

const user =
await getUserByIdService(
req.params.id
)



if (!user) {

return res.redirect(
"/admin/users"
)

}



res.render(

"admin/user-details",

{

page: "users",

user

}

)

}

catch (error) {

console.log(error)

res.redirect(
"/admin/users"
)

}

}



/* ============================
   BLOCK / UNBLOCK USER
============================ */

export const toggleBlockUser =
async (req, res) => {

try {

await toggleBlockUserService(
req.params.id
)



res.json({

success: true

})

}

catch (error) {

console.log(error)

res.json({

success: false,

message: error.message

})

}

}



/* ============================
   DELETE USER
============================ */

export const deleteUser =
async (req, res) => {

try {

await deleteUserService(
req.params.id
)



res.json({

success: true

})

}

catch (error) {

console.log(error)

res.json({

success: false,

message: error.message

})

}

}