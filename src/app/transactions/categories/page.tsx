import TransactionCategoryManagementClient from "@/features/transactions/components/transaction-category-management-client";
import { prisma } from "@/lib/prisma";

export default async function TransactionCategoriesPage() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    return (
      <div className="app-shell py-8">
        <h1 className="page-title">Transaction Categories</h1>
        <p className="mt-2 text-red-600">No user found in database.</p>
      </div>
    );
  }

  const categories = await prisma.category.findMany({
    where: {
      userId: user.id,
    },
    include: {
      subcategories: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <TransactionCategoryManagementClient
      userId={user.id}
      initialCategories={categories.map((category) => ({
        id: category.id,
        userId: category.userId,
        name: category.name,
        type: category.type,
        iconKey: category.iconKey,
        colorHex: category.colorHex,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        subcategories: category.subcategories.map((subcategory) => ({
          id: subcategory.id,
          name: subcategory.name,
          iconKey: subcategory.iconKey,
          colorHex: subcategory.colorHex,
          sortOrder: subcategory.sortOrder,
          isActive: subcategory.isActive,
        })),
      }))}
    />
  );
}
