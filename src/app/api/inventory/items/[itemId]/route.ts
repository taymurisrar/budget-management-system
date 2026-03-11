import { NextResponse } from "next/server";
import {
  deleteInventoryItem,
  findInventoryItemById,
} from "@/features/inventory/repository/inventory.repository";
import { updateInventoryItemService } from "@/features/inventory/services/inventory.service";
import { updateInventoryItemSchema } from "@/features/inventory/validations/inventory-item.schema";

type RouteContext = {
  params: Promise<{
    itemId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { itemId } = await context.params;

  try {
    const item = await findInventoryItemById(itemId);

    if (!item) {
      return NextResponse.json({ message: "Inventory item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Fetch inventory item error:", error);

    return NextResponse.json(
      { message: "Failed to fetch inventory item" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { itemId } = await context.params;

  try {
    const body = await request.json();
    const parsed = updateInventoryItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const existingItem = await findInventoryItemById(itemId);
    if (!existingItem) {
      return NextResponse.json({ message: "Inventory item not found" }, { status: 404 });
    }

    const item = await updateInventoryItemService(itemId, parsed.data);
    return NextResponse.json(item);
  } catch (error) {
    console.error("Update inventory item error:", error);

    return NextResponse.json(
      { message: "Something went wrong while updating the inventory item" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { itemId } = await context.params;

  try {
    const existingItem = await findInventoryItemById(itemId);
    if (!existingItem) {
      return NextResponse.json({ message: "Inventory item not found" }, { status: 404 });
    }

    await deleteInventoryItem(itemId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Delete inventory item error:", error);

    return NextResponse.json(
      { message: "Something went wrong while deleting the inventory item" },
      { status: 500 }
    );
  }
}
