import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ["low_stock", "out_of_stock", "purchase_arrived", "delivery_delayed"], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedProduct: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase" },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });
notificationSchema.set("toJSON", { virtuals: true, transform(_doc, ret) { delete ret._id; delete ret.__v; } });
export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
