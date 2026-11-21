import { Product, Sale, Purchase } from "../models/index.js";
import { asyncHandler, AppError } from "../utils/errors.js";
import { toCsvBuffer, toPdfBuffer } from "../utils/exports.js";

function dateFilter(query) {
  const createdAt = {};
  if (query.from) createdAt.gte = new Date(query.from);
  if (query.to) {
    const end = new Date(query.to);
    end.setHours(23, 59, 59, 999);
    createdAt.lte = end;
  }
  return Object.keys(createdAt).length ? { createdAt } : {};
}

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

async function reportData(type, query) {
  const dates = dateFilter(query);
  if (type === "inventory" || type === "low-stock") {
    const products = await Product.find({ isActive: true }).sort({ name: 1 });
    const rows = products
      .filter((product) => type !== "low-stock" || product.quantity <= product.reorderLevel)
      .map((product) => ({
        sku: product.sku,
        product: product.name,
        category: product.category,
        brand: product.brand,
        currentStock: product.quantity,
        reorderLevel: product.reorderLevel,
        unitCost: money(product.purchasePrice),
        inventoryValue: money(Number(product.purchasePrice) * product.quantity),
        warehouse: product.warehouseLocation,
        status: product.quantity === 0 ? "Out of stock" : product.quantity <= product.reorderLevel ? "Low stock" : "In stock"
      }));
    return { title: type === "low-stock" ? "Low Stock Report" : "Inventory Valuation", rows };
  }
  if (type === "sales" || type === "profit") {
    const sales = await Sale.find(dates).sort({ createdAt: -1 });
    const rows = sales.flatMap((sale) => sale.items.map((item) => ({
      date: sale.createdAt.toISOString(),
      invoice: sale.invoiceNumber,
      customer: sale.customerName,
      product: item.productName,
      quantity: item.quantity,
      unitPrice: money(item.unitPrice),
      ...(type === "profit" ? {
        unitCost: money(item.unitCost),
        profit: money((Number(item.unitPrice) - Number(item.unitCost)) * item.quantity)
      } : { lineTotal: money(item.lineTotal) }),
      paymentStatus: sale.paymentStatus
    })));
    return { title: type === "profit" ? "Profit Report" : "Sales Report", rows };
  }
  if (type === "purchases") {
    const purchases = await Purchase.find({ ...dates, status: { $ne: "CANCELLED" } }).populate("supplier", "companyName").sort({ createdAt: -1 });
    return {
      title: "Purchases Report",
      rows: purchases.flatMap((purchase) => purchase.items.map((item) => ({
        date: purchase.createdAt.toISOString(),
        invoice: purchase.invoiceNumber,
        supplier: purchase.supplier.companyName,
        product: item.productName,
        quantity: item.quantity,
        unitCost: money(item.unitCost),
        lineTotal: money(item.lineTotal),
        status: purchase.status
      })))
    };
  }
  if (type === "best-sellers") {
    const grouped = await Sale.aggregate([
      { $match: dates },
      { $unwind: "$items" },
      { $group: { _id: { productId: "$items.productId", productName: "$items.productName" }, quantity: { $sum: "$items.quantity" }, lineTotal: { $sum: "$items.lineTotal" } } },
      { $sort: { quantity: -1 } },
      { $limit: 100 }
    ]);
    return {
      title: "Best Selling Products",
      rows: grouped.map((item) => ({
        product: item._id.productName,
        unitsSold: item.quantity || 0,
        revenue: money(item.lineTotal)
      }))
    };
  }
  throw new AppError(404, "Unknown report type.");
}

export const getReport = asyncHandler(async (req, res) => {
  const { title, rows } = await reportData(req.params.type, req.query);
  if (req.query.format) {
    const format = req.query.format.toLowerCase();
    const safeTitle = title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (format === "csv") {
      const buffer = toCsvBuffer(title, rows);
      res.set({
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.csv"`
      });
      return res.send(buffer);
    }
    if (format === "pdf") {
      const buffer = await toPdfBuffer(title, rows);
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`
      });
      return res.send(buffer);
    }
    throw new AppError(400, "Report format must be pdf or csv.");
  }
  res.json({ title, data: rows, count: rows.length });
});
