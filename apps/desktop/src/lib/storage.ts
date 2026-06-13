import {
  DEFAULT_PREFERENCES,
  type PlanningPreferences,
  type Task,
} from "@nestr/core";

const TASKS_KEY = "nestr.tasks";
const PREFS_KEY = "nestr.preferences";

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
