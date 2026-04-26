import Address from "../../models/Address.js"



/* =========================
   LOAD ADDRESSES PAGE
========================= */

export const loadAddresses = async (req, res) => {

try {

const userId =
req.session.userId



/* Get user addresses */

const addresses =
await Address.find({

userId

}).sort({

isDefault: -1,

createdAt: -1

})



res.render(
"user/addresses",
{

addresses

}

)

}

catch (error) {

console.log(
"Load Addresses Error:",
error
)

res.redirect("/profile")

}

}



/* =========================
   ADD NEW ADDRESS
========================= */
export const addAddress = async (req, res) => {

try {

const userId = req.session.userId

const {
fullName,
phoneNumber,
addressLine1,
city,
state,
pincode,
country,
type,
isDefault
} = req.body



/* Default Handling */

if (isDefault === "true") {

await Address.updateMany(
{ userId },
{ isDefault: false }
)

}



/* Create Address */

const newAddress = new Address({

fullName,
phoneNumber,
addressLine1,
city,
state,
pincode,
country,
type,
userId,
isDefault: isDefault === "true"

})

await newAddress.save()

res.redirect("/addresses")

}

catch (error) {

console.log("Add Address Error:", error)

res.redirect("/addresses")

}

}



/* =========================
   DELETE ADDRESS
========================= */

export const deleteAddress = async (req, res) => {

try {

const addressId =
req.params.id



await Address.findByIdAndDelete(

addressId

)



res.redirect("/addresses")

}

catch (error) {

console.log(
"Delete Address Error:",
error
)

res.redirect("/addresses")

}

}



/* =========================
   UPDATE ADDRESS
========================= */
export const updateAddress = async (req, res) => {

try {

const addressId = req.params.id

const userId = req.session.userId

const {
fullName,
phoneNumber,
addressLine1,
city,
state,
pincode,
country,
type,
isDefault
} = req.body



/* DEFAULT LOGIC*/

if (isDefault === "true") {

await Address.updateMany(
{ userId },
{ isDefault: false }
)

}



/* update address */

await Address.findByIdAndUpdate(

addressId,

{

fullName,
phoneNumber,
addressLine1,
city,
state,
pincode,
country,
type,
isDefault: isDefault === "true"

}

)



res.redirect("/addresses")

}

catch (error) {

console.log(
"Update Address Error:",
error
)

res.redirect("/addresses")

}

}