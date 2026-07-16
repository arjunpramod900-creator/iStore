import razorpay from "../../config/razorpay.js";
import crypto from "crypto";

export const createRazorpayOrder = async ({ amount }) => {
  try {
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),

      currency: "INR",

      receipt: `receipt_${Date.now()}`,
    });

    return {
      success: true,

      razorpayOrder,
    };
  } catch (error) {
    console.log("Create Razorpay Order Error:", error);

    return {
      success: false,

      message: "Failed to create Razorpay order",
    };
  }
};

export const verifyRazorpaySignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "dummy")
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return generatedSignature === razorpaySignature;
};
