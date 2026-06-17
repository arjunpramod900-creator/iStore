/* =========================================
   UPDATE CART UI
========================================= */

const updateCartUI = (
  variantId,

  data,
) => {
  /* =========================================
       QUANTITY
    ========================================= */

  if (typeof data.quantity !== "undefined") {
    const qtyElement = document.querySelector(`[data-qty="${variantId}"]`);

    if (qtyElement) {
      qtyElement.innerText = data.quantity;

      /* PREMIUM PULSE */

      gsap.fromTo(
        qtyElement,

        {
          scale: 1.25,
          color: "#7C3AED",
        },

        {
          scale: 1,
          color: "#111111",
          duration: 0.35,
          ease: "power2.out",
        },
      );
    }

    /* =========================================
           AUTO DISABLE PLUS BUTTON
        ========================================= */

    const increaseBtn = document.querySelector(
      `.increase-btn[data-variant-id="${variantId}"]`,
    );

    if (increaseBtn) {
      increaseBtn.disabled = data.quantity >= 5;
    }
  }

  /* =========================================
       ITEM SUBTOTAL
    ========================================= */

  if (typeof data.itemSubtotal !== "undefined") {
    const subtotalElement = document.querySelector(
      `[data-subtotal="${variantId}"]`,
    );

    if (subtotalElement) {
      subtotalElement.innerText = `₹${data.itemSubtotal.toLocaleString()}`;
    }
  }

  /* =========================================
       CART TOTALS
    ========================================= */

  if (typeof data.cartSubtotal !== "undefined") {
    const cartSubtotal = document.getElementById("cartSubtotal");

    const cartTotal = document.getElementById("cartTotal");

    /* SUBTOTAL */

    if (cartSubtotal) {
      cartSubtotal.innerText = `₹${data.cartSubtotal.toLocaleString()}`;

      gsap.fromTo(
        cartSubtotal,

        {
          scale: 1.06,
          color: "#7C3AED",
        },

        {
          scale: 1,
          color: "#111111",
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }

    /* FINAL TOTAL */

    if (cartTotal) {
      cartTotal.innerText = `₹${data.finalTotal.toLocaleString()}`;

      gsap.fromTo(
        cartTotal,

        {
          scale: 1.08,
          color: "#7C3AED",
        },

        {
          scale: 1,
          color: "#111111",
          duration: 0.45,
          ease: "power2.out",
        },
      );
    }

    /* =========================================
           SHIPPING
        ========================================= */

    const shippingElement = document.getElementById("shippingAmount");

    if (shippingElement && typeof data.shipping !== "undefined") {
      shippingElement.innerText =
        data.shipping === 0 ? "Free" : `₹${data.shipping.toLocaleString()}`;
    }

    /* =========================================
           TAX
        ========================================= */

    const taxElement = document.getElementById("estimatedTax");

    if (taxElement && typeof data.estimatedTax !== "undefined") {
      taxElement.innerText = `₹${data.estimatedTax.toLocaleString()}`;
    }
  }


      const offerDiscountElement =
    document.getElementById(
        "offerDiscountAmount"
    );

    if(
        offerDiscountElement &&
        typeof data.offerDiscount !== "undefined"
    ){
        offerDiscountElement.innerText =
        `- ₹${data.offerDiscount.toLocaleString()}`;
    }

  /* =========================================
       TOTAL ITEMS
    ========================================= */

  if (typeof data.totalItems !== "undefined") {
    const totalItems = document.getElementById("cartItemsCount");

    if (totalItems) {
      totalItems.innerText = data.totalItems;
    }
  }
};

/* =========================================
   SAFE JSON RESPONSE
========================================= */

const parseResponse = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    console.log(
      "JSON Parse Error:",

      error,
    );

    return {
      success: false,

      message: "Invalid server response",
    };
  }
};

/* =========================================
   UPDATE QUANTITY
========================================= */

const increaseButtons = document.querySelectorAll(".increase-btn");

const decreaseButtons = document.querySelectorAll(".decrease-btn");

/* =========================================
   INCREMENT
========================================= */

increaseButtons.forEach((button) => {
  button.addEventListener(
    "click",

    async () => {
      try {
        const variantId = button.dataset.variantId;

        button.disabled = true;

        const response = await fetch(
          "/cart/update-quantity",

          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              variantId,

              type: "increment",
            }),
          },
        );

        const data = await parseResponse(response);

        if (data.success) {
          updateCartUI(
            variantId,

            data,
          );
        } else {
          showToast(
            data.message.includes("Maximum") || data.message.includes("Stock")
              ? "warning"
              : "info",

            data.message,
          );
        }
      } catch (error) {
        console.log(error);

        showToast(
          "error",

          "Something went wrong",
        );
      } finally {
        button.disabled = false;
      }
    },
  );
});

/* =========================================
   DECREMENT
========================================= */

decreaseButtons.forEach((button) => {
  button.addEventListener(
    "click",

    async () => {
      try {
        const variantId = button.dataset.variantId;

        button.disabled = true;

        const response = await fetch(
          "/cart/update-quantity",

          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              variantId,

              type: "decrement",
            }),
          },
        );

        const data = await parseResponse(response);

        if (data.success) {
          updateCartUI(
            variantId,

            data,
          );
        } else {
          showToast(
            data.message.includes("Maximum") || data.message.includes("Stock")
              ? "warning"
              : "info",

            data.message,
          );
        }
      } catch (error) {
        console.log(error);

        showToast(
          "error",

          "Something went wrong",
        );
      } finally {
        button.disabled = false;
      }
    },
  );
});

/* =========================================
   REMOVE ITEM
========================================= */

