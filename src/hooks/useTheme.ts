import { useState, useEffect, useCallback } from "react";

type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

function getSystemDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: ThemeMode) {
  const isDark = mode === "dark" || (mode === "system" && getSystemDark());
  document.documentElement.classList.toggle("dark", isDark);
}

function nextMode(current: ThemeMode): ThemeMode {
  return current === "system" ? "light" : current === "light" ? "dark" : "system";
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as ThemeMode) || "system";
  });

  const setMode = useCallback((m: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, m);
    setModeState(m);
    applyTheme(m);
  }, []);

  const cycle = useCallback(() => {
    setModeState((prev) => {
      const next = nextMode(prev);
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  // Apply theme on mount and listen for system preference changes
  useEffect(() => {
    applyTheme(mode);
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const isDark =
    mode === "dark" || (mode === "system" && getSystemDark());

  return { mode, setMode, cycle, isDark };
}
