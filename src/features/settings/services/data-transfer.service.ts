import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createAccountService } from "@/features/accounts/services/accounts.service";
import { createAccountSchema } from "@/features/accounts/validations/account.schema";
import { createInventoryItemService } from "@/features/inventory/services/inventory.service";
import { createInventoryItemSchema } from "@/features/inventory/validations/inventory-item.schema";
import {
  createTransactionCategoryService,
  createTransactionSubcategoryService,
} from "@/features/transactions/services/transactions.service";
import {
  transactionCategorySchema,
  transactionSubcategorySchema,
} from "@/features/transactions/validations/transaction.schema";

export const transferableDataTypes = [
  "inventory_items",
  "accounts",
  "categories",
] as const;

export type TransferableDataType = (typeof transferableDataTypes)[number];

const backupProviderValues = ["browser_download", "local_path", "google_drive"] as const;
const backupScheduleValues = ["manual", "daily", "weekly", "monthly"] as const;

const backupPreferencesSchema = z.object({
  provider: z.enum(backupProviderValues),
  schedule: z.enum(backupScheduleValues),
  autoEnabled: z.boolean(),
  localPath: z.string().trim().max(400).optional(),
  lastBackupAt: z.string().datetime().nullable().optional(),
});

const transferableSubcategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  iconKey: z.string().trim().max(40).nullable().optional(),
  colorHex: z.string().trim().max(16).nullable().optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

const transferableCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(["income", "expense"]),
  iconKey: z.string().trim().max(40).nullable().optional(),
  colorHex: z.string().trim().max(16).nullable().optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  subcategories: z.array(transferableSubcategorySchema).default([]),
});

const transferableAccountSchema = z.object({
  name: z.string().trim().min(2).max(100),
  note: z.string().max(500).nullable().optional(),
  group: z.enum(["debit", "credit", "borrow_lend", "invest", "member"]),
  subtype: z.enum([
    "cash",
    "debit_card",
    "bank_account",
    "wallet",
    "credit_card",
    "loan_given",
    "loan_taken",
    "psx_stock",
    "cdc_account",
    "mutual_fund_pk",
    "national_savings",
    "roshan_investment",
    "crypto_wallet",
    "precious_metal",
    "forex_holding",
    "membership",
    "transport_card",
  ]),
  iconKey: z.string().trim().min(1).max(60),
  currencyCode: z.string().trim().toUpperCase().length(3),
  balance: z.number().optional(),
  chartColor: z.string().trim().min(4).max(20),
  countInAsset: z.boolean().default(true),
  hideBalance: z.boolean().default(false),
  categoryName: z.string().trim().max(80).nullable().optional(),
  categoryType: z.enum(["income", "expense"]).nullable().optional(),
  subcategoryName: z.string().trim().max(80).nullable().optional(),
  creditLimit: z.number().optional(),
  owed: z.number().optional(),
  billingDate: z.string().optional(),
  dueDate: z.string().optional(),
  reminder: z.boolean().optional(),
  sourceAccountName: z.string().trim().max(100).nullable().optional(),
  startDate: z.string().optional(),
  metalType: z.string().optional(),
  metalPurity: z.string().optional(),
  metalWeight: z.number().optional(),
  metalUnit: z.string().optional(),
});

const transferableInventoryItemSchema = z.object({
  categoryName: z.string().trim().min(1).max(80),
  name: z.string().trim().min(2),
  brand: z.string().trim().max(120).nullable().optional(),
  subcategory: z.string().trim().max(120).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).default([]),
  unit: createInventoryItemSchema.shape.unit,
  currentQuantity: z.number().min(0),
  inUseQuantity: z.number().min(0).nullable().optional(),
  minQuantity: z.number().min(0),
  reorderQuantity: z.number().min(0).nullable().optional(),
  packageQuantity: z.number().min(0).nullable().optional(),
  packageUnit: createInventoryItemSchema.shape.packageUnit.optional().nullable(),
  unitSizeValue: z.number().min(0).nullable().optional(),
  unitSizeUnit: createInventoryItemSchema.shape.unitSizeUnit.optional().nullable(),
  householdUserCount: z.number().int().min(1).max(20),
  restockFrequencyDays: z.number().int().min(1).max(365).nullable().optional(),
  preferredCurrencyCode: z.string().trim().toUpperCase().length(3),
  averageUnitCost: z.number().min(0).nullable().optional(),
  lastPurchaseTotalCost: z.number().min(0).nullable().optional(),
  estimatedDailyUsage: z.number().min(0).nullable().optional(),
  lastPurchaseDate: z.string().date().nullable().optional(),
  lastConsumptionDate: z.string().date().nullable().optional(),
  nextRestockDate: z.string().date().nullable().optional(),
  expiryDate: z.string().date().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  iconKey: z.string().max(60).nullable().optional(),
});

