import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/class-names";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-black text-white shadow-lg hover:opacity-95 dark:bg-white dark:text-black",
  secondary: "border border-[var(--border)] bg-transparent text-[var(--foreground)]",
  danger:
    "border border-red-200 bg-transparent text-red-700 dark:border-red-500/30 dark:text-red-300",
  ghost: "bg-transparent text-[var(--foreground)] shadow-none",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm font-medium",
  md: "px-4 py-2.5 text-sm font-medium",
  lg: "px-5 py-3 text-sm font-medium",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl transition hover:-translate-y-0.5 disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClassName({ variant, size, className })} {...props} />;
}
