"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  createTransactionSchema,
  transactionTypes,
  type CreateTransactionFormValues,
  type CreateTransactionInput,
} from "@/features/transactions/validations/transaction.schema";

type AccountOption = {
  id: string;
  name: string;
  currencyCode: string;
};

type CategoryOption = {
  id: string;
  name: string;
};

type ApiErrorResponse = {
  message: string;
  errors?: unknown;
};

type CreateTransactionSuccessResponse = {
  id: string;
};

type CreateTransactionResponse =
  | CreateTransactionSuccessResponse
  | ApiErrorResponse;

function isApiErrorResponse(
  value: CreateTransactionResponse | null
): value is ApiErrorResponse {
  return !!value && "message" in value;
}

export default function CreateTransactionForm({
  userId,
  accounts,
  categories,
}: {
  userId: string;
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionFormValues>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      userId,
      accountId: accounts[0]?.id ?? "",
      type: "expense",
      amount: 0,
      categoryId: categories[0]?.id ?? "",
      subcategoryId: "",
      transactionDate: new Date().toISOString().slice(0, 10),
      note: "",
      merchant: "",
      paymentMethod: "",
    },
  });

  const onSubmit = async (values: CreateTransactionFormValues) => {
    setServerError("");

    const parsedValues: CreateTransactionInput = createTransactionSchema.parse(values);

    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedValues),
    });

    const contentType = response.headers.get("content-type");
    let result: CreateTransactionResponse | null = null;

    if (contentType?.includes("application/json")) {
      result = (await response.json()) as CreateTransactionResponse;
    } else {
      const text = await response.text();
      setServerError(`Unexpected response: ${text.slice(0, 120)}`);
      return;
    }

    if (!response.ok) {
      setServerError(
        isApiErrorResponse(result)
          ? result.message
          : "Failed to create transaction"
      );
      return;
    }

    router.push("/transactions");
    router.refresh();
  };

  return (
    <div className="glass-card mt-8 overflow-hidden">
      <div className="border-b border-[var(--border)] px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-black/90 p-3 text-white dark:bg-white dark:text-black">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div>
            <h2 className="section-title">Create Transaction</h2>
            <p className="text-muted mt-1 text-sm">
              Record income or expense and update account balance safely.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-6">
        <input type="hidden" {...register("userId")} />

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Type</label>
            <select {...register("type")} className="w-full px-4 py-3">
              {transactionTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="mt-2 text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Account</label>
            <select {...register("accountId")} className="w-full px-4 py-3">
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currencyCode})
                </option>
              ))}
            </select>
            {errors.accountId && (
              <p className="mt-2 text-sm text-red-600">{errors.accountId.message}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Amount</label>
            <input
              type="number"
              step="0.01"
              {...register("amount")}
              className="w-full px-4 py-3"
              placeholder="0.00"
            />
            {errors.amount && (
              <p className="mt-2 text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Date</label>
            <input
              type="date"
              {...register("transactionDate")}
              className="w-full px-4 py-3"
            />
            {errors.transactionDate && (
              <p className="mt-2 text-sm text-red-600">
                {errors.transactionDate.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Category</label>
            <select {...register("categoryId")} className="w-full px-4 py-3">
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Merchant</label>
            <input
              {...register("merchant")}
              className="w-full px-4 py-3"
              placeholder="e.g. Carrefour"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Note</label>
            <textarea
              {...register("note")}
              className="w-full px-4 py-3"
              rows={4}
              placeholder="Optional note"
            />
          </div>
        </div>

        {serverError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {serverError}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white shadow-lg transition hover:-translate-y-0.5 hover:opacity-95 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {isSubmitting ? "Saving..." : "Create Transaction"}
          </button>
        </div>
      </form>
    </div>
  );
}