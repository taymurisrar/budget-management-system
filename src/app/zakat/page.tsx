import ZakatManagementClient from "@/features/zakat/components/zakat-management-client";
import { findAllZakatAssetsByUser } from "@/features/zakat/repository/zakat.repository";
import { getZakatMetalRateDashboard } from "@/features/zakat/services/zakat-metal-rates.service";
import { getExchangeRate } from "@/features/transactions/services/exchange-rates.service";
import { requireCurrentUser } from "@/lib/auth/current-user";

async function convertToBaseCurrency(amount: number | null, fromCurrencyCode: string, baseCurrencyCode: string, date: string) {
  if (amount == null) return null;
  if (fromCurrencyCode.toUpperCase() === baseCurrencyCode.toUpperCase()) {
    return amount;
  }

  const exchangeRate = await getExchangeRate({
    baseCurrency: fromCurrencyCode.toUpperCase(),
    quoteCurrency: baseCurrencyCode.toUpperCase(),
    date,
  });

  return Number((amount * exchangeRate.rate).toFixed(2));
}

export default async function ZakatPage() {
  const user = await requireCurrentUser();
  const [assets, metalRates] = await Promise.all([
    findAllZakatAssetsByUser(user.id),
    getZakatMetalRateDashboard(user.baseCurrencyCode).catch(() => null),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const enrichedAssets = await Promise.all(
    assets.map(async (asset) => {
      const manualValue = asset.manualValue == null ? null : Number(asset.manualValue);
      const deductibleAmount = asset.deductibleAmount == null ? null : Number(asset.deductibleAmount);
      const baseManualValue = await convertToBaseCurrency(
        manualValue,
        asset.currencyCode,
        user.baseCurrencyCode,
        today
      );
      const baseDeductibleAmount = await convertToBaseCurrency(
        deductibleAmount,
        asset.currencyCode,
        user.baseCurrencyCode,
        today
      );

      return {
        id: asset.id,
        name: asset.name,
        assetType: asset.assetType,
        ownershipRelation: asset.ownershipRelation,
        ownerName: asset.ownerName,
        countInMyAssets: asset.countInMyAssets,
        currencyCode: asset.currencyCode,
        manualValue,
        baseManualValue,
        deductibleAmount,
        baseDeductibleAmount,
        metalWeightGrams: asset.metalWeightGrams == null ? null : Number(asset.metalWeightGrams),
        metalPurity: asset.metalPurity,
        purchaseDate: asset.purchaseDate.toISOString(),
        zakatDueDate: asset.zakatDueDate.toISOString(),
        preferredPaymentMonth: asset.preferredPaymentMonth,
        notes: asset.notes,
        isActive: asset.isActive,
        deletedAt: asset.deletedAt?.toISOString() ?? null,
        createdAt: asset.createdAt.toISOString(),
        updatedAt: asset.updatedAt.toISOString(),
        payments: await Promise.all(
          asset.payments.map(async (payment) => {
            const normalizedPayment = payment as typeof payment & {
              baseAmount?: { toString(): string } | number | null;
            };

            return {
              id: payment.id,
              amount: Number(payment.amount),
              currencyCode: payment.currencyCode,
              baseAmount:
                normalizedPayment.baseAmount == null
                  ? await convertToBaseCurrency(
                      Number(payment.amount),
                      payment.currencyCode,
                      user.baseCurrencyCode,
                      payment.paymentDate.toISOString().slice(0, 10)
                    )
                  : Number(normalizedPayment.baseAmount),
              paymentDate: payment.paymentDate.toISOString(),
              note: payment.note,
              createdAt: payment.createdAt.toISOString(),
              updatedAt: payment.updatedAt.toISOString(),
            };
          })
        ),
        revisions: asset.revisions.map((revision) => ({
          id: revision.id,
          action: revision.action,
          summary: revision.summary,
          snapshot:
            revision.snapshot && typeof revision.snapshot === "object" && !Array.isArray(revision.snapshot)
              ? (revision.snapshot as Record<string, unknown>)
              : {},
          createdAt: revision.createdAt.toISOString(),
        })),
      };
    })
  );

  return (
    <ZakatManagementClient
      defaultCurrencyCode={user.baseCurrencyCode}
      metalRates={metalRates}
      assets={enrichedAssets}
    />
  );
}
