import Product from "../../models/Product.js"

import Variant from "../../models/Variant.js"

import Category from "../../models/Category.js"

import {

productSchema

} from "../../validators/productValidator.js"

import {

variantSchema

} from "../../validators/variantValidator.js"

import {

createProductService,

createVariantService

}

from "../../services/admin/productService.js"

import {

uploadImage

}

from "../../utils/uploadToCloudinary.js"



/* ============================
   IMAGE VALIDATION
============================ */

const allowedMimeTypes = [

"image/jpeg",

"image/jpg",

"image/png",

"image/webp"

]



/* ============================
   LOAD PRODUCTS PAGE
============================ */

export const loadProducts = async (

req,
res

) => {

try {

/* 
   QUERY VALUES
 */

const currentPage =
Number(req.query.page) || 1

const limit = 5

const skip =
(currentPage - 1) * limit

const search =
req.query.search || ""

const category =
req.query.category || ""

const status =
req.query.status || "all"



/* 
   FILTER OBJECT
 */

let filter = {

isDeleted: false

}



/* SEARCH */

if (search) {

filter.name = {

$regex: search,

$options: "i"

}

}



/* CATEGORY FILTER */

if (category) {

filter.categoryId = category

}



/* STATUS FILTER */

if (status === "active") {

filter.isActive = true

}

if (status === "inactive") {

filter.isActive = false

}



/* 
   PRODUCTS
 */

const products =
await Product.find(filter)

.populate("categoryId")

.sort({

createdAt: -1

})

.skip(skip)

.limit(limit)

.lean()



/* 
   ATTACH VARIANT DATA
 */

for (const product of products) {

const variants =
await Variant.find({

productId: product._id,

isDeleted: false

})

product.variantCount =
variants.length

product.totalStock =
variants.reduce(

(acc, item) => acc + item.stock,

0

)

product.defaultPrice =
variants[0]?.price || 0

product.defaultSKU =
variants[0]?.SKU || "N/A"

}



/* 
   TOTAL PRODUCTS
 */

const totalProducts =
await Product.countDocuments(filter)



/* 
   TOTAL PAGES
 */

const totalPages =
Math.ceil(totalProducts / limit)



/* 
   STATS
 */

const stats = {

total:
await Product.countDocuments({

isDeleted: false

}),

active:
await Product.countDocuments({

isDeleted: false,

isActive: true

}),

inactive:
await Product.countDocuments({

isDeleted: false,

isActive: false

})

}



/* 
   CATEGORIES
 */

const categories =
await Category.find({

isDeleted: false,

isActive: true

})



/* 
   RENDER
 */

res.render(

"admin/product-management",

{

page: "products",

products,

stats,

categories,

currentPage,

totalPages,

totalProducts,

limit,

search,

category,

status,

req

}

)

}

catch (error) {

console.log(
"Load Products Error:",
error
)

res.redirect(
"/admin/dashboard"
)

}

}

/* ============================
   RENDER ADD PRODUCT
============================ */

export const renderAddProduct = async (

req,
res

) => {

try {

const categories =
await Category.find({

isDeleted: false,

isActive: true

})



res.render(

"admin/add-product",

{

page: "products",

categories,

error: null

}

)

}

catch (error) {

console.log(
"Render Add Product Error:",
error
)

res.redirect(
"/admin/products"
)

}

}



/* ============================
   ADD PRODUCT
============================ */

