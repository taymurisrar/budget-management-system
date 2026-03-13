"use client";

import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";

const authRoutes = new Set(["/", "/signup", "/reset-password"]);

export default function AppFrame({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAuthRoute = authRoutes.has(pathname);

  if (isAuthRoute) {
    return <main className="auth-layout">{children}</main>;
  }

  return (
    <div className="app-shell-grid">
      <Sidebar />
      <main className="app-main">
        <div className="app-main__chrome">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
              Budget Management System
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Finance, planning, inventory, and settings in one workspace.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
            <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
              Dashboard first
            </span>
            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 sm:inline-flex">
              Responsive layout
            </span>
          </div>
        </div>
        <div className="app-main__content">{children}</div>
      </main>
    </div>
  );
}
