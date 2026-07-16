/* =========================================
   UPDATE HEADER COUNTS
========================================= */

function updateHeaderCounts(cartCount, wishlistCount) {
  const wishlistLink = document.querySelector('a[href="/wishlist"]');

  const cartLink = document.querySelector('a[href="/cart"]');

  /* WISHLIST */

  if (wishlistLink && typeof wishlistCount !== "undefined") {
    let badge = wishlistLink.querySelector(".wishlist-count");

    if (wishlistCount > 0) {
      if (!badge) {
        badge = document.createElement("span");

        badge.className = "wishlist-count";

        wishlistLink.appendChild(badge);
      }

      badge.textContent = wishlistCount;
    } else if (badge) {
      badge.remove();
    }
  }

  /* CART */

  if (cartLink && typeof cartCount !== "undefined") {
    let badge = cartLink.querySelector(".cart-count");

    if (cartCount > 0) {
      if (!badge) {
        badge = document.createElement("span");

        badge.className = "cart-count";

        cartLink.appendChild(badge);
      }

      badge.textContent = cartCount;
    } else if (badge) {
      badge.remove();
    }
  }
}

/* =========================================
   ADD TO WISHLIST
========================================= */

const wishlistButtons = document.querySelectorAll(
  ".wishlist-toggle, .btn-wishlist",
);

wishlistButtons.forEach((button) => {
  button.addEventListener(
    "click",

    async (e) => {
      e.preventDefault();

      if (button.disabled) return;
      button.disabled = true;

      try {
        const productId = button.dataset.productId;

        const variantId = button.dataset.variantId;

        const response = await fetch(
          "/wishlist/add",

          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },

            body: JSON.stringify({
              productId,

              variantId,
            }),
          },
        );

        const data = await response.json();

        /* =========================================
                    LOGIN REQUIRED
                ========================================= */

        if (data.requiresLogin) {
          showLoginAlert("Please login to use wishlist.").then((result) => {
            if (result.isConfirmed) {
              window.location.href = "/login";
            }
          });

          return;
        }

        if (data.success) {
          const allWishlistButtons = document.querySelectorAll(
            `.wishlist-toggle[data-variant-id="${variantId}"],
   .btn-wishlist[data-variant-id="${variantId}"]`,
          );

          allWishlistButtons.forEach((btn) => {
            btn.classList.add("active");
          });

          showToast("success", data.message);

          updateHeaderCounts(data.cartCount, data.wishlistCount);
        } else {
          /* REMOVE FROM WISHLIST */

          if (data.message === "Already in wishlist") {
            const removeResponse = await fetch(
              `/wishlist/remove/${variantId}`,

              {
                method: "DELETE",
              },
            );

            const removeData = await removeResponse.json();

            if (removeData.success) {
              button.classList.remove("active");
              /* =========================================

            UPDATE ALL CART BUTTONS

            ========================================= */

              const cartButtons = document.querySelectorAll(
                `.add-to-cart-btn[data-variant-id="${variantId}"]`,
              );

              cartButtons.forEach((cartButton) => {
                cartButton.classList.remove("added");

                cartButton.disabled = false;

                cartButton.innerHTML = `

                    <i

                        data-lucide="shopping-cart"

                        size="18"

                    ></i>

                    Add to Cart

                `;
              });

              /* =========================================

            UPDATE ALL WISHLIST BUTTONS

            ========================================= */

              const wishlistButtons = document.querySelectorAll(
                `.wishlist-toggle[data-variant-id="${variantId}"]`,
              );

              wishlistButtons.forEach((wishlistButton) => {
                wishlistButton.classList.remove("active");
              });

              lucide.createIcons();

              showToast("success", "Removed from wishlist");

              updateHeaderCounts(
                removeData.cartCount,
                removeData.wishlistCount,
              );
            }
          } else {
            /* =========================================
   ITEM UNAVAILABLE
========================================= */

            if (data.unavailable) {
              const allWishlistButtons = document.querySelectorAll(
                `.wishlist-toggle[data-variant-id="${variantId}"],
   .btn-wishlist[data-variant-id="${variantId}"]`,
              );

              allWishlistButtons.forEach((btn) => {
                btn.classList.remove("active");

                btn.disabled = true;

                btn.style.opacity = ".6";

                btn.style.cursor = "not-allowed";
              });

              /* disable cart buttons too */

              const cartButtons = document.querySelectorAll(
                `.add-to-cart-btn[data-variant-id="${variantId}"]`,
              );

              cartButtons.forEach((btn) => {
                btn.classList.remove("added");

                btn.disabled = true;

                btn.style.opacity = ".6";

                btn.style.cursor = "not-allowed";

                btn.innerHTML = `
      <i data-lucide="slash" size="18"></i>
      Unavailable
    `;
              });

              lucide.createIcons();

              showToast("warning", data.message);

              return;
            }
            showToast(
              "info",

              data.message,
            );
          }
        }
      } catch (error) {
        console.log(error);
      } finally {
        button.disabled = false;
      }
    },
  );
});

