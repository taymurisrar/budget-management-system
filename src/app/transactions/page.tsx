import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function TransactionsPage() {
  const transactions = await prisma.transaction.findMany({
    include: {
      account: true,
      category: true,
    },
    orderBy: {
      transactionDate: "desc",
    },
  });

  return (
    <div className="app-shell py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="text-muted mt-2">Track income and expenses.</p>
        </div>

        <Link
          href="/transactions/new"
          className="rounded-2xl bg-black px-4 py-2.5 text-white shadow-lg dark:bg-white dark:text-black"
        >
          Add Transaction
        </Link>
      </div>

      <div className="mt-8 grid gap-4">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="glass-card flex items-center justify-between p-5"
          >
            <div>
              <p className="text-base font-semibold">
                {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
              </p>
              <p className="text-muted mt-1 text-sm">
                {tx.account.name}
                {tx.category ? ` • ${tx.category.name}` : ""}
              </p>
              <p className="text-muted mt-1 text-xs">
                {new Date(tx.transactionDate).toLocaleDateString()}
              </p>
            </div>

            <p
              className={`text-lg font-semibold ${
                tx.type === "income"
                  ? "financial-positive"
                  : tx.type === "expense"
                  ? "financial-negative"
                  : ""
              }`}
            >
              {Number(tx.amount).toFixed(2)} {tx.account.currencyCode}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}