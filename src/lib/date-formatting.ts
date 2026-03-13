import {
  defaultUserDisplayPreferences,
  type UserDateFormatPreference,
  type UserDisplayPreferences,
  type UserTimeFormatPreference,
} from "@/lib/user-preferences";

function parseDateOnlyString(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return { year, month, day };
}

function parseDate(value: string | Date) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getLocale(dateFormat: UserDateFormatPreference) {
  return dateFormat === "mdy" ? "en-US" : "en-GB";
}

function getHour12(timeFormat: UserTimeFormatPreference) {
  return timeFormat === "twelve_hour";
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateParts(
  parts: { year: number; month: number; day: number },
  dateFormat: UserDateFormatPreference
) {
  if (dateFormat === "iso") {
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  }

  if (dateFormat === "mdy") {
    return `${pad(parts.month)}/${pad(parts.day)}/${parts.year}`;
  }

  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year}`;
}

export function readDisplayPreferencesFromDocument(): UserDisplayPreferences {
  if (typeof document === "undefined") {
    return defaultUserDisplayPreferences;
  }

  const element = document.documentElement;

  return {
    dateFormat:
      (element.dataset.dateFormat as UserDateFormatPreference | undefined) ??
      defaultUserDisplayPreferences.dateFormat,
    timeFormat:
      (element.dataset.timeFormat as UserTimeFormatPreference | undefined) ??
      defaultUserDisplayPreferences.timeFormat,
    weekStartsOn:
      (element.dataset.weekStartsOn as UserDisplayPreferences["weekStartsOn"] | undefined) ??
      defaultUserDisplayPreferences.weekStartsOn,
    timezone: element.dataset.timezone ?? defaultUserDisplayPreferences.timezone,
  };
}

export function formatDateWithPreferences(
  value: string | Date,
  preferences: UserDisplayPreferences = readDisplayPreferencesFromDocument()
) {
  if (typeof value === "string") {
    const dateOnly = parseDateOnlyString(value);
    if (dateOnly) {
      return formatDateParts(dateOnly, preferences.dateFormat);
    }
  }

  const parsed = parseDate(value);
  if (!parsed) return "";

  if (preferences.dateFormat === "iso") {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: preferences.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(parsed);

    const year = parts.find((part) => part.type === "year")?.value ?? "";
    const month = parts.find((part) => part.type === "month")?.value ?? "";
    const day = parts.find((part) => part.type === "day")?.value ?? "";
    return `${year}-${month}-${day}`;
  }

  return new Intl.DateTimeFormat(getLocale(preferences.dateFormat), {
    timeZone: preferences.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

export function formatTimeWithPreferences(
  value: string | Date,
  preferences: UserDisplayPreferences = readDisplayPreferencesFromDocument()
) {
  const parsed = parseDate(value);
  if (!parsed) return "";

  return new Intl.DateTimeFormat(getLocale(preferences.dateFormat), {
    timeZone: preferences.timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: getHour12(preferences.timeFormat),
  }).format(parsed);
}

export function formatDateTimeWithPreferences(
  value: string | Date,
  preferences: UserDisplayPreferences = readDisplayPreferencesFromDocument()
) {
  const parsed = parseDate(value);
  if (!parsed) return "";

  return `${formatDateWithPreferences(parsed, preferences)} ${formatTimeWithPreferences(
    parsed,
    preferences
  )}`;
}
