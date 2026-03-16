import { getExchangeRate } from "@/features/transactions/services/exchange-rates.service";
import {
  GOLD_NISAB_GRAMS,
  SILVER_NISAB_GRAMS,
  TROY_OUNCE_IN_GRAMS,
  metalPurityFactors,
  type ZakatMetalPurity,
} from "@/features/zakat/zakat-utils";

type GoldApiResponse = {
  name: string;
  price: number;
  symbol: "XAU" | "XAG";
  updatedAt: string;
};

type MetalType = "gold" | "silver";

export type MetalRateQuote = {
  metalType: MetalType;
  pricePerOunceUsd: number;
  pricePerGram: number;
  priceByPurity: Record<ZakatMetalPurity, number>;
  updatedAt: string;
  source: string;
};

export type ZakatMetalRateDashboard = {
  baseCurrencyCode: string;
  gold: MetalRateQuote;
  silver: MetalRateQuote;
  nisabByMetal: {
    gold: number;
    silver: number;
  };
};

async function fetchMetalQuote(symbol: "XAU" | "XAG") {
  const response = await fetch(`https://api.gold-api.com/price/${symbol}`, {
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch live ${symbol} price`);
  }

  return (await response.json()) as GoldApiResponse;
}

function buildQuote(
  metalType: MetalType,
  payload: GoldApiResponse,
  usdToBaseRate: number
): MetalRateQuote {
  const pricePerGram = Number(((payload.price / TROY_OUNCE_IN_GRAMS) * usdToBaseRate).toFixed(4));
  const priceByPurity = Object.fromEntries(
    Object.entries(metalPurityFactors).map(([purity, factor]) => [
      purity,
      Number((pricePerGram * factor).toFixed(4)),
    ])
  ) as Record<ZakatMetalPurity, number>;

  return {
    metalType,
    pricePerOunceUsd: payload.price,
    pricePerGram,
    priceByPurity,
    updatedAt: payload.updatedAt,
    source: "gold-api.com",
  };
}

export async function getZakatMetalRateDashboard(baseCurrencyCode: string): Promise<ZakatMetalRateDashboard> {
  const today = new Date().toISOString().slice(0, 10);
  const usdToBaseRate =
    baseCurrencyCode === "USD"
      ? 1
      : (
          await getExchangeRate({
            baseCurrency: "USD",
            quoteCurrency: baseCurrencyCode,
            date: today,
          })
        ).rate;

  const [goldPayload, silverPayload] = await Promise.all([
    fetchMetalQuote("XAU"),
    fetchMetalQuote("XAG"),
  ]);

  const gold = buildQuote("gold", goldPayload, usdToBaseRate);
  const silver = buildQuote("silver", silverPayload, usdToBaseRate);

  return {
    baseCurrencyCode,
    gold,
    silver,
    nisabByMetal: {
      gold: Number((gold.priceByPurity.k24 * GOLD_NISAB_GRAMS).toFixed(2)),
      silver: Number((silver.priceByPurity.k24 * SILVER_NISAB_GRAMS).toFixed(2)),
    },
  };
}
