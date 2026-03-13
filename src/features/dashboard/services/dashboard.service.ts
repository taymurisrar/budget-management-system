import "server-only";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getExchangeRate } from "@/features/transactions/services/exchange-rates.service";
import {
  getAvailableAmount,
  getEstimatedDaysRemaining,
  getInventoryStatus,
  getTrackingUnit,
} from "@/features/inventory/inventory-metrics";
import { getWeekStartDayIndex } from "@/lib/user-preferences";

export type DashboardMetric = {
  label: string;
  value: number;
  changeLabel: string;
  tone: "neutral" | "positive" | "negative" | "warning";
};

export type TrendPoint = {
  label: string;
  income: number;
  expense: number;
  net: number;
};

export type BudgetReport = {
  id: string;
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  utilization: number;
  status: "healthy" | "warning" | "critical";
};

export type TransactionRow = {
  id: string;
  date: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  status: string;
  category: string;
  account: string;
  merchant: string;
  note: string;
};

export type InventoryRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentQuantity: number;
  inUseQuantity: number | null;
  minQuantity: number;
  reorderQuantity: number | null;
  trackingUnit: string;
  availableAmount: number;
  estimatedDaysRemaining: number | null;
  estimatedDailyUsage: number | null;
  nextRestockDate: string | null;
  expiryDate: string | null;
  stockStatus: "healthy" | "low" | "out";
  inventoryValue: number;
};

export type InventoryPrediction = {
  id: string;
  name: string;
  category: string;
  stockStatus: "healthy" | "low" | "out";
  daysRemaining: number | null;
  suggestedRestockDate: string | null;
};

export type DashboardPattern = {
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "positive" | "negative" | "warning";
};

export type GroceryListItem = {
  id: string;
  name: string;
  category: string;
  status: "healthy" | "low" | "out";
  availableAmount: number;
  minQuantity: number;
  suggestedQuantity: number | null;
  trackingUnit: string;
  estimatedDaysRemaining: number | null;
  nextRestockDate: string | null;
};

export type DashboardAnalytics = {
  generatedAt: string;
  user: {
    name: string;
    currencyCode: string;
  } | null;
  metrics: DashboardMetric[];
  forecast: {
    projectedIncome: number;
    projectedExpense: number;
    projectedNet: number;
    budgetGap: number;
  };
  patterns: DashboardPattern[];
  trends: TrendPoint[];
  budgetReports: BudgetReport[];
  transactions: TransactionRow[];
  inventoryItems: InventoryRow[];
  inventoryPredictions: InventoryPrediction[];
  groceryList: GroceryListItem[];
};

