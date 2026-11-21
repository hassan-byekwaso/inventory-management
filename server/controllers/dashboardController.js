import { Product, Sale, StockMovement } from "../models/index.js";
import { asyncHandler } from "../utils/errors.js";

export const getDashboard = asyncHandler(async (_req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const trendStart = new Date(todayStart);
  trendStart.setDate(trendStart.getDate() - 6);
  const [products, todaySalesDocs, monthlySalesDocs, recentSales, recentMovements, trendSales] = await Promise.all([
    Product.find({ isActive: true }),
    Sale.find({ createdAt: { $gte: todayStart } }).select("totalAmount"),
    Sale.find({ createdAt: { $gte: monthStart } }).select("totalAmount"),
    Sale.find().sort({ createdAt: -1 }).limit(5).select("invoiceNumber customerName totalAmount createdAt paymentStatus"),
    StockMovement.find().populate("product", "name sku").populate("performedBy", "name").sort({ createdAt: -1 }).limit(8),
    Sale.find({ createdAt: { $gte: trendStart } }).select("createdAt totalAmount")
  ]);
  const lowStock = products.filter((p) => p.quantity <= p.reorderLevel).sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name)).slice(0, 8).map((p) => ({ id: p.id, name: p.name, sku: p.sku, currentStock: p.quantity, reorderLevel: p.reorderLevel }));
  const inventoryValue = products.reduce((sum, p) => sum + p.purchasePrice * p.quantity, 0);
  const trendByDay = new Map();
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(trendStart);
    day.setDate(day.getDate() + offset);
    trendByDay.set(day.toISOString().slice(0, 10), 0);
  }
  for (const sale of trendSales) {
    const day = sale.createdAt.toISOString().slice(0, 10);
    trendByDay.set(day, (trendByDay.get(day) || 0) + Number(sale.totalAmount));
  }
  const totalCategories = new Set(products.map((p) => p.category)).size;
  const todaysSales = todaySalesDocs.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const monthlyRevenue = monthlySalesDocs.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const recentMovementData = recentMovements.map((movement) => ({
    id: movement.id,
    delta: movement.delta,
    type: movement.type,
    createdAt: movement.createdAt,
    product: { name: movement.product?.name || "Unknown product", sku: movement.product?.sku },
    user: { name: movement.performedBy?.name || "Unknown user" }
  }));
  res.json({
    data: {
      metrics: {
        totalProducts: products.length,
        totalCategories,
        lowStockItems: products.filter((p) => p.quantity > 0 && p.quantity <= p.reorderLevel).length,
        outOfStockItems: products.filter((p) => p.quantity === 0).length,
        todaysSales,
        todaysOrders: todaySalesDocs.length,
        monthlyRevenue,
        inventoryValue
      },
      lowStock,
      recentSales,
      recentMovements: recentMovementData,
      salesTrend: [...trendByDay].map(([day, revenue]) => ({
        date: new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" }),
        revenue
      }))
    }
  });
});
