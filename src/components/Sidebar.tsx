"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRightLeft,
  Boxes,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Target,
  X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, hint: "Home" },
  { label: "Accounts", href: "/accounts", icon: CreditCard, hint: "Balances" },
  { label: "Transactions", href: "/transactions", icon: ArrowRightLeft, hint: "Activity" },
  { label: "Inventory", href: "/inventory", icon: Boxes, hint: "Stock" },
  { label: "Goals", href: "/goals", icon: Target, hint: "Targets" },
  { label: "Settings", href: "/settings", icon: Settings, hint: "Controls" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  }

  function isItemActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className={`app-sidebar ${mobileOpen ? "app-sidebar--open" : ""}`}>
      <div className="app-sidebar__mobile-bar">
        <Link href="/dashboard" className="app-sidebar__mobile-brand">
          <span className="app-sidebar__brand-mark">
            <CircleDollarSign className="h-5 w-5" />
          </span>
          <span>
            <span className="app-sidebar__eyebrow">Finance OS</span>
            <span className="app-sidebar__title app-sidebar__title--mobile">Budget Tracker</span>
          </span>
        </Link>

        <button
          type="button"
          className="app-sidebar__toggle"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMobileOpen((current) => !current)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={`app-sidebar__overlay ${mobileOpen ? "app-sidebar__overlay--visible" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <div className="app-sidebar__panel">
        <div className="app-sidebar__brand">
          <Link href="/dashboard" className="app-sidebar__brand-mark">
            <CircleDollarSign className="h-5 w-5" />
          </Link>
          <div>
            <p className="app-sidebar__eyebrow">Finance OS</p>
            <h2 className="app-sidebar__title">Budget Tracker</h2>
          </div>
        </div>

        <nav className={`app-sidebar__nav ${mobileOpen ? "app-sidebar__nav--open" : ""}`}>
          {navItems.map((item) => {
            const isActive = isItemActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`app-sidebar__link ${isActive ? "app-sidebar__link--active" : ""}`}
              >
                <span className="app-sidebar__icon">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="app-sidebar__hint">{item.hint}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="app-sidebar__footer">
          <button type="button" className="app-sidebar__logout" onClick={() => void handleLogout()}>
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
