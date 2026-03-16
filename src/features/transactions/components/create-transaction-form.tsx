"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createTransactionSchema,
  transactionTypes,
  type CreateTransactionFormValues,
  type CreateTransactionInput,
} from "@/features/transactions/validations/transaction.schema";
import  {TransactionOptionPicker} from "@/features/transactions/icons/transaction-option-picker";
import {
  getAccountIcon,
  getTransactionCategoryIcon,
} from "@/features/transactions/icons/transaction-option-icons";
import {
  formatDateTimeLocalInput,
  formatTagInput,
  parseTagInput,
} from "@/features/transactions/transaction-utils";

type AccountOption = {
  id: string;
  name: string;
  currencyCode: string;
  iconKey?: string | null;
};

type SubcategoryOption = {
  id: string;
  name: string;
  iconKey?: string | null;
  colorHex?: string | null;
  isActive?: boolean;
};

type CategoryOption = {
  id: string;
  name: string;
  type: "income" | "expense";
  iconKey?: string | null;
  colorHex?: string | null;
  isActive?: boolean;
  subcategories?: SubcategoryOption[];
};

type TransactionRecord = {
  id: string;
  accountId: string;
  transferAccountId: string | null;
  type: "income" | "expense" | "transfer";
  amount: number;
  currencyCode: string | null;
  exchangeRate: number | null;
  categoryId: string | null;
  subcategoryId: string | null;
  transactionDate: string;
  merchant: string | null;
  paymentMethod: string | null;
  referenceNumber: string | null;
  externalReference: string | null;
  location: string | null;
  note: string | null;
  tags: string[];
};

type ApiErrorResponse = {
  message: string;
  errors?: unknown;
};

type ExchangeRateResponse = {
  rate: number;
  rateDate: string;
  source: string;
  isCached: boolean;
};

function toPickerOptions(
  items: AccountOption[] | CategoryOption[] | SubcategoryOption[],
  kind: "account" | "category" | "subcategory"
) {
  if (kind === "account") {
    return (items as AccountOption[]).map((account) => ({
      id: account.id,
      label: account.name,
      description: account.currencyCode,
      icon: getAccountIcon(account.iconKey),
    }));
  }

  if (kind === "category") {
    return (items as CategoryOption[])
      .filter((category) => category.isActive !== false)
      .map((category) => ({
        id: category.id,
        label: category.name,
        description: category.type,
        icon: getTransactionCategoryIcon(category.iconKey),
        colorHex: category.colorHex,
      }));
  }

  return (items as SubcategoryOption[])
    .filter((subcategory) => subcategory.isActive !== false)
    .map((subcategory) => ({
      id: subcategory.id,
      label: subcategory.name,
      description: "Subcategory",
      icon: getTransactionCategoryIcon(subcategory.iconKey),
      colorHex: subcategory.colorHex,
    }));
}

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as ApiErrorResponse).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return fallback;
}

