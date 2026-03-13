"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/class-names";

type ToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  checked: boolean;
};

export function Toggle({ checked, className, type = "button", ...props }: ToggleProps) {
  return (
    <button
      type={type}
      aria-pressed={checked}
      className={cn("settings-switch", checked && "settings-switch--active", className)}
      {...props}
    >
      <span className="settings-switch__thumb" />
    </button>
  );
}
