import helmet from "helmet";

const isProduction = process.env.NODE_ENV === "production";

const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://unpkg.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://checkout.razorpay.com",
        "https://razorpay.com",
        "https://*.razorpay.com",
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com",
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://res.cloudinary.com",
        "https://store.storeimages.cdn-apple.com",
        "https://*.cdn-apple.com",
        "https://www.gstatic.com",
        "https://*.googleusercontent.com",
        "https://razorpay.com",
        "https://*.razorpay.com",
      ],
      connectSrc: [
        "'self'",
        "https://api.razorpay.com",
        "https://checkout.razorpay.com",
        "https://lux-gateway.razorpay.com",
        "https://razorpay.com",
        "https://*.razorpay.com",
        "https://rzp.io",
        "https://*.rzp.io",
      ],
      frameSrc: [
        "'self'",
        "https://api.razorpay.com",
        "https://checkout.razorpay.com",
        "https://razorpay.com",
        "https://*.razorpay.com",
        "https://rzp.io",
        "https://*.rzp.io",
      ],
      "upgrade-insecure-requests": isProduction ? [] : null,
    },
  },
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
});

export default helmetConfig;
