import test from "node:test";
import assert from "node:assert/strict";
import { adjustmentSchema, productSchema, saleSchema } from "../middleware/schemas.js";
import { assertStockAvailable, nextStockBalance } from "../utils/stock.js";
import { toCsvBuffer, toPdfBuffer } from "../utils/exports.js";
import { invoicePdf } from "../utils/invoice.js";

test("stock balance rejects negative inventory and accepts valid deltas", () => {
  assert.equal(nextStockBalance(4, -3), 1);
  assert.throws(() => nextStockBalance(2, -3), { status: 409 });
  assert.throws(() => nextStockBalance(2, 0.5), { status: 400 });
  assert.throws(() => nextStockBalance(2147483647, 1), { status: 409 });
});

test("sale stock check rejects overselling", () => {
  assert.doesNotThrow(() => assertStockAvailable({ name: "Widget", currentStock: 5 }, 5));
  assert.throws(() => assertStockAvailable({ name: "Widget", currentStock: 4 }, 5), {
    status: 409,
    message: "Insufficient stock for Widget. Available: 4."
  });
});

test("request schemas validate and coerce inventory inputs", () => {
  const product = productSchema.parse({
    name: "Widget", sku: "W-1", category: "Tools", brand: "Acme",
    purchasePrice: "12.5", sellingPrice: 18, currentStock: "7"
  });
  assert.equal(product.purchasePrice, 12.5);
  assert.equal(product.currentStock, 7);
  assert.equal(adjustmentSchema.safeParse({ delta: "0", reason: "Count correction" }).success, false);
  assert.equal(saleSchema.safeParse({
    customerName: "Customer", items: [{ productId: "not-a-uuid", quantity: 1 }]
  }).success, false);
});

test("report exporters return valid PDF and Excel-compatible CSV buffers", async () => {
  const csv = toCsvBuffer("Inventory", [{ sku: "W-1", currentStock: 4 }]);
  const safeCsv = toCsvBuffer("Inventory", [{ product: "=1+1" }]);
  const pdf = await toPdfBuffer("Inventory Report", [{ sku: "W-1", currentStock: 4 }]);
  const invoice = await invoicePdf({
    title: "Sales Invoice",
    invoiceNumber: "INV-1",
    date: new Date(),
    partyLabel: "Customer",
    partyName: "Example Customer",
    items: [{ productName: "Widget", quantity: 1, unitPrice: 12, unitCost: 8, lineTotal: 12 }],
    totalAmount: 12,
    priceField: "unitPrice"
  });
  assert.equal(csv.subarray(0, 3).toString(), "\uFEFF");
  assert.match(csv.toString("utf8"), /"Sku","Current Stock"/);
  assert.match(safeCsv.toString("utf8"), /"'=1\+1"/);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.equal(invoice.subarray(0, 5).toString(), "%PDF-");
});
