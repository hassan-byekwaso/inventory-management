import { AppError } from "../utils/errors.js";

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export function validateRefreshOrigin(req, _res, next) {
  const origin = req.get("origin");
  if (origin && !allowedOrigins.includes(origin)) {
    return next(new AppError(403, "Origin is not allowed to use this session endpoint."));
  }
  return next();
}
