import {
  BadgeDollarSign,
  BriefcaseBusiness,
  BusFront,
  CircleHelp,
  Gift,
  HandCoins,
  HeartPulse,
  Home,
  Landmark,
  LucideIcon,
  Receipt,
  ShoppingBasket,
  ShoppingCart,
  Tags,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { accountIconMap } from "@/features/accounts/account-icons";

export const transactionCategoryIconMap: Record<string, LucideIcon> = {
  salary: BriefcaseBusiness,
  freelance: BadgeDollarSign,
  bonus: Gift,
  refund: Receipt,
  rent: Home,
  groceries: ShoppingBasket,
  food: UtensilsCrossed,
  transport: BusFront,
  shopping: ShoppingCart,
  health: HeartPulse,
  medical: HeartPulse,
  utility: Landmark,
  transfer: HandCoins,
  savings: Wallet,
  default: Tags,
};

export const transactionIconChoices = [
  "salary",
  "freelance",
  "bonus",
  "refund",
  "rent",
  "groceries",
  "food",
  "transport",
  "shopping",
  "health",
  "medical",
  "utility",
  "transfer",
  "savings",
  "default",
] as const;

export function getAccountIcon(iconKey: string | null | undefined) {
  return accountIconMap[iconKey ?? ""] ?? Wallet;
}

export function getTransactionCategoryIcon(iconKey: string | null | undefined) {
  return transactionCategoryIconMap[iconKey ?? ""] ?? CircleHelp;
}
