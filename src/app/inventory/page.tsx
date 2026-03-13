import Link from "next/link";
import InventoryManagementClient from "@/features/inventory/components/inventory-management-client";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  const [items, categories] = await Promise.all([
    prisma.inventoryItem.findMany({
      include: {
        category: true,
        revisions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.inventoryCategory.findMany({
      select: {
        id: true,
        name: true,
        iconKey: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const initialItems = items.map((item) => ({
    id: item.id,
    userId: item.userId,
    categoryId: item.categoryId,
    categoryName: item.category.name,
    name: item.name,
    brand: item.brand,
    subcategory: item.subcategory,
    tags: Array.isArray(item.tags) ? item.tags : [],
    unit: item.unit,
    currentQuantity: Number(item.currentQuantity),
    inUseQuantity: item.inUseQuantity == null ? null : Number(item.inUseQuantity),
    minQuantity: Number(item.minQuantity),
    reorderQuantity: item.reorderQuantity == null ? null : Number(item.reorderQuantity),
    packageQuantity: item.packageQuantity == null ? null : Number(item.packageQuantity),
    packageUnit: item.packageUnit,
    unitSizeValue: item.unitSizeValue == null ? null : Number(item.unitSizeValue),
    unitSizeUnit: item.unitSizeUnit,
    householdUserCount: item.householdUserCount,
    restockFrequencyDays: item.restockFrequencyDays,
    preferredCurrencyCode: item.preferredCurrencyCode,
    averageUnitCost: item.averageUnitCost == null ? null : Number(item.averageUnitCost),
    lastPurchaseTotalCost:
      item.lastPurchaseTotalCost == null ? null : Number(item.lastPurchaseTotalCost),
    estimatedDailyUsage: item.estimatedDailyUsage == null ? null : Number(item.estimatedDailyUsage),
    lastPurchaseDate: item.lastPurchaseDate?.toISOString() ?? null,
    lastConsumptionDate: item.lastConsumptionDate?.toISOString() ?? null,
    estimatedDaysRemaining: item.estimatedDaysRemaining,
    nextRestockDate: item.nextRestockDate?.toISOString() ?? null,
    expiryDate: item.expiryDate?.toISOString() ?? null,
    notes: item.notes,
    iconKey: item.iconKey,
    revisions: item.revisions.map((revision) => ({
      id: revision.id,
      revisionType: revision.revisionType,
      name: revision.name,
      brand: revision.brand,
      unit: revision.unit,
      currentQuantity: Number(revision.currentQuantity),
      inUseQuantity: revision.inUseQuantity == null ? null : Number(revision.inUseQuantity),
      unitSizeValue: revision.unitSizeValue == null ? null : Number(revision.unitSizeValue),
      unitSizeUnit: revision.unitSizeUnit,
      householdUserCount: revision.householdUserCount,
      lastPurchaseDate: revision.lastPurchaseDate?.toISOString() ?? null,
      changeSummary: revision.changeSummary,
      createdAt: revision.createdAt.toISOString(),
    })),
    updatedAt: item.updatedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <div className="app-shell py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-muted mt-2">Track household stock, pack details, refill reminders, and item costs.</p>
        </div>

        <Link
          href="/inventory/new"
          className="rounded-2xl bg-black px-4 py-2.5 text-white shadow-lg dark:bg-white dark:text-black"
        >
          Add Item
        </Link>
      </div>

      <div className="mt-8">
        <InventoryManagementClient initialItems={initialItems} categories={categories} />
      </div>
    </div>
  );
}
