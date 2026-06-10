import Razorpay from "razorpay";

const razorpay = new Razorpay({

  key_id:
    process.env.RAZORPAY_KEY_ID || "dummy",

  key_secret:
    process.env.RAZORPAY_KEY_SECRET || "dummy",

});

export default razorpay;