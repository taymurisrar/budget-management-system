import TransactionManagementClient from "@/features/transactions/components/transaction-management-client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/current-user";

export default async function TransactionsPage() {
  const user = await requireCurrentUser();
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    include: {
      account: true,
      transferAccount: true,
      category: true,
      subcategory: true,
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  });

  const serializedTransactions = transactions.map((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    amount: Number(transaction.amount),
    currencyCode: transaction.currencyCode,
    exchangeRate: transaction.exchangeRate ? Number(transaction.exchangeRate) : null,
    transactionDate: transaction.transactionDate.toISOString(),
    note: transaction.note,
    merchant: transaction.merchant,
    tags: transaction.tags,
    account: {
      name: transaction.account.name,
      currencyCode: transaction.account.currencyCode,
      iconKey: transaction.account.iconKey,
    },
    transferAccount: transaction.transferAccount
      ? {
          name: transaction.transferAccount.name,
          currencyCode: transaction.transferAccount.currencyCode,
          iconKey: transaction.transferAccount.iconKey,
        }
      : null,
    category: transaction.category
      ? {
          name: transaction.category.name,
          iconKey: transaction.category.iconKey,
        }
      : null,
    subcategory: transaction.subcategory
      ? {
          name: transaction.subcategory.name,
          iconKey: transaction.subcategory.iconKey,
        }
      : null,
  }));

  return <TransactionManagementClient transactions={serializedTransactions} />;
}
