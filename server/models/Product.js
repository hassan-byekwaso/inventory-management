import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, trim: true },
  category: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  purchasePrice: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, default: 0, min: 0 },
  incomingStock: { type: Number, required: true, default: 0, min: 0 },
  outgoingStock: { type: Number, required: true, default: 0, min: 0 },
  reorderLevel: { type: Number, required: true, default: 5, min: 0 },
  barcode: { type: String, trim: true, sparse: true, unique: true },
  warehouseLocation: { type: String, required: true, default: "Main warehouse", trim: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.virtual("currentStock").get(function () { return this.quantity; }).set(function (value) { this.quantity = value; });
productSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    delete ret._id;
    delete ret.__v;
  }
});
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
export default mongoose.models.Product || mongoose.model("Product", productSchema);
