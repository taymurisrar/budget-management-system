"use client";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { UpdateInventoryItemInput } from "@/features/inventory/validations/inventory-item.schema";
import { inventoryUnits, updateInventoryItemSchema } from "@/features/inventory/validations/inventory-item.schema";

type InventoryCategoryOption = {
  id: string;
  name: string;
  iconKey: string | null;
};

type InventoryItemRecord = {
  id: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  brand: string | null;
  unit: string;
  currentQuantity: number;
  minQuantity: number;
  reorderQuantity: number | null;
  preferredCurrencyCode: string;
  averageUnitCost: number | null;
  estimatedDailyUsage: number | null;
  estimatedDaysRemaining: number | null;
  nextRestockDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  iconKey: string | null;
  updatedAt: string;
  createdAt: string;
};

type SortOption =
  | "risk"
  | "updated_desc"
  | "updated_asc"
  | "name_asc"
  | "name_desc"
  | "category_asc"
  | "stock_desc"
  | "stock_asc";

type StatusFilter = "all" | "healthy" | "low" | "out";

type ApiErrorResponse = {
  message: string;
  errors?: unknown;
};

type EditFormState = UpdateInventoryItemInput;

const inventoryIconOptions = [
  "toothbrush",
  "shampoo",
  "soap",
  "spray",
  "basket",
  "pill",
  "cat",
  "rice",
  "bottle",
  "box",
];

function getStatus(item: InventoryItemRecord): Exclude<StatusFilter, "all"> {
  if (item.currentQuantity <= 0) return "out";
  if (item.currentQuantity <= item.minQuantity) return "low";
  return "healthy";
}

function statusClass(status: Exclude<StatusFilter, "all">) {
  if (status === "out") return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300";
  if (status === "low") return "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
}

function formatNumber(value: number | null | undefined, digits = 3) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return Number(value).toFixed(digits).replace(/\.?0+$/, "");
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function emptyForm(categoryId = ""): EditFormState {
  return {
    categoryId,
    name: "",
    brand: "",
    unit: "piece",
    currentQuantity: 0,
    minQuantity: 0,
    reorderQuantity: undefined,
    preferredCurrencyCode: "QAR",
    averageUnitCost: undefined,
    estimatedDailyUsage: undefined,
    notes: "",
    iconKey: "",
  };
}

function itemToForm(item: InventoryItemRecord): EditFormState {
  return {
    categoryId: item.categoryId,
    name: item.name,
    brand: item.brand ?? "",
    unit: item.unit as EditFormState["unit"],
    currentQuantity: item.currentQuantity,
    minQuantity: item.minQuantity,
    reorderQuantity: item.reorderQuantity ?? undefined,
    preferredCurrencyCode: item.preferredCurrencyCode,
    averageUnitCost: item.averageUnitCost ?? undefined,
    estimatedDailyUsage: item.estimatedDailyUsage ?? undefined,
    notes: item.notes ?? "",
    iconKey: item.iconKey ?? "",
  };
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return !!value && typeof value === "object" && "message" in value;
}

