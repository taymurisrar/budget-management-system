import { NextResponse } from "next/server";
import { findAllZakatAssetsByUser } from "@/features/zakat/repository/zakat.repository";
import { createZakatAssetService } from "@/features/zakat/services/zakat.service";
import { createZakatAssetSchema } from "@/features/zakat/validations/zakat-asset.schema";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const assets = await findAllZakatAssetsByUser(user.id);
    return NextResponse.json(assets);
  } catch (error) {
    console.error("Fetch zakat assets error:", error);
    return NextResponse.json({ message: "Failed to fetch zakat assets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createZakatAssetSchema.safeParse({
      ...body,
      userId: user.id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const asset = await createZakatAssetService(parsed.data);
    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("Create zakat asset error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create zakat asset" },
      { status: 500 }
    );
  }
}
