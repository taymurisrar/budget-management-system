"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BadgeDollarSign,
  Banknote,
  Coins,
  CreditCard,
  Gem,
  Landmark,
  PiggyBank,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import CurrencySelect from "@/components/currency-select";
import {
  createAccountSchema,
  type CreateAccountFormValues,
  type CreateAccountInput,
} from "@/features/accounts/validations/account.schema";
import { defaultCurrencyCode } from "@/lib/currencies";

const accountGroups = ["debit", "credit", "borrow_lend", "invest", "member"] as const;

const subtypeOptionsByGroup: Record<string, string[]> = {
  debit: ["cash", "debit_card", "bank_account", "wallet"],
  credit: ["credit_card"],
  borrow_lend: ["loan_given", "loan_taken"],
  invest: [
    "psx_stock",
    "cdc_account",
    "mutual_fund_pk",
    "national_savings",
    "roshan_investment",
    "crypto_wallet",
    "precious_metal",
    "forex_holding",
  ],
  member: ["membership", "transport_card"],
};

const iconOptions = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "wallet", label: "Wallet", icon: Wallet },
  { value: "bank_account", label: "Bank", icon: Landmark },
  { value: "debit_card", label: "Debit Card", icon: CreditCard },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "loan_given", label: "Loan Given", icon: BadgeDollarSign },
  { value: "loan_taken", label: "Loan Taken", icon: PiggyBank },
  { value: "psx_stock", label: "PSX Stock", icon: BadgeDollarSign },
  { value: "mutual_fund_pk", label: "Mutual Fund", icon: PiggyBank },
  { value: "national_savings", label: "National Savings", icon: PiggyBank },
  { value: "cdc_account", label: "CDC Account", icon: Landmark },
  { value: "roshan_investment", label: "Roshan Investment", icon: Landmark },
  { value: "crypto_wallet", label: "Crypto Wallet", icon: Coins },
  { value: "precious_metal", label: "Precious Metal", icon: Gem },
  { value: "forex_holding", label: "Forex Holding", icon: BadgeDollarSign },
];

type ApiErrorResponse = {
  message: string;
  errors?: unknown;
};

type CreateAccountSuccessResponse = {
  id: string;
  userId: string;
  name: string;
  group: string;
  subtype: string;
  currencyCode: string;
  iconKey?: string | null;
};

type CreateAccountResponse = CreateAccountSuccessResponse | ApiErrorResponse;

function isApiErrorResponse(value: CreateAccountResponse | null): value is ApiErrorResponse {
  return !!value && "message" in value;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-medium">{children}</label>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm text-red-600">{message}</p>;
}

