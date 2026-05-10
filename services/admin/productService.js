import Product
from "../../models/Product.js"

import Variant
from "../../models/Variant.js"

import Category
from "../../models/Category.js"

import {
variantSchema
}
from "../../validators/variantValidator.js"

import {
generateSlug
}
from "../../utils/generateSlug.js"

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
   LOAD PRODUCTS
============================ */

export const loadProductsService =
async (query) => {

const currentPage =
Number(query.page) || 1

const limit = 5

const skip =
(currentPage - 1) * limit

const search =
query.search || ""

const category =
query.category || ""

const status =
query.status || "all"

let filter = {

isDeleted: false

}

/* SEARCH */

if(search){

filter.name = {

$regex: search,

$options: "i"

}

}

/* CATEGORY */

if(category){

filter.categoryId = category

}

/* STATUS */

if(status === "active"){

filter.isActive = true

}

if(status === "inactive"){

filter.isActive = false

}

/* PRODUCTS */

const products =
await Product.find(filter)

.populate("categoryId")

.sort({

createdAt: -1

})

.skip(skip)

.limit(limit)

.lean()

/* VARIANT DETAILS */

for(const product of products){

const variants =
await Variant.find({

productId: product._id,

isDeleted: false

})

product.variantCount =
variants.length

product.totalStock =
variants.reduce(

(acc,item)=> acc + item.stock,

0

)

product.defaultPrice =
variants[0]?.price || 0

product.defaultSKU =
variants[0]?.SKU || "N/A"

}

/* TOTAL */

const totalProducts =
await Product.countDocuments(filter)

const totalPages =
Math.ceil(totalProducts / limit)

/* STATS */

const stats = {

total:
await Product.countDocuments({

isDeleted:false

}),

active:
await Product.countDocuments({

isDeleted:false,

isActive:true

}),

inactive:
await Product.countDocuments({

isDeleted:false,

isActive:false

})

}

/* CATEGORIES */

const categories =
await Category.find({

isDeleted:false,

isActive:true

})

return {

products,

stats,

categories,

currentPage,

totalPages,

totalProducts,

limit,

search,

category,

status

}

}



/* ============================
   CREATE PRODUCT
============================ */

export const createProductService = async (data) => {

  const { body, files, validatedData } = data

  const {
    name,
    description,
    categoryId,
    isFeatured,
    isBestSeller,
    isDeal,
    isActive
  } = validatedData

  /* 1. DUPLICATE CHECK */
  const existingProduct = await Product.findOne({
    name: { $regex: `^${name.trim()}$`, $options: "i" },
    isDeleted: false
  })

  if (existingProduct) {
    throw new Error("Product already exists")
  }

  /* 2. CATEGORY CHECK */
  const category = await Category.findById(categoryId)

  if (!category) {
    throw new Error("Category not found")
  }

  /* 3. SKU CHECK */
  const existingSKU = await Variant.findOne({ SKU: body.SKU })

  if (existingSKU) {
    throw new Error("SKU already exists")
  }

  /* 4. VARIANT IMAGE VALIDATION (before any uploads or saves) */
  if (!files?.variantImages || files.variantImages.length < 3) {
    throw new Error("Minimum 3 variant images are required")
  }

  for (const image of files.variantImages) {
    if (!allowedMimeTypes.includes(image.mimetype)) {
      throw new Error("Only JPG, PNG and WEBP images are allowed")
    }
  }

  /* 5. VALIDATE VARIANT SCHEMA */
  const variantDataForValidation = {
    productId: "placeholder",   // real _id not available yet, just for schema check
    SKU:               body.SKU,
    storage:           body.storage,
    color:             body.color,
    RAM:               body.RAM,
    stock:             body.stock,
    price:             body.price,
    comparePrice:      body.comparePrice,
    discountPercentage: body.discountPercentage,
    isDefault:         body.isDefault,
    isActive:          body.isActive === "true",
    images:            ["placeholder", "placeholder", "placeholder"]
  }

  const validation = variantSchema.safeParse(variantDataForValidation)

  if (!validation.success) {
    throw new Error(validation.error.errors[0].message)
  }

  /* 6. UPLOAD THUMBNAIL */
  let thumbnail = ""

  if (files?.thumbnail?.[0]) {
    const file = files.thumbnail[0]
    const maxSize = 5 * 1024 * 1024

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error("Only JPG, PNG and WEBP images are allowed")
    }

    if (file.size > maxSize) {
      throw new Error("Thumbnail must be below 5MB")
    }

    thumbnail = await uploadImage(file.buffer)
  }

  /* 7. UPLOAD VARIANT IMAGES */
  let images = []

  for (const image of files.variantImages) {
    const uploadedImage = await uploadImage(image.buffer)
    images.push(uploadedImage)
  }

  /* 8. SAVE PRODUCT */
  const slug = generateSlug(name)

  const product = new Product({
    name,
    slug,
    description,
    categoryId,
    thumbnail,
    isFeatured:   isFeatured === true   || isFeatured === "true",
    isBestSeller: isBestSeller === true || isBestSeller === "true",
    isDeal:       isDeal === true       || isDeal === "true",
    isActive:     isActive === true     || isActive === "true"
  })

  await product.save()

  /* 9. CREATE VARIANT */
  await Variant.create({
    productId:         product._id,
    SKU:               body.SKU,
    storage:           body.storage,
    color:             body.color,
    RAM:               body.RAM,
    stock:             body.stock,
    price:             body.price,
    comparePrice:      body.comparePrice,
    discountPercentage: body.discountPercentage,
    isDefault:         body.isDefault,
    isActive:          body.isActive === "true",
    images
  })

}
/* ============================
   UPDATE PRODUCT
============================ */

