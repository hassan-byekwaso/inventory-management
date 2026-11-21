import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "./utils/db.js";
import { User, Supplier, Product, Purchase, Sale, StockMovement, Notification } from "./models/index.js";

await connectDatabase();
try {
  if (process.env.NODE_ENV === "production" && !process.env.SEED_ADMIN_PASSWORD) throw new Error("Set SEED_ADMIN_PASSWORD before seeding a production database.");
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@inventory.local").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Inventory123!";

  await Promise.all([Purchase.deleteMany({}), Sale.deleteMany({}), StockMovement.deleteMany({}), Notification.deleteMany({}), Supplier.deleteMany({}), Product.deleteMany({})]);

  const users = [
    { name: "System Admin", email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 12), role: "ADMIN" },
    { name: "Inventory Manager", email: "manager@inventory.local", passwordHash: await bcrypt.hash("Manager123!", 12), role: "INVENTORY_MANAGER" },
    { name: "Sales Staff", email: "staff@inventory.local", passwordHash: await bcrypt.hash("Staff123!", 12), role: "STAFF" }
  ];
  for (const user of users) await User.findOneAndUpdate({ email: user.email }, user, { upsert: true, new: true, setDefaultsOnInsert: true });
  const admin = await User.findOne({ email: adminEmail });

  const supplier = await Supplier.create({
    companyName: "Northstar Supply Co.", contactPerson: "Jordan Lee", phone: "+1 555 010 2040",
    email: "orders@northstarsupply.example", address: "120 Market Street, Portland, OR",
    deliveryStatus: "On schedule", deliveryNotes: "Standard deliveries arrive in 3–5 business days.", notes: "Standard deliveries arrive in 3–5 business days."
  });

  const productData = [
    ["TECH-MOU-001", "Wireless Mouse", "Electronics", "Logitech", 18.5, 29.99, 34, 10, "890100000001", "Aisle A · Shelf 2"],
    ["TECH-KBD-002", "Mechanical Keyboard", "Electronics", "Keychron", 54, 89, 18, 8, "890100000002", "Aisle A · Shelf 3"],
    ["HOME-LMP-003", "Desk Lamp", "Home & Office", "Luma", 22, 39.5, 6, 8, "890100000003", "Aisle C · Shelf 1"],
    ["TECH-HUB-004", "USB-C Hub", "Electronics", "Anker", 31, 49, 0, 5, "890100000004", "Aisle A · Shelf 5"],
    ["OFF-NBK-005", "Hardcover Notebook", "Stationery", "Moleskine", 8, 15, 62, 15, "890100000005", "Aisle D · Shelf 4"],
    ["HOME-BTL-006", "Insulated Water Bottle", "Lifestyle", "Hydro Flask", 19, 34, 21, 10, "890100000006", "Aisle C · Shelf 3"],
    ["TECH-CAM-007", "Webcam 1080p", "Electronics", "Logitech", 38, 64.99, 13, 6, "890100000007", "Aisle A · Shelf 6"],
    ["OFF-PEN-008", "Gel Pen Set", "Stationery", "Pilot", 4.5, 9.99, 48, 12, "890100000008", "Aisle D · Shelf 2"]
  ];
  const products = await Product.insertMany(productData.map(([sku, name, category, brand, purchasePrice, sellingPrice, quantity, reorderLevel, barcode, warehouseLocation]) => ({
    sku, name, category, brand, purchasePrice, sellingPrice, quantity, reorderLevel, barcode, warehouseLocation
  })));
  await StockMovement.insertMany(products.map((product) => ({
    product: product._id, type: "adjustment", delta: product.quantity, balanceBefore: 0,
    balanceAfter: product.quantity, reference: "Seeded opening balance", referenceNumber: "Seed opening balance",
    unitCost: product.purchasePrice, warehouseLocation: product.warehouseLocation, performedBy: admin._id
  })).filter((movement) => movement.delta > 0));

  const mouse = products.find((p) => p.sku === "TECH-MOU-001");
  const notebook = products.find((p) => p.sku === "OFF-NBK-005");
  const saleItems = [
    { productId: mouse._id, productName: mouse.name, quantity: 2, unitPrice: mouse.sellingPrice, unitCost: mouse.purchasePrice, lineTotal: mouse.sellingPrice * 2 },
    { productId: notebook._id, productName: notebook.name, quantity: 3, unitPrice: notebook.sellingPrice, unitCost: notebook.purchasePrice, lineTotal: notebook.sellingPrice * 3 }
  ];
  const sale = await Sale.create({
    invoiceNumber: "INV-DEMO-0001", customerName: "Maya Chen", createdBy: admin._id, paymentStatus: "PAID",
    totalAmount: saleItems.reduce((sum, item) => sum + item.lineTotal, 0), items: saleItems,
    createdAt: new Date(Date.now() - 3600000)
  });
  for (const item of saleItems) {
    const product = await Product.findOneAndUpdate({ _id: item.productId, quantity: { $gte: item.quantity } }, { $inc: { quantity: -item.quantity, outgoingStock: item.quantity } }, { new: true });
    await StockMovement.create({ product: item.productId, type: "sale", delta: -item.quantity, balanceBefore: product.quantity + item.quantity, balanceAfter: product.quantity, referenceId: sale._id, referenceNumber: sale.invoiceNumber, unitCost: item.unitCost, warehouseLocation: product.warehouseLocation, performedBy: admin._id });
  }

  await Purchase.create({
    invoiceNumber: "PO-DEMO-0001", supplier: supplier._id, createdBy: admin._id, status: "IN_TRANSIT",
    deliveryDueAt: new Date(Date.now() + 2 * 86400000), notes: "Sample inbound order", totalAmount: 185,
    items: [{ productId: mouse._id, productName: mouse.name, quantity: 10, unitCost: mouse.purchasePrice, lineTotal: 185 }]
  });

  const low = products.filter((p) => p.quantity <= p.reorderLevel);
  await Notification.insertMany(low.map((product) => ({
    type: product.quantity === 0 ? "out_of_stock" : "low_stock",
    title: product.quantity === 0 ? "Out of stock" : "Low stock",
    message: `${product.name} has ${product.quantity} units.`,
    relatedProduct: product._id
  })));
  console.log(`Seeded demo inventory. Admin: ${adminEmail}`);
} finally {
  await disconnectDatabase();
}
