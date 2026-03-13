import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function findAllAccounts(userId: string) {
  return prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createAccount(data: Prisma.AccountCreateInput) {
  return prisma.account.create({
    data,
  });
}

export async function findAccountById(id: string) {
  return prisma.account.findUnique({
    where: { id },
  });
}
