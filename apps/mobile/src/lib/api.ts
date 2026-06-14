/** Client HTTP du Worker : session sécurisée (SecureStore natif / localStorage web). */
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { API_URL } from "../config";

const SESSION_KEY = "nestr.session";

// expo-secure-store n'existe pas sur web : on retombe sur localStorage.
const isWeb = Platform.OS === "web";

export async function getSession(): Promise<string | null> {
  if (isWeb) return globalThis.localStorage?.getItem(SESSION_KEY) ?? null;
  return SecureStore.getItemAsync(SESSION_KEY);
}
export async function setSession(token: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(SESSION_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, token);
}
export async function clearSession(): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

/** fetch JSON authentifié. Lève sur erreur HTTP ; 401 ⇒ purge la session. */
export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await getSession();
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) {
    await clearSession();
    throw new Error("Session expirée — reconnecte-toi.");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${path} : ${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}
