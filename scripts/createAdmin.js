import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";

import connectDB from "../config/db.js";

import Admin from "../models/Admin.js";

const createAdmin = async () => {
  try {
    /* CONNECT DATABASE */

    await connectDB();

    /* ADMIN DETAILS */

    const adminEmail = "matrixcodexv8@gmail.com";

    const adminPassword = "matrix123";

    /* CHECK EXISTING ADMIN */

    const existingAdmin = await Admin.findOne({
      email: adminEmail,
    });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists");

      process.exit();
    }

    /* HASH PASSWORD */

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    /* CREATE ADMIN */

    const admin = new Admin({
      username: "Admin",

      email: adminEmail,

      password: hashedPassword,

      phoneNumber: "9999999999",
    });

    await admin.save();

    console.log("✅ Admin created successfully");

    console.log("📧 Email:", adminEmail);

    console.log("🔑 Password:", adminPassword);

    process.exit();
  } catch (error) {
    console.error("❌ Error creating admin:", error);

    process.exit(1);
  }
};

createAdmin();