const monthLabel = new Intl.DateTimeFormat("en", {
  month: "short",
});

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getStartOfWeek(date: Date, weekStartsOn: number) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (start.getDay() - weekStartsOn + 7) % 7;
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function toNumber(value: unknown) {
  if (value == null) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function convertCurrencyAmount({
  amount,
  fromCurrency,
  toCurrency,
  date,
  rateCache,
}: {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  date: string;
  rateCache: Map<string, number>;
}) {
  if (!Number.isFinite(amount) || amount === 0) {
    return 0;
  }

  const baseCurrency = fromCurrency.toUpperCase();
  const quoteCurrency = toCurrency.toUpperCase();
  if (baseCurrency === quoteCurrency) {
    return amount;
  }

  const rateDate = date.slice(0, 10);
  const cacheKey = `${baseCurrency}:${quoteCurrency}:${rateDate}`;
  let rate = rateCache.get(cacheKey);

  if (rate == null) {
    const exchangeRate = await getExchangeRate({
      baseCurrency,
      quoteCurrency,
      date: rateDate,
    });
    rate = exchangeRate.rate;
    rateCache.set(cacheKey, rate);
  }

  return amount * rate;
}

function emptyDashboard(): DashboardAnalytics {
  return {
    generatedAt: new Date().toISOString(),
    user: null,
    metrics: [
      {
        label: "Net position",
        value: 0,
        changeLabel: "No account data yet",
        tone: "neutral",
      },
      {
        label: "Monthly cashflow",
        value: 0,
        changeLabel: "No transaction data yet",
        tone: "neutral",
      },
      {
        label: "Budget usage",
        value: 0,
        changeLabel: "No budgets configured",
        tone: "neutral",
      },
      {
        label: "Inventory risk",
        value: 0,
        changeLabel: "No stock records yet",
        tone: "neutral",
      },
    ],
    forecast: {
      projectedIncome: 0,
      projectedExpense: 0,
      projectedNet: 0,
      budgetGap: 0,
    },
    patterns: [],
    trends: [],
    budgetReports: [],
    transactions: [],
    inventoryItems: [],
    inventoryPredictions: [],
    groceryList: [],
  };
}

export async function getDashboardAnalytics(userId: string): Promise<DashboardAnalytics> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      baseCurrencyCode: true,
      timezone: true,
      settings: {
        select: {
          weekStartsOn: true,
        },
      },
    },
  });

  if (!user) {
    return emptyDashboard();
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const transactionWindowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const expiringSoonCutoff = new Date(now);
  expiringSoonCutoff.setDate(expiringSoonCutoff.getDate() + 30);
  const restockSoonCutoff = new Date(now);
  restockSoonCutoff.setDate(restockSoonCutoff.getDate() + 7);
  const weekStartDayIndex = getWeekStartDayIndex(user.settings?.weekStartsOn ?? "monday");
  const currentWeekStart = getStartOfWeek(now, weekStartDayIndex);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  const [accounts, transactions, budgets, inventoryItems] = await Promise.all([
    prisma.$queryRaw<
      Array<{ id: string; balance: Prisma.Decimal | number | null; currencyCode: string }>
    >(Prisma.sql`
      SELECT
        "id",
        "balance",
        "currencyCode"
      FROM "Account"
      WHERE "userId" = ${user.id}
    `),
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        transactionDate: {
          gte: transactionWindowStart,
        },
      },
      orderBy: {
        transactionDate: "desc",
      },
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        currencyCode: true,
        transactionDate: true,
        merchant: true,
        note: true,
        account: {
          select: {
            name: true,
            currencyCode: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.budget.findMany({
      where: {
        userId: user.id,
        year: now.getFullYear(),
        OR: [
          {
            period: "monthly",
            month: now.getMonth() + 1,
          },
          {
            period: "quarterly",
            quarter: Math.floor(now.getMonth() / 3) + 1,
          },
          {
            period: "yearly",
          },
        ],
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.inventoryItem.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { updatedAt: "desc" },
        { name: "asc" },
      ],
    }),
  ]);

  const rateCache = new Map<string, number>();
  const targetCurrencyCode = user.baseCurrencyCode;
  const convertedAccounts = await Promise.all(
    accounts.map(async (account) => ({
      ...account,
      convertedBalance: await convertCurrencyAmount({
        amount: toNumber(account.balance),
        fromCurrency: account.currencyCode,
        toCurrency: targetCurrencyCode,
        date: now.toISOString(),
        rateCache,
      }),
    }))
  );
  const convertedTransactions = await Promise.all(
    transactions.map(async (transaction) => ({
      ...transaction,
      convertedAmount: await convertCurrencyAmount({
        amount: toNumber(transaction.amount),
        fromCurrency: transaction.currencyCode ?? transaction.account.currencyCode,
        toCurrency: targetCurrencyCode,
        date: transaction.transactionDate.toISOString(),
        rateCache,
      }),
    }))
  );

  const netWorth = convertedAccounts.reduce((sum, account) => sum + account.convertedBalance, 0);
  const postedTransactions = convertedTransactions.filter(
    (transaction) => !["cancelled", "failed"].includes(transaction.status)
  );
  const currentMonthTransactions = postedTransactions.filter(
    (transaction) => transaction.transactionDate >= startOfMonth
  );

  const monthIncome = currentMonthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.convertedAmount, 0);
  const monthExpense = currentMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.convertedAmount, 0);
  const monthNet = monthIncome - monthExpense;

  const totalBudgeted = budgets.reduce((sum, budget) => sum + toNumber(budget.amount), 0);
  const spentByCategory = new Map<string, number>();

  for (const transaction of currentMonthTransactions) {
    if (transaction.type !== "expense" || !transaction.category?.name) {
      continue;
    }

    const key = transaction.category.name;
    spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + transaction.convertedAmount);
  }

  const budgetReports: BudgetReport[] = budgets
    .map((budget) => {
      const spent = toNumber(budget.spentAmount) || (spentByCategory.get(budget.category.name) ?? 0);
      const budgeted = toNumber(budget.amount);
      const remaining = budgeted - spent;
      const utilization = budgeted > 0 ? (spent / budgeted) * 100 : 0;

      let status: BudgetReport["status"] = "healthy";
      if (utilization >= 100) {
        status = "critical";
      } else if (utilization >= (budget.alertThresholdPercent ?? 80)) {
        status = "warning";
      }

      return {
        id: budget.id,
        category: budget.category.name,
        budgeted: round(budgeted),
        spent: round(spent),
        remaining: round(remaining),
        utilization: round(utilization),
        status,
      };
    })
    .sort((left, right) => right.utilization - left.utilization);

  const trends = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(trendStart.getFullYear(), trendStart.getMonth() + index, 1);
    return {
      key: getMonthKey(month),
      label: monthLabel.format(month),
      income: 0,
      expense: 0,
      net: 0,
    };
  });

  const trendMap = new Map(trends.map((trend) => [trend.key, trend]));
  for (const transaction of postedTransactions) {
    const key = getMonthKey(transaction.transactionDate);
    const trend = trendMap.get(key);
    if (!trend) {
      continue;
    }

    const amount = transaction.convertedAmount;
    if (transaction.type === "income") {
      trend.income += amount;
    } else if (transaction.type === "expense") {
      trend.expense += amount;
    }
  }

  const trendSeries: TrendPoint[] = trends.map((trend) => ({
    label: trend.label,
    income: round(trend.income),
    expense: round(trend.expense),
    net: round(trend.income - trend.expense),
  }));

  const inventoryRows: InventoryRow[] = inventoryItems.map((item) => {
    const currentQuantity = toNumber(item.currentQuantity);
    const inUseQuantity = item.inUseQuantity == null ? null : toNumber(item.inUseQuantity);
    const minQuantity = toNumber(item.minQuantity);
    const estimatedDailyUsage = item.estimatedDailyUsage ? toNumber(item.estimatedDailyUsage) : null;
    const trackingUnit = getTrackingUnit({
      currentQuantity,
      inUseQuantity,
      minQuantity,
      unit: item.unit,
      unitSizeValue: item.unitSizeValue == null ? null : toNumber(item.unitSizeValue),
      unitSizeUnit: item.unitSizeUnit,
    });
    const availableAmount = getAvailableAmount({
      currentQuantity,
      inUseQuantity,
      minQuantity,
      unit: item.unit,
      unitSizeValue: item.unitSizeValue == null ? null : toNumber(item.unitSizeValue),
      unitSizeUnit: item.unitSizeUnit,
    });
    const estimatedDaysRemaining = item.estimatedDaysRemaining ?? getEstimatedDaysRemaining({
      currentQuantity,
      inUseQuantity,
      minQuantity,
      unit: item.unit,
      unitSizeValue: item.unitSizeValue == null ? null : toNumber(item.unitSizeValue),
      unitSizeUnit: item.unitSizeUnit,
      estimatedDailyUsage,
    });
    const unitCost = toNumber(item.lastUnitCost ?? item.averageUnitCost);
    const inventoryValue = unitCost > 0 ? currentQuantity * unitCost : 0;
    const stockStatus = getInventoryStatus({
      currentQuantity,
      inUseQuantity,
      minQuantity,
      unit: item.unit,
      unitSizeValue: item.unitSizeValue == null ? null : toNumber(item.unitSizeValue),
      unitSizeUnit: item.unitSizeUnit,
    });

    return {
      id: item.id,
      name: item.name,
      category: item.category.name,
      unit: item.unit,
      inUseQuantity,
      currentQuantity: round(currentQuantity),
      minQuantity: round(minQuantity),
      reorderQuantity: item.reorderQuantity == null ? null : round(toNumber(item.reorderQuantity)),
      trackingUnit,
      availableAmount: round(availableAmount),
      estimatedDaysRemaining,
      estimatedDailyUsage,
      nextRestockDate: item.nextRestockDate?.toISOString() ?? null,
      expiryDate: item.expiryDate?.toISOString() ?? null,
      stockStatus,
      inventoryValue: round(inventoryValue),
    };
  });

  const lowStockCount = inventoryRows.filter((item) => item.stockStatus !== "healthy").length;
  const expiringSoonCount = inventoryRows.filter(
    (item) => item.expiryDate && new Date(item.expiryDate) <= expiringSoonCutoff
  ).length;
  const restockSoonCount = inventoryRows.filter(
    (item) => item.nextRestockDate && new Date(item.nextRestockDate) <= restockSoonCutoff
  ).length;

  const inventoryPredictions = inventoryRows
    .filter(
      (item) =>
        item.stockStatus !== "healthy" ||
        item.estimatedDaysRemaining !== null ||
        item.nextRestockDate !== null
    )
    .sort((left, right) => {
      const leftRank = left.stockStatus === "out" ? 0 : left.stockStatus === "low" ? 1 : 2;
      const rightRank = right.stockStatus === "out" ? 0 : right.stockStatus === "low" ? 1 : 2;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return (left.estimatedDaysRemaining ?? Number.MAX_SAFE_INTEGER) -
        (right.estimatedDaysRemaining ?? Number.MAX_SAFE_INTEGER);
    })
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      stockStatus: item.stockStatus,
      daysRemaining: item.estimatedDaysRemaining,
      suggestedRestockDate: item.nextRestockDate,
    }));

  const groceryList = inventoryRows
    .filter((item) => {
      if (item.stockStatus !== "healthy") {
        return true;
      }

      if (item.estimatedDaysRemaining != null && item.estimatedDaysRemaining <= 7) {
        return true;
      }

      return item.nextRestockDate != null && new Date(item.nextRestockDate) <= restockSoonCutoff;
    })
    .sort((left, right) => {
      const leftRank = left.stockStatus === "out" ? 0 : left.stockStatus === "low" ? 1 : 2;
      const rightRank = right.stockStatus === "out" ? 0 : right.stockStatus === "low" ? 1 : 2;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return (
        (left.estimatedDaysRemaining ?? Number.MAX_SAFE_INTEGER) -
        (right.estimatedDaysRemaining ?? Number.MAX_SAFE_INTEGER)
      );
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      status: item.stockStatus,
      availableAmount: item.availableAmount,
      minQuantity: item.minQuantity,
      suggestedQuantity:
        item.reorderQuantity != null
          ? item.reorderQuantity
          : Math.max(round(item.minQuantity - item.availableAmount), 1),
      trackingUnit: item.trackingUnit,
      estimatedDaysRemaining: item.estimatedDaysRemaining,
      nextRestockDate: item.nextRestockDate,
    }));

  const dayOfMonth = now.getDate();
  const daysInMonth = endOfMonth.getDate();
  const projectedIncome = dayOfMonth > 0 ? (monthIncome / dayOfMonth) * daysInMonth : 0;
  const projectedExpense = dayOfMonth > 0 ? (monthExpense / dayOfMonth) * daysInMonth : 0;

  const budgetUsage = totalBudgeted > 0 ? (monthExpense / totalBudgeted) * 100 : 0;
  const cashflowTone: DashboardMetric["tone"] =
    monthNet > 0 ? "positive" : monthNet < 0 ? "negative" : "neutral";
  const currentWeekTransactions = postedTransactions.filter(
    (transaction) => transaction.transactionDate >= currentWeekStart
  );
  const previousWeekTransactions = postedTransactions.filter(
    (transaction) =>
      transaction.transactionDate >= previousWeekStart &&
      transaction.transactionDate < currentWeekStart
  );
  const recentExpense = currentWeekTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.convertedAmount, 0);
  const previousExpense = previousWeekTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.convertedAmount, 0);
  const recentIncome = currentWeekTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.convertedAmount, 0);
  const previousIncome = previousWeekTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.convertedAmount, 0);
  const topExpenseCategory = [...spentByCategory.entries()].sort((left, right) => right[1] - left[1])[0];
  const monthlyRunRate = dayOfMonth > 0 ? monthExpense / dayOfMonth : 0;
  const patterns: DashboardPattern[] = [
    {
      label: "Spending trend",
      value: `${round(percentChange(recentExpense, previousExpense))}%`,
      detail: `This week vs last week (${user.settings?.weekStartsOn ?? "monday"} start)`,
      tone:
        recentExpense < previousExpense ? "positive" : recentExpense > previousExpense ? "warning" : "neutral",
    },
    {
      label: "Income trend",
      value: `${round(percentChange(recentIncome, previousIncome))}%`,
      detail: `This week vs last week (${user.settings?.weekStartsOn ?? "monday"} start)`,
      tone:
        recentIncome > previousIncome ? "positive" : recentIncome < previousIncome ? "warning" : "neutral",
    },
    {
      label: "Top spend category",
      value: topExpenseCategory?.[0] ?? "No data",
      detail: topExpenseCategory ? `${round(topExpenseCategory[1])} spent this month` : "No expense activity this month",
      tone: topExpenseCategory ? "warning" : "neutral",
    },
    {
      label: "Restock pressure",
      value: `${groceryList.length} items`,
      detail: `${restockSoonCount} need attention in the next 7 days`,
      tone: groceryList.length > 0 ? "warning" : "positive",
    },
    {
      label: "Budget pressure",
      value: `${budgetReports.filter((budget) => budget.status !== "healthy").length} budgets`,
      detail: `${budgetReports.filter((budget) => budget.status === "critical").length} already over limit`,
      tone:
        budgetReports.some((budget) => budget.status === "critical")
          ? "negative"
          : budgetReports.some((budget) => budget.status === "warning")
            ? "warning"
            : "positive",
    },
    {
      label: "Daily burn rate",
      value: round(monthlyRunRate).toString(),
      detail: "Average expense per day this month",
      tone: monthlyRunRate > 0 ? "neutral" : "positive",
    },
  ];

  return {
    generatedAt: now.toISOString(),
    user: {
      name: user.name,
      currencyCode: targetCurrencyCode,
    },
    metrics: [
      {
        label: "Net position",
        value: round(netWorth),
        changeLabel: `${accounts.length} accounts tracked`,
        tone: netWorth >= 0 ? "positive" : "negative",
      },
      {
        label: "Monthly cashflow",
        value: round(monthNet),
        changeLabel: `${round(monthIncome)} in / ${round(monthExpense)} out`,
        tone: cashflowTone,
      },
      {
        label: "Budget usage",
        value: round(budgetUsage),
        changeLabel: `${budgetReports.filter((budget) => budget.status !== "healthy").length} budgets need attention`,
        tone: budgetUsage >= 100 ? "negative" : budgetUsage >= 80 ? "warning" : "positive",
      },
      {
        label: "Inventory risk",
        value: lowStockCount,
        changeLabel: `${expiringSoonCount} expiring in 30 days`,
        tone: lowStockCount > 0 || expiringSoonCount > 0 ? "warning" : "positive",
      },
    ],
    forecast: {
      projectedIncome: round(projectedIncome),
      projectedExpense: round(projectedExpense),
      projectedNet: round(projectedIncome - projectedExpense),
      budgetGap: round(totalBudgeted - projectedExpense),
    },
    patterns,
    trends: trendSeries,
    budgetReports,
    transactions: postedTransactions.slice(0, 150).map((transaction) => ({
      id: transaction.id,
      date: transaction.transactionDate.toISOString(),
      type: transaction.type,
      amount: round(transaction.convertedAmount),
      status: transaction.status,
      category: transaction.category?.name ?? "Uncategorized",
      account: transaction.account.name,
      merchant: transaction.merchant ?? "Direct",
      note: transaction.note ?? "",
    })),
    inventoryItems: inventoryRows,
    inventoryPredictions,
    groceryList,
  };
}
