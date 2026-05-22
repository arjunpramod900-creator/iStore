/* ==================================
   GLOBAL SWEET ALERT CONFIG
================================== */

window.showLoadingAlert = () => {

    Swal.fire({

        title: "Please wait...",
        allowOutsideClick: false,

        showConfirmButton: false,

        backdrop: `
            rgba(0,0,0,0.6)
        `,

        showClass: {

            popup:
            "animate__animated animate__fadeInDown"

        },

        hideClass: {

            popup:
            "animate__animated animate__fadeOutUp"

        },

        didOpen: () => {

            Swal.showLoading()

        }

    })

}



window.showSuccessAlert = (

    title,
    text

) => {

    return Swal.fire({

        icon: "success",

        title,
        text,

        timer: 1500,

        showConfirmButton: false,

        backdrop:
        "rgba(0,0,0,0.6)"

    })

}



window.showErrorAlert = (

    title,
    text

) => {

    return Swal.fire({

        icon: "error",

        title,
        text,

        backdrop:
        "rgba(0,0,0,0.6)"

    })

}


window.showLoginAlert = (

    text = "Please login to continue."

) => {

    return Swal.fire({

        icon: "info",

        title: "Login Required",

        text,

        showCancelButton: true,

        confirmButtonText: "Login",

        cancelButtonText: "Cancel",

        background: "#FFFFFF",

        color: "#2C1421",

        backdrop:
        "rgba(17,17,17,0.55)",

        borderRadius: "28px",

        padding: "2rem",

        buttonsStyling: false,

    

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
            "premium-alert-cancel"

        }

    })

}