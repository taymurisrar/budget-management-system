import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  findSubcategoryById,
  findTransactionById,
  transactionCategoryInclude,
  transactionInclude,
} from "@/features/transactions/repository/transactions.repository";
import type {
  CreateTransactionInput,
  TransactionCategoryInput,
  TransactionSubcategoryInput,
  UpdateTransactionInput,
} from "@/features/transactions/validations/transaction.schema";

function toDecimal(value: number | null | undefined) {
  if (value == null) return null;
  return new Prisma.Decimal(value);
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function roundRate(value: number) {
  return Number(value.toFixed(8));
}

async function validateClassification(
  input: Pick<CreateTransactionInput, "type" | "categoryId" | "subcategoryId">
) {
  if (input.type === "transfer") {
    return {
      categoryId: null,
      subcategoryId: null,
    };
  }

  if (!input.categoryId) {
    throw new Error("Category is required for income and expense transactions");
  }

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true, type: true },
  });

  if (!category) {
    throw new Error("Selected category was not found");
  }

  if (category.type !== input.type) {
    throw new Error("Category type does not match the transaction type");
  }

  if (!input.subcategoryId) {
    return {
      categoryId: category.id,
      subcategoryId: null,
    };
  }

  const subcategory = await findSubcategoryById(input.subcategoryId);
  if (!subcategory || subcategory.categoryId !== category.id) {
    throw new Error("Selected subcategory does not belong to the chosen category");
  }

  return {
    categoryId: category.id,
    subcategoryId: subcategory.id,
  };
}

async function ensureTransferAccounts(
  input: Pick<
    CreateTransactionInput,
    "type" | "accountId" | "transferAccountId" | "amount" | "exchangeRate"
  >
) {
  const sourceAccount = await prisma.account.findUnique({
    where: { id: input.accountId },
  });

  if (!sourceAccount) {
    throw new Error("Source account not found");
  }

  if (input.type !== "transfer") {
    return {
      sourceAccount,
      destinationAccount: null,
      sourceCurrency: sourceAccount.currencyCode,
      destinationCurrency: sourceAccount.currencyCode,
      effectiveRate: 1,
      destinationAmount: input.amount,
    };
  }

  if (!input.transferAccountId) {
    throw new Error("Destination account is required for transfers");
  }

  const destinationAccount = await prisma.account.findUnique({
    where: { id: input.transferAccountId },
  });

  if (!destinationAccount) {
    throw new Error("Destination account not found");
  }

  if (destinationAccount.id === sourceAccount.id) {
    throw new Error("Source and destination accounts must be different");
  }

  const effectiveRate =
    sourceAccount.currencyCode === destinationAccount.currencyCode
      ? 1
      : roundRate(input.exchangeRate ?? 0);

  if (effectiveRate <= 0) {
    throw new Error("Exchange rate is required for cross-currency transfers");
  }

  return {
    sourceAccount,
    destinationAccount,
    sourceCurrency: sourceAccount.currencyCode,
    destinationCurrency: destinationAccount.currencyCode,
    effectiveRate,
    destinationAmount: roundCurrency(input.amount * effectiveRate),
  };
}

async function adjustAccountBalance(
  tx: Prisma.TransactionClient,
  accountId: string,
  delta: number
) {
  const account = await tx.account.findUnique({
    where: { id: accountId },
    select: { balance: true },
  });

  if (!account) {
    throw new Error("Account not found while updating balances");
  }

  const nextBalance = roundCurrency(Number(account.balance ?? 0) + delta);

  await tx.account.update({
    where: { id: accountId },
    data: {
      balance: toDecimal(nextBalance),
    },
  });
}

async function reverseTransactionBalances(
  tx: Prisma.TransactionClient,
  transaction: NonNullable<Awaited<ReturnType<typeof findTransactionById>>>
) {
  const amount = Number(transaction.amount);
  const transferAmount = Number(transaction.baseAmount ?? transaction.amount);

  if (transaction.type === "income") {
    await adjustAccountBalance(tx, transaction.accountId, -amount);
    return;
  }

  if (transaction.type === "expense") {
    await adjustAccountBalance(tx, transaction.accountId, amount);
    return;
  }

  if (transaction.transferAccountId) {
    await adjustAccountBalance(tx, transaction.accountId, amount);
    await adjustAccountBalance(tx, transaction.transferAccountId, -transferAmount);
  }
}

