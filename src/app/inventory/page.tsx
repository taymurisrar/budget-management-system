import Link from "next/link";
import InventoryManagementClient from "@/features/inventory/components/inventory-management-client";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  const [items, categories] = await Promise.all([
    prisma.inventoryItem.findMany({
      include: {
        category: true,
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
    unit: item.unit,
    currentQuantity: Number(item.currentQuantity),
    minQuantity: Number(item.minQuantity),
    reorderQuantity: item.reorderQuantity == null ? null : Number(item.reorderQuantity),
    preferredCurrencyCode: item.preferredCurrencyCode,
    averageUnitCost: item.averageUnitCost == null ? null : Number(item.averageUnitCost),
    estimatedDailyUsage: item.estimatedDailyUsage == null ? null : Number(item.estimatedDailyUsage),
    estimatedDaysRemaining: item.estimatedDaysRemaining,
    nextRestockDate: item.nextRestockDate?.toISOString() ?? null,
    expiryDate: item.expiryDate?.toISOString() ?? null,
    notes: item.notes,
    iconKey: item.iconKey,
    updatedAt: item.updatedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <div className="app-shell py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-muted mt-2">Track household stock and restock needs.</p>
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
