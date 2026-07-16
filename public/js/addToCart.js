/* =========================================
   GLOBAL ADD TO CART
========================================= */

const addToCartButtons = document.querySelectorAll(".add-to-cart-btn");

addToCartButtons.forEach((button) => {
  button.addEventListener(
    "click",

    async (e) => {
      e.preventDefault();
      if (button.disabled || button.classList.contains("unavailable")) {
        return;
      }

      const variantId = button.dataset.variantId;

      const productId = button.dataset.productId;

      /* =========================
                   GO TO CART
                ========================= */

      if (button.classList.contains("added")) {
        window.location.href = "/cart";

        return;
      }

      try {
        if (button.dataset.loading === "true") {
          return;
        }

        button.dataset.loading = "true";
        button.disabled = true;

        button.innerHTML = `

<i
    data-lucide="loader-circle"
    class="spin"
    size="18"
></i>

Adding...

`;

        lucide.createIcons();

        const response = await fetch(
          "/cart/add",

          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",

              Accept: "application/json",
            },

            body: JSON.stringify({
              productId,

              variantId,

              quantity: 1,
            }),
          },
        );

        let data;

        try {
          data = await response.json();
        } catch {
          data = {
            success: false,

            message:
              "We couldn't process the server response. Please try again.",
          };
        }

        /* =========================
                        LOGIN REQUIRED
                    ========================= */

        if (data.requiresLogin) {
          showLoginAlert("Please login to add items to cart.").then(
            (result) => {
              if (result.isConfirmed) {
                window.location.href = "/login";
              }
            },
          );

          button.dataset.loading = "false";

          button.disabled = false;

          button.innerHTML = `
                            <i data-lucide="shopping-cart" size="18"></i>
                            Add to Cart
                        `;

          lucide.createIcons();

          return;
        }

        /* =========================
                       SUCCESS
                    ========================= */

        if (data.success) {
          /* =========================================
                        UPDATE ALL CART BUTTONS
                        ========================================= */

          const cartButtons = document.querySelectorAll(
            `.add-to-cart-btn[data-variant-id="${variantId}"]`,
          );

          cartButtons.forEach((cartButton) => {
            cartButton.classList.remove("unavailable");

            cartButton.classList.add("added");

            cartButton.dataset.loading = "false";

            cartButton.disabled = false;

            cartButton.style.opacity = "";

            cartButton.style.cursor = "";

            cartButton.innerHTML = `
        <i
            data-lucide="shopping-bag"
            size="18"
        ></i>

        Go to Cart
    `;
          });

          /* =========================================
                        REMOVE FROM ALL WISHLIST BUTTONS
                        ========================================= */

          const wishlistButtons = document.querySelectorAll(
            `.wishlist-toggle[data-variant-id="${variantId}"]`,
          );

          wishlistButtons.forEach((wishlistButton) => {
            wishlistButton.classList.remove("active");
          });

          lucide.createIcons();

          /* ANIMATION */

          gsap.fromTo(
            button,

            {
              scale: 0.92,
            },

            {
              scale: 1,

              duration: 0.4,

              ease: "back.out(1.7)",
            },
          );

          /* TOAST */

          showToast("success", "Added to cart");

          updateHeaderCounts(data.cartCount, data.wishlistCount);
        } else {
          /* =========================
       ITEM BLOCKED
========================= */

          if (data.unavailable || data.message === "Out of stock") {
            const cartButtons = document.querySelectorAll(
              `.add-to-cart-btn[data-variant-id="${variantId}"]`,
            );

            cartButtons.forEach((cartButton) => {
              cartButton.classList.remove("added");

              cartButton.classList.add("unavailable");

              cartButton.dataset.loading = "false";

              cartButton.disabled = true;

              cartButton.innerHTML = `
      <i
        data-lucide="slash"
        size="18"
      ></i>

      Unavailable
    `;

              cartButton.style.opacity = ".6";

              cartButton.style.cursor = "not-allowed";
            });

            /* remove wishlist highlight */

            const wishlistButtons = document.querySelectorAll(
              `.wishlist-toggle[data-variant-id="${variantId}"]`,
            );

            wishlistButtons.forEach((wishlistButton) => {
              wishlistButton.classList.remove("active");
            });

            lucide.createIcons();

            showToast("warning", data.message);

            return;
          }

          /* =========================
       NORMAL FAILURE
========================= */
          else {
            button.dataset.loading = "false";

            button.disabled = false;

            button.classList.remove("unavailable");

            button.style.opacity = "";

            button.style.cursor = "";

            button.innerHTML = `
        <i
            data-lucide="shopping-cart"
            size="18"
        ></i>

        Add to Cart
    `;

            lucide.createIcons();

            showToast("info", data.message);
          }
        }
      } catch (error) {
        console.log(error);

        button.dataset.loading = "false";

        button.disabled = false;

        button.innerHTML = `
                        <i
                            data-lucide="shopping-cart"
                            size="18"
                        ></i>

                        Add to Cart
                    `;

        lucide.createIcons();
      }
    },
  );
});
