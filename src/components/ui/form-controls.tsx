import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/class-names";

const controlClassName =
  "w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5";

export function inputClassName(className?: string) {
  return cn(controlClassName, className);
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClassName(className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClassName(className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={inputClassName(className)} {...props} />;
}

export function FormLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-2 block text-sm font-medium", className)} {...props} />;
}

export function FormHint({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("mt-2 text-xs text-[var(--muted-foreground)]", className)}>{children}</p>;
}

export function FormError({ className, message }: { className?: string; message?: string }) {
  if (!message) {
    return null;
  }

  return <p className={cn("mt-2 text-sm text-red-600", className)}>{message}</p>;
}
