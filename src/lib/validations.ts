import { z } from "zod";

export const stockReceiptSchema = z.object({
  challanNo: z.string().trim().min(1, "Challan number is required").max(50),
  productName: z.string().trim().min(1, "Product name is required").max(200),
  batchNo: z.string().trim().min(1, "Batch number is required").max(50),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().positive("Unit price must be positive"),
  mfgDate: z.string().min(1, "Manufacturing date is required"),
  expDate: z.string().min(1, "Expiry date is required"),
  storageCondition: z.enum(["ambient", "cool", "cold"]),
  sourceDepot: z.string().trim().min(1, "Source depot is required"),
});

export const stockAdjustmentSchema = z.object({
  product: z.string().trim().min(1, "Product is required").max(200),
  batch: z.string().trim().min(1, "Batch number is required").max(50),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  reason: z.string().trim().min(1, "Reason is required"),
  remarks: z.string().trim().max(500, "Remarks must be less than 500 characters").optional(),
});

export const vehicleSchema = z.object({
  type: z.string().trim().min(1, "Vehicle type is required"),
  registrationNo: z.string().trim().min(1, "Registration number is required").max(20),
  capacity: z.number().positive("Capacity must be positive"),
  depot: z.string().trim().min(1, "Depot is required"),
  vendor: z.string().trim().min(1, "Vendor is required"),
});

export const driverSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  licenseNo: z.string().trim().min(1, "License number is required").max(50),
  licenseExpiry: z.string().min(1, "License expiry is required"),
  contact: z.string().trim().min(10, "Valid contact is required").max(15),
  assignedVehicle: z.string().optional(),
});

export const routePlanSchema = z.object({
  depot: z.string().trim().min(1, "Depot is required"),
  date: z.string().min(1, "Date is required"),
  route: z.string().trim().min(1, "Route is required"),
  vehicle: z.string().trim().min(1, "Vehicle is required"),
  driver: z.string().trim().min(1, "Driver is required"),
});

export type StockReceiptFormData = z.infer<typeof stockReceiptSchema>;
export type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>;
export type VehicleFormData = z.infer<typeof vehicleSchema>;
export type DriverFormData = z.infer<typeof driverSchema>;
export type RoutePlanFormData = z.infer<typeof routePlanSchema>;
