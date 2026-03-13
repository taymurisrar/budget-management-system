import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { findInventoryItemById } from "@/features/inventory/repository/inventory.repository";
import { restockInventoryItemService } from "@/features/inventory/services/inventory.service";
import { restockInventoryItemSchema } from "@/features/inventory/validations/inventory-purchase.schema";

type RouteContext = {
  params: Promise<{
    itemId: string;
  }>;
};

function inventoryErrorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return NextResponse.json(
      { message: "Something went wrong while restocking the inventory item." },
      { status: 500 }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { message: error.message || "Something went wrong while restocking the inventory item." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Something went wrong while restocking the inventory item." },
    { status: 500 }
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { itemId } = await context.params;

  try {
    const body = await request.json();
    const parsed = restockInventoryItemSchema.safeParse({
      ...body,
      itemId,
    });

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

    const item = await restockInventoryItemService(itemId, parsed.data);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Restock inventory item error:", error);
    return inventoryErrorResponse(error);
  }
}
