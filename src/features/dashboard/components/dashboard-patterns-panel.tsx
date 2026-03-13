import type { DashboardPattern } from "@/features/dashboard/services/dashboard.service";
import { toneClasses } from "@/features/dashboard/components/dashboard-helpers";

type DashboardPatternsPanelProps = {
  patterns: DashboardPattern[];
};

export function DashboardPatternsPanel({ patterns }: DashboardPatternsPanelProps) {
  return (
    <section className="rounded-[28px] border border-slate-200/70 bg-white/85 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
        Patterns
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
        What changed recently
      </h2>

      <div className="mt-6 grid gap-3">
        {patterns.map((pattern) => (
          <article
            key={pattern.label}
            className="rounded-[20px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-950/30"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{pattern.label}</p>
              <p className={`text-sm font-semibold ${toneClasses(pattern.tone)}`}>{pattern.value}</p>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{pattern.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
