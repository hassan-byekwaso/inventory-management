import { AppError } from "./errors.js";

const MAX_STOCK = 2147483647;

export function nextStockBalance(currentStock, delta) {
  const balance = currentStock + delta;
  if (!Number.isInteger(balance)) {
    throw new AppError(400, "Stock change must produce a whole-number balance.");
  }
  if (balance < 0) {
    throw new AppError(409, "Stock change would make inventory negative.");
  }
  if (balance > MAX_STOCK) throw new AppError(409, "Stock change exceeds the supported inventory limit.");
  return balance;
}

export function assertStockAvailable(product, requestedQuantity) {
  if (product.currentStock < requestedQuantity) {
    throw new AppError(409, `Insufficient stock for ${product.name}. Available: ${product.currentStock}.`);
  }
}
