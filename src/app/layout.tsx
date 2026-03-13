import "./globals.css";
import AppFrame from "@/components/app-frame";
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
    <html lang="en" suppressHydrationWarning>
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
