import { notFound } from "next/navigation";
import CreateTransactionForm from "@/features/transactions/components/create-transaction-form";
import { prisma } from "@/lib/prisma";

type PageContext = {
  params: Promise<{
    transactionId: string;
  }>;
};

export default async function EditTransactionPage(context: PageContext) {
  const { transactionId } = await context.params;

  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!user) {
    notFound();
  }

  const [accounts, categories, transaction] = await Promise.all([
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
    prisma.transaction.findUnique({
      where: { id: transactionId },
    }),
  ]);

  if (!transaction) {
    notFound();
  }

  return (
    <div className="app-shell py-8">
      <h1 className="page-title">Edit Transaction</h1>
      <p className="text-muted mt-2">
        Update transaction details and keep related balances consistent.
      </p>

      <CreateTransactionForm
        userId={user.id}
        accounts={accounts}
        categories={categories}
        mode="edit"
        transaction={{
          id: transaction.id,
          accountId: transaction.accountId,
          transferAccountId: transaction.transferAccountId,
          type: transaction.type,
          amount: Number(transaction.amount),
          currencyCode: transaction.currencyCode,
          exchangeRate: transaction.exchangeRate ? Number(transaction.exchangeRate) : null,
          categoryId: transaction.categoryId,
          subcategoryId: transaction.subcategoryId,
          transactionDate: transaction.transactionDate.toISOString(),
          merchant: transaction.merchant,
          paymentMethod: transaction.paymentMethod,
          referenceNumber: transaction.referenceNumber,
          externalReference: transaction.externalReference,
          location: transaction.location,
          note: transaction.note,
          tags: transaction.tags,
        }}
      />
    </div>
  );
}
