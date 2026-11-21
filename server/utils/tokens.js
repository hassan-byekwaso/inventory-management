import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const accessSecret = process.env.JWT_ACCESS_SECRET;

export function createAccessToken(user) {
  if (!accessSecret || accessSecret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must contain at least 32 characters.");
  }
  return jwt.sign({ sub: user.id }, accessSecret, {
    expiresIn: process.env.JWT_ACCESS_TTL || "15m"
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, accessSecret);
}

export function createRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiry() {
  const days = Number(process.env.REFRESH_TOKEN_DAYS || 14);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function refreshCookieOptions() {
  const secure = process.env.COOKIE_SECURE === "true";
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/api/auth",
    maxAge: Number(process.env.REFRESH_TOKEN_DAYS || 14) * 24 * 60 * 60 * 1000
  };
}

export function refreshCookieClearOptions() {
  const { maxAge, ...options } = refreshCookieOptions();
  return options;
}
