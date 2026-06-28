import ExcelJS from "exceljs";
import { getSalesReportService } from "../../services/admin/salesService.js";

export const downloadSalesReportExcel = async (req, res) => {

  try {
    const { filter = "daily", startDate, endDate } = req.query;
    const report = await getSalesReportService(filter, startDate, endDate);

    const workbook  = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    /* ── Column Keys & Widths (No Headers yet to avoid overwriting row 1) ── */
    worksheet.columns = [
      { key: "orderId",       width: 25 },
      { key: "date",          width: 14 },
      { key: "customer",      width: 22 },
      { key: "product",       width: 30 },
      { key: "variant",       width: 18 },
      { key: "qty",           width: 8 },
      { key: "unitPrice",     width: 15 },
      { key: "itemTotal",     width: 15 },
      { key: "refund",        width: 15 },
      { key: "itemStatus",    width: 16 },
      { key: "paymentStatus", width: 16 },
      { key: "orderStatus",   width: 16 },
      { key: "payMethod",     width: 16 },
    ];

    /* ── Title and Period ── */
    worksheet.addRow(["iStore Sales Report"]);
    worksheet.mergeCells('A1:M1');
    worksheet.getCell('A1').font = { size: 16, bold: true, color: { argb: "FF2C1421" } };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow([`Report Period: ${report.resolvedStartDate} - ${report.resolvedEndDate}`]);
    worksheet.mergeCells('A2:M2');
    worksheet.getCell('A2').font = { size: 11, italic: true, color: { argb: "FF4B5563" } };
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow([]);

    /* ── Headers ── */
    const headerRow = worksheet.addRow([
      "Order ID", "Date", "Customer", "Product", "Variant", "Qty",
      "Unit Price", "Item Total", "Refund", "Item Status",
      "Payment Status", "Order Status", "Pay Method"
    ]);
    headerRow.eachCell(cell => {
      cell.font            = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill            = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A0A2E" } };
      cell.alignment       = { vertical: "middle", horizontal: "center" };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFA78BFA" } },
      };
    });
    headerRow.height = 24;

    let rowIndex = 0;

    /* ── Order rows — broken down by item ── */
    report.recentOrders.forEach(order => {
      
      const orderDate = new Date(order.createdAt).toLocaleDateString("en-IN");
      const customerName = order.shippingAddress?.fullName || "—";
      
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          rowIndex++;
          
          /* Determine item specific payment status just like the web table */
          let itemPayStatus = order.paymentStatus || 'Pending';
          if (item.itemStatus === 'Cancelled' || item.itemStatus === 'Returned') {
              if (order.paymentMethod !== 'COD' || order.paymentStatus === 'Paid') {
                  itemPayStatus = 'Refunded';
              } else {
                  itemPayStatus = 'Cancelled';
              }
          }
          
          const itemTax = Math.round((item.finalPrice || 0) * 0.02);
          const itemTotal = (item.finalPrice || (item.price * item.quantity)) + (order.taxAmount > 0 ? itemTax : 0);

          const row = worksheet.addRow({
            orderId:       order.orderId,
            date:          orderDate,
            customer:      customerName,
            product:       item.productName,
            variant:       item.variantName || "—",
            qty:           item.quantity,
            unitPrice:     item.price,
            itemTotal:     itemTotal,
            refund:        item.refundAmount || 0,
            itemStatus:    item.itemStatus || order.orderStatus,
            paymentStatus: itemPayStatus,
            orderStatus:   order.orderStatus,
            payMethod:     order.paymentMethod || "COD",
          });

          /* Alternate row shading based on row index */
          const bg = rowIndex % 2 === 0 ? "FFFAF9FF" : "FFFFFFFF";
          row.eachCell(cell => {
            cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
            cell.alignment = { vertical: "middle" };
          });

          /* Number formatting & Alignment */
          row.getCell("qty").alignment = { horizontal: "center" };
          row.getCell("unitPrice").numFmt = '₹#,##0.00';
          row.getCell("itemTotal").numFmt = '₹#,##0.00';
          
          if (item.refundAmount > 0) {
             row.getCell("refund").numFmt = '₹#,##0.00';
             row.getCell("refund").font = { color: { argb: "FF059669" }, bold: true };
          } else {
             row.getCell("refund").value = "—";
             row.getCell("refund").alignment = { horizontal: "center" };
          }

          /* Colour the Status cells */
          const styleStatusCell = (cell, status) => {
            const statusUpper = (status || "").toUpperCase();
            const statusColors = {
              DELIVERED:        "FF16A34A",
              RETURNED:         "FFDC2626",
              REFUNDED:         "FFDC2626",
              CANCELLED:        "FF6B7280",
              PENDING:          "FFD97706",
              PROCESSING:       "FF2563EB",
              SHIPPED:          "FF0891B2",
              "OUT FOR DELIVERY": "FF7C3AED",
            };
            if (statusColors[statusUpper]) {
              cell.font = { color: { argb: statusColors[statusUpper] }, bold: true };
            }
          };

          styleStatusCell(row.getCell("itemStatus"), item.itemStatus || order.orderStatus);
          styleStatusCell(row.getCell("orderStatus"), order.orderStatus);
          styleStatusCell(row.getCell("paymentStatus"), itemPayStatus);

        });
      } else {
         // Fallback for orders with no items
         rowIndex++;
         const row = worksheet.addRow({
            orderId:       order.orderId,
            date:          orderDate,
            customer:      customerName,
            product:       "—",
            variant:       "—",
            qty:           0,
            unitPrice:     0,
            itemTotal:     order.displayAmount ?? order.finalAmount ?? 0,
            refund:        order.refundAmount || 0,
            itemStatus:    order.orderStatus,
            paymentStatus: order.paymentStatus,
            orderStatus:   order.orderStatus,
            payMethod:     order.paymentMethod || "COD",
         });
         
         const bg = rowIndex % 2 === 0 ? "FFFAF9FF" : "FFFFFFFF";
         row.eachCell(cell => {
            cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
            cell.alignment = { vertical: "middle" };
         });
      }
    });

    /* ── Empty separator ── */
    worksheet.addRow([]);

    /* ── Summary block ── */
    const summaryRows = [
      ["Total Orders Sold (Delivered)",  report.totalSalesCount],
      ["Total Returned Orders",          report.totalReturnedCount],
      ["Gross Revenue",                  report.grossRevenue],
      ["Total Refunds",                  report.totalRefundAmount],
      ["Net Revenue",                    report.netRevenue],
      ["Total Discount",                 report.totalDiscount],
      ["Coupon Deductions",              report.totalCouponDeduction],
      ["Avg Order Value",                report.avgOrderValue],
      ["Return Rate",                    report.returnRate + "%"],
    ];

    summaryRows.forEach(([label, value]) => {
      const row = worksheet.addRow([label, value]);
      row.getCell(1).font      = { bold: true };
      row.getCell(1).fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } };
      row.getCell(2).alignment = { horizontal: "right" };
    });

    /* ── HTTP headers ── */
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales-report-${filter}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.log("Excel Export Error:", error);
    res.redirect("/admin/sales-report");
  }
};