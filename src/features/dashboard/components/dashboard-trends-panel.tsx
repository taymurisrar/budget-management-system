import { useEffect, useState } from "react";
import type { TrendPoint } from "@/features/dashboard/services/dashboard.service";
import { chartPath, compactNumber } from "@/features/dashboard/components/dashboard-helpers";
import { formatTimeWithPreferences } from "@/lib/date-formatting";

type DashboardTrendsPanelProps = {
  trends: TrendPoint[];
  formatter: Intl.NumberFormat;
  generatedAt: string;
  isRefreshing: boolean;
  onRefresh: () => void;
};

export function DashboardTrendsPanel({
  trends,
  formatter,
  generatedAt,
  isRefreshing,
  onRefresh,
}: DashboardTrendsPanelProps) {
  const [hydratedTime, setHydratedTime] = useState("");
  const trendValues = trends.flatMap((trend) => [trend.income, trend.expense]);
  const fallbackTime = generatedAt.slice(11, 16);

  useEffect(() => {
    setHydratedTime(formatTimeWithPreferences(generatedAt));
  }, [generatedAt]);

  return (
    <section className="rounded-[28px] border border-slate-200/70 bg-white/85 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
            Live trends
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
            Income and expense direction
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Updates every 30 seconds. Last sync{" "}
            <span suppressHydrationWarning>{hydratedTime || fallbackTime}</span>.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="mt-6 rounded-[24px] bg-slate-950 p-5 text-white">
        <svg viewBox="0 0 560 220" className="h-56 w-full">
          {[0, 1, 2, 3].map((row) => (
            <line
              key={row}
              x1="0"
              x2="560"
              y1={20 + row * 48}
              y2={20 + row * 48}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 6"
            />
          ))}

          {trends.length > 0 ? (
            <>
              <path
                d={chartPath(
                  trends.map((trend) => trend.income),
                  560,
                  200
                )}
                fill="none"
                stroke="#34d399"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d={chartPath(
                  trends.map((trend) => trend.expense),
                  560,
                  200
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
          <span className="text-white/60">Peak movement {compactNumber(Math.max(...trendValues, 0))}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {trends.map((trend) => (
          <div
            key={trend.label}
            className="rounded-[20px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-950/30"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{trend.label}</p>
              <p className={`text-sm font-semibold ${trend.net >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>
                {formatter.format(trend.net)}
              </p>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {formatter.format(trend.income)} in / {formatter.format(trend.expense)} out
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
