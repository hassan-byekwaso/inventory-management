import { Product, Purchase, Notification } from "../models/index.js";
import { asyncHandler } from "../utils/errors.js";

export const listNotifications = asyncHandler(async (_req, res) => {
  const now = new Date();
  const [products, purchases, stored] = await Promise.all([
    Product.find({ isActive: true }).where("quantity").lte(2147483647),
    Purchase.find({ status: { $in: ["PLACED", "IN_TRANSIT"] } }).populate("supplier", "companyName").sort({ createdAt: -1 }).limit(50),
    Notification.find({ isRead: false }).populate("relatedProduct", "name sku warehouseLocation").sort({ createdAt: -1 }).limit(100)
  ]);
  const notifications = [];
  for (const notification of stored) {
    const type = notification.type === "low_stock" ? "LOW_STOCK" : notification.type === "out_of_stock" ? "OUT_OF_STOCK" : notification.type === "delivery_delayed" ? "DELIVERY_DELAYED" : "PURCHASE_ARRIVING";
    notifications.push({
      id: notification.id,
      type,
      severity: type === "OUT_OF_STOCK" ? "critical" : type === "LOW_STOCK" || type === "DELIVERY_DELAYED" ? "warning" : "info",
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
      productId: notification.relatedProduct?.id,
      purchaseId: notification.relatedOrder?.id
    });
  }
  for (const product of products) {
    if (product.quantity > product.reorderLevel) continue;
    if (product.quantity === 0) {
      notifications.push({
        id: `out-${product.id}`,
        type: "OUT_OF_STOCK",
        severity: "critical",
        title: "Out of stock",
        message: `${product.name} (${product.sku}) has no stock.`,
        createdAt: new Date().toISOString(),
        productId: product.id,
        warehouseLocation: product.warehouseLocation
      });
    } else {
      notifications.push({
        id: `low-${product.id}`,
        type: "LOW_STOCK",
        severity: "warning",
        title: "Low stock",
        message: `${product.name} has ${product.quantity} units; reorder at ${product.reorderLevel}.`,
        createdAt: new Date().toISOString(),
        productId: product.id,
        warehouseLocation: product.warehouseLocation
      });
    }
  }
  for (const purchase of purchases) {
    const delayed = purchase.deliveryDueAt && purchase.deliveryDueAt < now;
    notifications.push({
      id: `purchase-${purchase.id}`,
      type: delayed ? "DELIVERY_DELAYED" : "PURCHASE_ARRIVING",
      severity: delayed ? "warning" : "info",
      title: delayed ? "Delivery delayed" : "Purchase order arriving",
      message: `${purchase.invoiceNumber} from ${purchase.supplier?.companyName || "Supplier"}${delayed ? " is past its expected delivery date." : " is awaiting delivery."}`,
      createdAt: purchase.createdAt,
      purchaseId: purchase.id
    });
  }
  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({
    data: notifications,
    unreadCount: notifications.length,
    summary: {
      lowStock: notifications.filter((item) => item.type === "LOW_STOCK").length,
      outOfStock: notifications.filter((item) => item.type === "OUT_OF_STOCK").length,
      arrivals: notifications.filter((item) => item.type === "PURCHASE_ARRIVING").length,
      delayed: notifications.filter((item) => item.type === "DELIVERY_DELAYED").length
    }
  });
});
