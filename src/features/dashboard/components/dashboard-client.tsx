"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import type { DashboardAnalytics } from "@/features/dashboard/services/dashboard.service";

type DashboardClientProps = {
  initialData: DashboardAnalytics;
};

type RangeFilter = "7d" | "30d" | "90d" | "180d";
type TransactionTypeFilter = "all" | "income" | "expense" | "transfer";
type TransactionSort = "latest" | "largest" | "smallest";
type InventorySort = "risk" | "days" | "value";

const rangeDays: Record<RangeFilter, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
};

function currencyFormatter(currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  });
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function toneClasses(tone: "neutral" | "positive" | "negative" | "warning") {
  if (tone === "positive") {
    return "text-emerald-600 dark:text-emerald-300";
  }

  if (tone === "negative") {
    return "text-rose-600 dark:text-rose-300";
  }

  if (tone === "warning") {
    return "text-amber-600 dark:text-amber-300";
  }

  return "text-slate-600 dark:text-slate-300";
}

function chartPath(values: number[], width: number, height: number) {
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function statusPill(status: "healthy" | "warning" | "critical" | "out" | "low") {
  if (status === "critical" || status === "out") {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-400/20";
  }

  if (status === "warning" || status === "low") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/20";
  }

  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/20";
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [range, setRange] = useState<RangeFilter>("30d");
  const [transactionType, setTransactionType] = useState<TransactionTypeFilter>("all");
  const [transactionSort, setTransactionSort] = useState<TransactionSort>("latest");
  const [inventorySort, setInventorySort] = useState<InventorySort>("risk");

  const deferredRange = useDeferredValue(range);
  const deferredTransactionType = useDeferredValue(transactionType);
  const deferredTransactionSort = useDeferredValue(transactionSort);
  const deferredInventorySort = useDeferredValue(inventorySort);

  const loadDashboard = async () => {
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/dashboard", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const nextData = (await response.json()) as DashboardAnalytics;
      startTransition(() => {
        setData(nextData);
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshDashboard = useEffectEvent(() => {
    void loadDashboard();
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      refreshDashboard();
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const formatter = currencyFormatter(data.user?.currencyCode ?? "USD");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - rangeDays[deferredRange]);

  const filteredTransactions = data.transactions
    .filter((transaction) => new Date(transaction.date) >= cutoff)
    .filter(
      (transaction) =>
        deferredTransactionType === "all" || transaction.type === deferredTransactionType
    );

  if (deferredTransactionSort === "largest") {
    filteredTransactions.sort((left, right) => right.amount - left.amount);
  } else if (deferredTransactionSort === "smallest") {
    filteredTransactions.sort((left, right) => left.amount - right.amount);
  } else {
    filteredTransactions.sort(
      (left, right) => +new Date(right.date) - +new Date(left.date)
    );
  }

  const transactionSummary = filteredTransactions.reduce(
    (summary, transaction) => {
      if (transaction.type === "income") {
        summary.income += transaction.amount;
      } else if (transaction.type === "expense") {
        summary.expense += transaction.amount;
      }

      summary.net = summary.income - summary.expense;
      return summary;
    },
    { income: 0, expense: 0, net: 0 }
  );

  const categories = new Map<
    string,
    { category: string; spend: number; entries: number; avgTicket: number }
  >();

  for (const transaction of filteredTransactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    const row = categories.get(transaction.category) ?? {
      category: transaction.category,
      spend: 0,
      entries: 0,
      avgTicket: 0,
    };

    row.spend += transaction.amount;
    row.entries += 1;
    row.avgTicket = row.spend / row.entries;
    categories.set(transaction.category, row);
  }

  const categoryReport = [...categories.values()]
    .sort((left, right) => right.spend - left.spend)
    .slice(0, 6);

  const sortedInventory = [...data.inventoryItems];
  if (deferredInventorySort === "value") {
    sortedInventory.sort((left, right) => right.inventoryValue - left.inventoryValue);
  } else if (deferredInventorySort === "days") {
    sortedInventory.sort(
      (left, right) =>
        (left.estimatedDaysRemaining ?? Number.MAX_SAFE_INTEGER) -
        (right.estimatedDaysRemaining ?? Number.MAX_SAFE_INTEGER)
    );
  } else {
    sortedInventory.sort((left, right) => {
      const leftRank = left.stockStatus === "out" ? 0 : left.stockStatus === "low" ? 1 : 2;
      const rightRank = right.stockStatus === "out" ? 0 : right.stockStatus === "low" ? 1 : 2;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return (
        (left.estimatedDaysRemaining ?? Number.MAX_SAFE_INTEGER) -
        (right.estimatedDaysRemaining ?? Number.MAX_SAFE_INTEGER)
      );
    });
  }

  const trendValues = data.trends.flatMap((trend) => [trend.income, trend.expense]);

  return (
    <div className="app-shell py-8">
      <div className="relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.15),_transparent_34%),linear-gradient(135deg,_rgba(255,255,255,0.95),_rgba(241,245,249,0.88))] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-slate-700/60 dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_34%),linear-gradient(135deg,_rgba(15,23,42,0.94),_rgba(15,23,42,0.82))]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700 dark:text-sky-300">
              Live Finance + Inventory Control
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
              Personal operating dashboard for cashflow, stock health, and forward risk.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Built around your actual transactions, budgets, and inventory records. Refreshes every
              30 seconds and keeps the key financial and household signals in one place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-950 px-5 py-4 text-white shadow-lg dark:bg-white dark:text-slate-950">
              <p className="text-xs uppercase tracking-[0.24em] text-white/65 dark:text-slate-500">
                Portfolio net
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatter.format(data.metrics[0]?.value ?? 0)}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/80 px-5 py-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Sync status
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                {isRefreshing ? "Refreshing" : "Live"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {new Date(data.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-4">
        {data.metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-[28px] border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/65"
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
              {metric.label === "Budget usage"
                ? `${metric.value.toFixed(0)}%`
                : metric.label === "Inventory risk"
                ? metric.value
                : formatter.format(metric.value)}
            </p>
            <p className={`mt-2 text-sm ${toneClasses(metric.tone)}`}>{metric.changeLabel}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <section className="rounded-[30px] border border-slate-200/70 bg-white/85 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
                Trends
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
                Income vs expense over the last 6 months
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[26px] bg-slate-950 p-5 text-white dark:bg-slate-950">
              <svg viewBox="0 0 560 240" className="h-60 w-full">
                <defs>
                  <linearGradient id="incomeArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(16,185,129,0.55)" />
                    <stop offset="100%" stopColor="rgba(16,185,129,0.05)" />
                  </linearGradient>
                  <linearGradient id="expenseArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(244,63,94,0.55)" />
                    <stop offset="100%" stopColor="rgba(244,63,94,0.05)" />
                  </linearGradient>
                </defs>

                {[0, 1, 2, 3].map((row) => (
                  <line
                    key={row}
                    x1="0"
                    x2="560"
                    y1={20 + row * 55}
                    y2={20 + row * 55}
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="4 6"
                  />
                ))}

                {data.trends.length > 0 ? (
                  <>
                    <path
                      d={`${chartPath(
                        data.trends.map((trend) => trend.income),
                        560,
                        210
                      )} L 560 240 L 0 240 Z`}
                      fill="url(#incomeArea)"
                    />
                    <path
                      d={`${chartPath(
                        data.trends.map((trend) => trend.expense),
                        560,
                        210
                      )} L 560 240 L 0 240 Z`}
                      fill="url(#expenseArea)"
                    />
                    <path
                      d={chartPath(
                        data.trends.map((trend) => trend.income),
                        560,
                        210
                      )}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <path
                      d={chartPath(
                        data.trends.map((trend) => trend.expense),
                        560,
                        210
                      )}
                      fill="none"
                      stroke="#fb7185"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </>
                ) : null}
              </svg>

              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <span className="inline-flex items-center gap-2 text-emerald-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  Income
                </span>
                <span className="inline-flex items-center gap-2 text-rose-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  Expense
                </span>
                <span className="text-white/60">
                  Peak movement: {compactNumber(Math.max(...trendValues, 0))}
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              {data.trends.map((trend) => (
                <div
                  key={trend.label}
                  className="rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-950/30"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {trend.label}
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        trend.net >= 0
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-rose-600 dark:text-rose-300"
                      }`}
                    >
                      {formatter.format(trend.net)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-400/10">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${(trend.income / Math.max(...trendValues, 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-20 text-right text-xs text-slate-500 dark:text-slate-400">
                      {formatter.format(trend.income)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-end gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-rose-100 dark:bg-rose-400/10">
                      <div
                        className="h-full rounded-full bg-rose-500"
                        style={{
                          width: `${(trend.expense / Math.max(...trendValues, 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-20 text-right text-xs text-slate-500 dark:text-slate-400">
                      {formatter.format(trend.expense)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5">
          <div className="rounded-[30px] border border-slate-200/70 bg-white/85 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
              Projection
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
              End-of-month forecast
            </h2>

            <div className="mt-6 grid gap-4">
              <div className="rounded-[24px] bg-slate-950 px-5 py-4 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-white/60">
                  Projected income
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {formatter.format(data.forecast.projectedIncome)}
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200/70 px-5 py-4 dark:border-slate-700/60">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Projected expense
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {formatter.format(data.forecast.projectedExpense)}
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200/70 px-5 py-4 dark:border-slate-700/60">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Budget headroom
                </p>
                <p
                  className={`mt-2 text-2xl font-semibold ${
                    data.forecast.budgetGap >= 0
                      ? "text-emerald-600 dark:text-emerald-300"
                      : "text-rose-600 dark:text-rose-300"
                  }`}
                >
                  {formatter.format(data.forecast.budgetGap)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200/70 bg-white/85 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
              Inventory prediction
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
              Stock that needs a decision soon
            </h2>

            <div className="mt-6 grid gap-3">
              {data.inventoryPredictions.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No risk signals yet. Add estimated usage or restock dates to improve predictions.
                </p>
              ) : (
                data.inventoryPredictions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-950/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950 dark:text-white">{item.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{item.category}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusPill(item.stockStatus)}`}>
                        {item.stockStatus}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      {item.daysRemaining !== null
                        ? `${item.daysRemaining} days remaining`
                        : item.suggestedRestockDate
                        ? `Restock by ${new Date(item.suggestedRestockDate).toLocaleDateString()}`
                        : "Usage estimate needed"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[30px] border border-slate-200/70 bg-white/85 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
                Reports
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
                Filtered transaction intelligence
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["7d", "30d", "90d", "180d"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRange(option)}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium ${
                    range === option
                      ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                      : "border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200"
                  }`}
                >
                  {option}
                </button>
              ))}

              <select
                value={transactionType}
                onChange={(event) => setTransactionType(event.target.value as TransactionTypeFilter)}
                className="min-w-32 rounded-full px-4 py-2 text-sm"
              >
                <option value="all">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
              </select>

              <select
                value={transactionSort}
                onChange={(event) => setTransactionSort(event.target.value as TransactionSort)}
                className="min-w-32 rounded-full px-4 py-2 text-sm"
              >
                <option value="latest">Latest</option>
                <option value="largest">Largest</option>
                <option value="smallest">Smallest</option>
              </select>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] bg-emerald-50 px-5 py-4 dark:bg-emerald-500/10">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">Income</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900 dark:text-emerald-100">
                {formatter.format(transactionSummary.income)}
              </p>
            </div>
            <div className="rounded-[24px] bg-rose-50 px-5 py-4 dark:bg-rose-500/10">
              <p className="text-sm text-rose-700 dark:text-rose-300">Expense</p>
              <p className="mt-2 text-2xl font-semibold text-rose-900 dark:text-rose-100">
                {formatter.format(transactionSummary.expense)}
              </p>
            </div>
            <div className="rounded-[24px] bg-slate-100 px-5 py-4 dark:bg-slate-800">
              <p className="text-sm text-slate-700 dark:text-slate-300">Net</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                {formatter.format(transactionSummary.net)}
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr className="border-b border-slate-200/70 dark:border-slate-700/60">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Account</th>
                  <th className="pb-3 font-medium">Merchant</th>
                  <th className="pb-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 10).map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-slate-200/60 last:border-b-0 dark:border-slate-800"
                  >
                    <td className="py-3 text-slate-600 dark:text-slate-300">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            transaction.type === "income"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                              : transaction.type === "expense"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100"
                          }`}
                        >
                          {transaction.type}
                        </span>
                        <span className="text-slate-950 dark:text-white">{transaction.category}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{transaction.account}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{transaction.merchant}</td>
                    <td
                      className={`py-3 text-right font-semibold ${
                        transaction.type === "income"
                          ? "text-emerald-600 dark:text-emerald-300"
                          : transaction.type === "expense"
                          ? "text-rose-600 dark:text-rose-300"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {formatter.format(transaction.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-5">
          <div className="rounded-[30px] border border-slate-200/70 bg-white/85 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
              Spend mix
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
              Top expense categories
            </h2>

            <div className="mt-6 grid gap-3">
              {categoryReport.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No expense records inside the selected range.
                </p>
              ) : (
                categoryReport.map((category) => (
                  <div
                    key={category.category}
                    className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-950/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950 dark:text-white">{category.category}</p>
                      <p className="font-semibold text-slate-950 dark:text-white">
                        {formatter.format(category.spend)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                      <span>{category.entries} transactions</span>
                      <span>Avg {formatter.format(category.avgTicket)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200/70 bg-white/85 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
              Budget control
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
              Sorted by utilization pressure
            </h2>

            <div className="mt-6 grid gap-3">
              {data.budgetReports.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Add budgets to start budget-vs-actual monitoring.
                </p>
              ) : (
                data.budgetReports.slice(0, 6).map((budget) => (
                  <div
                    key={budget.id}
                    className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-950/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950 dark:text-white">{budget.category}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusPill(budget.status)}`}>
                        {budget.utilization.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full ${
                          budget.status === "critical"
                            ? "bg-rose-500"
                            : budget.status === "warning"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(budget.utilization, 100)}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                      <span>{formatter.format(budget.spent)} spent</span>
                      <span>{formatter.format(budget.remaining)} left</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-[30px] border border-slate-200/70 bg-white/85 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
              Inventory report
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
              Sort stock by risk, days remaining, or inventory value
            </h2>
          </div>

          <select
            value={inventorySort}
            onChange={(event) => setInventorySort(event.target.value as InventorySort)}
            className="min-w-44 rounded-full px-4 py-2 text-sm"
          >
            <option value="risk">Sort by risk</option>
            <option value="days">Sort by days remaining</option>
            <option value="value">Sort by value</option>
          </select>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500 dark:text-slate-400">
              <tr className="border-b border-slate-200/70 dark:border-slate-700/60">
                <th className="pb-3 font-medium">Item</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Quantity</th>
                <th className="pb-3 font-medium">Days left</th>
                <th className="pb-3 font-medium">Next restock</th>
                <th className="pb-3 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {sortedInventory.slice(0, 12).map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-200/60 last:border-b-0 dark:border-slate-800"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-950 dark:text-white">{item.name}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPill(item.stockStatus)}`}>
                        {item.stockStatus}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">{item.category}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">
                    {item.currentQuantity} / min {item.minQuantity} {item.unit}
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">
                    {item.estimatedDaysRemaining ?? "N/A"}
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">
                    {item.nextRestockDate
                      ? new Date(item.nextRestockDate).toLocaleDateString()
                      : "Not set"}
                  </td>
                  <td className="py-3 text-right font-semibold text-slate-950 dark:text-white">
                    {item.inventoryValue > 0 ? formatter.format(item.inventoryValue) : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
