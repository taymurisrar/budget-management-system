"use client";

import { ChevronLeft, ChevronRight, Eye, PackagePlus, Pencil, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import LocalizedDateText from "@/components/localized-date-text";
import ThemedDateInput from "@/components/themed-date-input";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InventoryFieldHelp } from "@/features/inventory/components/inventory-field-help";
import {
  calculateNextRestockDate,
  calculateSuggestedDailyUsage,
  getAvailableAmount,
  getEstimatedDaysRemaining,
  getInventoryStatus,
  getTodayDateInputValue,
  getTrackingUnit,
  toDateInputValue,
  usesSizeTracking,
} from "@/features/inventory/inventory-metrics";
import {
  formatInventoryUnit,
  inventoryIconOptions,
  inventoryUnitGroups,
} from "@/features/inventory/inventory-options";
import type { UpdateInventoryItemInput } from "@/features/inventory/validations/inventory-item.schema";
import { updateInventoryItemSchema } from "@/features/inventory/validations/inventory-item.schema";
import type { RestockInventoryItemInput } from "@/features/inventory/validations/inventory-purchase.schema";
import { restockInventoryItemSchema } from "@/features/inventory/validations/inventory-purchase.schema";

type InventoryCategoryOption = {
  id: string;
  name: string;
  iconKey: string | null;
  subcategories: string[];
};
type InventoryRevisionRecord = {
  id: string;
  revisionType: "created" | "updated" | "restocked";
  name: string;
  brand: string | null;
  unit: string;
  currentQuantity: number;
  inUseQuantity: number | null;
  unitSizeValue: number | null;
  unitSizeUnit: string | null;
  householdUserCount: number;
  lastPurchaseDate: string | null;
  changeSummary: string | null;
  createdAt: string;
};
type InventoryItemRecord = {
  id: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  brand: string | null;
  subcategory: string | null;
  tags: string[];
  unit: string;
  currentQuantity: number;
  inUseQuantity: number | null;
  minQuantity: number;
  reorderQuantity: number | null;
  packageQuantity: number | null;
  packageUnit: string | null;
  unitSizeValue: number | null;
  unitSizeUnit: string | null;
  householdUserCount: number;
  restockFrequencyDays: number | null;
  preferredCurrencyCode: string;
  averageUnitCost: number | null;
  lastPurchaseTotalCost: number | null;
  estimatedDailyUsage: number | null;
  lastPurchaseDate: string | null;
  lastConsumptionDate: string | null;
  estimatedDaysRemaining: number | null;
  nextRestockDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  iconKey: string | null;
  revisions: InventoryRevisionRecord[];
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
type ApiErrorResponse = { message: string; errors?: unknown };
type EditFormState = UpdateInventoryItemInput;
type RestockFormState = Omit<RestockInventoryItemInput, "itemId">;
type InventoryItemApiRecord = {
  id: string;
  userId: string;
  categoryId: string;
  name: string;
  brand: string | null;
  subcategory: string | null;
  tags: string[];
  unit: string;
  currentQuantity: number | string;
  inUseQuantity: number | string | null;
  minQuantity: number | string;
  reorderQuantity: number | string | null;
  packageQuantity: number | string | null;
  packageUnit: string | null;
  unitSizeValue: number | string | null;
  unitSizeUnit: string | null;
  householdUserCount: number;
  restockFrequencyDays: number | null;
  preferredCurrencyCode: string;
  averageUnitCost: number | string | null;
  lastPurchaseTotalCost: number | string | null;
  estimatedDailyUsage: number | string | null;
  lastPurchaseDate: string | null;
  lastConsumptionDate: string | null;
  estimatedDaysRemaining: number | null;
  nextRestockDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  iconKey: string | null;
  revisions: InventoryRevisionRecord[];
  updatedAt: string;
  createdAt: string;
  category: { name: string };
};

const flatUnitOptions = inventoryUnitGroups.flatMap((group) => group.units);

const getStatus = (item: InventoryItemRecord): Exclude<StatusFilter, "all"> =>
  getInventoryStatus(item);

const statusClass = (status: Exclude<StatusFilter, "all">) =>
  status === "out"
    ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300"
    : status === "low"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";

const formatNumber = (value: number | null | undefined, digits = 3) =>
  value == null || Number.isNaN(value) ? "N/A" : Number(value).toFixed(digits).replace(/\.?0+$/, "");

const formatMoney = (code: string, value: number | null | undefined) =>
  value == null || Number.isNaN(value) ? "N/A" : `${formatNumber(value, 2)} ${code}`;

const describeSupply = (item: InventoryItemRecord) => {
  if (usesSizeTracking(item)) {
    const trackingUnit = getTrackingUnit(item);
    const openAmount = item.inUseQuantity ?? 0;
    return `${formatNumber(item.currentQuantity)} sealed ${formatInventoryUnit(item.unit)} + ${formatNumber(openAmount)} ${formatInventoryUnit(trackingUnit)} open (${formatNumber(getAvailableAmount(item))} ${formatInventoryUnit(trackingUnit)} total)`;
  }

  return `${formatNumber(item.currentQuantity)} ${formatInventoryUnit(item.unit)} on hand`;
};

const describePack = (item: InventoryItemRecord) =>
  item.packageQuantity && item.packageUnit
    ? `${formatNumber(item.packageQuantity)} ${formatInventoryUnit(item.packageUnit)} per pack${item.unitSizeValue && item.unitSizeUnit ? `, ${formatNumber(item.unitSizeValue)} ${formatInventoryUnit(item.unitSizeUnit)} each` : ""}`
    : item.unitSizeValue && item.unitSizeUnit
      ? `${formatNumber(item.unitSizeValue)} ${formatInventoryUnit(item.unitSizeUnit)} each`
      : "N/A";

const emptyForm = (categoryId = ""): EditFormState => ({
  categoryId,
  name: "",
  brand: "",
  subcategory: "",
  tags: [],
  unit: "piece",
  currentQuantity: 0,
  inUseQuantity: undefined,
  minQuantity: 1,
  reorderQuantity: undefined,
  packageQuantity: undefined,
  packageUnit: undefined,
  unitSizeValue: undefined,
  unitSizeUnit: undefined,
  householdUserCount: 1,
  restockFrequencyDays: undefined,
  preferredCurrencyCode: "QAR",
  averageUnitCost: undefined,
  lastPurchaseTotalCost: undefined,
  estimatedDailyUsage: undefined,
  lastPurchaseDate: undefined,
  lastConsumptionDate: undefined,
  nextRestockDate: undefined,
  expiryDate: undefined,
  notes: "",
  iconKey: "box",
});

const itemToForm = (item: InventoryItemRecord): EditFormState => ({
  categoryId: item.categoryId,
  name: item.name,
  brand: item.brand ?? "",
  subcategory: item.subcategory ?? "",
  tags: Array.isArray(item.tags) ? item.tags : [],
  unit: item.unit as EditFormState["unit"],
  currentQuantity: item.currentQuantity,
  inUseQuantity: item.inUseQuantity ?? undefined,
  minQuantity: item.minQuantity,
  reorderQuantity: item.reorderQuantity ?? undefined,
  packageQuantity: item.packageQuantity ?? undefined,
  packageUnit: (item.packageUnit as EditFormState["packageUnit"]) ?? undefined,
  unitSizeValue: item.unitSizeValue ?? undefined,
  unitSizeUnit: (item.unitSizeUnit as EditFormState["unitSizeUnit"]) ?? undefined,
  householdUserCount: item.householdUserCount,
  restockFrequencyDays: item.restockFrequencyDays ?? undefined,
  preferredCurrencyCode: item.preferredCurrencyCode,
  averageUnitCost: item.averageUnitCost ?? undefined,
  lastPurchaseTotalCost: item.lastPurchaseTotalCost ?? undefined,
  estimatedDailyUsage: item.estimatedDailyUsage ?? undefined,
  lastPurchaseDate: toDateInputValue(item.lastPurchaseDate) || undefined,
  lastConsumptionDate: toDateInputValue(item.lastConsumptionDate) || undefined,
  nextRestockDate: toDateInputValue(item.nextRestockDate) || undefined,
  expiryDate: toDateInputValue(item.expiryDate) || undefined,
  notes: item.notes ?? "",
  iconKey: item.iconKey ?? "box",
});

const restockFormFromItem = (item: InventoryItemRecord): RestockFormState => ({
  userId: item.userId,
  quantity: item.reorderQuantity ?? 1,
  unitPrice: item.averageUnitCost ?? undefined,
  totalPrice: item.lastPurchaseTotalCost ?? undefined,
  currencyCode: item.preferredCurrencyCode,
  purchaseDate: getTodayDateInputValue(),
  storeName: "",
  note: "",
  brand: item.brand ?? undefined,
  packageQuantity: item.packageQuantity ?? undefined,
  packageUnit: (item.packageUnit as RestockFormState["packageUnit"]) ?? undefined,
  unitSizeValue: item.unitSizeValue ?? undefined,
  unitSizeUnit: (item.unitSizeUnit as RestockFormState["unitSizeUnit"]) ?? undefined,
  householdUserCount: item.householdUserCount,
  expiryDate: item.expiryDate ? toDateInputValue(item.expiryDate) : undefined,
});

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse =>
  !!value && typeof value === "object" && "message" in value;

export default function InventoryManagementClient({
  initialItems,
  categories,
}: {
  initialItems: InventoryItemRecord[];
  categories: InventoryCategoryOption[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(Array.isArray(initialItems) ? initialItems : []);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("risk");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRestocking, setIsRestocking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingRestock, setIsSavingRestock] = useState(false);
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  const [showAdvancedRestock, setShowAdvancedRestock] = useState(false);
  const [editingRevisionId, setEditingRevisionId] = useState<string | null>(null);
  const [revisionSummaryDraft, setRevisionSummaryDraft] = useState("");
  const [serverError, setServerError] = useState("");
  const [tagsText, setTagsText] = useState("");
  const lastAutoDailyUsageRef = useRef<number | null>(null);
  const safeCategories = useMemo(() => (Array.isArray(categories) ? categories : []), [categories]);
  const [formData, setFormData] = useState<EditFormState>(emptyForm(safeCategories[0]?.id ?? ""));
  const [restockFormData, setRestockFormData] = useState<RestockFormState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );
  const selectedCategory = safeCategories.find((category) => category.id === formData.categoryId);
  const formUsesSizeTracking = usesSizeTracking(formData);
  const formTrackingUnit = getTrackingUnit(formData);
  const usageSuggestion = useMemo(
    () =>
      calculateSuggestedDailyUsage({
        unitSizeValue: formData.unitSizeValue,
        lastPurchaseDate: formData.lastPurchaseDate,
        lastConsumptionDate: formData.lastConsumptionDate,
      }),
    [formData.lastConsumptionDate, formData.lastPurchaseDate, formData.unitSizeValue]
  );
  const previewDaysRemaining = useMemo(
    () =>
      getEstimatedDaysRemaining({
        ...formData,
        estimatedDailyUsage: formData.estimatedDailyUsage ?? usageSuggestion ?? undefined,
      }),
    [formData, usageSuggestion]
  );
  const calculatedNextRestockDate = useMemo(
    () =>
      calculateNextRestockDate(
        {
          ...formData,
          estimatedDailyUsage: formData.estimatedDailyUsage ?? usageSuggestion ?? undefined,
        },
        formData.lastPurchaseDate ?? getTodayDateInputValue()
      ),
    [formData, usageSuggestion]
  );

  useEffect(() => {
    if (!selectedItem) {
      setFormData(emptyForm(safeCategories[0]?.id ?? ""));
      setTagsText("");
      lastAutoDailyUsageRef.current = null;
      return;
    }

    setFormData(itemToForm(selectedItem));
    setRestockFormData(restockFormFromItem(selectedItem));
    setTagsText(Array.isArray(selectedItem.tags) ? selectedItem.tags.join(", ") : "");
    setFieldErrors({});
    lastAutoDailyUsageRef.current = null;
  }, [safeCategories, selectedItem]);

  useEffect(() => {
    const wasAutoFilled =
      formData.estimatedDailyUsage != null &&
      formData.estimatedDailyUsage === lastAutoDailyUsageRef.current;

    if (usageSuggestion != null && (formData.estimatedDailyUsage == null || wasAutoFilled)) {
      setFormData((current) =>
        current.estimatedDailyUsage == null || current.estimatedDailyUsage === lastAutoDailyUsageRef.current
          ? { ...current, estimatedDailyUsage: usageSuggestion }
          : current
      );
      lastAutoDailyUsageRef.current = usageSuggestion;
      return;
    }

    if (usageSuggestion == null && wasAutoFilled) {
      setFormData((current) =>
        current.estimatedDailyUsage === lastAutoDailyUsageRef.current
          ? { ...current, estimatedDailyUsage: undefined }
          : current
      );
      lastAutoDailyUsageRef.current = null;
    }
  }, [formData.estimatedDailyUsage, usageSuggestion]);

  useEffect(() => {
    if (formData.nextRestockDate !== calculatedNextRestockDate) {
      setFormData((current) =>
        current.nextRestockDate !== calculatedNextRestockDate
          ? { ...current, nextRestockDate: calculatedNextRestockDate ?? undefined }
          : current
      );
    }
  }, [calculatedNextRestockDate, formData.nextRestockDate]);

  useEffect(() => {
    if (!isEditing) return;

    const parsed = updateInventoryItemSchema.safeParse({
      ...formData,
      tags: tagsText,
      preferredCurrencyCode: formData.preferredCurrencyCode.toUpperCase(),
      notes: formData.notes?.trim() || undefined,
      iconKey: formData.iconKey?.trim() || undefined,
    });

    setFieldErrors(parsed.success ? {} : parsed.error.flatten().fieldErrors);
  }, [formData, isEditing, tagsText]);

  const categoryCounts = useMemo(
    () =>
      safeCategories.map((category) => ({
        ...category,
        count: items.filter((item) => item.categoryId === category.id).length,
      })),
    [safeCategories, items]
  );

  const filteredItems = useMemo(() => {
const nextItems = items.filter((item) => {
  const haystack = [
    item.name,
    item.categoryName,
    item.brand ?? "",
    item.subcategory ?? "",
    Array.isArray(item.tags) ? item.tags.join(" ") : "",
    item.notes ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return (
    (statusFilter === "all" || getStatus(item) === statusFilter) &&
    (categoryFilter === "all" || item.categoryId === categoryFilter) &&
    (deferredSearch.length === 0 || haystack.includes(deferredSearch))
  );
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
          return getAvailableAmount(right) - getAvailableAmount(left);
        case "stock_asc":
          return getAvailableAmount(left) - getAvailableAmount(right);
        case "risk":
        default:
          return (
            getAvailableAmount(left) - left.minQuantity - (getAvailableAmount(right) - right.minQuantity)
          );
      }
    });

    return nextItems;
  }, [categoryFilter, deferredSearch, items, sortBy, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleItems = useMemo(
    () => filteredItems.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
    [filteredItems, page, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, deferredSearch, pageSize, sortBy, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const refreshRoute = () => startTransition(() => router.refresh());
  const updateFormValue = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) =>
    setFormData((current) => ({ ...current, [key]: value }));
  const openItem = (item: InventoryItemRecord, edit = false) => {
    setSelectedItemId(item.id);
    setIsEditing(edit);
    setIsRestocking(false);
    setServerError("");
  };
  const openRestock = (item: InventoryItemRecord) => {
    setSelectedItemId(item.id);
    setIsEditing(false);
    setIsRestocking(true);
    setShowAdvancedRestock(false);
    setRestockFormData(restockFormFromItem(item));
    setFieldErrors({});
    setServerError("");
  };
  const closeModal = () => {
    setSelectedItemId(null);
    setIsEditing(false);
    setIsRestocking(false);
    setEditingRevisionId(null);
    setRevisionSummaryDraft("");
    setServerError("");
    setFieldErrors({});
  };
  const normalizeItem = (updatedItem: InventoryItemApiRecord): InventoryItemRecord => ({
    id: updatedItem.id,
    userId: updatedItem.userId,
    categoryId: updatedItem.categoryId,
    categoryName: updatedItem.category.name,
    name: updatedItem.name,
    brand: updatedItem.brand,
    subcategory: updatedItem.subcategory,
    tags: updatedItem.tags ?? [],
    unit: updatedItem.unit,
    currentQuantity: Number(updatedItem.currentQuantity),
    inUseQuantity: updatedItem.inUseQuantity == null ? null : Number(updatedItem.inUseQuantity),
    minQuantity: Number(updatedItem.minQuantity),
    reorderQuantity: updatedItem.reorderQuantity == null ? null : Number(updatedItem.reorderQuantity),
    packageQuantity: updatedItem.packageQuantity == null ? null : Number(updatedItem.packageQuantity),
    packageUnit: updatedItem.packageUnit,
    unitSizeValue: updatedItem.unitSizeValue == null ? null : Number(updatedItem.unitSizeValue),
    unitSizeUnit: updatedItem.unitSizeUnit,
    householdUserCount: updatedItem.householdUserCount,
    restockFrequencyDays: updatedItem.restockFrequencyDays == null ? null : Number(updatedItem.restockFrequencyDays),
    preferredCurrencyCode: updatedItem.preferredCurrencyCode,
    averageUnitCost: updatedItem.averageUnitCost == null ? null : Number(updatedItem.averageUnitCost),
    lastPurchaseTotalCost:
      updatedItem.lastPurchaseTotalCost == null ? null : Number(updatedItem.lastPurchaseTotalCost),
    estimatedDailyUsage:
      updatedItem.estimatedDailyUsage == null ? null : Number(updatedItem.estimatedDailyUsage),
    lastPurchaseDate: updatedItem.lastPurchaseDate,
    lastConsumptionDate: updatedItem.lastConsumptionDate,
    estimatedDaysRemaining: updatedItem.estimatedDaysRemaining,
    nextRestockDate: updatedItem.nextRestockDate,
    expiryDate: updatedItem.expiryDate,
    notes: updatedItem.notes,
    iconKey: updatedItem.iconKey,
    revisions: updatedItem.revisions ?? [],
    updatedAt: updatedItem.updatedAt,
    createdAt: updatedItem.createdAt,
  });

  const saveChanges = async () => {
    if (!selectedItem) return;

    const parsed = updateInventoryItemSchema.safeParse({
      ...formData,
      tags: tagsText,
      preferredCurrencyCode: formData.preferredCurrencyCode.toUpperCase(),
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

    const normalized = normalizeItem(result as InventoryItemApiRecord);
    setItems((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
    setSelectedItemId(normalized.id);
    setIsEditing(false);
    refreshRoute();
  };

  const updateRestockValue = <K extends keyof RestockFormState>(key: K, value: RestockFormState[K]) =>
    setRestockFormData((current) => (current ? { ...current, [key]: value } : current));

  const saveRestock = async () => {
    if (!selectedItem || !restockFormData) return;

    const parsed = restockInventoryItemSchema.safeParse({
      ...restockFormData,
      itemId: selectedItem.id,
      currencyCode: restockFormData.currencyCode.toUpperCase(),
      storeName: restockFormData.storeName?.trim() || undefined,
      note: restockFormData.note?.trim() || undefined,
      brand: restockFormData.brand?.trim() || undefined,
    });

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    setServerError("");
    setIsSavingRestock(true);

    try {
      const response = await fetch(`/api/inventory/items/${selectedItem.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      let result: unknown = null;
      try {
        result = await response.json();
      } catch {}

      if (!response.ok) {
        setServerError(
          isApiErrorResponse(result) ? result.message : "Failed to restock inventory item"
        );
        return;
      }

      const normalized = normalizeItem(result as InventoryItemApiRecord);
      setItems((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
      setSelectedItemId(normalized.id);
      setIsRestocking(false);
      setRestockFormData(restockFormFromItem(normalized));
      refreshRoute();
    } finally {
      setIsSavingRestock(false);
    }
  };

  const startRevisionEdit = (revision: InventoryRevisionRecord) => {
    setEditingRevisionId(revision.id);
    setRevisionSummaryDraft(revision.changeSummary || "");
    setServerError("");
  };

  const saveRevisionSummary = async () => {
    if (!selectedItem || !editingRevisionId) return;

    setIsSavingHistory(true);
    setServerError("");

    try {
      const response = await fetch(
        `/api/inventory/items/${selectedItem.id}/history/${editingRevisionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ changeSummary: revisionSummaryDraft }),
        }
      );

      const result = (await response.json()) as InventoryItemApiRecord | ApiErrorResponse;
      if (!response.ok) {
        setServerError(
          "message" in result ? result.message : "Failed to update inventory history"
        );
        return;
      }

      const normalized = normalizeItem(result as InventoryItemApiRecord);
      setItems((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
      setSelectedItemId(normalized.id);
      setEditingRevisionId(null);
      setRevisionSummaryDraft("");
      refreshRoute();
    } finally {
      setIsSavingHistory(false);
    }
  };

  const deleteRevision = async (revisionId: string) => {
    if (!selectedItem) return;
    if (!window.confirm("Delete this history entry?")) return;

    setIsSavingHistory(true);
    setServerError("");

    try {
      const response = await fetch(
        `/api/inventory/items/${selectedItem.id}/history/${revisionId}`,
        {
          method: "DELETE",
        }
      );

      const result = (await response.json()) as InventoryItemApiRecord | ApiErrorResponse;
      if (!response.ok) {
        setServerError(
          "message" in result ? result.message : "Failed to delete inventory history"
        );
        return;
      }

      const normalized = normalizeItem(result as InventoryItemApiRecord);
      setItems((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
      setSelectedItemId(normalized.id);
      if (editingRevisionId === revisionId) {
        setEditingRevisionId(null);
        setRevisionSummaryDraft("");
      }
      refreshRoute();
    } finally {
      setIsSavingHistory(false);
    }
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

  const renderStatus = (item: InventoryItemRecord) => {
    const status = getStatus(item);
    return (
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(status)}`}>
        {status === "out" ? "Out of stock" : status === "low" ? "Refill soon" : "Healthy"}
      </span>
    );
  };

const renderTagPills = (tags?: string[]) => {
  if (!Array.isArray(tags) || tags.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {tags.slice(0, 4).map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300"
        >
          {tag}
        </span>
      ))}
    </div>
  );
};

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="soft-card rounded-[28px] p-5"><p className="text-sm text-slate-500">Tracked items</p><p className="mt-3 text-3xl font-semibold">{items.length}</p></div>
        <div className="soft-card rounded-[28px] p-5"><p className="text-sm text-slate-500">Categories</p><p className="mt-3 text-3xl font-semibold">{safeCategories.length}</p></div>
        <div className="soft-card rounded-[28px] p-5"><p className="text-sm text-slate-500">Need refill soon</p><p className="mt-3 text-3xl font-semibold">{lowCount}</p></div>
        <div className="soft-card rounded-[28px] p-5"><p className="text-sm text-slate-500">Out of stock</p><p className="mt-3 text-3xl font-semibold">{outCount}</p></div>
      </section>

      <Card as="section" className="overflow-hidden">
        <div className="border-b border-[var(--border)] px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><h2 className="section-title">Inventory Records</h2><p className="text-muted mt-1 text-sm">Search by item, subcategory, or tags with household-style stock labels.</p></div>
            <div className="flex flex-wrap gap-3">
              <label className="relative min-w-[260px]"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records" className="w-full rounded-2xl border border-[var(--border)] bg-white/70 py-3 pl-11 pr-4 dark:bg-white/5" /></label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"><option value="all">All statuses</option><option value="healthy">Healthy</option><option value="low">Refill soon</option><option value="out">Out of stock</option></select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"><option value="risk">Need first</option><option value="updated_desc">Recently updated</option><option value="updated_asc">Oldest updated</option><option value="name_asc">Name A-Z</option><option value="name_desc">Name Z-A</option><option value="category_asc">Category A-Z</option><option value="stock_desc">Most on hand</option><option value="stock_asc">Least on hand</option></select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => setCategoryFilter("all")} className={`rounded-full px-3 py-1.5 text-sm ${categoryFilter === "all" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-black/5 dark:bg-white/5"}`}>All ({items.length})</button>
            {categoryCounts.map((category) => <button type="button" key={category.id} onClick={() => setCategoryFilter(category.id)} className={`rounded-full px-3 py-1.5 text-sm ${categoryFilter === category.id ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"}`}>{category.name} ({category.count})</button>)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/[0.03] text-slate-500 dark:bg-white/[0.03]"><tr><th className="px-6 py-4 font-medium">Item</th><th className="px-6 py-4 font-medium">Classification</th><th className="px-6 py-4 font-medium">Supply</th><th className="px-6 py-4 font-medium">Cost</th><th className="px-6 py-4 font-medium text-right">Actions</th></tr></thead>
            <tbody>
              {visibleItems.length > 0 ? visibleItems.map((item) => {
                const iconEmoji = inventoryIconOptions.find((icon) => icon.value === item.iconKey)?.emoji ?? "📦";
                return <tr key={item.id} className="border-t border-[var(--border)] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                  <td className="px-6 py-4"><button type="button" onClick={() => openItem(item)} className="text-left"><div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/5 text-xl dark:bg-white/5">{iconEmoji}</div><div><p className="font-semibold">{item.name}</p><p className="text-muted mt-1 text-xs">{item.brand || "No brand"}{item.subcategory ? ` | ${item.subcategory}` : ""}</p></div></div></button></td>
                  <td className="px-6 py-4"><p>{item.categoryName}</p>{renderTagPills(item.tags)}</td>
                  <td className="px-6 py-4"><p>{describeSupply(item)}</p><p className="text-muted mt-1 text-xs">Remind at {formatNumber(item.minQuantity)} {formatInventoryUnit(getTrackingUnit(item))} | Buy {item.reorderQuantity == null ? "N/A" : `${formatNumber(item.reorderQuantity)} ${formatInventoryUnit(item.unit)}`}</p><p className="text-muted mt-1 text-xs">{describePack(item)}</p></td>
                  <td className="px-6 py-4"><p>{formatMoney(item.preferredCurrencyCode, item.averageUnitCost)}</p><p className="text-muted mt-1 text-xs">Total paid: {formatMoney(item.preferredCurrencyCode, item.lastPurchaseTotalCost)}</p><div className="mt-2">{renderStatus(item)}</div></td>
<td className="px-6 py-4"><div className="flex justify-end gap-2">
    
    <button
      type="button"
      onClick={() => openItem(item)}
      className="rounded-xl border border-[var(--border)] p-2"
      title="Open"
    >
      <Eye className="h-4 w-4" />
    </button>

    <button
      type="button"
      onClick={() => openRestock(item)}
      className="rounded-xl border border-[var(--border)] p-2"
      title="Restock"
    >
      <PackagePlus className="h-4 w-4" />
    </button>

    <button
      type="button"
      onClick={() => openItem(item, true)}
      className="rounded-xl border border-[var(--border)] p-2"
      title="Edit"
    >
      <Pencil className="h-4 w-4" />
    </button>

  </div>
</td></tr>;
              }) : <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">No inventory records match the current filters.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[var(--border)] px-6 py-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><p className="text-muted text-sm">Showing {filteredItems.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length}.<span className="ml-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Healthy: {healthyCount}</span></p><div className="flex items-center gap-3"><select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-2.5 text-sm dark:bg-white/5"><option value={10}>10 / page</option><option value={20}>20 / page</option><option value={50}>50 / page</option></select><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-2xl border border-[var(--border)] p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="text-sm font-medium">Page {page} of {totalPages}</span><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="rounded-2xl border border-[var(--border)] p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div></div>
      </Card>

      {selectedItem ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 sm:items-center"><div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[30px] border border-white/15 bg-[rgba(255,255,255,0.96)] p-6 shadow-[0_28px_100px_rgba(15,23,42,0.35)] backdrop-blur dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Inventory record</p><h3 className="mt-2 text-2xl font-semibold">{selectedItem.name}</h3><p className="text-muted mt-2 text-sm">{selectedItem.categoryName}{selectedItem.subcategory ? ` | ${selectedItem.subcategory}` : ""}{selectedItem.brand ? ` | ${selectedItem.brand}` : ""}</p></div><button type="button" onClick={closeModal} className={buttonClassName({ variant: "secondary", size: "sm", className: "p-2.5" })}><X className="h-4 w-4" /></button></div>
        {serverError ? <Alert variant="error" className="mt-5">{serverError}</Alert> : null}

        {!isEditing ? <>
          <div className="mt-6 grid gap-4 md:grid-cols-4"><div className="soft-card rounded-[24px] p-4"><p className="text-sm text-slate-500">Sealed stock</p><p className="mt-2 text-2xl font-semibold">{formatNumber(selectedItem.currentQuantity)} {formatInventoryUnit(selectedItem.unit)}</p></div><div className="soft-card rounded-[24px] p-4"><p className="text-sm text-slate-500">{usesSizeTracking(selectedItem) ? "Open item left" : "Open stock"}</p><p className="mt-2 text-2xl font-semibold">{selectedItem.inUseQuantity == null ? "N/A" : `${formatNumber(selectedItem.inUseQuantity)} ${formatInventoryUnit(getTrackingUnit(selectedItem))}`}</p></div><div className="soft-card rounded-[24px] p-4"><p className="text-sm text-slate-500">Remind me at</p><p className="mt-2 text-2xl font-semibold">{formatNumber(selectedItem.minQuantity)} {formatInventoryUnit(getTrackingUnit(selectedItem))}</p></div><div className="soft-card rounded-[24px] p-4"><p className="text-sm text-slate-500">Status</p><div className="mt-3">{renderStatus(selectedItem)}</div></div></div>
          <div className="mt-6 grid gap-6 md:grid-cols-2"><div className="rounded-[28px] border border-[var(--border)] bg-white/65 p-5 dark:bg-white/5"><h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Classification</h4><div className="mt-4 space-y-3 text-sm"><p><span className="text-slate-500">Category:</span> {selectedItem.categoryName}</p><p><span className="text-slate-500">Subcategory:</span> {selectedItem.subcategory || "N/A"}</p><p><span className="text-slate-500">Tags:</span> {Array.isArray(selectedItem.tags) && selectedItem.tags.length > 0 ? selectedItem.tags.join(", ") : "N/A"}</p><p><span className="text-slate-500">Pack details:</span> {describePack(selectedItem)}</p><p><span className="text-slate-500">Available now:</span> {formatNumber(getAvailableAmount(selectedItem))} {formatInventoryUnit(getTrackingUnit(selectedItem))}</p><p><span className="text-slate-500">Active users:</span> {selectedItem.householdUserCount}</p></div></div><div className="rounded-[28px] border border-[var(--border)] bg-white/65 p-5 dark:bg-white/5"><h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Cost and planning</h4><div className="mt-4 space-y-3 text-sm"><p><span className="text-slate-500">Unit cost:</span> {formatMoney(selectedItem.preferredCurrencyCode, selectedItem.averageUnitCost)}</p><p><span className="text-slate-500">Last total paid:</span> {formatMoney(selectedItem.preferredCurrencyCode, selectedItem.lastPurchaseTotalCost)}</p><p><span className="text-slate-500">Usually buy next:</span> {selectedItem.reorderQuantity == null ? "N/A" : `${formatNumber(selectedItem.reorderQuantity)} ${formatInventoryUnit(selectedItem.unit)}`}</p><p><span className="text-slate-500">Restock cadence:</span> {selectedItem.restockFrequencyDays == null ? "Usage based / manual" : `Every ${selectedItem.restockFrequencyDays} day(s)`}</p><p><span className="text-slate-500">Daily usage:</span> {selectedItem.estimatedDailyUsage == null ? "N/A" : `${formatNumber(selectedItem.estimatedDailyUsage)} ${formatInventoryUnit(getTrackingUnit(selectedItem))}`}</p><p><span className="text-slate-500">Days remaining:</span> {selectedItem.estimatedDaysRemaining ?? getEstimatedDaysRemaining(selectedItem) ?? "N/A"}</p></div></div></div>
          <div className="mt-6 grid gap-6 md:grid-cols-2"><div className="rounded-[28px] border border-[var(--border)] bg-white/65 p-5 text-sm dark:bg-white/5"><p className="font-semibold uppercase tracking-[0.18em] text-slate-500">Timeline</p><div className="mt-4 space-y-3"><p><span className="text-slate-500">Purchased:</span> <LocalizedDateText value={selectedItem.lastPurchaseDate} emptyText="N/A" /></p><p><span className="text-slate-500">Finished / ended:</span> <LocalizedDateText value={selectedItem.lastConsumptionDate} emptyText="N/A" /></p><p><span className="text-slate-500">Restock date:</span> <LocalizedDateText value={selectedItem.nextRestockDate} emptyText="N/A" /></p><p><span className="text-slate-500">Expiry:</span> <LocalizedDateText value={selectedItem.expiryDate} emptyText="N/A" /></p></div></div><div className="rounded-[28px] border border-[var(--border)] bg-white/65 p-5 text-sm dark:bg-white/5"><p className="font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</p><p className="text-muted mt-4 whitespace-pre-wrap">{selectedItem.notes || "No notes saved for this item."}</p></div></div>
          <div className="mt-6 rounded-[28px] border border-[var(--border)] bg-white/65 p-5 text-sm dark:bg-white/5"><p className="font-semibold uppercase tracking-[0.18em] text-slate-500">Configuration history</p><div className="mt-4 space-y-3">{selectedItem.revisions.length > 0 ? selectedItem.revisions.map((revision) => <div key={revision.id} className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1">{editingRevisionId === revision.id ? <><input value={revisionSummaryDraft} onChange={(e) => setRevisionSummaryDraft(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm dark:bg-white/5" /><div className="mt-2 flex gap-2"><button type="button" onClick={saveRevisionSummary} disabled={isSavingHistory} className="rounded-xl bg-black px-3 py-2 text-xs font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black">{isSavingHistory ? "Saving..." : "Save"}</button><button type="button" onClick={() => { setEditingRevisionId(null); setRevisionSummaryDraft(""); }} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs">Cancel</button></div></> : <p className="font-medium">{revision.changeSummary || "Snapshot saved"}</p>}<p className="text-muted mt-1 text-xs"><LocalizedDateText value={revision.createdAt} emptyText="N/A" /> | {revision.brand || "No brand"} | {formatNumber(revision.currentQuantity)} {formatInventoryUnit(revision.unit)} | Users: {revision.householdUserCount}</p></div><div className="flex flex-col items-end gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${revision.revisionType === "restocked" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : revision.revisionType === "created" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"}`}>{revision.revisionType}</span><div className="flex gap-2"><button type="button" onClick={() => startRevisionEdit(revision)} className="rounded-xl border border-[var(--border)] px-2.5 py-1.5 text-xs">Edit</button><button type="button" onClick={() => deleteRevision(revision.id)} disabled={isSavingHistory} className="rounded-xl border border-red-200 px-2.5 py-1.5 text-xs text-red-700 disabled:opacity-50 dark:border-red-500/30 dark:text-red-300">Remove</button></div></div></div></div>) : <p className="text-muted">No history yet.</p>}</div></div>
          <div className="mt-6 flex flex-wrap justify-end gap-3"><Button type="button" onClick={deleteItem} disabled={isDeleting} variant="danger" size="md"><span className="inline-flex items-center gap-2"><Trash2 className="h-4 w-4" />{isDeleting ? "Deleting..." : "Delete"}</span></Button><Button type="button" onClick={() => openRestock(selectedItem)} variant="secondary" size="md"><span className="inline-flex items-center gap-2"><PackagePlus className="h-4 w-4" />Restock</span></Button><Button type="button" onClick={() => setIsEditing(true)} size="md">Edit record</Button></div>
        </> : isRestocking ? <>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 rounded-[24px] border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">Quick restock: add quantity, date, and price. Open advanced only if the new batch changed the active config.</div>
            <div><InventoryFieldHelp label="Added quantity" help={`How many ${formatInventoryUnit(selectedItem.unit)} you bought in this restock.`} /><input type="number" step="0.001" value={restockFormData?.quantity ?? ""} onChange={(e) => updateRestockValue("quantity", Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{fieldErrors.quantity ? <p className="mt-2 text-sm text-red-600">{fieldErrors.quantity[0]}</p> : null}</div>
            <div><InventoryFieldHelp label="Purchase date" help="When this restock happened." /><ThemedDateInput value={restockFormData?.purchaseDate ?? getTodayDateInputValue()} onChange={(value) => updateRestockValue("purchaseDate", value ?? getTodayDateInputValue())} max={getTodayDateInputValue()} />{fieldErrors.purchaseDate ? <p className="mt-2 text-sm text-red-600">{fieldErrors.purchaseDate[0]}</p> : null}</div>
            <div><InventoryFieldHelp label="Currency" help="Currency for this restock purchase." /><input value={restockFormData?.currencyCode ?? selectedItem.preferredCurrencyCode} onChange={(e) => updateRestockValue("currencyCode", e.target.value.toUpperCase())} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 uppercase dark:bg-white/5" /></div>
            <div><InventoryFieldHelp label="Unit price" help="Optional price for one sealed unit in this purchase." optional /><input type="number" step="0.001" value={restockFormData?.unitPrice ?? ""} onChange={(e) => updateRestockValue("unitPrice", e.target.value === "" ? undefined : Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{fieldErrors.unitPrice ? <p className="mt-2 text-sm text-red-600">{fieldErrors.unitPrice[0]}</p> : null}</div>
            <div><InventoryFieldHelp label="Total paid" help="Optional total paid for this restock." optional /><input type="number" step="0.001" value={restockFormData?.totalPrice ?? ""} onChange={(e) => updateRestockValue("totalPrice", e.target.value === "" ? undefined : Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{fieldErrors.totalPrice ? <p className="mt-2 text-sm text-red-600">{fieldErrors.totalPrice[0]}</p> : null}</div>
            <div><InventoryFieldHelp label="Store name" help="Where you bought this restock from." optional /><input value={restockFormData?.storeName ?? ""} onChange={(e) => updateRestockValue("storeName", e.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /></div>
            <div className="md:col-span-2"><InventoryFieldHelp label="Restock note" help="Short note about this purchase." optional /><textarea value={restockFormData?.note ?? ""} onChange={(e) => updateRestockValue("note", e.target.value)} rows={2} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /></div>
            <div className="md:col-span-2"><Button type="button" onClick={() => setShowAdvancedRestock((current) => !current)} variant="secondary" size="md">{showAdvancedRestock ? "Hide advanced restock fields" : "Show advanced restock fields"}</Button></div>
            {showAdvancedRestock ? <>
              <div><InventoryFieldHelp label="Brand override" help="Use this if the new restock changed the active brand." optional /><input value={restockFormData?.brand ?? ""} onChange={(e) => updateRestockValue("brand", e.target.value || undefined)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /></div>
              <div><InventoryFieldHelp label="Household users" help="Update active user count if demand changed with this restock." optional /><input type="number" min="1" max="20" step="1" value={restockFormData?.householdUserCount ?? selectedItem.householdUserCount} onChange={(e) => updateRestockValue("householdUserCount", Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{fieldErrors.householdUserCount ? <p className="mt-2 text-sm text-red-600">{fieldErrors.householdUserCount[0]}</p> : null}</div>
              <div><InventoryFieldHelp label="Pack contains" help="Update pack size if this restock came in a different pack format." optional /><div className="grid grid-cols-2 gap-3"><input type="number" step="0.001" value={restockFormData?.packageQuantity ?? ""} onChange={(e) => updateRestockValue("packageQuantity", e.target.value === "" ? undefined : Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /><select value={restockFormData?.packageUnit ?? ""} onChange={(e) => updateRestockValue("packageUnit", e.target.value === "" ? undefined : (e.target.value as RestockFormState["packageUnit"]))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"><option value="">Unit</option>{flatUnitOptions.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></div>{fieldErrors.packageUnit ? <p className="mt-2 text-sm text-red-600">{fieldErrors.packageUnit[0]}</p> : null}</div>
              <div><InventoryFieldHelp label="Each unit size" help="Update this if the new restock changed the active unit size." optional /><div className="grid grid-cols-2 gap-3"><input type="number" step="0.001" value={restockFormData?.unitSizeValue ?? ""} onChange={(e) => updateRestockValue("unitSizeValue", e.target.value === "" ? undefined : Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /><select value={restockFormData?.unitSizeUnit ?? ""} onChange={(e) => updateRestockValue("unitSizeUnit", e.target.value === "" ? undefined : (e.target.value as RestockFormState["unitSizeUnit"]))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"><option value="">Unit</option>{flatUnitOptions.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></div>{fieldErrors.unitSizeUnit ? <p className="mt-2 text-sm text-red-600">{fieldErrors.unitSizeUnit[0]}</p> : null}</div>
              <div><InventoryFieldHelp label="Expiry date" help="Optional expiry date for this newly purchased batch." optional /><ThemedDateInput value={restockFormData?.expiryDate ?? ""} onChange={(value) => updateRestockValue("expiryDate", value || undefined)} min={restockFormData?.purchaseDate || undefined} />{fieldErrors.expiryDate ? <p className="mt-2 text-sm text-red-600">{fieldErrors.expiryDate[0]}</p> : null}</div>
            </> : null}
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3"><Button type="button" onClick={() => setIsRestocking(false)} variant="secondary" size="md">Cancel</Button><Button type="button" onClick={saveRestock} disabled={isSavingRestock} size="md">{isSavingRestock ? "Saving..." : "Save restock"}</Button></div>
        </> : <>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2"><InventoryFieldHelp label="Item name" help="Use a name people at home actually say, for example Colgate toothpaste 100 ml." /><input value={formData.name} onChange={(e) => updateFormValue("name", e.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{fieldErrors.name ? <p className="mt-2 text-sm text-red-600">{fieldErrors.name[0]}</p> : null}</div>
            <div><InventoryFieldHelp label="Category" help="Category keeps related items grouped in reports, filters, and suggestions." /><select value={formData.categoryId} onChange={(e) => updateFormValue("categoryId", e.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5">{safeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
            <div><InventoryFieldHelp label="Brand" help="Useful when you buy the same kind of item in different brands or sizes." optional /><input value={formData.brand ?? ""} onChange={(e) => updateFormValue("brand", e.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /></div>
            <div><InventoryFieldHelp label="Subcategory" help="Add a practical grouping like oral care, laundry, or guest washroom." optional /><input value={formData.subcategory ?? ""} onChange={(e) => updateFormValue("subcategory", e.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{selectedCategory && selectedCategory.subcategories.length > 0 ? <div className="mt-2 flex flex-wrap gap-2">{selectedCategory.subcategories.map((subcategory) => <button key={subcategory} type="button" onClick={() => updateFormValue("subcategory", subcategory)} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">{subcategory}</button>)}</div> : null}</div>
            <div><InventoryFieldHelp label="Tags" help="Short labels like bathroom, monthly refill, or guest stock improve search and filtering." optional /><input value={tagsText} onChange={(e) => setTagsText(e.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /></div>
            <div><InventoryFieldHelp label="Main unit" help="This is how you buy sealed stock, for example tube, bottle, pack, or roll." /><select value={formData.unit} onChange={(e) => updateFormValue("unit", e.target.value as EditFormState["unit"])} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5">{inventoryUnitGroups.map((group) => <optgroup key={group.label} label={group.label}>{group.units.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</optgroup>)}</select></div>
            <div><InventoryFieldHelp label="Sealed units on hand" help="Count only unopened or fully available items in storage." /><input type="number" step="0.001" value={formData.currentQuantity} onChange={(e) => updateFormValue("currentQuantity", Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{fieldErrors.currentQuantity ? <p className="mt-2 text-sm text-red-600">{fieldErrors.currentQuantity[0]}</p> : null}</div>
            <div><InventoryFieldHelp label={formUsesSizeTracking ? "Open item amount left" : "Open stock"} help={formUsesSizeTracking ? `Enter what is still left in the currently opened item, for example 18 ${formatInventoryUnit(formTrackingUnit)} left in the tube.` : "Optional extra stock already opened or partly available."} optional /><input type="number" step="0.001" value={formData.inUseQuantity ?? ""} onChange={(e) => updateFormValue("inUseQuantity", e.target.value === "" ? undefined : Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" max={formUsesSizeTracking && formData.unitSizeValue != null ? formData.unitSizeValue : undefined} />{fieldErrors.inUseQuantity ? <p className="mt-2 text-sm text-red-600">{fieldErrors.inUseQuantity[0]}</p> : null}</div>
            <div><InventoryFieldHelp label="Remind me when remaining amount reaches" help={`Set the reminder threshold in the amount that is actually consumed, such as 5 ml left in the open tube.${formUsesSizeTracking ? "" : " If you do not use unit size tracking yet, this falls back to the main stock unit."}`} /><input type="number" step="0.001" value={formData.minQuantity} onChange={(e) => updateFormValue("minQuantity", Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{fieldErrors.minQuantity ? <p className="mt-2 text-sm text-red-600">{fieldErrors.minQuantity[0]}</p> : null}<p className="text-muted mt-2 text-xs">Tracked in {formatInventoryUnit(formTrackingUnit)}.</p></div>
            <div><InventoryFieldHelp label="Usually buy this much next time" help="Use this for your normal restock amount, for example 2 tubes or 1 family pack, so the next purchase suggestion makes sense." optional /><input type="number" step="0.001" value={formData.reorderQuantity ?? ""} onChange={(e) => updateFormValue("reorderQuantity", e.target.value === "" ? undefined : Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{fieldErrors.reorderQuantity ? <p className="mt-2 text-sm text-red-600">{fieldErrors.reorderQuantity[0]}</p> : null}<p className="text-muted mt-2 text-xs">Saved in {formatInventoryUnit(formData.unit)}.</p></div>
            <div><InventoryFieldHelp label="Household users" help="How many people actively use this item right now. Changing this over time is stored in history for demand forecasting." /><input type="number" min="1" max="20" step="1" value={formData.householdUserCount} onChange={(e) => updateFormValue("householdUserCount", Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{fieldErrors.householdUserCount ? <p className="mt-2 text-sm text-red-600">{fieldErrors.householdUserCount[0]}</p> : null}<p className="text-muted mt-2 text-xs">Current setup assumes {formData.householdUserCount} active user{formData.householdUserCount === 1 ? "" : "s"}.</p></div>
            <div><InventoryFieldHelp label="Restock every" help="Set a fixed buying rhythm per item, such as milk every 2 days, vegetables every 7 days, or chicken every 15 days." optional /><input type="number" min="1" max="365" step="1" value={formData.restockFrequencyDays ?? ""} onChange={(e) => updateFormValue("restockFrequencyDays", e.target.value === "" ? undefined : Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{fieldErrors.restockFrequencyDays ? <p className="mt-2 text-sm text-red-600">{fieldErrors.restockFrequencyDays[0]}</p> : null}<p className="text-muted mt-2 text-xs">Leave blank to keep next restock based on stock depletion and daily use.</p></div>
            <div><InventoryFieldHelp label="Pack contains" help="Useful when one shopping pack includes multiple units, such as 6 rolls or 12 sachets." optional /><div className="grid grid-cols-2 gap-3"><input type="number" step="0.001" value={formData.packageQuantity ?? ""} onChange={(e) => updateFormValue("packageQuantity", e.target.value === "" ? undefined : Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /><select value={formData.packageUnit ?? ""} onChange={(e) => updateFormValue("packageUnit", e.target.value === "" ? undefined : (e.target.value as EditFormState["packageUnit"]))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"><option value="">Unit</option>{flatUnitOptions.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></div></div>
            <div><InventoryFieldHelp label="Each unit size" help="This enables amount-based tracking such as one tube being 100 ml or one bag being 5 kg." optional /><div className="grid grid-cols-2 gap-3"><input type="number" step="0.001" value={formData.unitSizeValue ?? ""} onChange={(e) => updateFormValue("unitSizeValue", e.target.value === "" ? undefined : Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /><select value={formData.unitSizeUnit ?? ""} onChange={(e) => updateFormValue("unitSizeUnit", e.target.value === "" ? undefined : (e.target.value as EditFormState["unitSizeUnit"]))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"><option value="">Unit</option>{flatUnitOptions.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></div></div>
            <div><InventoryFieldHelp label="Purchase date" help="When this pack or item was bought. Used to build consumption history." optional /><ThemedDateInput value={toDateInputValue(formData.lastPurchaseDate)} onChange={(value) => updateFormValue("lastPurchaseDate", value || undefined)} max={getTodayDateInputValue()} />{fieldErrors.lastPurchaseDate ? <p className="mt-2 text-sm text-red-600">{fieldErrors.lastPurchaseDate[0]}</p> : null}</div>
            <div><InventoryFieldHelp label="Finished / ended date" help="Set this when a pack was fully used up. If unit size is known, the app can suggest daily usage from purchase to finish." optional /><ThemedDateInput value={toDateInputValue(formData.lastConsumptionDate)} onChange={(value) => updateFormValue("lastConsumptionDate", value || undefined)} min={toDateInputValue(formData.lastPurchaseDate) || undefined} max={getTodayDateInputValue()} />{fieldErrors.lastConsumptionDate ? <p className="mt-2 text-sm text-red-600">{fieldErrors.lastConsumptionDate[0]}</p> : null}</div>
            <div><InventoryFieldHelp label="Next restock date" help="Auto-calculated from the item cadence or from stock depletion and daily use. You can still adjust it manually if needed." optional /><ThemedDateInput value={toDateInputValue(formData.nextRestockDate)} onChange={(value) => updateFormValue("nextRestockDate", value || undefined)} min={getTodayDateInputValue()} />{fieldErrors.nextRestockDate ? <p className="mt-2 text-sm text-red-600">{fieldErrors.nextRestockDate[0]}</p> : null}<p className="text-muted mt-2 text-xs">Live estimate: {calculatedNextRestockDate ? <LocalizedDateText value={calculatedNextRestockDate} emptyText="N/A" /> : "Need a cadence or daily use to calculate."}</p></div>
            <div><InventoryFieldHelp label="Expiry date" help="Track shelf-life sensitive items like medicine, food, and personal care products." optional /><ThemedDateInput value={toDateInputValue(formData.expiryDate)} onChange={(value) => updateFormValue("expiryDate", value || undefined)} min={toDateInputValue(formData.lastPurchaseDate) || undefined} />{fieldErrors.expiryDate ? <p className="mt-2 text-sm text-red-600">{fieldErrors.expiryDate[0]}</p> : null}</div>
            <div><InventoryFieldHelp label="Currency" help="This currency is used for the saved unit cost and purchase total." /><input value={formData.preferredCurrencyCode} onChange={(e) => updateFormValue("preferredCurrencyCode", e.target.value.toUpperCase())} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 uppercase dark:bg-white/5" /></div>
            <div><InventoryFieldHelp label="Unit cost" help="Average cost for one sealed unit in your chosen currency." optional /><input type="number" step="0.001" value={formData.averageUnitCost ?? ""} onChange={(e) => updateFormValue("averageUnitCost", e.target.value === "" ? undefined : Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /></div>
            <div><InventoryFieldHelp label="Last total paid" help="What you paid on the last shopping trip for this item or pack." optional /><input type="number" step="0.001" value={formData.lastPurchaseTotalCost ?? ""} onChange={(e) => updateFormValue("lastPurchaseTotalCost", e.target.value === "" ? undefined : Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /></div>
            <div><InventoryFieldHelp label="Estimated daily use" help={`How much is usually consumed per day in ${formatInventoryUnit(formTrackingUnit)}. If purchase and finished dates are present, a live value is calculated for you.`} optional /><input type="number" step="0.001" min="0.001" value={formData.estimatedDailyUsage ?? ""} onChange={(e) => updateFormValue("estimatedDailyUsage", e.target.value === "" ? undefined : Number(e.target.value))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" />{fieldErrors.estimatedDailyUsage ? <p className="mt-2 text-sm text-red-600">{fieldErrors.estimatedDailyUsage[0]}</p> : null}<p className="text-muted mt-2 text-xs">{usageSuggestion != null ? `Live estimate from dates: ${formatNumber(usageSuggestion)} ${formatInventoryUnit(formTrackingUnit)} per day.` : "Add unit size plus purchase and finished dates to calculate this automatically."}{previewDaysRemaining != null ? ` About ${previewDaysRemaining} day(s) remain.` : ""}</p></div>
            <div className="md:col-span-2"><InventoryFieldHelp label="Visual icon" help="Icons make the inventory list faster to scan." optional /><div className="grid grid-cols-4 gap-3 sm:grid-cols-6">{inventoryIconOptions.map((icon) => <button key={icon.value} type="button" onClick={() => updateFormValue("iconKey", icon.value)} className={`rounded-2xl border px-3 py-3 text-center ${formData.iconKey === icon.value ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-[var(--border)] bg-white/70 dark:bg-white/5"}`}><div className="text-2xl">{icon.emoji}</div><div className="mt-1 text-xs">{icon.label}</div></button>)}</div></div>
            <div className="md:col-span-2"><InventoryFieldHelp label="Notes" help="Use this for household context such as where it is stored, who uses it, or why the restock quantity is different." optional /><textarea value={formData.notes ?? ""} onChange={(e) => updateFormValue("notes", e.target.value)} rows={4} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /></div>
          </div>
          <div className="mt-6 flex flex-wrap justify-between gap-3"><Button type="button" onClick={deleteItem} disabled={isDeleting} variant="danger" size="md">{isDeleting ? "Deleting..." : "Delete"}</Button><div className="flex gap-3"><Button type="button" onClick={() => { setFormData(itemToForm(selectedItem)); setTagsText(Array.isArray(selectedItem.tags) ? selectedItem.tags.join(", ") : ""); setFieldErrors({}); setServerError(""); setIsEditing(false); }} variant="secondary" size="md">Cancel</Button><Button type="button" onClick={saveChanges} size="md">Save changes</Button></div></div>
        </>}
      </div></div> : null}
    </div>
  );
}
