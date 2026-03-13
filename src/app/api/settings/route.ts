import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defaultCurrencyCode, isSupportedCurrency } from "@/lib/currencies";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getBackupPreferences } from "@/features/settings/services/data-transfer.service";

export async function GET() {
  const user = await getCurrentUser();
  const settings = user
    ? await prisma.userSettings.findUnique({
        where: { userId: user.id },
      })
    : null;

  return NextResponse.json({
    userId: user?.id ?? null,
    name: user?.name ?? "",
    email: user?.email ?? "",
    baseCurrencyCode: user?.baseCurrencyCode ?? defaultCurrencyCode,
    timezone: user?.timezone ?? "UTC",
    settings: {
      dateFormat: settings?.dateFormat ?? "dmy",
      timeFormat: settings?.timeFormat ?? "twelve_hour",
      weekStartsOn: settings?.weekStartsOn ?? "monday",
      priorityNotifications: settings?.priorityNotifications ?? true,
      automationPreviews: settings?.automationPreviews ?? true,
      securityPrompts: settings?.securityPrompts ?? true,
      compactMode: settings?.compactMode ?? false,
      backup: getBackupPreferences(settings),
    },
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    baseCurrencyCode?: string;
    timezone?: string;
    dateFormat?: "dmy" | "mdy" | "iso";
    timeFormat?: "twelve_hour" | "twenty_four_hour";
    weekStartsOn?: "sunday" | "monday" | "saturday";
    priorityNotifications?: boolean;
    automationPreviews?: boolean;
    securityPrompts?: boolean;
    compactMode?: boolean;
    backupProvider?: "browser_download" | "local_path" | "google_drive";
    backupSchedule?: "manual" | "daily" | "weekly" | "monthly";
    backupAutoEnabled?: boolean;
    backupLocalPath?: string;
  };

  const baseCurrencyCode = body.baseCurrencyCode?.toUpperCase();
  const timezone = body.timezone?.trim();
  const name = body.name?.trim();

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (baseCurrencyCode && !isSupportedCurrency(baseCurrencyCode)) {
    return NextResponse.json({ message: "Unsupported default currency" }, { status: 400 });
  }

  if (name !== undefined && name.length < 2) {
    return NextResponse.json({ message: "Name must be at least 2 characters" }, { status: 400 });
  }

  if (timezone !== undefined && timezone.length < 2) {
    return NextResponse.json({ message: "Timezone is required" }, { status: 400 });
  }

  const validDateFormats = new Set(["dmy", "mdy", "iso"]);
  const validTimeFormats = new Set(["twelve_hour", "twenty_four_hour"]);
  const validWeekStarts = new Set(["sunday", "monday", "saturday"]);
  const validBackupProviders = new Set(["browser_download", "local_path", "google_drive"]);
  const validBackupSchedules = new Set(["manual", "daily", "weekly", "monthly"]);

  if (body.dateFormat && !validDateFormats.has(body.dateFormat)) {
    return NextResponse.json({ message: "Invalid date format" }, { status: 400 });
  }

  if (body.timeFormat && !validTimeFormats.has(body.timeFormat)) {
    return NextResponse.json({ message: "Invalid time format" }, { status: 400 });
  }

  if (body.weekStartsOn && !validWeekStarts.has(body.weekStartsOn)) {
    return NextResponse.json({ message: "Invalid week start" }, { status: 400 });
  }

  if (body.backupProvider && !validBackupProviders.has(body.backupProvider)) {
    return NextResponse.json({ message: "Invalid backup provider" }, { status: 400 });
  }

  if (body.backupSchedule && !validBackupSchedules.has(body.backupSchedule)) {
    return NextResponse.json({ message: "Invalid backup schedule" }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(baseCurrencyCode ? { baseCurrencyCode } : {}),
      ...(timezone ? { timezone } : {}),
      ...(name ? { name } : {}),
    },
    select: {
      id: true,
      name: true,
      baseCurrencyCode: true,
      timezone: true,
    },
  });

  const hasSettingsPayload =
    body.dateFormat !== undefined ||
    body.timeFormat !== undefined ||
    body.weekStartsOn !== undefined ||
    body.priorityNotifications !== undefined ||
    body.automationPreviews !== undefined ||
    body.securityPrompts !== undefined ||
    body.compactMode !== undefined ||
    body.backupProvider !== undefined ||
    body.backupSchedule !== undefined ||
    body.backupAutoEnabled !== undefined ||
    body.backupLocalPath !== undefined;

  const updatedSettings = hasSettingsPayload
    ? await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: {
          ...(body.dateFormat !== undefined ? { dateFormat: body.dateFormat } : {}),
          ...(body.timeFormat !== undefined ? { timeFormat: body.timeFormat } : {}),
          ...(body.weekStartsOn !== undefined ? { weekStartsOn: body.weekStartsOn } : {}),
          ...(body.priorityNotifications !== undefined
            ? { priorityNotifications: body.priorityNotifications }
            : {}),
          ...(body.automationPreviews !== undefined
            ? { automationPreviews: body.automationPreviews }
            : {}),
          ...(body.securityPrompts !== undefined ? { securityPrompts: body.securityPrompts } : {}),
          ...(body.compactMode !== undefined ? { compactMode: body.compactMode } : {}),
          ...(body.backupProvider !== undefined ? { backupProvider: body.backupProvider } : {}),
          ...(body.backupSchedule !== undefined ? { backupSchedule: body.backupSchedule } : {}),
          ...(body.backupAutoEnabled !== undefined
            ? { backupAutoEnabled: body.backupAutoEnabled }
            : {}),
          ...(body.backupLocalPath !== undefined
            ? { backupLocalPath: body.backupLocalPath.trim() || null }
            : {}),
        },
        create: {
          userId: user.id,
          dateFormat: body.dateFormat ?? "dmy",
          timeFormat: body.timeFormat ?? "twelve_hour",
          weekStartsOn: body.weekStartsOn ?? "monday",
          priorityNotifications: body.priorityNotifications ?? true,
          automationPreviews: body.automationPreviews ?? true,
          securityPrompts: body.securityPrompts ?? true,
          compactMode: body.compactMode ?? false,
          backupProvider: body.backupProvider ?? "browser_download",
          backupSchedule: body.backupSchedule ?? "manual",
          backupAutoEnabled: body.backupAutoEnabled ?? false,
          backupLocalPath: body.backupLocalPath?.trim() || null,
        },
      })
    : await prisma.userSettings.findUnique({
        where: { userId: user.id },
      });

  return NextResponse.json({
    ...updatedUser,
    settings: {
      dateFormat: updatedSettings?.dateFormat ?? "dmy",
      timeFormat: updatedSettings?.timeFormat ?? "twelve_hour",
      weekStartsOn: updatedSettings?.weekStartsOn ?? "monday",
      priorityNotifications: updatedSettings?.priorityNotifications ?? true,
      automationPreviews: updatedSettings?.automationPreviews ?? true,
      securityPrompts: updatedSettings?.securityPrompts ?? true,
      compactMode: updatedSettings?.compactMode ?? false,
      backup: getBackupPreferences(updatedSettings),
    },
  });
}
