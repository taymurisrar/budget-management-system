import { z } from "zod";

export const accountGroups = ["debit", "credit", "borrow_lend", "invest", "member"] as const;

export const accountSubtypes = [
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
] as const;

export const createAccountSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).max(100),
  note: z.string().max(500).optional().or(z.literal("")),
  group: z.enum(accountGroups),
  subtype: z.enum(accountSubtypes),
  iconKey: z.string().min(1),
  currencyCode: z.string().length(3),

  balance: z.coerce.number().optional(),
  chartColor: z.string().min(4).max(20),
  countInAsset: z.boolean().default(true),
  hideBalance: z.boolean().default(false),

  creditLimit: z.coerce.number().optional(),
  owed: z.coerce.number().optional(),
  billingDate: z.string().optional(),
  dueDate: z.string().optional(),
  reminder: z.boolean().optional(),

  sourceAccountId: z.string().optional(),
  startDate: z.string().optional(),

  metalType: z.string().optional(),
  metalPurity: z.string().optional(),
  metalWeight: z.coerce.number().optional(),
  metalUnit: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.group === "credit") {
    if (data.creditLimit == null) {
      ctx.addIssue({ code: "custom", path: ["creditLimit"], message: "Credit limit is required" });
    }
    if (data.owed == null) {
      ctx.addIssue({ code: "custom", path: ["owed"], message: "Owed is required" });
    }
  }

  if (data.group === "borrow_lend") {
    if (!data.sourceAccountId) {
      ctx.addIssue({ code: "custom", path: ["sourceAccountId"], message: "Source/Destination account is required" });
    }
    if (!data.startDate) {
      ctx.addIssue({ code: "custom", path: ["startDate"], message: "Start date is required" });
    }
  }

  if (data.group === "invest" && data.subtype === "precious_metal") {
    if (!data.metalType) {
      ctx.addIssue({ code: "custom", path: ["metalType"], message: "Metal type is required" });
    }
    if (data.metalWeight == null) {
      ctx.addIssue({ code: "custom", path: ["metalWeight"], message: "Metal weight is required" });
    }
  }
});

export type CreateAccountFormValues = z.infer<typeof createAccountSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;