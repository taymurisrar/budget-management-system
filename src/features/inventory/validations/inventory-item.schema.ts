import { z } from "zod";
import { inventoryUnits } from "@/features/inventory/inventory-options";

const optionalTrimmedText = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => value || undefined);

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value == null) {
    return undefined;
  }

  return value;
}, z.coerce.number().min(0).optional());

const optionalUnit = z.preprocess((value) => {
  if (value === "" || value == null) {
    return undefined;
  }

  return value;
}, z.enum(inventoryUnits).optional());

const optionalDate = z.preprocess((value) => {
  if (value === "" || value == null) {
    return undefined;
  }

  return value;
}, z.string().date().optional());

const tagsSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag).trim())
      .filter(Boolean);
  }

  return [];
}, z.array(z.string().min(1).max(24)).max(8));

const inventoryItemFields = {
  categoryId: z.string().min(1),
  name: z.string().min(2),
  brand: optionalTrimmedText,
  subcategory: optionalTrimmedText,
  tags: tagsSchema.default([]),
  unit: z.enum(inventoryUnits),
  currentQuantity: z.coerce.number().min(0),
  inUseQuantity: optionalNumber,
  minQuantity: z.coerce.number().min(0),
  reorderQuantity: optionalNumber,
  packageQuantity: optionalNumber,
  packageUnit: optionalUnit,
  unitSizeValue: optionalNumber,
  unitSizeUnit: optionalUnit,
  householdUserCount: z.coerce.number().int().min(1).max(20),
  restockFrequencyDays: z.coerce.number().int().min(1).max(365).optional(),
  preferredCurrencyCode: z.string().length(3),
  averageUnitCost: optionalNumber,
  lastPurchaseTotalCost: optionalNumber,
  estimatedDailyUsage: optionalNumber,
  lastPurchaseDate: optionalDate,
  lastConsumptionDate: optionalDate,
  nextRestockDate: optionalDate,
  expiryDate: optionalDate,
  notes: z.string().max(500).optional(),
  iconKey: z.string().optional(),
};

function inventoryItemRules(
  value: {
    currentQuantity?: number;
    inUseQuantity?: number;
    minQuantity?: number;
    reorderQuantity?: number;
    packageQuantity?: number;
    packageUnit?: string;
    unitSizeValue?: number;
    unitSizeUnit?: string;
    householdUserCount?: number;
    restockFrequencyDays?: number;
    estimatedDailyUsage?: number;
    lastPurchaseDate?: string;
    lastConsumptionDate?: string;
    nextRestockDate?: string;
    expiryDate?: string;
  },
  context: z.RefinementCtx
) {
  if (value.packageQuantity && !value.packageUnit) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["packageUnit"],
      message: "Choose what the pack contains.",
    });
  }

  if (value.unitSizeValue && !value.unitSizeUnit) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["unitSizeUnit"],
      message: "Choose the size unit.",
    });
  }

  if (value.estimatedDailyUsage != null && value.estimatedDailyUsage <= 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["estimatedDailyUsage"],
      message: "Daily use must be greater than 0.",
    });
  }

  if (value.inUseQuantity != null && value.unitSizeValue != null && value.inUseQuantity > value.unitSizeValue) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["inUseQuantity"],
      message: "Open amount cannot be more than one full unit size.",
    });
  }

  if (value.reorderQuantity != null && value.reorderQuantity <= 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reorderQuantity"],
      message: "Restock quantity must be greater than 0.",
    });
  }

  if (value.householdUserCount != null && value.householdUserCount < 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["householdUserCount"],
      message: "Household users must be at least 1.",
    });
  }

  if (value.restockFrequencyDays != null && value.restockFrequencyDays < 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["restockFrequencyDays"],
      message: "Restock frequency must be at least 1 day.",
    });
  }

  if (value.lastPurchaseDate && value.lastConsumptionDate && value.lastConsumptionDate < value.lastPurchaseDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lastConsumptionDate"],
      message: "Finished date cannot be before purchase date.",
    });
  }

  if (value.lastPurchaseDate && value.expiryDate && value.expiryDate < value.lastPurchaseDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expiryDate"],
      message: "Expiry date cannot be before purchase date.",
    });
  }

  if (value.lastPurchaseDate && value.nextRestockDate && value.nextRestockDate < value.lastPurchaseDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["nextRestockDate"],
      message: "Restock date cannot be before purchase date.",
    });
  }
}

export const createInventoryItemSchema = z
  .object({
    userId: z.string().min(1),
    ...inventoryItemFields,
  })
  .superRefine(inventoryItemRules);

export const updateInventoryItemSchema = z
  .object(inventoryItemFields)
  .superRefine(inventoryItemRules);

export type CreateInventoryItemFormValues = z.input<typeof createInventoryItemSchema>;
export type CreateInventoryItemInput = z.output<typeof createInventoryItemSchema>;
export type UpdateInventoryItemFormValues = z.input<typeof updateInventoryItemSchema>;
export type UpdateInventoryItemInput = z.output<typeof updateInventoryItemSchema>;
