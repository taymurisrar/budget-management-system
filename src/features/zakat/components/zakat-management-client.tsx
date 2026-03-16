"use client";

import { ChevronDown, Coins, Gem, HandCoins, Landmark, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LocalizedDateText from "@/components/localized-date-text";
import ThemedDateInput from "@/components/themed-date-input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { currencyOptions } from "@/lib/currencies";
import {
  zakatAssetTypeLabels,
  zakatAssetTypes,
  zakatMetalPurityLabels,
  zakatNisabStandards,
  zakatOwnershipRelationLabels,
  zakatPaymentMonths,
  zakatWeightUnits,
} from "@/features/zakat/zakat-constants";
import {
  calculateMetalValue,
  calculateNetZakatableValue,
  calculateNextCycleDate,
  calculateZakatAmount,
  getDaysBetween,
  getPreferredPaymentMonthLabel,
  getPurityLabel,
  gramsToTola,
  hasCompletedHawl,
  isMetalAssetType,
  toDateInputValue,
  tolaToGrams,
  type ZakatAssetType,
  type ZakatMetalPurity,
  type ZakatOwnershipRelation,
} from "@/features/zakat/zakat-utils";

type PaymentRecord = {
  id: string;
  amount: number;
  currencyCode: string;
  baseAmount: number | null;
  paymentDate: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type RevisionRecord = {
  id: string;
  action: "created" | "updated" | "archived";
  summary: string | null;
  snapshot: Record<string, unknown>;
  createdAt: string;
};

type AssetRecord = {
  id: string;
  name: string;
  assetType: ZakatAssetType;
  ownershipRelation: ZakatOwnershipRelation;
  ownerName: string | null;
  countInMyAssets: boolean;
  currencyCode: string;
  manualValue: number | null;
  baseManualValue: number | null;
  deductibleAmount: number | null;
  baseDeductibleAmount: number | null;
  metalWeightGrams: number | null;
  metalPurity: ZakatMetalPurity | null;
  purchaseDate: string;
  zakatDueDate: string;
  preferredPaymentMonth: number | null;
  notes: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  payments: PaymentRecord[];
  revisions: RevisionRecord[];
};

type MetalQuote = {
  pricePerGram: number;
  priceByPurity: Record<ZakatMetalPurity, number>;
  updatedAt: string;
  source: string;
};

type MetalDashboard = {
  baseCurrencyCode: string;
  gold: MetalQuote;
  silver: MetalQuote;
  nisabByMetal: {
    gold: number;
    silver: number;
  };
} | null;

type AssetFormState = {
  name: string;
  assetType: ZakatAssetType;
  ownershipRelation: ZakatOwnershipRelation;
  ownerName: string;
  countInMyAssets: boolean;
  currencyCode: string;
  manualValue: string;
  deductibleAmount: string;
  metalWeightValue: string;
  metalWeightUnit: (typeof zakatWeightUnits)[number];
  metalPurity: "" | ZakatMetalPurity;
  purchaseDate: string;
  preferredPaymentMonth: string;
  notes: string;
};

type PaymentFormState = {
  amount: string;
  currencyCode: string;
  paymentDate: string;
  note: string;
};

type ApiErrorResponse = { message?: string };

const assetTypeOptions = zakatAssetTypes.map((value) => ({ value, label: zakatAssetTypeLabels[value] }));

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function emptyAssetForm(defaultCurrencyCode: string): AssetFormState {
  return {
    name: "",
    assetType: "gold",
    ownershipRelation: "self",
    ownerName: "",
    countInMyAssets: true,
    currencyCode: defaultCurrencyCode,
    manualValue: "",
    deductibleAmount: "",
    metalWeightValue: "",
    metalWeightUnit: "grams",
    metalPurity: "k24",
    purchaseDate: todayInputValue(),
    preferredPaymentMonth: "",
    notes: "",
  };
}

function emptyPaymentForm(defaultCurrencyCode: string): PaymentFormState {
  return {
    amount: "",
    currencyCode: defaultCurrencyCode,
    paymentDate: todayInputValue(),
    note: "",
  };
}

function assetToForm(asset: AssetRecord): AssetFormState {
  return {
    name: asset.name,
    assetType: asset.assetType,
    ownershipRelation: asset.ownershipRelation,
    ownerName: asset.ownerName ?? "",
    countInMyAssets: asset.countInMyAssets,
    currencyCode: asset.currencyCode,
    manualValue: asset.manualValue == null ? "" : String(asset.manualValue),
    deductibleAmount: asset.deductibleAmount == null ? "" : String(asset.deductibleAmount),
    metalWeightValue: asset.metalWeightGrams == null ? "" : String(asset.metalWeightGrams),
    metalWeightUnit: "grams",
    metalPurity: asset.metalPurity ?? "k24",
    purchaseDate: toDateInputValue(asset.purchaseDate),
    preferredPaymentMonth: asset.preferredPaymentMonth == null ? "" : String(asset.preferredPaymentMonth),
    notes: asset.notes ?? "",
  };
}

function paymentToForm(payment: PaymentRecord): PaymentFormState {
  return {
    amount: String(payment.amount),
    currencyCode: payment.currencyCode,
    paymentDate: toDateInputValue(payment.paymentDate),
    note: payment.note ?? "",
  };
}

function formatMoney(value: number | null | undefined, currencyCode: string) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(2)} ${currencyCode}`;
}

function AssetIcon({ assetType }: { assetType: ZakatAssetType }) {
  if (assetType === "gold" || assetType === "silver") return <Gem className="h-5 w-5" />;
  if (assetType === "cash") return <Coins className="h-5 w-5" />;
  if (assetType === "property") return <Landmark className="h-5 w-5" />;
  return <HandCoins className="h-5 w-5" />;
}

function getGrossValueInBase(asset: AssetRecord, metalRates: MetalDashboard) {
  if (asset.assetType === "gold") {
    if (!metalRates || !asset.metalWeightGrams || !asset.metalPurity) return null;
    return calculateMetalValue({
      weightGrams: asset.metalWeightGrams,
      purity: asset.metalPurity,
      pricePerGram: metalRates.gold.pricePerGram,
    });
  }

  if (asset.assetType === "silver") {
    if (!metalRates || !asset.metalWeightGrams || !asset.metalPurity) return null;
    return calculateMetalValue({
      weightGrams: asset.metalWeightGrams,
      purity: asset.metalPurity,
      pricePerGram: metalRates.silver.pricePerGram,
    });
  }

  return asset.baseManualValue ?? null;
}

function renderSnapshotValue(value: unknown) {
  if (value == null || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export default function ZakatManagementClient({
  assets,
  metalRates,
  defaultCurrencyCode,
}: {
  assets: AssetRecord[];
  metalRates: MetalDashboard;
  defaultCurrencyCode: string;
}) {
  const router = useRouter();
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(assets[0]?.id ?? null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState<AssetFormState>(emptyAssetForm(defaultCurrencyCode));
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(emptyPaymentForm(defaultCurrencyCode));
  const [categoryFilter, setCategoryFilter] = useState<"all" | ZakatAssetType>("all");
  const [search, setSearch] = useState("");
  const [nisabStandard, setNisabStandard] = useState<(typeof zakatNisabStandards)[number]>("silver");
  const [assetError, setAssetError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (assets.length === 0) {
      setSelectedAssetId(null);
      return;
    }

    if (!selectedAssetId || !assets.some((asset) => asset.id === selectedAssetId)) {
      setSelectedAssetId(assets[0].id);
    }
  }, [assets, selectedAssetId]);

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (categoryFilter !== "all" && asset.assetType !== categoryFilter) return false;
      if (!query) return true;

      const haystack = [
        asset.name,
        zakatAssetTypeLabels[asset.assetType],
        asset.ownerName ?? "",
        asset.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [assets, categoryFilter, search]);

  const selectedAsset =
    filteredAssets.find((asset) => asset.id === selectedAssetId) ??
    assets.find((asset) => asset.id === selectedAssetId) ??
    null;

  const assetMetrics = useMemo(
    () =>
      assets.map((asset) => {
        const grossBaseValue = getGrossValueInBase(asset, metalRates);
        const netBaseValue =
          grossBaseValue == null
            ? null
            : calculateNetZakatableValue(grossBaseValue, asset.baseDeductibleAmount ?? 0);
        const zakatBaseAmount = netBaseValue == null ? null : calculateZakatAmount(netBaseValue);
        const dueNow = hasCompletedHawl(asset.purchaseDate);
        const totalPaidBaseAmount = asset.payments.reduce((sum, payment) => sum + (payment.baseAmount ?? 0), 0);

        return { asset, grossBaseValue, netBaseValue, zakatBaseAmount, dueNow, totalPaidBaseAmount };
      }),
    [assets, metalRates]
  );

  const filteredMetrics = assetMetrics.filter((entry) =>
    filteredAssets.some((asset) => asset.id === entry.asset.id)
  );
  const selectedMetrics = assetMetrics.find((entry) => entry.asset.id === selectedAsset?.id) ?? null;
  const activeNisab =
    nisabStandard === "silver" ? metalRates?.nisabByMetal.silver ?? null : metalRates?.nisabByMetal.gold ?? null;
  const assetIsMetal = isMetalAssetType(assetForm.assetType);

  const metricsSummary = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const active = filteredMetrics.filter((entry) => entry.asset.isActive);
    const mine = active.filter((entry) => entry.asset.countInMyAssets);

    const mapSummary = (entries: typeof filteredMetrics) => ({
      totalValue: entries.reduce((sum, entry) => sum + (entry.netBaseValue ?? 0), 0),
      dueNow: entries.reduce((sum, entry) => sum + (entry.dueNow ? entry.zakatBaseAmount ?? 0 : 0), 0),
      assetCount: entries.length,
      dueCount: entries.filter((entry) => entry.dueNow).length,
      paidThisYear: entries.reduce(
        (sum, entry) =>
          sum +
          entry.asset.payments
            .filter((payment) => new Date(payment.paymentDate).getFullYear() === currentYear)
            .reduce((inner, payment) => inner + (payment.baseAmount ?? 0), 0),
        0
      ),
    });

    return {
      mine: mapSummary(mine),
      all: mapSummary(active),
    };
  }, [filteredMetrics]);

  function setAssetField<K extends keyof AssetFormState>(field: K, value: AssetFormState[K]) {
    setAssetForm((current) => ({ ...current, [field]: value }));
  }

  function resetAssetForm() {
    setEditingAssetId(null);
    setAssetError("");
    setAssetForm(emptyAssetForm(defaultCurrencyCode));
  }

  function resetPaymentForm() {
    setEditingPaymentId(null);
    setPaymentError("");
    setPaymentForm(emptyPaymentForm(defaultCurrencyCode));
  }

  function startEditAsset(asset: AssetRecord) {
    setSelectedAssetId(asset.id);
    setEditingAssetId(asset.id);
    setAssetForm(assetToForm(asset));
    setAssetError("");
  }

  function startEditPayment(payment: PaymentRecord) {
    setEditingPaymentId(payment.id);
    setPaymentForm(paymentToForm(payment));
    setPaymentError("");
  }

  async function submitAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingAsset(true);
    setAssetError("");

    const weightInGrams =
      assetForm.metalWeightValue === ""
        ? undefined
        : assetForm.metalWeightUnit === "tola"
          ? tolaToGrams(Number(assetForm.metalWeightValue))
          : Number(assetForm.metalWeightValue);

    const payload = {
      ...assetForm,
      countInMyAssets: assetForm.ownershipRelation === "self" ? assetForm.countInMyAssets : false,
      currencyCode: assetForm.currencyCode.toUpperCase(),
      manualValue: assetForm.manualValue === "" ? undefined : Number(assetForm.manualValue),
      deductibleAmount: assetForm.deductibleAmount === "" ? undefined : Number(assetForm.deductibleAmount),
      metalWeightGrams: weightInGrams,
      metalPurity: assetIsMetal ? assetForm.metalPurity || undefined : undefined,
      preferredPaymentMonth:
        assetForm.preferredPaymentMonth === "" ? undefined : Number(assetForm.preferredPaymentMonth),
    };

    try {
      const response = await fetch(editingAssetId ? `/api/zakat/${editingAssetId}` : "/api/zakat", {
        method: editingAssetId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = (await response.json()) as ApiErrorResponse;
        throw new Error(result.message || "Failed to save zakat asset");
      }

      resetAssetForm();
      router.refresh();
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : "Failed to save zakat asset");
    } finally {
      setIsSavingAsset(false);
    }
  }

  async function deleteAsset(assetId: string) {
    if (!window.confirm("Delete this zakat asset from active tracking?")) return;
    setDeletingAssetId(assetId);

    try {
      const response = await fetch(`/api/zakat/${assetId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = (await response.json()) as ApiErrorResponse;
        throw new Error(result.message || "Failed to delete zakat asset");
      }

      if (editingAssetId === assetId) resetAssetForm();
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to delete zakat asset");
    } finally {
      setDeletingAssetId(null);
    }
  }

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAsset) return;
    setIsSavingPayment(true);
    setPaymentError("");

    try {
      const endpoint = editingPaymentId
        ? `/api/zakat/payments/${editingPaymentId}`
        : `/api/zakat/${selectedAsset.id}/payments`;
      const method = editingPaymentId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(paymentForm.amount),
          currencyCode: paymentForm.currencyCode.toUpperCase(),
          paymentDate: paymentForm.paymentDate,
          note: paymentForm.note,
        }),
      });

      if (!response.ok) {
        const result = (await response.json()) as ApiErrorResponse;
        throw new Error(result.message || "Failed to save zakat payment");
      }

      resetPaymentForm();
      router.refresh();
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Failed to save zakat payment");
    } finally {
      setIsSavingPayment(false);
    }
  }

  async function deletePayment(paymentId: string) {
    if (!window.confirm("Delete this zakat payment record?")) return;
    setDeletingPaymentId(paymentId);

    try {
      const response = await fetch(`/api/zakat/payments/${paymentId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = (await response.json()) as ApiErrorResponse;
        throw new Error(result.message || "Failed to delete payment");
      }

      if (editingPaymentId === paymentId) resetPaymentForm();
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to delete payment");
    } finally {
      setDeletingPaymentId(null);
    }
  }

  return (
    <div className="app-shell py-8">
      <section className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,247,237,0.9),rgba(254,249,195,0.84))] p-6 shadow-[var(--shadow-md)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(120,53,15,0.28),rgba(113,63,18,0.34))]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700 dark:text-amber-300">Zakat</p>
            <h1 className="page-title mt-3">Track zakatable assets, nisab basis, due dates, and payments.</h1>
            <p className="text-muted mt-3 max-w-2xl text-sm sm:text-base">
              Dashboard totals are converted into {defaultCurrencyCode}, while each asset and payment keeps its own original currency.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {zakatNisabStandards.map((standard) => (
              <Button key={standard} variant={nisabStandard === standard ? "primary" : "secondary"} onClick={() => setNisabStandard(standard)}>
                {standard === "silver" ? "Silver Nisab" : "Gold Nisab"}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-[24px] border border-white/50 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5"><p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">My Assets</p><p className="mt-2 text-xl font-semibold">{formatMoney(metricsSummary.mine.totalValue, defaultCurrencyCode)}</p></div>
          <div className="rounded-[24px] border border-white/50 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5"><p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">My Zakat Due</p><p className="mt-2 text-xl font-semibold">{formatMoney(metricsSummary.mine.dueNow, defaultCurrencyCode)}</p></div>
          <div className="rounded-[24px] border border-white/50 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5"><p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">All Assets</p><p className="mt-2 text-xl font-semibold">{formatMoney(metricsSummary.all.totalValue, defaultCurrencyCode)}</p></div>
          <div className="rounded-[24px] border border-white/50 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5"><p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">All Due Now</p><p className="mt-2 text-xl font-semibold">{formatMoney(metricsSummary.all.dueNow, defaultCurrencyCode)}</p></div>
          <div className="rounded-[24px] border border-white/50 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5"><p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">{nisabStandard === "silver" ? "Silver Nisab" : "Gold Nisab"}</p><p className="mt-2 text-xl font-semibold">{formatMoney(activeNisab, defaultCurrencyCode)}</p></div>
          <Button type="button" onClick={resetAssetForm} className="rounded-[24px] px-5 py-4 font-semibold"><Plus className="h-4 w-4" />New Asset</Button>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="space-y-4">
          <Card className="rounded-[28px] p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search asset, owner, note" className="w-full rounded-2xl border border-[var(--border)] bg-white/70 py-3 pl-11 pr-4 dark:bg-white/5" />
              </label>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as "all" | ZakatAssetType)} className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5">
                <option value="all">All categories</option>
                {assetTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm dark:bg-white/5">{filteredAssets.length} asset{filteredAssets.length === 1 ? "" : "s"} shown</div>
            </div>
          </Card>

          {metalRates ? (
            <Card className="rounded-[28px] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">Live Metal Rates</p>
                  <h2 className="section-title mt-2">Gold and silver in {defaultCurrencyCode}</h2>
                  <p className="text-muted mt-2 text-sm">Source {metalRates.gold.source}. Updated <LocalizedDateText value={metalRates.gold.updatedAt} emptyText="Now" />.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="warning">Gold Nisab {formatMoney(metalRates.nisabByMetal.gold, defaultCurrencyCode)}</Badge>
                  <Badge variant="secondary">Silver Nisab {formatMoney(metalRates.nisabByMetal.silver, defaultCurrencyCode)}</Badge>
                </div>
              </div>
            </Card>
          ) : <Alert variant="info">Live gold and silver rates are temporarily unavailable. Manual-value assets still work.</Alert>}

          {filteredMetrics.map(({ asset, grossBaseValue, netBaseValue, zakatBaseAmount, dueNow, totalPaidBaseAmount }) => {
            const dueInDays = getDaysBetween(asset.zakatDueDate);
            const nextCycleDate = calculateNextCycleDate(asset.purchaseDate);
            const currentNisab = activeNisab ?? 0;
            const aboveNisab = netBaseValue != null && netBaseValue >= currentNisab;

            return (
              <Card key={asset.id} as="article" className={`rounded-[28px] p-5 ${selectedAssetId === asset.id ? "ring-2 ring-amber-300/70" : ""}`}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <button type="button" onClick={() => setSelectedAssetId(asset.id)} className="flex min-w-0 flex-1 items-start gap-4 text-left">
                    <div className="rounded-2xl bg-black/90 p-3 text-white dark:bg-white dark:text-black"><AssetIcon assetType={asset.assetType} /></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold">{asset.name}</h2>
                        <Badge variant="blue">{zakatAssetTypeLabels[asset.assetType]}</Badge>
                        <Badge variant={asset.countInMyAssets ? "success" : "secondary"}>{asset.countInMyAssets ? "My asset" : "Family / tracked"}</Badge>
                        <Badge variant={aboveNisab ? "warning" : "secondary"}>{aboveNisab ? "Above selected nisab" : "Below selected nisab"}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                        {zakatOwnershipRelationLabels[asset.ownershipRelation]}
                        {asset.ownerName ? ` | ${asset.ownerName}` : ""}
                        {asset.notes ? ` | ${asset.notes}` : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <Badge variant="secondary">{asset.currencyCode}</Badge>
                        <Badge variant="warning">First due <LocalizedDateText value={asset.zakatDueDate} emptyText="N/A" /></Badge>
                        <Badge variant={dueNow ? "danger" : "secondary"}>{dueNow ? "Hawl completed" : `${Math.max(dueInDays, 0)} day(s) until due`}</Badge>
                      </div>
                    </div>
                  </button>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => startEditAsset(asset)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="danger" size="sm" loading={deletingAssetId === asset.id} onClick={() => void deleteAsset(asset.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-[var(--border)] bg-white/50 p-3 dark:bg-white/5"><p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Asset Value</p><p className="mt-2 text-base font-semibold">{asset.manualValue != null ? `${formatMoney(asset.manualValue, asset.currencyCode)} | ${formatMoney(grossBaseValue, defaultCurrencyCode)}` : formatMoney(grossBaseValue, defaultCurrencyCode)}</p></div>
                  <div className="rounded-2xl border border-[var(--border)] bg-white/50 p-3 dark:bg-white/5"><p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Net Zakatable</p><p className="mt-2 text-base font-semibold">{formatMoney(netBaseValue, defaultCurrencyCode)}</p></div>
                  <div className="rounded-2xl border border-[var(--border)] bg-white/50 p-3 dark:bg-white/5"><p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Current Zakat</p><p className="mt-2 text-base font-semibold">{dueNow ? formatMoney(zakatBaseAmount, defaultCurrencyCode) : "Not due yet"}</p></div>
                  <div className="rounded-2xl border border-[var(--border)] bg-white/50 p-3 dark:bg-white/5"><p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Paid History</p><p className="mt-2 text-base font-semibold">{formatMoney(totalPaidBaseAmount, defaultCurrencyCode)}</p></div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--muted-foreground)]">
                  <span>Purchase <LocalizedDateText value={asset.purchaseDate} emptyText="N/A" /></span>
                  <span>Next cycle <LocalizedDateText value={nextCycleDate.toISOString()} emptyText="N/A" /></span>
                  {isMetalAssetType(asset.assetType) && asset.metalWeightGrams ? <span>{asset.metalWeightGrams.toFixed(3)} g | {gramsToTola(asset.metalWeightGrams).toFixed(3)} tola at {getPurityLabel(asset.metalPurity)}</span> : null}
                  <span>Preferred month {getPreferredPaymentMonthLabel(asset.preferredPaymentMonth)}</span>
                </div>
              </Card>
            );
          })}

          {filteredAssets.length === 0 ? <Card className="rounded-[28px] p-8 text-center"><p className="text-lg font-semibold">No zakat assets match this filter</p><p className="text-muted mt-2">Try another category or clear the search.</p></Card> : null}
        </div>

        <div className="space-y-6">
          <Card as="aside" className="rounded-[30px] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">{editingAssetId ? "Edit Asset" : "New Asset"}</p>
                <h2 className="section-title mt-2">{editingAssetId ? "Update a tracked zakat asset." : "Create a zakat asset record."}</h2>
              </div>
              <Badge variant="warning" size="md">Base {defaultCurrencyCode}</Badge>
            </div>

            <form onSubmit={submitAsset} className="mt-6 space-y-5">
              <div><label className="mb-2 block text-sm font-medium">Asset Name</label><input value={assetForm.name} onChange={(event) => setAssetField("name", event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" placeholder="Gold bangles, PSX portfolio, rental receivable" /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-2 block text-sm font-medium">Asset Type</label><select value={assetForm.assetType} onChange={(event) => setAssetField("assetType", event.target.value as ZakatAssetType)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5">{assetTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                <div><label className="mb-2 block text-sm font-medium">Asset Currency</label><select value={assetForm.currencyCode} onChange={(event) => setAssetField("currencyCode", event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5">{currencyOptions.map((option) => <option key={option.code} value={option.code}>{option.code} - {option.label}</option>)}</select></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-2 block text-sm font-medium">Purchase Date</label><ThemedDateInput value={assetForm.purchaseDate} onChange={(value) => setAssetField("purchaseDate", value ?? "")} max={todayInputValue()} /></div>
                <div><label className="mb-2 block text-sm font-medium">Preferred Payment Month</label><select value={assetForm.preferredPaymentMonth} onChange={(event) => setAssetField("preferredPaymentMonth", event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"><option value="">Not set</option>{zakatPaymentMonths.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}</select></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-2 block text-sm font-medium">Owner</label><select value={assetForm.ownershipRelation} onChange={(event) => { const relation = event.target.value as ZakatOwnershipRelation; setAssetForm((current) => ({ ...current, ownershipRelation: relation, countInMyAssets: relation === "self" ? current.countInMyAssets : false })); }} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5">{Object.entries(zakatOwnershipRelationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <div><label className="mb-2 block text-sm font-medium">Owner Name</label><input value={assetForm.ownerName} onChange={(event) => setAssetField("ownerName", event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" placeholder="Optional" /></div>
              </div>
              <label className="flex items-start gap-3 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm">
                <input type="checkbox" checked={assetForm.ownershipRelation === "self" ? assetForm.countInMyAssets : false} disabled={assetForm.ownershipRelation !== "self"} onChange={(event) => setAssetField("countInMyAssets", event.target.checked)} className="mt-1" />
                <span>Count this in my personal zakat totals.<span className="mt-1 block text-xs text-[var(--muted-foreground)]">Non-self assets remain documented, but they do not inflate your totals.</span></span>
              </label>
              {assetIsMetal ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div><label className="mb-2 block text-sm font-medium">Weight</label><input type="number" min="0" step="0.001" value={assetForm.metalWeightValue} onChange={(event) => setAssetField("metalWeightValue", event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" /></div>
                  <div><label className="mb-2 block text-sm font-medium">Unit</label><select value={assetForm.metalWeightUnit} onChange={(event) => setAssetField("metalWeightUnit", event.target.value as AssetFormState["metalWeightUnit"])} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"><option value="grams">Grams</option><option value="tola">Tola</option></select></div>
                  <div><label className="mb-2 block text-sm font-medium">Purity</label><select value={assetForm.metalPurity} onChange={(event) => setAssetField("metalPurity", event.target.value as AssetFormState["metalPurity"])} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5">{Object.entries(zakatMetalPurityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                </div>
              ) : <div><label className="mb-2 block text-sm font-medium">Current Zakatable Value</label><input type="number" min="0" step="0.01" value={assetForm.manualValue} onChange={(event) => setAssetField("manualValue", event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" placeholder={`Value in ${assetForm.currencyCode}`} /></div>}
              <div><label className="mb-2 block text-sm font-medium">Deductible Amount</label><input type="number" min="0" step="0.01" value={assetForm.deductibleAmount} onChange={(event) => setAssetField("deductibleAmount", event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" placeholder={`Optional in ${assetForm.currencyCode}`} /></div>
              <div><label className="mb-2 block text-sm font-medium">Notes</label><textarea value={assetForm.notes} onChange={(event) => setAssetField("notes", event.target.value)} rows={4} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" placeholder="Document what this asset is, why it is zakatable, or family context." /></div>
              {assetError ? <Alert variant="error">{assetError}</Alert> : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={resetAssetForm}>Reset</Button><Button type="submit" loading={isSavingAsset}>{editingAssetId ? "Update Asset" : "Create Asset"}</Button></div>
            </form>
          </Card>

          <Card className="rounded-[30px] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">Payments</p>
                <h2 className="section-title mt-2">{selectedAsset ? `Record or edit zakat for ${selectedAsset.name}.` : "Select an asset to manage payments."}</h2>
              </div>
              {selectedAsset && selectedMetrics ? <Badge variant={selectedMetrics.dueNow ? "danger" : "secondary"} size="md">{selectedMetrics.dueNow ? "Currently due" : "Not due yet"}</Badge> : null}
            </div>

            {selectedAsset ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--border)] bg-white/50 p-3 dark:bg-white/5"><p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Asset Value</p><p className="mt-2 font-semibold">{formatMoney(selectedMetrics?.netBaseValue, defaultCurrencyCode)}</p></div>
                  <div className="rounded-2xl border border-[var(--border)] bg-white/50 p-3 dark:bg-white/5"><p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Current Zakat</p><p className="mt-2 font-semibold">{selectedMetrics?.dueNow ? formatMoney(selectedMetrics.zakatBaseAmount, defaultCurrencyCode) : "Pending hawl"}</p></div>
                  <div className="rounded-2xl border border-[var(--border)] bg-white/50 p-3 dark:bg-white/5"><p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Preferred Month</p><p className="mt-2 font-semibold">{getPreferredPaymentMonthLabel(selectedAsset.preferredPaymentMonth)}</p></div>
                </div>

                {selectedAsset.isActive ? (
                  <form onSubmit={submitPayment} className="mt-5 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div><label className="mb-2 block text-sm font-medium">Amount</label><input type="number" min="0" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" placeholder="Payment amount" /></div>
                      <div><label className="mb-2 block text-sm font-medium">Payment Currency</label><select value={paymentForm.currencyCode} onChange={(event) => setPaymentForm((current) => ({ ...current, currencyCode: event.target.value }))} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5">{currencyOptions.map((option) => <option key={option.code} value={option.code}>{option.code} - {option.label}</option>)}</select></div>
                      <div><label className="mb-2 block text-sm font-medium">Payment Date</label><ThemedDateInput value={paymentForm.paymentDate} onChange={(value) => setPaymentForm((current) => ({ ...current, paymentDate: value ?? "" }))} /></div>
                    </div>
                    <div><label className="mb-2 block text-sm font-medium">Note</label><textarea value={paymentForm.note} onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))} rows={3} className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5" placeholder="Paid in PKR, partial settlement, behalf of spouse, etc." /></div>
                    {paymentError ? <Alert variant="error">{paymentError}</Alert> : null}
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={resetPaymentForm}>Reset</Button><Button type="submit" variant="success" loading={isSavingPayment}>{editingPaymentId ? "Update Payment" : "Record Payment"}</Button></div>
                  </form>
                ) : <Alert variant="info" className="mt-5">This asset is archived. Payment history is preserved, but new payments are disabled.</Alert>}

                <div className="mt-6 space-y-3">
                  {selectedAsset.payments.length > 0 ? selectedAsset.payments.map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-[var(--border)] bg-white/50 p-4 dark:bg-white/5">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-semibold">{formatMoney(payment.amount, payment.currencyCode)} | {formatMoney(payment.baseAmount, defaultCurrencyCode)}</p>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]"><LocalizedDateText value={payment.paymentDate} emptyText="N/A" /></p>
                          {payment.note ? <p className="mt-2 text-sm text-[var(--muted-foreground)]">{payment.note}</p> : null}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" onClick={() => startEditPayment(payment)}><Pencil className="h-4 w-4" />Edit</Button>
                          <Button variant="ghost" size="sm" loading={deletingPaymentId === payment.id} onClick={() => void deletePayment(payment.id)}><Trash2 className="h-4 w-4" />Delete</Button>
                        </div>
                      </div>
                    </div>
                  )) : <p className="text-sm text-[var(--muted-foreground)]">No zakat payments recorded for this asset yet.</p>}
                </div>

                <div className="mt-6 border-t border-[var(--border)] pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Asset Activity</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">Revision history with snapshot details. Entries stay collapsed until opened.</p>
                    </div>
                    <Badge variant="secondary">{selectedAsset.revisions.length} event{selectedAsset.revisions.length === 1 ? "" : "s"}</Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    {selectedAsset.revisions.map((revision, index) => (
                      <details
                        key={revision.id}
                        className="group overflow-hidden rounded-[22px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(248,250,252,0.58))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={index === 0 ? "warning" : "secondary"}>{revision.action}</Badge>
                              <span className="text-sm font-medium">{revision.summary || "Change recorded"}</span>
                            </div>
                            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                              <LocalizedDateText value={revision.createdAt} emptyText="N/A" />
                            </p>
                          </div>
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white/70 transition-transform group-open:rotate-180 dark:bg-white/5">
                            <ChevronDown className="h-4 w-4" />
                          </span>
                        </summary>

                        <div className="border-t border-[var(--border)] px-4 py-4">
                          <div className="grid gap-2 sm:grid-cols-2">
                            {Object.entries(revision.snapshot ?? {}).map(([key, value]) => (
                              <div key={key} className="rounded-2xl border border-[var(--border)] bg-white/60 px-3 py-3 text-xs dark:bg-white/5">
                                <p className="uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{key}</p>
                                <p className="mt-1 text-sm font-medium">{renderSnapshotValue(value)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </>
            ) : <p className="mt-4 text-sm text-[var(--muted-foreground)]">Choose an asset from the list to manage its payments and revision details.</p>}
          </Card>
        </div>
      </section>
    </div>
  );
}