export default function CreateAccountForm({
  userId,
  defaultCurrencyCode: initialCurrencyCode = defaultCurrencyCode,
}: {
  userId: string;
  defaultCurrencyCode?: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  type CreateAccountFormInput = z.input<typeof createAccountSchema>;

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateAccountFormInput, unknown, CreateAccountFormValues>({
    resolver: zodResolver(createAccountSchema) as never,
    defaultValues: {
      userId,
      name: "",
      note: "",
      group: "debit",
      subtype: "cash",
      currencyCode: initialCurrencyCode,
      iconKey: "cash",
      balance: 0,
      chartColor: "#3B82F6",
      countInAsset: true,
      hideBalance: false,
      creditLimit: 0,
      owed: 0,
      reminder: false,
      sourceAccountId: "",
      metalType: "",
      metalPurity: "",
      metalWeight: 0,
      metalUnit: "gram",
    },
  });

  const selectedGroup = useWatch({ control, name: "group" });
  const selectedSubtype = useWatch({ control, name: "subtype" });

  const subtypeOptions = useMemo(() => {
    return subtypeOptionsByGroup[selectedGroup] ?? [];
  }, [selectedGroup]);

  const onSubmit = async (values: CreateAccountFormValues) => {
    setServerError("");

    const parsedValues: CreateAccountInput = createAccountSchema.parse({
      ...values,
      currencyCode: values.currencyCode.toUpperCase(),
    });

    const response = await fetch("/api/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedValues),
    });

    const contentType = response.headers.get("content-type");
    let result: CreateAccountResponse | null = null;

    if (contentType?.includes("application/json")) {
      result = (await response.json()) as CreateAccountResponse;
    } else {
      const text = await response.text();
      setServerError(`Unexpected response: ${text.slice(0, 120)}`);
      return;
    }

    if (!response.ok) {
      setServerError(isApiErrorResponse(result) ? result.message : "Failed to create account");
      return;
    }

    router.push("/accounts");
    router.refresh();
  };

  return (
    <div className="glass-card mt-8 overflow-hidden">
      <div className="border-b border-[var(--border)] px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-black/90 p-3 text-white dark:bg-white dark:text-black">
            <Landmark className="h-5 w-5" />
          </div>

          <div>
            <h2 className="section-title">Create Account</h2>
            <p className="text-muted mt-1 text-sm">
              Create structured accounts with group-specific fields instead of pretending every account is the same.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-6">
        <input type="hidden" {...register("userId")} />

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Account Group</FieldLabel>
            <select
              {...register("group", {
                onChange: (e) => {
                  const group = e.target.value;
                  const firstSubtype = subtypeOptionsByGroup[group]?.[0];
                  if (firstSubtype) {
                    setValue("subtype", firstSubtype as CreateAccountFormValues["subtype"]);
                    setValue("iconKey", firstSubtype);
                  }
                },
              })}
              className="w-full px-4 py-3"
            >
              {accountGroups.map((group) => (
                <option key={group} value={group}>
                  {group.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
            <FieldError message={errors.group?.message} />
          </div>

          <div>
            <FieldLabel>Subtype</FieldLabel>
            <select
              {...register("subtype", {
                onChange: (e) => setValue("iconKey", e.target.value),
              })}
              className="w-full px-4 py-3"
            >
              {subtypeOptions.map((subtype) => (
                <option key={subtype} value={subtype}>
                  {subtype.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
            <FieldError message={errors.subtype?.message} />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Icon</FieldLabel>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {iconOptions
                .filter((item) => item.value === selectedSubtype || subtypeOptions.includes(item.value))
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.value}
                      onClick={() => setValue("iconKey", item.value)}
                      className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
            </div>
            <input type="hidden" {...register("iconKey")} />
            <FieldError message={errors.iconKey?.message} />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Name of Account</FieldLabel>
            <input
              {...register("name")}
              className="w-full px-4 py-3"
              placeholder="e.g. CBQ Salary Account, Meezan Savings, HBL Credit Card"
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Note / Description</FieldLabel>
            <textarea
              {...register("note")}
              className="w-full rounded-xl px-4 py-3"
              rows={3}
              placeholder="Optional notes about this account"
            />
            <FieldError message={errors.note?.message} />
          </div>

          <div>
            <FieldLabel>Currency</FieldLabel>
            <CurrencySelect {...register("currencyCode")} className="w-full px-4 py-3" />
            <FieldError message={errors.currencyCode?.message} />
          </div>

          {(selectedGroup === "debit" || selectedGroup === "borrow_lend" || selectedGroup === "credit") && (
            <div>
              <FieldLabel>Balance</FieldLabel>
              <input
                type="number"
                step="0.01"
                {...register("balance", { valueAsNumber: true })}
                className="w-full px-4 py-3"
                placeholder="0.00"
              />
              <FieldError message={errors.balance?.message} />
            </div>
          )}

          {selectedGroup === "credit" && (
            <>
              <div>
                <FieldLabel>Credit Limit</FieldLabel>
                <input
                  type="number"
                  step="0.01"
                  {...register("creditLimit", { valueAsNumber: true })}
                  className="w-full px-4 py-3"
                  placeholder="0.00"
                />
                <FieldError message={errors.creditLimit?.message} />
              </div>

              <div>
                <FieldLabel>Owed</FieldLabel>
                <input
                  type="number"
                  step="0.01"
                  {...register("owed", { valueAsNumber: true })}
                  className="w-full px-4 py-3"
                  placeholder="0.00"
                />
                <FieldError message={errors.owed?.message} />
              </div>

              <div>
                <FieldLabel>Billing Date</FieldLabel>
                <input type="date" {...register("billingDate")} className="w-full px-4 py-3" />
                <FieldError message={errors.billingDate?.message} />
              </div>

              <div>
                <FieldLabel>Due Date</FieldLabel>
                <input type="date" {...register("dueDate")} className="w-full px-4 py-3" />
                <FieldError message={errors.dueDate?.message} />
              </div>

              <div className="flex items-center gap-3 rounded-xl border px-4 py-3">
                <input type="checkbox" {...register("reminder")} />
                <span className="text-sm">Enable payment reminder</span>
              </div>
            </>
          )}

          {selectedGroup === "borrow_lend" && (
            <>
              <div>
                <FieldLabel>Source / Destination Account</FieldLabel>
                <input
                  {...register("sourceAccountId")}
                  className="w-full px-4 py-3"
                  placeholder="Account ID or later replace with dropdown"
                />
                <FieldError message={errors.sourceAccountId?.message} />
              </div>

              <div>
                <FieldLabel>Start Date</FieldLabel>
                <input type="date" {...register("startDate")} className="w-full px-4 py-3" />
                <FieldError message={errors.startDate?.message} />
              </div>

              <div>
                <FieldLabel>Due Date</FieldLabel>
                <input type="date" {...register("dueDate")} className="w-full px-4 py-3" />
                <FieldError message={errors.dueDate?.message} />
              </div>
            </>
          )}

          {selectedGroup === "invest" && (
            <>
              {selectedSubtype === "precious_metal" && (
                <>
                  <div>
                    <FieldLabel>Metal Type</FieldLabel>
                    <select {...register("metalType")} className="w-full px-4 py-3">
                      <option value="">Select metal</option>
                      <option value="gold">Gold</option>
                      <option value="silver">Silver</option>
                      <option value="platinum">Platinum</option>
                    </select>
                    <FieldError message={errors.metalType?.message} />
                  </div>

                  <div>
                    <FieldLabel>Purity</FieldLabel>
                    <select {...register("metalPurity")} className="w-full px-4 py-3">
                      <option value="">Select purity</option>
                      <option value="24k">24K</option>
                      <option value="22k">22K</option>
                      <option value="21k">21K</option>
                      <option value="18k">18K</option>
                      <option value="999">999</option>
                      <option value="925">925</option>
                    </select>
                    <FieldError message={errors.metalPurity?.message} />
                  </div>

                  <div>
                    <FieldLabel>Weight</FieldLabel>
                    <input
                      type="number"
                      step="0.001"
                      {...register("metalWeight", { valueAsNumber: true })}
                      className="w-full px-4 py-3"
                      placeholder="0"
                    />
                    <FieldError message={errors.metalWeight?.message} />
                  </div>

                  <div>
                    <FieldLabel>Unit</FieldLabel>
                    <select {...register("metalUnit")} className="w-full px-4 py-3">
                      <option value="gram">Gram</option>
                      <option value="tola">Tola</option>
                      <option value="ounce">Ounce</option>
                    </select>
                    <FieldError message={errors.metalUnit?.message} />
                  </div>
                </>
              )}

              {["psx_stock", "cdc_account", "mutual_fund_pk", "national_savings", "roshan_investment", "forex_holding", "crypto_wallet"].includes(
                selectedSubtype
              ) && (
                <div className="md:col-span-2 rounded-2xl border border-[var(--border)] bg-white/50 p-4 dark:bg-white/5">
                  <p className="text-sm font-medium">Pakistan-focused investment setup</p>
                  <p className="text-muted mt-1 text-sm">
                    Good. This is the part where we stop pretending all investing means “US stocks only”.
                    You can later extend this with broker name, account number, symbol/fund code, units,
                    average buy price, and current valuation.
                  </p>
                </div>
              )}
            </>
          )}

          <div>
            <FieldLabel>Chart Color</FieldLabel>
            <input type="color" {...register("chartColor")} className="h-12 w-full rounded-xl" />
            <FieldError message={errors.chartColor?.message} />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 rounded-xl border px-4 py-3">
              <input type="checkbox" {...register("countInAsset")} />
              <span className="text-sm">Count in assets</span>
            </label>

            <label className="flex items-center gap-3 rounded-xl border px-4 py-3">
              <input type="checkbox" {...register("hideBalance")} />
              <span className="text-sm">Hide balance</span>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white/50 p-4 dark:bg-white/5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 text-blue-600" />
            <div className="text-sm">
              <p className="font-medium">Design note</p>
              <p className="text-muted mt-1">
                Keep common fields on the base account, and store subtype-specific fields separately or in a metadata JSON column.
                Otherwise this turns into a swamp by sprint three.
              </p>
            </div>
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
            {isSubmitting ? "Creating..." : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
