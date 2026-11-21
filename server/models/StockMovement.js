import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  type: { type: String, enum: ["purchase", "sale", "adjustment"], required: true },
  delta: { type: Number, required: true },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  referenceId: mongoose.Schema.Types.ObjectId,
  referenceNumber: String,
  reference: String,
  unitCost: Number,
  warehouseLocation: String,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
stockMovementSchema.set("toJSON", { virtuals: true, transform(_doc, ret) { delete ret._id; delete ret.__v; } });
stockMovementSchema.index({ product: 1, createdAt: -1 });
export default mongoose.models.StockMovement || mongoose.model("StockMovement", stockMovementSchema);
