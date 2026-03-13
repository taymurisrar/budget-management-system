import { prisma } from "@/lib/prisma";
import CreateInventoryItemForm from "@/features/inventory/components/create-inventory-item-form";
import { Boxes, PackageSearch } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/current-user";

export default async function NewInventoryPage() {
  const user = await requireCurrentUser();

  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    include: {
      subcategories: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
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

              <h2 className="section-title mt-5">No global categories found</h2>
              <p className="text-muted mt-2 max-w-xl text-sm">
                Add categories and subcategories in Settings first, then come back and create inventory items from the shared taxonomy.
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
            Add a household item with practical stock details like pack size, in-use quantity,
            refill reminder level, classification tags, and cost.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="soft-card p-5">
          <p className="text-sm font-medium">Classify clearly</p>
          <p className="text-muted mt-2 text-sm">
            Personal care, groceries, cleaning items, pet supplies, medicine, plus subcategories and tags.
          </p>
        </div>

        <div className="soft-card p-5">
          <p className="text-sm font-medium">Match real shopping habits</p>
          <p className="text-muted mt-2 text-sm">
            Capture packs, rolls, tubes, litres, kilos, and what is already in use at home.
          </p>
        </div>

        <div className="soft-card p-5">
          <p className="text-sm font-medium">Keep cost context</p>
          <p className="text-muted mt-2 text-sm">
            Save unit cost and total paid so inventory and spending stay connected.
          </p>
        </div>
      </div>

      <CreateInventoryItemForm
        userId={user.id}
        defaultCurrencyCode={user.baseCurrencyCode}
        categories={categories}
      />
    </div>
  );
}
