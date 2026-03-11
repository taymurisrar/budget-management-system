import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function findAllAccounts() {
  return prisma.account.findMany({
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