import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
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

function inventoryErrorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Another inventory item with this name already exists. Keep one record and update it to preserve history." },
        { status: 409 }
      );
    }
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { message: error.message || "Something went wrong while updating the inventory item" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Something went wrong while updating the inventory item" },
    { status: 500 }
  );
}

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
    return inventoryErrorResponse(error);
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