export const addProduct = async (

req,
res

) => {

try {

/* 
   VALIDATE PRODUCT
 */

const productValidation =
productSchema.safeParse(
req.body
)

if (!productValidation.success) {

const categories =
await Category.find({

isDeleted: false,

isActive: true

})



return res.status(400).render(

"admin/add-product",

{

page: "products",

categories,

error:
productValidation
.error
.errors[0]
.message

}

)

}



/* 
   THUMBNAIL VALIDATION
 */

let thumbnail = ""

if (req.files?.thumbnail?.[0]) {

const file =
req.files.thumbnail[0]

const maxSize =
5 * 1024 * 1024



if (

!allowedMimeTypes.includes(
file.mimetype
)

) {

throw new Error(
"Only JPG, PNG and WEBP images are allowed"
)

}



if (file.size > maxSize) {

throw new Error(
"Thumbnail must be below 5MB"
)

}



thumbnail =
await uploadImage(
file.buffer
)

}



/* 
   CREATE PRODUCT
 */

const product =
await createProductService({

...productValidation.data,

thumbnail

})



/* 
   VARIANT DATA
 */

const variantData = {

productId:
product._id,

SKU:
req.body.SKU,

storage:
req.body.storage,

color:
req.body.color,

RAM:
req.body.RAM,

stock:
req.body.stock,

price:
req.body.price,

comparePrice:
req.body.comparePrice,

discountPercentage:
req.body.discountPercentage,

isDefault:
req.body.isDefault,

isActive:
req.body.isActive === "true",

images: []

}



/* ============================
   VARIANT VALIDATION
============================ */

const variantValidation =
variantSchema.safeParse(
variantData
)

if (!variantValidation.success) {

throw new Error(

variantValidation
.error
.errors[0]
.message

)

}



/* ============================
   VARIANT IMAGES
============================ */

if (req.files?.variantImages) {

for (

const image of
req.files.variantImages

) {

if (

!allowedMimeTypes.includes(
image.mimetype
)

) {

throw new Error(
"Only JPG, PNG and WEBP images are allowed"
)

}



const uploadedImage =
await uploadImage(
image.buffer
)

variantData.images.push(
uploadedImage
)

}

}



/* ============================
   CREATE VARIANT
============================ */

await createVariantService(
variantData
)



/* ============================
   SUCCESS
============================ */

res.redirect(

"/admin/products?success=added"

)

}

catch (error) {

console.log(
"Add Product Error:",
error
)

const categories =
await Category.find({

isDeleted: false,

isActive: true

})



res.status(500).render(

"admin/add-product",

{

page: "products",

categories,

error:
error.message

}

)

}

}

/* ============================
   RENDER EDIT PRODUCT
============================ */

export const renderEditProduct = async (

req,
res

) => {

try {

const product =
await Product.findById(
req.params.id
)

if (!product) {

return res.redirect(
"/admin/products"
)

}

const variant =
await Variant.findOne({

productId:
product._id,

isDeleted: false

})

const categories =
await Category.find({

isDeleted: false,

isActive: true

})

res.render(

"admin/edit-product",

{

page: "products",

product,

variant,

categories,

error: null

}

)

}

catch (error) {

console.log(
"Render Edit Product Error:",
error
)

res.redirect(
"/admin/products"
)

}

}



/* ============================
   UPDATE PRODUCT
============================ */

export const updateProduct = async (

req,
res

) => {

try {

const productId =
req.params.id

const product =
await Product.findById(
productId
)

if (!product) {

return res.redirect(
"/admin/products"
)

}



/* 
   VALIDATE PRODUCT
 */

const productValidation =
productSchema.safeParse(
req.body
)

if (!productValidation.success) {

throw new Error(

productValidation
.error
.errors[0]
.message

)

}



/* 
   THUMBNAIL UPDATE
 */

let thumbnail =
product.thumbnail

if (req.files?.thumbnail?.[0]) {

const file =
req.files.thumbnail[0]

if (

!allowedMimeTypes.includes(
file.mimetype
)

) {

throw new Error(
"Only JPG, PNG and WEBP images are allowed"
)

}

thumbnail =
await uploadImage(
file.buffer
)

}



/* 
   UPDATE PRODUCT
 */

await Product.findByIdAndUpdate(

productId,

{

...productValidation.data,

thumbnail

}

)



/* 
   UPDATE VARIANT
 */
await Variant.findOneAndUpdate(

{
productId: productId
},

{
SKU: req.body.SKU,
storage: req.body.storage,
color: req.body.color,
RAM: req.body.RAM,
stock: req.body.stock,
price: req.body.price,
comparePrice: req.body.comparePrice,
isActive: req.body.isActive === "true",
isDeleted: false
},

{
new: true,
upsert: true
}

)



/* 
   SUCCESS
 */

res.redirect(

"/admin/products?success=updated"

)

}

catch (error) {

console.log(
"Update Product Error:",
error
)

res.redirect(
"/admin/products"
)

}

}

/* ============================
   DELETE PRODUCT
============================ */

export const deleteProduct = async (

req,
res

) => {

try {

const productId =
req.params.id



await Product.findByIdAndUpdate(

productId,

{

isDeleted: true

}

)



await Variant.updateMany(

{

productId

},

{

isDeleted: true

}

)



res.json({

success: true,

message:
"Product deleted successfully"

})

}

catch (error) {

console.log(
"Delete Product Error:",
error
)

res.json({

success: false

})

}

}