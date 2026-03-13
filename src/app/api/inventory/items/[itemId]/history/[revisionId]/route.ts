import { NextResponse } from "next/server";
import { findInventoryItemById, findInventoryRevisionById } from "@/features/inventory/repository/inventory.repository";
import {
  deleteInventoryRevisionService,
  updateInventoryRevisionService,
} from "@/features/inventory/services/inventory.service";
import { updateInventoryRevisionSchema } from "@/features/inventory/validations/inventory-revision.schema";

type RouteContext = {
  params: Promise<{
    itemId: string;
    revisionId: string;
  }>;
};

function errorResponse(error: unknown) {
  if (error instanceof Error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Something went wrong while updating inventory history." },
    { status: 500 }
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const { itemId, revisionId } = await context.params;

  try {
    const [item, revision] = await Promise.all([
      findInventoryItemById(itemId),
      findInventoryRevisionById(revisionId),
    ]);

    if (!item || !revision || revision.itemId !== itemId) {
      return NextResponse.json({ message: "Inventory history entry not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateInventoryRevisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updatedItem = await updateInventoryRevisionService(itemId, revisionId, parsed.data);
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Update inventory history error:", error);
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { itemId, revisionId } = await context.params;

  try {
    const [item, revision] = await Promise.all([
      findInventoryItemById(itemId),
      findInventoryRevisionById(revisionId),
    ]);

    if (!item || !revision || revision.itemId !== itemId) {
      return NextResponse.json({ message: "Inventory history entry not found" }, { status: 404 });
    }

    const updatedItem = await deleteInventoryRevisionService(itemId, revisionId);
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Delete inventory history error:", error);
    return errorResponse(error);
  }
}
