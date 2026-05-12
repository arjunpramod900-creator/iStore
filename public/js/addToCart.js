/* =========================================
   GLOBAL ADD TO CART
========================================= */

const addToCartButtons =
document.querySelectorAll(
    ".add-to-cart-btn"
)

addToCartButtons.forEach(

    (button) => {

        button.addEventListener(

            "click",

            async (e) => {

                e.preventDefault()

                const variantId =
                button.dataset.variantId

                const productId =
                button.dataset.productId

                /* =========================
                   GO TO CART
                ========================= */

                if(

                    button.classList.contains(
                        "added"
                    )

                ){

                    window.location.href =
                    "/cart"

                    return

                }

                try{

                    button.disabled = true

                    button.innerHTML =
                    "Adding..."

                    const response =
                    await fetch(

                        "/cart/add",

                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                "application/json"

                            },

                            body: JSON.stringify({

                                productId,

                                variantId,

                                quantity: 1

                            })

                        }

                    )

                    const data =
                    await response.json()

                    /* =========================
                       SUCCESS
                    ========================= */

                    if(data.success){

                        /* =========================================
                        UPDATE ALL CART BUTTONS
                        ========================================= */

                        const cartButtons =

                        document.querySelectorAll(

                            `.add-to-cart-btn[data-variant-id="${variantId}"]`

                        )

                        cartButtons.forEach(cartButton => {

                            cartButton.classList.add(
                                "added"
                            )

                            cartButton.disabled = false

                            cartButton.innerHTML =

                            `
                                <i
                                    data-lucide="shopping-bag"
                                    size="18"
                                ></i>

                                Go to Cart
                            `

                        })

                        /* =========================================
                        REMOVE FROM ALL WISHLIST BUTTONS
                        ========================================= */

                        const wishlistButtons =

                        document.querySelectorAll(

                            `.wishlist-toggle[data-variant-id="${variantId}"]`

                        )

                        wishlistButtons.forEach(wishlistButton => {

                            wishlistButton.classList.remove(
                                "active"
                            )

                        })

                        lucide.createIcons()

                        /* ANIMATION */

                        gsap.fromTo(

                            button,

                            {

                                scale: 0.92

                            },

                            {

                                scale: 1,

                                duration: 0.4,

                                ease: "back.out(1.7)"

                            }

                        )

                        /* TOAST */

                        Swal.fire({

                            toast: true,

                            position: "top-end",

                            icon: "success",

                            title:
                            "Added to cart",

                            showConfirmButton: false,

                            timer: 1800,

                            background: "#FFFFFF",

                            color: "#111111"

                        })

                    }

                    /* =========================
                       FAILED
                    ========================= */

                    else{

                        button.disabled = false

                        button.innerHTML =

                        `
                            <i
                                data-lucide="shopping-cart"
                                size="18"
                            ></i>

                            Add to Cart
                        `

                        lucide.createIcons()

                        Swal.fire({

                            toast: true,

                            position: "top-end",

                            icon: "info",

                            title: data.message,

                            showConfirmButton: false,

                            timer: 1800,

                            background: "#FFFFFF",

                            color: "#111111"

                        })

                    }

                }

                catch(error){

                    console.log(error)

                    button.disabled = false

                    button.innerHTML =

                    `
                        <i
                            data-lucide="shopping-cart"
                            size="18"
                        ></i>

                        Add to Cart
                    `

                    lucide.createIcons()

                }

            }

        )

    }

)