import { prisma } from "@/lib/prisma";
import CreateInventoryItemForm from "@/features/inventory/components/create-inventory-item-form";
//import CreateInventoryItemForm from "@/features/inventory/components/create-inventory-item-form";
import { Boxes, PackageSearch } from "lucide-react";

export default async function NewInventoryPage() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    return (
      <div className="app-shell py-8">
        <div className="glass-card overflow-hidden">
          <div className="border-b border-[var(--border)] px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-black/90 p-3 text-white dark:bg-white dark:text-black">
                <Boxes className="h-5 w-5" />
              </div>

              <div>
                <h1 className="page-title">New Inventory Item</h1>
                <p className="text-muted mt-2">
                  Create and track household items with quantity and restock intelligence.
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-10">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              No user found in database. Seed or create a user first before adding inventory items.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categories = await prisma.inventoryCategory.findMany({
    select: {
      id: true,
      name: true,
      iconKey: true,
    },
    orderBy: { name: "asc" },
  });

  if (categories.length === 0) {
    return (
      <div className="app-shell py-8">
        <div className="glass-card overflow-hidden">
          <div className="border-b border-[var(--border)] px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-black/90 p-3 text-white dark:bg-white dark:text-black">
                <Boxes className="h-5 w-5" />
              </div>

              <div>
                <h1 className="page-title">New Inventory Item</h1>
                <p className="text-muted mt-2">
                  Create and track household items with quantity and restock intelligence.
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-10">
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border)] bg-white/40 px-6 py-12 text-center dark:bg-white/5">
              <div className="rounded-2xl bg-blue-50 p-4 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                <PackageSearch className="h-7 w-7" />
              </div>

              <h2 className="section-title mt-5">No inventory categories found</h2>
              <p className="text-muted mt-2 max-w-xl text-sm">
                Add or seed inventory categories first, such as Personal Care, Cleaning,
                Groceries, Pet Supplies, or Medicine, then come back and create items.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell py-8">
      <div className="mb-6 flex items-start gap-4">
        <div className="rounded-3xl bg-black p-3.5 text-white shadow-lg dark:bg-white dark:text-black">
          <Boxes className="h-6 w-6" />
        </div>

        <div>
          <h1 className="page-title">New Inventory Item</h1>
          <p className="text-muted mt-2 max-w-2xl">
            Add a household item, define its unit and thresholds, and prepare it for
            purchase logging, consumption tracking, and restock forecasting.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="soft-card p-5">
          <p className="text-sm font-medium">Track what matters</p>
          <p className="text-muted mt-2 text-sm">
            Personal care, groceries, cleaning items, pet supplies, medicine, and more.
          </p>
        </div>

        <div className="soft-card p-5">
          <p className="text-sm font-medium">Set thresholds</p>
          <p className="text-muted mt-2 text-sm">
            Define minimum quantity and reorder quantity so the system can flag low stock.
          </p>
        </div>

        <div className="soft-card p-5">
          <p className="text-sm font-medium">Forecast depletion</p>
          <p className="text-muted mt-2 text-sm">
            Add estimated daily usage to predict when an item is likely to run out.
          </p>
        </div>
      </div>

      <CreateInventoryItemForm
        userId={user.id}
        categories={categories}
      />
    </div>
  );
}