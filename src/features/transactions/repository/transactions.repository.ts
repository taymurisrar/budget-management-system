import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function findAllTransactions() {
  return prisma.transaction.findMany({
    include: {
      account: true,
      category: true,
      subcategory: true,
    },
    orderBy: {
      transactionDate: "desc",
    },
  });
}

export async function findAccountById(accountId: string) {
  return prisma.account.findUnique({
    where: { id: accountId },
  });
}

export async function createTransactionWithBalanceUpdate(
  data: Prisma.TransactionUncheckedCreateInput
) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: { id: data.accountId },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    const currentBalance = Number(account.balance ?? 0);
    const amount = Number(data.amount);

    let newBalance = currentBalance;

    if (data.type === "income") {
      newBalance += amount;
    } else if (data.type === "expense") {
      newBalance -= amount;
    }

    const transaction = await tx.transaction.create({
      data,
    });

    await tx.account.update({
      where: { id: data.accountId },
      data: {
        balance: newBalance,
      },
    });

    return transaction;
  });
}
