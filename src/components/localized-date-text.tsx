"use client";

import { useSyncExternalStore } from "react";
import {
  formatDateTimeWithPreferences,
  formatDateWithPreferences,
  formatTimeWithPreferences,
} from "@/lib/date-formatting";

type LocalizedDateTextProps = {
  value: string | Date | null | undefined;
  kind?: "date" | "time" | "datetime";
  emptyText?: string;
  className?: string;
};

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getFallbackText(value: string | Date | null | undefined, kind: "date" | "time" | "datetime") {
  const parsed = toDate(value);
  if (!parsed) return "";

  const iso = parsed.toISOString();
  if (kind === "time") {
    return iso.slice(11, 16);
  }

  if (kind === "datetime") {
    return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
  }

  return iso.slice(0, 10);
}

function getLocalizedText(value: string | Date, kind: "date" | "time" | "datetime") {
  if (kind === "time") return formatTimeWithPreferences(value);
  if (kind === "datetime") return formatDateTimeWithPreferences(value);
  return formatDateWithPreferences(value);
}

export default function LocalizedDateText({
  value,
  kind = "date",
  emptyText = "",
  className,
}: LocalizedDateTextProps) {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!value) {
    return emptyText ? <span className={className}>{emptyText}</span> : null;
  }

  const displayText = hydrated ? getLocalizedText(value, kind) : getFallbackText(value, kind);

  return (
    <span className={className} suppressHydrationWarning>
      {displayText}
    </span>
  );
}
