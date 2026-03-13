export type CurrencyOption = {
  code: string;
  label: string;
  flag: string;
};

export const currencyOptions: CurrencyOption[] = [
  { code: "QAR", label: "Qatari Riyal", flag: "🇶🇦" },
  { code: "PKR", label: "Pakistani Rupee", flag: "🇵🇰" },
  { code: "USD", label: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", label: "Euro", flag: "🇪🇺" },
  { code: "GBP", label: "British Pound", flag: "🇬🇧" },
  { code: "AED", label: "UAE Dirham", flag: "🇦🇪" },
  { code: "SAR", label: "Saudi Riyal", flag: "🇸🇦" },
  { code: "TRY", label: "Turkish Lira", flag: "🇹🇷" },
  { code: "JPY", label: "Japanese Yen", flag: "🇯🇵" },
  { code: "CHF", label: "Swiss Franc", flag: "🇨🇭" },
];

export const defaultCurrencyCode = "QAR";

export function isSupportedCurrency(code: string) {
  return currencyOptions.some((currency) => currency.code === code.toUpperCase());
}

export function getCurrencyOption(code: string) {
  return currencyOptions.find((currency) => currency.code === code.toUpperCase()) ?? null;
}
