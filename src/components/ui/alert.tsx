import type { HTMLAttributes } from "react";
import { cn } from "@/lib/class-names";

type AlertVariant = "error" | "success" | "info";

const variantClasses: Record<AlertVariant, string> = {
  error: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  info: "border-[var(--border)] bg-white/50 text-[var(--foreground)] dark:bg-white/5",
};

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

export function Alert({ className, variant = "info", ...props }: AlertProps) {
  return (
    <div
      className={cn("rounded-2xl border px-4 py-3 text-sm", variantClasses[variant], className)}
      {...props}
    />
  );
}
