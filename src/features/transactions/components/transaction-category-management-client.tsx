"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { createElement, useMemo, useState } from "react";
import {
  getTransactionCategoryIcon,
  transactionIconChoices,
} from "@/features/transactions/transaction-option-icons";

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
  const result = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(result.message || "Request failed");
  }
  return result;
}

function IconPreview({ iconKey }: { iconKey: string | null | undefined }) {
  return createElement(getTransactionCategoryIcon(iconKey), {
    className: "h-4 w-4",
  });
}

export default function TransactionCategoryManagementClient({
  userId,
  initialCategories,
}: {
  userId: string;
  initialCategories: CategoryRecord[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [subcategoryDrafts, setSubcategoryDrafts] = useState<Record<string, SubcategoryFormState>>(
    {}
  );
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const groupedCategories = useMemo(
    () => ({
      income: categories.filter((category) => category.type === "income"),
      expense: categories.filter((category) => category.type === "expense"),
    }),
    [categories]
  );

  function resetCategoryForm() {
    setCategoryForm(emptyCategoryForm);
    setEditingCategoryId(null);
  }

  async function reloadCategories() {
    const response = await fetch(`/api/transaction-categories?userId=${userId}`);
    const result = await readJson<CategoryRecord[]>(response);
    setCategories(result);
  }

  async function saveCategory() {
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
  }

  async function removeCategory(id: string) {
    if (!window.confirm("Delete this category and detach it from existing transactions?")) {
      return;
    }

    const response = await fetch(`/api/transaction-categories/${id}`, {
      method: "DELETE",
    });

    await readJson(response);
    await reloadCategories();
    setStatusMessage("Category deleted.");
  }

  async function saveSubcategory(categoryId: string, subcategoryId?: string) {
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
  }

  async function removeSubcategory(id: string) {
    if (!window.confirm("Delete this subcategory and detach it from existing transactions?")) {
      return;
    }

    const response = await fetch(`/api/transaction-subcategories/${id}`, {
      method: "DELETE",
    });

    await readJson(response);
    await reloadCategories();
    setStatusMessage("Subcategory deleted.");
  }

  function renderEditorFields(
    form: CategoryFormState | SubcategoryFormState,
    onChange: (next: CategoryFormState | SubcategoryFormState) => void,
    includeType: boolean
  ) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
          placeholder="Name"
        />
        {includeType ? (
          <select
            value={(form as CategoryFormState).type}
            onChange={(event) =>
              onChange({
                ...(form as CategoryFormState),
                type: event.target.value as "income" | "expense",
              })
            }
            className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        ) : null}
        <select
          value={form.iconKey}
          onChange={(event) => onChange({ ...form, iconKey: event.target.value })}
          className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
        >
          {transactionIconChoices.map((iconKey) => (
            <option key={iconKey} value={iconKey}>
              {iconKey}
            </option>
          ))}
        </select>
        <input
          value={form.colorHex}
          onChange={(event) => onChange({ ...form, colorHex: event.target.value })}
          className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
          placeholder="#2563eb"
        />
        <input
          type="number"
          value={form.sortOrder}
          onChange={(event) =>
            onChange({ ...form, sortOrder: Number(event.target.value || 0) })
          }
          className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
          placeholder="Sort order"
        />
        <label className="flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => onChange({ ...form, isActive: event.target.checked })}
          />
          Active
        </label>
      </div>
    );
  }

  function renderCategorySection(type: "income" | "expense", items: CategoryRecord[]) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title capitalize">{type} Categories</h2>
          <span className="rounded-full bg-black/5 px-3 py-1 text-xs dark:bg-white/10">
            {items.length} total
          </span>
        </div>

        {items.map((category) => (
          <div key={category.id} className="glass-card rounded-[28px] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: category.colorHex || "rgba(15, 23, 42, 0.08)",
                    }}
                  >
                    <IconPreview iconKey={category.iconKey} />
                  </span>
                  <div>
                    <p className="font-semibold">{category.name}</p>
                    <p className="text-muted text-sm">
                      {category.type} • {category.isActive ? "active" : "inactive"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {category.subcategories.map((subcategory) => (
                    <span
                      key={subcategory.id}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                    >
                      <IconPreview iconKey={subcategory.iconKey} />
                      {subcategory.name}
                    </span>
                  ))}
                  {category.subcategories.length === 0 ? (
                    <span className="rounded-full bg-black/5 px-3 py-1.5 text-xs dark:bg-white/10">
                      No subcategories yet
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
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
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void removeCategory(category.id)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-white/50 p-4 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Subcategories</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSubcategoryId(null);
                    setSubcategoryDrafts((current) => ({
                      ...current,
                      [category.id]: emptySubcategoryForm,
                    }));
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  New Subcategory
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {category.subcategories.map((subcategory) => (
                  <div
                    key={subcategory.id}
                    className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <IconPreview iconKey={subcategory.iconKey} />
                        <p className="font-medium">{subcategory.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
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
                          className="rounded-2xl border border-[var(--border)] px-3 py-2 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeSubcategory(subcategory.id)}
                          className="rounded-2xl border border-red-200 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {editingSubcategoryId === subcategory.id ? (
                      <div className="space-y-3">
                        {renderEditorFields(
                          subcategoryDrafts[category.id] ?? emptySubcategoryForm,
                          (next) =>
                            setSubcategoryDrafts((current) => ({
                              ...current,
                              [category.id]: next as SubcategoryFormState,
                            })),
                          false
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void saveSubcategory(category.id, subcategory.id)}
                            className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSubcategoryId(null)}
                            className="rounded-2xl border border-[var(--border)] px-4 py-2 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}

                {editingSubcategoryId == null ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] p-4">
                    {renderEditorFields(
                      subcategoryDrafts[category.id] ?? emptySubcategoryForm,
                      (next) =>
                        setSubcategoryDrafts((current) => ({
                          ...current,
                          [category.id]: next as SubcategoryFormState,
                        })),
                      false
                    )}
                    <button
                      type="button"
                      onClick={() => void saveSubcategory(category.id)}
                      className="mt-3 rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
                    >
                      Add Subcategory
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <div className="app-shell py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/transactions" className="inline-flex items-center gap-2 text-sm text-slate-500">
            <ArrowLeft className="h-4 w-4" />
            Back to Transactions
          </Link>
          <h1 className="page-title mt-3">Transaction Categories</h1>
          <p className="text-muted mt-2">
            Maintain income and expense categories separately, then attach subcategories under each one.
          </p>
        </div>
      </div>

      <div className="glass-card mt-8 rounded-[32px] p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">
              {editingCategoryId ? "Edit Category" : "New Category"}
            </h2>
            <p className="text-muted mt-1 text-sm">
              Categories are grouped by income or expense. Subcategories inherit that grouping.
            </p>
          </div>
          {statusMessage ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              {statusMessage}
            </span>
          ) : null}
        </div>

        <div className="mt-5 space-y-3">
          {renderEditorFields(
            categoryForm,
            (next) => setCategoryForm(next as CategoryFormState),
            true
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void saveCategory()}
              className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              {editingCategoryId ? "Save Changes" : "Create Category"}
            </button>
            {editingCategoryId ? (
              <button
                type="button"
                onClick={resetCategoryForm}
                className="rounded-2xl border border-[var(--border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        {renderCategorySection("income", groupedCategories.income)}
        {renderCategorySection("expense", groupedCategories.expense)}
      </div>
    </div>
  );
}
