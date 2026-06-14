/**
 * Thème Nestr porté du design system desktop (tokens CSS → palette TS).
 * Override utilisateur persistant (AsyncStorage) > préférence système.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance } from "react-native";

export type ThemeName = "light" | "dark";

export interface Palette {
  bg: string;
  card: string;
  sunken: string;
  border: string;
  borderStrong: string;
  textStrong: string;
  textBody: string;
  textMuted: string;
  textSubtle: string;
  onAccent: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentText: string;
  prio: Record<"urgent" | "high" | "medium" | "low", { bg: string; fg: string }>;
  tagContext: { bg: string; fg: string };
  tagDue: { bg: string; fg: string };
  tagDays: { bg: string; fg: string };
  blockTask: string;
  blockEvent: string;
  warnBg: string;
  warnBorder: string;
  warnFg: string;
  danger: string;
}

const LIGHT: Palette = {
  bg: "#f8fafc",
  card: "#ffffff",
  sunken: "#f1f5f9",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  textStrong: "#0f172a",
  textBody: "#1e293b",
  textMuted: "#64748b",
  textSubtle: "#94a3b8",
  onAccent: "#ffffff",
  accent: "#4f46e5",
  accentHover: "#6366f1",
  accentSoft: "#eef2ff",
  accentText: "#4338ca",
  prio: {
    urgent: { bg: "#fee2e2", fg: "#b91c1c" },
    high: { bg: "#ffedd5", fg: "#c2410c" },
    medium: { bg: "#e0f2fe", fg: "#0369a1" },
    low: { bg: "#f1f5f9", fg: "#475569" },
  },
  tagContext: { bg: "#ede9fe", fg: "#6d28d9" },
  tagDue: { bg: "#ffe4e6", fg: "#be123c" },
  tagDays: { bg: "#d1fae5", fg: "#047857" },
  blockTask: "#6366f1",
  blockEvent: "#a78bfa",
  warnBg: "#fffbeb",
  warnBorder: "#fcd34d",
  warnFg: "#b45309",
  danger: "#ef4444",
};

const DARK: Palette = {
  bg: "#0f172a",
  card: "#1e293b",
  sunken: "#334155",
  border: "#334155",
  borderStrong: "#475569",
  textStrong: "#f1f5f9",
  textBody: "#e2e8f0",
  textMuted: "#94a3b8",
  textSubtle: "#64748b",
  onAccent: "#ffffff",
  accent: "#4f46e5",
  accentHover: "#6366f1",
  accentSoft: "rgba(30,27,75,0.55)",
  accentText: "#a5b4fc",
  prio: {
    urgent: { bg: "rgba(127,29,29,0.40)", fg: "#fca5a5" },
    high: { bg: "rgba(124,45,18,0.40)", fg: "#fdba74" },
    medium: { bg: "rgba(12,74,110,0.40)", fg: "#7dd3fc" },
    low: { bg: "#334155", fg: "#cbd5e1" },
  },
  tagContext: { bg: "rgba(76,29,149,0.40)", fg: "#c4b5fd" },
  tagDue: { bg: "rgba(136,19,55,0.40)", fg: "#fda4af" },
  tagDays: { bg: "rgba(6,78,59,0.40)", fg: "#6ee7b7" },
  blockTask: "#6366f1",
  blockEvent: "#a78bfa",
  warnBg: "rgba(120,53,15,0.20)",
  warnBorder: "#b45309",
  warnFg: "#fcd34d",
  danger: "#ef4444",
};

export const PALETTES: Record<ThemeName, Palette> = { light: LIGHT, dark: DARK };

const STORE_KEY = "nestr.theme";

interface ThemeCtx {
  name: ThemeName;
  palette: Palette;
  /** Bascule manuelle (persistée). */
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({
  name: "light",
  palette: LIGHT,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = useState<ThemeName | null>(null);
  const [system, setSystem] = useState<ThemeName>(
    Appearance.getColorScheme() === "dark" ? "dark" : "light",
  );

  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY).then((v) => {
      if (v === "light" || v === "dark") setOverride(v);
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) =>
      setSystem(colorScheme === "dark" ? "dark" : "light"),
    );
    return () => sub.remove();
  }, []);

  const name = override ?? system;
  const value = useMemo<ThemeCtx>(
    () => ({
      name,
      palette: PALETTES[name],
      toggle: () => {
        const next: ThemeName = name === "dark" ? "light" : "dark";
        setOverride(next);
        void AsyncStorage.setItem(STORE_KEY, next);
      },
    }),
    [name],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
