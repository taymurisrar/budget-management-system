import type { ReactNode } from "react";

type AccountPageShellProps = {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
};

export default function AccountPageShell({
  title,
  description,
  action,
  children,
}: AccountPageShellProps) {
  return (
    <div className="app-shell py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="text-muted mt-2">{description}</p>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="mt-8">{children}</div>
    </div>
  );
}
