import { NextResponse } from "next/server";
import { findZakatAssetById } from "@/features/zakat/repository/zakat.repository";
import { deleteZakatAssetService, updateZakatAssetService } from "@/features/zakat/services/zakat.service";
import { updateZakatAssetSchema } from "@/features/zakat/validations/zakat-asset.schema";
import { getCurrentUser } from "@/lib/auth/current-user";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existingAsset = await findZakatAssetById(assetId);
    if (!existingAsset || existingAsset.userId !== user.id) {
      return NextResponse.json({ message: "Zakat asset not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateZakatAssetSchema.safeParse({
      ...body,
      id: assetId,
      userId: user.id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const asset = await updateZakatAssetService(assetId, parsed.data);
    return NextResponse.json(asset);
  } catch (error) {
    console.error("Update zakat asset error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update zakat asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existingAsset = await findZakatAssetById(assetId);
    if (!existingAsset || existingAsset.userId !== user.id) {
      return NextResponse.json({ message: "Zakat asset not found" }, { status: 404 });
    }

    await deleteZakatAssetService(assetId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete zakat asset error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to delete zakat asset" },
      { status: 500 }
    );
  }
}
