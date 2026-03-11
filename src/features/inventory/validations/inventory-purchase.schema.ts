import { z } from "zod";

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

export type CreateInventoryPurchaseInput = z.output<typeof createInventoryPurchaseSchema>;