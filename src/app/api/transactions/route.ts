import { NextResponse } from "next/server";
import { createTransactionSchema } from "@/features/transactions/validations/transaction.schema";
import { createTransactionService } from "@/features/transactions/services/transactions.service";
import { findAllTransactions } from "@/features/transactions/repository/transactions.repository";

export async function GET() {
  try {
    const transactions = await findAllTransactions();
    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Fetch transactions error:", error);

    return NextResponse.json(
      { message: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const transaction = await createTransactionService(parsed.data);

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Create transaction error:", error);

    return NextResponse.json(
      { message: "Something went wrong while creating the transaction" },
      { status: 500 }
    );
  }
}