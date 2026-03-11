import { createAccount } from "@/features/accounts/repository/accounts.repository";
import type { CreateAccountInput } from "@/features/accounts/validations/account.schema";

export async function createAccountService(input: CreateAccountInput) {
  const details =
    input.group === "credit"
      ? {
          creditLimit: input.creditLimit ?? 0,
          owed: input.owed ?? 0,
          billingDate: input.billingDate || null,
          dueDate: input.dueDate || null,
          reminder: input.reminder ?? false,
        }
      : input.group === "borrow_lend"
        ? {
            sourceAccountId: input.sourceAccountId || null,
            startDate: input.startDate || null,
            dueDate: input.dueDate || null,
          }
        : input.group === "invest" && input.subtype === "precious_metal"
          ? {
              metalType: input.metalType || null,
              metalPurity: input.metalPurity || null,
              metalWeight: input.metalWeight ?? 0,
              metalUnit: input.metalUnit || null,
            }
          : undefined;

  return createAccount({
    name: input.name,
    note: input.note || null,
    group: input.group,
    subtype: input.subtype,
    currencyCode: input.currencyCode,
    iconKey: input.iconKey ?? input.subtype,
    balance: input.balance ?? 0,
    chartColor: input.chartColor,
    countInAsset: input.countInAsset ?? true,
    hideBalance: input.hideBalance ?? false,
    details,
    user: {
      connect: {
        id: input.userId,
      },
    },
  });
}