/* =========================================
   REMOVE FROM WISHLIST
========================================= */

async function removeFromWishlist(variantId) {
  const result = await Swal.fire({
    title: "Remove Item?",

    text: "This product will be removed from wishlist.",

    icon: "warning",

    showCancelButton: true,

    confirmButtonText: "Remove",

    cancelButtonText: "Cancel",
    buttonsStyling: false,
    reverseButtons: true,
    background: "#FFFFFF",
    color: "#111111",
    customClass: {
      popup: "premium-alert-popup",
      confirmButton: "premium-alert-confirm",
      cancelButton: "premium-alert-cancel",
    },
  });

  if (!result.isConfirmed) {
    return;
  }

  const removeBtn = document.querySelector(`#card-${variantId} .btn-remove`);
  let originalRemoveHTML = "";
  if (removeBtn) {
    originalRemoveHTML = removeBtn.innerHTML;
    removeBtn.disabled = true;
    removeBtn.innerHTML =
      '<i data-lucide="loader-circle" size="18" class="spin"></i>';
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  try {
    const response = await fetch(
      `/wishlist/remove/${variantId}`,

      {
        method: "DELETE",
      },
    );

    const data = await response.json();

    if (data.success) {
      const card = document.getElementById(`card-${variantId}`);

      gsap.to(
        card,

        {
          scale: 0.9,

          opacity: 0,

          y: -20,

          duration: 0.4,

          ease: "power2.inOut",

          onComplete: () => {
            card.remove();

            checkEmptyWishlist();
          },
        },
      );

      showToast("success", "Removed from wishlist");

      updateHeaderCounts(data.cartCount, data.wishlistCount);
    }
  } catch (error) {
    console.log(error);
    if (removeBtn) {
      removeBtn.disabled = false;
      removeBtn.innerHTML = originalRemoveHTML;
      if (typeof lucide !== "undefined") lucide.createIcons();
    }
  }
}

/* =========================================
   MOVE TO CART
========================================= */

async function moveToCart(variantId) {
  const card = document.getElementById(`card-${variantId}`);
  const moveBtn = card?.querySelector(".btn-add-cart");
  if (moveBtn) {
    moveBtn.disabled = true;
    moveBtn.textContent = "Moving…";
  }

  try {
    const response = await fetch(
      `/wishlist/move-to-cart/${variantId}`,

      {
        method: "POST",
      },
    );

    const data = await response.json();

    if (data.success) {
      const card = document.getElementById(`card-${variantId}`);

      const button = card.querySelector(".btn-add-cart");

      button.innerHTML = `
                <i
                    data-lucide="check"
                    size="18"
                ></i>

                Added
            `;

      button.style.background = "#603763";

      lucide.createIcons();

      gsap.to(
        card,

        {
          y: -30,

          opacity: 0,

          duration: 0.45,

          delay: 0.5,

          ease: "power2.inOut",

          onComplete: () => {
            card.remove();

            checkEmptyWishlist();
          },
        },
      );

      showToast(
        "success",

        "Moved to cart",
      );

      updateHeaderCounts(data.cartCount, data.wishlistCount);
    } else {
      if (data.unavailable) {
        const card = document.getElementById(`card-${variantId}`);

        if (card) {
          card.querySelector(".btn-add-cart").disabled = true;

          card.querySelector(".btn-add-cart").innerHTML = `
        Unavailable
      `;

          card.querySelector(".btn-add-cart").style.opacity = ".6";
        }

        showToast("warning", data.message);

        return;
      }

      showToast("info", data.message);
    }
  } catch (error) {
    console.log(error);
    if (moveBtn) {
      moveBtn.disabled = false;
      moveBtn.textContent = "Add to Cart";
    }
  }
}

/* =========================================
   EMPTY CHECK
========================================= */

function checkEmptyWishlist() {
  const grid = document.getElementById("wishlistGrid");

  if (grid && grid.children.length === 0) {
    setTimeout(() => {
      location.reload();
    }, 400);
  }
}

/* =========================================
   RESTORE WISHLIST AFTER CART REMOVE
========================================= */

window.addEventListener(
  "DOMContentLoaded",

  () => {
    const variantId = localStorage.getItem("wishlistRestore");

    if (!variantId) {
      return;
    }

    const wishlistButtons = document.querySelectorAll(
      `.wishlist-toggle[data-variant-id="${variantId}"]`,
    );

    wishlistButtons.forEach((button) => {
      button.classList.add("active");
    });

    const cartButtons = document.querySelectorAll(
      `.add-to-cart-btn[data-variant-id="${variantId}"]`,
    );

    cartButtons.forEach((button) => {
      button.classList.remove("added");

      button.innerHTML = `

                <i
                    data-lucide="shopping-cart"
                    size="18"
                ></i>

                Add to Cart

            `;
    });

    lucide.createIcons();

    localStorage.removeItem("wishlistRestore");
  },
);

/* =========================================
   WISHLIST PAGE BUTTON BINDINGS
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  /* Bind Remove Buttons */
  document.querySelectorAll(".wishlist-page-remove-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const variantId = this.getAttribute("data-variant-id");
      if (variantId) {
        removeFromWishlist(variantId);
      }
    });
  });

  /* Bind Add to Cart Buttons */
  document.querySelectorAll(".wishlist-page-add-cart-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const variantId = this.getAttribute("data-variant-id");
      if (variantId) {
        moveToCart(variantId);
      }
    });
  });
});