export const updateProductService =
async (

productId,

data

) => {

const {

body,

files,

validatedData

} = data

const product =
await Product.findById(
productId
)

if(!product){

throw new Error(
"Product not found"
)

}

/* THUMBNAIL */

let thumbnail =
product.thumbnail

if(files?.thumbnail?.[0]){

const file =
files.thumbnail[0]

if(

!allowedMimeTypes.includes(
file.mimetype
)

){

throw new Error(
"Only JPG, PNG and WEBP images are allowed"
)

}

thumbnail =
await uploadImage(
file.buffer
)

}

/* UPDATE PRODUCT */

await Product.findByIdAndUpdate(

productId,

{

...validatedData,

thumbnail

}

)

/* UPDATE VARIANT */

await Variant.findOneAndUpdate(

{

productId

},

{

SKU: body.SKU,

storage: body.storage,

color: body.color,

RAM: body.RAM,

stock: body.stock,

price: body.price,

comparePrice:
body.comparePrice,

discountPercentage:
body.discountPercentage,

isActive:
body.isActive === "true",

isDeleted: false

},

{

new: true,

upsert: true

}

)

}



/* ============================
   DELETE PRODUCT
============================ */

export const deleteProductService =
async (productId) => {

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

}



/* ============================
   PRODUCT DETAILS
============================ */

export const loadProductDetailsService =
async (productId) => {

const product =
await Product.findById(productId)

.populate("categoryId")

.lean()

if(!product || product.isDeleted){

throw new Error(
"Product not found"
)

}

const variants =
await Variant.find({

productId,

isDeleted: false

}).lean()

const totalStock =
variants.reduce(

(acc,item)=> acc + item.stock,

0

)

const basePrice =
variants.length > 0

? Math.min(

...variants.map(v => v.price)

)

: 0

const totalVariants =
variants.length

return {

product,

variants,

totalStock,

basePrice,

totalVariants

}

}



/* ============================
   ADD VARIANT
============================ */

export const addVariantService =
async (data) => {

const {

productId,

body,

files

} = data

const product =
await Product.findById(
productId
)

if(!product || product.isDeleted){

throw new Error(
"Product not found"
)

}

const existingVariant =
await Variant.findOne({

productId,

color:
body.color,

storage:
body.storage,

RAM:
body.RAM,

isDeleted:false

})

if(existingVariant){

throw new Error(
"Variant already exists"
)

}

/* MINIMUM 3 IMAGES */

if(

!files?.variantImages ||

files.variantImages.length < 3

){

throw new Error(
"Minimum 3 images are required"
)

}

/* IMAGES */

let images = []

for(const image of files.variantImages){

if(

!allowedMimeTypes.includes(
image.mimetype
)

){

throw new Error(
"Invalid image format"
)

}

const uploaded =
await uploadImage(
image.buffer
)

images.push(uploaded)

}

/* VARIANT DATA */

const variantData = {

productId,

SKU:
body.SKU,

storage:
body.storage,

color:
body.color,

RAM:
body.RAM,

stock:
body.stock,

price:
body.price,

comparePrice:
body.comparePrice,

discountPercentage:
body.discountPercentage,

images

}

/* VALIDATE */

const validation =
variantSchema.safeParse(
variantData
)

if(!validation.success){

throw new Error(

validation
.error
.errors[0]
.message

)

}

/* CREATE */

await Variant.create({

...variantData,

isActive: true,

isDeleted: false

})

}



/* ============================
   UPDATE VARIANT
============================ */

export const updateVariantService =
async (

variantId,

data

) => {

const {

body,

files

} = data

const variant =
await Variant.findById(
variantId
)

if(!variant){

throw new Error(
"Variant not found"
)

}

/* DUPLICATE */

const existingVariant =
await Variant.findOne({

_id: { $ne: variantId },

productId:
variant.productId,

color:
body.color,

storage:
body.storage,

RAM:
body.RAM,

isDeleted:false

})

if(existingVariant){

throw new Error(
"Variant already exists"
)

}

/* EXISTING IMAGES */

let existingImages = []

if(body.existingImages){

existingImages =
JSON.parse(
body.existingImages
)

}

/* NEW IMAGES */

let newImages = []

if(files?.variantImages?.length){

for(const image of files.variantImages){

if(

!allowedMimeTypes.includes(
image.mimetype
)

){

throw new Error(
"Invalid image format"
)

}

const uploadedImage =
await uploadImage(
image.buffer
)

newImages.push(
uploadedImage
)

}

}

/* FINAL IMAGES */

const images = [

...existingImages,

...newImages

]

/* MINIMUM 3 IMAGES */

if(images.length < 3){

throw new Error(
"Minimum 3 images required"
)

}

/* UPDATE */

await Variant.findByIdAndUpdate(

variantId,

{

SKU:
body.SKU,

storage:
body.storage,

color:
body.color,

RAM:
body.RAM,

stock:
body.stock,

price:
body.price,

comparePrice:
body.comparePrice,

discountPercentage:
body.discountPercentage,

images

}

)

}



/* ============================
   DELETE VARIANT
============================ */

export const deleteVariantService =
async (variantId) => {

await Variant.findByIdAndUpdate(

variantId,

{

isDeleted:true

}

)

}



/* ============================
   GET CATEGORIES
============================ */

export const getCategoriesService = async () => {
  return await Category.find({
    isDeleted: false,
    isActive: true
  })
}