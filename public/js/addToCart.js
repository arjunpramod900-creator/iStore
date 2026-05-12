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

                try{

                    const productId =
                    button.dataset.productId

                    const variantId =
                    button.dataset.variantId

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

                    if(data.success){

                        button.innerHTML =
                        "Added ✓"

                        gsap.fromTo(

                            button,

                            {
                                scale: 0.9
                            },

                            {
                                scale: 1,
                                duration: 0.4,
                                ease: "back.out(1.7)"
                            }

                        )

                    }

                    else{

                        button.disabled = false

                        button.innerHTML = `
                            <i data-lucide="shopping-cart" size="18"></i>
                            Add to Cart
                        `

                        lucide.createIcons()

                        alert(data.message)

                    }

                }

                catch(error){

                    console.log(error)

                    button.disabled = false

                    button.innerHTML = `
                        <i data-lucide="shopping-cart" size="18"></i>
                        Add to Cart
                    `

                    lucide.createIcons()

                    alert(
                        "Something went wrong"
                    )

                }

            }

        )

    }

)