/* =========================================
   SAFE TILT EFFECT (Compatible With GSAP)
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".glass-card, .product-card");

  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();

      const x = e.clientX - rect.left;

      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;

      const centerY = rect.height / 2;

      const rotateX = (y - centerY) / 15;

      const rotateY = (centerX - x) / 15;

      /* USE GSAP (NOT style.transform) */

      gsap.to(card, {
        rotateX: rotateX,
        rotateY: rotateY,
        scale: 1.05,
        duration: 0.2,
        ease: "power2.out",
      });
    });

    card.addEventListener("mouseleave", () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        duration: 0.4,
        ease: "power2.out",
      });
    });
  });
});
