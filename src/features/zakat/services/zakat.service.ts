import type { Prisma, ZakatAsset } from "@/generated/prisma/client";
import {
  findZakatAssetById,
  findZakatPaymentById,
  prisma,
  zakatAssetInclude,
} from "@/features/zakat/repository/zakat.repository";
import type {
  CreateZakatAssetInput,
  CreateZakatPaymentInput,
  UpdateZakatPaymentInput,
  UpdateZakatAssetInput,
} from "@/features/zakat/validations/zakat-asset.schema";
import { calculateZakatDueDate } from "@/features/zakat/zakat-utils";
import { getExchangeRate } from "@/features/transactions/services/exchange-rates.service";

function resolveCountInMyAssets(input: Pick<CreateZakatAssetInput, "ownershipRelation" | "countInMyAssets">) {
  return input.ownershipRelation === "self" ? input.countInMyAssets : false;
}

function toAssetData(
  input: CreateZakatAssetInput | UpdateZakatAssetInput
): Prisma.ZakatAssetCreateInput | Prisma.ZakatAssetUpdateInput {
  const isMetal = input.assetType === "gold" || input.assetType === "silver";

  return {
    name: input.name.trim(),
    assetType: input.assetType,
    ownershipRelation: input.ownershipRelation,
    ownerName: input.ownerName?.trim() || null,
    countInMyAssets: resolveCountInMyAssets(input),
    currencyCode: input.currencyCode.toUpperCase(),
    manualValue: isMetal ? null : input.manualValue ?? null,
    deductibleAmount: input.deductibleAmount ?? null,
    metalWeightGrams: isMetal ? input.metalWeightGrams ?? null : null,
    metalPurity: isMetal ? input.metalPurity ?? null : null,
    purchaseDate: new Date(input.purchaseDate),
    zakatDueDate: calculateZakatDueDate(input.purchaseDate),
    preferredPaymentMonth: input.preferredPaymentMonth ?? null,
    notes: input.notes?.trim() || null,
  };
}

function buildRevisionSummary(previous: ZakatAsset | null, next: CreateZakatAssetInput | UpdateZakatAssetInput) {
  if (!previous) return "Asset created";

  const changedFields: string[] = [];
  if (previous.name !== next.name.trim()) changedFields.push("name");
  if (String(previous.assetType) !== next.assetType) changedFields.push("asset type");
  if (String(previous.ownershipRelation) !== next.ownershipRelation) changedFields.push("ownership");
  if (Number(previous.manualValue ?? 0) !== Number(next.manualValue ?? 0)) changedFields.push("value");
  if (Number(previous.metalWeightGrams ?? 0) !== Number(next.metalWeightGrams ?? 0)) changedFields.push("weight");
  if (String(previous.metalPurity ?? "") !== String(next.metalPurity ?? "")) changedFields.push("purity");
  if (Number(previous.deductibleAmount ?? 0) !== Number(next.deductibleAmount ?? 0)) {
    changedFields.push("deductions");
  }
  if ((previous.purchaseDate?.toISOString().slice(0, 10) ?? "") !== next.purchaseDate) {
    changedFields.push("purchase date");
  }
  if (Number(previous.preferredPaymentMonth ?? 0) !== Number(next.preferredPaymentMonth ?? 0)) {
    changedFields.push("payment month");
  }

  return changedFields.length > 0 ? `Updated ${changedFields.join(", ")}` : "Asset updated";
}

function buildSnapshot(asset: ZakatAsset) {
  return {
    name: asset.name,
    assetType: asset.assetType,
    ownershipRelation: asset.ownershipRelation,
    ownerName: asset.ownerName,
    countInMyAssets: asset.countInMyAssets,
    currencyCode: asset.currencyCode,
    manualValue: asset.manualValue?.toString() ?? null,
    deductibleAmount: asset.deductibleAmount?.toString() ?? null,
    metalWeightGrams: asset.metalWeightGrams?.toString() ?? null,
    metalPurity: asset.metalPurity,
    purchaseDate: asset.purchaseDate.toISOString(),
    zakatDueDate: asset.zakatDueDate.toISOString(),
    preferredPaymentMonth: asset.preferredPaymentMonth,
    notes: asset.notes,
    isActive: asset.isActive,
  };
}

async function createRevisionSnapshot(
  tx: Prisma.TransactionClient,
  asset: ZakatAsset,
  action: "created" | "updated" | "archived",
  summary: string
) {
  await tx.zakatAssetRevision.create({
    data: {
      userId: asset.userId,
      assetId: asset.id,
      action,
      summary,
      snapshot: buildSnapshot(asset),
    },
  });
}

