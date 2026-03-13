import type { DashboardMetric, InventoryPrediction } from "@/features/dashboard/services/dashboard.service";

export function currencyFormatter(currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  });
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString();
}

export function toneClasses(tone: DashboardMetric["tone"]) {
  if (tone === "positive") return "text-emerald-600 dark:text-emerald-300";
  if (tone === "negative") return "text-rose-600 dark:text-rose-300";
  if (tone === "warning") return "text-amber-600 dark:text-amber-300";
  return "text-slate-600 dark:text-slate-300";
}

export function statusPill(status: InventoryPrediction["stockStatus"] | "critical" | "warning" | "healthy") {
  if (status === "critical" || status === "out") {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-400/20";
  }

  if (status === "warning" || status === "low") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/20";
  }

  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/20";
}

export function chartPath(values: number[], width: number, height: number) {
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
