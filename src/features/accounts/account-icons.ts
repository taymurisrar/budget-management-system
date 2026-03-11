import {
  Banknote,
  Bitcoin,
  CreditCard,
  HandCoins,
  Landmark,
  PiggyBank,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const accountIconMap: Record<string, LucideIcon> = {
  cash: Banknote,
  debit_card: CreditCard,
  bank_account: Landmark,
  wallet: Wallet,
  credit_card: CreditCard,
  loan_given: HandCoins,
  loan_taken: HandCoins,
  stock_brokerage: PiggyBank,
  crypto_wallet: Bitcoin,
  mutual_fund: PiggyBank,
  family_member: Users,
  shared_member: Users,
};