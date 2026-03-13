import { prisma } from "@/lib/prisma";
import type { ExchangeRateLookupInput } from "@/features/transactions/validations/transaction.schema";

type CurrencyApiResponse = {
  date: string;
  [baseCurrency: string]: string | Record<string, number>;
};

function normalizeDate(date: string) {
  return date.slice(0, 10);
}

function getRateFromPayload(
  payload: CurrencyApiResponse,
  baseCurrency: string,
  quoteCurrency: string
) {
  const rates = payload[baseCurrency.toLowerCase()];
  if (!rates || typeof rates !== "object") {
    return null;
  }

  const rate = rates[quoteCurrency.toLowerCase()];
  return typeof rate === "number" && rate > 0 ? rate : null;
}

async function fetchCurrencyApiRate({
  baseCurrency,
  quoteCurrency,
  date,
}: ExchangeRateLookupInput) {
  const normalizedDate = normalizeDate(date);
  const base = baseCurrency.toLowerCase();
  const quote = quoteCurrency.toLowerCase();

  const requestUrls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${normalizedDate}/v1/currencies/${base}.json`,
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base}.json`,
    `https://latest.currency-api.pages.dev/v1/currencies/${base}.json`,
  ];

  for (const endpoint of requestUrls) {
    const response = await fetch(endpoint, {
      next: { revalidate: 60 * 60 },
    });

    if (!response.ok) {
      continue;
    }

    const payload = (await response.json()) as CurrencyApiResponse;
    const rate = getRateFromPayload(payload, base, quote);
    if (!rate) {
      continue;
    }

    return {
      rate,
      rateDate: payload.date,
      source: endpoint.includes("jsdelivr") ? "currency-api-jsdelivr" : "currency-api-pages",
    };
  }

  throw new Error("Exchange rate data was not available for that date");
}

export async function getExchangeRate(input: ExchangeRateLookupInput) {
  if (input.baseCurrency === input.quoteCurrency) {
    return {
      rate: 1,
      rateDate: normalizeDate(input.date),
      source: "same-currency",
      isCached: true,
    };
  }

  const rateDate = normalizeDate(input.date);
  const start = new Date(`${rateDate}T00:00:00.000Z`);
  const end = new Date(`${rateDate}T23:59:59.999Z`);

  const cachedRate = await prisma.exchangeRate.findFirst({
    where: {
      baseCurrency: input.baseCurrency,
      quoteCurrency: input.quoteCurrency,
      rateDate: {
        gte: start,
        lte: end,
      },
    },
    orderBy: {
      fetchedAt: "desc",
    },
  });

  if (cachedRate) {
    return {
      rate: Number(cachedRate.rate),
      rateDate,
      source: cachedRate.source,
      isCached: true,
    };
  }

  const fetchedRate = await fetchCurrencyApiRate(input);

  await prisma.exchangeRate.upsert({
    where: {
      baseCurrency_quoteCurrency_rateDate_source: {
        baseCurrency: input.baseCurrency,
        quoteCurrency: input.quoteCurrency,
        rateDate: new Date(`${fetchedRate.rateDate}T00:00:00.000Z`),
        source: fetchedRate.source,
      },
    },
    update: {
      rate: fetchedRate.rate,
      fetchedAt: new Date(),
    },
    create: {
      baseCurrency: input.baseCurrency,
      quoteCurrency: input.quoteCurrency,
      rateDate: new Date(`${fetchedRate.rateDate}T00:00:00.000Z`),
      rate: fetchedRate.rate,
      source: fetchedRate.source,
    },
  });

  return {
    rate: fetchedRate.rate,
    rateDate: fetchedRate.rateDate,
    source: fetchedRate.source,
    isCached: false,
  };
}
