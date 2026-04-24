/* =========================================
   GLOBAL ANIMATIONS (Reusable Everywhere)
========================================= */

window.addEventListener('DOMContentLoaded', () => {

    const tl = gsap.timeline();

    /* =========================
       Entrance Animation
    ========================= */

    tl.from('.branding-panel', {
        duration: 1,
        x: -100,
        opacity: 0,
        ease: 'power4.out'
    })

    .from('.login-section, .signup-section, .otp-section, .auth-section', {
        duration: 1,
        x: 100,
        opacity: 0,
        ease: 'power4.out'
    }, '-=0.8')

    .from('.glass-card, .product-card, .otp-product', {
        duration: 0.8,
        scale: 0.8,
        opacity: 0,
        stagger: 0.1,
        ease: 'back.out(1.7)'
    }, '-=0.5')

    .from('.branding-text h1, .branding-text p', {
        duration: 0.8,
        y: 20,
        opacity: 0,
        stagger: 0.2,
        ease: 'power3.out'
    }, '-=0.5')

    .from('.form-container > *', {
        duration: 0.8,
        y: 30,
        opacity: 0,
        stagger: 0.1,
        ease: 'power3.out'
    }, '-=0.5');


    /* =========================
       FLOATING — LOGIN CARDS
    ========================= */

    gsap.to('.card-1', {
        y: '+=15',
        x: '+=5',
        rotation: '-=2',
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });

    gsap.to('.card-2', {
        y: '-=10',
        x: '-=8',
        rotation: '+=3',
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.5
    });

    gsap.to('.card-3', {
        y: '+=12',
        x: '-=5',
        rotation: '+=2',
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1
    });

    gsap.to('.card-4', {
        y: '-=15',
        x: '+=8',
        rotation: '-=3',
        duration: 4.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1.5
    });


    /* =========================
       FLOATING — SIGNUP CARDS
    ========================= */

    gsap.to('.card-iphone', {
        y: '+=15',
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });

    gsap.to('.card-macbook', {
        y: '-=10',
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });

    gsap.to('.card-watch', {
        y: '+=12',
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });

    gsap.to('.card-airpods', {
        y: '-=15',
        duration: 4.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });


    /* =========================
       FLOATING — OTP PRODUCTS
    ========================= */

    gsap.to('.otp-product', {
        y: '+=10',
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });

});