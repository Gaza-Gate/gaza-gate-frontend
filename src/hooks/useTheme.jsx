// src/hooks/useTheme.js
//
// Dark mode management for Gaza Gate.
// - 3 modes: "light" | "dark" | "system"
// - localStorage key: "gaza-gate-theme"
// - Applies .dark / .light on <html> (Tailwind class strategy)

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "gaza-gate-theme";
const THEME_EVENT = "gaza-gate-theme-changed";

const ThemeContext = createContext(null);

function readStoredTheme() {
  if (typeof window === "undefined") return { mode: "system" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mode: "system" };
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      (parsed.mode === "light" ||
        parsed.mode === "dark" ||
        parsed.mode === "system")
    ) {
      return parsed;
    }
    return { mode: "system" };
  } catch {
    return { mode: "system" };
  }
}

function getSystemPreference() {
  if (typeof window === "undefined") return "light";
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

function applyTheme(mode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const effective = mode === "system" ? getSystemPreference() : mode;

  root.classList.remove("dark", "light");
  root.classList.add(effective);
  root.style.colorScheme = effective;
}

function persistTheme(next) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
}

/** Apply saved theme before React mounts (prevents flash). */
export function initTheme() {
  const stored = readStoredTheme();
  applyTheme(stored.mode);
  persistTheme(stored);
}

export function ThemeProvider({ children }) {
  const [stored, setStored] = useState(() => readStoredTheme());
  const [systemPref, setSystemPref] = useState(() => getSystemPreference());

  useEffect(() => {
    applyTheme(stored.mode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      } catch {
        /* ignore quota errors */
      }
    }
  }, [stored]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => {
      setSystemPref(e.matches ? "dark" : "light");
    };
    setSystemPref(mq.matches ? "dark" : "light");

    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onThemeChanged = () => {
      setStored((prev) => {
        const next = readStoredTheme();
        return prev.mode === next.mode ? prev : next;
      });
    };
    window.addEventListener(THEME_EVENT, onThemeChanged);
    return () => window.removeEventListener(THEME_EVENT, onThemeChanged);
  }, []);

  useEffect(() => {
    if (stored.mode === "system") {
      applyTheme("system");
    }
  }, [systemPref, stored.mode]);

  const setMode = useCallback((mode) => {
    if (mode !== "light" && mode !== "dark" && mode !== "system") return;
    const next = { mode };
    setStored(next);
    // ⚠️ لازم نكتب على localStorage قبل ما نطلق الـ event
    // وإلا الـ listener هيقرأ القيمة القديمة ويرجّع الـ state تاني.
    persistTheme(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(THEME_EVENT));
    }
  }, []);

  const toggle = useCallback(() => {
    setStored((prev) => {
      const current =
        prev.mode === "system" ? getSystemPreference() : prev.mode;
      const next = { mode: current === "dark" ? "light" : "dark" };
      // نفس الفكرة: اكتب الأول، ثم أطلِق event.
      persistTheme(next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(THEME_EVENT));
      }
      return next;
    });
  }, []);

  const effective = stored.mode === "system" ? systemPref : stored.mode;

  const value = useMemo(
    () => ({
      mode: stored.mode,
      effective,
      isDark: effective === "dark",
      setMode,
      toggle,
    }),
    [stored.mode, effective, setMode, toggle]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

export { THEME_EVENT, readStoredTheme, applyTheme };
