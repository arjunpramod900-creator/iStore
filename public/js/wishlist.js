/* =========================================
   ADD TO WISHLIST
========================================= */

const wishlistButtons =
document.querySelectorAll(
    ".wishlist-toggle, .btn-wishlist"
)

wishlistButtons.forEach(button => {

    button.addEventListener(

        "click",

        async (e) => {

            e.preventDefault()

            try{

                const productId =
                button.dataset.productId

                const variantId =
                button.dataset.variantId

                const response =
                await fetch(

                    "/wishlist/add",

                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                            "application/json",
                            "Accept":
                            "application/json"

                        },

                        body: JSON.stringify({

                            productId,

                            variantId

                        })

                    }

                )

                const data =
                await response.json()


                /* =========================================
                    LOGIN REQUIRED
                ========================================= */

               if (data.requiresLogin) {

                    showLoginAlert(

                        "Please login to use wishlist."

                    ).then((result) => {

                        if(result.isConfirmed){

                            window.location.href = "/login"

                        }

                    })

                    return
                }

                if(data.success){

                    button.classList.add(
                        "active"
                    )

                    showToast(

                    "success",

                    data.message

                )

                }

                else{

    /* REMOVE FROM WISHLIST */

    if(

        data.message ===
        "Already in wishlist"

    ){

        const removeResponse =
        await fetch(

            `/wishlist/remove/${variantId}`,

            {

                method: "DELETE"

            }

        )

        const removeData =
        await removeResponse.json()

        if(removeData.success){

            button.classList.remove(
                "active"
            )
           /* =========================================

            UPDATE ALL CART BUTTONS

            ========================================= */

            const cartButtons =

            document.querySelectorAll(

                `.add-to-cart-btn[data-variant-id="${variantId}"]`

            )

            cartButtons.forEach(cartButton => {

                cartButton.classList.remove(

                    "added"

                )

                cartButton.disabled = false

                cartButton.innerHTML =

                `

                    <i

                        data-lucide="shopping-cart"

                        size="18"

                    ></i>

                    Add to Cart

                `

            })

            /* =========================================

            UPDATE ALL WISHLIST BUTTONS

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

            showToast(

                "success",

                "Removed from wishlist"

            )
        }

    }

    else{

        showToast(

            "info",

            data.message

        )

    }

}

            }

            catch(error){

                console.log(error)

            }

        }

    )

})



/* =========================================
   REMOVE FROM WISHLIST
========================================= */

async function removeFromWishlist(

    variantId

){

    const result =
    await Swal.fire({

        title: "Remove Item?",

        text: "This product will be removed from wishlist.",

        icon: "warning",

        showCancelButton: true,

        confirmButtonText: "Remove",

        cancelButtonText: "Cancel",

        confirmButtonColor: "#510098",

        cancelButtonColor: "#E5E7EB",

        background: "#FFFFFF",

        color: "#111111",

        borderRadius: "24px"

    })

    if(!result.isConfirmed){

        return

    }

    try{

        const response =
        await fetch(

            `/wishlist/remove/${variantId}`,

            {

                method: "DELETE"

            }

        )

        const data =
        await response.json()

        if(data.success){

            const card =
            document.getElementById(

                `card-${variantId}`

            )

            gsap.to(

                card,

                {

                    scale: 0.9,

                    opacity: 0,

                    y: -20,

                    duration: 0.4,

                    ease: "power2.inOut",

                    onComplete: () => {

                        card.remove()

                        checkEmptyWishlist()

                    }

                }

            )

            showToast(

                "success",

                "Removed from wishlist"

            )

        }

    }

    catch(error){

        console.log(error)

    }

}



/* =========================================
   MOVE TO CART
========================================= */

async function moveToCart(

    variantId

){

    try{

        const response =
        await fetch(

            `/wishlist/move-to-cart/${variantId}`,

            {

                method: "POST"

            }

        )

        const data =
        await response.json()

        if(data.success){

            const card =
            document.getElementById(

                `card-${variantId}`

            )

            const button =
            card.querySelector(
                ".btn-add-cart"
            )

            button.innerHTML =

            `
                <i
                    data-lucide="check"
                    size="18"
                ></i>

                Added
            `

            button.style.background =
            "#603763"

            lucide.createIcons()

            gsap.to(

                card,

                {

                    y: -30,

                    opacity: 0,

                    duration: 0.45,

                    delay: 0.5,

                    ease: "power2.inOut",

                    onComplete: () => {

                        card.remove()

                        checkEmptyWishlist()

                    }

                }

            )

            showToast(

                "success",

                "Moved to cart"

            )

        }

        else{

            showToast(

                "info",

                data.message

            )

        }

    }

    catch(error){

        console.log(error)

    }

}



/* =========================================
   EMPTY CHECK
========================================= */

function checkEmptyWishlist(){

    const grid =
    document.getElementById(
        "wishlistGrid"
    )

    if(

        grid &&
        grid.children.length === 0

    ){

        setTimeout(() => {

            location.reload()

        }, 400)

    }

}

/* =========================================
   RESTORE WISHLIST AFTER CART REMOVE
========================================= */

window.addEventListener(

    "DOMContentLoaded",

    () => {

        const variantId =

        localStorage.getItem(

            "wishlistRestore"

        )

        if(!variantId){

            return

        }

        const wishlistButtons =

        document.querySelectorAll(

            `.wishlist-toggle[data-variant-id="${variantId}"]`

        )

        wishlistButtons.forEach(button => {

            button.classList.add(
                "active"
            )

        })

        const cartButtons =

        document.querySelectorAll(

            `.add-to-cart-btn[data-variant-id="${variantId}"]`

        )

        cartButtons.forEach(button => {

            button.classList.remove(
                "added"
            )

            button.innerHTML = `

                <i
                    data-lucide="shopping-cart"
                    size="18"
                ></i>

                Add to Cart

            `

        })

        lucide.createIcons()

        localStorage.removeItem(
            "wishlistRestore"
        )

    }

)