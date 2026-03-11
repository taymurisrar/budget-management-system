"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRightLeft,
  Boxes,
  CircleDollarSign,
  CreditCard,
  House,
  LayoutDashboard,
  PiggyBank,
} from "lucide-react";

const navItems = [
  { label: "Home", href: "/", icon: House, hint: "Overview" },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, hint: "Signals" },
  { label: "Accounts", href: "/accounts", icon: CreditCard, hint: "Balances" },
  { label: "Transactions", href: "/transactions", icon: ArrowRightLeft, hint: "Activity" },
  { label: "Budgets", href: "/budgets", icon: PiggyBank, hint: "Planning" },
  { label: "Inventory", href: "/inventory", icon: Boxes, hint: "Home stock" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__panel">
        <div className="app-sidebar__brand">
          <div className="app-sidebar__brand-mark">
            <CircleDollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200/70">
              Finance OS
            </p>
            <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">
              Budget Tracker
            </h2>
          </div>
        </div>

        <div className="app-sidebar__summary">
          <p className="text-sm font-medium text-white/90">Control center</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            Track cash flow, budgets, and household inventory from one place.
          </p>
        </div>

        <nav className="app-sidebar__nav">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-sidebar__link ${isActive ? "app-sidebar__link--active" : ""}`}
              >
                <span className="app-sidebar__icon">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-slate-400">{item.hint}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="app-sidebar__footer">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
            Personal finance
          </span>
          <p className="mt-3 text-sm text-slate-400">
            Cleaner navigation, faster scanning, better daily use.
          </p>
        </div>
      </div>
    </aside>
  );
}
