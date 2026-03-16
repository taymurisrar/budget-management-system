import { prisma } from "@/lib/prisma";

const zakatAssetInclude = {
  payments: {
    orderBy: { paymentDate: "desc" as const },
  },
  revisions: {
    orderBy: { createdAt: "desc" as const },
    take: 30,
  },
};

export async function findAllZakatAssetsByUser(userId: string) {
  return prisma.zakatAsset.findMany({
    where: { userId },
    include: zakatAssetInclude,
    orderBy: [{ isActive: "desc" }, { zakatDueDate: "asc" }, { createdAt: "desc" }],
  });
}

export async function findZakatAssetById(id: string) {
  return prisma.zakatAsset.findUnique({
    where: { id },
    include: zakatAssetInclude,
  });
}

export async function findZakatPaymentById(id: string) {
  return prisma.zakatPayment.findUnique({
    where: { id },
    include: {
      asset: true,
    },
  });
}

export { prisma, zakatAssetInclude };
