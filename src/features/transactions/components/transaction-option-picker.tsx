"use client";

import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type PickerOption = {
  id: string;
  label: string;
  description?: string | null;
  icon: LucideIcon;
  colorHex?: string | null;
  disabled?: boolean;
};

type OptionPickerProps = {
  label: string;
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
};

export default function TransactionOptionPicker({
  label,
  value,
  options,
  onChange,
  placeholder = "Select an option",
  error,
  disabled = false,
}: OptionPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.id === value);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-left shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/5"
      >
        <span className="flex min-w-0 items-center gap-3">
          {selectedOption ? (
            <>
              <span
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-700 dark:text-slate-100"
                style={{
                  backgroundColor: selectedOption.colorHex || "rgba(15, 23, 42, 0.08)",
                }}
              >
                <selectedOption.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{selectedOption.label}</span>
                {selectedOption.description ? (
                  <span className="block truncate text-xs text-slate-500">
                    {selectedOption.description}
                  </span>
                ) : null}
              </span>
            </>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-500" />
      </button>

      {open ? (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-[var(--border)] bg-white p-2 shadow-2xl dark:bg-slate-950">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">No options available.</p>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/5"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-700 dark:text-slate-100"
                    style={{
                      backgroundColor: option.colorHex || "rgba(15, 23, 42, 0.08)",
                    }}
                  >
                    <option.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{option.label}</span>
                    {option.description ? (
                      <span className="block truncate text-xs text-slate-500">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </span>
                {option.id === value ? <Check className="h-4 w-4 text-emerald-600" /> : null}
              </button>
            ))
          )}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
