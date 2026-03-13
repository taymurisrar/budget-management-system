import type { ReactNode } from "react";

type AccountFormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export default function AccountFormSection({
  title,
  description,
  children,
  className,
}: AccountFormSectionProps) {
  return (
    <section className={className}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {title}
        </h3>
        {description ? <p className="text-muted mt-1 text-sm">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
