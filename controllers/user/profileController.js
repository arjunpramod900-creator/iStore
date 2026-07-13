import User from "../../models/User.js";
import cloudinary from "../../config/cloudinary.js";

/* =========================
   LOAD EDIT PROFILE
========================= */

export const loadEditProfile = async (req, res) => {
  try {
    const userId = req.session.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.redirect("/login");
    }

    res.render(
      "user/edit-profile",

      { user },
    );
  } catch (error) {
    console.log("Load Edit Profile Error:", error);

    res.redirect("/profile");
  }
};

/* =========================
   UPDATE PROFILE
========================= */

export const updateProfile = async (req, res) => {
  try {
    const userId = req.session.userId;

    const { fullName, phoneNumber, dateOfBirth } = req.body;

    /* =========================
       PHONE VALIDATION (NEW)
       Optional but must be 10 digits
    ========================= */

    if (phoneNumber && !/^[0-9]{10}$/.test(phoneNumber)) {
      req.session.toast = {
        type: "error",

        message: "Phone number must be exactly 10 digits",
      };

      return res.redirect("/edit-profile");
    }

    /* =========================
       PREPARE UPDATE DATA
    ========================= */

    let updateData = {
      fullName,

      phoneNumber: phoneNumber || "",

      dateOfBirth,
    };

    /* =========================
       IMAGE UPLOAD DEBUG
    ========================= */

    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    if (req.file) {
      console.log("📸 File received:", req.file.path);

      const result = await cloudinary.uploader.upload(
        req.file.path,

        {
          folder: "profile_photos",
        },
      );

      console.log("☁️ Cloudinary URL:", result.secure_url);

      updateData.profilePhoto = result.secure_url;
    } else {
      console.log("❌ No file received");
    }

    /* =========================
       UPDATE USER
    ========================= */

    await User.findByIdAndUpdate(
      userId,

      updateData,

      { returnDocument: 'after' },
    );

    /* =========================
       TOAST MESSAGE
    ========================= */

    req.session.toast = {
      type: "success",

      message: "Profile Updated Successfully",
    };

    res.redirect("/profile");
  } catch (error) {
    console.log("Update Profile Error:", error);

    res.redirect("/edit-profile");
  }
};








