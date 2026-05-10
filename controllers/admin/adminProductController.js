import {
productSchema
}
from "../../validators/productValidator.js"

import {
createProductService,
loadProductsService,
updateProductService,
deleteProductService,
loadProductDetailsService,
addVariantService,
updateVariantService,
deleteVariantService,
getCategoriesService          
}
from "../../services/admin/productService.js"



/* ============================
   LOAD PRODUCTS PAGE
============================ */

export const loadProducts = async (
req,
res
) => {

try {

const data =
await loadProductsService(
req.query
)

res.render(

"admin/product-management",

{

page: "products",

...data,

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

const categories = await getCategoriesService()

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

/* VALIDATE */

const productValidation =
productSchema.safeParse(
req.body
)

if (!productValidation.success) {

  const categories =
    await getCategoriesService()

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

/* CREATE PRODUCT */

await createProductService({

body: req.body,

files: req.files,

validatedData:
productValidation.data

})

/* SUCCESS */

res.redirect(

"/admin/products?success=added"

)

}

catch (error) {

console.log(
"Add Product Error:",
error
)
const categories = await getCategoriesService()

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

const data =
await loadProductDetailsService(
req.params.id
)

const categories = await getCategoriesService()

res.render(

"admin/edit-product",

{

page: "products",

product: data.product,

variant:
data.variants[0],

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

await updateProductService(

req.params.id,

{

body: req.body,

files: req.files,

validatedData:
productValidation.data

}

)

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

await deleteProductService(
req.params.id
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



/* ============================
   PRODUCT DETAILS PAGE
============================ */

export const loadProductDetails = async (
req,
res
) => {

try {

const data =
await loadProductDetailsService(
req.params.id
)

res.render(

"admin/product-details",

{

page: "products",

...data

}

)

}

catch (error) {

console.log(
"Load Product Details Error:",
error
)

res.redirect(
"/admin/products"
)

}

}



/* ============================
   ADD VARIANT
============================ */

export const addVariant = async (
req,
res
) => {

try {

await addVariantService({

productId:
req.params.productId,

body: req.body,

files: req.files

})

return res.json({

success: true,

message:
"Variant added successfully"

})

}

catch(error) {

console.log(
"Add Variant Error:",
error
)

return res.json({

success: false,

message:
error.message

})

}

}



/* ============================
   UPDATE VARIANT
============================ */

export const updateVariant = async (
req,
res
) => {

try {

await updateVariantService(

req.params.variantId,

{

body: req.body,

files: req.files

}

)

return res.json({

success: true,

message:
"Variant updated successfully"

})

}

catch(error) {

console.log(
"Update Variant Error:",
error
)

return res.json({

success: false,

message:
error.message

})

}

}



/* ============================
   DELETE VARIANT
============================ */

export const deleteVariant = async (
req,
res
) => {

try {

await deleteVariantService(
req.params.variantId
)

return res.json({

success: true,

message:
"Variant deleted successfully"

})

}

catch(error) {

console.log(
"Delete Variant Error:",
error
)

return res.json({

success: false,

message:
"Failed to delete variant"

})

}

}