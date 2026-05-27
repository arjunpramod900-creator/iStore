/* =========================================
   PREMIUM ISTORE TOAST
========================================= */

window.showToast = (
  icon,

  title,
) => {
  Swal.fire({
    toast: true,

    position: "top",

    icon: icon,

    title: title,

    showConfirmButton: false,

    timer: 2200,

    timerProgressBar: false,

    background: "rgba(45, 0, 79, 0.88)",

    color: "#FFFFFF",

    backdrop: false,

    customClass: {
      popup: "istore-toast",

      title: "istore-toast-title",

      icon: "istore-toast-icon",
    },

    showClass: {
      popup: "animate__animated animate__fadeInDown",
    },

    hideClass: {
      popup: "animate__animated animate__fadeOutUp",
    },
  });
};
