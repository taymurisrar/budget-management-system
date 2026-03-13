import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const goalInclude = {
  sourceAccount: {
    select: {
      id: true,
      name: true,
      iconKey: true,
    },
  },
  destinationAccount: {
    select: {
      id: true,
      name: true,
      iconKey: true,
    },
  },
} satisfies Prisma.GoalInclude;

export async function findAllGoalsByUser(userId: string) {
  return prisma.goal.findMany({
    where: { userId },
    include: goalInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function findGoalById(id: string) {
  return prisma.goal.findUnique({
    where: { id },
    include: goalInclude,
  });
}

export async function createGoal(data: Prisma.GoalUncheckedCreateInput) {
  return prisma.goal.create({
    data,
    include: goalInclude,
  });
}

export async function updateGoal(id: string, data: Prisma.GoalUncheckedUpdateInput) {
  return prisma.goal.update({
    where: { id },
    data,
    include: goalInclude,
  });
}

export async function deleteGoal(id: string) {
  return prisma.goal.delete({
    where: { id },
  });
}
