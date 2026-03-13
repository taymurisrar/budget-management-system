import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const transactionInclude = {
  account: true,
  transferAccount: true,
  category: {
    include: {
      subcategories: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  },
  subcategory: true,
} satisfies Prisma.TransactionInclude;

export const transactionCategoryInclude = {
  subcategories: {
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  },
} satisfies Prisma.CategoryInclude;

export async function findAllTransactions() {
  return prisma.transaction.findMany({
    include: transactionInclude,
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function findTransactionById(id: string) {
  return prisma.transaction.findUnique({
    where: { id },
    include: transactionInclude,
  });
}

export async function findAllTransactionCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    include: transactionCategoryInclude,
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function findTransactionCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
    include: transactionCategoryInclude,
  });
}

export async function findSubcategoryById(id: string) {
  return prisma.subcategory.findUnique({
    where: { id },
    include: {
      category: true,
    },
  });
}

export async function findAccountById(accountId: string) {
  return prisma.account.findUnique({
    where: { id: accountId },
  });
}
