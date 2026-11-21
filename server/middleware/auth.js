import { asyncHandler, AppError } from "../utils/errors.js";
import { User } from "../models/index.js";
import { verifyAccessToken } from "../utils/tokens.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) throw new AppError(401, "Authentication required.");

  let claims;
  try {
    claims = verifyAccessToken(token);
  } catch {
    throw new AppError(401, "Access token is invalid or expired.");
  }

  const user = await User.findById(claims.sub).select("name email role isActive");
  if (!user?.isActive) throw new AppError(401, "This account is unavailable.");
  req.user = user;
  next();
});

export function allowRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, "You do not have permission to perform this action."));
    }
    next();
  };
}
