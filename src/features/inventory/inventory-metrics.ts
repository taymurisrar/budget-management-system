type QuantityLike = {
  currentQuantity?: number | null | undefined;
  inUseQuantity?: number | null | undefined;
  minQuantity?: number | null | undefined;
  unit?: string | null | undefined;
  unitSizeValue?: number | null | undefined;
  unitSizeUnit?: string | null | undefined;
  estimatedDailyUsage?: number | null | undefined;
  restockFrequencyDays?: number | null | undefined;
};

type UsageEstimateLike = {
  unitSizeValue?: number | null | undefined;
  lastPurchaseDate?: string | Date | null | undefined;
  lastConsumptionDate?: string | Date | null | undefined;
};

function parseDatePart(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function toNumber(value: number | null | undefined) {
  return value == null || Number.isNaN(Number(value)) ? 0 : Number(value);
}

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const parsed =
    value instanceof Date
      ? new Date(value.getFullYear(), value.getMonth(), value.getDate())
      : parseDatePart(value) ?? new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function usesSizeTracking(item: QuantityLike) {
  return toNumber(item.unitSizeValue) > 0 && !!item.unitSizeUnit;
}

export function getTrackingUnit(item: QuantityLike) {
  return usesSizeTracking(item) ? item.unitSizeUnit ?? item.unit ?? "" : item.unit ?? "";
}

export function getAvailableAmount(item: QuantityLike) {
  if (usesSizeTracking(item)) {
    return toNumber(item.currentQuantity) * toNumber(item.unitSizeValue) + toNumber(item.inUseQuantity);
  }

  return toNumber(item.currentQuantity);
}

export function getThresholdAmount(item: QuantityLike) {
  return toNumber(item.minQuantity);
}

export function getInventoryStatus(item: QuantityLike) {
  const availableAmount = getAvailableAmount(item);
  const thresholdAmount = getThresholdAmount(item);

  if (availableAmount <= 0) return "out";
  if (availableAmount <= thresholdAmount) return "low";
  return "healthy";
}

export function getEstimatedDaysRemaining(item: QuantityLike) {
  const dailyUsage = toNumber(item.estimatedDailyUsage);
  if (dailyUsage <= 0) return null;

  return Math.max(0, Math.floor(getAvailableAmount(item) / dailyUsage));
}

export function formatInventoryDate(value: string | Date | null | undefined) {
  const parsed = toDate(value);
  return parsed ? parsed.toLocaleDateString() : "N/A";
}

export function toDateInputValue(value: string | Date | null | undefined) {
  const parsed = toDate(value);
  return parsed ? parsed.toISOString().slice(0, 10) : "";
}

export function calculateSuggestedDailyUsage(item: UsageEstimateLike) {
  const unitSizeValue = toNumber(item.unitSizeValue);
  const lastPurchaseDate = toDate(item.lastPurchaseDate);
  const lastConsumptionDate = toDate(item.lastConsumptionDate);

  if (unitSizeValue <= 0 || !lastPurchaseDate || !lastConsumptionDate) {
    return null;
  }

  const diffMs = lastConsumptionDate.getTime() - lastPurchaseDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    return null;
  }

  return Number((unitSizeValue / diffDays).toFixed(3));
}

export function getTodayDateInputValue() {
  return toDateInputValue(new Date());
}

export function calculateNextRestockDate(item: QuantityLike, referenceDate?: string | Date | null) {
  const frequencyDays = Math.floor(toNumber(item.restockFrequencyDays));
  const baseDate = toDate(referenceDate) ?? new Date();

  if (frequencyDays > 0) {
    const nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    nextDate.setDate(nextDate.getDate() + frequencyDays);
    return nextDate.toISOString().slice(0, 10);
  }

  const dailyUsage = toNumber(item.estimatedDailyUsage);
  if (dailyUsage <= 0) return null;

  const availableAmount = getAvailableAmount(item);
  const thresholdAmount = getThresholdAmount(item);
  const remainingBeforeReminder = Math.max(0, availableAmount - thresholdAmount);
  const daysUntilReminder = Math.ceil(remainingBeforeReminder / dailyUsage);
  const nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  nextDate.setDate(nextDate.getDate() + daysUntilReminder);
  return nextDate.toISOString().slice(0, 10);
}
