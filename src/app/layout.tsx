import "./globals.css";
import AppFrame from "@/components/app-frame";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { normalizeDisplayPreferences } from "@/lib/user-preferences";

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Track accounts, budgets, expenses, and home inventory",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  async function getPreferences() {
    const user = await getCurrentUser();
    if (!user) {
      return normalizeDisplayPreferences();
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      select: {
        dateFormat: true,
        timeFormat: true,
        weekStartsOn: true,
      },
    });

    return normalizeDisplayPreferences({
      dateFormat: settings?.dateFormat,
      timeFormat: settings?.timeFormat,
      weekStartsOn: settings?.weekStartsOn,
      timezone: user.timezone,
    });
  }

  const preferences = await getPreferences();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-date-format={preferences.dateFormat}
      data-time-format={preferences.timeFormat}
      data-week-starts-on={preferences.weekStartsOn}
      data-timezone={preferences.timezone}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const stored = localStorage.getItem("bms-theme");
                const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                const theme = stored === "light" || stored === "dark" ? stored : (systemDark ? "dark" : "light");
                document.documentElement.dataset.theme = theme;
                document.documentElement.classList.toggle("dark", theme === "dark");
              } catch (error) {
                document.documentElement.dataset.theme = "light";
                document.documentElement.classList.remove("dark");
              }
            })();`,
          }}
        />
      </head>
      <body>
        <div className="app-backdrop" aria-hidden="true" />
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
