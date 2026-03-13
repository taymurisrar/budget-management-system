import { NextResponse } from "next/server";
import { findGoalById } from "@/features/goals/repository/goals.repository";
import {
  deleteGoalService,
  updateGoalService,
} from "@/features/goals/services/goals.service";
import { updateGoalSchema } from "@/features/goals/validations/goal.schema";
import { getCurrentUser } from "@/lib/auth/current-user";

type RouteContext = {
  params: Promise<{
    goalId: string;
  }>;
};

function errorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return NextResponse.json({ message: error.message || fallbackMessage }, { status: 500 });
  }

  return NextResponse.json({ message: fallbackMessage }, { status: 500 });
}

export async function GET(_: Request, context: RouteContext) {
  const { goalId } = await context.params;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const goal = await findGoalById(goalId);
    if (!goal || goal.userId !== user.id) {
      return NextResponse.json({ message: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json(goal);
  } catch (error) {
    console.error("Get goal error:", error);
    return errorResponse(error, "Failed to fetch goal");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { goalId } = await context.params;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existingGoal = await findGoalById(goalId);
    if (!existingGoal || existingGoal.userId !== user.id) {
      return NextResponse.json({ message: "Goal not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateGoalSchema.safeParse({
      ...body,
      id: goalId,
      userId: user.id,
      currentAmount: body.currentAmount ?? Number(existingGoal.currentAmount),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const goal = await updateGoalService(goalId, parsed.data, user.baseCurrencyCode);
    return NextResponse.json(goal);
  } catch (error) {
    console.error("Update goal error:", error);
    return errorResponse(error, "Failed to update goal");
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { goalId } = await context.params;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existingGoal = await findGoalById(goalId);
    if (!existingGoal || existingGoal.userId !== user.id) {
      return NextResponse.json({ message: "Goal not found" }, { status: 404 });
    }

    await deleteGoalService(goalId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete goal error:", error);
    return errorResponse(error, "Failed to delete goal");
  }
}
