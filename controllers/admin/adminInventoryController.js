import {
  loadInventoryService,
} from "../../services/admin/inventoryService.js";

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