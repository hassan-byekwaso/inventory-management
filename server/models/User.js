import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null }
}, { _id: true, timestamps: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["ADMIN", "INVENTORY_MANAGER", "STAFF"], default: "STAFF" },
  isActive: { type: Boolean, default: true },
  refreshTokens: [refreshTokenSchema]
}, { timestamps: true });

userSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.refreshTokens;
  }
});
export default mongoose.models.User || mongoose.model("User", userSchema);
