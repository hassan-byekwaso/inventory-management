import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: String,
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  idempotencyKey: { type: String, unique: true, sparse: true },
  customerName: { type: String, required: true, trim: true },
  items: [saleItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  paymentStatus: { type: String, enum: ["PAID", "PENDING", "PARTIAL"], default: "PAID" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
saleSchema.set("toJSON", { virtuals: true, transform(_doc, ret) { delete ret._id; delete ret.__v; } });
export default mongoose.models.Sale || mongoose.model("Sale", saleSchema);
