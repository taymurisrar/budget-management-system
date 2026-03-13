import {
  findInventoryItemById,
  findInventoryItemByName,
  findInventoryRevisionById,
  prisma,
} from "@/features/inventory/repository/inventory.repository";
import type { InventoryItem, InventoryItemRevisionType, Prisma } from "@/generated/prisma/client";
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
} from "@/features/inventory/validations/inventory-item.schema";
import type { RestockInventoryItemInput } from "@/features/inventory/validations/inventory-purchase.schema";
import type { UpdateInventoryRevisionInput } from "@/features/inventory/validations/inventory-revision.schema";
import { calculateNextRestockDate } from "@/features/inventory/inventory-metrics";

function resolveNextRestockDate(
  input: Pick<
    CreateInventoryItemInput | UpdateInventoryItemInput,
    | "currentQuantity"
    | "inUseQuantity"
    | "minQuantity"
    | "unit"
    | "unitSizeValue"
    | "unitSizeUnit"
    | "estimatedDailyUsage"
    | "restockFrequencyDays"
    | "nextRestockDate"
    | "lastPurchaseDate"
  >
) {
  if (input.nextRestockDate) {
    return new Date(input.nextRestockDate);
  }

  const calculatedDate = calculateNextRestockDate(
    {
      currentQuantity: input.currentQuantity,
      inUseQuantity: input.inUseQuantity,
      minQuantity: input.minQuantity,
      unit: input.unit,
      unitSizeValue: input.unitSizeValue,
      unitSizeUnit: input.unitSizeUnit,
      estimatedDailyUsage: input.estimatedDailyUsage,
      restockFrequencyDays: input.restockFrequencyDays,
    },
    input.lastPurchaseDate ?? undefined
  );

  return calculatedDate ? new Date(calculatedDate) : null;
}

function toItemData(
  input: CreateInventoryItemInput | UpdateInventoryItemInput
): Prisma.InventoryItemCreateInput | Prisma.InventoryItemUpdateInput {
  return {
    name: input.name,
    brand: input.brand || null,
    subcategory: input.subcategory || null,
    tags: input.tags,
    unit: input.unit,
    currentQuantity: input.currentQuantity,
    inUseQuantity: input.inUseQuantity ?? null,
    minQuantity: input.minQuantity,
    reorderQuantity: input.reorderQuantity ?? null,
    packageQuantity: input.packageQuantity ?? null,
    packageUnit: input.packageUnit ?? null,
    unitSizeValue: input.unitSizeValue ?? null,
    unitSizeUnit: input.unitSizeUnit ?? null,
    householdUserCount: input.householdUserCount,
    restockFrequencyDays: input.restockFrequencyDays ?? null,
    preferredCurrencyCode: input.preferredCurrencyCode,
    averageUnitCost: input.averageUnitCost ?? null,
    lastPurchaseTotalCost: input.lastPurchaseTotalCost ?? null,
    estimatedDailyUsage: input.estimatedDailyUsage ?? null,
    lastPurchaseDate: input.lastPurchaseDate ? new Date(input.lastPurchaseDate) : null,
    lastConsumptionDate: input.lastConsumptionDate ? new Date(input.lastConsumptionDate) : null,
    nextRestockDate: resolveNextRestockDate(input),
    expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
    notes: input.notes || null,
    iconKey: input.iconKey || null,
  };
}

function buildRevisionSummary(previous: InventoryItem | null, next: UpdateInventoryItemInput) {
  if (!previous) {
    return "Initial configuration created";
  }

  const changedFields: string[] = [];
  if ((previous.brand ?? "") !== (next.brand ?? "")) changedFields.push("brand");
  if (String(previous.unit) !== next.unit) changedFields.push("unit");
  if (Number(previous.unitSizeValue ?? 0) !== Number(next.unitSizeValue ?? 0)) changedFields.push("unit size");
  if (Number(previous.currentQuantity) !== Number(next.currentQuantity)) changedFields.push("stock");
  if (Number(previous.householdUserCount) !== Number(next.householdUserCount)) changedFields.push("household users");
  if (Number(previous.restockFrequencyDays ?? 0) !== Number(next.restockFrequencyDays ?? 0)) {
    changedFields.push("restock frequency");
  }
  if ((previous.lastPurchaseDate?.toISOString().slice(0, 10) ?? "") !== (next.lastPurchaseDate ?? "")) {
    changedFields.push("purchase date");
  }

  return changedFields.length > 0 ? `Updated ${changedFields.join(", ")}` : "Configuration updated";
}

