"use client";

import Link from "next/link";
import { Palette, ArrowLeft, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { createElement, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormLabel, Input, Select } from "@/components/ui/form-controls";
import { Toggle } from "@/components/ui/toggle";
import { TransactionIconPicker } from "@/features/transactions/icons/transaction-icon-picker";
import {
  getTransactionCategoryIcon,
} from "@/features/transactions/icons/transaction-option-icons";
import { cn } from "@/lib/class-names";
type SubcategoryRecord = {
  id: string;
  name: string;
  iconKey: string | null;
  colorHex: string | null;
  sortOrder: number;
  isActive: boolean;
};

type CategoryRecord = {
  id: string;
  userId: string;
  name: string;
  type: "income" | "expense";
  iconKey: string | null;
  colorHex: string | null;
  sortOrder: number;
  isActive: boolean;
  subcategories: SubcategoryRecord[];
};

type CategoryFormState = {
  name: string;
  type: "income" | "expense";
  iconKey: string;
  colorHex: string;
  sortOrder: number;
  isActive: boolean;
};

type SubcategoryFormState = {
  name: string;
  iconKey: string;
  colorHex: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyCategoryForm: CategoryFormState = {
  name: "",
  type: "expense",
  iconKey: "default",
  colorHex: "",
  sortOrder: 0,
  isActive: true,
};

const emptySubcategoryForm: SubcategoryFormState = {
  name: "",
  iconKey: "default",
  colorHex: "",
  sortOrder: 0,
  isActive: true,
};

async function readJson<T>(response: Response) {
  const result = (await response.json()) as T & {
    message?: string;
    errors?: {
      fieldErrors?: Record<string, string[] | undefined>;
      formErrors?: string[];
    };
  };

  if (!response.ok) {
    const fieldError = result.errors?.fieldErrors
      ? Object.values(result.errors.fieldErrors).find((messages) => messages?.length)?.[0]
      : undefined;
    throw new Error(fieldError || result.errors?.formErrors?.[0] || result.message || "Request failed");
  }

  return result;
}

function IconPreview({ iconKey }: { iconKey: string | null | undefined }) {
  return createElement(getTransactionCategoryIcon(iconKey), {
    className: "h-4 w-4",
  });
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <FormLabel className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {label}
      </FormLabel>
      {children}
    </div>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default function TransactionCategoryManagementClient({
  userId,
  initialCategories,
  embedded = false,
}: {
  userId: string;
  initialCategories: CategoryRecord[];
  embedded?: boolean;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [subcategoryDrafts, setSubcategoryDrafts] = useState<Record<string, SubcategoryFormState>>(
    {}
  );
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState("");

  const groupedCategories = useMemo(
    () => ({
      income: categories.filter((category) => category.type === "income"),
      expense: categories.filter((category) => category.type === "expense"),
    }),
    [categories]
  );

  useEffect(() => {
    setCategories(initialCategories);
    setEditingCategoryId(null);
    setEditingSubcategoryId(null);
    setSubcategoryDrafts({});
    setExpandedCategories(Object.fromEntries(initialCategories.map((category) => [category.id, false])));
  }, [initialCategories]);

  function resetCategoryForm() {
    setCategoryForm(emptyCategoryForm);
    setEditingCategoryId(null);
  }

  function toggleCategoryExpanded(categoryId: string) {
    setExpandedCategories((current) => ({
      ...current,
      [categoryId]: !(current[categoryId] ?? true),
    }));
  }

  async function reloadCategories() {
    const response = await fetch(`/api/transaction-categories?userId=${userId}`);
    const result = await readJson<CategoryRecord[]>(response);
    setCategories(result);
  }

  async function saveCategory() {
    try {
      const endpoint = editingCategoryId
        ? `/api/transaction-categories/${editingCategoryId}`
        : "/api/transaction-categories";
      const method = editingCategoryId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          ...categoryForm,
        }),
      });

      await readJson(response);
      await reloadCategories();
      resetCategoryForm();
      setStatusMessage(editingCategoryId ? "Category updated." : "Category created.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to save category.");
    }
  }

  async function removeCategory(id: string) {
    if (!window.confirm("Delete this category and detach it from existing transactions?")) {
      return;
    }

    try {
      const response = await fetch(`/api/transaction-categories/${id}`, {
        method: "DELETE",
      });

      await readJson(response);
      await reloadCategories();
      setStatusMessage("Category deleted.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to delete category.");
    }
  }

  async function saveSubcategory(categoryId: string, subcategoryId?: string) {
    try {
      if (!categories.some((category) => category.id === categoryId)) {
        await reloadCategories();
        throw new Error("The category list was refreshed. Try adding the subcategory again.");
      }

      const form = subcategoryDrafts[categoryId] ?? emptySubcategoryForm;
      const endpoint = subcategoryId
        ? `/api/transaction-subcategories/${subcategoryId}`
        : "/api/transaction-subcategories";
      const method = subcategoryId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          ...form,
        }),
      });

      await readJson(response);
      await reloadCategories();
      setSubcategoryDrafts((current) => ({
        ...current,
        [categoryId]: emptySubcategoryForm,
      }));
      setEditingSubcategoryId(null);
      setStatusMessage(subcategoryId ? "Subcategory updated." : "Subcategory created.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to save subcategory.");
    }
  }

  async function removeSubcategory(id: string) {
    if (!window.confirm("Delete this subcategory and detach it from existing transactions?")) {
      return;
    }

    try {
      const response = await fetch(`/api/transaction-subcategories/${id}`, {
        method: "DELETE",
      });

      await readJson(response);
      await reloadCategories();
      setStatusMessage("Subcategory deleted.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to delete subcategory.");
    }
  }

  function renderEditorFields(
    form: CategoryFormState | SubcategoryFormState,
    onChange: (next: CategoryFormState | SubcategoryFormState) => void,
    variant: "category" | "subcategory"
  ) {
    const isCategory = variant === "category";
    const SelectedIcon = getTransactionCategoryIcon(form.iconKey);
    const selectedColor = form.colorHex || "#2563eb";
    const swatches = [
      "#2563eb",
      "#3b82f6",
      "#1d4ed8",
      "#7c3aed",
      "#8b5cf6",
      "#6d28d9",
      "#db2777",
      "#ec4899",
      "#be185d",
      "#dc2626",
      "#ef4444",
      "#b91c1c",
      "#ea580c",
      "#f97316",
      "#c2410c",
      "#ca8a04",
      "#eab308",
      "#a16207",
      "#16a34a",
      "#22c55e",
      "#15803d",
      "#0891b2",
      "#06b6d4",
      "#0e7490",
      "#475569",
      "#64748b",
      "#334155",
      "#111827",
      "#374151",
      "#6b7280",
    ];

    return (
<div className="space-y-5">
  {isCategory ? (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Name">
        <Input
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          placeholder="e.g. Groceries, Salary, Rent"
        />
      </Field>

      <Field label="Type">
        <Select
          value={(form as CategoryFormState).type}
          onChange={(event) =>
            onChange({
              ...(form as CategoryFormState),
              type: event.target.value as "income" | "expense",
            })
          }
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </Select>
      </Field>
    </div>
  ) : (
    <Field label="Name">
      <Input
        value={form.name}
        onChange={(event) => onChange({ ...form, name: event.target.value })}
        placeholder="e.g. Vegetables, Bonus, Electricity"
      />
    </Field>
  )}

<div className="grid gap-4 md:grid-cols-2 z-50">
  <Field label="Icon" className="relative z-10 overflow-visible">
    <details className="group relative overflow-visible open:z-[80] z-50">
      <summary
        className={cn(
          "flex h-12 w-full list-none items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-4",
          "cursor-pointer bg-white/80 transition-all duration-200 hover:bg-white",
          "dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
        )}
        aria-label="Choose icon"
      >
        <div className="min-w-0 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
            <SelectedIcon className="h-4 w-4" />
          </div>

          <div className="min-w-0 text-left">
            <p className="text-sm font-medium text-[var(--foreground)]">Icon</p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">Select a symbol</p>
          </div>
        </div>

        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div
        className={cn(
          "absolute left-0 top-[calc(100%+10px)] z-[100] min-w-full overflow-hidden rounded-3xl",
          "w-[24rem] max-w-[calc(100vw-2rem)]",
          "border border-black/5 bg-white/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl",
          "dark:border-white/10 dark:bg-[#0f1115]/95 dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
        )}
      >
        <div className="mb-3 px-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">Select icon</p>
        </div>

        <TransactionIconPicker
          value={form.iconKey}
          onChange={(iconKey) => {
            onChange({ ...form, iconKey });
            const details = document.activeElement?.closest("details");
            if (details instanceof HTMLDetailsElement) details.open = false;
          }}
        />
      </div>
    </details>
  </Field>

  <Field label="Color" className="relative z-10 overflow-visible">
    <details className="group relative overflow-visible open:z-[90]">
      <summary
        className={cn(
          "flex h-12 w-full list-none items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-4",
          "cursor-pointer bg-white/80 transition-all duration-200 hover:bg-white",
          "dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
        )}
        aria-label="Choose color"
      >
        <div className="min-w-0 flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/10 dark:border-white/10"
            style={{ backgroundColor: selectedColor }}
          >
            <Palette className="h-4 w-4 text-white" />
          </div>

          <div className="min-w-0 text-left">
            <p className="text-sm font-medium text-[var(--foreground)]">Color</p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">{selectedColor}</p>
          </div>
        </div>

        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div
        className={cn(
          "absolute left-0 top-[calc(100%+10px)] z-[110] min-w-full rounded-3xl",
          "w-[28rem] max-w-[calc(100vw-2rem)]",
          "border border-black/5 bg-white/95 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur-xl",
          "dark:border-white/10 dark:bg-[#0f1115]/95 dark:shadow-[0_24px_70px_rgba(0,0,0,0.5)]"
        )}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Select color</p>
            <p className="text-xs text-[var(--muted-foreground)]">Choose a swatch or enter hex</p>
          </div>

          <div className="w-fit rounded-xl border border-black/5 bg-black/[0.03] px-3 py-1.5 text-xs font-medium dark:border-white/10 dark:bg-white/[0.04]">
            {selectedColor}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="color"
            value={selectedColor}
            onChange={(event) => onChange({ ...form, colorHex: event.target.value })}
            className="h-12 w-14 shrink-0 cursor-pointer rounded-2xl border border-[var(--border)] bg-transparent"
          />

          <div className="flex-1 rounded-2xl border border-[var(--border)] bg-black/[0.025] px-3 py-2.5 dark:bg-white/[0.03]">
            <Input
              value={form.colorHex || ""}
              onChange={(event) => onChange({ ...form, colorHex: event.target.value })}
              placeholder="#2563eb"
              className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-5 gap-3 sm:grid-cols-6 lg:grid-cols-8">
          {swatches.map((color) => {
            const isSelected = selectedColor.toLowerCase() === color.toLowerCase();

            return (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ ...form, colorHex: color })}
                className={cn(
                  "h-9 w-9 rounded-full border-2 transition-transform duration-200 hover:scale-105",
                  isSelected
                    ? "border-black ring-2 ring-black/10 dark:border-white dark:ring-white/15"
                    : "border-transparent"
                )}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
                title={color}
              />
            );
          })}
        </div>
      </div>
    </details>
  </Field>
