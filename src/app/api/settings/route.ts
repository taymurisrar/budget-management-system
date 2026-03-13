import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defaultCurrencyCode, isSupportedCurrency } from "@/lib/currencies";

export async function GET() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      baseCurrencyCode: true,
    },
  });

  return NextResponse.json({
    userId: user?.id ?? null,
    baseCurrencyCode: user?.baseCurrencyCode ?? defaultCurrencyCode,
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { baseCurrencyCode?: string };
  const baseCurrencyCode = body.baseCurrencyCode?.toUpperCase() ?? "";

  if (!isSupportedCurrency(baseCurrencyCode)) {
    return NextResponse.json({ message: "Unsupported default currency" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ message: "No user found" }, { status: 404 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { baseCurrencyCode },
    select: {
      id: true,
      baseCurrencyCode: true,
    },
  });

  return NextResponse.json(updatedUser);
}
