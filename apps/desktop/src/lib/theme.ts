/** Thème clair/sombre : override utilisateur persistant > préférence système. */

const KEY = "nestr.theme";

export type Theme = "light" | "dark";

/** Override explicite stocké par l'utilisateur, ou null = suit le système. */
export function getStoredTheme(): Theme | null {
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : null;
}

export function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Thème effectif = override s'il existe, sinon système. */
export function resolvedTheme(): Theme {
  return getStoredTheme() ?? systemTheme();
}

/** Applique `.theme-dark` sur <html> (les tokens DS se remappent dessous). */
export function applyTheme(t: Theme): void {
  document.documentElement.classList.toggle("theme-dark", t === "dark");
}

/** Fixe un override explicite + l'applique immédiatement. */
export function setTheme(t: Theme): void {
  localStorage.setItem(KEY, t);
  applyTheme(t);
}
