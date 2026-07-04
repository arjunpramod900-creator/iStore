import {
  loadOrdersService,
  getOrderDetailsService,
  updateOrderStatusService,
  updateItemStatusService,
  handleReturnRequestService,
  handleItemReturnRequestService,
} from "../../services/admin/orderService.js";

/* ============================
   ORDER LIST
============================ */

export const loadOrders = async (req, res) => {
  try {

    const data =
      await loadOrdersService(
        req.query
      );

    res.render(
      "admin/order-management",
      {
        page: "orders",
        ...data,
      }
    );

  } catch (error) {

    console.log(
      "Load Orders Error:",
      error
    );

    res.redirect(
      "/admin/dashboard"
    );

  }
};

/* ============================
   ORDER DETAILS
============================ */

export const viewOrderDetails =
async (req, res) => {

  try {

    const order =
      await getOrderDetailsService(
        req.params.id
      );

    res.render(
      "admin/order-details",
      {
        page: "orders",
        order,
      }
    );

  } catch (error) {

    console.log(error);

    res.redirect(
      "/admin/orders"
    );

  }

};

/* ============================
   UPDATE STATUS
============================ */

export const updateOrderStatus =
async (req, res) => {

  try {

    await updateOrderStatusService(

      req.params.id,

      req.body.status

    );

    res.json({
      success: true,
      message:
        "Order updated successfully",
    });

  } catch (error) {

    res.json({
      success: false,
      message: error.message,
    });

  }

};
/* ============================
   UPDATE ITEM STATUS
============================ */

export const updateItemStatus = async (req, res) => {
  try {
    await updateItemStatusService(
      req.params.id,
      req.params.itemId,
      req.body.status
    );
    res.json({
      success: true,
      message: "Item status updated successfully",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};
/* ============================
   RETURN REQUEST
============================ */


export const handleReturnRequest =
async (
  req,
  res
) => {

  try {

    const response =
    await handleReturnRequestService(

      req.params.id,
        
      req.body.action

    );

    res.json(response);

  }

  catch (error) {

    res.json({

      success: false,

      message:
      error.message,

    });

  }

};


/* ============================
   ITEM RETURN REQUEST
============================ */

export const handleItemReturnRequest = async (
  req,
  res,
) => {

  try {

    const response =
      await handleItemReturnRequestService(

        req.params.id,

        req.params.itemId,

        req.body.action,

      );

    res.json(response);

  } catch (error) {

    res.json({

      success: false,

      message: error.message,

    });

  }

};