</div>

<Field label="Visible" className="relative z-0">
  <div className="flex flex-col z-0 gap-3 rounded-3xl border border-[var(--border)] bg-white/75 px-4 py-4 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-[var(--foreground)]">
        {form.isActive ? "Shown in pickers" : "Hidden from pickers"}
      </p>
      <p className="text-xs text-[var(--muted-foreground)]">
        Existing history stays linked.
      </p>
    </div>

    <div className="relative z-0 self-start sm:self-auto">
      <Toggle
        checked={form.isActive}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onChange({ ...form, isActive: !form.isActive });
        }}
        aria-label={form.isActive ? "Hide from pickers" : "Show in pickers"}
      />
    </div>
  </div>
</Field>
</div>
    );
  }

  function renderSubcategoryEditor(categoryId: string, subcategoryId?: string) {
    const isEditing = Boolean(subcategoryId);

    return (
      <div className="relative z-10 rounded-3xl border border-[var(--border)] bg-white/70 p-4 dark:bg-white/[0.04]">
        <SectionHeading
          title={isEditing ? "Edit Subcategory" : "New Subcategory"}
          description="Keep labels short and easy to scan."
        />

        <div className="mt-4 space-y-4">
          {renderEditorFields(
            subcategoryDrafts[categoryId] ?? emptySubcategoryForm,
            (next) =>
              setSubcategoryDrafts((current) => ({
                ...current,
                [categoryId]: next as SubcategoryFormState,
              })),
            "subcategory"
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              onClick={() => void saveSubcategory(categoryId, subcategoryId)}
              size="sm"
              className="w-full sm:w-auto"
            >
              {isEditing ? "Save Changes" : "Add Subcategory"}
            </Button>

            {isEditing ? (
              <Button
                onClick={() => setEditingSubcategoryId(null)}
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

function renderSubcategoryRow(category: CategoryRecord, subcategory: SubcategoryRecord) {
  const isEditing = editingSubcategoryId === subcategory.id;

  return (
    <div
      key={subcategory.id}
      className={cn(
        "relative z-0 rounded-2xl border border-[var(--border)] bg-white/70 p-4 transition-all dark:bg-white/[0.04]",
        isEditing && "z-30 shadow-sm"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: subcategory.colorHex || "rgba(15, 23, 42, 0.08)",
            }}
          >
            <IconPreview iconKey={subcategory.iconKey} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                {subcategory.name}
              </p>

              <span
                className={cn(
                  "inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
                  subcategory.isActive ? "bg-emerald-500" : "bg-slate-400"
                )}
                aria-label={subcategory.isActive ? "Active" : "Hidden"}
                title={subcategory.isActive ? "Active" : "Hidden"}
              />
            </div>

            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {subcategory.isActive ? "Active" : "Hidden"}
              <span className="mx-2 text-xs">•</span>
              Sort {subcategory.sortOrder}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <Button
            onClick={() => {
              setEditingSubcategoryId(subcategory.id);
              setSubcategoryDrafts((current) => ({
                ...current,
                [category.id]: {
                  name: subcategory.name,
                  iconKey: subcategory.iconKey ?? "default",
                  colorHex: subcategory.colorHex ?? "",
                  sortOrder: subcategory.sortOrder,
                  isActive: subcategory.isActive,
                },
              }));
            }}
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-xl p-0"
            aria-label={`Edit ${subcategory.name}`}
            title="Edit subcategory"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <Button
            onClick={() => void removeSubcategory(subcategory.id)}
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-xl p-0 text-red-500 hover:bg-red-500/10 hover:text-red-600"
            aria-label={`Delete ${subcategory.name}`}
            title="Delete subcategory"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          {renderSubcategoryEditor(category.id, subcategory.id)}
        </div>
      ) : null}
    </div>
  );
}

  function renderCategorySection(type: "income" | "expense", items: CategoryRecord[]) {
    const isIncome = type === "income";

    return (
      <section className="space-y-4">
        <SectionHeading
          title={isIncome ? "Income" : "Expenses"}
          description={
            isIncome
              ? "Track incoming money clearly."
              : "Keep expense categories simple and scannable."
          }
          action={
            <Badge className="px-3 py-1 text-xs font-medium">
              {items.length} {items.length === 1 ? "category" : "categories"}
            </Badge>
          }
        />

        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((category) => renderCategoryCard(category))}
          </div>
        ) : (
          <Card className="rounded-3xl border border-dashed border-[var(--border)] bg-white/60 p-5 text-sm text-[var(--muted-foreground)] dark:bg-white/[0.03]">
            No {isIncome ? "income" : "expense"} categories yet.
          </Card>
        )}
      </section>
    );
  }

function renderCategoryCard(category: CategoryRecord) {
  const isExpanded = expandedCategories[category.id] ?? true;
  const isEditingThisCategory = editingCategoryId === category.id;
  const subcategoryCount = category.subcategories.length;
  const isRaised = isExpanded || isEditingThisCategory;

  return (
    <Card
      key={category.id}
      className={cn(
        "group relative z-0 overflow-visible rounded-3xl border border-[var(--border)] bg-white/80 p-4 shadow-sm backdrop-blur-sm transition-all dark:bg-white/[0.04]",
        "hover:shadow-md",
        isRaised && "z-20 shadow-md"
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <button
            type="button"
            onClick={() => toggleCategoryExpanded(category.id)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: category.colorHex || "rgba(15, 23, 42, 0.08)",
              }}
            >
              <IconPreview iconKey={category.iconKey} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-semibold text-[var(--foreground)]">
                  {category.name}
                </h3>

                <span
                  className={cn(
                    "inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
                    category.isActive ? "bg-emerald-500" : "bg-slate-400"
                  )}
                  aria-label={category.isActive ? "Active" : "Hidden"}
                  title={category.isActive ? "Active" : "Hidden"}
                />
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <span>
                  {subcategoryCount} {subcategoryCount === 1 ? "subcategory" : "subcategories"}
                </span>
                <span className="text-xs">•</span>
                <span>{category.isActive ? "Active" : "Hidden"}</span>
                {isEditingThisCategory ? (
                  <>
                    <span className="text-xs">•</span>
                    <span>Edit mode</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-white/70 dark:bg-white/[0.04]">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
              )}
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
            <Button
              onClick={() => {
                setEditingCategoryId(category.id);
                setCategoryForm({
                  name: category.name,
                  type: category.type,
                  iconKey: category.iconKey ?? "default",
                  colorHex: category.colorHex ?? "",
                  sortOrder: category.sortOrder,
                  isActive: category.isActive,
                });
              }}
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-xl p-0"
              aria-label={`Edit ${category.name}`}
              title="Edit category"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => void removeCategory(category.id)}
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-xl p-0 text-red-500 hover:bg-red-500/10 hover:text-red-600"
              aria-label={`Delete ${category.name}`}
              title="Delete category"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isExpanded ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground)]">Subcategories</h4>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Add detail only where it helps.
                </p>
              </div>

              <Button
                onClick={() => {
                  setEditingSubcategoryId(null);
                  setSubcategoryDrafts((current) => ({
                    ...current,
                    [category.id]: emptySubcategoryForm,
                  }));
                }}
                variant="secondary"
                size="sm"
                className="w-full rounded-xl sm:w-auto"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {subcategoryCount > 0 ? (
                category.subcategories.map((subcategory) =>
                  renderSubcategoryRow(category, subcategory)
                )
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted-foreground)]">
                  No subcategories yet.
                </div>
              )}
            </div>

            {editingSubcategoryId == null ? (
              <div className="mt-4">{renderSubcategoryEditor(category.id)}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

  return (
    <div className={embedded ? "" : "app-shell py-8"}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            {!embedded ? (
              <Link href="/transactions" className="inline-flex items-center gap-2 text-sm text-slate-500">
                <ArrowLeft className="h-4 w-4" />
                Back to Transactions
              </Link>
            ) : null}
            <h2 className={`page-title ${embedded ? "" : "mt-3"}`}>Global Categories</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
              Build a simple transaction taxonomy that stays easy for end users to understand during day-to-day entry.
            </p>
          </div>

          {statusMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              {statusMessage}
            </div>
          ) : null}
        </div>

        <Card className="group relative overflow-visible rounded-[34px] border border-black/5 bg-white/80 p-7 shadow-[0_10px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_60px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_10px_40px_rgba(0,0,0,0.35)] dark:hover:shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/[0.04] to-transparent dark:from-white/[0.05]" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-black/[0.04] blur-3xl dark:bg-white/[0.06]" />

          <div className="relative">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <SectionHeading
                  title={editingCategoryId ? "Edit Category" : "Create Category"}
                  description="Start broad. Add subcategories only where users actually need extra detail."
                />
              </div>

              <div className="hidden rounded-2xl border border-black/5 bg-black/[0.03] px-3 py-1.5 text-xs font-medium text-black/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 sm:inline-flex">
                {editingCategoryId ? "Editing mode" : "New entry"}
              </div>
            </div>

            <div className="space-y-5 rounded-[28px] border border-black/5 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.03]">
              {renderEditorFields(
                categoryForm,
                (next) => setCategoryForm(next as CategoryFormState),
                "category"
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button onClick={() => void saveCategory()} size="sm" className="min-w-[140px] shadow-sm">
                  {editingCategoryId ? "Save Changes" : "Create Category"}
                </Button>

                {editingCategoryId ? (
                  <Button
                    onClick={resetCategoryForm}
                    variant="secondary"
                    size="sm"
                    className="min-w-[100px]"
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-8 2xl:grid-cols-2">
          {renderCategorySection("income", groupedCategories.income)}
          {renderCategorySection("expense", groupedCategories.expense)}
        </div>
      </div>
    </div>
  );
}