import { NextResponse } from "next/server";
import { findAllTransactionCategories } from "@/features/transactions/repository/transactions.repository";
import { createTransactionCategoryService } from "@/features/transactions/services/transactions.service";
import { transactionCategorySchema } from "@/features/transactions/validations/transaction.schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ message: "userId is required" }, { status: 400 });
    }

    const categories = await findAllTransactionCategories(userId);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Fetch transaction categories error:", error);
    return NextResponse.json(
      { message: "Failed to fetch transaction categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = transactionCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const category = await createTransactionCategoryService(parsed.data);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Create transaction category error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create category" },
      { status: 500 }
    );
  }
}
