import { NextResponse } from "next/server";
import { findZakatPaymentById } from "@/features/zakat/repository/zakat.repository";
import { deleteZakatPaymentService, updateZakatPaymentService } from "@/features/zakat/services/zakat.service";
import { updateZakatPaymentSchema } from "@/features/zakat/validations/zakat-asset.schema";
import { getCurrentUser } from "@/lib/auth/current-user";

type RouteContext = {
  params: Promise<{
    paymentId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { paymentId } = await context.params;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payment = await findZakatPaymentById(paymentId);
    if (!payment || payment.userId !== user.id) {
      return NextResponse.json({ message: "Zakat payment not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateZakatPaymentSchema.safeParse({
      ...body,
      id: paymentId,
      userId: user.id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updatedPayment = await updateZakatPaymentService(paymentId, parsed.data, user.baseCurrencyCode);
    return NextResponse.json(updatedPayment);
  } catch (error) {
    console.error("Update zakat payment error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update zakat payment" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { paymentId } = await context.params;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payment = await findZakatPaymentById(paymentId);
    if (!payment || payment.userId !== user.id) {
      return NextResponse.json({ message: "Zakat payment not found" }, { status: 404 });
    }

    await deleteZakatPaymentService(paymentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete zakat payment error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to delete zakat payment" },
      { status: 500 }
    );
  }
}
