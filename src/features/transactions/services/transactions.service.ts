import { createTransactionWithBalanceUpdate } from "@/features/transactions/repository/transactions.repository";
import type { CreateTransactionInput } from "@/features/transactions/validations/transaction.schema";

export async function createTransactionService(input: CreateTransactionInput) {
  return createTransactionWithBalanceUpdate({
    userId: input.userId,
    accountId: input.accountId,
    type: input.type,
    amount: input.amount,
    categoryId: input.categoryId || null,
    subcategoryId: input.subcategoryId || null,
    transactionDate: new Date(input.transactionDate),
    note: input.note || null,
    merchant: input.merchant || null,
    paymentMethod: input.paymentMethod || null,
  });
}