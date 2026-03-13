"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import LocalizedDateText from "@/components/localized-date-text";
import { getAccountIcon, getTransactionCategoryIcon } from "@/features/transactions/transaction-option-icons";

type TransactionListItem = {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  currencyCode: string | null;
  exchangeRate: number | null;
  transactionDate: string;
  note: string | null;
  merchant: string | null;
  tags: string[];
  account: {
    name: string;
    currencyCode: string;
    iconKey: string | null;
  };
  transferAccount: {
    name: string;
    currencyCode: string;
    iconKey: string | null;
  } | null;
  category: {
    name: string;
    iconKey: string | null;
  } | null;
  subcategory: {
    name: string;
    iconKey: string | null;
  } | null;
};

export default function TransactionManagementClient({
  transactions,
}: {
  transactions: TransactionListItem[];
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteTransaction(id: string) {
    const confirmed = window.confirm("Delete this transaction and reverse its balance effect?");
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = (await response.json()) as { message?: string };
        throw new Error(result.message || "Failed to delete transaction");
      }

      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to delete transaction");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="app-shell py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="text-muted mt-2">
            Full transaction history with transfers, categories, tags, and edit controls.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/settings"
            className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium shadow-sm"
          >
            Manage Global Categories
          </Link>
          <Link
            href="/transactions/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-black"
          >
            <Plus className="h-4 w-4" />
            New Transaction
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4">
        {transactions.map((transaction) => {
          const AccountIcon = getAccountIcon(transaction.account.iconKey);
          const CategoryIcon = getTransactionCategoryIcon(
            transaction.subcategory?.iconKey ?? transaction.category?.iconKey
          );

          return (
            <div
              key={transaction.id}
              className="glass-card rounded-[28px] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black/90 text-white dark:bg-white dark:text-black">
                    <AccountIcon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold capitalize">{transaction.type}</p>
                      <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs dark:bg-white/10">
                        <LocalizedDateText value={transaction.transactionDate} kind="datetime" />
                      </span>
                    </div>
                    <p className="text-muted mt-2 text-sm">
                      {transaction.type === "transfer" && transaction.transferAccount
                        ? `${transaction.account.name} -> ${transaction.transferAccount.name}`
                        : transaction.account.name}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {transaction.category ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                          <CategoryIcon className="h-3.5 w-3.5" />
                          {transaction.category.name}
                          {transaction.subcategory ? ` / ${transaction.subcategory.name}` : ""}
                        </span>
                      ) : null}
                      {transaction.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                        >
                          <Tags className="h-3.5 w-3.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    {transaction.note || transaction.merchant ? (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                        {transaction.merchant ? `${transaction.merchant} • ` : ""}
                        {transaction.note}
                      </p>
                    ) : null}
                    {transaction.type === "transfer" && transaction.transferAccount ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {transaction.exchangeRate
                          ? `Rate ${transaction.exchangeRate.toFixed(8)} • `
                          : ""}
                        {transaction.account.currencyCode} {"->"}{" "}
                        {transaction.transferAccount.currencyCode}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <p
                    className={`text-lg font-semibold ${
                      transaction.type === "income"
                        ? "financial-positive"
                        : transaction.type === "expense"
                        ? "financial-negative"
                        : ""
                    }`}
                  >
                    {transaction.amount.toFixed(2)} {transaction.currencyCode ?? transaction.account.currencyCode}
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href={`/transactions/${transaction.id}/edit`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-3 py-2 text-sm"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={deletingId === transaction.id}
                      onClick={() => void deleteTransaction(transaction.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-2 text-sm text-red-700 disabled:opacity-50 dark:border-red-500/20 dark:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === transaction.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {transactions.length === 0 ? (
          <div className="glass-card rounded-[28px] p-8 text-center">
            <p className="text-lg font-semibold">No transactions yet</p>
            <p className="text-muted mt-2">
              Create your first income, expense, or transfer entry to start tracking activity.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
