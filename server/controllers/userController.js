import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { AppError, asyncHandler } from "../utils/errors.js";

export const listUsers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const where = req.query.search ? { $or: [{ name: new RegExp(req.query.search, "i") }, { email: new RegExp(req.query.search, "i") }] } : {};
  const [users, total] = await Promise.all([
    User.find(where).select("name email role isActive createdAt").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(where)
  ]);
  res.json({ data: users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await User.create({
    name: req.body.name,
    email: req.body.email.toLowerCase(),
    passwordHash: await bcrypt.hash(req.body.password, 12),
    role: req.body.role
  });
  res.status(201).json({ data: user });
});

export const updateUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id && req.body.isActive === false) {
    throw new AppError(400, "You cannot deactivate your own account.");
  }
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!user) throw new AppError(404, "User not found.");
  if (req.body.isActive === false) {
    user.refreshTokens?.forEach((token) => { if (!token.revokedAt) token.revokedAt = new Date(); });
    await user.save();
  }
  res.json({ data: user });
});
