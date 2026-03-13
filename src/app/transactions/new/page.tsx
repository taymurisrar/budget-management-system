import { prisma } from "@/lib/prisma";
import CreateTransactionForm from "@/features/transactions/components/create-transaction-form";

export default async function NewTransactionPage() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    return (
      <div className="app-shell py-8">
        <h1 className="page-title">New Transaction</h1>
        <p className="mt-2 text-red-600">No user found in database.</p>
      </div>
    );
  }

  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({
      select: {
        id: true,
        name: true,
        currencyCode: true,
        iconKey: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({
      include: {
        subcategories: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="app-shell py-8">
      <h1 className="page-title">New Transaction</h1>
      <p className="text-muted mt-2">
        Record income, expense, or transfer activity with detailed classification.
      </p>

      <CreateTransactionForm
        userId={user.id}
        defaultCurrencyCode={user.baseCurrencyCode}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}
