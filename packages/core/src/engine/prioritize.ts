import type { Priority, Task } from "../model/types.js";

const PRIORITY_WEIGHT: Record<Priority, number> = {
  urgent: 1000,
  high: 100,
  medium: 10,
  low: 1,
};

/**
 * Score d'une tâche pour l'ordonnancement. Plus élevé = à placer en premier.
 * Combine priorité explicite et urgence de l'échéance.
 */
export function scoreTask(task: Task, now: number): number {
  let score = PRIORITY_WEIGHT[task.priority];

  if (task.dueDate) {
    const due = new Date(task.dueDate).getTime();
    const hoursLeft = (due - now) / 3_600_000;
    if (hoursLeft <= 0)
      score += 5000; // en retard → priorité maximale
    else if (hoursLeft <= 24) score += 800;
    else if (hoursLeft <= 72) score += 200;
    else score += Math.max(0, 100 - hoursLeft / 24);
  }

  return score;
}

/** Trie une copie des tâches par score décroissant (stable sur l'ordre d'origine). */
export function prioritize(tasks: Task[], now: number): Task[] {
  return tasks
    .map((task, index) => ({ task, index, score: scoreTask(task, now) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((x) => x.task);
}
