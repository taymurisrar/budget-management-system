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
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, FormLabel, Input, Select, Textarea, inputClassName } from "@/components/ui/form-controls";
import AccountCheckboxField from "@/features/accounts/components/account-checkbox-field";
import AccountFormSection from "@/features/accounts/components/account-form-section";
import AccountIconOptionButton from "@/features/accounts/components/account-icon-option-button";
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

type CategoryOption = {
  id: string;
  name: string;
  subcategories: Array<{
    id: string;
    name: string;
  }>;
};

type CreateAccountResponse = CreateAccountSuccessResponse | ApiErrorResponse;

function isApiErrorResponse(value: CreateAccountResponse | null): value is ApiErrorResponse {
  return !!value && "message" in value;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <FormLabel>{children}</FormLabel>;
}

function FieldError({ message }: { message?: string }) {
  return <FormError message={message} />;
}

export default function CreateAccountForm({
  userId,
  defaultCurrencyCode: initialCurrencyCode = defaultCurrencyCode,
  categories,
}: {
  userId: string;
  defaultCurrencyCode?: string;
  categories: CategoryOption[];
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
      categoryId: "",
      subcategoryId: "",
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
  const selectedIconKey = useWatch({ control, name: "iconKey" });
  const selectedCategoryId = useWatch({ control, name: "categoryId" });

  const subtypeOptions = useMemo(() => subtypeOptionsByGroup[selectedGroup] ?? [], [selectedGroup]);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );

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
    <Card className="overflow-hidden">
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 px-6 py-6">
        <input type="hidden" {...register("userId")} />

        <AccountFormSection
          title="Account basics"
          description="Set the account type, naming, icon, and classification."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>Account Group</FieldLabel>
              <Select
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
              >
                {accountGroups.map((group) => (
                  <option key={group} value={group}>
                    {group.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.group?.message} />
            </div>

            <div>
              <FieldLabel>Subtype</FieldLabel>
              <Select
                {...register("subtype", {
                  onChange: (e) => setValue("iconKey", e.target.value),
                })}
              >
                {subtypeOptions.map((subtype) => (
                  <option key={subtype} value={subtype}>
                    {subtype.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.subtype?.message} />
            </div>

            <div className="md:col-span-2">
              <FieldLabel>Icon</FieldLabel>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {iconOptions
                  .filter((item) => item.value === selectedSubtype || subtypeOptions.includes(item.value))
                  .map((item) => (
                    <AccountIconOptionButton
                      key={item.value}
                      icon={item.icon}
                      label={item.label}
                      selected={selectedIconKey === item.value}
                      onClick={() => setValue("iconKey", item.value)}
                    />
                  ))}
              </div>
              <input type="hidden" {...register("iconKey")} />
              <FieldError message={errors.iconKey?.message} />
            </div>

            <div className="md:col-span-2">
              <FieldLabel>Name of Account</FieldLabel>
              <Input
                {...register("name")}
                placeholder="e.g. CBQ Salary Account, Meezan Savings, HBL Credit Card"
              />
              <FieldError message={errors.name?.message} />
            </div>

            <div className="md:col-span-2">
              <FieldLabel>Note / Description</FieldLabel>
              <Textarea
                {...register("note")}
                rows={3}
                placeholder="Optional notes about this account"
              />
              <FieldError message={errors.note?.message} />
            </div>

            <div>
              <FieldLabel>Global Category</FieldLabel>
              <Select {...register("categoryId")}>
                <option value="">Optional classification</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.categoryId?.message} />
            </div>

            <div>
              <FieldLabel>Global Subcategory</FieldLabel>
              <Select {...register("subcategoryId")} disabled={!selectedCategory}>
                <option value="">Optional subcategory</option>
                {(selectedCategory?.subcategories ?? []).map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.subcategoryId?.message} />
            </div>

            <div>
              <FieldLabel>Currency</FieldLabel>
              <CurrencySelect {...register("currencyCode")} className={inputClassName()} />
              <FieldError message={errors.currencyCode?.message} />
            </div>
          </div>
        </AccountFormSection>

        <AccountFormSection
          title="Financial settings"
          description="Fields adapt to the selected group and subtype."
        >
          <div className="grid gap-5 md:grid-cols-2">
            {(selectedGroup === "debit" || selectedGroup === "borrow_lend" || selectedGroup === "credit") && (
              <div>
                <FieldLabel>Balance</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  {...register("balance", { valueAsNumber: true })}
                  placeholder="0.00"
                />
                <FieldError message={errors.balance?.message} />
              </div>
            )}

            {selectedGroup === "credit" && (
              <>
                <div>
                  <FieldLabel>Credit Limit</FieldLabel>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("creditLimit", { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  <FieldError message={errors.creditLimit?.message} />
                </div>

                <div>
                  <FieldLabel>Owed</FieldLabel>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("owed", { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  <FieldError message={errors.owed?.message} />
                </div>

                <div>
                  <FieldLabel>Billing Date</FieldLabel>
                  <Input type="date" {...register("billingDate")} />
                  <FieldError message={errors.billingDate?.message} />
                </div>

                <div>
                  <FieldLabel>Due Date</FieldLabel>
                  <Input type="date" {...register("dueDate")} />
                  <FieldError message={errors.dueDate?.message} />
                </div>

                <AccountCheckboxField label="Enable payment reminder" {...register("reminder")} />
              </>
            )}

            {selectedGroup === "borrow_lend" && (
              <>
                <div>
                  <FieldLabel>Source / Destination Account</FieldLabel>
                  <Input
                    {...register("sourceAccountId")}
                    placeholder="Account ID or later replace with dropdown"
                  />
                  <FieldError message={errors.sourceAccountId?.message} />
                </div>

                <div>
                  <FieldLabel>Start Date</FieldLabel>
                  <Input type="date" {...register("startDate")} />
                  <FieldError message={errors.startDate?.message} />
                </div>

                <div>
                  <FieldLabel>Due Date</FieldLabel>
                  <Input type="date" {...register("dueDate")} />
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
                      <Select {...register("metalType")}>
                        <option value="">Select metal</option>
                        <option value="gold">Gold</option>
                        <option value="silver">Silver</option>
                        <option value="platinum">Platinum</option>
                      </Select>
                      <FieldError message={errors.metalType?.message} />
                    </div>

                    <div>
                      <FieldLabel>Purity</FieldLabel>
                      <Select {...register("metalPurity")}>
                        <option value="">Select purity</option>
                        <option value="24k">24K</option>
                        <option value="22k">22K</option>
                        <option value="21k">21K</option>
                        <option value="18k">18K</option>
                        <option value="999">999</option>
                        <option value="925">925</option>
                      </Select>
                      <FieldError message={errors.metalPurity?.message} />
                    </div>

                    <div>
                      <FieldLabel>Weight</FieldLabel>
                      <Input
                        type="number"
                        step="0.001"
                        {...register("metalWeight", { valueAsNumber: true })}
                        placeholder="0"
                      />
                      <FieldError message={errors.metalWeight?.message} />
                    </div>

                    <div>
                      <FieldLabel>Unit</FieldLabel>
                      <Select {...register("metalUnit")}>
                        <option value="gram">Gram</option>
                        <option value="tola">Tola</option>
                        <option value="ounce">Ounce</option>
                      </Select>
                      <FieldError message={errors.metalUnit?.message} />
                    </div>
                  </>
                )}

                {["psx_stock", "cdc_account", "mutual_fund_pk", "national_savings", "roshan_investment", "forex_holding", "crypto_wallet"].includes(
                  selectedSubtype
                ) && (
                  <Alert variant="info" className="md:col-span-2">
                    <p className="font-medium">Pakistan-focused investment setup</p>
                    <p className="text-muted mt-1">
                      Extend this later with broker details, symbol or fund code, units, cost basis, and valuation.
                    </p>
                  </Alert>
                )}
              </>
            )}

            <div>
              <FieldLabel>Chart Color</FieldLabel>
              <input type="color" {...register("chartColor")} className="h-12 w-full rounded-xl" />
              <FieldError message={errors.chartColor?.message} />
            </div>

            <div className="space-y-3">
              <AccountCheckboxField label="Count in assets" {...register("countInAsset")} />
              <AccountCheckboxField label="Hide balance" {...register("hideBalance")} />
            </div>
          </div>
        </AccountFormSection>

        <Card className="rounded-2xl border border-[var(--border)] bg-white/50 p-4 dark:bg-white/5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 text-blue-600" />
            <div className="text-sm">
              <p className="font-medium">Design note</p>
              <p className="text-muted mt-1">
                Keep common fields on the base account, and store subtype-specific fields separately or in a metadata
                JSON column. Otherwise this turns into a swamp by sprint three.
              </p>
            </div>
          </div>
        </Card>

        {serverError ? (
          <Alert variant="error" className="rounded-xl">
            {serverError}
          </Alert>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="px-5 py-3">
            {isSubmitting ? "Creating..." : "Create Account"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
