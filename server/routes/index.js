import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import * as auth from "../controllers/authController.js";
import * as users from "../controllers/userController.js";
import * as resources from "../controllers/resourceController.js";
import * as orders from "../controllers/orderController.js";
import * as dashboard from "../controllers/dashboardController.js";
import * as reports from "../controllers/reportController.js";
import * as notifications from "../controllers/notificationController.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { validateRefreshOrigin } from "../middleware/refreshOrigin.js";
import {
  adjustmentSchema,
  loginSchema,
  paginationSchema,
  productSchema,
  productUpdateSchema,
  purchaseSchema,
  registerSchema,
  saleSchema,
  supplierSchema,
  supplierUpdateSchema,
  userCreateSchema,
  userUpdateSchema
} from "../middleware/schemas.js";
import { asyncHandler, AppError } from "../utils/errors.js";

export const apiRouter = Router();

const signInLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Try again later." }
});
const idParams = validate(z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid resource id.") }), "params");
const purchaseListQuery = validate(paginationSchema.extend({
  status: z.enum(["PLACED", "IN_TRANSIT", "DELIVERED", "CANCELLED"]).optional()
}).refine((value) => !value.from || !value.to || value.from <= value.to, "Start date must be before end date."), "query");
const saleListQuery = validate(paginationSchema.extend({
  status: z.enum(["PAID", "PENDING", "PARTIAL"]).optional()
}).refine((value) => !value.from || !value.to || value.from <= value.to, "Start date must be before end date."), "query");
const codeParams = validate(z.object({ code: z.string().trim().min(1).max(100) }), "params");
const reportParams = validate(z.object({ type: z.enum(["sales", "purchases", "inventory", "profit", "low-stock", "best-sellers"]) }), "params");
const reportQuery = validate(z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  format: z.enum(["pdf", "csv"]).optional()
}).refine((value) => !value.from || !value.to || value.from <= value.to, "Start date must be before end date."), "query");
const purchaseStatusSchema = z.object({ status: z.enum(["PLACED", "IN_TRANSIT", "DELIVERED", "CANCELLED"]) });

apiRouter.post("/auth/register", signInLimit, validate(registerSchema), auth.register);
apiRouter.post("/auth/login", signInLimit, validate(loginSchema), auth.login);
apiRouter.post("/auth/refresh", signInLimit, validateRefreshOrigin, auth.refresh);
apiRouter.post("/auth/logout", validateRefreshOrigin, auth.logout);
apiRouter.get("/auth/me", authenticate, auth.me);

apiRouter.get("/products", authenticate, validate(paginationSchema, "query"), resources.listProducts);
apiRouter.get("/products/barcode/:code", authenticate, codeParams, resources.getProductByBarcode);
apiRouter.get("/products/:id", authenticate, idParams, resources.getProduct);
apiRouter.post("/products", authenticate, allowRoles("ADMIN", "INVENTORY_MANAGER"), validate(productSchema), resources.createProduct);
apiRouter.patch("/products/:id", authenticate, allowRoles("ADMIN", "INVENTORY_MANAGER"), idParams, validate(productUpdateSchema), resources.updateProduct);
apiRouter.delete("/products/:id", authenticate, allowRoles("ADMIN", "INVENTORY_MANAGER"), idParams, resources.archiveProduct);
apiRouter.post("/products/:id/adjustments", authenticate, allowRoles("ADMIN", "INVENTORY_MANAGER"), idParams, validate(adjustmentSchema), resources.adjustStock);
apiRouter.get("/products/:id/history", authenticate, idParams, resources.listStockHistory);

apiRouter.get("/suppliers", authenticate, validate(paginationSchema, "query"), resources.listSuppliers);
apiRouter.post("/suppliers", authenticate, allowRoles("ADMIN", "INVENTORY_MANAGER"), validate(supplierSchema), resources.createSupplier);
apiRouter.patch("/suppliers/:id", authenticate, allowRoles("ADMIN", "INVENTORY_MANAGER"), idParams, validate(supplierUpdateSchema), resources.updateSupplier);
apiRouter.delete("/suppliers/:id", authenticate, allowRoles("ADMIN", "INVENTORY_MANAGER"), idParams, resources.archiveSupplier);

apiRouter.get("/purchases", authenticate, allowRoles("ADMIN", "INVENTORY_MANAGER"), purchaseListQuery, orders.listPurchases);
apiRouter.post("/purchases", authenticate, allowRoles("ADMIN", "INVENTORY_MANAGER"), validate(purchaseSchema), orders.createPurchase);
apiRouter.get("/purchases/:id/invoice.pdf", authenticate, allowRoles("ADMIN", "INVENTORY_MANAGER"), idParams, orders.purchaseInvoice);
apiRouter.get("/purchases/:id", authenticate, allowRoles("ADMIN", "INVENTORY_MANAGER"), idParams, orders.getPurchase);
apiRouter.patch("/purchases/:id/status", authenticate, allowRoles("ADMIN", "INVENTORY_MANAGER"), idParams, validate(purchaseStatusSchema), orders.updatePurchaseStatus);

apiRouter.get("/sales", authenticate, saleListQuery, orders.listSales);
apiRouter.post("/sales", authenticate, validate(saleSchema), orders.createSale);
apiRouter.get("/sales/:id/invoice.pdf", authenticate, idParams, orders.saleInvoice);
apiRouter.get("/sales/:id", authenticate, idParams, orders.getSale);

apiRouter.get("/dashboard", authenticate, dashboard.getDashboard);
apiRouter.get("/notifications", authenticate, notifications.listNotifications);
apiRouter.get("/reports/:type", authenticate, reportParams, reportQuery, asyncHandler(async (req, res, next) => {
  if (req.user.role === "STAFF" && !["inventory", "low-stock"].includes(req.params.type)) {
    return next(new AppError(403, "This report is available to managers and administrators."));
  }
  return reports.getReport(req, res, next);
}));

apiRouter.get("/users", authenticate, allowRoles("ADMIN"), validate(paginationSchema, "query"), users.listUsers);
apiRouter.post("/users", authenticate, allowRoles("ADMIN"), validate(userCreateSchema), users.createUser);
apiRouter.patch("/users/:id", authenticate, allowRoles("ADMIN"), idParams, validate(userUpdateSchema), users.updateUser);
