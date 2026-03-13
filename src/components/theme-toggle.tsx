"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useSyncExternalStore } from "react";

type ThemeMode = "light" | "dark";

function getResolvedTheme(): ThemeMode {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => onStoreChange();

  window.addEventListener("storage", handleChange);
  mediaQuery.addEventListener("change", handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    mediaQuery.removeEventListener("change", handleChange);
  };
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getResolvedTheme, () => "light");

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("bms-theme", nextTheme);
    window.dispatchEvent(new Event("storage"));
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-left shadow-sm dark:bg-slate-950/60"
    >
      <span>
        <span className="block text-sm font-semibold">
          {theme === "dark" ? "Dark theme enabled" : "Light theme enabled"}
        </span>
        <span className="text-muted mt-1 block text-xs">
          Toggle the interface colors across the workspace.
        </span>
      </span>
      <span className="rounded-2xl bg-slate-950 p-2 text-white dark:bg-white dark:text-slate-950">
        {theme === "dark" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
      </span>
    </button>
  );
}