async function applyTransactionBalances(
  tx: Prisma.TransactionClient,
  input: CreateTransactionInput
) {
  const transferContext = await ensureTransferAccounts(input);
  const amount = roundCurrency(input.amount);

  if (input.type === "income") {
    await adjustAccountBalance(tx, input.accountId, amount);
  } else if (input.type === "expense") {
    await adjustAccountBalance(tx, input.accountId, -amount);
  } else if (transferContext.destinationAccount) {
    await adjustAccountBalance(tx, input.accountId, -amount);
    await adjustAccountBalance(
      tx,
      transferContext.destinationAccount.id,
      transferContext.destinationAmount
    );
  }

  return transferContext;
}

function buildTransactionData(
  input: CreateTransactionInput,
  transferContext: Awaited<ReturnType<typeof ensureTransferAccounts>>,
  classification: Awaited<ReturnType<typeof validateClassification>>
) {
  return {
    userId: input.userId,
    accountId: input.accountId,
    transferAccountId:
      input.type === "transfer" ? transferContext.destinationAccount?.id ?? null : null,
    type: input.type,
    amount: new Prisma.Decimal(roundCurrency(input.amount)),
    currencyCode: transferContext.sourceCurrency,
    exchangeRate:
      input.type === "transfer" ? new Prisma.Decimal(transferContext.effectiveRate) : null,
    baseAmount:
      input.type === "transfer"
        ? new Prisma.Decimal(transferContext.destinationAmount)
        : new Prisma.Decimal(roundCurrency(input.amount)),
    categoryId: classification.categoryId,
    subcategoryId: classification.subcategoryId,
    transactionDate: new Date(input.transactionDate),
    note: input.note ?? null,
    merchant: input.merchant ?? null,
    paymentMethod: input.paymentMethod ?? null,
    referenceNumber: input.referenceNumber ?? null,
    externalReference: input.externalReference ?? null,
    location: input.location ?? null,
    tags: input.tags,
  };
}

export async function createTransactionService(input: CreateTransactionInput) {
  const [classification] = await Promise.all([validateClassification(input)]);

  return prisma.$transaction(async (tx) => {
    const transferContext = await applyTransactionBalances(tx, input);
    const transaction = await tx.transaction.create({
      data: buildTransactionData(input, transferContext, classification),
      include: transactionInclude,
    });

    return transaction;
  });
}

export async function updateTransactionService(id: string, input: UpdateTransactionInput) {
  const existingTransaction = await findTransactionById(id);
  if (!existingTransaction) {
    throw new Error("Transaction not found");
  }

  const [classification] = await Promise.all([validateClassification(input)]);

  return prisma.$transaction(async (tx) => {
    await reverseTransactionBalances(tx, existingTransaction);
    const transferContext = await applyTransactionBalances(tx, input);

    return tx.transaction.update({
      where: { id },
      data: buildTransactionData(input, transferContext, classification),
      include: transactionInclude,
    });
  });
}

export async function deleteTransactionService(id: string) {
  const existingTransaction = await findTransactionById(id);
  if (!existingTransaction) {
    throw new Error("Transaction not found");
  }

  return prisma.$transaction(async (tx) => {
    await reverseTransactionBalances(tx, existingTransaction);
    await tx.transaction.delete({
      where: { id },
    });

    return { success: true };
  });
}

export async function createTransactionCategoryService(input: TransactionCategoryInput) {
  return prisma.category.create({
    data: {
      userId: input.userId,
      name: input.name,
      type: input.type,
      iconKey: input.iconKey ?? null,
      colorHex: input.colorHex ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
    include: transactionCategoryInclude,
  });
}

export async function updateTransactionCategoryService(
  id: string,
  input: Partial<TransactionCategoryInput>
) {
  return prisma.category.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.iconKey !== undefined ? { iconKey: input.iconKey || null } : {}),
      ...(input.colorHex !== undefined ? { colorHex: input.colorHex || null } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: transactionCategoryInclude,
  });
}

export async function deleteTransactionCategoryService(id: string) {
  await prisma.category.delete({
    where: { id },
  });

  return { success: true };
}

export async function createTransactionSubcategoryService(input: TransactionSubcategoryInput) {
  return prisma.subcategory.create({
    data: {
      categoryId: input.categoryId,
      name: input.name,
      iconKey: input.iconKey ?? null,
      colorHex: input.colorHex ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
    include: {
      category: true,
    },
  });
}

export async function updateTransactionSubcategoryService(
  id: string,
  input: Partial<TransactionSubcategoryInput>
) {
  return prisma.subcategory.update({
    where: { id },
    data: {
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.name ? { name: input.name } : {}),
      ...(input.iconKey !== undefined ? { iconKey: input.iconKey || null } : {}),
      ...(input.colorHex !== undefined ? { colorHex: input.colorHex || null } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: {
      category: true,
    },
  });
}

export async function deleteTransactionSubcategoryService(id: string) {
  await prisma.subcategory.delete({
    where: { id },
  });

  return { success: true };
}
