import crypto from "node:crypto";
import { Product, Supplier, Purchase, Sale, StockMovement, Notification } from "../models/index.js";
import { AppError, asyncHandler } from "../utils/errors.js";
import { invoicePdf } from "../utils/invoice.js";
import { withMongoTransaction } from "../utils/db.js";

function invoice(prefix) {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `${prefix}-${date}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}
function plain(doc) { return doc?.toObject ? doc.toObject({ virtuals: true }) : doc; }
function currency(value) {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(rounded) || rounded > 9999999999.99) throw new AppError(400, "Order total exceeds the supported currency range.");
  return rounded;
}
function grouped(items) {
  return items.reduce((map, item) => {
    const key = String(item.productId);
    map.set(key, (map.get(key) || 0) + item.quantity);
    return map;
  }, new Map());
}
async function populatePurchase(doc) {
  if (!doc) return doc;
  await doc.populate([{ path: "supplier" }, { path: "createdBy", select: "name email" }]);
  const value = plain(doc);
  value.user = value.createdBy ? { name: value.createdBy.name, email: value.createdBy.email } : null;
  value.supplierId = value.supplier?.id || value.supplier?._id;
  value.userId = value.createdBy?.id || value.createdBy?._id;
  return value;
}
async function populateSale(doc) {
  if (!doc) return doc;
  await doc.populate({ path: "createdBy", select: "name email" });
  const value = plain(doc);
  value.user = value.createdBy ? { name: value.createdBy.name, email: value.createdBy.email } : null;
  value.userId = value.createdBy?.id || value.createdBy?._id;
  return value;
}
function saleForUser(sale, user) {
  if (user.role !== "STAFF") return sale;
  return { ...sale, items: sale.items.map(({ unitCost, ...item }) => item) };
}

export const listPurchases = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) where.$or = [{ invoiceNumber: new RegExp(req.query.search, "i") }];
  const [docs, total] = await Promise.all([Purchase.find(where).populate("supplier").populate("createdBy", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Purchase.countDocuments(where)]);
  const data = await Promise.all(docs.map(populatePurchase));
  res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
export const getPurchase = asyncHandler(async (req, res) => {
  const doc = await Purchase.findById(req.params.id);
  if (!doc) throw new AppError(404, "Purchase not found.");
  res.json({ data: await populatePurchase(doc) });
});
export const purchaseInvoice = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id).populate("supplier");
  if (!purchase) throw new AppError(404, "Purchase not found.");
  const buffer = await invoicePdf({ title: "Purchase Invoice", invoiceNumber: purchase.invoiceNumber, date: purchase.createdAt, partyLabel: "Supplier", partyName: purchase.supplier.companyName, items: purchase.items, totalAmount: purchase.totalAmount, notes: purchase.notes });
  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${purchase.invoiceNumber}.pdf"` });
  res.send(buffer);
});

