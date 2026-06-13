import type { CalendarEvent } from "@nestr/core";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";
const GOOGLE_KEY = "nestr.google.refreshToken";

export function googleConnected(): boolean {
  return !!localStorage.getItem(GOOGLE_KEY);
}

export function disconnectGoogle(): void {
  localStorage.removeItem(GOOGLE_KEY);
}

/**
 * Lance le flux OAuth Google dans une popup. Le callback du Worker renvoie
 * le refresh_token via postMessage ; on le stocke localement.
 */
export function connectGoogle(): Promise<void> {
  return new Promise((resolve, reject) => {
    const popup = window.open(
      `${API_URL}/auth/google`,
      "nestr-google",
      "width=520,height=640",
    );
    if (!popup) {
      reject(new Error("Popup bloquée — autorise les fenêtres surgissantes."));
      return;
    }
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "nestr-google-auth") return;
      window.removeEventListener("message", onMessage);
      if (e.data.refreshToken) {
        localStorage.setItem(GOOGLE_KEY, e.data.refreshToken);
        resolve();
      } else {
        reject(new Error("Aucun refresh_token reçu (déjà autorisé ?)."));
      }
    };
    window.addEventListener("message", onMessage);
  });
}

async function postEvents(
  path: string,
  body: unknown,
): Promise<CalendarEvent[]> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} : ${res.status}`);
  const data = (await res.json()) as { events?: CalendarEvent[] };
  return data.events ?? [];
}

/**
 * Récupère les événements de tous les calendriers connectés sur [start, end].
 * Apple est toujours interrogé (creds serveur) ; Google si connecté.
 * Une source en échec n'empêche pas les autres.
 */
export async function fetchDayEvents(
  start: string,
  end: string,
): Promise<CalendarEvent[]> {
  const jobs: Promise<CalendarEvent[]>[] = [
    postEvents("/calendars/apple/events", { start, end }).catch(() => []),
  ];

  const refreshToken = localStorage.getItem(GOOGLE_KEY);
  if (refreshToken) {
    jobs.push(
      postEvents("/calendars/google/events", {
        refreshToken,
        start,
        end,
      }).catch(() => []),
    );
  }

  const results = await Promise.all(jobs);
  return results.flat();
}
