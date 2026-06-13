import type { Energy, Task } from "@nestr/core";

/** URL du Worker. Override via VITE_API_URL ; défaut = wrangler dev local. */
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

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

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`API ${res.status} : ${detail || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function estimateDurations(
  tasks: Task[],
): Promise<DurationEstimate[]> {
  const { estimates } = await post<{ estimates: DurationEstimate[] }>(
    "/ai/estimate",
    { tasks },
  );
  return estimates;
}

export async function breakdownTask(task: Task): Promise<SubtaskProposal[]> {
  const { subtasks } = await post<{ subtasks: SubtaskProposal[] }>(
    "/ai/breakdown",
    { task },
  );
  return subtasks;
}

export async function advise(
  tasks: Task[],
  freeMinutes: number,
): Promise<PlanAdvice> {
  return post<PlanAdvice>("/ai/advise", { tasks, freeMinutes });
}
