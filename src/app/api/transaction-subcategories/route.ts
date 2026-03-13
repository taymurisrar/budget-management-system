import { NextResponse } from "next/server";
import { createTransactionSubcategoryService } from "@/features/transactions/services/transactions.service";
import { transactionSubcategorySchema } from "@/features/transactions/validations/transaction.schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = transactionSubcategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const subcategory = await createTransactionSubcategoryService(parsed.data);
    return NextResponse.json(subcategory, { status: 201 });
  } catch (error) {
    console.error("Create transaction subcategory error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create subcategory" },
      { status: 500 }
    );
  }
}
