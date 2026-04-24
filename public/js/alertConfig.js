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