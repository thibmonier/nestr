import type { Energy, Task } from "@nestr/core";
import { api } from "./api.js";

export interface DurationEstimate {
  taskId: string;
  estimatedMinutes: number;
  energy: Energy;
  rationale: string;
}

export interface PlanAdvice {
  summary: string;
  tips: string[];
}

export interface SubtaskProposal {
  title: string;
  estimatedMinutes: number;
  energy: Energy;
}

// Les endpoints /ai/* sont authentifiés (clé IA par utilisateur) : on passe par
// `api()` qui ajoute le Bearer de session et gère le 401.
export async function estimateDurations(
  tasks: Task[],
): Promise<DurationEstimate[]> {
  const { estimates } = await api<{ estimates: DurationEstimate[] }>(
    "/ai/estimate",
    { method: "POST", body: { tasks } },
  );
  return estimates;
}

export async function breakdownTask(task: Task): Promise<SubtaskProposal[]> {
  const { subtasks } = await api<{ subtasks: SubtaskProposal[] }>(
    "/ai/breakdown",
    { method: "POST", body: { task } },
  );
  return subtasks;
}

export async function advise(
  tasks: Task[],
  freeMinutes: number,
): Promise<PlanAdvice> {
  return api<PlanAdvice>("/ai/advise", {
    method: "POST",
    body: { tasks, freeMinutes },
  });
}
