import type { HTMLAttributes } from "react";
import { cn } from "@/lib/class-names";

type BadgeVariant = "neutral" | "blue" | "success";

const badgeClasses: Record<BadgeVariant, string> = {
  neutral: "bg-black/5 text-[var(--foreground)] dark:bg-white/10",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn("rounded-full px-2.5 py-1 text-xs", badgeClasses[variant], className)}
      {...props}
    />
  );
}
