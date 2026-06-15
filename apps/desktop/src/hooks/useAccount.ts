/** Compte utilisateur : session Google, statut serveur, identifiants Apple/IA. */
import { useEffect, useState } from "react";
import {
  fetchMe,
  isLoggedIn,
  loginWithGoogle,
  logout,
  migrateSession,
  saveAiKey,
  saveAppleCredentials,
  type AiProvider,
  type MeStatus,
} from "../lib/auth.js";

export function useAccount(setError: (s: string | null) => void) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [me, setMe] = useState<MeStatus | null>(null);

  useEffect(() => {
    migrateSession()
      .then(() => isLoggedIn())
      .then(setLoggedIn);
  }, []);

  async function signIn() {
    setError(null);
    try {
      await loginWithGoogle();
      setLoggedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function signOut() {
    await logout();
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
