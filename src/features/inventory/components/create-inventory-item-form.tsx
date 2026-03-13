"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BadgeDollarSign,
  Boxes,
  PackagePlus,
  ShoppingBasket,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import ThemedDateInput from "@/components/themed-date-input";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InventoryFieldHelp } from "@/features/inventory/components/inventory-field-help";
import {
  calculateNextRestockDate,
  calculateSuggestedDailyUsage,
  getEstimatedDaysRemaining,
  getTodayDateInputValue,
  getTrackingUnit,
  usesSizeTracking,
} from "@/features/inventory/inventory-metrics";
import {
  formatInventoryUnit,
  inventoryIconOptions,
  inventoryUnitGroups,
} from "@/features/inventory/inventory-options";
import {
  createInventoryItemSchema,
  type CreateInventoryItemFormValues,
  type CreateInventoryItemInput,
} from "@/features/inventory/validations/inventory-item.schema";
import CurrencySelect from "@/components/currency-select";
import { defaultCurrencyCode } from "@/lib/currencies";

type CategoryOption = {
  id: string;
  name: string;
  iconKey: string | null;
  subcategories: Array<{
    id: string;
    name: string;
  }>;
};

type ApiErrorResponse = {
  message: string;
  errors?: unknown;
};

type CreateInventoryItemSuccessResponse = {
  id: string;
};

type CreateInventoryItemResponse =
  | CreateInventoryItemSuccessResponse
  | ApiErrorResponse;

function isApiErrorResponse(
  value: CreateInventoryItemResponse | null
): value is ApiErrorResponse {
  return !!value && "message" in value;
}

function unitOptions() {
  return inventoryUnitGroups.flatMap((group) => group.units);
}

