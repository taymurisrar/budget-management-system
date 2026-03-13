"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  ChevronRight,
  CreditCard,
  Download,
  Globe2,
  HardDriveDownload,
  KeyRound,
  Layers3,
  MonitorCog,
  Shield,
  Upload,
  UserCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import CurrencySelect from "@/components/currency-select";
import LocalizedDateText from "@/components/localized-date-text";
import ThemeToggle from "@/components/theme-toggle";
import TransactionCategoryManagementClient from "@/features/transactions/components/transaction-category-management-client";

type LocalPreferences = {
  dateFormat: "dmy" | "mdy" | "iso";
  timeFormat: "twelve_hour" | "twenty_four_hour";
  weekStartsOn: "sunday" | "monday" | "saturday";
  priorityNotifications: boolean;
  automationPreviews: boolean;
  securityPrompts: boolean;
  compactMode: boolean;
};

type BackupPreferences = {
  provider: "browser_download" | "local_path" | "google_drive";
  schedule: "manual" | "daily" | "weekly" | "monthly";
  autoEnabled: boolean;
  localPath: string;
  lastBackupAt: string | null;
};

type TransferDataType = "inventory_items" | "accounts" | "categories";

type SettingsClientProps = {
  userId: string;
  userName: string;
  userEmail: string;
  initialBaseCurrencyCode: string;
  initialTimezone: string;
  accountCount: number;
  initialPreferences: LocalPreferences;
  initialBackupPreferences: BackupPreferences;
  initialCategories: Array<{
    id: string;
    userId: string;
    name: string;
    type: "income" | "expense";
    iconKey: string | null;
    colorHex: string | null;
    sortOrder: number;
    isActive: boolean;
    subcategories: Array<{
      id: string;
      name: string;
      iconKey: string | null;
      colorHex: string | null;
      sortOrder: number;
      isActive: boolean;
    }>;
  }>;
};

type SettingsSectionId =
  | "profile"
  | "regional"
  | "appearance"
  | "security"
  | "categories"
  | "advanced";

const timezones = [
  "UTC",
  "Asia/Riyadh",
  "Asia/Qatar",
  "Asia/Karachi",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
];

const settingsSections = [
  { id: "profile", title: "Profile", icon: UserCircle2 },
  { id: "regional", title: "Regional", icon: Globe2 },
  { id: "appearance", title: "Appearance", icon: MonitorCog },
  { id: "security", title: "Security", icon: Shield },
  { id: "categories", title: "Categories", icon: Layers3 },
  { id: "advanced", title: "Data & Backups", icon: HardDriveDownload },
] as const;

