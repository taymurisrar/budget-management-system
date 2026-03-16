import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/class-names";

export type BadgeVariant =
  | "default"
  | "neutral"
  | "primary"
  | "secondary"
  | "blue"
  | "success"
  | "warning"
  | "danger"
  | "outline"
  | "ghost";

export type BadgeSize = "xs" | "sm" | "md" | "lg";

const baseClasses =
  "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors";

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default:
    "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",

  neutral:
    "bg-black/5 text-[var(--foreground)] dark:bg-white/10 dark:text-[var(--foreground)]",

  primary:
    "bg-black text-white dark:bg-white dark:text-black",

  secondary:
    "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]",

  blue:
    "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",

  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",

  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",

  danger:
    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",

  outline:
    "border border-[var(--border)] bg-transparent text-[var(--foreground)]",

  ghost:
    "bg-transparent text-[var(--foreground)]",
};

const badgeSizeClasses: Record<BadgeSize, string> = {
  xs: "px-2 py-0.5 text-[10px]",
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-3.5 py-1.5 text-sm",
};

type BadgeClassNameOptions = {
  variant?: BadgeVariant;
  size?: BadgeSize;
  rounded?: "full" | "md";
  clickable?: boolean;
  className?: string;
};

export function badgeClassName({
  variant = "neutral",
  size = "sm",
  rounded = "full",
  clickable = false,
  className,
}: BadgeClassNameOptions) {
  return cn(
    baseClasses,
    badgeVariantClasses[variant],
    badgeSizeClasses[size],
    rounded === "full" ? "rounded-full" : "rounded-md",
    clickable && "cursor-pointer hover:opacity-90",
    className
  );
}

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
  rounded?: "full" | "md";
  clickable?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  dot?: boolean;
};

export function Badge({
  className,
  variant = "neutral",
  size = "sm",
  rounded = "full",
  clickable = false,
  leftIcon,
  rightIcon,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const dotClassName =
    size === "xs"
      ? "h-1.5 w-1.5"
      : size === "sm"
      ? "h-2 w-2"
      : size === "md"
      ? "h-2.5 w-2.5"
      : "h-3 w-3";

  return (
    <span
      className={badgeClassName({
        variant,
        size,
        rounded,
        clickable,
        className,
      })}
      {...props}
    >
      {dot ? (
        <span
          className={cn(
            "rounded-full bg-current opacity-80",
            dotClassName
          )}
          aria-hidden="true"
        />
      ) : null}

      {leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
      {children ? <span>{children}</span> : null}
      {rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
    </span>
  );
}