const removeButtons = document.querySelectorAll(".remove-btn");

removeButtons.forEach((button) => {
  button.addEventListener(
    "click",

    async () => {
      try {
        const variantId = button.dataset.variantId;

        const result = await Swal.fire({
          title: "Remove Item?",

          text: "This product will be removed from your cart.",

          icon: "warning",

          showCancelButton: true,

          confirmButtonText: "Remove",

          cancelButtonText: "Cancel",

          background: "#FFFFFF",

          color: "#111111",

          reverseButtons: true,

          customClass: {
            popup: "cart-swal-popup",

            confirmButton: "cart-swal-confirm",

            cancelButton: "cart-swal-cancel",
          },
        });

        if (!result.isConfirmed) {
          return;
        }

        button.disabled = true;

        const response = await fetch(
          `/cart/remove-item/${variantId}`,

          {
            method: "DELETE",
          },
        );

        const data = await parseResponse(response);

        if (data.success) {
          /* REMOVE CARD */

          const cartCard = button.closest(".cart-item-card");

          if (cartCard) {
            gsap.to(
              cartCard,

              {
                opacity: 0,

                y: -20,

                duration: 0.35,

                ease: "power2.out",

                onComplete: () => {
                  cartCard.remove();
                },
              },
            );
          }

          /* RESTORE PRODUCT BUTTON */

          const addToCartButtons = document.querySelectorAll(
            `.add-to-cart-btn[data-variant-id="${variantId}"]`,
          );

          addToCartButtons.forEach((btn) => {
            btn.classList.remove("added");

            btn.disabled = false;

            btn.innerHTML = `
                            <i
                                data-lucide="shopping-cart"
                                size="18"
                            ></i>

                            Add to Cart
                        `;
          });

          lucide.createIcons();

          /* RESTORE WISHLIST UI ONLY IF VALID */

          if (data.restoredToWishlist) {
            const wishlistButtons = document.querySelectorAll(
              `.wishlist-toggle[data-variant-id="${variantId}"]`,
            );

            wishlistButtons.forEach((btn) => {
              btn.classList.add("active");
            });
          }

          /* SUCCESS TOAST */

          showToast(
            "success",

            "Removed from cart",
          );

          navigator.vibrate?.(30);

          /* EMPTY CHECK */

          setTimeout(() => {
            const remainingCards = document.querySelectorAll(".cart-item-card");

            if (remainingCards.length === 0) {
              location.reload();
            }
          }, 400);

          return;
        } else {
          showToast(
            "info",

            data.message,
          );
        }
      } catch (error) {
        console.log(error);

        showToast(
          "error",

          "Something went wrong",
        );
      } finally {
        button.disabled = false;
      }
    },
  );
});

/* =========================================
   PROCEED TO CHECKOUT — ITEM VALIDATION

========================================= */

const checkoutBtn = document.getElementById("proceedToCheckoutBtn");

if (checkoutBtn) {
  checkoutBtn.addEventListener("click", async () => {
    checkoutBtn.disabled = true;

    try {
      const response = await fetch("/cart/check-validity");

      const data = await parseResponse(response);

      if (!data.success) {
        showToast("info", data.message || "Your cart is empty");
        return;
      }

      /* NOTHING BLOCKED — proceed normally */

      if (data.blockedCount === 0) {
        window.location.href = "/checkout";
        return;
      }

      /* BUILD THE LIST OF BLOCKED ITEMS FOR THE ALERT */

      const blockedListHtml = data.blockedItems
        .map(
          (item) =>
            `<li><strong>${item.productName}</strong> — ${item.reason}</li>`,
        )
        .join("");

      /* ALL ITEMS BLOCKED — cannot proceed at all */

      if (data.validCount === 0) {
        await Swal.fire({
          icon: "error",
          title: "Item Unavailable",
          html: `
            <p style="margin-bottom:10px;">
              This item is no longer available and cannot be checked out.
            </p>
            <ul style="text-align:left;padding-left:18px;margin:0;">
              ${blockedListHtml}
            </ul>
          `,
          confirmButtonText: "Shop More",
          showCancelButton: false,
          background: "#FFFFFF",
          color: "#111111",
          customClass: {
            popup: "cart-swal-popup",
            confirmButton: "cart-swal-confirm",
          },
        });

        window.location.href = "/products";

        return;
      }

      /* SOME BLOCKED, SOME VALID — let the user choose */

      const result = await Swal.fire({
        icon: "warning",
        title: "Some Items Are Unavailable",
        html: `
          <p style="margin-bottom:10px;">
            The following ${data.blockedCount > 1 ? "items are" : "item is"}
            no longer available and will be excluded from your order:
          </p>
          <ul style="text-align:left;padding-left:18px;margin:0 0 10px;">
            ${blockedListHtml}
          </ul>
          <p>
            You can continue to checkout with the remaining
            ${data.validCount} item${data.validCount > 1 ? "s" : ""}, or
            keep shopping.
          </p>
        `,
        showCancelButton: true,
        confirmButtonText: "Proceed to Checkout",
        cancelButtonText: "Shop More",
        reverseButtons: true,
        background: "#FFFFFF",
        color: "#111111",
        customClass: {
          popup: "cart-swal-popup",
          confirmButton: "cart-swal-confirm",
          cancelButton: "cart-swal-cancel",
        },
      });

      if (result.isConfirmed) {
        window.location.href = "/checkout";
      } else {
        window.location.href = "/products";
      }

    } catch (error) {
      console.log(error);

      showToast("error", "Something went wrong");
    } finally {
      checkoutBtn.disabled = false;
    }
  });
}