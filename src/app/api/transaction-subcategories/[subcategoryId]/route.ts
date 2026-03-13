import { NextResponse } from "next/server";
import { findSubcategoryById } from "@/features/transactions/repository/transactions.repository";
import {
  deleteTransactionSubcategoryService,
  updateTransactionSubcategoryService,
} from "@/features/transactions/services/transactions.service";
import { transactionSubcategorySchema } from "@/features/transactions/validations/transaction.schema";

type RouteContext = {
  params: Promise<{
    subcategoryId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { subcategoryId } = await context.params;

  try {
    const existingSubcategory = await findSubcategoryById(subcategoryId);
    if (!existingSubcategory) {
      return NextResponse.json({ message: "Subcategory not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = transactionSubcategorySchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const subcategory = await updateTransactionSubcategoryService(subcategoryId, parsed.data);
    return NextResponse.json(subcategory);
  } catch (error) {
    console.error("Update transaction subcategory error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update subcategory" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { subcategoryId } = await context.params;

  try {
    const existingSubcategory = await findSubcategoryById(subcategoryId);
    if (!existingSubcategory) {
      return NextResponse.json({ message: "Subcategory not found" }, { status: 404 });
    }

    await deleteTransactionSubcategoryService(subcategoryId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete transaction subcategory error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to delete subcategory" },
      { status: 500 }
    );
  }
}
