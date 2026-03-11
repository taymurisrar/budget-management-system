import { NextResponse } from "next/server";
import { createInventoryItemSchema } from "@/features/inventory/validations/inventory-item.schema";
import { createInventoryItemService } from "@/features/inventory/services/inventory.service";
import { findAllInventoryItems } from "@/features/inventory/repository/inventory.repository";

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
    console.error("Create inventory item error:", error);

    return NextResponse.json(
      { message: "Something went wrong while creating the inventory item" },
      { status: 500 }
    );
  }
}
