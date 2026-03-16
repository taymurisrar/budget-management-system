import { NextResponse } from "next/server";
import { findZakatAssetById } from "@/features/zakat/repository/zakat.repository";
import { createZakatPaymentService } from "@/features/zakat/services/zakat.service";
import { createZakatPaymentSchema } from "@/features/zakat/validations/zakat-asset.schema";
import { getCurrentUser } from "@/lib/auth/current-user";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const asset = await findZakatAssetById(assetId);
    if (!asset || asset.userId !== user.id) {
      return NextResponse.json({ message: "Zakat asset not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createZakatPaymentSchema.safeParse({
      ...body,
      userId: user.id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updatedAsset = await createZakatPaymentService(assetId, parsed.data, user.baseCurrencyCode);
    return NextResponse.json(updatedAsset, { status: 201 });
  } catch (error) {
    console.error("Create zakat payment error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to record zakat payment" },
      { status: 500 }
    );
  }
}