const transferBundleSchema = z.object({
  version: z.string(),
  exportedAt: z.string().datetime(),
  categories: z.array(transferableCategorySchema).default([]),
  accounts: z.array(transferableAccountSchema).default([]),
  inventoryItems: z.array(transferableInventoryItemSchema).default([]),
  backupPreferences: backupPreferencesSchema.optional(),
});

type BackupPreferences = z.infer<typeof backupPreferencesSchema>;
type TransferBundle = z.infer<typeof transferBundleSchema>;
type CsvRow = Record<string, string>;

function toNumber(value: Prisma.JsonValue | string | number | null | undefined) {
  if (value == null) return undefined;
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function toStringValue(value: Prisma.JsonValue | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asObject(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

function makeCategoryKey(name: string, type: "income" | "expense") {
  return `${type}:${name.trim().toLowerCase()}`;
}

function makeInventoryKey(categoryName: string, itemName: string) {
  return `${categoryName.trim().toLowerCase()}::${itemName.trim().toLowerCase()}`;
}

function buildBackupFileName(prefix: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${stamp}.json`;
}

function buildCsvFileName(prefix: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${stamp}.csv`;
}

function stringifyCsvValue(value: unknown) {
  const normalized =
    value == null
      ? ""
      : typeof value === "string"
        ? value
        : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value);

  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

function toCsvString(headers: string[], rows: CsvRow[]) {
  const headerLine = headers.map(stringifyCsvValue).join(",");
  const dataLines = rows.map((row) => headers.map((header) => stringifyCsvValue(row[header] ?? "")).join(","));
  return [headerLine, ...dataLines].join("\n");
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const nextCharacter = csv[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) =>
      headers.reduce<Record<string, string>>((record, header, index) => {
        record[header] = row[index] ?? "";
        return record;
      }, {})
    );
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalBoolean(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;
  if (trimmed === "true" || trimmed === "1" || trimmed === "yes") return true;
  if (trimmed === "false" || trimmed === "0" || trimmed === "no") return false;
  return undefined;
}

function parseOptionalString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseStringList(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  return trimmed
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getBackupPreferences(settings: {
  backupProvider?: (typeof backupProviderValues)[number] | null;
  backupSchedule?: (typeof backupScheduleValues)[number] | null;
  backupAutoEnabled?: boolean | null;
  backupLocalPath?: string | null;
  lastBackupAt?: Date | null;
} | null | undefined): BackupPreferences {
  return {
    provider: settings?.backupProvider ?? "browser_download",
    schedule: settings?.backupSchedule ?? "manual",
    autoEnabled: settings?.backupAutoEnabled ?? false,
    localPath: settings?.backupLocalPath ?? "",
    lastBackupAt: settings?.lastBackupAt?.toISOString() ?? null,
  };
}

export async function exportDataTypeToCsv(userId: string, dataType: TransferableDataType) {
  if (dataType === "categories") {
    const categories = await prisma.category.findMany({
      where: { userId },
      include: {
        subcategories: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    const headers = [
      "category_name",
      "category_type",
      "category_icon_key",
      "category_color_hex",
      "category_sort_order",
      "category_is_active",
      "subcategory_name",
      "subcategory_icon_key",
      "subcategory_color_hex",
      "subcategory_sort_order",
      "subcategory_is_active",
    ];

    const rows = categories.flatMap((category) => {
      if (category.subcategories.length === 0) {
        return [
          {
            category_name: category.name,
            category_type: category.type,
            category_icon_key: category.iconKey ?? "",
            category_color_hex: category.colorHex ?? "",
            category_sort_order: String(category.sortOrder),
            category_is_active: String(category.isActive),
            subcategory_name: "",
            subcategory_icon_key: "",
            subcategory_color_hex: "",
            subcategory_sort_order: "",
            subcategory_is_active: "",
          },
        ];
      }

      return category.subcategories.map((subcategory) => ({
        category_name: category.name,
        category_type: category.type,
        category_icon_key: category.iconKey ?? "",
        category_color_hex: category.colorHex ?? "",
        category_sort_order: String(category.sortOrder),
        category_is_active: String(category.isActive),
        subcategory_name: subcategory.name,
        subcategory_icon_key: subcategory.iconKey ?? "",
        subcategory_color_hex: subcategory.colorHex ?? "",
        subcategory_sort_order: String(subcategory.sortOrder),
        subcategory_is_active: String(subcategory.isActive),
      }));
    });

    return {
      fileName: buildCsvFileName("categories-export"),
      content: toCsvString(headers, rows),
    };
  }

  if (dataType === "accounts") {
    const [accounts, categories] = await Promise.all([
      prisma.account.findMany({
        where: { userId },
        orderBy: [{ createdAt: "asc" }],
      }),
      prisma.category.findMany({
        where: { userId },
        include: { subcategories: true },
      }),
    ]);

    const categoryLookup = new Map(
      categories.map((category) => [category.id, { name: category.name, type: category.type }])
    );
    const subcategoryLookup = new Map(
      categories.flatMap((category) =>
        category.subcategories.map((subcategory) => [subcategory.id, subcategory.name])
      )
    );
    const accountLookup = new Map(accounts.map((account) => [account.id, account.name]));
    const headers = [
      "name",
      "group",
      "subtype",
      "currency_code",
      "icon_key",
      "balance",
      "chart_color",
      "count_in_asset",
      "hide_balance",
      "note",
      "category_name",
      "category_type",
      "subcategory_name",
      "credit_limit",
      "owed",
      "billing_date",
      "due_date",
      "reminder",
      "source_account_name",
      "start_date",
      "metal_type",
      "metal_purity",
      "metal_weight",
      "metal_unit",
    ];

    const rows = accounts.map((account) => {
      const details = asObject(account.details);
      const categoryId = toStringValue(details.categoryId);
      const subcategoryId = toStringValue(details.subcategoryId);
      const sourceAccountId = toStringValue(details.sourceAccountId);
      const linkedCategory = categoryId ? categoryLookup.get(categoryId) : undefined;

      return {
        name: account.name,
        group: account.group,
        subtype: account.subtype,
        currency_code: account.currencyCode,
        icon_key: account.iconKey ?? account.subtype,
        balance: account.balance != null ? String(Number(account.balance)) : "",
        chart_color: account.chartColor ?? "",
        count_in_asset: String(account.countInAsset),
        hide_balance: String(account.hideBalance),
        note: account.note ?? "",
        category_name: linkedCategory?.name ?? "",
        category_type: linkedCategory?.type ?? "",
        subcategory_name: subcategoryId ? subcategoryLookup.get(subcategoryId) ?? "" : "",
        credit_limit: toNumber(details.creditLimit)?.toString() ?? "",
        owed: toNumber(details.owed)?.toString() ?? "",
        billing_date: toStringValue(details.billingDate) ?? "",
        due_date: toStringValue(details.dueDate) ?? "",
        reminder: typeof details.reminder === "boolean" ? String(details.reminder) : "",
        source_account_name: sourceAccountId ? accountLookup.get(sourceAccountId) ?? "" : "",
        start_date: toStringValue(details.startDate) ?? "",
        metal_type: toStringValue(details.metalType) ?? "",
        metal_purity: toStringValue(details.metalPurity) ?? "",
        metal_weight: toNumber(details.metalWeight)?.toString() ?? "",
        metal_unit: toStringValue(details.metalUnit) ?? "",
      };
    });

    return {
      fileName: buildCsvFileName("accounts-export"),
      content: toCsvString(headers, rows),
    };
  }

  const items = await prisma.inventoryItem.findMany({
    where: { userId },
    include: { category: true },
    orderBy: [{ createdAt: "asc" }],
  });
  const headers = [
    "category_name",
    "name",
    "brand",
    "subcategory",
    "tags",
    "unit",
    "current_quantity",
    "in_use_quantity",
    "min_quantity",
    "reorder_quantity",
    "package_quantity",
    "package_unit",
    "unit_size_value",
    "unit_size_unit",
    "household_user_count",
    "restock_frequency_days",
    "preferred_currency_code",
    "average_unit_cost",
    "last_purchase_total_cost",
    "estimated_daily_usage",
    "last_purchase_date",
    "last_consumption_date",
    "next_restock_date",
    "expiry_date",
    "notes",
    "icon_key",
  ];

  const rows = items.map((item) => ({
    category_name: item.category.name,
    name: item.name,
    brand: item.brand ?? "",
    subcategory: item.subcategory ?? "",
    tags: item.tags.join("|"),
    unit: item.unit,
    current_quantity: String(Number(item.currentQuantity)),
    in_use_quantity: item.inUseQuantity != null ? String(Number(item.inUseQuantity)) : "",
    min_quantity: String(Number(item.minQuantity)),
    reorder_quantity: item.reorderQuantity != null ? String(Number(item.reorderQuantity)) : "",
    package_quantity: item.packageQuantity != null ? String(Number(item.packageQuantity)) : "",
    package_unit: item.packageUnit ?? "",
    unit_size_value: item.unitSizeValue != null ? String(Number(item.unitSizeValue)) : "",
    unit_size_unit: item.unitSizeUnit ?? "",
    household_user_count: String(item.householdUserCount),
    restock_frequency_days: item.restockFrequencyDays != null ? String(item.restockFrequencyDays) : "",
    preferred_currency_code: item.preferredCurrencyCode,
    average_unit_cost: item.averageUnitCost != null ? String(Number(item.averageUnitCost)) : "",
    last_purchase_total_cost:
      item.lastPurchaseTotalCost != null ? String(Number(item.lastPurchaseTotalCost)) : "",
    estimated_daily_usage:
      item.estimatedDailyUsage != null ? String(Number(item.estimatedDailyUsage)) : "",
    last_purchase_date: item.lastPurchaseDate?.toISOString().slice(0, 10) ?? "",
    last_consumption_date: item.lastConsumptionDate?.toISOString().slice(0, 10) ?? "",
    next_restock_date: item.nextRestockDate?.toISOString().slice(0, 10) ?? "",
    expiry_date: item.expiryDate?.toISOString().slice(0, 10) ?? "",
    notes: item.notes ?? "",
    icon_key: item.iconKey ?? "",
  }));

  return {
    fileName: buildCsvFileName("inventory-items-export"),
    content: toCsvString(headers, rows),
  };
}

export async function buildTransferBundle(userId: string): Promise<TransferBundle> {
  const [categories, accounts, inventoryItems, settings] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      include: {
        subcategories: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.account.findMany({
      where: { userId },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.inventoryItem.findMany({
      where: { userId },
      include: {
        category: true,
      },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.userSettings.findUnique({
      where: { userId },
    }),
  ]);

  const categoryLookup = new Map(
    categories.map((category) => [category.id, { name: category.name, type: category.type }])
  );
  const accountLookup = new Map(accounts.map((account) => [account.id, account.name]));
  const subcategoryLookup = new Map(
    categories.flatMap((category) =>
      category.subcategories.map((subcategory) => [
        subcategory.id,
        { name: subcategory.name, categoryId: category.id },
      ])
    )
  );

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    categories: categories.map((category) => ({
      name: category.name,
      type: category.type,
      iconKey: category.iconKey,
      colorHex: category.colorHex,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      subcategories: category.subcategories.map((subcategory) => ({
        name: subcategory.name,
        iconKey: subcategory.iconKey,
        colorHex: subcategory.colorHex,
        sortOrder: subcategory.sortOrder,
        isActive: subcategory.isActive,
      })),
    })),
    accounts: accounts.map((account) => {
      const details = asObject(account.details);
      const categoryId = toStringValue(details.categoryId);
      const subcategoryId = toStringValue(details.subcategoryId);
      const linkedCategory = categoryId ? categoryLookup.get(categoryId) : undefined;
      const linkedSubcategory = subcategoryId ? subcategoryLookup.get(subcategoryId) : undefined;

      return {
        name: account.name,
        note: account.note,
        group: account.group,
        subtype: account.subtype,
        iconKey: account.iconKey ?? account.subtype,
        currencyCode: account.currencyCode,
        balance: account.balance != null ? Number(account.balance) : undefined,
        chartColor: account.chartColor ?? "#0f172a",
        countInAsset: account.countInAsset,
        hideBalance: account.hideBalance,
        categoryName: linkedCategory?.name ?? null,
        categoryType: linkedCategory?.type ?? null,
        subcategoryName: linkedSubcategory?.name ?? null,
        creditLimit: toNumber(details.creditLimit),
        owed: toNumber(details.owed),
        billingDate: toStringValue(details.billingDate),
        dueDate: toStringValue(details.dueDate),
        reminder: typeof details.reminder === "boolean" ? details.reminder : undefined,
        sourceAccountName: (() => {
          const sourceAccountId = toStringValue(details.sourceAccountId);
          return sourceAccountId ? accountLookup.get(sourceAccountId) ?? null : null;
        })(),
        startDate: toStringValue(details.startDate),
        metalType: toStringValue(details.metalType),
        metalPurity: toStringValue(details.metalPurity),
        metalWeight: toNumber(details.metalWeight),
        metalUnit: toStringValue(details.metalUnit),
      };
    }),
    inventoryItems: inventoryItems.map((item) => ({
      categoryName: item.category.name,
      name: item.name,
      brand: item.brand,
      subcategory: item.subcategory,
      tags: item.tags,
      unit: item.unit,
      currentQuantity: Number(item.currentQuantity),
      inUseQuantity: item.inUseQuantity != null ? Number(item.inUseQuantity) : null,
      minQuantity: Number(item.minQuantity),
      reorderQuantity: item.reorderQuantity != null ? Number(item.reorderQuantity) : null,
      packageQuantity: item.packageQuantity != null ? Number(item.packageQuantity) : null,
      packageUnit: item.packageUnit,
      unitSizeValue: item.unitSizeValue != null ? Number(item.unitSizeValue) : null,
      unitSizeUnit: item.unitSizeUnit,
      householdUserCount: item.householdUserCount,
      restockFrequencyDays: item.restockFrequencyDays,
      preferredCurrencyCode: item.preferredCurrencyCode,
      averageUnitCost: item.averageUnitCost != null ? Number(item.averageUnitCost) : null,
      lastPurchaseTotalCost:
        item.lastPurchaseTotalCost != null ? Number(item.lastPurchaseTotalCost) : null,
      estimatedDailyUsage:
        item.estimatedDailyUsage != null ? Number(item.estimatedDailyUsage) : null,
      lastPurchaseDate: item.lastPurchaseDate?.toISOString().slice(0, 10) ?? null,
      lastConsumptionDate: item.lastConsumptionDate?.toISOString().slice(0, 10) ?? null,
      nextRestockDate: item.nextRestockDate?.toISOString().slice(0, 10) ?? null,
      expiryDate: item.expiryDate?.toISOString().slice(0, 10) ?? null,
      notes: item.notes,
      iconKey: item.iconKey,
    })),
    backupPreferences: getBackupPreferences(settings),
  };
}

export async function importTransferBundle(userId: string, rawPayload: unknown) {
  const parsedBundle = transferBundleSchema.safeParse(rawPayload);
  if (!parsedBundle.success) {
    return {
      success: false as const,
      message: "Import file is invalid.",
      errors: parsedBundle.error.issues.map((issue) => issue.message),
    };
  }

  const bundle = parsedBundle.data;
  const categoryMap = new Map<string, string>();
  const categoryStats = { created: 0, skipped: 0 };
  const subcategoryStats = { created: 0, skipped: 0 };
  const accountStats = { created: 0, skipped: 0 };
  const inventoryStats = { created: 0, skipped: 0 };
  const errors: string[] = [];

  const existingCategories = await prisma.category.findMany({
    where: { userId },
    include: { subcategories: true },
  });

  for (const existingCategory of existingCategories) {
    categoryMap.set(
      makeCategoryKey(existingCategory.name, existingCategory.type),
      existingCategory.id
    );
  }

  for (const category of bundle.categories) {
    const key = makeCategoryKey(category.name, category.type);
    let categoryId = categoryMap.get(key);

    if (!categoryId) {
      const parsedCategory = transactionCategorySchema.safeParse({
        userId,
        ...category,
      });

      if (!parsedCategory.success) {
        errors.push(`Category "${category.name}" is invalid and was skipped.`);
        continue;
      }

      const createdCategory = await createTransactionCategoryService(parsedCategory.data);
      categoryId = createdCategory.id;
      categoryStats.created += 1;
      categoryMap.set(key, categoryId);
    } else {
      categoryStats.skipped += 1;
    }

    for (const subcategory of category.subcategories) {
      const existingSubcategory = await prisma.subcategory.findFirst({
        where: {
          categoryId,
          name: {
            equals: subcategory.name,
            mode: "insensitive",
          },
        },
      });

      if (existingSubcategory) {
        subcategoryStats.skipped += 1;
        continue;
      }

      const parsedSubcategory = transactionSubcategorySchema.safeParse({
        categoryId,
        ...subcategory,
      });

      if (!parsedSubcategory.success) {
        errors.push(`Subcategory "${subcategory.name}" is invalid and was skipped.`);
        continue;
      }

      await createTransactionSubcategoryService(parsedSubcategory.data);
      subcategoryStats.created += 1;
    }
  }

  const refreshedCategories = await prisma.category.findMany({
    where: { userId },
    include: { subcategories: true },
  });

  const subcategoryMap = new Map<string, string>();
  for (const category of refreshedCategories) {
    categoryMap.set(makeCategoryKey(category.name, category.type), category.id);
    for (const subcategory of category.subcategories) {
      subcategoryMap.set(
        `${makeCategoryKey(category.name, category.type)}::${subcategory.name.trim().toLowerCase()}`,
        subcategory.id
      );
    }
  }

  for (const account of bundle.accounts) {
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId,
        group: account.group,
        subtype: account.subtype,
        currencyCode: account.currencyCode,
        name: {
          equals: account.name,
          mode: "insensitive",
        },
      },
    });

    if (existingAccount) {
      accountStats.skipped += 1;
      continue;
    }

    let categoryId: string | undefined;
    let subcategoryId: string | undefined;
    let sourceAccountId: string | undefined;

    if (account.categoryName && account.categoryType) {
      categoryId = categoryMap.get(makeCategoryKey(account.categoryName, account.categoryType));
    }

    if (account.subcategoryName && account.categoryName && account.categoryType) {
      subcategoryId = subcategoryMap.get(
        `${makeCategoryKey(account.categoryName, account.categoryType)}::${account.subcategoryName
          .trim()
          .toLowerCase()}`
      );
    }

    if (account.sourceAccountName) {
      const linkedAccount = await prisma.account.findFirst({
        where: {
          userId,
          name: {
            equals: account.sourceAccountName,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      sourceAccountId = linkedAccount?.id;
    }

    const parsedAccount = createAccountSchema.safeParse({
      userId,
      ...account,
      note: account.note ?? "",
      categoryId,
      subcategoryId,
      sourceAccountId,
    });

    if (!parsedAccount.success) {
      errors.push(`Account "${account.name}" is invalid and was skipped.`);
      continue;
    }

    try {
      await createAccountService(parsedAccount.data);
      accountStats.created += 1;
    } catch (error) {
      errors.push(
        `Account "${account.name}" failed to import: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  const existingInventoryItems = await prisma.inventoryItem.findMany({
    where: { userId },
    include: { category: true },
  });
  const existingInventoryKeys = new Set(
    existingInventoryItems.map((item) => makeInventoryKey(item.category.name, item.name))
  );

  for (const item of bundle.inventoryItems) {
    const category = refreshedCategories.find(
      (entry) => entry.name.trim().toLowerCase() === item.categoryName.trim().toLowerCase()
    );

    if (!category) {
      errors.push(`Inventory item "${item.name}" skipped because category "${item.categoryName}" was not found.`);
      continue;
    }

    const inventoryKey = makeInventoryKey(item.categoryName, item.name);
    if (existingInventoryKeys.has(inventoryKey)) {
      inventoryStats.skipped += 1;
      continue;
    }

    const parsedItem = createInventoryItemSchema.safeParse({
      userId,
      ...item,
      categoryId: category.id,
      brand: item.brand ?? undefined,
      subcategory: item.subcategory ?? undefined,
      inUseQuantity: item.inUseQuantity ?? undefined,
      reorderQuantity: item.reorderQuantity ?? undefined,
      packageQuantity: item.packageQuantity ?? undefined,
      packageUnit: item.packageUnit ?? undefined,
      unitSizeValue: item.unitSizeValue ?? undefined,
      unitSizeUnit: item.unitSizeUnit ?? undefined,
      restockFrequencyDays: item.restockFrequencyDays ?? undefined,
      averageUnitCost: item.averageUnitCost ?? undefined,
      lastPurchaseTotalCost: item.lastPurchaseTotalCost ?? undefined,
      estimatedDailyUsage: item.estimatedDailyUsage ?? undefined,
      lastPurchaseDate: item.lastPurchaseDate ?? undefined,
      lastConsumptionDate: item.lastConsumptionDate ?? undefined,
      nextRestockDate: item.nextRestockDate ?? undefined,
      expiryDate: item.expiryDate ?? undefined,
      notes: item.notes ?? undefined,
      iconKey: item.iconKey ?? undefined,
    });

    if (!parsedItem.success) {
      errors.push(`Inventory item "${item.name}" is invalid and was skipped.`);
      continue;
    }

    try {
      await createInventoryItemService(parsedItem.data);
      inventoryStats.created += 1;
      existingInventoryKeys.add(inventoryKey);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        inventoryStats.skipped += 1;
        existingInventoryKeys.add(inventoryKey);
      } else {
        errors.push(
          `Inventory item "${item.name}" failed to import: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  }

  return {
    success: true as const,
    message:
      errors.length > 0
        ? "Import finished with some skipped records."
        : "Import finished successfully.",
    stats: {
      categories: categoryStats,
      subcategories: subcategoryStats,
      accounts: accountStats,
      inventoryItems: inventoryStats,
    },
    errors,
  };
}

export async function importCsvDataType(
  userId: string,
  dataType: TransferableDataType,
  csvContent: string
) {
  const rows = parseCsv(csvContent);
  if (rows.length === 0) {
    return {
      success: false as const,
      message: "CSV file is empty.",
      errors: [] as string[],
    };
  }

  if (dataType === "categories") {
    const categoryMap = new Map<string, string>();
    const stats = { categories: { created: 0, skipped: 0 }, subcategories: { created: 0, skipped: 0 } };
    const errors: string[] = [];
    const existingCategories = await prisma.category.findMany({
      where: { userId },
      include: { subcategories: true },
    });

    for (const category of existingCategories) {
      categoryMap.set(makeCategoryKey(category.name, category.type), category.id);
    }

    for (const row of rows) {
      const categoryName = row.category_name?.trim();
      const categoryType = row.category_type?.trim() as "income" | "expense" | "";
      if (!categoryName || !categoryType) {
        errors.push("Each category row must include category_name and category_type.");
        continue;
      }

      const key = makeCategoryKey(categoryName, categoryType);
      let categoryId = categoryMap.get(key);

      if (!categoryId) {
        const parsedCategory = transactionCategorySchema.safeParse({
          userId,
          name: categoryName,
          type: categoryType,
          iconKey: parseOptionalString(row.category_icon_key),
          colorHex: parseOptionalString(row.category_color_hex),
          sortOrder: parseOptionalNumber(row.category_sort_order) ?? 0,
          isActive: parseOptionalBoolean(row.category_is_active) ?? true,
        });

        if (!parsedCategory.success) {
          errors.push(`Category "${categoryName}" is invalid and was skipped.`);
          continue;
        }

        const createdCategory = await createTransactionCategoryService(parsedCategory.data);
        categoryId = createdCategory.id;
        categoryMap.set(key, categoryId);
        stats.categories.created += 1;
      } else {
        stats.categories.skipped += 1;
      }

      const subcategoryName = row.subcategory_name?.trim();
      if (!subcategoryName) {
        continue;
      }

      const existingSubcategory = await prisma.subcategory.findFirst({
        where: {
          categoryId,
          name: { equals: subcategoryName, mode: "insensitive" },
        },
      });

      if (existingSubcategory) {
        stats.subcategories.skipped += 1;
        continue;
      }

      const parsedSubcategory = transactionSubcategorySchema.safeParse({
        categoryId,
        name: subcategoryName,
        iconKey: parseOptionalString(row.subcategory_icon_key),
        colorHex: parseOptionalString(row.subcategory_color_hex),
        sortOrder: parseOptionalNumber(row.subcategory_sort_order) ?? 0,
        isActive: parseOptionalBoolean(row.subcategory_is_active) ?? true,
      });

      if (!parsedSubcategory.success) {
        errors.push(`Subcategory "${subcategoryName}" is invalid and was skipped.`);
        continue;
      }

      await createTransactionSubcategoryService(parsedSubcategory.data);
      stats.subcategories.created += 1;
    }

    return {
      success: true as const,
      message: errors.length > 0 ? "Import finished with some skipped rows." : "Import finished successfully.",
      stats,
      errors,
    };
  }

  if (dataType === "accounts") {
    const [categories, accounts] = await Promise.all([
      prisma.category.findMany({
        where: { userId },
        include: { subcategories: true },
      }),
      prisma.account.findMany({
        where: { userId },
        select: { id: true, name: true, group: true, subtype: true, currencyCode: true },
      }),
    ]);
    const categoryMap = new Map(
      categories.map((category) => [makeCategoryKey(category.name, category.type), category.id])
    );
    const subcategoryMap = new Map(
      categories.flatMap((category) =>
        category.subcategories.map((subcategory) => [
          `${makeCategoryKey(category.name, category.type)}::${subcategory.name.trim().toLowerCase()}`,
          subcategory.id,
        ])
      )
    );
    const accountNameMap = new Map(accounts.map((account) => [account.name.trim().toLowerCase(), account.id]));
    const stats = { accounts: { created: 0, skipped: 0 } };
    const errors: string[] = [];

    for (const row of rows) {
      const name = row.name?.trim();
      const group = row.group?.trim();
      const subtype = row.subtype?.trim();
      const currencyCode = row.currency_code?.trim().toUpperCase();

      if (!name || !group || !subtype || !currencyCode) {
        errors.push("Each account row must include name, group, subtype, and currency_code.");
        continue;
      }

      const existingAccount = await prisma.account.findFirst({
        where: {
          userId,
          group: group as never,
          subtype: subtype as never,
          currencyCode,
          name: { equals: name, mode: "insensitive" },
        },
      });

      if (existingAccount) {
        stats.accounts.skipped += 1;
        continue;
      }

      const categoryType = parseOptionalString(row.category_type) as "income" | "expense" | undefined;
      const categoryName = parseOptionalString(row.category_name);
      const subcategoryName = parseOptionalString(row.subcategory_name);
      const categoryId =
        categoryName && categoryType ? categoryMap.get(makeCategoryKey(categoryName, categoryType)) : undefined;
      const subcategoryId =
        categoryName && categoryType && subcategoryName
          ? subcategoryMap.get(
              `${makeCategoryKey(categoryName, categoryType)}::${subcategoryName.trim().toLowerCase()}`
            )
          : undefined;
      const sourceAccountId = parseOptionalString(row.source_account_name)
        ? accountNameMap.get(row.source_account_name.trim().toLowerCase())
        : undefined;

      const parsedAccount = createAccountSchema.safeParse({
        userId,
        name,
        note: row.note ?? "",
        group,
        subtype,
        iconKey: parseOptionalString(row.icon_key) ?? subtype,
        currencyCode,
        categoryId,
        subcategoryId,
        balance: parseOptionalNumber(row.balance),
        chartColor: parseOptionalString(row.chart_color) ?? "#0f172a",
        countInAsset: parseOptionalBoolean(row.count_in_asset) ?? true,
        hideBalance: parseOptionalBoolean(row.hide_balance) ?? false,
        creditLimit: parseOptionalNumber(row.credit_limit),
        owed: parseOptionalNumber(row.owed),
        billingDate: parseOptionalString(row.billing_date),
        dueDate: parseOptionalString(row.due_date),
        reminder: parseOptionalBoolean(row.reminder),
        sourceAccountId,
        startDate: parseOptionalString(row.start_date),
        metalType: parseOptionalString(row.metal_type),
        metalPurity: parseOptionalString(row.metal_purity),
        metalWeight: parseOptionalNumber(row.metal_weight),
        metalUnit: parseOptionalString(row.metal_unit),
      });

      if (!parsedAccount.success) {
        errors.push(`Account "${name}" is invalid and was skipped.`);
        continue;
      }

      try {
        const created = await createAccountService(parsedAccount.data);
        stats.accounts.created += 1;
        accountNameMap.set(created.name.trim().toLowerCase(), created.id);
      } catch (error) {
        errors.push(`Account "${name}" failed to import: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return {
      success: true as const,
      message: errors.length > 0 ? "Import finished with some skipped rows." : "Import finished successfully.",
      stats,
      errors,
    };
  }

  const categories = await prisma.category.findMany({
    where: { userId },
    include: { subcategories: true },
  });
  const existingInventoryItems = await prisma.inventoryItem.findMany({
    where: { userId },
    include: { category: true },
  });
  const stats = { inventoryItems: { created: 0, skipped: 0 } };
  const errors: string[] = [];
  const existingInventoryKeys = new Set(
    existingInventoryItems.map((item) => makeInventoryKey(item.category.name, item.name))
  );

  for (const row of rows) {
    const categoryName = row.category_name?.trim();
    const name = row.name?.trim();

    if (!categoryName || !name) {
      errors.push("Each inventory row must include category_name and name.");
      continue;
    }

    const category = categories.find(
      (entry) => entry.name.trim().toLowerCase() === categoryName.toLowerCase()
    );

    if (!category) {
      errors.push(`Inventory item "${name}" skipped because category "${categoryName}" was not found.`);
      continue;
    }

    const key = makeInventoryKey(categoryName, name);
    if (existingInventoryKeys.has(key)) {
      stats.inventoryItems.skipped += 1;
      continue;
    }

    const parsedItem = createInventoryItemSchema.safeParse({
      userId,
      categoryId: category.id,
      name,
      brand: parseOptionalString(row.brand),
      subcategory: parseOptionalString(row.subcategory),
      tags: parseStringList(row.tags ?? ""),
      unit: row.unit?.trim(),
      currentQuantity: parseOptionalNumber(row.current_quantity),
      inUseQuantity: parseOptionalNumber(row.in_use_quantity),
      minQuantity: parseOptionalNumber(row.min_quantity),
      reorderQuantity: parseOptionalNumber(row.reorder_quantity),
      packageQuantity: parseOptionalNumber(row.package_quantity),
      packageUnit: parseOptionalString(row.package_unit),
      unitSizeValue: parseOptionalNumber(row.unit_size_value),
      unitSizeUnit: parseOptionalString(row.unit_size_unit),
      householdUserCount: parseOptionalNumber(row.household_user_count),
      restockFrequencyDays: parseOptionalNumber(row.restock_frequency_days),
      preferredCurrencyCode: row.preferred_currency_code?.trim().toUpperCase(),
      averageUnitCost: parseOptionalNumber(row.average_unit_cost),
      lastPurchaseTotalCost: parseOptionalNumber(row.last_purchase_total_cost),
      estimatedDailyUsage: parseOptionalNumber(row.estimated_daily_usage),
      lastPurchaseDate: parseOptionalString(row.last_purchase_date),
      lastConsumptionDate: parseOptionalString(row.last_consumption_date),
      nextRestockDate: parseOptionalString(row.next_restock_date),
      expiryDate: parseOptionalString(row.expiry_date),
      notes: parseOptionalString(row.notes),
      iconKey: parseOptionalString(row.icon_key),
    });

    if (!parsedItem.success) {
      errors.push(`Inventory item "${name}" is invalid and was skipped.`);
      continue;
    }

    try {
      await createInventoryItemService(parsedItem.data);
      stats.inventoryItems.created += 1;
      existingInventoryKeys.add(key);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        stats.inventoryItems.skipped += 1;
        existingInventoryKeys.add(key);
      } else {
        errors.push(
          `Inventory item "${name}" failed to import: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  }

  return {
    success: true as const,
    message: errors.length > 0 ? "Import finished with some skipped rows." : "Import finished successfully.",
    stats,
    errors,
  };
}

export async function createBackupArtifact(options: {
  userId: string;
  provider: (typeof backupProviderValues)[number];
  localPath?: string;
}) {
  const bundle = await buildTransferBundle(options.userId);
  const backupPayload = {
    kind: "budget-management-backup",
    createdAt: new Date().toISOString(),
    provider: options.provider,
    data: bundle,
  };

  if (options.provider === "local_path") {
    const targetDirectory = options.localPath?.trim();
    if (!targetDirectory) {
      throw new Error("A local backup path is required before saving to disk.");
    }

    const absoluteDirectory = path.resolve(targetDirectory);
    await mkdir(absoluteDirectory, { recursive: true });

    const filePath = path.join(absoluteDirectory, buildBackupFileName("budget-backup"));
    await writeFile(filePath, JSON.stringify(backupPayload, null, 2), "utf8");

    return {
      mode: "saved_to_disk" as const,
      filePath,
      payload: backupPayload,
      message: "Backup file saved to the configured local path.",
    };
  }

  return {
    mode: "download" as const,
    payload: backupPayload,
    message:
      options.provider === "google_drive"
        ? "Backup bundle prepared for manual upload to Google Drive."
        : "Backup bundle prepared for download.",
  };
}
