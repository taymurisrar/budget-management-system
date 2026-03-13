import { GoalStatus, GoalType, type GoalFrequency, type Prisma } from "@/generated/prisma/client";
import {
  createGoal,
  deleteGoal,
  updateGoal,
} from "@/features/goals/repository/goals.repository";
import type { CreateGoalInput, UpdateGoalInput } from "@/features/goals/validations/goal.schema";
import { prisma } from "@/lib/prisma";

function parseDate(value?: string) {
  return value ? new Date(value) : null;
}

function deriveStatus(currentAmount: number, targetAmount: number, requestedStatus?: string) {
  if (currentAmount >= targetAmount) {
    return GoalStatus.completed;
  }

  if (requestedStatus === GoalStatus.completed) {
    return GoalStatus.active;
  }

  return (requestedStatus as GoalStatus | undefined) ?? GoalStatus.active;
}

async function assertAccountOwnership(userId: string, accountIds: string[]) {
  const filteredIds = accountIds.filter(Boolean);
  if (filteredIds.length === 0) return;

  const count = await prisma.account.count({
    where: {
      userId,
      id: { in: filteredIds },
    },
  });

  if (count !== new Set(filteredIds).size) {
    throw new Error("One or more selected accounts do not belong to the current user");
  }
}

function buildBaseGoalPayload(
  input: CreateGoalInput | UpdateGoalInput,
  currencyCode: string,
  currentAmount: number
): {
  name: string;
  type: GoalType;
  status: GoalStatus;
  iconKey: string | null;
  note: string | null;
  currencyCode: string;
  initialAmount: number;
  currentAmount: number;
  targetAmount: number;
  contributionAmount: number | null;
  frequency: GoalFrequency | null;
  startDate: Date | null;
  endDate: Date | null;
  completedAt: Date | null;
  sourceAccountId: string | null;
  destinationAccountId: string | null;
} {
  const status = deriveStatus(currentAmount, input.targetAmount, input.status);
  const completedAt = status === GoalStatus.completed ? new Date() : null;

  const base = {
    name: input.name,
    type: input.type as GoalType,
    status,
    iconKey: input.iconKey || null,
    note: input.note || null,
    currencyCode,
    initialAmount: input.initialAmount,
    currentAmount,
    targetAmount: input.targetAmount,
    contributionAmount:
      input.type === "circle_saving" ? (input.contributionAmount ?? null) : null,
    frequency: input.type === "circle_saving" ? (input.frequency ?? null) : null,
    startDate: parseDate(input.startDate ?? undefined),
    endDate: parseDate(input.endDate ?? undefined),
    completedAt,
    sourceAccountId: input.sourceAccountId || null,
    destinationAccountId: input.destinationAccountId || null,
  };

  return base;
}

export async function createGoalService(input: CreateGoalInput, currencyCode: string) {
  await assertAccountOwnership(input.userId, [
    input.sourceAccountId || "",
    input.destinationAccountId || "",
  ]);

  return createGoal({
    ...buildBaseGoalPayload(input, currencyCode, input.initialAmount),
    userId: input.userId,
  });
}

export async function updateGoalService(
  existingGoalId: string,
  input: UpdateGoalInput,
  currencyCode: string
) {
  await assertAccountOwnership(input.userId, [
    input.sourceAccountId || "",
    input.destinationAccountId || "",
  ]);

  const currentAmount = Number(input.currentAmount ?? input.initialAmount) + Number(input.contributionDelta ?? 0);

  return updateGoal(existingGoalId, {
    ...buildBaseGoalPayload(input, currencyCode, currentAmount),
    lastContributionDate: input.contributionDelta ? new Date() : undefined,
  });
}

export async function deleteGoalService(goalId: string) {
  return deleteGoal(goalId);
}
