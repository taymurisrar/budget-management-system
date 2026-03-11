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
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
    createInventoryItemSchema,
    inventoryUnits,
    type CreateInventoryItemFormValues,
    type CreateInventoryItemInput,
} from "@/features/inventory/validations/inventory-item.schema";

type CategoryOption = {
    id: string;
    name: string;
    iconKey: string | null;
};

type ApiErrorResponse = {
    message: string;
    errors?: unknown;
};

type CreateInventoryItemSuccessResponse = {
    id: string;
    userId: string;
    categoryId: string;
    name: string;
    brand?: string | null;
    unit: string;
    currentQuantity: number | string;
    minQuantity: number | string;
    reorderQuantity?: number | string | null;
    preferredCurrencyCode: string;
    averageUnitCost?: number | string | null;
    estimatedDailyUsage?: number | string | null;
    notes?: string | null;
    iconKey?: string | null;
};

type CreateInventoryItemResponse =
    | CreateInventoryItemSuccessResponse
    | ApiErrorResponse;

function isApiErrorResponse(
    value: CreateInventoryItemResponse | null
): value is ApiErrorResponse {
    return !!value && "message" in value;
}

const currencies = [
    "QAR",
    "PKR",
    "USD",
    "EUR",
    "GBP",
    "AED",
    "SAR",
    "TRY",
    "JPY",
    "CHF",
];

const inventoryIconOptions = [
    "toothbrush",
    "shampoo",
    "soap",
    "spray",
    "basket",
    "pill",
    "cat",
    "rice",
    "bottle",
    "box",
];

