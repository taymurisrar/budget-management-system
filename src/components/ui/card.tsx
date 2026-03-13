import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/class-names";

type CardProps<T extends ElementType = "div"> = HTMLAttributes<HTMLElement> & {
  as?: T;
  tone?: "glass" | "soft";
};

export function Card<T extends ElementType = "div">({
  as,
  className,
  tone = "glass",
  ...props
}: CardProps<T>) {
  const Component = as ?? "div";

  return <Component className={cn(tone === "glass" ? "glass-card" : "soft-card", className)} {...props} />;
}