export async function createZakatAssetService(input: CreateZakatAssetInput) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.zakatAsset.create({
      data: {
        ...(toAssetData(input) as Prisma.ZakatAssetCreateInput),
        user: {
          connect: { id: input.userId },
        },
      },
    });

    await createRevisionSnapshot(tx, asset, "created", "Asset created");

    return tx.zakatAsset.findUniqueOrThrow({
      where: { id: asset.id },
      include: zakatAssetInclude,
    });
  });
}

export async function updateZakatAssetService(
  assetId: string,
  input: UpdateZakatAssetInput
) {
  const existingAsset = await findZakatAssetById(assetId);
  if (!existingAsset) {
    throw new Error("Zakat asset not found");
  }

  return prisma.$transaction(async (tx) => {
    const updatedAsset = await tx.zakatAsset.update({
      where: { id: assetId },
      data: toAssetData(input) as Prisma.ZakatAssetUpdateInput,
    });

    await createRevisionSnapshot(
      tx,
      updatedAsset,
      "updated",
      buildRevisionSummary(existingAsset, input)
    );

    return tx.zakatAsset.findUniqueOrThrow({
      where: { id: assetId },
      include: zakatAssetInclude,
    });
  });
}

export async function deleteZakatAssetService(assetId: string) {
  const existingAsset = await findZakatAssetById(assetId);
  if (!existingAsset) {
    throw new Error("Zakat asset not found");
  }

  return prisma.$transaction(async (tx) => {
    const archivedAsset = await tx.zakatAsset.update({
      where: { id: assetId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    await createRevisionSnapshot(tx, archivedAsset, "archived", "Asset archived");
    return archivedAsset;
  });
}

async function resolveBaseAmount(amount: number, currencyCode: string, baseCurrencyCode: string, date: string) {
  const normalizedCurrencyCode = currencyCode.toUpperCase();
  const normalizedBaseCurrencyCode = baseCurrencyCode.toUpperCase();

  if (normalizedCurrencyCode === normalizedBaseCurrencyCode) {
    return amount;
  }

  const exchangeRate = await getExchangeRate({
    baseCurrency: normalizedCurrencyCode,
    quoteCurrency: normalizedBaseCurrencyCode,
    date,
  });

  return Number((amount * exchangeRate.rate).toFixed(2));
}

export async function createZakatPaymentService(
  assetId: string,
  input: CreateZakatPaymentInput,
  baseCurrencyCode: string
) {
  const asset = await findZakatAssetById(assetId);
  if (!asset) {
    throw new Error("Zakat asset not found");
  }

  const baseAmount = await resolveBaseAmount(
    input.amount,
    input.currencyCode,
    baseCurrencyCode,
    input.paymentDate
  );

  return prisma.$transaction(async (tx) => {
    await tx.zakatPayment.create({
      data: {
        userId: input.userId,
        assetId,
        amount: input.amount,
        currencyCode: input.currencyCode.toUpperCase(),
        baseAmount,
        paymentDate: new Date(input.paymentDate),
        note: input.note?.trim() || null,
      } as Prisma.ZakatPaymentUncheckedCreateInput,
    });

    return tx.zakatAsset.findUniqueOrThrow({
      where: { id: assetId },
      include: zakatAssetInclude,
    });
  });
}

export async function updateZakatPaymentService(
  paymentId: string,
  input: UpdateZakatPaymentInput,
  baseCurrencyCode: string
) {
  const payment = await findZakatPaymentById(paymentId);
  if (!payment) {
    throw new Error("Zakat payment not found");
  }

  const baseAmount = await resolveBaseAmount(
    input.amount,
    input.currencyCode,
    baseCurrencyCode,
    input.paymentDate
  );

  return prisma.zakatPayment.update({
    where: { id: paymentId },
    data: {
      amount: input.amount,
      currencyCode: input.currencyCode.toUpperCase(),
      baseAmount,
      paymentDate: new Date(input.paymentDate),
      note: input.note?.trim() || null,
    } as Prisma.ZakatPaymentUncheckedUpdateInput,
  });
}

export async function deleteZakatPaymentService(paymentId: string) {
  const payment = await findZakatPaymentById(paymentId);
  if (!payment) {
    throw new Error("Zakat payment not found");
  }

  await prisma.zakatPayment.delete({
    where: { id: paymentId },
  });
}
