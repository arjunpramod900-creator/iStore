import {
    loadAllProductsService
} from "../../services/user/productService.js"

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