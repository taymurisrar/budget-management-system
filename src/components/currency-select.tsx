"use client";

import type { SelectHTMLAttributes } from "react";
import { currencyOptions } from "@/lib/currencies";

type CurrencySelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export default function CurrencySelect({ className, ...props }: CurrencySelectProps) {
  return (
    <select className={className} {...props}>
      {currencyOptions.map((currency) => (
        <option key={currency.code} value={currency.code}>
          {currency.flag} {currency.code} - {currency.label}
        </option>
      ))}
    </select>
  );
}
