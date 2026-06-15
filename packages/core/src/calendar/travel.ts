/** Calcul et réservation du temps de trajet vers un événement (logique pure). */
import type { CalendarEvent, NavApp } from "../model/types.js";
import { toISO } from "../model/time.js";

/** Estimation de trajet renvoyée par le backend (service Apple Maps). */
export interface TravelEstimate {
  /** Durée du trajet en secondes, trafic inclus. */
  seconds: number;
  /** Distance en mètres. */
  meters: number;
}

/** Point de départ d'un trajet. `current` = position GPS (mobile uniquement). */
export type TravelOrigin = "home" | "office" | "current";

/** Construit l'URL de deep-link de navigation vers une adresse. */
export function navUrl(app: NavApp, destination: string): string {
  const q = encodeURIComponent(destination.trim());
  switch (app) {
    case "google":
      return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
    case "waze":
      return `https://waze.com/ul?q=${q}&navigate=yes`;
    case "apple":
    default:
      return `https://maps.apple.com/?daddr=${q}&dirflg=d`;
  }
}

/** Libellé court d'une durée de trajet (ex. "25 min", "1 h 05"). */
export function travelLabel(seconds: number): string {
  const min = Math.max(1, Math.round(seconds / 60));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/**
 * Crée un événement local « Trajet » bloquant le créneau [départ, début event].
 * Le départ = début de l'événement moins la durée de trajet estimée.
 */
export function buildTravelEvent(
  event: CalendarEvent,
  estimate: TravelEstimate,
  opts: { id: string },
): CalendarEvent {
  const arrivalMs = Date.parse(event.start);
  const seconds = Math.max(0, Math.round(estimate.seconds));
  const departureMs = arrivalMs - seconds * 1000;
  const travel: CalendarEvent = {
    id: opts.id,
    source: "local",
    calendarId: "local",
    calendarName: "Trajet",
    title: `Trajet → ${event.title}`,
    start: toISO(departureMs),
    end: event.start,
    busy: true,
  };
  if (event.location) travel.location = event.location;
  return travel;
}