export const createPurchase = asyncHandler(async (req, res) => {
  const requestKey = req.get("idempotency-key")?.trim().slice(0, 200);
  const idempotencyKey = requestKey ? `${req.user.id}:${requestKey}` : null;
  if (idempotencyKey) {
    const existing = await Purchase.findOne({ idempotencyKey });
    if (existing) return res.status(200).json({ data: await populatePurchase(existing), duplicate: true });
  }
  try {
    const data = await withMongoTransaction(async (session) => {
      const supplier = await Supplier.findOne({ _id: req.body.supplierId, isActive: true }).session(session);
      if (!supplier) throw new AppError(404, "Supplier not found.");
      const ids = [...new Set(req.body.items.map((item) => item.productId))];
      const products = await Product.find({ _id: { $in: ids }, isActive: true }).session(session);
      if (products.length !== ids.length) throw new AppError(404, "One or more products were not found.");
      const byId = new Map(products.map((product) => [String(product._id), product]));
      const items = req.body.items.map((item) => {
        const product = byId.get(item.productId);
        const unitCost = Number(product.purchasePrice);
        return { productId: product._id, productName: product.name, quantity: item.quantity, unitCost, lineTotal: currency(unitCost * item.quantity) };
      });
      const totalAmount = currency(items.reduce((sum, item) => sum + item.lineTotal, 0));
      const purchase = await Purchase.create([{ invoiceNumber: invoice("PO"), idempotencyKey, supplier: supplier._id, createdBy: req.user.id, status: req.body.status, stockApplied: req.body.status === "DELIVERED", deliveryDueAt: req.body.deliveryDueAt || null, notes: req.body.notes || "", totalAmount, items }], session ? { session } : undefined).then((rows) => rows[0]);
      if (purchase.stockApplied) {
        for (const [productId, quantity] of grouped(items)) {
          const product = byId.get(productId);
          const before = product.quantity;
          const updated = await Product.findOneAndUpdate({ _id: productId, isActive: true }, { $inc: { quantity, incomingStock: quantity } }, { new: true, session, runValidators: true });
          if (!updated) throw new AppError(404, "Product not found.");
          await StockMovement.create([{ product: product._id, type: "purchase", delta: quantity, balanceBefore: before, balanceAfter: updated.quantity, referenceId: purchase._id, referenceNumber: purchase.invoiceNumber, unitCost: product.purchasePrice, warehouseLocation: product.warehouseLocation, performedBy: req.user.id }], session ? { session } : undefined);
          await Notification.create([{ type: "purchase_arrived", title: "Purchase order arrived", message: `${purchase.invoiceNumber} delivered ${quantity} units of ${product.name}.`, relatedProduct: product._id, relatedOrder: purchase._id }], session ? { session } : undefined);
          await Notification.create([{ type: updated.quantity === 0 ? "out_of_stock" : updated.quantity <= updated.reorderLevel ? "low_stock" : "low_stock", title: "Stock updated", message: `${updated.name} now has ${updated.quantity} units.`, relatedProduct: updated._id }], session ? { session } : undefined).catch(() => {});
        }
      }
      return populatePurchase(purchase);
    });
    res.status(201).json({ data });
  } catch (error) {
    if (idempotencyKey && error?.code === 11000) {
      const existing = await Purchase.findOne({ idempotencyKey });
      if (existing) return res.status(200).json({ data: await populatePurchase(existing), duplicate: true });
    }
    throw error;
  }
});

export const updatePurchaseStatus = asyncHandler(async (req, res) => {
  const data = await withMongoTransaction(async (session) => {
    const purchase = await Purchase.findById(req.params.id).session(session);
    if (!purchase) throw new AppError(404, "Purchase not found.");
    if (["CANCELLED", "DELIVERED"].includes(purchase.status)) throw new AppError(409, "A cancelled or delivered purchase cannot change status.");
    if (req.body.status === "CANCELLED" && purchase.stockApplied) throw new AppError(409, "A received purchase cannot be cancelled.");
    if (req.body.status === "DELIVERED" && !purchase.stockApplied) {
      for (const [productId, quantity] of grouped(purchase.items)) {
        const product = await Product.findById(productId).session(session);
        if (!product) throw new AppError(404, "One or more products were not found.");
        const updated = await Product.findOneAndUpdate({ _id: productId, isActive: true }, { $inc: { quantity, incomingStock: quantity } }, { new: true, session });
        await StockMovement.create([{ product: product._id, type: "purchase", delta: quantity, balanceBefore: product.quantity, balanceAfter: updated.quantity, referenceId: purchase._id, referenceNumber: purchase.invoiceNumber, unitCost: product.purchasePrice, warehouseLocation: product.warehouseLocation, performedBy: req.user.id }], session ? { session } : undefined);
        await Notification.create([{ type: "purchase_arrived", title: "Purchase order arrived", message: `${purchase.invoiceNumber} delivered ${quantity} units of ${product.name}.`, relatedProduct: product._id, relatedOrder: purchase._id }], session ? { session } : undefined);
      }
      purchase.status = "DELIVERED";
      purchase.stockApplied = true;
    } else purchase.status = req.body.status;
    await purchase.save({ session });
    return populatePurchase(purchase);
  });
  res.json({ data });
});

