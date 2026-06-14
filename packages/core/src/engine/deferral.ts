/**
 * Report / dépriorisation d'une tâche. Logique pure : pose ou lève la date de
 * report (`deferredTo`) et indique si une tâche est masquée du plan d'un jour.
 */
import type { Task } from "../model/types.js";

/** Reporte une tâche à une date ISO "YYYY-MM-DD" sans muter l'original. */
export function deferTask(task: Task, toISO: string): Task {
  return { ...task, deferredTo: toISO };
}

/** Lève le report d'une tâche (la rend de nouveau planifiable). */
export function clearDeferral(task: Task): Task {
  const { deferredTo: _omit, ...rest } = task;
  return rest;
}

/**
 * Une tâche est masquée du plan d'un jour si elle est reportée à une date
 * strictement postérieure à ce jour. Le jour de report inclus reste visible.
 */
export function isDeferredFrom(task: Task, dateISO: string): boolean {
  return task.deferredTo !== undefined && task.deferredTo > dateISO;
}
