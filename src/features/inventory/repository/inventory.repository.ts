import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function findAllInventoryItems(userId: string) {
  return prisma.inventoryItem.findMany({
    where: { userId },
    include: {
      category: true,
      revisions: {
        orderBy: { createdAt: "desc" },
        take: 12,
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createInventoryItem(data: Prisma.InventoryItemCreateInput) {
  return prisma.inventoryItem.create({
    data,
  });
}

export async function findInventoryItemById(id: string) {
  return prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      category: true,
      revisions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function findInventoryItemByName({
  userId,
  categoryId,
  name,
}: {
  userId: string;
  categoryId: string;
  name: string;
}) {
  return prisma.inventoryItem.findFirst({
    where: {
      userId,
      categoryId,
      name: {
        equals: name.trim(),
        mode: "insensitive",
      },
    },
    include: {
      category: true,
      revisions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function findInventoryCategoryByName({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  return prisma.inventoryCategory.findFirst({
    where: {
      userId,
      name: {
        equals: name.trim(),
        mode: "insensitive",
      },
    },
  });
}

export async function updateInventoryItem(
  id: string,
  data: Prisma.InventoryItemUpdateInput
) {
  return prisma.inventoryItem.update({
    where: { id },
    data,
    include: {
      category: true,
    },
  });
}

export async function deleteInventoryItem(id: string) {
  return prisma.inventoryItem.delete({
    where: { id },
  });
}

export async function findInventoryRevisionById(id: string) {
  return prisma.inventoryItemRevision.findUnique({
    where: { id },
  });
}

export { prisma };
