/** Compte utilisateur : session Google, statut serveur, identifiants Apple/IA. */
import { useState } from "react";
import {
  fetchMe,
  isLoggedIn,
  loginWithGoogle,
  logout,
  saveAiKey,
  saveAppleCredentials,
  type AiProvider,
  type MeStatus,
} from "../lib/auth.js";

export function useAccount(setError: (s: string | null) => void) {
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn());
  const [me, setMe] = useState<MeStatus | null>(null);

  async function signIn() {
    setError(null);
    try {
      await loginWithGoogle();
      setLoggedIn(true); // déclenche l'hydratation depuis le serveur
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function signOut() {
    logout();
    setLoggedIn(false);
    setMe(null);
  }

  async function connectApple(appleId: string, appPassword: string) {
    await saveAppleCredentials(appleId, appPassword);
    setMe((m) => (m ? { ...m, appleConnected: true } : m));
  }

  async function saveAi(provider: AiProvider, apiKey: string) {
    await saveAiKey(provider, apiKey);
    setMe((m) => (m ? { ...m, aiConfigured: true, aiProvider: provider } : m));
  }

  return { loggedIn, me, setMe, signIn, signOut, connectApple, saveAi };
}
