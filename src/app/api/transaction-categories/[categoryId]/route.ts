import { NextResponse } from "next/server";
import { findTransactionCategoryById } from "@/features/transactions/repository/transactions.repository";
import {
  deleteTransactionCategoryService,
  updateTransactionCategoryService,
} from "@/features/transactions/services/transactions.service";
import { transactionCategorySchema } from "@/features/transactions/validations/transaction.schema";

type RouteContext = {
  params: Promise<{
    categoryId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { categoryId } = await context.params;

  try {
    const existingCategory = await findTransactionCategoryById(categoryId);
    if (!existingCategory) {
      return NextResponse.json({ message: "Category not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = transactionCategorySchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const category = await updateTransactionCategoryService(categoryId, parsed.data);
    return NextResponse.json(category);
  } catch (error) {
    console.error("Update transaction category error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { categoryId } = await context.params;

  try {
    const existingCategory = await findTransactionCategoryById(categoryId);
    if (!existingCategory) {
      return NextResponse.json({ message: "Category not found" }, { status: 404 });
    }

    await deleteTransactionCategoryService(categoryId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete transaction category error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to delete category" },
      { status: 500 }
    );
  }
}
