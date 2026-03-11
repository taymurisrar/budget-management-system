import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function findAllInventoryItems() {
  return prisma.inventoryItem.findMany({
    include: {
      category: true,
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
