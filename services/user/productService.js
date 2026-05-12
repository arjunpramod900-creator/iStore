import Product
from "../../models/Product.js"

import Variant
from "../../models/Variant.js"

import Category
from "../../models/Category.js"

import Wishlist
from "../../models/Wishlist.js"

import Cart 
from "../../models/Cart.js"



/* =========================================
   LOAD ALL PRODUCTS
========================================= */

export const loadAllProductsService =
async (

    query,

    userId

) => {

    /* PAGINATION */

    const currentPage =
    Number(query.page) || 1

    const limit = 8

    const skip =
    (currentPage - 1) * limit



    /* QUERY PARAMS */

    const search =
    query.search || ""

    const category =
    query.category || ""

    const sort =
    query.sort || "latest"



    /* PRODUCT FILTER */

    let filter = {

        isDeleted: false,

        isActive: true

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



    /* FETCH PRODUCTS */

    let products =
    await Product.find(filter)

    .populate("categoryId")

    .sort({

        createdAt: -1

    })

    .lean()



    /* ATTACH ACTIVE VARIANT */

    for(const product of products){

        const variant =
        await Variant.findOne({

            productId: product._id,

            isDeleted: false,

            isActive: true,

            stock: { $gt: 0 }

        })

        .sort({

            createdAt: 1

        })

        .lean()



        product.variant = variant

    }



    /* REMOVE PRODUCTS
       WITHOUT VALID VARIANTS */

    products =
    products.filter(

        product => product.variant

    )



    /* SORTING */

    if(sort === "priceLow"){

        products.sort(

            (a,b) =>

            a.variant.price -
            b.variant.price

        )

    }



    if(sort === "priceHigh"){

        products.sort(

            (a,b) =>

            b.variant.price -
            a.variant.price

        )

    }



    if(sort === "a-z"){

        products.sort(

            (a,b) =>

            a.name.localeCompare(
                b.name
            )

        )

    }



    if(sort === "z-a"){

        products.sort(

            (a,b) =>

            b.name.localeCompare(
                a.name
            )

        )

    }



    /* TOTAL PRODUCTS */

    const totalProducts =
    products.length

    const totalPages =
    Math.ceil(
        totalProducts / limit
    )



    /* FINAL PAGINATION */

    products =
    products.slice(

        skip,

        skip + limit

    )



    /* CATEGORIES */

    const categories =
    await Category.find({

        isDeleted: false,

        isActive: true

    })

    /* WISHLIST ITEMS */

    let wishlistVariantIds = []

    if(userId){

        const wishlist =
        await Wishlist.findOne({

            userId

        })

        if(wishlist){

            wishlistVariantIds =

            wishlist.items.map(

                item =>

                item.variantId.toString()

            )

        }

    }



    let cartVariantIds = []

if(userId){

    const cart =
    await Cart.findOne({

        userId

    })

    if(cart){

        cartVariantIds =

        cart.items.map(

            item =>

            item.variantId.toString()

        )

    }

}
    /* RETURN */

    return {

        products,

        categories,

        currentPage,

        totalPages,

        totalProducts,

        limit,

        search,

        category,

        sort,

        wishlistVariantIds,

        cartVariantIds

    }

}

/* =========================================
   LOAD PRODUCT DETAILS
========================================= */

export const loadProductDetailsService =

async (

    productId,

    userId

) => {

    /* PRODUCT */

    const product =

    await Product.findOne({

        _id: productId,

        isDeleted: false,

        isActive: true

    })

    .populate("categoryId")

    .lean()



    /* PRODUCT NOT FOUND */

    if(!product){

        return {

            product: null

        }

    }



    /* DEFAULT / ACTIVE VARIANT */

    const variant =

    await Variant.findOne({

        productId: product._id,

        isDeleted: false,

        isActive: true

    })

    .sort({

        isDefault: -1,

        createdAt: 1

    })

    .lean()



    product.variant = variant



    /* RELATED PRODUCTS */

    let relatedProducts =

    await Product.find({

        _id: {

            $ne: product._id

        },

        categoryId: product.categoryId._id,

        isDeleted: false,

        isActive: true

    })

    .populate("categoryId")

    .limit(4)

    .lean()



    /* ATTACH VARIANTS */

    for(const related of relatedProducts){

        const relatedVariant =

        await Variant.findOne({

            productId: related._id,

            isDeleted: false,

            isActive: true,

            stock: { $gt: 0 }

        })

        .lean()



        related.variant = relatedVariant

    }



    /* REMOVE EMPTY VARIANTS */

    relatedProducts =

    relatedProducts.filter(

        item => item.variant

    )

    /* WISHLIST ITEMS */

let wishlistVariantIds = []

if(userId){

    const wishlist =
    await Wishlist.findOne({

        userId

    })

    if(wishlist){

        wishlistVariantIds =

        wishlist.items.map(

            item =>

            item.variantId.toString()

        )

    }

}

let cartVariantIds = []

if(userId){

    const cart =
    await Cart.findOne({

        userId

    })

    if(cart){

        cartVariantIds =

        cart.items.map(

            item =>

            item.variantId.toString()

        )

    }

}


    return {

        product,

        relatedProducts,

        wishlistVariantIds,

        cartVariantIds

    }

}