export const listSales = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const where = {};
  if (req.query.status) where.paymentStatus = req.query.status;
  if (req.query.search) where.$or = [{ invoiceNumber: new RegExp(req.query.search, "i") }, { customerName: new RegExp(req.query.search, "i") }];
  const [docs, total] = await Promise.all([Sale.find(where).populate("createdBy", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Sale.countDocuments(where)]);
  const data = await Promise.all(docs.map(populateSale));
  res.json({ data: data.map((sale) => saleForUser(sale, req.user)), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
export const getSale = asyncHandler(async (req, res) => {
  const doc = await Sale.findById(req.params.id);
  if (!doc) throw new AppError(404, "Sale not found.");
  res.json({ data: saleForUser(await populateSale(doc), req.user) });
});
export const saleInvoice = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) throw new AppError(404, "Sale not found.");
  const buffer = await invoicePdf({ title: "Sales Invoice", invoiceNumber: sale.invoiceNumber, date: sale.createdAt, partyLabel: "Customer", partyName: sale.customerName, items: sale.items, totalAmount: sale.totalAmount, paymentStatus: sale.paymentStatus, priceField: "unitPrice" });
  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${sale.invoiceNumber}.pdf"` });
  res.send(buffer);
});

export const createSale = asyncHandler(async (req, res) => {
  const requestKey = req.get("idempotency-key")?.trim().slice(0, 200);
  const idempotencyKey = requestKey ? `${req.user.id}:${requestKey}` : null;
  if (idempotencyKey) {
    const existing = await Sale.findOne({ idempotencyKey });
    if (existing) return res.status(200).json({ data: saleForUser(await populateSale(existing), req.user), duplicate: true });
  }
  if (req.user.role === "STAFF" && req.body.items.some((item) => item.unitPrice !== undefined)) throw new AppError(403, "Staff sales must use the catalog selling price.");
  try {
    const data = await withMongoTransaction(async (session) => {
      const ids = [...new Set(req.body.items.map((item) => item.productId))];
      const products = await Product.find({ _id: { $in: ids }, isActive: true }).session(session);
      if (products.length !== ids.length) throw new AppError(404, "One or more products were not found.");
      const byId = new Map(products.map((product) => [String(product._id), product]));
      const totals = grouped(req.body.items);
      const items = req.body.items.map((item) => {
        const product = byId.get(item.productId);
        const unitPrice = req.user.role === "STAFF" ? Number(product.sellingPrice) : item.unitPrice ?? Number(product.sellingPrice);
        return { productId: product._id, productName: product.name, quantity: item.quantity, unitPrice, unitCost: product.purchasePrice, lineTotal: currency(unitPrice * item.quantity) };
      });
      const totalAmount = currency(items.reduce((sum, item) => sum + item.lineTotal, 0));
      const sale = await Sale.create([{ invoiceNumber: invoice("INV"), idempotencyKey, customerName: req.body.customerName, createdBy: req.user.id, paymentStatus: req.body.paymentStatus, totalAmount, items }], session ? { session } : undefined).then((rows) => rows[0]);
      for (const [productId, quantity] of totals) {
        const product = byId.get(productId);
        if (product.quantity < quantity) throw new AppError(409, `Insufficient stock for ${product.name}. Available: ${product.quantity}.`);
        const updated = await Product.findOneAndUpdate(
          { _id: productId, isActive: true, quantity: { $gte: quantity } },
          { $inc: { quantity: -quantity, outgoingStock: quantity } },
          { new: true, session, runValidators: true }
        );
        if (!updated) throw new AppError(409, `Insufficient stock for ${product.name}.`);
        await StockMovement.create([{ product: product._id, type: "sale", delta: -quantity, balanceBefore: product.quantity, balanceAfter: updated.quantity, referenceId: sale._id, referenceNumber: sale.invoiceNumber, unitCost: product.purchasePrice, warehouseLocation: product.warehouseLocation, performedBy: req.user.id }], session ? { session } : undefined);
        if (updated.quantity <= updated.reorderLevel) {
          await Notification.create([{ type: updated.quantity === 0 ? "out_of_stock" : "low_stock", title: updated.quantity === 0 ? "Out of stock" : "Low stock", message: updated.quantity === 0 ? `${updated.name} (${updated.sku}) has no stock.` : `${updated.name} has ${updated.quantity} units; reorder at ${updated.reorderLevel}.`, relatedProduct: updated._id }], session ? { session } : undefined);
        }
      }
      return populateSale(sale);
    });
    res.status(201).json({ data: saleForUser(data, req.user) });
  } catch (error) {
    if (idempotencyKey && error?.code === 11000) {
      const existing = await Sale.findOne({ idempotencyKey });
      if (existing) return res.status(200).json({ data: saleForUser(await populateSale(existing), req.user), duplicate: true });
    }
    throw error;
  }
});
