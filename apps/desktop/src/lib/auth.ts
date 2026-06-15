import { isTauri } from "@tauri-apps/api/core";
import { API_URL, api, client, clearSession, getSession, migrateSession, setSession } from "./api.js";

export type { AiProvider, MeStatus } from "@nestr/client";

/** Enregistre la clé IA de l'utilisateur (provider + clé), chiffrée côté serveur. */
export const saveAiKey = client.saveAiKey;

export async function isLoggedIn(): Promise<boolean> {
  return !!(await getSession());
}

export async function logout(): Promise<void> {
  await clearSession();
}

export { migrateSession };

/**
 * Connexion Google. Deux flux selon l'environnement :
 * - Tauri : `window.open` renvoie null dans la webview, donc on ouvre l'URL
 *   d'auth dans le navigateur système et on récupère le token via un serveur
 *   loopback localhost temporaire (tauri-plugin-oauth).
 * - Navigateur : popup classique + postMessage du callback Worker.
 */
export function loginWithGoogle(): Promise<void> {
  return isTauri() ? loginViaLoopback() : loginViaPopup();
}

/** Page affichée dans l'onglet du navigateur système après le retour OAuth. */
const LOOPBACK_RESPONSE =
  '<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:2rem">' +
  "<p>Connecté à Nestr. Tu peux fermer cet onglet.</p></body>";

async function loginViaLoopback(): Promise<void> {
  const { start, cancel, onUrl } = await import("@fabianlars/tauri-plugin-oauth");
  const { openUrl } = await import("@tauri-apps/plugin-opener");

  const port = await start({ response: LOOPBACK_RESPONSE });
  let unlisten: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const tokenPromise = new Promise<string>((resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error("Délai de connexion dépassé.")),
        180_000,
      );
      // onUrl est asynchrone : on attache le listener avant d'ouvrir le navigateur.
      void onUrl((url) => {
        try {
          const token = new URL(url).searchParams.get("token");
          if (token) resolve(token);
          else reject(new Error("Token absent du retour OAuth."));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }).then((u) => {
        unlisten = u;
      });
    });

    const redirect = encodeURIComponent(`http://localhost:${port}`);
    await openUrl(`${API_URL}/auth/google?app_redirect=${redirect}`);
    const token = await tokenPromise;
    setSession(token);
  } finally {
    if (timer) clearTimeout(timer);
    unlisten?.();
    await cancel(port).catch(() => {});
  }
}

function loginViaPopup(): Promise<void> {
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

export const fetchMe = client.fetchMe;

export function saveAppleCredentials(
  appleId: string,
  appPassword: string,
): Promise<{ ok: boolean }> {
  return api("/me/apple", { method: "POST", body: { appleId, appPassword } });
}
