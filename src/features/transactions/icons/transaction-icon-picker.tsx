import { cn } from "@/lib/class-names";
import {
  transactionIconOptions,
  type TransactionIconKey,
} from "@/features/transactions/icons/transaction-option-icons";

type TransactionIconPickerProps = {
  value?: string | null;
  onChange: (value: TransactionIconKey) => void;
  className?: string;
};

export function TransactionIconPicker({
  value,
  onChange,
  className,
}: TransactionIconPickerProps) {
  return (
    <div
      className={cn(
        "max-h-[320px] overflow-y-auto rounded-[28px] border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur-sm",
        "dark:border-white/10 dark:bg-white/[0.04]",
        className
      )}
    >
      <div className="grid grid-cols-4 gap-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4">
        {transactionIconOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.id;

          return (
<div key={option.id} className="group flex flex-col items-center">
  <button
    type="button"
    onClick={() => onChange(option.id)}
    aria-label={option.label}
    className={cn(
      "relative flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm transition-all duration-200",
      "border-black/5 bg-black/[0.025] hover:-translate-y-0.5 hover:border-black/10 hover:bg-black/[0.04] hover:shadow-md",
      "dark:border-white/10 dark:bg-white/[0.035] dark:hover:border-white/15 dark:hover:bg-white/[0.06]",
      isSelected &&
        "border-black/10 bg-black/[0.06] ring-2 ring-black/10 dark:border-white/20 dark:bg-white/[0.08] dark:ring-white/15"
    )}
  >
    <Icon
      className={cn(
        "h-5 w-5 transition-all duration-200",
        isSelected
          ? "scale-110 opacity-100"
          : "opacity-80 group-hover:scale-105 group-hover:opacity-100"
      )}
    />
  </button>

  <div className="mt-1 h-4 text-center">
    <span className="block text-[10px] font-medium text-[var(--muted-foreground)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      {option.label}
    </span>
  </div>
</div>
          );
        })}
      </div>
    </div>
  );
}