import { API_URL, api, clearSession, getSession, setSession } from "./api.js";

export interface MeStatus {
  googleConnected: boolean;
  appleConnected: boolean;
}

export function isLoggedIn(): boolean {
  return !!getSession();
}

export function logout(): void {
  clearSession();
}

/**
 * Connexion Google (login + accès calendrier) via popup. Le callback du Worker
 * renvoie le token de session par postMessage ; on le stocke.
 */
export function loginWithGoogle(): Promise<void> {
  return new Promise((resolve, reject) => {
    const popup = window.open(
      `${API_URL}/auth/google`,
      "nestr-auth",
      "width=520,height=640",
    );
    if (!popup) {
      reject(new Error("Popup bloquée — autorise les fenêtres surgissantes."));
      return;
    }
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "nestr-auth") return;
      window.removeEventListener("message", onMessage);
      if (e.data.sessionToken) {
        setSession(e.data.sessionToken);
        resolve();
      } else {
        reject(new Error("Connexion échouée."));
      }
    };
    window.addEventListener("message", onMessage);
  });
}

export function fetchMe(): Promise<MeStatus> {
  return api<MeStatus>("/me");
}

export function saveAppleCredentials(
  appleId: string,
  appPassword: string,
): Promise<{ ok: boolean }> {
  return api("/me/apple", { method: "POST", body: { appleId, appPassword } });
}
