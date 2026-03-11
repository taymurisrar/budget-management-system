import "server-only";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

type DashboardMetric = {
  label: string;
  value: number;
  changeLabel: string;
  tone: "neutral" | "positive" | "negative" | "warning";
};

type TrendPoint = {
  label: string;
  income: number;
  expense: number;
  net: number;
};

type BudgetReport = {
  id: string;
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  utilization: number;
  status: "healthy" | "warning" | "critical";
};

type TransactionRow = {
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

type InventoryRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentQuantity: number;
  minQuantity: number;
  estimatedDaysRemaining: number | null;
  estimatedDailyUsage: number | null;
  nextRestockDate: string | null;
  expiryDate: string | null;
  stockStatus: "healthy" | "low" | "out";
  inventoryValue: number;
};

type InventoryPrediction = {
  id: string;
  name: string;
  category: string;
  stockStatus: "healthy" | "low" | "out";
  daysRemaining: number | null;
  suggestedRestockDate: string | null;
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
  trends: TrendPoint[];
  budgetReports: BudgetReport[];
  transactions: TransactionRow[];
  inventoryItems: InventoryRow[];
  inventoryPredictions: InventoryPrediction[];
};

const monthLabel = new Intl.DateTimeFormat("en", {
  month: "short",
});

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toNumber(value: unknown) {
  if (value == null) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
    trends: [],
    budgetReports: [],
    transactions: [],
    inventoryItems: [],
    inventoryPredictions: [],
  };
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      baseCurrencyCode: true,
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

  const [accounts, transactions, budgets, inventoryItems] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; balance: Prisma.Decimal | number | null }>>(Prisma.sql`
      SELECT
        "id",
        "balance"
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
        baseAmount: true,
        transactionDate: true,
        merchant: true,
        note: true,
        account: {
          select: {
            name: true,
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

  const netWorth = accounts.reduce((sum, account) => sum + toNumber(account.balance), 0);
  const postedTransactions = transactions.filter(
    (transaction) => !["cancelled", "failed"].includes(transaction.status)
  );
  const currentMonthTransactions = postedTransactions.filter(
    (transaction) => transaction.transactionDate >= startOfMonth
  );

  const monthIncome = currentMonthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce(
      (sum, transaction) => sum + toNumber(transaction.baseAmount ?? transaction.amount),
      0
    );
  const monthExpense = currentMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce(
      (sum, transaction) => sum + toNumber(transaction.baseAmount ?? transaction.amount),
      0
    );
  const monthNet = monthIncome - monthExpense;

  const totalBudgeted = budgets.reduce((sum, budget) => sum + toNumber(budget.amount), 0);
  const spentByCategory = new Map<string, number>();

  for (const transaction of currentMonthTransactions) {
    if (transaction.type !== "expense" || !transaction.category?.name) {
      continue;
    }

    const key = transaction.category.name;
    spentByCategory.set(
      key,
      (spentByCategory.get(key) ?? 0) + toNumber(transaction.baseAmount ?? transaction.amount)
    );
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

    const amount = toNumber(transaction.baseAmount ?? transaction.amount);
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
    const minQuantity = toNumber(item.minQuantity);
    const estimatedDailyUsage = item.estimatedDailyUsage ? toNumber(item.estimatedDailyUsage) : null;
    const estimatedDaysRemaining =
      item.estimatedDaysRemaining ??
      (estimatedDailyUsage && estimatedDailyUsage > 0
        ? Math.floor(currentQuantity / estimatedDailyUsage)
        : null);
    const unitCost = toNumber(item.lastUnitCost ?? item.averageUnitCost);
    const inventoryValue = unitCost > 0 ? currentQuantity * unitCost : 0;

    let stockStatus: InventoryRow["stockStatus"] = "healthy";
    if (currentQuantity <= 0) {
      stockStatus = "out";
    } else if (currentQuantity <= minQuantity) {
      stockStatus = "low";
    }

    return {
      id: item.id,
      name: item.name,
      category: item.category.name,
      unit: item.unit,
      currentQuantity: round(currentQuantity),
      minQuantity: round(minQuantity),
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

  const dayOfMonth = now.getDate();
  const daysInMonth = endOfMonth.getDate();
  const projectedIncome = dayOfMonth > 0 ? (monthIncome / dayOfMonth) * daysInMonth : 0;
  const projectedExpense = dayOfMonth > 0 ? (monthExpense / dayOfMonth) * daysInMonth : 0;

  const budgetUsage = totalBudgeted > 0 ? (monthExpense / totalBudgeted) * 100 : 0;
  const cashflowTone: DashboardMetric["tone"] =
    monthNet > 0 ? "positive" : monthNet < 0 ? "negative" : "neutral";

  return {
    generatedAt: now.toISOString(),
    user: {
      name: user.name,
      currencyCode: user.baseCurrencyCode,
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
    trends: trendSeries,
    budgetReports,
    transactions: postedTransactions.slice(0, 150).map((transaction) => ({
      id: transaction.id,
      date: transaction.transactionDate.toISOString(),
      type: transaction.type,
      amount: round(toNumber(transaction.baseAmount ?? transaction.amount)),
      status: transaction.status,
      category: transaction.category?.name ?? "Uncategorized",
      account: transaction.account.name,
      merchant: transaction.merchant ?? "Direct",
      note: transaction.note ?? "",
    })),
    inventoryItems: inventoryRows,
    inventoryPredictions,
  };
}
