import { z } from "zod";

const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid resource id.");
const money = z.coerce.number().finite().min(0).max(9999999999.99);
const email = z.email().max(254);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: z.string().min(10).max(128)
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128)
});

export const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  sku: z.string().trim().min(1).max(64),
  category: z.string().trim().min(1).max(80),
  brand: z.string().trim().min(1).max(80),
  purchasePrice: money,
  sellingPrice: money,
  currentStock: z.coerce.number().int().min(0).max(100000000).default(0),
  reorderLevel: z.coerce.number().int().min(0).max(100000000).default(5),
  barcode: z.string().trim().max(100).nullable().optional(),
  warehouseLocation: z.string().trim().min(1).max(120).default("Main warehouse")
});

export const productUpdateSchema = productSchema.omit({ currentStock: true }).partial().extend({
  currentStock: z.never().optional()
}).refine((value) => Object.keys(value).length > 0, "Provide at least one product field to update.");

export const supplierSchema = z.object({
  companyName: z.string().trim().min(1).max(160),
  contactPerson: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(3).max(40),
  email,
  address: z.string().trim().min(1).max(300),
  deliveryStatus: z.string().trim().min(1).max(80).default("On schedule"),
  deliveryNotes: z.string().trim().max(2000).default("")
});

export const supplierUpdateSchema = supplierSchema.partial();

export const orderItemSchema = z.object({
  productId: id,
  quantity: z.coerce.number().int().min(1).max(1000000),
  unitPrice: money.optional()
});

export const purchaseSchema = z.object({
  supplierId: id,
  status: z.enum(["PLACED", "IN_TRANSIT", "DELIVERED"]).default("DELIVERED"),
  deliveryDueAt: z.coerce.date().nullable().optional(),
  notes: z.string().trim().max(2000).default(""),
  items: z.array(orderItemSchema.omit({ unitPrice: true })).min(1).max(100)
});

export const saleSchema = z.object({
  customerName: z.string().trim().min(1).max(160),
  paymentStatus: z.enum(["PAID", "PENDING", "PARTIAL"]).default("PAID"),
  items: z.array(orderItemSchema).min(1).max(100)
});

export const adjustmentSchema = z.object({
  delta: z.coerce.number().int().refine((value) => value !== 0, "Adjustment must not be zero."),
  reason: z.string().trim().min(3).max(240)
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: z.string().min(10).max(128),
  role: z.enum(["ADMIN", "INVENTORY_MANAGER", "STAFF"])
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  role: z.enum(["ADMIN", "INVENTORY_MANAGER", "STAFF"]).optional(),
  isActive: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(160).optional(),
  sortBy: z.string().trim().max(40).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  category: z.string().trim().max(80).optional(),
  brand: z.string().trim().max(80).optional(),
  lowStock: z.enum(["true", "false"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.string().trim().max(40).optional()
});
