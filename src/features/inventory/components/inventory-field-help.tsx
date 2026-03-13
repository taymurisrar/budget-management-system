"use client";

import { CircleHelp } from "lucide-react";

type InventoryFieldHelpProps = {
  label: string;
  help: string;
  optional?: boolean;
};

export function InventoryFieldHelp({
  label,
  help,
  optional = false,
}: InventoryFieldHelpProps) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <label className="block text-sm font-medium">{label}</label>
      {optional ? <span className="text-xs text-slate-500">Optional</span> : null}
      <div className="group relative">
        <button
          type="button"
          aria-label={`${label} help`}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
        >
          <CircleHelp className="h-4 w-4" />
        </button>
        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-64 -translate-x-1/2 rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs leading-5 text-slate-600 shadow-lg group-hover:block group-focus-within:block dark:bg-slate-950 dark:text-slate-300">
          {help}
        </div>
      </div>
    </div>
  );
}
