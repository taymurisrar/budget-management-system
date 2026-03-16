export const zakatAssetTypes = [
  "gold",
  "silver",
  "cash",
  "investment",
  "property",
  "business_inventory",
  "receivable",
  "retirement",
  "cryptocurrency",
  "other",
] as const;

export const zakatOwnershipRelations = ["self", "spouse", "parent", "child", "other"] as const;

export const zakatMetalPurities = ["k24", "k22", "k20", "k18"] as const;
export const zakatWeightUnits = ["grams", "tola"] as const;
export const zakatNisabStandards = ["silver", "gold"] as const;

export const zakatPaymentMonths = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

export const zakatAssetTypeLabels: Record<(typeof zakatAssetTypes)[number], string> = {
  gold: "Gold",
  silver: "Silver",
  cash: "Cash",
  investment: "Investment",
  property: "Property",
  business_inventory: "Business Inventory",
  receivable: "Receivable",
  retirement: "Retirement",
  cryptocurrency: "Cryptocurrency",
  other: "Other",
};

export const zakatOwnershipRelationLabels: Record<(typeof zakatOwnershipRelations)[number], string> = {
  self: "Myself",
  spouse: "Wife / Husband",
  parent: "Parent",
  child: "Child",
  other: "Other",
};

export const zakatMetalPurityLabels: Record<(typeof zakatMetalPurities)[number], string> = {
  k24: "24K",
  k22: "22K",
  k20: "20K",
  k18: "18K",
};
