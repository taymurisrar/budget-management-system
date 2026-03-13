import { prisma } from "@/lib/prisma";
import CreateTransactionForm from "@/features/transactions/components/create-transaction-form";
import { requireCurrentUser } from "@/lib/auth/current-user";

export default async function NewTransactionPage() {
  const user = await requireCurrentUser();

  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        currencyCode: true,
        iconKey: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({
      where: { userId: user.id },
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
