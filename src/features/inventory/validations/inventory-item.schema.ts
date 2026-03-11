import { z } from "zod";

export const inventoryUnits = [
  "piece",
  "pack",
  "bottle",
  "tube",
  "kg",
  "g",
  "l",
  "ml",
  "box",
  "bag",
] as const;

export const createInventoryItemSchema = z.object({
  userId: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(2),
  brand: z.string().optional(),
  unit: z.enum(inventoryUnits),
  currentQuantity: z.coerce.number().min(0),
  minQuantity: z.coerce.number().min(0),
  reorderQuantity: z.coerce.number().min(0).optional(),
  preferredCurrencyCode: z.string().length(3),
  averageUnitCost: z.coerce.number().min(0).optional(),
  estimatedDailyUsage: z.coerce.number().min(0).optional(),
  notes: z.string().max(500).optional(),
  iconKey: z.string().optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.omit({
  userId: true,
});

export type CreateInventoryItemFormValues = z.input<typeof createInventoryItemSchema>;
export type CreateInventoryItemInput = z.output<typeof createInventoryItemSchema>;
export type UpdateInventoryItemFormValues = z.input<typeof updateInventoryItemSchema>;
export type UpdateInventoryItemInput = z.output<typeof updateInventoryItemSchema>;
