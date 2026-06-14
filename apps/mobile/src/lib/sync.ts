/** Synchronisation tâches + préférences avec le Worker (par utilisateur). */
import type { PlanningPreferences, Task } from "@nestr/core";
import { api } from "./api";

export async function pullTasks(): Promise<Task[]> {
  const { tasks } = await api<{ tasks: Task[] }>("/me/tasks");
  return tasks ?? [];
}

export function pushTasks(tasks: Task[]): Promise<{ ok: boolean }> {
  return api("/me/tasks", { method: "PUT", body: { tasks } });
}

export async function pullPreferences(): Promise<PlanningPreferences | null> {
  const { preferences } = await api<{ preferences: PlanningPreferences | null }>(
    "/me/preferences",
  );
  return preferences;
}

export function pushPreferences(
  preferences: PlanningPreferences,
): Promise<{ ok: boolean }> {
  return api("/me/preferences", { method: "PUT", body: { preferences } });
}
