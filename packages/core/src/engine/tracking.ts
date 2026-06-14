/** Suivi du temps passé sur une tâche (logique pure, partagée desktop+mobile). */
import type { Task } from "../model/types.js";

const MS_PER_MIN = 60_000;

/** Tâche en cours de suivi : identifiant + instant de démarrage (epoch ms). */
export interface ActiveTracking {
  taskId: string;
  startedAt: number;
}

/** Issue d'un arrêt de suivi : remettre en attente ou marquer terminé. */
export type StopOutcome = "pending" | "done";

/** Minutes écoulées (fractionnaires, ≥ 0) entre deux instants epoch. */
export function elapsedMinutes(startedAt: number, now: number): number {
  return Math.max(0, (now - startedAt) / MS_PER_MIN);
}

/** Démarre le suivi : la tâche passe « en cours ». */
export function startTracking(task: Task): Task {
  return { ...task, status: "in_progress" };
}

/**
 * Arrête le suivi : ajoute le temps écoulé (arrondi à la minute) à
 * `spentMinutes`, puis applique le statut choisi — `pending` remet la tâche en
 * attente (`todo`, temps conservé), `done` la marque terminée.
 */
export function stopTracking(
  task: Task,
  elapsedMin: number,
  outcome: StopOutcome,
): Task {
  const added = Math.max(0, Math.round(elapsedMin));
  return {
    ...task,
    spentMinutes: (task.spentMinutes ?? 0) + added,
    status: outcome === "done" ? "done" : "todo",
  };
}
