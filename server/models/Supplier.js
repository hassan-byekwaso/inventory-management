import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema({
  companyName: { type: String, required: true, trim: true },
  contactPerson: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  deliveryStatus: { type: String, required: true, default: "On schedule", trim: true },
  deliveryNotes: { type: String, default: "", trim: true },
  notes: { type: String, default: "", trim: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
supplierSchema.set("toJSON", { virtuals: true, transform(_doc, ret) { delete ret._id; delete ret.__v; } });
export default mongoose.models.Supplier || mongoose.model("Supplier", supplierSchema);
