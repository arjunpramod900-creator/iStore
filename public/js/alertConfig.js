/* ==================================
   ISTORE PREMIUM ALERT SYSTEM
================================== */

/* ==================================
   BASE CONFIG
================================== */

const premiumAlertConfig = {

  background: "#FFFFFF",

  color: "#2C1421",

  backdrop: "rgba(17,17,17,0.55)",

  borderRadius: "28px",

  padding: "2rem",

  buttonsStyling: false,

  reverseButtons: true,

  allowOutsideClick: true,

  customClass: {

    popup:
    "premium-alert-popup",

    title:
    "premium-alert-title",

    htmlContainer:
    "premium-alert-text",

    confirmButton:
    "premium-alert-confirm",

    cancelButton:
    "premium-alert-cancel",

  },

 showClass: {

popup:
"animate__animated animate__fadeIn animate__faster",

backdrop:
"animate__animated animate__fadeIn"

},

hideClass: {

popup:
"animate__animated animate__fadeOut animate__faster",

backdrop:
"animate__animated animate__fadeOut"

},

}

/* ==================================
   LOADING ALERT
================================== */

window.showLoadingAlert = () => {

  Swal.fire({

    title: "Please wait...",

    allowOutsideClick: false,

    showConfirmButton: false,

    backdrop: "rgba(0,0,0,0.6)",

    showClass: {

popup:
"animate__animated animate__fadeIn animate__faster",

backdrop:
"animate__animated animate__fadeIn"

},

hideClass: {

popup:
"animate__animated animate__fadeOut animate__faster",

backdrop:
"animate__animated animate__fadeOut"

},

    didOpen: () => {

      Swal.showLoading()

    },

  })

}

/* ==================================
   SUCCESS ALERT
================================== */

window.showSuccessAlert = (
  title,
  text
) => {

  return Swal.fire({

    ...premiumAlertConfig,

    icon: "success",

    title,

    text,

    timer: 1600,

    showConfirmButton: false,

  })

}

/* ==================================
   ERROR ALERT
================================== */

window.showErrorAlert = (
  title,
  text
) => {

  return Swal.fire({

    ...premiumAlertConfig,

    icon: "error",

    title,

    text,

  })

}

/* ==================================
   LOGIN ALERT
================================== */

window.showLoginAlert = (

  text =
  "Please login to continue."

) => {

  return Swal.fire({

    ...premiumAlertConfig,

    icon: "info",

    title: "Login Required",

    text,

    showCancelButton: true,

    confirmButtonText: "Login",

    cancelButtonText: "Cancel",

  })

}

/* ==================================
   CONFIRM ALERT
================================== */

window.showConfirmAlert = ({

  title = "Are you sure?",

  text = "",

  confirmText = "Confirm",

  cancelText = "Cancel",

  icon = "warning",

}) => {

  return Swal.fire({

    ...premiumAlertConfig,

    icon,

    title,

    text,

    showCancelButton: true,

    confirmButtonText:
    confirmText,a

    cancelButtonText:
    cancelText,

  })

}

/* ==================================
   CANCEL REASON ALERT
================================== */

window.showCancelReasonAlert =
async ({

  title = "Cancel Order?",

  confirmText = "Confirm",

  placeholder = "Optional reason",

}) => {

  return Swal.fire({

    ...premiumAlertConfig,

    icon: "warning",

    title,

    html: `

      <textarea
      id="reasonInput"
      class="swal2-textarea"
      placeholder="${placeholder}"
      ></textarea>

    `,

    showCancelButton: true,

    confirmButtonText:
    confirmText,

    focusConfirm: false,

    preConfirm: () => {

      return document
      .getElementById(
        "reasonInput"
      )
      .value
      .trim()

    },

  })

}

/* ==================================
   RETURN REASON ALERT
================================== */

window.showReturnReasonAlert =
async () => {

  return Swal.fire({

    ...premiumAlertConfig,

    title: "Return Order",

    html: `

      <select
      id="returnReason"
      class="swal2-select"
      >

        <option value="">
        Select reason
        </option>

        <option>
        Wrong product delivered
        </option>

        <option>
        Damaged product
        </option>

        <option>
        Product not as expected
        </option>

        <option>
        Quality issue
        </option>

        <option>
        Other
        </option>

      </select>

      <textarea
      id="returnNote"
      class="swal2-textarea"
      placeholder="Additional notes"
      ></textarea>

    `,

    showCancelButton: true,

    confirmButtonText:
    "Submit Return",

    preConfirm: () => {

      const reason =
      document.getElementById(
        "returnReason"
      ).value

      const note =
      document.getElementById(
        "returnNote"
      ).value

      if(!reason){

        Swal.showValidationMessage(
          "Return reason required"
        )

        return false

      }

      return {

        reason:
        `${reason} ${note}`

      }

    },

  })

}