import "./globals.css";
import Sidebar from "@/components/Sidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Track accounts, budgets, expenses, and home inventory",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-backdrop" aria-hidden="true" />
        <div className="app-shell-grid">
          <Sidebar />
          <main className="app-main">
            <div className="app-main__chrome">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                  Budget Management System
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  A clearer workspace for finance, planning, and inventory.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 shadow-sm">
                  Unified workspace
                </span>
                <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700 shadow-sm sm:inline-flex">
                  Live structure
                </span>
              </div>
            </div>
            <div className="app-main__content">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
