import { z } from "zod";
import {
  zakatAssetTypes,
  zakatMetalPurities,
  zakatOwnershipRelations,
} from "@/features/zakat/zakat-constants";
import { isSupportedCurrency } from "@/lib/currencies";

const baseZakatAssetSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).max(120),
  assetType: z.enum(zakatAssetTypes),
  ownershipRelation: z.enum(zakatOwnershipRelations).default("self"),
  ownerName: z.string().max(120).optional().or(z.literal("")),
  countInMyAssets: z.boolean().default(true),
  currencyCode: z.string().min(3).max(3).refine((value) => isSupportedCurrency(value), "Unsupported currency"),
  manualValue: z.coerce.number().min(0).optional(),
  deductibleAmount: z.coerce.number().min(0).optional(),
  metalWeightGrams: z.coerce.number().positive().optional(),
  metalPurity: z.enum(zakatMetalPurities).optional(),
  purchaseDate: z.string().min(1),
  preferredPaymentMonth: z.coerce.number().int().min(1).max(12).optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

function refineZakatAsset(data: z.infer<typeof baseZakatAssetSchema>, ctx: z.RefinementCtx) {
  const isMetal = data.assetType === "gold" || data.assetType === "silver";

  if (isMetal) {
    if (data.metalWeightGrams == null || data.metalWeightGrams <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["metalWeightGrams"],
        message: "Enter the metal weight in grams",
      });
    }

    if (!data.metalPurity) {
      ctx.addIssue({
        code: "custom",
        path: ["metalPurity"],
        message: "Select the purity for the metal asset",
      });
    }
  } else if (data.manualValue == null || data.manualValue <= 0) {
    ctx.addIssue({
      code: "custom",
      path: ["manualValue"],
      message: "Enter the zakatable value in your default currency",
    });
  }

  const purchaseDate = new Date(data.purchaseDate);
  if (Number.isNaN(purchaseDate.getTime())) {
    ctx.addIssue({
      code: "custom",
      path: ["purchaseDate"],
      message: "Enter a valid purchase date",
    });
  }
}

export const createZakatAssetSchema = baseZakatAssetSchema.superRefine(refineZakatAsset);

export const updateZakatAssetSchema = baseZakatAssetSchema.extend({
  id: z.string().min(1),
}).superRefine(refineZakatAsset);

export const createZakatPaymentSchema = z.object({
  userId: z.string().min(1),
  amount: z.coerce.number().positive(),
  currencyCode: z.string().min(3).max(3).refine((value) => isSupportedCurrency(value), "Unsupported currency"),
  paymentDate: z.string().min(1, "Enter a payment date"),
  note: z.string().max(1000).optional().or(z.literal("")),
});

export const updateZakatPaymentSchema = createZakatPaymentSchema.extend({
  id: z.string().min(1),
});

export type CreateZakatAssetInput = z.infer<typeof createZakatAssetSchema>;
export type UpdateZakatAssetInput = z.infer<typeof updateZakatAssetSchema>;
export type CreateZakatPaymentInput = z.infer<typeof createZakatPaymentSchema>;
export type UpdateZakatPaymentInput = z.infer<typeof updateZakatPaymentSchema>;