const transferOptions: Array<{ value: TransferDataType; label: string }> = [
  { value: "inventory_items", label: "Inventory items" },
  { value: "accounts", label: "Accounts" },
  { value: "categories", label: "Categories / subcategories" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
      {children}
    </p>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onToggle,
}: {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-[var(--border)] bg-white/70 px-4 py-3 dark:bg-white/5">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-muted mt-1 text-sm">{description}</p>
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={onToggle}
        className={`settings-switch ${checked ? "settings-switch--active" : ""}`}
      >
        <span className="settings-switch__thumb" />
      </button>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-card rounded-[28px] p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function SettingsClient({
  userId,
  userName,
  userEmail,
  initialBaseCurrencyCode,
  initialTimezone,
  accountCount,
  initialPreferences,
  initialBackupPreferences,
  initialCategories,
}: SettingsClientProps) {
  const router = useRouter();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("profile");
  const [profileName, setProfileName] = useState(userName);
  const [baseCurrencyCode, setBaseCurrencyCode] = useState(initialBaseCurrencyCode);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [localPreferences, setLocalPreferences] = useState(initialPreferences);
  const [backupPreferences, setBackupPreferences] = useState(initialBackupPreferences);
  const [transferType, setTransferType] = useState<TransferDataType>("inventory_items");
  const [selectedImportFileName, setSelectedImportFileName] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [isSaving, startSaving] = useTransition();
  const [isExporting, startExporting] = useTransition();
  const [isImporting, startImporting] = useTransition();
  const [isCreatingBackup, startCreatingBackup] = useTransition();

  const totalCategoryCount = useMemo(
    () => initialCategories.reduce((sum, category) => sum + 1 + category.subcategories.length, 0),
    [initialCategories]
  );

  const activeMeta = settingsSections.find((section) => section.id === activeSection);
  function patchSettings(
    payload: {
      name?: string;
      baseCurrencyCode?: string;
      timezone?: string;
      backupProvider?: BackupPreferences["provider"];
      backupSchedule?: BackupPreferences["schedule"];
      backupAutoEnabled?: boolean;
      backupLocalPath?: string;
    } & Partial<LocalPreferences>
  ) {
    setSaveMessage("");

    startSaving(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setSaveMessage(result.message ?? "Failed to save settings.");
        return;
      }

      setSaveMessage("Settings saved.");
      router.refresh();
    });
  }

  function updatePreference<K extends keyof LocalPreferences>(key: K, value: LocalPreferences[K]) {
    setLocalPreferences((current) => ({ ...current, [key]: value }));
  }

  function saveBackupPreferences(next: Partial<BackupPreferences>) {
    const merged = { ...backupPreferences, ...next };
    setBackupPreferences(merged);
    patchSettings({
      backupProvider: merged.provider,
      backupSchedule: merged.schedule,
      backupAutoEnabled: merged.autoEnabled,
      backupLocalPath: merged.localPath,
    });
  }

  async function downloadCsv(response: Response, fallbackPrefix: string) {
    const csv = await response.text();
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    const fileName = match?.[1] ?? `${fallbackPrefix}.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  function handleExport() {
    setTransferMessage("");

    startExporting(async () => {
      const response = await fetch(`/api/settings/data-transfer?type=${transferType}`);
      if (!response.ok) {
        let message = "Failed to export CSV.";
        try {
          const result = await response.json();
          message = result.message ?? message;
        } catch {}
        setTransferMessage(message);
        return;
      }

      await downloadCsv(response, transferType);
      setTransferMessage("CSV exported.");
    });
  }

  function handleImport() {
    const file = importInputRef.current?.files?.[0];
    if (!file) {
      setTransferMessage("Choose a CSV file first.");
      return;
    }

    setTransferMessage("");
    startImporting(async () => {
      try {
        const csv = await file.text();
        const response = await fetch("/api/settings/data-transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: transferType,
            csv,
          }),
        });
        const result = await response.json();

        if (!response.ok) {
          setTransferMessage(result.message ?? "Import failed.");
          return;
        }

        setTransferMessage(result.message ?? "Import completed.");
        router.refresh();
      } catch (error) {
        setTransferMessage(error instanceof Error ? error.message : "Import failed.");
      }
    });
  }

  function handleCreateBackup() {
    setBackupMessage("");

    startCreatingBackup(async () => {
      const response = await fetch("/api/settings/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: backupPreferences.provider,
          localPath: backupPreferences.localPath,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setBackupMessage(result.message ?? "Failed to create backup.");
        return;
      }

      if (result.mode === "download" && result.payload) {
        const blob = new Blob([JSON.stringify(result.payload, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `budget-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }

      setBackupPreferences((current) => ({
        ...current,
        lastBackupAt: result.lastBackupAt ?? current.lastBackupAt,
      }));
      setBackupMessage(result.filePath ? `${result.message} ${result.filePath}` : result.message);
    });
  }

  return (
    <div className="app-shell py-8">
      <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="glass-card rounded-[28px] p-4">
          <div className="rounded-[24px] border border-[var(--border)] bg-slate-950 px-5 py-6 text-white dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Settings</p>
            <h1 className="mt-3 text-xl font-semibold">{userName}</h1>
            <p className="mt-1 text-sm text-slate-300">{userEmail}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-slate-300">Accounts</p>
                <p className="mt-1 text-lg font-semibold">{accountCount}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-slate-300">Categories</p>
                <p className="mt-1 text-lg font-semibold">{totalCategoryCount}</p>
              </div>
            </div>
          </div>

          <nav className="mt-4 space-y-2">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-left ${
                    active
                      ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300"
                      : "border-transparent hover:border-[var(--border)] hover:bg-white/60 dark:hover:bg-white/5"
                  }`}
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-white/80 dark:bg-slate-950/50">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium">{section.title}</span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="space-y-6">
          <div className="glass-card rounded-[28px] px-6 py-5">
            <SectionLabel>{activeMeta?.title}</SectionLabel>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Use the controls below to update your current settings.
            </p>
          </div>

          {activeSection === "profile" ? (
            <Panel title="Profile">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Display name</label>
                  <input
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    className="w-full px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email</label>
                  <input value={userEmail} disabled className="w-full px-4 py-3 opacity-70" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => patchSettings({ name: profileName })}
                  className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  {isSaving ? "Saving..." : "Save profile"}
                </button>
                <Link
                  href="/reset-password"
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium"
                >
                  <KeyRound className="h-4 w-4" />
                  Change password
                </Link>
              </div>
            </Panel>
          ) : null}

          {activeSection === "regional" ? (
            <Panel title="Regional preferences">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Default currency</label>
                  <CurrencySelect
                    value={baseCurrencyCode}
                    onChange={(event) => setBaseCurrencyCode(event.target.value)}
                    className="w-full px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    className="w-full px-4 py-3"
                  >
                    {timezones.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Date format</label>
                  <select
                    value={localPreferences.dateFormat}
                    onChange={(event) =>
                      updatePreference("dateFormat", event.target.value as LocalPreferences["dateFormat"])
                    }
                    className="w-full px-4 py-3"
                  >
                    <option value="dmy">DD/MM/YYYY</option>
                    <option value="mdy">MM/DD/YYYY</option>
                    <option value="iso">YYYY-MM-DD</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Time format</label>
                  <select
                    value={localPreferences.timeFormat}
                    onChange={(event) =>
                      updatePreference(
                        "timeFormat",
                        event.target.value as LocalPreferences["timeFormat"]
                      )
                    }
                    className="w-full px-4 py-3"
                  >
                    <option value="twelve_hour">12-hour</option>
                    <option value="twenty_four_hour">24-hour</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Week starts on</label>
                  <select
                    value={localPreferences.weekStartsOn}
                    onChange={(event) =>
                      updatePreference(
                        "weekStartsOn",
                        event.target.value as LocalPreferences["weekStartsOn"]
                      )
                    }
                    className="w-full px-4 py-3"
                  >
                    <option value="monday">Monday</option>
                    <option value="sunday">Sunday</option>
                    <option value="saturday">Saturday</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    patchSettings({
                      baseCurrencyCode,
                      timezone,
                      dateFormat: localPreferences.dateFormat,
                      timeFormat: localPreferences.timeFormat,
                      weekStartsOn: localPreferences.weekStartsOn,
                    })
                  }
                  className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  {isSaving ? "Saving..." : "Save regional settings"}
                </button>
              </div>
            </Panel>
          ) : null}

          {activeSection === "appearance" ? (
            <Panel title="Appearance">
              <div className="space-y-4">
                <div className="rounded-[22px] border border-[var(--border)] bg-white/70 p-4 dark:bg-white/5">
                  <label className="mb-3 block text-sm font-medium">Theme</label>
                  <ThemeToggle />
                </div>
                <ToggleRow
                  title="Compact mode"
                  description="Reduce spacing in lists and forms."
                  checked={localPreferences.compactMode}
                  onToggle={() => {
                    const nextValue = !localPreferences.compactMode;
                    updatePreference("compactMode", nextValue);
                    patchSettings({ compactMode: nextValue });
                  }}
                />
              </div>
            </Panel>
          ) : null}

          {activeSection === "security" ? (
            <Panel title="Security">
              <div className="space-y-4">
                <ToggleRow
                  title="Security prompts"
                  description="Ask for confirmation before risky actions."
                  checked={localPreferences.securityPrompts}
                  onToggle={() => {
                    const nextValue = !localPreferences.securityPrompts;
                    updatePreference("securityPrompts", nextValue);
                    patchSettings({ securityPrompts: nextValue });
                  }}
                />
                <ToggleRow
                  title="Priority notifications"
                  description="Highlight important alerts first."
                  checked={localPreferences.priorityNotifications}
                  onToggle={() => {
                    const nextValue = !localPreferences.priorityNotifications;
                    updatePreference("priorityNotifications", nextValue);
                    patchSettings({ priorityNotifications: nextValue });
                  }}
                />
                <ToggleRow
                  title="Automation previews"
                  description="Show planning and automation previews."
                  checked={localPreferences.automationPreviews}
                  onToggle={() => {
                    const nextValue = !localPreferences.automationPreviews;
                    updatePreference("automationPreviews", nextValue);
                    patchSettings({ automationPreviews: nextValue });
                  }}
                />
              </div>
            </Panel>
          ) : null}

          {activeSection === "categories" ? (
            <section className="space-y-6">
              <Panel title="Category manager">
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/accounts"
                    className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium"
                  >
                    <CreditCard className="h-4 w-4" />
                    Accounts
                  </Link>
                </div>
              </Panel>
              <TransactionCategoryManagementClient
                userId={userId}
                initialCategories={initialCategories}
                embedded
              />
            </section>
          ) : null}

          {activeSection === "advanced" ? (
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <Panel title="Import / export">
                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Data type</label>
                    <select
                      value={transferType}
                      onChange={(event) => setTransferType(event.target.value as TransferDataType)}
                      className="w-full px-4 py-3"
                    >
                      {transferOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleExport}
                      disabled={isExporting}
                      className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
                    >
                      <Download className="h-4 w-4" />
                      {isExporting ? "Exporting..." : "Export CSV"}
                    </button>
                    <button
                      type="button"
                      onClick={() => importInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium"
                    >
                      <Upload className="h-4 w-4" />
                      Choose CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={isImporting}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4" />
                      {isImporting ? "Importing..." : "Import CSV"}
                    </button>
                  </div>

                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(event) =>
                      setSelectedImportFileName(event.target.files?.[0]?.name ?? "")
                    }
                  />

                  <div className="rounded-[22px] border border-[var(--border)] bg-white/70 px-4 py-3 text-sm dark:bg-white/5">
                    <p className="font-medium">Selected file</p>
                    <p className="text-muted mt-1">{selectedImportFileName || "No file selected"}</p>
                  </div>

                  <p className="text-sm text-[var(--muted-foreground)]">
                    CSV import creates new records only. Existing inventory items, accounts,
                    categories, and subcategories are skipped.
                  </p>
                  {transferMessage ? (
                    <p className="text-sm text-[var(--muted-foreground)]">{transferMessage}</p>
                  ) : null}
                </div>
              </Panel>

              <Panel title="Backups">
                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Backup destination</label>
                    <select
                      value={backupPreferences.provider}
                      onChange={(event) =>
                        saveBackupPreferences({
                          provider: event.target.value as BackupPreferences["provider"],
                        })
                      }
                      className="w-full px-4 py-3"
                    >
                      <option value="browser_download">Browser download</option>
                      <option value="local_path">Local path</option>
                      <option value="google_drive">Google Drive bundle</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Backup schedule</label>
                    <select
                      value={backupPreferences.schedule}
                      onChange={(event) =>
                        saveBackupPreferences({
                          schedule: event.target.value as BackupPreferences["schedule"],
                        })
                      }
                      className="w-full px-4 py-3"
                    >
                      <option value="manual">Manual only</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <ToggleRow
                    title="Scheduled backups"
                    description="Store this backup schedule for an automated job."
                    checked={backupPreferences.autoEnabled}
                    onToggle={() =>
                      saveBackupPreferences({ autoEnabled: !backupPreferences.autoEnabled })
                    }
                  />

                  {backupPreferences.provider === "local_path" ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium">Local path</label>
                      <input
                        value={backupPreferences.localPath}
                        onChange={(event) =>
                          setBackupPreferences((current) => ({
                            ...current,
                            localPath: event.target.value,
                          }))
                        }
                        onBlur={() =>
                          saveBackupPreferences({ localPath: backupPreferences.localPath })
                        }
                        placeholder="D:\\Backups\\Budget"
                        className="w-full px-4 py-3"
                      />
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleCreateBackup}
                    disabled={isCreatingBackup}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
                  >
                    <HardDriveDownload className="h-4 w-4" />
                    {isCreatingBackup ? "Creating..." : "Create backup now"}
                  </button>

                  <p className="text-sm text-[var(--muted-foreground)]">
                    Last backup:{" "}
                    <LocalizedDateText
                      value={backupPreferences.lastBackupAt}
                      kind="datetime"
                      emptyText="No backup created yet"
                    />
                  </p>
                  {backupMessage ? (
                    <p className="text-sm text-[var(--muted-foreground)]">{backupMessage}</p>
                  ) : null}
                </div>
              </Panel>
            </div>
          ) : null}

          <div className="px-1">
            <p className="text-sm text-[var(--muted-foreground)]">
              {isSaving ? "Saving settings..." : saveMessage}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
