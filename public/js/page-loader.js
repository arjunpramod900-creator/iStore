/* ============================================================
   PAGE LOADING OVERLAY — /js/page-loader.js
   Shows a full-screen overlay + spinner on:
     • <a> link clicks (page navigations)
     • <form> submissions
   Automatically skips non-navigation clicks.
============================================================ */

(function () {
  /* ── Create overlay DOM ── */
  var overlay = document.createElement("div");
  overlay.className = "page-loader-overlay";
  overlay.id = "pageLoaderOverlay";
  overlay.innerHTML = '<div class="page-loader-spinner"></div>';
  document.body.appendChild(overlay);

  function showLoader() {
    overlay.classList.add("active");
  }

  /* ── Helper: should we skip this link? ── */
  function shouldSkipLink(anchor) {
    /* No href or placeholder href */
    var href = anchor.getAttribute("href");
    if (
      !href ||
      href === "#" ||
      href.startsWith("#") ||
      href === "javascript:void(0)"
    )
      return true;

    /* Opens in new tab */
    if (anchor.target === "_blank") return true;

    /* Download link */
    if (anchor.hasAttribute("download")) return true;

    /* Has data-no-loader attribute (opt-out) */
    if (anchor.hasAttribute("data-no-loader")) return true;

    /* Mailto / tel */
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return true;

    return false;
  }

  /* ── Link clicks ── */
  document.addEventListener("click", function (e) {
    var anchor = e.target.closest("a");
    if (!anchor) return;
    if (shouldSkipLink(anchor)) return;

    /* If ctrl/cmd/shift click (new tab) — skip */
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;

    showLoader();
  });

  /* ── Form submissions ── */
  document.addEventListener("submit", function (e) {
    var form = e.target;

    /* Skip forms that use fetch (they have data-no-loader) */
    if (form.hasAttribute("data-no-loader")) return;

    /* Skip forms without an action or with javascript: action */
    var action = form.getAttribute("action");
    if (action && action.startsWith("javascript:")) return;

    /* Skip forms that target an iframe or new tab (e.g. Razorpay mock bank) */
    var target = form.getAttribute("target");
    if (target && target !== "_self") return;

    /* Skip Razorpay internal forms specifically */
    if (action && action.indexOf("razorpay.com") !== -1) return;

    showLoader();
  });

  /* ── Hide overlay if user hits back button (bfcache) ── */
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      overlay.classList.remove("active");
    }
  });

  /* ── Safety: hide after 10s in case navigation was cancelled ── */
  var safetyTimer;
  function startSafetyTimer() {
    clearTimeout(safetyTimer);
    safetyTimer = setTimeout(function () {
      overlay.classList.remove("active");
    }, 10000);
  }

  /* Hook safety timer to showLoader */
  var origShow = showLoader;
  showLoader = function () {
    origShow();
    startSafetyTimer();
  };
})();
