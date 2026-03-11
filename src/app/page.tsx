import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Boxes,
  CreditCard,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

function toNumber(value: unknown) {
  return value == null ? 0 : Number(value);
}

function formatSignedPercent(value: number) {
  if (!Number.isFinite(value) || value === 0) return "0%";
  const rounded = Math.abs(value) < 10 ? value.toFixed(1) : Math.round(value).toString();
  return `${value > 0 ? "+" : ""}${rounded}%`;
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function differencePercent(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

function daysUntil(date: Date) {
  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default async function HomePage() {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  const thirtyDaysAhead = new Date(now);
  thirtyDaysAhead.setDate(now.getDate() + 30);

  const [
    accounts,
    currentTransactions,
    previousTransactions,
    currentExpenses,
    previousExpenses,
    budgets,
    inventoryItems,
    recentTransactions,
  ] = await Promise.all([
    prisma.$queryRaw<Array<{
      id: string;
      name: string;
      currencyCode: string;
      balance: Prisma.Decimal | number | null;
    }>>(Prisma.sql`
      SELECT
        "id",
        "name",
        "currencyCode",
        "balance"
      FROM "Account"
      ORDER BY "createdAt" DESC
    `),
    prisma.transaction.count({
      where: { transactionDate: { gte: sevenDaysAgo } },
    }),
    prisma.transaction.count({
      where: {
        transactionDate: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
    }),
    prisma.transaction.aggregate({
      where: {
        type: "expense",
        transactionDate: { gte: sevenDaysAgo },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        type: "expense",
        transactionDate: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
      _sum: { amount: true },
    }),
    prisma.budget.findMany({
      select: {
        id: true,
        amount: true,
        spentAmount: true,
        alertThresholdPercent: true,
        note: true,
        category: {
          select: { name: true },
        },
      },
    }),
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        currentQuantity: true,
        minQuantity: true,
        nextRestockDate: true,
        expiryDate: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    prisma.transaction.findMany({
      select: {
        id: true,
        type: true,
        amount: true,
        transactionDate: true,
        merchant: true,
        note: true,
      },
      orderBy: { transactionDate: "desc" },
      take: 4,
    }),
  ]);

  const totalBalance = accounts.reduce((sum, account) => sum + toNumber(account.balance), 0);
  const expenseCurrent = toNumber(currentExpenses._sum.amount);
  const expensePrevious = toNumber(previousExpenses._sum.amount);

  const transactionTrend = differencePercent(currentTransactions, previousTransactions);
  const spendingTrend = differencePercent(expenseCurrent, expensePrevious);

  const lowStockItems = inventoryItems.filter(
    (item) => toNumber(item.currentQuantity) <= toNumber(item.minQuantity),
  );
  const upcomingRestocks = inventoryItems.filter((item) => {
    if (!item.nextRestockDate) return false;
    const days = daysUntil(item.nextRestockDate);
    return days >= 0 && days <= 7;
  });
  const upcomingExpiry = inventoryItems.filter((item) => {
    if (!item.expiryDate) return false;
    const days = daysUntil(item.expiryDate);
    return days >= 0 && days <= 30;
  });

  const stressedBudgets = budgets.filter((budget) => {
    const amount = toNumber(budget.amount);
    if (amount <= 0) return false;
    const spent = toNumber(budget.spentAmount);
    const threshold = budget.alertThresholdPercent ?? 80;
    return (spent / amount) * 100 >= threshold;
  });

  const alerts = [
    ...stressedBudgets.slice(0, 2).map((budget) => ({
      title: `${budget.category.name} budget is under pressure`,
      detail: `${Math.round((toNumber(budget.spentAmount) / Math.max(toNumber(budget.amount), 1)) * 100)}% used`,
      tone: "amber",
    })),
    ...lowStockItems.slice(0, 2).map((item) => ({
      title: `${item.name} is below minimum stock`,
      detail: `${toNumber(item.currentQuantity)} left, minimum ${toNumber(item.minQuantity)}`,
      tone: "red",
    })),
    ...upcomingRestocks.slice(0, 1).map((item) => ({
      title: `${item.name} needs restock soon`,
      detail: `Expected in ${daysUntil(item.nextRestockDate!)} day(s)`,
      tone: "blue",
    })),
    ...upcomingExpiry.slice(0, 1).map((item) => ({
      title: `${item.name} is nearing expiry`,
      detail: `Expires in ${daysUntil(item.expiryDate!)} day(s)`,
      tone: "red",
    })),
  ].slice(0, 4);

  const suggestions = [
    accounts.length === 0
      ? {
          title: "Create your first account",
          detail: "Everything else becomes more useful once balances have a home.",
          href: "/accounts/new",
        }
      : null,
    currentTransactions === 0
      ? {
          title: "Log a few recent transactions",
          detail: "Trend cards stay weak without recent activity.",
          href: "/transactions/new",
        }
      : null,
    stressedBudgets.length > 0
      ? {
          title: "Review budget limits",
          detail: `${stressedBudgets.length} budget ${stressedBudgets.length === 1 ? "is" : "are"} near the warning threshold.`,
          href: "/budgets",
        }
      : null,
    lowStockItems.length > 0
      ? {
          title: "Plan a restock run",
          detail: `${lowStockItems.length} item ${lowStockItems.length === 1 ? "is" : "are"} already below minimum stock.`,
          href: "/inventory",
        }
      : null,
  ]
    .filter((item) => item !== null)
    .slice(0, 3);

  const topAccounts = accounts
    .slice()
    .sort((a, b) => toNumber(b.balance) - toNumber(a.balance))
    .slice(0, 3);

  return (
    <div className="app-shell py-6 sm:py-8">
      <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-slate-950 px-6 py-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.2)] sm:px-8 sm:py-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.24),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.14),transparent_20%)]"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200/80">
              Live overview
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              Today&apos;s money, risks, and next moves.
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
              A shorter home screen with real signal: trend lines, alerts,
              reminders, and suggestions pulled from your actual data.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5"
            >
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/transactions/new"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/12"
            >
              Add Transaction
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">Tracked balance</p>
              <Wallet className="h-4 w-4 text-emerald-300" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
              {formatCompactCurrency(totalBalance)}
            </p>
            <p className="mt-1 text-sm text-slate-400">{accounts.length} account(s)</p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">Transaction trend</p>
              {transactionTrend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-cyan-300" />
              ) : (
                <TrendingDown className="h-4 w-4 text-amber-300" />
              )}
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
              {currentTransactions}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {formatSignedPercent(transactionTrend)} vs previous 7 days
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">Expense pressure</p>
              {spendingTrend <= 0 ? (
                <TrendingDown className="h-4 w-4 text-emerald-300" />
              ) : (
                <TrendingUp className="h-4 w-4 text-rose-300" />
              )}
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
              {formatCompactCurrency(expenseCurrent)}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {formatSignedPercent(spendingTrend)} vs previous 7 days
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Alerts & reminders
              </p>
              <h2 className="section-title mt-2">What needs attention now</h2>
            </div>
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <BellRing className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div
                  key={alert.title}
                  className="flex items-start gap-3 rounded-[22px] border border-slate-200/70 bg-white/75 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40"
                >
                  <div
                    className={`mt-0.5 rounded-2xl p-2 ${
                      alert.tone === "red"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                        : alert.tone === "amber"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                          : "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {alert.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {alert.detail}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                No urgent alerts right now. Your budgets and inventory look stable.
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Suggestions
              </p>
              <h2 className="section-title mt-2">Small actions with high payoff</h2>
            </div>
            <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-700">
              <Lightbulb className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {suggestions.length > 0 ? (
              suggestions.map((suggestion) => (
                <Link
                  key={suggestion.title}
                  href={suggestion.href}
                  className="block rounded-[22px] border border-slate-200/70 bg-white/75 p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/40"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {suggestion.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {suggestion.detail}
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-[22px] border border-slate-200/70 bg-white/75 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                The basics are covered. Add more recent activity to sharpen the trend reading.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="soft-card rounded-[28px] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Key balances
              </p>
              <h2 className="section-title mt-2">Top accounts by tracked value</h2>
            </div>
            <CreditCard className="h-5 w-5 text-slate-500" />
          </div>

          <div className="mt-5 space-y-3">
            {topAccounts.length > 0 ? (
              topAccounts.map((account, index) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-[20px] border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {index + 1}. {account.name}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {account.currencyCode}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {toNumber(account.balance).toFixed(2)}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-[20px] border border-slate-200/70 bg-white/80 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                No accounts yet. Add one to start tracking balances.
              </p>
            )}
          </div>
        </div>

        <div className="soft-card rounded-[28px] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Recent movement
              </p>
              <h2 className="section-title mt-2">Latest transactions and stock signals</h2>
            </div>
            <Boxes className="h-5 w-5 text-slate-500" />
          </div>

          <div className="mt-5 grid gap-3">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between rounded-[20px] border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {transaction.merchant || transaction.note || "Transaction"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {transaction.type} · {transaction.transactionDate.toLocaleDateString()}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {toNumber(transaction.amount).toFixed(2)}
                </p>
              </div>
            ))}

            {recentTransactions.length === 0 && (
              <p className="rounded-[20px] border border-slate-200/70 bg-white/80 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                No recent transactions yet. Add activity to unlock trend reporting.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
