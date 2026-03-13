export const inventoryUnits = [
  "piece",
  "small_piece",
  "large_piece",
  "pack",
  "box",
  "bag",
  "bottle",
  "tube",
  "roll",
  "tray",
  "can",
  "jar",
  "carton",
  "sachet",
  "dozen",
  "kg",
  "g",
  "lb",
  "oz",
  "l",
  "ml",
  "gallon",
] as const;

export type InventoryUnit = (typeof inventoryUnits)[number];

export type InventoryIconOption = {
  value: string;
  label: string;
  emoji: string;
};

export type InventoryUnitGroup = {
  label: string;
  description: string;
  units: Array<{
    value: InventoryUnit;
    label: string;
    shortLabel?: string;
  }>;
};

export const inventoryIconOptions: InventoryIconOption[] = [
  { value: "toothbrush", label: "Toothbrush", emoji: "🪥" },
  { value: "shampoo", label: "Shampoo", emoji: "🧴" },
  { value: "soap", label: "Soap", emoji: "🧼" },
  { value: "spray", label: "Cleaning spray", emoji: "🧽" },
  { value: "basket", label: "Basket", emoji: "🧺" },
  { value: "pill", label: "Medicine", emoji: "💊" },
  { value: "cat", label: "Pet", emoji: "🐈" },
  { value: "rice", label: "Rice", emoji: "🍚" },
  { value: "bottle", label: "Bottle", emoji: "🥤" },
  { value: "box", label: "Box", emoji: "📦" },
  { value: "tea", label: "Tea", emoji: "🫖" },
  { value: "baby", label: "Baby", emoji: "🍼" },
];

export const inventoryUnitGroups: InventoryUnitGroup[] = [
  {
    label: "Everyday pieces",
    description: "For items counted one by one or in simple bundles.",
    units: [
      { value: "piece", label: "Piece" },
      { value: "small_piece", label: "Small piece" },
      { value: "large_piece", label: "Large piece" },
      { value: "pack", label: "Pack" },
      { value: "box", label: "Box" },
      { value: "bag", label: "Bag" },
      { value: "roll", label: "Roll" },
      { value: "tray", label: "Tray" },
      { value: "carton", label: "Carton" },
      { value: "dozen", label: "Dozen" },
    ],
  },
  {
    label: "Containers",
    description: "For bottled or packaged household goods.",
    units: [
      { value: "bottle", label: "Bottle" },
      { value: "tube", label: "Tube" },
      { value: "can", label: "Can" },
      { value: "jar", label: "Jar" },
      { value: "sachet", label: "Sachet" },
    ],
  },
  {
    label: "Weight",
    description: "For groceries, spices, flour, rice, and similar stock.",
    units: [
      { value: "kg", label: "Kilogram", shortLabel: "kg" },
      { value: "g", label: "Gram", shortLabel: "g" },
      { value: "lb", label: "Pound", shortLabel: "lb" },
      { value: "oz", label: "Ounce", shortLabel: "oz" },
    ],
  },
  {
    label: "Volume",
    description: "For liquids, gels, and refill sizes.",
    units: [
      { value: "l", label: "Litre", shortLabel: "L" },
      { value: "ml", label: "Millilitre", shortLabel: "ml" },
      { value: "gallon", label: "Gallon", shortLabel: "gal" },
    ],
  },
];

export const inventoryUnitLabelMap = Object.fromEntries(
  inventoryUnitGroups.flatMap((group) =>
    group.units.map((unit) => [unit.value, unit.shortLabel ?? unit.label])
  )
) as Record<InventoryUnit, string>;

export const inventoryCategoryProfiles: Record<
  string,
  {
    subcategories: string[];
    tags: string[];
  }
> = {
  "Personal Care": {
    subcategories: ["Oral care", "Hair care", "Body care", "Skincare", "Travel size"],
    tags: ["family staple", "monthly refill", "bathroom", "travel", "opened"],
  },
  Cleaning: {
    subcategories: ["Laundry", "Kitchen cleaning", "Bathroom cleaning", "Floor care"],
    tags: ["bulk buy", "refill", "weekly use", "maid supplies", "pantry shelf"],
  },
  Groceries: {
    subcategories: ["Staples", "Spices", "Snacks", "Frozen", "Ramadan prep"],
    tags: ["desi kitchen", "iftar", "fridge", "freezer", "bulk bag"],
  },
  "Kitchen Essentials": {
    subcategories: ["Masalay", "Dry goods", "Baking", "Cooking basics"],
    tags: ["desi pantry", "meal prep", "refill", "daily use"],
  },
  Beverages: {
    subcategories: ["Tea", "Coffee", "Juices", "Soft drinks", "Water"],
    tags: ["guests", "suhoor", "office", "bulk pack"],
  },
  Medicine: {
    subcategories: ["Pain relief", "Cold & flu", "First aid", "Prescription", "Vitamins"],
    tags: ["expiry watch", "travel kit", "adults", "kids"],
  },
  "Bathroom Supplies": {
    subcategories: ["Tissue", "Soap", "Sanitary", "Guest washroom"],
    tags: ["pack", "family", "guest", "monthly refill"],
  },
  "Pet Supplies": {
    subcategories: ["Food", "Litter", "Treats", "Grooming"],
    tags: ["cat", "bulk", "monthly refill", "store room"],
  },
  "Baby Care": {
    subcategories: ["Diapers", "Wipes", "Feeding", "Bath"],
    tags: ["newborn", "travel pack", "nursery", "monthly refill"],
  },
};

export function formatInventoryUnit(unit: string | null | undefined) {
  if (!unit) return "";
  return inventoryUnitLabelMap[unit as InventoryUnit] ?? unit.replaceAll("_", " ");
}

export function findInventoryCategoryProfile(categoryName: string | null | undefined) {
  if (!categoryName) return null;
  return inventoryCategoryProfiles[categoryName] ?? null;
}