export default function InventoryManagementClient({
  initialItems,
  categories,
}: {
  initialItems: InventoryItemRecord[];
  categories: InventoryCategoryOption[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("risk");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [formData, setFormData] = useState<EditFormState>(
    emptyForm(categories[0]?.id ?? "")
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  useEffect(() => {
    if (selectedItem) {
      setFormData(itemToForm(selectedItem));
      setFieldErrors({});
      return;
    }

    setFormData(emptyForm(categories[0]?.id ?? ""));
  }, [categories, selectedItem]);

  const categoryCounts = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        count: items.filter((item) => item.categoryId === category.id).length,
      })),
    [categories, items]
  );

  const filteredItems = useMemo(() => {
    const nextItems = items.filter((item) => {
      const status = getStatus(item);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesCategory = categoryFilter === "all" || item.categoryId === categoryFilter;
      const haystack = [
        item.name,
        item.categoryName,
        item.brand ?? "",
        item.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = deferredSearch.length === 0 || haystack.includes(deferredSearch);

      return matchesStatus && matchesCategory && matchesSearch;
    });

    nextItems.sort((left, right) => {
      switch (sortBy) {
        case "updated_desc":
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        case "updated_asc":
          return new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
        case "name_asc":
          return left.name.localeCompare(right.name);
        case "name_desc":
          return right.name.localeCompare(left.name);
        case "category_asc":
          return left.categoryName.localeCompare(right.categoryName) || left.name.localeCompare(right.name);
        case "stock_desc":
          return right.currentQuantity - left.currentQuantity;
        case "stock_asc":
          return left.currentQuantity - right.currentQuantity;
        case "risk":
        default:
          return (left.currentQuantity - left.minQuantity) - (right.currentQuantity - right.minQuantity);
      }
    });

    return nextItems;
  }, [categoryFilter, deferredSearch, items, sortBy, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, deferredSearch, pageSize, sortBy, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const refreshRoute = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const openItem = (item: InventoryItemRecord, edit = false) => {
    setSelectedItemId(item.id);
    setIsEditing(edit);
    setServerError("");
  };

  const closeModal = () => {
    setSelectedItemId(null);
    setIsEditing(false);
    setServerError("");
    setFieldErrors({});
  };

  const updateFormValue = <K extends keyof EditFormState>(
    key: K,
    value: EditFormState[K]
  ) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const saveChanges = async () => {
    if (!selectedItem) return;

    const parsed = updateInventoryItemSchema.safeParse({
      ...formData,
      preferredCurrencyCode: formData.preferredCurrencyCode.toUpperCase(),
      brand: formData.brand?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
      iconKey: formData.iconKey?.trim() || undefined,
    });

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    setServerError("");

    const response = await fetch(`/api/inventory/items/${selectedItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data satisfies UpdateInventoryItemInput),
    });

    let result: unknown = null;
    try {
      result = await response.json();
    } catch {}

    if (!response.ok) {
      setServerError(
        isApiErrorResponse(result) ? result.message : "Failed to update inventory item"
      );
      return;
    }

    const updatedItem = result as {
      id: string;
      userId: string;
      categoryId: string;
      name: string;
      brand: string | null;
      unit: string;
      currentQuantity: number | string;
      minQuantity: number | string;
      reorderQuantity: number | string | null;
      preferredCurrencyCode: string;
      averageUnitCost: number | string | null;
      estimatedDailyUsage: number | string | null;
      estimatedDaysRemaining: number | null;
      nextRestockDate: string | null;
      expiryDate: string | null;
      notes: string | null;
      iconKey: string | null;
      updatedAt: string;
      createdAt: string;
      category: { name: string };
    };

    const normalized: InventoryItemRecord = {
      id: updatedItem.id,
      userId: updatedItem.userId,
      categoryId: updatedItem.categoryId,
      categoryName: updatedItem.category.name,
      name: updatedItem.name,
      brand: updatedItem.brand,
      unit: updatedItem.unit,
      currentQuantity: Number(updatedItem.currentQuantity),
      minQuantity: Number(updatedItem.minQuantity),
      reorderQuantity:
        updatedItem.reorderQuantity == null ? null : Number(updatedItem.reorderQuantity),
      preferredCurrencyCode: updatedItem.preferredCurrencyCode,
      averageUnitCost:
        updatedItem.averageUnitCost == null ? null : Number(updatedItem.averageUnitCost),
      estimatedDailyUsage:
        updatedItem.estimatedDailyUsage == null ? null : Number(updatedItem.estimatedDailyUsage),
      estimatedDaysRemaining: updatedItem.estimatedDaysRemaining,
      nextRestockDate: updatedItem.nextRestockDate,
      expiryDate: updatedItem.expiryDate,
      notes: updatedItem.notes,
      iconKey: updatedItem.iconKey,
      updatedAt: updatedItem.updatedAt,
      createdAt: updatedItem.createdAt,
    };

    setItems((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
    setSelectedItemId(normalized.id);
    setIsEditing(false);
    refreshRoute();
  };

  const deleteItem = async () => {
    if (!selectedItem) return;
    if (!window.confirm(`Delete "${selectedItem.name}"? This cannot be undone.`)) return;

    setIsDeleting(true);
    setServerError("");

    try {
      const response = await fetch(`/api/inventory/items/${selectedItem.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let result: unknown = null;
        try {
          result = await response.json();
        } catch {}

        setServerError(
          isApiErrorResponse(result) ? result.message : "Failed to delete inventory item"
        );
        return;
      }

      setItems((current) => current.filter((item) => item.id !== selectedItem.id));
      closeModal();
      refreshRoute();
    } finally {
      setIsDeleting(false);
    }
  };

  const healthyCount = items.filter((item) => getStatus(item) === "healthy").length;
  const lowCount = items.filter((item) => getStatus(item) === "low").length;
  const outCount = items.filter((item) => getStatus(item) === "out").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="soft-card rounded-[28px] p-5"><p className="text-sm text-slate-500">Tracked items</p><p className="mt-3 text-3xl font-semibold">{items.length}</p></div>
        <div className="soft-card rounded-[28px] p-5"><p className="text-sm text-slate-500">Categories</p><p className="mt-3 text-3xl font-semibold">{categories.length}</p></div>
        <div className="soft-card rounded-[28px] p-5"><p className="text-sm text-slate-500">Low stock</p><p className="mt-3 text-3xl font-semibold">{lowCount}</p></div>
        <div className="soft-card rounded-[28px] p-5"><p className="text-sm text-slate-500">Out of stock</p><p className="mt-3 text-3xl font-semibold">{outCount}</p></div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="border-b border-[var(--border)] px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="section-title">Inventory Records</h2>
              <p className="text-muted mt-1 text-sm">Category chips, filters, sorting, paging, and record popups live here now.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records" className="w-full rounded-2xl border border-[var(--border)] bg-white/70 py-3 pl-11 pr-4 dark:bg-white/5" />
              </label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5">
                <option value="all">All statuses</option>
                <option value="healthy">Healthy</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5">
                <option value="risk">Risk first</option>
                <option value="updated_desc">Recently updated</option>
                <option value="updated_asc">Oldest updated</option>
                <option value="name_asc">Name A-Z</option>
                <option value="name_desc">Name Z-A</option>
                <option value="category_asc">Category A-Z</option>
                <option value="stock_desc">Stock high-low</option>
                <option value="stock_asc">Stock low-high</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setCategoryFilter("all")} className={`rounded-full px-3 py-1.5 text-sm ${categoryFilter === "all" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-black/5 dark:bg-white/5"}`}>All ({items.length})</button>
            {categoryCounts.map((category) => (
              <button type="button" key={category.id} onClick={() => setCategoryFilter(category.id)} className={`rounded-full px-3 py-1.5 text-sm ${categoryFilter === category.id ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"}`}>
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-black/[0.03] text-slate-500 dark:bg-white/[0.03]">
              <tr>
                <th className="px-6 py-4 font-medium">Item</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Stock</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Updated</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length > 0 ? visibleItems.map((item) => {
                const status = getStatus(item);
                return (
                  <tr key={item.id} className="border-t border-[var(--border)] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <button type="button" onClick={() => openItem(item)} className="text-left">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-muted mt-1 text-xs">{item.brand || "No brand"}</p>
                      </button>
                    </td>
                    <td className="px-6 py-4">{item.categoryName}</td>
                    <td className="px-6 py-4">
                      <p>{formatNumber(item.currentQuantity)} {item.unit}</p>
                      <p className="text-muted mt-1 text-xs">Min {formatNumber(item.minQuantity)} {item.unit}</p>
                    </td>
                    <td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(status)}`}>{status === "out" ? "Out of stock" : status === "low" ? "Low stock" : "Healthy"}</span></td>
                    <td className="px-6 py-4">{formatDate(item.updatedAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openItem(item)} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs"><span className="inline-flex items-center gap-2"><Eye className="h-3.5 w-3.5" />Open</span></button>
                        <button type="button" onClick={() => openItem(item, true)} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs"><span className="inline-flex items-center gap-2"><Pencil className="h-3.5 w-3.5" />Edit</span></button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">No inventory records match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[var(--border)] px-6 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-muted text-sm">Showing {filteredItems.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length}. Healthy: {healthyCount}.</p>
            <div className="flex items-center gap-3">
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-2.5 text-sm dark:bg-white/5">
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-2xl border border-[var(--border)] p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm font-medium">Page {page} of {totalPages}</span>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="rounded-2xl border border-[var(--border)] p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </section>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[30px] border border-white/15 bg-[rgba(255,255,255,0.96)] p-6 shadow-[0_28px_100px_rgba(15,23,42,0.35)] backdrop-blur dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Inventory record</p>
                <h3 className="mt-2 text-2xl font-semibold">{selectedItem.name}</h3>
                <p className="text-muted mt-2 text-sm">{selectedItem.categoryName}{selectedItem.brand ? ` | ${selectedItem.brand}` : ""}</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-2xl border border-[var(--border)] p-2.5"><X className="h-4 w-4" /></button>
            </div>

            {serverError ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{serverError}</div> : null}

            {!isEditing ? (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="soft-card rounded-[24px] p-4"><p className="text-sm text-slate-500">Current stock</p><p className="mt-2 text-2xl font-semibold">{formatNumber(selectedItem.currentQuantity)} {selectedItem.unit}</p></div>
                  <div className="soft-card rounded-[24px] p-4"><p className="text-sm text-slate-500">Minimum</p><p className="mt-2 text-2xl font-semibold">{formatNumber(selectedItem.minQuantity)} {selectedItem.unit}</p></div>
                  <div className="soft-card rounded-[24px] p-4"><p className="text-sm text-slate-500">Reorder</p><p className="mt-2 text-2xl font-semibold">{selectedItem.reorderQuantity == null ? "N/A" : `${formatNumber(selectedItem.reorderQuantity)} ${selectedItem.unit}`}</p></div>
                  <div className="soft-card rounded-[24px] p-4"><p className="text-sm text-slate-500">Status</p><div className="mt-3"><span className={`rounded-full px-3 py-1.5 text-sm font-medium ${statusClass(getStatus(selectedItem))}`}>{getStatus(selectedItem) === "out" ? "Out of stock" : getStatus(selectedItem) === "low" ? "Low stock" : "Healthy"}</span></div></div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-[28px] border border-[var(--border)] bg-white/65 p-5 dark:bg-white/5">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Details</h4>
                    <div className="mt-4 space-y-3 text-sm">
                      <p><span className="text-slate-500">Category:</span> {selectedItem.categoryName}</p>
                      <p><span className="text-slate-500">Brand:</span> {selectedItem.brand || "N/A"}</p>
                      <p><span className="text-slate-500">Currency:</span> {selectedItem.preferredCurrencyCode}</p>
                      <p><span className="text-slate-500">Average cost:</span> {selectedItem.averageUnitCost == null ? "N/A" : `${formatNumber(selectedItem.averageUnitCost, 2)} ${selectedItem.preferredCurrencyCode}`}</p>
                      <p><span className="text-slate-500">Daily usage:</span> {selectedItem.estimatedDailyUsage == null ? "N/A" : `${formatNumber(selectedItem.estimatedDailyUsage)} ${selectedItem.unit}`}</p>
                      <p><span className="text-slate-500">Days remaining:</span> {selectedItem.estimatedDaysRemaining ?? "N/A"}</p>
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-[var(--border)] bg-white/65 p-5 dark:bg-white/5">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Timeline</h4>
                    <div className="mt-4 space-y-3 text-sm">
                      <p><span className="text-slate-500">Created:</span> {formatDate(selectedItem.createdAt)}</p>
                      <p><span className="text-slate-500">Updated:</span> {formatDate(selectedItem.updatedAt)}</p>
                      <p><span className="text-slate-500">Next restock:</span> {formatDate(selectedItem.nextRestockDate)}</p>
                      <p><span className="text-slate-500">Expiry:</span> {formatDate(selectedItem.expiryDate)}</p>
                    </div>
                    <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-black/[0.02] p-4 text-sm dark:bg-white/[0.02]">
                      <p className="font-medium">Notes</p>
                      <p className="text-muted mt-2 whitespace-pre-wrap">{selectedItem.notes || "No notes saved for this item."}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={deleteItem} disabled={isDeleting} className="rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 disabled:opacity-50 dark:border-red-500/30 dark:text-red-300"><span className="inline-flex items-center gap-2"><Trash2 className="h-4 w-4" />{isDeleting ? "Deleting..." : "Delete"}</span></button>
                  <button type="button" onClick={() => setIsEditing(true)} className="rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black">Edit record</button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium">Item name</label><input value={formData.name} onChange={(e) => updateFormValue("name", e.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{fieldErrors.name ? <p className="mt-2 text-sm text-red-600">{fieldErrors.name[0]}</p> : null}</div>
                  <div><label className="mb-2 block text-sm font-medium">Category</label><select value={formData.categoryId} onChange={(e) => updateFormValue("categoryId", e.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{fieldErrors.categoryId ? <p className="mt-2 text-sm text-red-600">{fieldErrors.categoryId[0]}</p> : null}</div>
                  <div><label className="mb-2 block text-sm font-medium">Brand</label><input value={formData.brand ?? ""} onChange={(e) => updateFormValue("brand", e.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /></div>
                  <div><label className="mb-2 block text-sm font-medium">Unit</label><select value={formData.unit} onChange={(e) => updateFormValue("unit", e.target.value as EditFormState["unit"])} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5">{inventoryUnits.map((unit) => <option key={unit} value={unit}>{unit.toUpperCase()}</option>)}</select></div>
                  <div><label className="mb-2 block text-sm font-medium">Icon key</label><select value={formData.iconKey ?? ""} onChange={(e) => updateFormValue("iconKey", e.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"><option value="">No icon</option>{inventoryIconOptions.map((icon) => <option key={icon} value={icon}>{icon}</option>)}</select></div>
                  <div><label className="mb-2 block text-sm font-medium">Current quantity</label><input type="number" step="0.001" value={formData.currentQuantity} onChange={(e) => updateFormValue("currentQuantity", Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{fieldErrors.currentQuantity ? <p className="mt-2 text-sm text-red-600">{fieldErrors.currentQuantity[0]}</p> : null}</div>
                  <div><label className="mb-2 block text-sm font-medium">Minimum quantity</label><input type="number" step="0.001" value={formData.minQuantity} onChange={(e) => updateFormValue("minQuantity", Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{fieldErrors.minQuantity ? <p className="mt-2 text-sm text-red-600">{fieldErrors.minQuantity[0]}</p> : null}</div>
                  <div><label className="mb-2 block text-sm font-medium">Reorder quantity</label><input type="number" step="0.001" value={formData.reorderQuantity ?? ""} onChange={(e) => updateFormValue("reorderQuantity", e.target.value === "" ? undefined : Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /></div>
                  <div><label className="mb-2 block text-sm font-medium">Preferred currency</label><input value={formData.preferredCurrencyCode} onChange={(e) => updateFormValue("preferredCurrencyCode", e.target.value.toUpperCase())} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 uppercase dark:bg-white/5" />{fieldErrors.preferredCurrencyCode ? <p className="mt-2 text-sm text-red-600">{fieldErrors.preferredCurrencyCode[0]}</p> : null}</div>
                  <div><label className="mb-2 block text-sm font-medium">Average unit cost</label><input type="number" step="0.001" value={formData.averageUnitCost ?? ""} onChange={(e) => updateFormValue("averageUnitCost", e.target.value === "" ? undefined : Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /></div>
                  <div><label className="mb-2 block text-sm font-medium">Estimated daily usage</label><input type="number" step="0.001" value={formData.estimatedDailyUsage ?? ""} onChange={(e) => updateFormValue("estimatedDailyUsage", e.target.value === "" ? undefined : Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /></div>
                  <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium">Notes</label><textarea value={formData.notes ?? ""} onChange={(e) => updateFormValue("notes", e.target.value)} rows={4} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{fieldErrors.notes ? <p className="mt-2 text-sm text-red-600">{fieldErrors.notes[0]}</p> : null}</div>
                </div>
                <div className="flex flex-wrap justify-between gap-3">
                  <button type="button" onClick={deleteItem} disabled={isDeleting} className="rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 disabled:opacity-50 dark:border-red-500/30 dark:text-red-300">{isDeleting ? "Deleting..." : "Delete"}</button>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setFormData(itemToForm(selectedItem)); setFieldErrors({}); setServerError(""); setIsEditing(false); }} className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium">Cancel</button>
                    <button type="button" onClick={saveChanges} className="rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black">Save changes</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