/* =========================================
   ADD ALL TO CART
========================================= */

const addAllToCartBtn = document.getElementById("addAllToCartBtn");

if (addAllToCartBtn) {
  addAllToCartBtn.addEventListener(
    "click",

    async () => {
      const originalText = addAllToCartBtn.innerHTML;

      try {
        addAllToCartBtn.disabled = true;

        addAllToCartBtn.innerHTML = "Moving...";

        const response = await fetch("/wishlist/add-all-to-cart", {
          method: "POST",
        });

        const data = await response.json();

        if (!data.success) {
          showToast("info", data.message);

          return;
        }

        /* HEADER COUNTS */

        updateHeaderCounts(data.cartCount, data.wishlistCount);

        /* REMOVE MOVED CARDS */

        if (Array.isArray(data.movedVariantIds)) {
          data.movedVariantIds.forEach((variantId, index) => {
            const card = document.getElementById(`card-${variantId}`);

            if (!card) return;

            gsap.to(card, {
              y: -30,
              opacity: 0,
              duration: 0.45,
              delay: index * 0.05,

              ease: "power2.inOut",

              onComplete: () => {
                card.remove();

                checkEmptyWishlist();
              },
            });
          });
        }

        /* PARTIAL SUCCESS */

        if (data.skippedItems && data.skippedItems.length) {
          let html = `
                        <div style="text-align:left;">
                            <p>
                                <strong>
                                    ${data.addedCount}
                                </strong>
                                item(s) added to cart
                            </p>

                            <br>

                            <strong>
                                Couldn't move:
                            </strong>

                            <ul
                                style="
                                    margin-top:10px;
                                    padding-left:18px;
                                "
                            >
                                ${data.skippedItems
                                  .map(
                                    (item) =>
                                      `<li>
                                            ${item.name}
                                            — 
                                            ${item.reason}
                                        </li>`,
                                  )
                                  .join("")}
                            </ul>
                        </div>
                    `;

          await Swal.fire({
            icon: "info",

            title: "Some Items Were Skipped",

            html,

            confirmButtonText: "Continue",
          });
        } else {
          /* FULL SUCCESS */

          showToast(
            "success",
            `${data.addedCount} item${data.addedCount > 1 ? "s" : ""} added to cart`,
          );
        }
      } catch (error) {
        console.log("Move All Error:", error);

        showToast("error", "Something went wrong");
      } finally {
        addAllToCartBtn.disabled = false;

        addAllToCartBtn.innerHTML = originalText;
      }
    },
  );
}
