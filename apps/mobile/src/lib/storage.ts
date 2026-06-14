/** Cache local (AsyncStorage) : tâches + préférences, miroir hors-ligne. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_PREFERENCES, type PlanningPreferences, type Task } from "@nestr/core";

const TASKS_KEY = "nestr.tasks";
const PREFS_KEY = "nestr.preferences";

export async function loadTasks(): Promise<Task[]> {
  try {
    const raw = await AsyncStorage.getItem(TASKS_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): Promise<void> {
  return AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export async function loadPreferences(): Promise<PlanningPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw
      ? { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as PlanningPreferences) }
      : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: PlanningPreferences): Promise<void> {
  return AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  );
}
