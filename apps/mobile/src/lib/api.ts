/** Session sécurisée (SecureStore natif / localStorage web) + client partagé. */
import { createClient, type NestrClient } from "@nestr/client";
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

/** Client partagé : injecte la session (async) et la purge au 401. */
export const client: NestrClient = createClient({
  baseUrl: API_URL,
  getToken: getSession,
  onUnauthorized: clearSession,
});

/** fetch JSON authentifié. Lève sur erreur HTTP ; 401 ⇒ purge la session. */
export const api = client.api;
