import nodemailer from "nodemailer";

/* ================================
   Send Email Function
================================ */

const sendEmail = async (email, subject, message) => {
  try {
    /* DEBUG LOGS (important now) */

    console.log("EMAIL_USER:", process.env.EMAIL_USER);
    console.log(
      "EMAIL_PASS:",
      process.env.EMAIL_PASS ? "Loaded ✅" : "Missing ❌",
    );

    /* Create Transporter INSIDE function */

    const transporter = nodemailer.createTransport({
      service: "gmail",

      auth: {
        user: process.env.EMAIL_USER,

        pass: process.env.EMAIL_PASS,
      },
    });

    /* Send Email */

    await transporter.sendMail({
      from: process.env.EMAIL_USER,

      to: email,

      subject,

      text: message,
    });

    console.log("Email sent successfully 📧");
  } catch (error) {
    console.log("Email sending failed ❌");

    console.error(error);
  }
};

export default sendEmail;
