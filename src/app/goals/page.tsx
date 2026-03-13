import { ArrowRight, Flag, PiggyBank, Target, TrendingUp } from "lucide-react";

const goalCards = [
  {
    title: "Emergency fund",
    amount: "$8,500",
    progress: 68,
    note: "Target: cover 6 months of core expenses.",
    icon: PiggyBank,
  },
  {
    title: "Debt reduction",
    amount: "$2,300",
    progress: 41,
    note: "Focus on highest-interest balances first.",
    icon: TrendingUp,
  },
  {
    title: "Home upgrade",
    amount: "$1,120",
    progress: 22,
    note: "Reserve funds for furniture and repair work.",
    icon: Flag,
  },
];

export default function GoalsPage() {
  return (
    <div className="app-shell py-8">
      <section className="rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,249,255,0.88))] p-6 shadow-[var(--shadow-md)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(12,74,110,0.45))]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700 dark:text-sky-300">
          Goals
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="page-title">Plan the next financial milestones.</h1>
            <p className="text-muted mt-3 text-sm sm:text-base">
              This page is ready for future goal tracking. For now it gives you a clean structure for savings, payoff, and purchase targets.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
            Add Goal
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {goalCards.map((goal) => {
          const Icon = goal.icon;

          return (
            <article key={goal.title} className="glass-card rounded-[28px] p-5">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {goal.progress}% funded
                </span>
              </div>
              <h2 className="mt-5 text-xl font-semibold">{goal.title}</h2>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{goal.amount}</p>
              <p className="text-muted mt-2 text-sm">{goal.note}</p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-6 soft-card rounded-[28px] p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h2 className="section-title">Advanced goal automation can plug in here next.</h2>
            <p className="text-muted mt-2 text-sm leading-6">
              Suggested next steps: link goals to budgets, auto-assign transfers, and show completion forecasts from account balances.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
