import { z } from "zod";
import { inventoryUnits } from "@/features/inventory/inventory-options";

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value == null) return undefined;
  return value;
}, z.coerce.number().min(0).optional());

const optionalText = z.preprocess((value) => {
  if (value === "" || value == null) return undefined;
  return value;
}, z.string().trim().optional());

const optionalUnit = z.preprocess((value) => {
  if (value === "" || value == null) return undefined;
  return value;
}, z.enum(inventoryUnits).optional());

export const createInventoryPurchaseSchema = z.object({
  userId: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0).optional(),
  totalPrice: z.coerce.number().min(0).optional(),
  currencyCode: z.string().length(3),
  purchaseDate: z.string().min(1),
  storeName: z.string().optional(),
  note: z.string().optional(),
});

export const restockInventoryItemSchema = createInventoryPurchaseSchema.extend({
  brand: optionalText,
  packageQuantity: optionalNumber,
  packageUnit: optionalUnit,
  unitSizeValue: optionalNumber,
  unitSizeUnit: optionalUnit,
  householdUserCount: z.coerce.number().int().min(1).max(20).optional(),
  expiryDate: z.string().date().optional(),
}).superRefine((value, context) => {
  if (value.packageQuantity && !value.packageUnit) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["packageUnit"],
      message: "Choose the pack unit.",
    });
  }

  if (value.unitSizeValue && !value.unitSizeUnit) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["unitSizeUnit"],
      message: "Choose the unit size unit.",
    });
  }

  if (value.expiryDate && value.purchaseDate && value.expiryDate < value.purchaseDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expiryDate"],
      message: "Expiry date cannot be before purchase date.",
    });
  }
});

export type CreateInventoryPurchaseInput = z.output<typeof createInventoryPurchaseSchema>;
export type RestockInventoryItemInput = z.output<typeof restockInventoryItemSchema>;
