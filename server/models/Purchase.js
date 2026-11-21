import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: String,
  quantity: { type: Number, required: true, min: 1 },
  unitCost: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  idempotencyKey: { type: String, unique: true, sparse: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
  items: [purchaseItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["PLACED", "IN_TRANSIT", "DELIVERED", "CANCELLED"], default: "PLACED" },
  stockApplied: { type: Boolean, default: false },
  deliveryDueAt: Date,
  notes: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
purchaseSchema.set("toJSON", { virtuals: true, transform(_doc, ret) { delete ret._id; delete ret.__v; } });
export default mongoose.models.Purchase || mongoose.model("Purchase", purchaseSchema);
