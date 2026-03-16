import {
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  BusFront,
  Car,
  CircleHelp,
  CreditCard,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Home,
  Landmark,
  LucideIcon,
  PiggyBank,
  Receipt,
  Scale,
  School,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Tags,
  Ticket,
  TrainFront,
  UtensilsCrossed,
  Wallet,
  Wifi,
  Wrench,
  Plane,
  ShieldPlus,
  Coins,
  Building2,
  Fuel,
  Tv,
  Gamepad2,
  Baby,
  PawPrint,
  Shirt,
} from "lucide-react";
import { accountIconMap } from "@/features/accounts/account-icons";

export type TransactionIconKey =
  | "salary"
  | "freelance"
  | "bonus"
  | "refund"
  | "rent"
  | "groceries"
  | "food"
  | "transport"
  | "shopping"
  | "health"
  | "medical"
  | "utility"
  | "transfer"
  | "savings"
  | "default"
  | "investment"
  | "insurance"
  | "education"
  | "travel"
  | "fuel"
  | "subscriptions"
  | "entertainment"
  | "kids"
  | "pets"
  | "clothing"
  | "bank"
  | "cash"
  | "tax"
  | "repairs";

export type TransactionIconOption = {
  id: TransactionIconKey;
  label: string;
  icon: LucideIcon;
};

export const transactionIconOptions: TransactionIconOption[] = [
  { id: "salary", label: "Salary", icon: BriefcaseBusiness },
  { id: "freelance", label: "Freelance", icon: BadgeDollarSign },
  { id: "bonus", label: "Bonus", icon: Gift },
  { id: "refund", label: "Refund", icon: Receipt },
  { id: "rent", label: "Rent", icon: Home },
  { id: "groceries", label: "Groceries", icon: ShoppingBasket },
  { id: "food", label: "Food", icon: UtensilsCrossed },
  { id: "transport", label: "Transport", icon: BusFront },
  { id: "shopping", label: "Shopping", icon: ShoppingCart },
  { id: "health", label: "Health", icon: HeartPulse },
  { id: "medical", label: "Medical", icon: ShieldPlus },
  { id: "utility", label: "Utility", icon: Wifi },
  { id: "transfer", label: "Transfer", icon: HandCoins },
  { id: "savings", label: "Savings", icon: PiggyBank },
  { id: "investment", label: "Investment", icon: Coins },
  { id: "insurance", label: "Insurance", icon: ShieldPlus },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "travel", label: "Travel", icon: Plane },
  { id: "fuel", label: "Fuel", icon: Fuel },
  { id: "subscriptions", label: "Subscriptions", icon: Smartphone },
  { id: "entertainment", label: "Entertainment", icon: Gamepad2 },
  { id: "kids", label: "Kids", icon: Baby },
  { id: "pets", label: "Pets", icon: PawPrint },
  { id: "clothing", label: "Clothing", icon: Shirt },
  { id: "bank", label: "Bank", icon: Building2 },
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "tax", label: "Tax", icon: Scale },
  { id: "repairs", label: "Repairs", icon: Wrench },
  { id: "default", label: "General", icon: Tags },
];

export const transactionCategoryIconMap: Record<TransactionIconKey, LucideIcon> =
  Object.fromEntries(
    transactionIconOptions.map((option) => [option.id, option.icon])
  ) as Record<TransactionIconKey, LucideIcon>;

export function getAccountIcon(iconKey: string | null | undefined) {
  return accountIconMap[iconKey ?? ""] ?? Wallet;
}

export function getTransactionCategoryIcon(iconKey: string | null | undefined) {
  const found = transactionIconOptions.find((option) => option.id === iconKey);
  return found?.icon ?? CircleHelp;
}

export function getTransactionCategoryOption(iconKey: string | null | undefined) {
  return (
    transactionIconOptions.find((option) => option.id === iconKey) ??
    transactionIconOptions.find((option) => option.id === "default")!
  );
}