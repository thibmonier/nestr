import type { CalendarEvent, Task } from "../model/types.js";
import type { ParsedEntry } from "./types.js";

export interface QuickAddOptions {
  /** Identifiant à attribuer à l'entité créée. */
  id: string;
  /** Horodatage de création (epoch ms). */
  now: number;
  /** Date par défaut (YYYY-MM-DD) si l'IA n'en a pas fourni. */
  todayISO: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Valide une date YYYY-MM-DD ; retourne `fallback` si invalide. */
function safeDate(date: string | null, fallback: string | null): string | null {
  if (date && ISO_DATE.test(date)) {
    const d = new Date(`${date}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return date;
  }
  return fallback;
}

/** "HH:mm" → minutes depuis minuit, ou null si invalide. */
function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** minutes depuis minuit → "HH:mm". */
function fromMinutes(total: number): string {
  const clamped = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const min = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Combine une date locale (YYYY-MM-DD) et un horaire (HH:mm) en ISO datetime. */
function toIso(dateISO: string, hhmm: string): string {
  return new Date(`${dateISO}T${hhmm}:00`).toISOString();
}

/**
 * Convertit une entrée IA `kind=task` en tâche. La date devient une échéance ;
 * un créneau start/end renseigne la durée estimée. Les personnes deviennent des tags.
 */
export function parsedToTask(p: ParsedEntry, opts: QuickAddOptions): Task {
  const task: Task = {
    id: opts.id,
    title: p.title.trim(),
    status: "todo",
    priority: "medium",
    context: p.context,
    mode: p.mode ?? "action",
    createdAt: new Date(opts.now).toISOString(),
  };

  const validDate = safeDate(p.date, null);
  if (validDate) task.dueDate = new Date(`${validDate}T23:59:59`).toISOString();

  const startMin = p.start ? toMinutes(p.start) : null;
  const endMin = p.end ? toMinutes(p.end) : null;
  if (startMin !== null && endMin !== null && endMin > startMin) {
    task.estimatedMinutes = endMin - startMin;
  }

  if (p.people.length > 0) task.tags = [...p.people];
  return task;
}

/**
 * Convertit une entrée IA `kind=event` en événement d'agenda local. Comble les
 * horaires manquants (défaut 09:00, durée 60 min) et la date (aujourd'hui).
 */
export function parsedToEvent(p: ParsedEntry, opts: QuickAddOptions): CalendarEvent {
  const dateISO = safeDate(p.date, opts.todayISO)!;
  const startMin = (p.start ? toMinutes(p.start) : null) ?? 9 * 60;
  const endFromText = p.end ? toMinutes(p.end) : null;
  const rawEnd = endFromText !== null && endFromText > startMin ? endFromText : startMin + 60;
  const endMin = Math.min(rawEnd, 1439);

  const event: CalendarEvent = {
    id: opts.id,
    source: "local",
    calendarId: "local",
    calendarName: p.context === "pro" ? "Pro" : "Perso",
    title: p.title.trim(),
    start: toIso(dateISO, fromMinutes(startMin)),
    end: toIso(dateISO, fromMinutes(endMin)),
    busy: true,
  };
  if (p.location) event.location = p.location;
  return event;
}
