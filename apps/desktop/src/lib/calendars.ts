import type { CalendarEvent } from "@nestr/core";
import { api } from "./api.js";

async function postEvents(
  path: string,
  start: string,
  end: string,
): Promise<CalendarEvent[]> {
  const { events } = await api<{ events: CalendarEvent[] }>(path, {
    method: "POST",
    body: { start, end },
  });
  return events;
}

/**
 * Événements de tous les calendriers connectés sur [start, end].
 * Les identifiants sont stockés côté serveur (par utilisateur) ; une source
 * non configurée (400) est ignorée sans bloquer les autres.
 */
export async function fetchDayEvents(
  start: string,
  end: string,
): Promise<CalendarEvent[]> {
  const results = await Promise.all([
    postEvents("/calendars/apple/events", start, end).catch(() => []),
    postEvents("/calendars/google/events", start, end).catch(() => []),
  ]);
  return results.flat();
}
