import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { AppError, asyncHandler } from "../utils/errors.js";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  refreshCookieOptions,
  refreshTokenExpiry
} from "../utils/tokens.js";

const publicUser = (user) => ({ id: user.id || String(user._id), name: user.name, email: user.email, role: user.role });

function setRefreshCookie(res, token) {
  res.cookie("refreshToken", token, refreshCookieOptions());
}

async function issueSession(user, res) {
  const refreshToken = createRefreshToken();
  user.refreshTokens.push({ tokenHash: hashToken(refreshToken), expiresAt: refreshTokenExpiry() });
  await user.save();
  setRefreshCookie(res, refreshToken);
  return { accessToken: createAccessToken(user), user: publicUser(user) };
}

export const register = asyncHandler(async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const user = await User.create({ name: req.body.name, email: req.body.email.toLowerCase(), passwordHash, role: "STAFF" });
  res.status(201).json(await issueSession(user, res));
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (!user?.isActive || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    throw new AppError(401, "Email or password is incorrect.");
  }
  res.json(await issueSession(user, res));
});

export const refresh = asyncHandler(async (req, res) => {
  const rawToken = req.cookies.refreshToken;
  if (!rawToken) throw new AppError(401, "Refresh token is missing.");

  const oldHash = hashToken(rawToken);
  const user = await User.findOne({ "refreshTokens.tokenHash": oldHash });
  const record = user?.refreshTokens.find((token) => token.tokenHash === oldHash);
  if (!record || record.revokedAt || record.expiresAt <= new Date() || !user.isActive) {
    res.clearCookie("refreshToken", refreshCookieOptions());
    throw new AppError(401, "Refresh token is invalid or expired.");
  }

  const replacement = createRefreshToken();
  record.revokedAt = new Date();
  user.refreshTokens.push({ tokenHash: hashToken(replacement), expiresAt: refreshTokenExpiry() });
  await user.save();
  const rotated = true;
  if (!rotated) throw new AppError(401, "Refresh token has already been used.");

  setRefreshCookie(res, replacement);
  res.json({
    accessToken: createAccessToken(user),
    user: publicUser(user)
  });
});

export const logout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies.refreshToken;
  if (rawToken) {
    const user = await User.findOne({ "refreshTokens.tokenHash": hashToken(rawToken) });
    if (user) {
      const record = user.refreshTokens.find((token) => token.tokenHash === hashToken(rawToken));
      if (record) record.revokedAt = new Date();
      await user.save();
    }
  }
  res.clearCookie("refreshToken", refreshCookieOptions());
  res.status(204).end();
});

export const me = (req, res) => res.json({ user: req.user });
