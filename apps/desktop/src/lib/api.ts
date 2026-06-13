/** Client HTTP du Worker : URL, session, fetch authentifié. */

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

const SESSION_KEY = "nestr.session";

export function getSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}
export function setSession(token: string): void {
  localStorage.setItem(SESSION_KEY, token);
}
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/** fetch JSON authentifié (Bearer session). Lève sur erreur HTTP. */
export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = getSession();
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) {
    clearSession();
    throw new Error("Session expirée — reconnecte-toi.");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${path} : ${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}
