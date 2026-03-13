import type { DashboardMetric } from "@/features/dashboard/services/dashboard.service";
import { toneClasses } from "@/features/dashboard/components/dashboard-helpers";

type DashboardMetricGridProps = {
  metrics: DashboardMetric[];
  formatter: Intl.NumberFormat;
};

export function DashboardMetricGrid({ metrics, formatter }: DashboardMetricGridProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className="rounded-[24px] border border-slate-200/70 bg-white/85 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">{metric.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
            {metric.label === "Budget usage"
              ? `${metric.value.toFixed(0)}%`
              : metric.label === "Inventory risk"
                ? metric.value
                : formatter.format(metric.value)}
          </p>
          <p className={`mt-2 text-sm ${toneClasses(metric.tone)}`}>{metric.changeLabel}</p>
        </article>
      ))}
    </section>
  );
}
