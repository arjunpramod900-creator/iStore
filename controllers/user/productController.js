import {

    loadAllProductsService,

    loadProductDetailsService

} from "../../services/user/productService.js"



/* =========================================
   LOAD ALL PRODUCTS
========================================= */

export const loadAllProducts =

async (req, res) => {

    try {

        const data =

        await loadAllProductsService(

            req.query

        )



        res.render(

            "user/all-products",

            {

                ...data,

                page: "products"

            }

        )

    }

    catch(error) {

        console.log(error)



        res.redirect("/")

    }

}





/* =========================================
   LOAD PRODUCT DETAILS
========================================= */

export const loadProductDetails =

async (req, res) => {

    try {

        const productId =

        req.params.id



        const data =

        await loadProductDetailsService(

            productId

        )



        if(!data.product){

            return res.status(404).send(

                "Product Not Found"

            )

        }



        res.render(

            "user/product-details",

            {

                ...data,

                page: "products"

            }

        )

    }

    catch(error) {

        console.log(error)



        res.redirect("/products")

    }

}