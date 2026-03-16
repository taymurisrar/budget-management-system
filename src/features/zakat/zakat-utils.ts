import {
  zakatMetalPurityLabels,
  zakatPaymentMonths,
  zakatAssetTypes,
  zakatMetalPurities,
  zakatOwnershipRelations,
} from "@/features/zakat/zakat-constants";

export const ZAKAT_RATE = 0.025;
export const HAWL_DAYS = 354;
export const TROY_OUNCE_IN_GRAMS = 31.1034768;
export const GOLD_NISAB_GRAMS = 87.48;
export const SILVER_NISAB_GRAMS = 612.36;
export const TOLA_IN_GRAMS = 11.6638038;

export type ZakatAssetType = (typeof zakatAssetTypes)[number];
export type ZakatOwnershipRelation = (typeof zakatOwnershipRelations)[number];
export type ZakatMetalPurity = (typeof zakatMetalPurities)[number];

export const metalPurityFactors: Record<ZakatMetalPurity, number> = {
  k24: 1,
  k22: 22 / 24,
  k20: 20 / 24,
  k18: 18 / 24,
};

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function addDays(value: Date | string, days: number) {
  const next = new Date(toDate(value));
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function calculateZakatDueDate(purchaseDate: Date | string) {
  return addDays(purchaseDate, HAWL_DAYS);
}

export function calculateNextCycleDate(purchaseDate: Date | string, referenceDate = new Date()) {
  let next = calculateZakatDueDate(purchaseDate);
  while (next.getTime() < referenceDate.getTime()) {
    next = addDays(next, HAWL_DAYS);
  }
  return next;
}

export function getDaysBetween(targetDate: Date | string, referenceDate = new Date()) {
  const diff = toDate(targetDate).getTime() - referenceDate.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function hasCompletedHawl(purchaseDate: Date | string, referenceDate = new Date()) {
  return calculateZakatDueDate(purchaseDate).getTime() <= referenceDate.getTime();
}

export function calculateNetZakatableValue(grossValue: number, deductibleAmount = 0) {
  return Math.max(grossValue - deductibleAmount, 0);
}

export function calculateZakatAmount(netValue: number) {
  return Number((netValue * ZAKAT_RATE).toFixed(2));
}

export function calculateMetalValue({
  weightGrams,
  purity,
  pricePerGram,
}: {
  weightGrams: number;
  purity: ZakatMetalPurity;
  pricePerGram: number;
}) {
  return Number((weightGrams * pricePerGram * metalPurityFactors[purity]).toFixed(2));
}

export function gramsToTola(grams: number) {
  return Number((grams / TOLA_IN_GRAMS).toFixed(4));
}

export function tolaToGrams(tola: number) {
  return Number((tola * TOLA_IN_GRAMS).toFixed(4));
}

export function getPreferredPaymentMonthLabel(month?: number | null) {
  return zakatPaymentMonths.find((entry) => entry.value === month)?.label ?? "Not set";
}

export function getPurityLabel(purity?: ZakatMetalPurity | null) {
  return purity ? zakatMetalPurityLabels[purity] : "N/A";
}

export function isMetalAssetType(assetType: ZakatAssetType) {
  return assetType === "gold" || assetType === "silver";
}

export function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}