export default function CreateTransactionForm({
  userId,
  defaultCurrencyCode = "QAR",
  accounts,
  categories,
  transaction,
  mode = "create",
}: {
  userId: string;
  defaultCurrencyCode?: string;
  accounts: AccountOption[];
  categories: CategoryOption[];
  transaction?: TransactionRecord;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [tagsText, setTagsText] = useState(formatTagInput(transaction?.tags));
  const [exchangeRateState, setExchangeRateState] = useState<{
    loading: boolean;
    source: string;
    rateDate: string;
  }>({
    loading: false,
    source: "",
    rateDate: "",
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionFormValues>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      userId,
      accountId: transaction?.accountId ?? accounts[0]?.id ?? "",
      transferAccountId: transaction?.transferAccountId ?? "",
      type: transaction?.type ?? "expense",
      amount: transaction?.amount ?? 0,
      currencyCode:
        transaction?.currencyCode ?? accounts[0]?.currencyCode ?? defaultCurrencyCode,
      exchangeRate: transaction?.exchangeRate ?? 1,
      categoryId: transaction?.categoryId ?? "",
      subcategoryId: transaction?.subcategoryId ?? "",
      transactionDate: transaction
        ? formatDateTimeLocalInput(transaction.transactionDate)
        : formatDateTimeLocalInput(new Date()),
      note: transaction?.note ?? "",
      merchant: transaction?.merchant ?? "",
      paymentMethod: transaction?.paymentMethod ?? "",
      referenceNumber: transaction?.referenceNumber ?? "",
      externalReference: transaction?.externalReference ?? "",
      location: transaction?.location ?? "",
      tags: transaction?.tags ?? [],
    },
  });

  const transactionType = watch("type");
  const sourceAccountId = watch("accountId");
  const destinationAccountId = watch("transferAccountId");
  const transactionDate = watch("transactionDate");
  const amount = Number(watch("amount") ?? 0);
  const selectedCurrencyCode = watch("currencyCode");
  const selectedCategoryId = watch("categoryId");
  const selectedSubcategoryId = watch("subcategoryId");
  const selectedExchangeRate = Number(watch("exchangeRate") ?? 0);

  const sourceAccount = accounts.find((account) => account.id === sourceAccountId) ?? null;
  const destinationAccount =
    accounts.find((account) => account.id === destinationAccountId) ?? null;
  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === transactionType),
    [categories, transactionType]
  );
  const selectedCategory =
    filteredCategories.find((category) => category.id === selectedCategoryId) ?? null;
  const subcategories = useMemo(
    () => selectedCategory?.subcategories ?? [],
    [selectedCategory]
  );

  useEffect(() => {
    if (!sourceAccount) return;
    if (selectedCurrencyCode === sourceAccount.currencyCode) return;
    setValue("currencyCode", sourceAccount.currencyCode, { shouldValidate: true });
  }, [selectedCurrencyCode, setValue, sourceAccount]);

  useEffect(() => {
    if (transactionType === "transfer") {
      if (selectedCategoryId !== "") {
        setValue("categoryId", "");
      }
      if (selectedSubcategoryId !== "") {
        setValue("subcategoryId", "");
      }
      return;
    }

    if (filteredCategories.length === 0) {
      if (selectedCategoryId !== "") {
        setValue("categoryId", "");
      }
      if (selectedSubcategoryId !== "") {
        setValue("subcategoryId", "");
      }
      return;
    }

    if (!filteredCategories.some((category) => category.id === selectedCategoryId)) {
      const nextCategoryId = filteredCategories[0]?.id ?? "";
      if (selectedCategoryId !== nextCategoryId) {
        setValue("categoryId", nextCategoryId);
      }
      if (selectedSubcategoryId !== "") {
        setValue("subcategoryId", "");
      }
    }
  }, [
    filteredCategories,
    selectedCategoryId,
    selectedSubcategoryId,
    setValue,
    transactionType,
  ]);

  useEffect(() => {
    if (!selectedCategory) {
      if (selectedSubcategoryId !== "") {
        setValue("subcategoryId", "");
      }
      return;
    }

    if (
      selectedSubcategoryId !== "" &&
      !subcategories.some((subcategory) => subcategory.id === selectedSubcategoryId)
    ) {
      setValue("subcategoryId", "");
    }
  }, [selectedCategory, selectedSubcategoryId, setValue, subcategories]);

  useEffect(() => {
    async function loadExchangeRate() {
      if (
        transactionType !== "transfer" ||
        !sourceAccount ||
        !destinationAccount ||
        !transactionDate
      ) {
        return;
      }

      if (sourceAccount.currencyCode === destinationAccount.currencyCode) {
        setValue("exchangeRate", 1, { shouldValidate: true });
        setExchangeRateState({
          loading: false,
          source: "Same currency",
          rateDate: transactionDate.slice(0, 10),
        });
        return;
      }

      setExchangeRateState((current) => ({
        ...current,
        loading: true,
      }));

      try {
        const params = new URLSearchParams({
          baseCurrency: sourceAccount.currencyCode,
          quoteCurrency: destinationAccount.currencyCode,
          date: transactionDate,
        });
        const response = await fetch(`/api/exchange-rates?${params.toString()}`);
        const result = (await response.json()) as ExchangeRateResponse | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(normalizeErrorMessage(result, "Failed to fetch exchange rate"));
        }

        const payload = result as ExchangeRateResponse;
        setValue("exchangeRate", Number(payload.rate.toFixed(8)), {
          shouldValidate: true,
        });
        setExchangeRateState({
          loading: false,
          source: payload.source,
          rateDate: payload.rateDate,
        });
      } catch (error) {
        setExchangeRateState({
          loading: false,
          source: normalizeErrorMessage(error, "Manual entry required"),
          rateDate: transactionDate.slice(0, 10),
        });
      }
    }

    void loadExchangeRate();
  }, [
    destinationAccount,
    setValue,
    sourceAccount,
    transactionDate,
    transactionType,
  ]);

  const onSubmit = async (values: CreateTransactionFormValues) => {
    setServerError("");

    const parsedValues: CreateTransactionInput = createTransactionSchema.parse({
      ...values,
      tags: parseTagInput(tagsText),
    });

    const endpoint =
      mode === "edit" && transaction ? `/api/transactions/${transaction.id}` : "/api/transactions";
    const method = mode === "edit" ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedValues),
    });

    const result = (await response.json()) as ApiErrorResponse;
    if (!response.ok) {
      setServerError(normalizeErrorMessage(result, `Failed to ${mode} transaction`));
      return;
    }

    router.push("/transactions");
    router.refresh();
  };

  const sourceAccountOptions = toPickerOptions(accounts, "account");
  const destinationAccountOptions = toPickerOptions(
    accounts.filter((account) => account.id !== sourceAccountId),
    "account"
  );
  const categoryOptions = toPickerOptions(filteredCategories, "category");
  const subcategoryOptions = [
    {
      id: "",
      label: "No subcategory",
      description: "Optional",
      icon: getTransactionCategoryIcon("default"),
    },
    ...toPickerOptions(subcategories, "subcategory"),
  ];
  const destinationPreview =
    transactionType === "transfer" && destinationAccount && sourceAccount
      ? amount * (selectedExchangeRate > 0 ? selectedExchangeRate : 0)
      : 0;

  return (
    <Card className="mt-8 overflow-hidden">
      <div className="border-b border-[var(--border)] px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-black/90 p-3 text-white dark:bg-white dark:text-black">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div>
            <h2 className="section-title">
              {mode === "edit" ? "Edit Transaction" : "Create Transaction"}
            </h2>
            <p className="text-muted mt-1 text-sm">
              Income, expense, and transfer flows with category and FX support.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-6">
        <input type="hidden" {...register("userId")} />

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Type</label>
            <select
              {...register("type")}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
            >
              {transactionTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            {errors.type ? (
              <p className="mt-2 text-sm text-red-600">{errors.type.message}</p>
            ) : null}
          </div>

          <Controller
            name="accountId"
            control={control}
            render={({ field }) => (
              <TransactionOptionPicker
                label={transactionType === "transfer" ? "Source Account" : "Account"}
                value={field.value}
                options={sourceAccountOptions}
                onChange={field.onChange}
                error={errors.accountId?.message}
              />
            )}
          />

          {transactionType === "transfer" ? (
            <Controller
              name="transferAccountId"
              control={control}
              render={({ field }) => (
                <TransactionOptionPicker
                  label="Destination Account"
                  value={field.value ?? ""}
                  options={destinationAccountOptions}
                  onChange={field.onChange}
                  error={errors.transferAccountId?.message}
                />
              )}
            />
          ) : (
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <TransactionOptionPicker
                  label="Category"
                  value={field.value ?? ""}
                  options={categoryOptions}
                  onChange={field.onChange}
                  placeholder="Select a category"
                  error={errors.categoryId?.message}
                />
              )}
            />
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">Amount</label>
            <input
              type="number"
              step="0.01"
              {...register("amount")}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
              placeholder="0.00"
            />
            {errors.amount ? (
              <p className="mt-2 text-sm text-red-600">{errors.amount.message}</p>
            ) : null}
          </div>

          {transactionType === "transfer" ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium">Transfer Currency</label>
                <input
                  {...register("currencyCode")}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 uppercase dark:bg-white/5"
                  maxLength={3}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Defaults to the source account currency.
                </p>
                {errors.currencyCode ? (
                  <p className="mt-2 text-sm text-red-600">{errors.currencyCode.message}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Exchange Rate</label>
                <input
                  type="number"
                  step="0.00000001"
                  {...register("exchangeRate")}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
                  placeholder="1.00000000"
                />
                <p className="mt-2 text-xs text-slate-500">
                  {exchangeRateState.loading
                    ? "Loading latest available rate for the selected date..."
                    : `${exchangeRateState.source || "Rate source"}${
                        exchangeRateState.rateDate ? ` • ${exchangeRateState.rateDate}` : ""
                      }`}
                </p>
                {errors.exchangeRate ? (
                  <p className="mt-2 text-sm text-red-600">{errors.exchangeRate.message}</p>
                ) : null}
              </div>
            </>
          ) : (
            <Controller
              name="subcategoryId"
              control={control}
              render={({ field }) => (
                <TransactionOptionPicker
                  label="Subcategory"
                  value={field.value ?? ""}
                  options={subcategoryOptions}
                  onChange={field.onChange}
                  placeholder="Optional subcategory"
                  error={errors.subcategoryId?.message}
                  disabled={!selectedCategory || subcategoryOptions.length === 0}
                />
              )}
            />
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">Date and Time</label>
            <input
              type="datetime-local"
              {...register("transactionDate")}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
            />
            {errors.transactionDate ? (
              <p className="mt-2 text-sm text-red-600">{errors.transactionDate.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Merchant</label>
            <input
              {...register("merchant")}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
              placeholder="e.g. Carrefour"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Payment Method</label>
            <input
              {...register("paymentMethod")}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
              placeholder="Card, cash, bank transfer"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Reference Number</label>
            <input
              {...register("referenceNumber")}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
              placeholder="Optional receipt or reference id"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">External Reference</label>
            <input
              {...register("externalReference")}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
              placeholder="Optional bank or provider reference"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Location</label>
            <input
              {...register("location")}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
              placeholder="Optional location"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Tags</label>
            <input
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
              placeholder="groceries, weekly, family"
            />
            <p className="mt-2 text-xs text-slate-500">
              Comma-separated tags for search and grouping.
            </p>
          </div>

          {transactionType === "transfer" && sourceAccount && destinationAccount ? (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 px-4 py-4 text-sm text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
              <p className="font-semibold">Transfer preview</p>
              <p className="mt-2">
                {amount.toFixed(2)} {sourceAccount.currencyCode} converts to{" "}
                {destinationPreview.toFixed(2)} {destinationAccount.currencyCode}
              </p>
            </div>
          ) : null}

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Note</label>
            <textarea
              {...register("note")}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
              rows={4}
              placeholder="Optional note"
            />
          </div>
        </div>

        {serverError ? <Alert variant="error" className="rounded-xl">{serverError}</Alert> : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-3"
          >
            {isSubmitting
              ? "Saving..."
              : mode === "edit"
              ? "Update Transaction"
              : "Create Transaction"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
