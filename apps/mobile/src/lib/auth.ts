/**
 * Auth Google mobile : ouvre l'URL d'auth du Worker dans une session navigateur
 * système, le Worker renvoie le token sur le deep-link `nestr://auth?token=...`.
 * Réutilise le mécanisme `app_redirect`/`state` du Worker (cf. services/api).
 */
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { API_URL, AUTH_REDIRECT } from "../config";
import { client, clearSession, getSession, setSession } from "./api";

export type { AiProvider, MeStatus } from "@nestr/client";

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

export const fetchMe = client.fetchMe;

/** Enregistre la clé IA (provider + clé), chiffrée côté serveur. */
export const saveAiKey = client.saveAiKey;

export async function deleteAccount(): Promise<void> {
  await client.deleteAccount();
  await clearSession();
}
