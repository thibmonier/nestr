import {
  DEFAULT_PREFERENCES,
  type CalendarEvent,
  type PlanningPreferences,
  type Task,
} from "@nestr/core";

const TASKS_KEY = "nestr.tasks";
const PREFS_KEY = "nestr.preferences";
const EVENTS_KEY = "nestr.events";

/** Événements créés localement par l'ajout rapide (hors connecteurs). */
export function loadEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
  } catch {
    return [];
  }
}

export function saveEvents(events: CalendarEvent[]): void {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function loadPreferences(): PlanningPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw
      ? { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as PlanningPreferences) }
      : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: PlanningPreferences): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  );
}
