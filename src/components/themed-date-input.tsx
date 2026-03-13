"use client";

import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatDateWithPreferences, readDisplayPreferencesFromDocument } from "@/lib/date-formatting";
import {
  defaultUserDisplayPreferences,
  getWeekStartDayIndex,
  type UserDisplayPreferences,
} from "@/lib/user-preferences";

type ThemedDateInputProps = {
  value?: string;
  onChange: (value?: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

function parseDateOnly(value?: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  date.setHours(12, 0, 0, 0);
  return date;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPlaceholder(preferences: UserDisplayPreferences) {
  if (preferences.dateFormat === "iso") return "yyyy-mm-dd";
  if (preferences.dateFormat === "mdy") return "mm/dd/yyyy";
  return "dd/mm/yyyy";
}

function sameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function withinRange(date: Date, min?: string, max?: string) {
  const iso = toIsoDate(date);
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
}

export default function ThemedDateInput({
  value,
  onChange,
  min,
  max,
  placeholder,
  disabled,
  className = "",
}: ThemedDateInputProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedDate = parseDateOnly(value);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => selectedDate ?? new Date());
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const preferences: UserDisplayPreferences = hydrated
    ? readDisplayPreferencesFromDocument()
    : defaultUserDisplayPreferences;
  const weekStartIndex = getWeekStartDayIndex(preferences.weekStartsOn);

  const baseHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekHeaders = [...baseHeaders.slice(weekStartIndex), ...baseHeaders.slice(0, weekStartIndex)];
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1, 12);
  const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 12);
  const leading = (monthStart.getDay() - weekStartIndex + 7) % 7;
  const totalCells = Math.ceil((leading + monthEnd.getDate()) / 7) * 7;
  const startDate = new Date(monthStart);
  startDate.setDate(monthStart.getDate() - leading);
  const calendarDays = Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });

  const displayValue = value ? formatDateWithPreferences(value, preferences) : "";
  const fallbackDisplayValue = value ?? "";
  const resolvedPlaceholder = placeholder || getPlaceholder(preferences);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (selectedDate && !sameMonth(selectedDate, viewDate)) {
            setViewDate(selectedDate);
          }
          setIsOpen((current) => !current);
        }}
        className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(248,250,252,0.72))] px-4 py-3 text-left shadow-[var(--shadow-xs)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.68))]"
      >
        <span className={displayValue ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>
          <span suppressHydrationWarning>{displayValue || fallbackDisplayValue || resolvedPlaceholder}</span>
        </span>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white dark:bg-sky-100 dark:text-slate-950">
          <CalendarDays className="h-4 w-4" />
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(100%,20rem)] rounded-[26px] border border-[var(--border)] bg-[rgba(255,255,255,0.96)] p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl dark:bg-[rgba(15,23,42,0.96)]">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold">
              {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(viewDate)}
            </p>
            <div className="flex items-center gap-2">
              {value ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange(undefined);
                    setIsOpen(false);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-rose-600 dark:text-rose-300"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {weekHeaders.map((label) => (
              <div key={label} className="py-2">
                {label}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const iso = toIsoDate(day);
              const isCurrentMonth = sameMonth(day, viewDate);
              const isSelected = value === iso;
              const isDisabled = !withinRange(day, min, max);

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(iso);
                    setIsOpen(false);
                  }}
                  className={`h-10 rounded-2xl text-sm transition ${
                    isSelected
                      ? "bg-slate-950 text-white dark:bg-sky-100 dark:text-slate-950"
                      : isCurrentMonth
                        ? "bg-white/70 text-[var(--foreground)] hover:bg-sky-50 dark:bg-white/5 dark:hover:bg-sky-500/10"
                        : "bg-transparent text-[var(--muted-foreground)]"
                  } ${isDisabled ? "cursor-not-allowed opacity-35" : ""}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
