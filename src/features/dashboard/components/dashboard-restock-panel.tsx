import type { GroceryListItem, InventoryPrediction } from "@/features/dashboard/services/dashboard.service";
import { formatDate, statusPill } from "@/features/dashboard/components/dashboard-helpers";

type DashboardRestockPanelProps = {
  groceryList: GroceryListItem[];
  inventoryPredictions: InventoryPrediction[];
  onDownload: () => void;
};

export function DashboardRestockPanel({
  groceryList,
  inventoryPredictions,
  onDownload,
}: DashboardRestockPanelProps) {
  return (
    <section className="rounded-[28px] border border-slate-200/70 bg-white/85 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
            Grocery list
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
            Restock items that need action
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Download the current list for shopping or sharing.
          </p>
        </div>

        <button
          type="button"
          onClick={onDownload}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-950"
        >
          Download Grocery List
        </button>
      </div>

      <div className="mt-6 grid gap-3">
        {groceryList.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No restock items right now.</p>
        ) : (
          groceryList.map((item) => (
            <article
              key={item.id}
              className="rounded-[20px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-950/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-950 dark:text-white">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.category}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusPill(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                <span>
                  Remaining: {item.availableAmount} {item.trackingUnit}
                </span>
                <span>
                  Minimum: {item.minQuantity} {item.trackingUnit}
                </span>
                <span>
                  Buy: {item.suggestedQuantity ?? "TBD"} {item.trackingUnit}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {item.estimatedDaysRemaining != null
                  ? `${item.estimatedDaysRemaining} days remaining`
                  : `Restock by ${formatDate(item.nextRestockDate)}`}
              </p>
            </article>
          ))
        )}
      </div>

      <div className="mt-6 border-t border-slate-200/70 pt-6 dark:border-slate-700/60">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">Risk snapshot</p>
        <div className="mt-3 grid gap-3">
          {inventoryPredictions.slice(0, 4).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-[18px] bg-slate-50 px-4 py-3 dark:bg-slate-950/30">
              <div>
                <p className="text-sm font-medium text-slate-950 dark:text-white">{item.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {item.daysRemaining != null ? `${item.daysRemaining} days left` : formatDate(item.suggestedRestockDate)}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusPill(item.stockStatus)}`}>
                {item.stockStatus}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
