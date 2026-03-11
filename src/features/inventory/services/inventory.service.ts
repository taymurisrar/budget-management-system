import {
  createInventoryItem,
  updateInventoryItem,
} from "@/features/inventory/repository/inventory.repository";
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
} from "@/features/inventory/validations/inventory-item.schema";

export async function createInventoryItemService(input: CreateInventoryItemInput) {
  return createInventoryItem({
    name: input.name,
    brand: input.brand || null,
    unit: input.unit,
    currentQuantity: input.currentQuantity,
    minQuantity: input.minQuantity,
    reorderQuantity: input.reorderQuantity ?? null,
    preferredCurrencyCode: input.preferredCurrencyCode,
    averageUnitCost: input.averageUnitCost ?? null,
    estimatedDailyUsage: input.estimatedDailyUsage ?? null,
    notes: input.notes || null,
    iconKey: input.iconKey || null,
    user: {
      connect: { id: input.userId },
    },
    category: {
      connect: { id: input.categoryId },
    },
  });
}

export async function updateInventoryItemService(
  id: string,
  input: UpdateInventoryItemInput
) {
  return updateInventoryItem(id, {
    name: input.name,
    brand: input.brand || null,
    unit: input.unit,
    currentQuantity: input.currentQuantity,
    minQuantity: input.minQuantity,
    reorderQuantity: input.reorderQuantity ?? null,
    preferredCurrencyCode: input.preferredCurrencyCode,
    averageUnitCost: input.averageUnitCost ?? null,
    estimatedDailyUsage: input.estimatedDailyUsage ?? null,
    notes: input.notes || null,
    iconKey: input.iconKey || null,
    category: {
      connect: { id: input.categoryId },
    },
  });
}
