import SettingsClient from "@/components/settings-client";
import { defaultCurrencyCode } from "@/lib/currencies";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  const [categories, accountCount, userSettings] = await Promise.all([
    prisma.category.findMany({
      where: { userId: user.id },
      include: {
        subcategories: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.account.count({
      where: { userId: user.id },
    }),
    prisma.userSettings.findUnique({
      where: { userId: user.id },
    }),
  ]);

  return (
    <SettingsClient
      userId={user.id}
      userName={user.name}
      userEmail={user.email}
      initialBaseCurrencyCode={user?.baseCurrencyCode ?? defaultCurrencyCode}
      initialTimezone={user.timezone}
      accountCount={accountCount}
      initialPreferences={{
        dateFormat: userSettings?.dateFormat ?? "dmy",
        timeFormat: userSettings?.timeFormat ?? "twelve_hour",
        weekStartsOn: userSettings?.weekStartsOn ?? "monday",
        priorityNotifications: userSettings?.priorityNotifications ?? true,
        automationPreviews: userSettings?.automationPreviews ?? true,
        securityPrompts: userSettings?.securityPrompts ?? true,
        compactMode: userSettings?.compactMode ?? false,
      }}
      initialBackupPreferences={{
        provider: userSettings?.backupProvider ?? "browser_download",
        schedule: userSettings?.backupSchedule ?? "manual",
        autoEnabled: userSettings?.backupAutoEnabled ?? false,
        localPath: userSettings?.backupLocalPath ?? "",
        lastBackupAt: userSettings?.lastBackupAt?.toISOString() ?? null,
      }}
      initialCategories={categories}
    />
  );
}