function getRevisionType(previous: InventoryItem | null, next: UpdateInventoryItemInput): InventoryItemRevisionType {
  if (!previous) return "created";

  const stockIncreased = Number(next.currentQuantity) > Number(previous.currentQuantity);
  const laterPurchaseDate =
    !!next.lastPurchaseDate &&
    (!previous.lastPurchaseDate ||
      new Date(next.lastPurchaseDate).getTime() > previous.lastPurchaseDate.getTime());

  return stockIncreased || laterPurchaseDate ? "restocked" : "updated";
}

async function createRevisionSnapshot(
  tx: Prisma.TransactionClient,
  item: InventoryItem,
  revisionType: InventoryItemRevisionType,
  changeSummary: string | null
) {
  await tx.inventoryItemRevision.create({
    data: {
      userId: item.userId,
      itemId: item.id,
      categoryId: item.categoryId,
      revisionType,
      name: item.name,
      brand: item.brand,
      subcategory: item.subcategory,
      tags: item.tags,
      unit: item.unit,
      currentQuantity: item.currentQuantity,
      inUseQuantity: item.inUseQuantity,
      minQuantity: item.minQuantity,
      reorderQuantity: item.reorderQuantity,
      packageQuantity: item.packageQuantity,
      packageUnit: item.packageUnit,
      unitSizeValue: item.unitSizeValue,
      unitSizeUnit: item.unitSizeUnit,
      householdUserCount: item.householdUserCount,
      restockFrequencyDays: item.restockFrequencyDays,
      preferredCurrencyCode: item.preferredCurrencyCode,
      averageUnitCost: item.averageUnitCost,
      lastPurchaseTotalCost: item.lastPurchaseTotalCost,
      estimatedDailyUsage: item.estimatedDailyUsage,
      lastPurchaseDate: item.lastPurchaseDate,
      lastConsumptionDate: item.lastConsumptionDate,
      nextRestockDate: item.nextRestockDate,
      expiryDate: item.expiryDate,
      notes: item.notes,
      changeSummary,
    },
  });
}

const inventoryItemInclude = {
  category: true,
  revisions: {
    orderBy: { createdAt: "desc" as const },
    take: 20,
  },
};

export async function createInventoryItemService(input: CreateInventoryItemInput) {
  const existingItem = await findInventoryItemByName({
    userId: input.userId,
    categoryId: input.categoryId,
    name: input.name,
  });

  if (existingItem) {
    const brandSuffix = existingItem.brand ? ` (${existingItem.brand})` : "";
    throw new Error(
      `This item already exists as "${existingItem.name}${brandSuffix}". Use Restock or Edit on the existing record to preserve history.`
    );
  }

  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.create({
      data: {
        ...(toItemData(input) as Prisma.InventoryItemCreateInput),
        user: {
          connect: { id: input.userId },
        },
        category: {
          connect: { id: input.categoryId },
        },
      },
      include: inventoryItemInclude,
    });

    await createRevisionSnapshot(tx, item, "created", "Initial configuration created");

    return tx.inventoryItem.findUniqueOrThrow({
      where: { id: item.id },
      include: inventoryItemInclude,
    });
  });
}

export async function updateInventoryItemService(
  id: string,
  input: UpdateInventoryItemInput
) {
  const existingItem = await findInventoryItemById(id);
  if (!existingItem) {
    throw new Error("Inventory item not found");
  }

  return prisma.$transaction(async (tx) => {
    const revisionType = getRevisionType(existingItem, input);
    const changeSummary = buildRevisionSummary(existingItem, input);

    const item = await tx.inventoryItem.update({
      where: { id },
      data: {
        ...(toItemData(input) as Prisma.InventoryItemUpdateInput),
        category: {
          connect: { id: input.categoryId },
        },
      },
      include: inventoryItemInclude,
    });

    await createRevisionSnapshot(tx, item, revisionType, changeSummary);

    return tx.inventoryItem.findUniqueOrThrow({
      where: { id: item.id },
      include: inventoryItemInclude,
    });
  });
}

