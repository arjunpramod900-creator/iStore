import nodemailer from "nodemailer";

/* ================================
   Send Email Function
================================ */

const sendEmail = async (email, subject, message, html = null) => {
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "Loaded ✅" : "Missing ❌");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      text: message,
      ...(html ? { html } : {}),
    });
    console.log("Email sent successfully 📧");
  } catch (error) {
    console.log("Email sending failed ❌");
    console.error(error);
    // Rethrow so callers can react instead of assuming success (#6)
    throw error;
  }
};

export default sendEmail;
