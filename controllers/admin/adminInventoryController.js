import {
  loadInventoryService,
} from "../../services/admin/inventoryService.js";

import Variant from "../../models/Variant.js";

/* ============================
   LOAD INVENTORY PAGE
============================ */

export const loadInventory =
async (req, res) => {

  try {

    const inventoryData =
      await loadInventoryService(
        req.query
      );

    res.render(
      "admin/inventory-management",
      {
        page: "inventory",

        ...inventoryData,
      }
    );

  } catch (error) {

    console.log(
      "Load Inventory Error:",
      error
    );

    res.redirect(
      "/admin/dashboard"
    );

  }

};




export const updateVariantStock =
async (req, res) => {

  try {

    const { variantId } =
      req.params;

    const { stock } =
      req.body;

    if (
      stock === undefined ||
      Number(stock) < 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid stock value",

      });

    }

    await Variant.findByIdAndUpdate(

      variantId,

      {
        stock: Number(stock),
      }

    );

    return res.json({

      success: true,

      message:
        "Stock updated",

    });

  }

  catch (error) {

    console.log(
      "Update Stock Error:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        "Server Error",

    });

  }

};