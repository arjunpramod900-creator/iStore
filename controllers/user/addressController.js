import { addressSchema } from "../../validators/addressValidator.js";

import Address from "../../models/Address.js";

/* =========================
   LOAD ADDRESSES PAGE
========================= */

export const loadAddresses = async (req, res) => {
  try {
    const userId = req.session.userId;

    /* Get user addresses */

    const addresses = await Address.find({
      userId,
    }).sort({
      isDefault: -1,

      createdAt: -1,
    });

    res.render("user/addresses", {
      addresses,
    });
  } catch (error) {
    console.log("Load Addresses Error:", error);

    res.redirect("/profile");
  }
};

/* =========================
   ADD NEW ADDRESS
========================= */

export const addAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    

    /* ZOD VALIDATION */

    const result = addressSchema.safeParse(req.body);

    if (!result.success) {

      return res.status(400).json({

        success: false,

        message:
          result.error.errors[0].message

      });

    }

    const data = result.data;

    /* DEFAULT HANDLING */

    if (data.isDefault) {
      await Address.updateMany({ userId }, { isDefault: false });
    }

    /* CREATE ADDRESS */

    const newAddress = new Address({
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      addressLine1: data.addressLine1,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      country: data.country,
      type: data.type,
      userId,
      isDefault: data.isDefault || false,
    });

    await newAddress.save();

    return res.json({

      success: true,

      message:
      "Address added successfully",

      redirectTo:
      req.body.redirectTo ||
      "/addresses"

    });
  } catch (error) {
    console.log("Add Address Error:", error);

    res.redirect(

req.body.redirectTo ||

"/addresses"

);
  }
};

/* =========================
   DELETE ADDRESS
========================= */

export const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;

    await Address.findByIdAndDelete(addressId);

    res.redirect("/addresses");
  } catch (error) {
    console.log("Delete Address Error:", error);

    res.redirect("/addresses");
  }
};

/* =========================
   UPDATE ADDRESS
========================= */

export const updateAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.userId;

    /* ZOD VALIDATION */

    const result = addressSchema.safeParse(req.body);

    if (!result.success) {

      return res.status(400).json({

        success: false,

        message:
          result.error.errors[0].message

      });

    }

    const data = result.data;

    /* DEFAULT LOGIC */

    if (data.isDefault) {
      await Address.updateMany({ userId }, { isDefault: false });
    }

    /* UPDATE ADDRESS */

    await Address.findByIdAndUpdate(
      addressId,

      {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        addressLine1: data.addressLine1,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        country: data.country,
        type: data.type,
        isDefault: data.isDefault || false,
      },
    );

    return res.status(200).json({

        success: true,

        message: "Address updated successfully.",

        redirectTo:

        req.body.redirectTo ||

        "/addresses"

    });
  } catch (error) {
    console.log("Update Address Error:", error);

   return res.status(500).json({

    success: false,

    message:
    "Something went wrong while updating the address."

});
  }
};

/* =========================
   SET DEFAULT ADDRESS
   Add this to addressController.js
========================= */

export const setDefaultAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.userId;

    // Unset all existing defaults for this user
    await Address.updateMany({ userId }, { isDefault: false });

    // Set the chosen address as default
    await Address.findByIdAndUpdate(addressId, { isDefault: true });

    return res.status(200).json({
      success: true,
      message: "Default address updated successfully.",
    });
  } catch (error) {
    console.log("Set Default Address Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating your default address.",
    });
  }
};
