import { z } from "zod";

export const transactionTypes = ["income", "expense", "transfer"] as const;
export const categoryTypes = ["income", "expense"] as const;

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const createTransactionSchema = z
  .object({
    userId: z.string().min(1, "User is required"),
    accountId: z.string().min(1, "Source account is required"),
    transferAccountId: z.string().optional(),
    type: z.enum(transactionTypes),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    currencyCode: z
      .string()
      .trim()
      .toUpperCase()
      .length(3, "Currency must be a 3-letter code")
      .optional(),
    exchangeRate: z.coerce.number().positive("Exchange rate must be greater than 0").optional(),
    categoryId: z.string().optional(),
    subcategoryId: z.string().optional(),
    transactionDate: z.string().min(1, "Transaction date and time are required"),
    note: optionalTrimmedString(500),
    merchant: optionalTrimmedString(100),
    paymentMethod: optionalTrimmedString(50),
    referenceNumber: optionalTrimmedString(80),
    externalReference: optionalTrimmedString(80),
    location: optionalTrimmedString(120),
    tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.type === "transfer") {
      if (!value.transferAccountId) {
        ctx.addIssue({
          code: "custom",
          path: ["transferAccountId"],
          message: "Destination account is required for transfers",
        });
      }

      if (value.transferAccountId && value.transferAccountId === value.accountId) {
        ctx.addIssue({
          code: "custom",
          path: ["transferAccountId"],
          message: "Source and destination accounts must be different",
        });
      }
    }

    if (value.type !== "transfer" && !value.categoryId) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Category is required for income and expense transactions",
      });
    }

    if (value.subcategoryId && !value.categoryId) {
      ctx.addIssue({
        code: "custom",
        path: ["subcategoryId"],
        message: "Select a category before choosing a subcategory",
      });
    }
  });

export const updateTransactionSchema = createTransactionSchema.extend({
  id: z.string().min(1, "Transaction id is required"),
});

export const transactionCategorySchema = z.object({
  userId: z.string().min(1, "User is required"),
  name: z.string().trim().min(1, "Name is required").max(80),
  type: z.enum(categoryTypes),
  iconKey: optionalTrimmedString(40),
  colorHex: optionalTrimmedString(16),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const transactionSubcategorySchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  name: z.string().trim().min(1, "Name is required").max(80),
  iconKey: optionalTrimmedString(40),
  colorHex: optionalTrimmedString(16),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const exchangeRateLookupSchema = z.object({
  baseCurrency: z.string().trim().toUpperCase().length(3),
  quoteCurrency: z.string().trim().toUpperCase().length(3),
  date: z.string().min(1),
});

export type CreateTransactionFormValues = z.input<typeof createTransactionSchema>;
export type CreateTransactionInput = z.output<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.output<typeof updateTransactionSchema>;
export type TransactionCategoryInput = z.output<typeof transactionCategorySchema>;
export type TransactionSubcategoryInput = z.output<typeof transactionSubcategorySchema>;
export type ExchangeRateLookupInput = z.output<typeof exchangeRateLookupSchema>;
