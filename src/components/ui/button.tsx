import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/class-names";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "outline"
  | "success"
  | "warning"
  | "link";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl" | "icon";

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-all duration-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "focus-visible:ring-[var(--foreground)] disabled:pointer-events-none disabled:opacity-50 " +
  "select-none whitespace-nowrap";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-black text-white shadow-sm hover:opacity-95 active:scale-[0.98] dark:bg-white dark:text-black",

  secondary:
    "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] active:scale-[0.98]",

  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 active:scale-[0.98] " +
    "dark:bg-red-500 dark:hover:bg-red-600",

  ghost:
    "bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)] shadow-none active:scale-[0.98]",

  outline:
    "border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)] active:scale-[0.98]",

  success:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] " +
    "dark:bg-emerald-500 dark:hover:bg-emerald-600",

  warning:
    "bg-amber-500 text-black shadow-sm hover:bg-amber-600 active:scale-[0.98] " +
    "dark:bg-amber-400 dark:text-black dark:hover:bg-amber-500",

  link:
    "bg-transparent text-[var(--foreground)] underline-offset-4 hover:underline shadow-none p-0 h-auto rounded-none",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-8 px-3 text-xs",
  sm: "h-9 px-4 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
  xl: "h-12 px-6 text-base",
  icon: "h-10 w-10 p-0",
};

type ButtonClassNameOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  className?: string;
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  className,
}: ButtonClassNameOptions) {
  return cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
    loading && "cursor-wait",
    className
  );
}

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

function Spinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  fullWidth = false,
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={buttonClassName({
        variant,
        size,
        fullWidth,
        loading,
        className,
      })}
      {...props}
    >
      {loading ? <Spinner /> : leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
      {children ? <span>{children}</span> : null}
      {!loading && rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
    </button>
  );
}