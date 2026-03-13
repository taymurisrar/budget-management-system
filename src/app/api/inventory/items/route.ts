import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { createInventoryItemSchema } from "@/features/inventory/validations/inventory-item.schema";
import { createInventoryItemService } from "@/features/inventory/services/inventory.service";
import { findAllInventoryItems } from "@/features/inventory/repository/inventory.repository";

function inventoryErrorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "This inventory item already exists. Update or restock the existing record so its history stays intact." },
        { status: 409 }
      );
    }
  }

  if (error instanceof Error) {
    if (
      error.message.includes("already exists") ||
      error.message.includes("preserve history")
    ) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { message: error.message || "Something went wrong while creating the inventory item" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Something went wrong while creating the inventory item" },
    { status: 500 }
  );
}

export async function GET() {
  try {
    const items = await findAllInventoryItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Fetch inventory items error:", error);

    return NextResponse.json(
      { message: "Failed to fetch inventory items" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createInventoryItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const item = await createInventoryItemService(parsed.data);

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("already exists"))) {
      console.error("Create inventory item error:", error);
    }
    return inventoryErrorResponse(error);
  }
}