export default function CreateInventoryItemForm({
    userId,
    categories,
}: {
    userId: string;
    categories: CategoryOption[];
}) {
    const router = useRouter();
    const [serverError, setServerError] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<CreateInventoryItemFormValues>({
        resolver: zodResolver(createInventoryItemSchema),
        defaultValues: {
            userId,
            categoryId: categories[0]?.id ?? "",
            name: "",
            brand: "",
            unit: "piece",
            currentQuantity: 0,
            minQuantity: 1,
            reorderQuantity: 1,
            preferredCurrencyCode: "QAR",
            averageUnitCost: undefined,
            estimatedDailyUsage: undefined,
            notes: "",
            iconKey: "",
        },
    });

    const onSubmit = async (values: CreateInventoryItemFormValues) => {
        setServerError("");

        const parsedValues: CreateInventoryItemInput = createInventoryItemSchema.parse({
            ...values,
            preferredCurrencyCode: values.preferredCurrencyCode.toUpperCase(),
            brand: values.brand?.trim() || undefined,
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
                isApiErrorResponse(result)
                    ? result.message
                    : "Failed to create inventory item"
            );
            return;
        }

        router.push("/inventory");
        router.refresh();
    };

    return (
        <div className="glass-card overflow-hidden">
            <div className="border-b border-[var(--border)] px-6 py-5">
                <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-black/90 p-3 text-white dark:bg-white dark:text-black">
                        <PackagePlus className="h-5 w-5" />
                    </div>

                    <div>
                        <h2 className="section-title">Create Inventory Item</h2>
                        <p className="text-muted mt-1 text-sm">
                            Add a household item with stock quantity, unit, reorder threshold,
                            and optional cost and usage intelligence.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-7 px-6 py-6">
                <input type="hidden" {...register("userId")} />

                <div className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium">Item Name</label>
                        <input
                            {...register("name")}
                            className="w-full px-4 py-3"
                            placeholder="e.g. Sensodyne Toothpaste, Persil Liquid Detergent"
                        />
                        {errors.name && (
                            <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">Category</label>
                        <select {...register("categoryId")} className="w-full px-4 py-3">
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                        {errors.categoryId && (
                            <p className="mt-2 text-sm text-red-600">
                                {errors.categoryId.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">Brand</label>
                        <input
                            {...register("brand")}
                            className="w-full px-4 py-3"
                            placeholder="e.g. Colgate, Head & Shoulders"
                        />
                        {errors.brand && (
                            <p className="mt-2 text-sm text-red-600">{errors.brand.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">Unit</label>
                        <select {...register("unit")} className="w-full px-4 py-3">
                            {inventoryUnits.map((unit) => (
                                <option key={unit} value={unit}>
                                    {unit.toUpperCase()}
                                </option>
                            ))}
                        </select>
                        {errors.unit && (
                            <p className="mt-2 text-sm text-red-600">{errors.unit.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">Icon Key</label>
                        <select {...register("iconKey")} className="w-full px-4 py-3">
                            <option value="">No icon</option>
                            {inventoryIconOptions.map((icon) => (
                                <option key={icon} value={icon}>
                                    {icon.charAt(0).toUpperCase() + icon.slice(1)}
                                </option>
                            ))}
                        </select>
                        {errors.iconKey && (
                            <p className="mt-2 text-sm text-red-600">{errors.iconKey.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">Current Quantity</label>
                        <input
                            type="number"
                            step="0.001"
                            {...register("currentQuantity")}
                            className="w-full px-4 py-3"
                            placeholder="0"
                        />
                        {errors.currentQuantity && (
                            <p className="mt-2 text-sm text-red-600">
                                {errors.currentQuantity.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">Minimum Quantity</label>
                        <input
                            type="number"
                            step="0.001"
                            {...register("minQuantity")}
                            className="w-full px-4 py-3"
                            placeholder="1"
                        />
                        {errors.minQuantity && (
                            <p className="mt-2 text-sm text-red-600">
                                {errors.minQuantity.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">Reorder Quantity</label>
                        <input
                            type="number"
                            step="0.001"
                            {...register("reorderQuantity")}
                            className="w-full px-4 py-3"
                            placeholder="Optional recommended refill amount"
                        />
                        {errors.reorderQuantity && (
                            <p className="mt-2 text-sm text-red-600">
                                {errors.reorderQuantity.message}
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-sm font-medium">Currency</label>
                        <select
                            {...register("preferredCurrencyCode")}
                            className="w-full px-4 py-3"
                        >
                            {currencies.map((currency) => (
                                <option key={currency} value={currency}>
                                    {currency}
                                </option>
                            ))}
                        </select>
                        {errors.preferredCurrencyCode && (
                            <p className="mt-2 text-sm text-red-600">
                                {errors.preferredCurrencyCode.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">Average Unit Cost</label>
                        <input
                            type="number"
                            step="0.001"
                            {...register("averageUnitCost")}
                            className="w-full px-4 py-3"
                            placeholder="Optional"
                        />
                        {errors.averageUnitCost && (
                            <p className="mt-2 text-sm text-red-600">
                                {errors.averageUnitCost.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">Estimated Daily Usage</label>
                        <input
                            type="number"
                            step="0.001"
                            {...register("estimatedDailyUsage")}
                            className="w-full px-4 py-3"
                            placeholder="Optional"
                        />
                        {errors.estimatedDailyUsage && (
                            <p className="mt-2 text-sm text-red-600">
                                {errors.estimatedDailyUsage.message}
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">Notes</label>
                    <textarea
                        {...register("notes")}
                        className="w-full px-4 py-3"
                        rows={4}
                        placeholder="Optional notes, e.g. bathroom cabinet, cat only, refill before month-end"
                    />
                    {errors.notes && (
                        <p className="mt-2 text-sm text-red-600">{errors.notes.message}</p>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="soft-card p-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-black/90 p-2 text-white dark:bg-white dark:text-black">
                                <Boxes className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Stock awareness</p>
                                <p className="text-muted mt-1 text-sm">
                                    Keep current quantity and minimum threshold so low-stock items stand out.
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
                                <p className="text-sm font-medium">Cost intelligence</p>
                                <p className="text-muted mt-1 text-sm">
                                    Average cost helps connect household inventory with actual spend patterns.
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
                                <p className="text-sm font-medium">Restock planning</p>
                                <p className="text-muted mt-1 text-sm">
                                    Estimated daily usage enables future depletion and restock prediction.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-white/50 p-4 dark:bg-white/5">
                    <div className="flex items-start gap-3">
                        <Sparkles className="mt-0.5 h-4 w-4 text-blue-600" />
                        <div className="text-sm">
                            <p className="font-medium">Good inventory data pays off later</p>
                            <p className="text-muted mt-1">
                                Once items are created properly, you can log purchases, track consumption,
                                predict depletion, and generate restock alerts without manually guessing.
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
                        {isSubmitting ? "Creating..." : "Create Inventory Item"}
                    </button>
                </div>
            </form>
        </div>
    );
}