export async function restockInventoryItemService(
  itemId: string,
  input: RestockInventoryItemInput
) {
  const existingItem = await findInventoryItemById(itemId);
  if (!existingItem) {
    throw new Error("Inventory item not found");
  }

  return prisma.$transaction(async (tx) => {
    await tx.inventoryPurchase.create({
      data: {
        userId: input.userId,
        itemId,
        quantity: input.quantity,
        unitPrice: input.unitPrice ?? null,
        totalPrice: input.totalPrice ?? null,
        currencyCode: input.currencyCode,
        purchaseDate: new Date(input.purchaseDate),
        storeName: input.storeName || null,
        note: input.note || null,
      },
    });

    const nextCurrentQuantity = Number(existingItem.currentQuantity) + Number(input.quantity);
    const nextUnitPrice =
      input.unitPrice ??
      (input.totalPrice != null && input.quantity > 0 ? Number(input.totalPrice) / Number(input.quantity) : null);

    const item = await tx.inventoryItem.update({
      where: { id: itemId },
      data: {
        currentQuantity: nextCurrentQuantity,
        brand: input.brand ?? existingItem.brand,
        packageQuantity: input.packageQuantity ?? existingItem.packageQuantity,
        packageUnit: input.packageUnit ?? existingItem.packageUnit,
        unitSizeValue: input.unitSizeValue ?? existingItem.unitSizeValue,
        unitSizeUnit: input.unitSizeUnit ?? existingItem.unitSizeUnit,
        householdUserCount: input.householdUserCount ?? existingItem.householdUserCount,
        restockFrequencyDays: existingItem.restockFrequencyDays,
        preferredCurrencyCode: input.currencyCode,
        averageUnitCost: nextUnitPrice ?? existingItem.averageUnitCost,
        lastUnitCost: nextUnitPrice ?? existingItem.lastUnitCost,
        lastPurchaseTotalCost: input.totalPrice ?? existingItem.lastPurchaseTotalCost,
        lastPurchaseDate: new Date(input.purchaseDate),
        nextRestockDate:
          existingItem.restockFrequencyDays && existingItem.restockFrequencyDays > 0
            ? new Date(
                calculateNextRestockDate(
                  { restockFrequencyDays: existingItem.restockFrequencyDays },
                  input.purchaseDate
                )!
              )
            : existingItem.nextRestockDate,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : existingItem.expiryDate,
        notes:
          input.note && input.note.trim().length > 0
            ? `${existingItem.notes ? `${existingItem.notes}\n` : ""}Restock: ${input.note.trim()}`
            : existingItem.notes,
      },
      include: inventoryItemInclude,
    });

    const summaryParts = [
      `Restocked ${input.quantity} ${item.unit}${input.quantity === 1 ? "" : "s"}`,
      input.brand ? `brand ${input.brand}` : null,
      input.householdUserCount ? `users ${input.householdUserCount}` : null,
    ].filter(Boolean);

    await createRevisionSnapshot(tx, item, "restocked", summaryParts.join(" | "));

    return tx.inventoryItem.findUniqueOrThrow({
      where: { id: item.id },
      include: inventoryItemInclude,
    });
  });
}

export async function updateInventoryRevisionService(
  itemId: string,
  revisionId: string,
  input: UpdateInventoryRevisionInput
) {
  const revision = await findInventoryRevisionById(revisionId);
  if (!revision || revision.itemId !== itemId) {
    throw new Error("Inventory history entry not found");
  }

  return prisma.$transaction(async (tx) => {
    await tx.inventoryItemRevision.update({
      where: { id: revisionId },
      data: {
        changeSummary: input.changeSummary,
      },
    });

    return tx.inventoryItem.findUniqueOrThrow({
      where: { id: itemId },
      include: inventoryItemInclude,
    });
  });
}

export async function deleteInventoryRevisionService(itemId: string, revisionId: string) {
  const revision = await findInventoryRevisionById(revisionId);
  if (!revision || revision.itemId !== itemId) {
    throw new Error("Inventory history entry not found");
  }

  return prisma.$transaction(async (tx) => {
    await tx.inventoryItemRevision.delete({
      where: { id: revisionId },
    });

    return tx.inventoryItem.findUniqueOrThrow({
      where: { id: itemId },
      include: inventoryItemInclude,
    });
  });
}
