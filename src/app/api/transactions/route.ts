import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { findAllTransactions } from "@/features/transactions/repository/transactions.repository";
import { createTransactionService } from "@/features/transactions/services/transactions.service";
import { createTransactionSchema } from "@/features/transactions/validations/transaction.schema";
import { getCurrentUser } from "@/lib/auth/current-user";

function errorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return NextResponse.json({ message: fallbackMessage }, { status: 500 });
  }

  if (error instanceof Error) {
    return NextResponse.json({ message: error.message || fallbackMessage }, { status: 500 });
  }

  return NextResponse.json({ message: fallbackMessage }, { status: 500 });
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const transactions = await findAllTransactions(user.id);
    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Fetch transactions error:", error);
    return errorResponse(error, "Failed to fetch transactions");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createTransactionSchema.safeParse({
      ...body,
      userId: user.id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const transaction = await createTransactionService(parsed.data);
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Create transaction error:", error);
    return errorResponse(error, "Something went wrong while creating the transaction");
  }
}
