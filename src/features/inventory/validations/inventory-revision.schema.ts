import { z } from "zod";

export const updateInventoryRevisionSchema = z.object({
  changeSummary: z.string().trim().min(1).max(200),
});

export type UpdateInventoryRevisionInput = z.output<typeof updateInventoryRevisionSchema>;
