import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/class-names";

type AccountCheckboxFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export default function AccountCheckboxField({
  label,
  className,
  ...props
}: AccountCheckboxFieldProps) {
  return (
    <label className={cn("flex items-center gap-3 rounded-xl border px-4 py-3", className)}>
      <input type="checkbox" {...props} />
      <span className="text-sm">{label}</span>
    </label>
  );
}
