"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { createElement, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
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
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm">
          <span>Active</span>
          <Toggle
            checked={form.isActive}
            onClick={() => onChange({ ...form, isActive: !form.isActive })}
            aria-label="Toggle active state"
          />
        </label>
      </div>
    );
  }

  function renderCategorySection(type: "income" | "expense", items: CategoryRecord[]) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title capitalize">{type} Categories</h2>
          <Badge className="px-3 py-1">
            {items.length} total
          </Badge>
        </div>

        {items.map((category) => (
          <Card key={category.id} className="rounded-[28px] p-5">
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
                    <Badge
                      key={subcategory.id}
                      variant="blue"
                      className="inline-flex items-center gap-2 px-3 py-1.5"
                    >
                      <IconPreview iconKey={subcategory.iconKey} />
                      {subcategory.name}
                    </Badge>
                  ))}
                  {category.subcategories.length === 0 ? (
                    <Badge className="px-3 py-1.5">
                      No subcategories yet
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
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
                  variant="secondary"
                  size="sm"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  onClick={() => void removeCategory(category.id)}
                  variant="danger"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-white/50 p-4 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Subcategories</p>
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
                >
                  <Plus className="h-4 w-4" />
                  New Subcategory
                </Button>
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
                          variant="secondary"
                          size="sm"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => void removeSubcategory(subcategory.id)}
                          variant="danger"
                          size="sm"
                        >
                          Delete
                        </Button>
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
                          <Button
                            onClick={() => void saveSubcategory(category.id, subcategory.id)}
                            size="sm"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={() => setEditingSubcategoryId(null)}
                            variant="secondary"
                            size="sm"
                          >
                            Cancel
                          </Button>
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
                    <Button
                      onClick={() => void saveSubcategory(category.id)}
                      size="sm"
                      className="mt-3"
                    >
                      Add Subcategory
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </section>
    );
  }

  return (
    <div className={embedded ? "" : "app-shell py-8"}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          {!embedded ? (
            <Link href="/transactions" className="inline-flex items-center gap-2 text-sm text-slate-500">
              <ArrowLeft className="h-4 w-4" />
              Back to Transactions
            </Link>
          ) : null}
          <h1 className={`page-title ${embedded ? "" : "mt-3"}`}>Global Categories</h1>
          <p className="text-muted mt-2">
            Manage one shared category and subcategory taxonomy for transactions, accounts, and inventory.
          </p>
        </div>
      </div>

      <Card className="mt-8 rounded-[32px] p-6">
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
            <Badge variant="success" className="px-3 py-1">
              {statusMessage}
            </Badge>
          ) : null}
        </div>

        <div className="mt-5 space-y-3">
          {renderEditorFields(
            categoryForm,
            (next) => setCategoryForm(next as CategoryFormState),
            true
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => void saveCategory()}
              size="sm"
            >
              {editingCategoryId ? "Save Changes" : "Create Category"}
            </Button>
            {editingCategoryId ? (
              <Button
                onClick={resetCategoryForm}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        {renderCategorySection("income", groupedCategories.income)}
        {renderCategorySection("expense", groupedCategories.expense)}
      </div>
    </div>
  );
}
