import { z } from "zod";

export const transactionTypes = ["income", "expense", "transfer"] as const;

export const createTransactionSchema = z.object({
  userId: z.string().min(1, "User is required"),
  accountId: z.string().min(1, "Account is required"),
  type: z.enum(transactionTypes),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  transactionDate: z.string().min(1, "Transaction date is required"),
  note: z.string().max(500).optional(),
  merchant: z.string().max(100).optional(),
  paymentMethod: z.string().max(50).optional(),
});

export type CreateTransactionFormValues = z.input<typeof createTransactionSchema>;
export type CreateTransactionInput = z.output<typeof createTransactionSchema>;