import { NextResponse } from "next/server";
import { findTransactionById } from "@/features/transactions/repository/transactions.repository";
import {
  deleteTransactionService,
  updateTransactionService,
} from "@/features/transactions/services/transactions.service";
import { updateTransactionSchema } from "@/features/transactions/validations/transaction.schema";

type RouteContext = {
  params: Promise<{
    transactionId: string;
  }>;
};

function errorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return NextResponse.json({ message: error.message || fallbackMessage }, { status: 500 });
  }

  return NextResponse.json({ message: fallbackMessage }, { status: 500 });
}

export async function GET(_: Request, context: RouteContext) {
  const { transactionId } = await context.params;

  try {
    const transaction = await findTransactionById(transactionId);
    if (!transaction) {
      return NextResponse.json({ message: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Get transaction error:", error);
    return errorResponse(error, "Failed to fetch transaction");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { transactionId } = await context.params;

  try {
    const body = await request.json();
    const parsed = updateTransactionSchema.safeParse({
      ...body,
      id: transactionId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const transaction = await updateTransactionService(transactionId, parsed.data);
    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Update transaction error:", error);
    return errorResponse(error, "Failed to update transaction");
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { transactionId } = await context.params;

  try {
    await deleteTransactionService(transactionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return errorResponse(error, "Failed to delete transaction");
  }
}
