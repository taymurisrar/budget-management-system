"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import LocalizedDateText from "@/components/localized-date-text";
import type { DashboardAnalytics } from "@/features/dashboard/services/dashboard.service";
import { DashboardMetricGrid } from "@/features/dashboard/components/dashboard-metric-grid";
import { DashboardPatternsPanel } from "@/features/dashboard/components/dashboard-patterns-panel";
import { DashboardRestockPanel } from "@/features/dashboard/components/dashboard-restock-panel";
import { DashboardTrendsPanel } from "@/features/dashboard/components/dashboard-trends-panel";
import { currencyFormatter, formatDate, statusPill } from "@/features/dashboard/components/dashboard-helpers";

type DashboardClientProps = {
  initialData: DashboardAnalytics;
};

type RangeFilter = "7d" | "30d" | "90d" | "180d";

const rangeDays: Record<RangeFilter, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
};

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [range, setRange] = useState<RangeFilter>("30d");
  const deferredRange = useDeferredValue(range);

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

  const cutoff = useMemo(() => {
    const nextCutoff = new Date();
    nextCutoff.setDate(nextCutoff.getDate() - rangeDays[deferredRange]);
    return nextCutoff;
  }, [deferredRange]);

  const filteredTransactions = useMemo(
    () =>
      data.transactions
        .filter((transaction) => new Date(transaction.date) >= cutoff)
        .sort((left, right) => +new Date(right.date) - +new Date(left.date)),
    [cutoff, data.transactions]
  );

  const transactionSummary = useMemo(
    () =>
      filteredTransactions.reduce(
        (summary, transaction) => {
          if (transaction.type === "income") summary.income += transaction.amount;
          if (transaction.type === "expense") summary.expense += transaction.amount;
          summary.net = summary.income - summary.expense;
          return summary;
        },
        { income: 0, expense: 0, net: 0 }
      ),
    [filteredTransactions]
  );

  const categorySummary = useMemo(() => {
    const categories = new Map<string, number>();

    for (const transaction of filteredTransactions) {
      if (transaction.type !== "expense") continue;
      categories.set(transaction.category, (categories.get(transaction.category) ?? 0) + transaction.amount);
    }

    return [...categories.entries()]
      .map(([category, spend]) => ({ category, spend }))
      .sort((left, right) => right.spend - left.spend)
      .slice(0, 5);
  }, [filteredTransactions]);

  function downloadGroceryList() {
    const rows = [
      ["Item", "Category", "Status", "Remaining", "Minimum", "Suggested Buy", "Days Left", "Restock By"],
      ...data.groceryList.map((item) => [
        item.name,
        item.category,
        item.status,
        `${item.availableAmount} ${item.trackingUnit}`,
        `${item.minQuantity} ${item.trackingUnit}`,
        `${item.suggestedQuantity ?? ""} ${item.trackingUnit}`.trim(),
        item.estimatedDaysRemaining?.toString() ?? "",
        formatDate(item.nextRestockDate),
      ]),
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `grocery-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell py-8">
      <section className="rounded-[28px] border border-slate-200/70 bg-white/90 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
              Real-time money and restock signals
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Focused on what changed, what is drifting, and what needs action next.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] bg-slate-950 px-5 py-4 text-white dark:bg-white dark:text-slate-950">
              <p className="text-xs uppercase tracking-[0.22em] text-white/65 dark:text-slate-500">Live status</p>
              <p className="mt-2 text-lg font-semibold">{isRefreshing ? "Refreshing" : "Auto-refresh every 30s"}</p>
            </div>
            <div className="rounded-[20px] border border-slate-200/70 px-5 py-4 dark:border-slate-700/60">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Forecast net</p>
              <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                {formatter.format(data.forecast.projectedNet)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <DashboardMetricGrid metrics={data.metrics} formatter={formatter} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <DashboardTrendsPanel
          trends={data.trends}
          formatter={formatter}
          generatedAt={data.generatedAt}
          isRefreshing={isRefreshing}
          onRefresh={() => void loadDashboard()}
        />
        <DashboardPatternsPanel patterns={data.patterns} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardRestockPanel
          groceryList={data.groceryList}
          inventoryPredictions={data.inventoryPredictions}
          onDownload={downloadGroceryList}
        />

        <section className="grid gap-5">
          <article className="rounded-[28px] border border-slate-200/70 bg-white/85 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
              Budget pressure
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
              Most stressed budgets
            </h2>

            <div className="mt-5 grid gap-3">
              {data.budgetReports.slice(0, 5).map((budget) => (
                <div
                  key={budget.id}
                  className="rounded-[20px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-950/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-950 dark:text-white">{budget.category}</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusPill(budget.status)}`}>
                      {budget.utilization.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>{formatter.format(budget.spent)} spent</span>
                    <span>{formatter.format(budget.remaining)} left</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200/70 bg-white/85 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
              Range summary
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
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
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] bg-emerald-50 px-4 py-4 dark:bg-emerald-500/10">
                <p className="text-sm text-emerald-700 dark:text-emerald-300">Income</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-900 dark:text-emerald-100">
                  {formatter.format(transactionSummary.income)}
                </p>
              </div>
              <div className="rounded-[18px] bg-rose-50 px-4 py-4 dark:bg-rose-500/10">
                <p className="text-sm text-rose-700 dark:text-rose-300">Expense</p>
                <p className="mt-2 text-2xl font-semibold text-rose-900 dark:text-rose-100">
                  {formatter.format(transactionSummary.expense)}
                </p>
              </div>
              <div className="rounded-[18px] bg-slate-100 px-4 py-4 dark:bg-slate-800">
                <p className="text-sm text-slate-700 dark:text-slate-300">Net</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {formatter.format(transactionSummary.net)}
                </p>
              </div>
            </div>
          </article>
        </section>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] border border-slate-200/70 bg-white/85 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
                Recent activity
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
                Latest transactions
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{filteredTransactions.length} in range</p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr className="border-b border-slate-200/70 dark:border-slate-700/60">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Merchant</th>
                  <th className="pb-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 8).map((transaction) => (
                  <tr key={transaction.id} className="border-b border-slate-200/60 last:border-b-0 dark:border-slate-800">
                    <td className="py-3 text-slate-600 dark:text-slate-300">
                      <LocalizedDateText value={transaction.date} />
                    </td>
                    <td className="py-3 text-slate-950 dark:text-white">{transaction.category}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{transaction.merchant}</td>
                    <td className={`py-3 text-right font-semibold ${transaction.type === "expense" ? "text-rose-600 dark:text-rose-300" : transaction.type === "income" ? "text-emerald-600 dark:text-emerald-300" : "text-slate-700 dark:text-slate-200"}`}>
                      {formatter.format(transaction.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200/70 bg-white/85 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
            Spend mix
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
            Top expense categories
          </h2>

          <div className="mt-5 grid gap-3">
            {categorySummary.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No expense activity in this range.</p>
            ) : (
              categorySummary.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between gap-3 rounded-[20px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-950/30"
                >
                  <p className="font-medium text-slate-950 dark:text-white">{item.category}</p>
                  <p className="font-semibold text-slate-950 dark:text-white">{formatter.format(item.spend)}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
