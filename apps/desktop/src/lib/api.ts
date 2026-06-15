/** Session sécurisée (Tauri Store / localStorage fallback) + client Worker partagé. */
import { createClient, type NestrClient } from "@nestr/client";
import * as SecureStorage from "./secure-storage.js";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

const SESSION_KEY = "nestr.session";

export async function getSession(): Promise<string | null> {
  return SecureStorage.getItem(SESSION_KEY);
}
export async function setSession(token: string): Promise<void> {
  await SecureStorage.setItem(SESSION_KEY, token);
}
export async function clearSession(): Promise<void> {
  await SecureStorage.removeItem(SESSION_KEY);
}

/** Migration localStorage → Tauri Store (idempotent, one-shot au premier lancement). */
export async function migrateSession(): Promise<void> {
  await SecureStorage.migrateFromLocalStorage(SESSION_KEY);
}

/** Client partagé : injecte la session (async) et la purge au 401. */
export const client: NestrClient = createClient({
  baseUrl: API_URL,
  getToken: getSession,
  onUnauthorized: clearSession,
});

/** fetch JSON authentifié (Bearer). Lève sur erreur HTTP ; 401 => purge session. */
export const api = client.api;
