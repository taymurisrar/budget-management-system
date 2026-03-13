import { NextResponse } from "next/server";
import { getExchangeRate } from "@/features/transactions/services/exchange-rates.service";
import { exchangeRateLookupSchema } from "@/features/transactions/validations/transaction.schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = exchangeRateLookupSchema.safeParse({
      baseCurrency: searchParams.get("baseCurrency"),
      quoteCurrency: searchParams.get("quoteCurrency"),
      date: searchParams.get("date"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const rate = await getExchangeRate(parsed.data);
    return NextResponse.json(rate);
  } catch (error) {
    console.error("Fetch exchange rate error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch exchange rate" },
      { status: 500 }
    );
  }
}
