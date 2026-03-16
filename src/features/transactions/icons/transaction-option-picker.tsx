import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/class-names";

export type PickerOption = {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
};

type TransactionOptionPickerProps = {
  label: string;
  value?: string | null;
  options: PickerOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
};

export function TransactionOptionPicker({
  label,
  value,
  options,
  onChange,
  placeholder = "Select an option",
  error,
  className,
  disabled = false,
}: TransactionOptionPickerProps) {
  const selectedOption = options.find((option) => option.id === value);
  const effectivePlaceholder = disabled
    ? "No options available"
    : placeholder;

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>

      <details
        className={cn("group relative", disabled && "pointer-events-none")}
      >
        <summary
          className={cn(
            "flex min-h-12 w-full list-none items-center justify-between rounded-2xl border px-4 py-3 transition-all duration-200",
            disabled
              ? "cursor-not-allowed bg-black/[0.03] opacity-60 dark:bg-white/[0.03]"
              : "cursor-pointer bg-white/80 shadow-sm hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:bg-white/[0.04] dark:hover:bg-white/[0.07]",
            error
              ? "border-red-300 dark:border-red-500/40"
              : "border-[var(--border)]"
          )}
          aria-label={label}
        >
          <div className="min-w-0 flex items-center gap-3">
            {selectedOption?.icon ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-black/[0.04] dark:bg-white/[0.06]">
                <selectedOption.icon className="h-4 w-4" />
              </div>
            ) : null}

            <div className="min-w-0 text-left">
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  selectedOption
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)]"
                )}
              >
                {selectedOption?.label ?? effectivePlaceholder}
              </p>

              {selectedOption?.description ? (
                <p className="truncate text-xs text-[var(--muted-foreground)]">
                  {selectedOption.description}
                </p>
              ) : null}
            </div>
          </div>

          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 opacity-60 transition-transform duration-200",
              !disabled && "group-open:rotate-180"
            )}
          />
        </summary>

        {!disabled ? (
          <div
            className={cn(
              "absolute left-0 top-[calc(100%+12px)] z-50 w-full overflow-hidden rounded-[26px]",
              "border border-black/5 bg-white/95 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.16)] backdrop-blur-xl",
              "dark:border-white/10 dark:bg-[#0f1115]/95 dark:shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
            )}
          >
            <div className="max-h-[280px] overflow-y-auto p-1">
              <div className="space-y-1">
                {options.map((option) => {
                  const Icon = option.icon;
                  const isSelected = option.id === value;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        onChange(option.id);
                        const detailsEl =
                          document.activeElement?.closest("details");
                        if (detailsEl instanceof HTMLDetailsElement) {
                          detailsEl.open = false;
                        }
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-150",
                        "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
                        isSelected && "bg-black/[0.05] dark:bg-white/[0.08]"
                      )}
                    >
                      {Icon ? (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-black/[0.04] dark:bg-white/[0.06]">
                          <Icon className="h-4 w-4" />
                        </div>
                      ) : null}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {option.label}
                        </p>
                        {option.description ? (
                          <p className="truncate text-xs text-[var(--muted-foreground)]">
                            {option.description}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </details>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}