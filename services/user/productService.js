import Product
from "../../models/Product.js"

import Variant
from "../../models/Variant.js"

import Category
from "../../models/Category.js"



/* =========================================
   LOAD ALL PRODUCTS
========================================= */

export const loadAllProductsService =
async (query) => {

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

        sort

    }

}