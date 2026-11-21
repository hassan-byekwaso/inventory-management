import { Product, Supplier, StockMovement } from "../models/index.js";
import { AppError, asyncHandler } from "../utils/errors.js";
import { nextStockBalance } from "../utils/stock.js";

function pagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}
function plain(doc) { return doc?.toObject ? doc.toObject({ virtuals: true }) : doc; }
function productForUser(doc, user) {
  const product = plain(doc);
  if (user.role !== "STAFF") return { ...product, stockValue: Number(product.purchasePrice) * product.quantity };
  const { purchasePrice, ...visible } = product;
  return visible;
}
function searchWhere(query, fields) {
  if (!query.search) return {};
  const expression = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return { $or: fields.map((field) => ({ [field]: expression })) };
}

export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const where = { isActive: true, ...searchWhere(req.query, ["name", "sku", "category", "brand", "barcode"]) };
  if (req.query.category) where.category = new RegExp(`^${req.query.category}$`, "i");
  if (req.query.brand) where.brand = new RegExp(`^${req.query.brand}$`, "i");
  if (req.query.lowStock) {
    const products = await Product.find(where);
    const filtered = products.filter((p) => req.query.lowStock === "true" ? p.quantity <= p.reorderLevel : p.quantity > p.reorderLevel);
    const sortBy = ["name", "sku", "category", "brand", "purchasePrice", "sellingPrice", "quantity", "createdAt"].includes(req.query.sortBy) ? req.query.sortBy : "createdAt";
    const direction = req.query.sortOrder === "asc" ? 1 : -1;
    filtered.sort((a, b) => String(plain(a)[sortBy] ?? "").localeCompare(String(plain(b)[sortBy] ?? "")) * direction);
    const data = filtered.slice(skip, skip + limit);
    return res.json({ data: data.map((p) => productForUser(p, req.user)), pagination: { page, limit, total: filtered.length, pages: Math.ceil(filtered.length / limit) } });
  }
  const sortBy = ["name", "sku", "category", "brand", "purchasePrice", "sellingPrice", "quantity", "createdAt"].includes(req.query.sortBy) ? req.query.sortBy : "createdAt";
  const sort = { [sortBy]: req.query.sortOrder === "asc" ? 1 : -1 };
  const [data, total] = await Promise.all([Product.find(where).sort(sort).skip(skip).limit(limit), Product.countDocuments(where)]);
  res.json({ data: data.map((p) => productForUser(p, req.user)), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isActive: true });
  if (!product) throw new AppError(404, "Product not found.");
  res.json({ data: productForUser(product, req.user) });
});
export const getProductByBarcode = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ isActive: true, $or: [{ barcode: req.params.code }, { sku: req.params.code }] });
  if (!product) throw new AppError(404, "No product matches that barcode or SKU.");
  res.json({ data: productForUser(product, req.user) });
});
export const createProduct = asyncHandler(async (req, res) => {
  const { currentStock = 0, barcode, ...data } = req.body;
  const product = await Product.create({ ...data, quantity: currentStock, barcode: barcode || undefined });
  if (currentStock > 0) await StockMovement.create({ product: product._id, type: "adjustment", delta: currentStock, balanceBefore: 0, balanceAfter: currentStock, reference: "Initial stock", referenceNumber: "Initial stock", unitCost: product.purchasePrice, warehouseLocation: product.warehouseLocation, performedBy: req.user.id });
  res.status(201).json({ data: productForUser(product, req.user) });
});
export const updateProduct = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (data.barcode === "") data.barcode = undefined;
  delete data.currentStock;
  delete data.quantity;
  const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!product) throw new AppError(404, "Product not found.");
  res.json({ data: productForUser(product, req.user) });
});
export const archiveProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!product) throw new AppError(404, "Product not found.");
  res.status(204).end();
});
export const adjustStock = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isActive: true });
  if (!product) throw new AppError(404, "Product not found.");
  const balanceBefore = product.quantity;
  const next = nextStockBalance(product.quantity, req.body.delta);
  product.quantity = next;
  await product.save();
  await StockMovement.create({ product: product._id, type: "adjustment", delta: req.body.delta, balanceBefore, balanceAfter: next, reference: req.body.reason, referenceNumber: req.body.reason, unitCost: product.purchasePrice, warehouseLocation: product.warehouseLocation, performedBy: req.user.id });
  res.json({ data: productForUser(product, req.user) });
});
export const listStockHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const where = { product: req.params.id };
  const [data, total] = await Promise.all([StockMovement.find(where).populate("performedBy", "name").sort({ createdAt: -1 }).skip(skip).limit(limit), StockMovement.countDocuments(where)]);
  const mapped = data.map((movement) => {
    const item = plain(movement);
    item.user = item.performedBy?.name ? { name: item.performedBy.name } : null;
    item.productId = String(item.product);
    item.userId = item.performedBy?._id ? String(item.performedBy._id) : undefined;
    if (req.user.role === "STAFF") delete item.unitCost;
    return item;
  });
  res.json({ data: mapped, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
export const listSuppliers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const where = { isActive: true, ...searchWhere(req.query, ["companyName", "contactPerson", "email", "phone"]) };
  const sortBy = ["companyName", "contactPerson", "email", "deliveryStatus", "createdAt"].includes(req.query.sortBy) ? req.query.sortBy : "createdAt";
  const [data, total] = await Promise.all([Supplier.find(where).sort({ [sortBy]: req.query.sortOrder === "asc" ? 1 : -1 }).skip(skip).limit(limit), Supplier.countDocuments(where)]);
  res.json({ data: data.map(plain), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
export const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create({ ...req.body, notes: req.body.deliveryNotes || req.body.notes || "" });
  res.status(201).json({ data: plain(supplier) });
});
export const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!supplier) throw new AppError(404, "Supplier not found.");
  res.json({ data: plain(supplier) });
});
export const archiveSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!supplier) throw new AppError(404, "Supplier not found.");
  res.status(204).end();
});
