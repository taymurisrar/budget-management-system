"use client";

import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";
import CurrencySelect from "@/components/currency-select";
import { Bell, Database, MonitorCog, Shield, Workflow } from "lucide-react";
import { useState, useTransition } from "react";

const options = [
  {
    title: "Automation previews",
    description: "Show experimental forecasting and planning helpers across dashboards and forms.",
    icon: Workflow,
  },
  {
    title: "Security prompts",
    description: "Require extra confirmation before deleting items, accounts, or transaction history.",
    icon: Shield,
  },
  {
    title: "Data snapshots",
    description: "Prepare scheduled export points for future backup and restore workflows.",
    icon: Database,
  },
  {
    title: "Priority notifications",
    description: "Reserve space for urgent low-stock, overspending, and overdue reminder alerts.",
    icon: Bell,
  },
];

type SettingsClientProps = {
  initialBaseCurrencyCode: string;
};

export default function SettingsClient({ initialBaseCurrencyCode }: SettingsClientProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    "Automation previews": true,
    "Security prompts": true,
    "Data snapshots": false,
    "Priority notifications": true,
  });
  const [baseCurrencyCode, setBaseCurrencyCode] = useState(initialBaseCurrencyCode);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, startSaving] = useTransition();

  function saveDefaultCurrency(nextCurrencyCode: string) {
    setBaseCurrencyCode(nextCurrencyCode);
    setSaveMessage("");

    startSaving(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseCurrencyCode: nextCurrencyCode,
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setSaveMessage(result.message ?? "Failed to save default currency.");
        return;
      }

      setSaveMessage("Default currency saved.");
      router.refresh();
    });
  }

  return (
    <div className="app-shell py-8">
      <section className="rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,249,255,0.88))] p-6 shadow-[var(--shadow-md)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(15,23,42,0.8))]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700 dark:text-sky-300">
          Settings
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="page-title">Advanced workspace controls</h1>
            <p className="text-muted mt-3 text-sm sm:text-base">
              Set workspace defaults here. The dashboard uses the default currency for converted totals while accounts keep their own native currencies.
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-950 p-3 text-white dark:bg-white dark:text-slate-950">
                <MonitorCog className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Appearance</p>
                <p className="text-muted text-xs">Dark theme is available now.</p>
              </div>
            </div>
            <div className="mt-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="glass-card rounded-[28px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Default currency</h2>
              <p className="text-muted mt-2 text-sm leading-6">
                New records can use this as the default, and dashboard totals are converted into this currency only.
              </p>
            </div>
          </div>

          <div className="mt-5 max-w-md">
            <label className="mb-2 block text-sm font-medium">Currency</label>
            <CurrencySelect
              value={baseCurrencyCode}
              onChange={(event) => saveDefaultCurrency(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5"
            />
            <p className="text-muted mt-2 text-xs">
              {isSaving ? "Saving..." : saveMessage || "Flags are shown directly in the currency list."}
            </p>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon;
          const isOn = enabled[option.title];

          return (
            <article key={option.title} className="glass-card rounded-[28px] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{option.title}</h2>
                    <p className="text-muted mt-2 text-sm leading-6">{option.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={isOn}
                  onClick={() =>
                    setEnabled((current) => ({
                      ...current,
                      [option.title]: !current[option.title],
                    }))
                  }
                  className={`settings-switch ${isOn ? "settings-switch--active" : ""}`}
                >
                  <span className="settings-switch__thumb" />
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
