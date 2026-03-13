import { NextResponse } from "next/server";
import { findAllGoalsByUser } from "@/features/goals/repository/goals.repository";
import { createGoalService } from "@/features/goals/services/goals.service";
import { createGoalSchema } from "@/features/goals/validations/goal.schema";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const goals = await findAllGoalsByUser(user.id);
    return NextResponse.json(goals);
  } catch (error) {
    console.error("Fetch goals error:", error);

    return NextResponse.json(
      { message: "Failed to fetch goals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createGoalSchema.safeParse({
      ...body,
      userId: user.id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const goal = await createGoalService(parsed.data, user.baseCurrencyCode);
    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error("Create goal error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while creating the goal",
      },
      { status: 500 }
    );
  }
}