export default function CreateInventoryItemForm({
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
  const [tagsText, setTagsText] = useState("");
  const lastAutoDailyUsageRef = useRef<number | null>(null);
  const flatUnitOptions = useMemo(() => unitOptions(), []);

  const form = useForm<CreateInventoryItemFormValues, undefined, CreateInventoryItemInput>({
    resolver: zodResolver(createInventoryItemSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      userId,
      categoryId: categories[0]?.id ?? "",
      name: "",
      brand: "",
      subcategory: "",
      tags: [],
      unit: "piece",
      currentQuantity: 1,
      inUseQuantity: undefined,
      minQuantity: 1,
      reorderQuantity: 1,
      packageQuantity: undefined,
      packageUnit: undefined,
      unitSizeValue: undefined,
      unitSizeUnit: undefined,
      householdUserCount: 1,
      restockFrequencyDays: undefined,
      preferredCurrencyCode: initialCurrencyCode,
      averageUnitCost: undefined,
      lastPurchaseTotalCost: undefined,
      estimatedDailyUsage: undefined,
      lastPurchaseDate: undefined,
      lastConsumptionDate: undefined,
      nextRestockDate: undefined,
      expiryDate: undefined,
      notes: "",
      iconKey: "box",
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const selectedCategoryId = useWatch({ control, name: "categoryId" }) as string;
  const selectedUnit = useWatch({ control, name: "unit" }) as CreateInventoryItemFormValues["unit"];
  const selectedIcon = useWatch({ control, name: "iconKey" }) as string | undefined;
  const unitSizeValue = useWatch({ control, name: "unitSizeValue" }) as number | undefined;
  const unitSizeUnit = useWatch({ control, name: "unitSizeUnit" }) as string | undefined;
  const householdUserCount = useWatch({ control, name: "householdUserCount" }) as number;
  const restockFrequencyDays = useWatch({ control, name: "restockFrequencyDays" }) as
    | number
    | undefined;
  const inUseQuantity = useWatch({ control, name: "inUseQuantity" }) as number | undefined;
  const currentQuantity = useWatch({ control, name: "currentQuantity" }) as number;
  const minQuantity = useWatch({ control, name: "minQuantity" }) as number;
  const estimatedDailyUsage = useWatch({ control, name: "estimatedDailyUsage" }) as
    | number
    | undefined;
  const lastPurchaseDate = useWatch({ control, name: "lastPurchaseDate" }) as string | undefined;
  const lastConsumptionDate = useWatch({ control, name: "lastConsumptionDate" }) as
    | string
    | undefined;
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const sizeTrackingEnabled = usesSizeTracking({
    currentQuantity,
    inUseQuantity,
    minQuantity,
    unit: selectedUnit,
    unitSizeValue,
    unitSizeUnit,
  });
  const trackingUnit = getTrackingUnit({
    currentQuantity,
    inUseQuantity,
    minQuantity,
    unit: selectedUnit,
    unitSizeValue,
    unitSizeUnit,
  });
  const usageSuggestion = useMemo(
    () => calculateSuggestedDailyUsage({ unitSizeValue, lastPurchaseDate, lastConsumptionDate }),
    [lastConsumptionDate, lastPurchaseDate, unitSizeValue]
  );
  const previewDaysRemaining = useMemo(
    () =>
      getEstimatedDaysRemaining({
        currentQuantity,
        inUseQuantity,
        minQuantity,
        unit: selectedUnit,
        unitSizeValue,
        unitSizeUnit,
        estimatedDailyUsage: estimatedDailyUsage ?? usageSuggestion ?? undefined,
      }),
    [
      currentQuantity,
      estimatedDailyUsage,
      inUseQuantity,
      minQuantity,
      selectedUnit,
      unitSizeUnit,
      unitSizeValue,
      usageSuggestion,
    ]
  );

  useEffect(() => {
    const wasAutoFilled =
      estimatedDailyUsage != null && estimatedDailyUsage === lastAutoDailyUsageRef.current;

    if (usageSuggestion != null && (estimatedDailyUsage == null || wasAutoFilled)) {
      setValue("estimatedDailyUsage", usageSuggestion, { shouldValidate: true });
      lastAutoDailyUsageRef.current = usageSuggestion;
      return;
    }

    if (usageSuggestion == null && wasAutoFilled) {
      setValue("estimatedDailyUsage", undefined, { shouldValidate: true });
      lastAutoDailyUsageRef.current = null;
    }
  }, [estimatedDailyUsage, setValue, usageSuggestion]);

  useEffect(() => {
    const calculatedNextRestockDate = calculateNextRestockDate(
      {
        currentQuantity,
        inUseQuantity,
        minQuantity,
        unit: selectedUnit,
        unitSizeValue,
        unitSizeUnit,
        estimatedDailyUsage: estimatedDailyUsage ?? usageSuggestion ?? undefined,
        restockFrequencyDays,
      },
      lastPurchaseDate ?? getTodayDateInputValue()
    );

    setValue("nextRestockDate", calculatedNextRestockDate ?? undefined, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [
    currentQuantity,
    estimatedDailyUsage,
    inUseQuantity,
    lastPurchaseDate,
    minQuantity,
    restockFrequencyDays,
    selectedUnit,
    setValue,
    unitSizeUnit,
    unitSizeValue,
    usageSuggestion,
  ]);

  const onSubmit = async (values: CreateInventoryItemInput) => {
    setServerError("");

    const parsedValues: CreateInventoryItemInput = createInventoryItemSchema.parse({
      ...values,
      tags: tagsText,
      preferredCurrencyCode: values.preferredCurrencyCode.toUpperCase(),
      notes: values.notes?.trim() || undefined,
      iconKey: values.iconKey?.trim() || undefined,
    });

    const response = await fetch("/api/inventory/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedValues),
    });

    const contentType = response.headers.get("content-type");
    let result: CreateInventoryItemResponse | null = null;

    if (contentType?.includes("application/json")) {
      result = (await response.json()) as CreateInventoryItemResponse;
    } else {
      const text = await response.text();
      setServerError(`Unexpected response: ${text.slice(0, 140)}`);
      return;
    }

    if (!response.ok) {
      setServerError(
        isApiErrorResponse(result) ? result.message : "Failed to create inventory item"
      );
      return;
    }

    router.push("/inventory");
    router.refresh();
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--border)] px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-black/90 p-3 text-white dark:bg-white dark:text-black">
            <PackagePlus className="h-5 w-5" />
          </div>

          <div>
            <h2 className="section-title">Create Inventory Item</h2>
            <p className="text-muted mt-1 text-sm">
              Build items the way households actually buy and use them: packs, rolls,
              tubes, refill sizes, in-use stock, and restock reminders.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-7 px-6 py-6">
        <input type="hidden" {...register("userId")} />
        <input type="hidden" {...register("iconKey")} />

        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <InventoryFieldHelp
              label="Item name"
              help="Use a practical household name like Colgate toothpaste 100 ml or Fine tissue 9-roll pack."
            />
            <input
              {...register("name")}
              className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
              placeholder="e.g. Sensodyne Toothpaste, Fine Tissue Rolls, Sufi Cooking Oil"
            />
            {errors.name ? (
              <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
            ) : null}
          </div>

          <div>
            <InventoryFieldHelp
              label="Category"
              help="Category groups similar items together in lists, filters, and predictions."
            />
            <select
              {...register("categoryId")}
              className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId ? (
              <p className="mt-2 text-sm text-red-600">{errors.categoryId.message}</p>
            ) : null}
          </div>

          <div>
            <InventoryFieldHelp
              label="Brand"
              help="Useful when the same product exists in different brands or price points."
              optional
            />
            <input
              {...register("brand")}
              className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
              placeholder="e.g. Colgate, Fine, Ariel"
            />
            {errors.brand ? (
              <p className="mt-2 text-sm text-red-600">{errors.brand.message}</p>
            ) : null}
          </div>

          <div>
            <InventoryFieldHelp
              label="Subcategory"
              help="Add a more specific grouping like oral care, laundry, or guest washroom."
              optional
            />
            <input
              {...register("subcategory")}
              className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
              placeholder="e.g. Oral care, Tissue, Laundry"
            />
            {selectedCategory && selectedCategory.subcategories.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedCategory.subcategories.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    type="button"
                    onClick={() => setValue("subcategory", subcategory.name, { shouldValidate: true })}
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                  >
                    {subcategory.name}
                  </button>
                ))}
              </div>
            ) : null}
            {errors.subcategory ? (
              <p className="mt-2 text-sm text-red-600">{errors.subcategory.message}</p>
            ) : null}
          </div>

          <div>
            <InventoryFieldHelp
              label="Tags"
              help="Short labels like bathroom, guest stock, or monthly refill improve search."
              optional
            />
            <input
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
              placeholder="Comma separated tags: bathroom, monthly refill, family staple"
            />
            {errors.tags ? (
              <p className="mt-2 text-sm text-red-600">{errors.tags.message as string}</p>
            ) : null}
          </div>
        </div>

        <Card as="section" tone="soft" className="rounded-[28px] p-5 dark:bg-white/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">Pick a visual icon</h3>
              <p className="text-muted mt-1 text-sm">
                Icons are shown as visual choices so the list scans faster than plain text.
              </p>
            </div>
            <div className="rounded-full border border-[var(--border)] px-3 py-1 text-sm">
              Selected: {inventoryIconOptions.find((icon) => icon.value === selectedIcon)?.emoji ?? "📦"}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
            {inventoryIconOptions.map((icon) => {
              const isSelected = selectedIcon === icon.value;

              return (
                <button
                  key={icon.value}
                  type="button"
                  onClick={() => setValue("iconKey", icon.value, { shouldValidate: true })}
                  className={`rounded-2xl border px-3 py-3 text-center transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-sm dark:bg-blue-500/10"
                      : "border-[var(--border)] bg-white/70 dark:bg-white/5"
                  }`}
                >
                  <div className="text-2xl">{icon.emoji}</div>
                  <div className="mt-1 text-xs font-medium">{icon.label}</div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card as="section" tone="soft" className="rounded-[28px] p-5 dark:bg-white/5">
          <div>
            <h3 className="text-base font-semibold">How do you count this item?</h3>
            <p className="text-muted mt-1 text-sm">
              Choose the main stock unit. Examples: `tube` for toothpaste, `roll` for tissues,
              `kg` for rice, `ml` for liquids.
            </p>
          </div>

          <div className="mt-4 space-y-4">
            {inventoryUnitGroups.map((group) => (
              <div key={group.label}>
                <div className="mb-2">
                  <p className="text-sm font-medium">{group.label}</p>
                  <p className="text-muted text-xs">{group.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.units.map((unit) => {
                    const isSelected = selectedUnit === unit.value;

                    return (
                      <button
                        key={unit.value}
                        type="button"
                        onClick={() => setValue("unit", unit.value, { shouldValidate: true })}
                        className={`rounded-full px-4 py-2 text-sm ${
                          isSelected
                            ? "bg-black text-white dark:bg-white dark:text-black"
                            : "border border-[var(--border)] bg-white/70 dark:bg-white/5"
                        }`}
                      >
                        {unit.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {errors.unit ? <p className="mt-2 text-sm text-red-600">{errors.unit.message}</p> : null}
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          <Card className="rounded-[28px] border border-[var(--border)] bg-white/50 p-5 dark:bg-white/5">
            <h3 className="text-base font-semibold">Pack and size details</h3>
            <p className="text-muted mt-1 text-sm">
              Useful for cases like `9 rolls in one pack` or `200 ml per tube`.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <InventoryFieldHelp
                  label="Pack contains"
                  help="Use this when a shopping pack includes multiple pieces, rolls, or sachets."
                  optional
                />
                <input
                  type="number"
                  step="0.001"
                  {...register("packageQuantity")}
                  className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
                  placeholder="e.g. 9"
                />
                {errors.packageQuantity ? (
                  <p className="mt-2 text-sm text-red-600">{errors.packageQuantity.message}</p>
                ) : null}
              </div>

              <div>
                <InventoryFieldHelp
                  label="Pack unit"
                  help="The unit inside the pack, for example roll, sachet, or bottle."
                  optional
                />
                <select
                  {...register("packageUnit")}
                  className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
                >
                  <option value="">Select unit</option>
                  {flatUnitOptions.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
                {errors.packageUnit ? (
                  <p className="mt-2 text-sm text-red-600">{errors.packageUnit.message}</p>
                ) : null}
              </div>

              <div>
                <InventoryFieldHelp
                  label="Each unit size"
                  help="Enter the size of one sealed item, for example 100 ml per tube or 5 kg per bag."
                  optional
                />
                <input
                  type="number"
                  step="0.001"
                  {...register("unitSizeValue")}
                  className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
                  placeholder="e.g. 200"
                />
                {errors.unitSizeValue ? (
                  <p className="mt-2 text-sm text-red-600">{errors.unitSizeValue.message}</p>
                ) : null}
              </div>

              <div>
                <InventoryFieldHelp
                  label="Size unit"
                  help="This is the measurement used for consumption tracking, such as ml, g, or L."
                  optional
                />
                <select
                  {...register("unitSizeUnit")}
                  className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
                >
                  <option value="">Select size unit</option>
                  {flatUnitOptions.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
                {errors.unitSizeUnit ? (
                  <p className="mt-2 text-sm text-red-600">{errors.unitSizeUnit.message}</p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="rounded-[28px] border border-[var(--border)] bg-white/50 p-5 dark:bg-white/5">
            <h3 className="text-base font-semibold">Usage and reminder logic</h3>
            <p className="text-muted mt-1 text-sm">
              Track sealed stock separately from what is left in the currently opened item.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <InventoryFieldHelp
                  label="Sealed units on hand"
                  help="Count only unopened or fully available stock in storage."
                />
                <input
                  type="number"
                  step="0.001"
                  {...register("currentQuantity")}
                  className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
                  placeholder={`e.g. 2 ${formatInventoryUnit(selectedUnit)}`}
                />
                <p className="text-muted mt-2 text-xs">
                  Example: 2 unopened toothpaste tubes still available in the cupboard.
                </p>
                {errors.currentQuantity ? (
                  <p className="mt-2 text-sm text-red-600">{errors.currentQuantity.message}</p>
                ) : null}
              </div>

              <div>
                <InventoryFieldHelp
                  label={sizeTrackingEnabled ? "Open item amount left" : "Open stock"}
                  help={
                    sizeTrackingEnabled
                      ? `Enter what is still left in the opened item, for example 18 ${formatInventoryUnit(trackingUnit)} left in the current tube.`
                      : "Optional extra stock already opened or partly available."
                  }
                  optional
                />
                <input
                  type="number"
                  step="0.001"
                  {...register("inUseQuantity")}
                  className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
                  placeholder="e.g. 1"
                />
                <p className="text-muted mt-2 text-xs">
                  {sizeTrackingEnabled
                    ? `Example: 18 ${formatInventoryUnit(trackingUnit)} left in the open toothpaste tube.`
                    : "Optional for cases where one item is already open or in use."}
                </p>
                {errors.inUseQuantity ? (
                  <p className="mt-2 text-sm text-red-600">{errors.inUseQuantity.message}</p>
                ) : null}
              </div>

              <div>
                <InventoryFieldHelp
                  label="Remind me when remaining amount reaches"
                  help={`Set the threshold in the consumed amount, for example remind me at 5 ml left. Without size tracking it falls back to the main unit.`}
                />
                <input
                  type="number"
                  step="0.001"
                  {...register("minQuantity")}
                  className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
                  placeholder="e.g. 1"
                />
                <p className="text-muted mt-2 text-xs">
                  Tracked in {formatInventoryUnit(trackingUnit)}.
                </p>
                {errors.minQuantity ? (
                  <p className="mt-2 text-sm text-red-600">{errors.minQuantity.message}</p>
                ) : null}
              </div>

              <div>
                <InventoryFieldHelp
                  label="Usually buy this much next time"
                  help="Your normal restock amount, such as 2 tubes or 1 family pack."
                  optional
                />
                <input
                  type="number"
                  step="0.001"
                  {...register("reorderQuantity")}
                  className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
                  placeholder="e.g. 2"
                />
                <p className="text-muted mt-2 text-xs">
                  Saved in {formatInventoryUnit(selectedUnit)}.
                </p>
                {errors.reorderQuantity ? (
                  <p className="mt-2 text-sm text-red-600">{errors.reorderQuantity.message}</p>
                ) : null}
              </div>

              <div>
                <InventoryFieldHelp
                  label="Household users"
                  help="How many people actively use this item right now. Change it over time to improve demand forecasting."
                />
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  {...register("householdUserCount")}
                  className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
                />
                <p className="text-muted mt-2 text-xs">
                  Current forecast assumes {householdUserCount} active user{householdUserCount === 1 ? "" : "s"}.
                </p>
                {errors.householdUserCount ? (
                  <p className="mt-2 text-sm text-red-600">{errors.householdUserCount.message}</p>
                ) : null}
              </div>

              <div>
                <InventoryFieldHelp
                  label="Restock every"
                  help="Set a fixed purchase rhythm for recurring items, such as milk every 2 days, vegetables every 7 days, or chicken every 15 days."
                  optional
                />
                <input
                  type="number"
                  min="1"
                  max="365"
                  step="1"
                  {...register("restockFrequencyDays")}
                  className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
                  placeholder="e.g. 7"
                />
                <p className="text-muted mt-2 text-xs">
                  Days between planned restocks. Leave blank to use stock depletion forecasting instead.
                </p>
                {errors.restockFrequencyDays ? (
                  <p className="mt-2 text-sm text-red-600">{errors.restockFrequencyDays.message}</p>
                ) : null}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-5 md:grid-cols-4">
          <div>
            <InventoryFieldHelp label="Currency" help="Used for the unit cost and last total paid values." />
            <CurrencySelect
              {...register("preferredCurrencyCode")}
              className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
            />
            {errors.preferredCurrencyCode ? (
              <p className="mt-2 text-sm text-red-600">
                {errors.preferredCurrencyCode.message}
              </p>
            ) : null}
          </div>

          <div>
            <InventoryFieldHelp label={`Cost per ${formatInventoryUnit(selectedUnit)}`} help="Average cost for one sealed unit." optional />
            <input
              type="number"
              step="0.001"
              {...register("averageUnitCost")}
              className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
              placeholder="Optional"
            />
            {errors.averageUnitCost ? (
              <p className="mt-2 text-sm text-red-600">{errors.averageUnitCost.message}</p>
            ) : null}
          </div>

          <div>
            <InventoryFieldHelp label="Last total paid" help="How much you paid on the most recent purchase." optional />
            <input
              type="number"
              step="0.001"
              {...register("lastPurchaseTotalCost")}
              className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
              placeholder="Optional"
            />
            {errors.lastPurchaseTotalCost ? (
              <p className="mt-2 text-sm text-red-600">
                {errors.lastPurchaseTotalCost.message}
              </p>
            ) : null}
          </div>

          <div>
            <InventoryFieldHelp label="Estimated daily use" help={`Daily consumption in ${formatInventoryUnit(trackingUnit)}. If purchase and finished dates are present, a suggestion is calculated for you.`} optional />
            <input
              type="number"
              step="0.001"
              {...register("estimatedDailyUsage")}
              className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
              placeholder="Optional"
            />
            <p className="text-muted mt-2 text-xs">
              {usageSuggestion != null
                ? `Suggested from timeline: ${usageSuggestion} ${formatInventoryUnit(trackingUnit)} per day.`
                : "Add unit size plus purchase and finished dates to auto-suggest this."}
              {previewDaysRemaining != null ? ` About ${previewDaysRemaining} day(s) of stock remain.` : ""}
            </p>
            {errors.estimatedDailyUsage ? (
              <p className="mt-2 text-sm text-red-600">{errors.estimatedDailyUsage.message}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-4">
          <div>
            <InventoryFieldHelp label="Purchase date" help="When this pack or item was bought." optional />
            <Controller
              control={control}
              name="lastPurchaseDate"
              render={({ field }) => (
                <ThemedDateInput
                  value={(field.value as string | undefined) ?? undefined}
                  onChange={(nextValue) => field.onChange(nextValue)}
                  max={getTodayDateInputValue()}
                />
              )}
            />
            {errors.lastPurchaseDate ? (
              <p className="mt-2 text-sm text-red-600">{errors.lastPurchaseDate.message}</p>
            ) : null}
          </div>

          <div>
            <InventoryFieldHelp label="Finished / ended date" help="When one full item was completely used. Used to estimate daily usage." optional />
            <Controller
              control={control}
              name="lastConsumptionDate"
              render={({ field }) => (
                <ThemedDateInput
                  value={(field.value as string | undefined) ?? undefined}
                  onChange={(nextValue) => field.onChange(nextValue)}
                  min={lastPurchaseDate || undefined}
                  max={getTodayDateInputValue()}
                />
              )}
            />
            {errors.lastConsumptionDate ? (
              <p className="mt-2 text-sm text-red-600">{errors.lastConsumptionDate.message}</p>
            ) : null}
          </div>

          <div>
            <InventoryFieldHelp label="Next restock date" help="When you plan or expect to buy the next refill." optional />
            <Controller
              control={control}
              name="nextRestockDate"
              render={({ field }) => (
                <ThemedDateInput
                  value={(field.value as string | undefined) ?? undefined}
                  onChange={(nextValue) => field.onChange(nextValue)}
                  min={getTodayDateInputValue()}
                />
              )}
            />
            {errors.nextRestockDate ? (
              <p className="mt-2 text-sm text-red-600">{errors.nextRestockDate.message}</p>
            ) : null}
            <p className="text-muted mt-2 text-xs">
              {restockFrequencyDays
                ? `Auto-calculated from a ${restockFrequencyDays}-day restock interval.`
                : "Auto-calculated from today, available amount, reminder threshold, and daily use."}
            </p>
          </div>

          <div>
            <InventoryFieldHelp label="Expiry date" help="Track items that expire, such as medicines or food." optional />
            <Controller
              control={control}
              name="expiryDate"
              render={({ field }) => (
                <ThemedDateInput
                  value={(field.value as string | undefined) ?? undefined}
                  onChange={(nextValue) => field.onChange(nextValue)}
                  min={lastPurchaseDate || undefined}
                />
              )}
            />
            {errors.expiryDate ? (
              <p className="mt-2 text-sm text-red-600">{errors.expiryDate.message}</p>
            ) : null}
          </div>
        </div>

        <div>
          <InventoryFieldHelp label="Notes" help="Capture household context like storage place, who uses it, or special restock rules." optional />
          <textarea
            {...register("notes")}
            className="w-full rounded-2xl border border-[var(--border)] px-4 py-3"
            rows={4}
            placeholder="Examples: one tube is open in the guest bathroom, tissue pack bought from Lulu, keep one reserve for Ramadan guests"
          />
          {errors.notes ? (
            <p className="mt-2 text-sm text-red-600">{errors.notes.message}</p>
          ) : null}
        </div>

        {serverError ? <Alert variant="error">{serverError}</Alert> : null}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="soft-card p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-black/90 p-2 text-white dark:bg-white dark:text-black">
                <Boxes className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Real stock language</p>
                <p className="text-muted mt-1 text-sm">
                  `Full units on hand`, `in use`, and `remind me at` are easier to understand than raw quantity fields.
                </p>
              </div>
            </div>
          </div>

          <div className="soft-card p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-black/90 p-2 text-white dark:bg-white dark:text-black">
                <BadgeDollarSign className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Cost clarity</p>
                <p className="text-muted mt-1 text-sm">
                  Save both a per-unit cost and the last total paid so household spend stays grounded in real shopping trips.
                </p>
              </div>
            </div>
          </div>

          <div className="soft-card p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-black/90 p-2 text-white dark:bg-white dark:text-black">
                <ShoppingBasket className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Desi expat friendly</p>
                <p className="text-muted mt-1 text-sm">
                  Works for bulk rice bags, masalay refills, toothpaste tubes, tissue packs, baby items, and guest prep.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white/50 p-4 dark:bg-white/5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 text-blue-600" />
            <div className="text-sm">
              <p className="font-medium">Example setups</p>
              <p className="text-muted mt-1">
                Toothpaste: unit `tube`, size `200 ml`, full units `1`, in use `1`.
                Tissue rolls: unit `roll`, pack contains `9 rolls`, full units `9`, remind at `2`.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-3"
          >
            {isSubmitting ? "Creating..." : "Create inventory item"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
