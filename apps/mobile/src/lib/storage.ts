/** Cache local (AsyncStorage) : tâches + préférences, miroir hors-ligne. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
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
export async function loadEvents(): Promise<CalendarEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
  } catch {
    return [];
  }
}

export function saveEvents(events: CalendarEvent[]): Promise<void> {
  return AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

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
  return randomUUID();
}
