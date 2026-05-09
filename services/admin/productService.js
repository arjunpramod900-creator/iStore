import Product
from "../../models/Product.js"

import Variant
from "../../models/Variant.js"

import Category
from "../../models/Category.js"

import { generateSlug }
from "../../utils/generateSlug.js"



/* ============================
   CREATE PRODUCT
============================ */

export const createProductService = async (

productData

) => {

const {

name,
description,
categoryId,
thumbnail,
isFeatured,
isBestSeller,
isDeal,
isActive

} = productData



/* DUPLICATE CHECK */

const existingProduct =
await Product.findOne({

name: {

$regex: `^${name.trim()}$`,
$options: "i"

},

isDeleted: false

})

if (existingProduct) {

throw new Error(
"Product already exists"
)

}



/* CATEGORY CHECK*/

const category =
await Category.findById(
categoryId
)

if (!category) {

throw new Error(
"Category not found"
)

}



/* CREATE SLUG */

const slug =
generateSlug(name)



/* CREATE PRODUCT */

const product =
new Product({

name,

slug,

description,

categoryId,

thumbnail,

isFeatured:
isFeatured === true ||
isFeatured === "true",

isBestSeller:
isBestSeller === true ||
isBestSeller === "true",

isDeal:
isDeal === true ||
isDeal === "true",

isActive:
isActive === true ||
isActive === "true"

})



await product.save()

return product

}



/* ============================
   CREATE VARIANT
============================ */

export const createVariantService = async (

variantData

) => {

const {

productId,
SKU,
storage,
color,
RAM,
images,
stock,
price,
comparePrice,
discountPercentage,
isDefault,
isActive

} = variantData



/* PRODUCT CHECK */

const product =
await Product.findById(
productId
)

if (!product) {

throw new Error(
"Product not found"
)

}



/* SKU CHECK */

const existingSKU =
await Variant.findOne({

SKU

})

if (existingSKU) {

throw new Error(
"SKU already exists"
)

}



/* CREATE VARIANT */

const variant =
new Variant({

productId,

SKU,

storage,

color,

RAM,

images,

stock,

price,

comparePrice,

discountPercentage,

isDefault:
isDefault === true ||
isDefault === "true",

isActive:
isActive === true ||
isActive === "true"

})



await variant.save()

return variant

}