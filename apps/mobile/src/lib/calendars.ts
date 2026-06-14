/** Événements d'agenda (identifiants stockés côté serveur, par utilisateur). */
import type { CalendarEvent } from "@nestr/core";
import { api } from "./api";

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

/** Événements de toutes les sources connectées sur [start, end] ; sources
 *  non configurées ignorées sans bloquer. */
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
