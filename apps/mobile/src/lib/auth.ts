/**
 * Auth Google mobile : ouvre l'URL d'auth du Worker dans une session navigateur
 * système, le Worker renvoie le token sur le deep-link `nestr://auth?token=...`.
 * Réutilise le mécanisme `app_redirect`/`state` du Worker (cf. services/api).
 */
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { API_URL, AUTH_REDIRECT } from "../config";
import { api, clearSession, getSession, setSession } from "./api";

export type AiProvider = "anthropic" | "openai";

export interface MeStatus {
  googleConnected: boolean;
  appleConnected: boolean;
  aiConfigured: boolean;
  aiProvider: AiProvider | null;
}

export async function isLoggedIn(): Promise<boolean> {
  return !!(await getSession());
}

export function logout(): Promise<void> {
  return clearSession();
}

export async function loginWithGoogle(): Promise<void> {
  const authUrl = `${API_URL}/auth/google?app_redirect=${encodeURIComponent(
    AUTH_REDIRECT,
  )}`;
  const result = await WebBrowser.openAuthSessionAsync(authUrl, AUTH_REDIRECT);
  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error("Connexion annulée.");
  }
  if (result.type !== "success" || !result.url) {
    throw new Error("Connexion échouée.");
  }
  const { queryParams } = Linking.parse(result.url);
  const token = queryParams?.token;
  if (typeof token !== "string" || !token) {
    throw new Error("Token absent du retour OAuth.");
  }
  await setSession(token);
}

export function fetchMe(): Promise<MeStatus> {
  return api<MeStatus>("/me");
}

/** Enregistre la clé IA (provider + clé), chiffrée côté serveur. */
export function saveAiKey(
  provider: AiProvider,
  apiKey: string,
): Promise<{ ok: boolean }> {
  return api("/me/ai", { method: "POST", body: { provider, apiKey } });
}
