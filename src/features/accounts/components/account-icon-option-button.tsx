import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/class-names";

type AccountIconOptionButtonProps = {
  icon: LucideIcon;
  label: string;
  selected: boolean;
  onClick: () => void;
};

export default function AccountIconOptionButton({
  icon: Icon,
  label,
  selected,
  onClick,
}: AccountIconOptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition hover:bg-black/5 dark:hover:bg-white/5",
        selected ? "border-black bg-black/5 dark:border-white dark:bg-white/10" : "border-[var(--border)]"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
