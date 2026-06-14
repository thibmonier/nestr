/** Session (localStorage) + instance du client Worker partagé (@nestr/client). */
import { createClient, type NestrClient } from "@nestr/client";

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

/** Client partagé : injecte la session localStorage et la purge au 401. */
export const client: NestrClient = createClient({
  baseUrl: API_URL,
  getToken: getSession,
  onUnauthorized: clearSession,
});

/** fetch JSON authentifié (Bearer). Lève sur erreur HTTP ; 401 ⇒ purge session. */
export const api = client.api;
