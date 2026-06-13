import type { Energy, Task } from "../model/types.js";

/** Estimation de durée produite par l'IA pour une tâche. */
export interface DurationEstimate {
  taskId: string;
  estimatedMinutes: number;
  energy: Energy;
  /** Brève justification affichable à l'utilisateur. */
  rationale: string;
}

/** Proposition de découpage d'une tâche en sous-tâches. */
export interface TaskBreakdown {
  taskId: string;
  subtasks: Array<{
    title: string;
    estimatedMinutes: number;
    energy: Energy;
  }>;
}

/** Conseils de l'IA accompagnant un plan généré. */
export interface PlanAdvice {
  /** Résumé en une phrase de la stratégie de la journée. */
  summary: string;
  /** Recommandations ordonnées (ex. "Bloque ta matinée pour X"). */
  tips: string[];
}

/**
 * Service IA — implémenté côté app par un client qui appelle le Worker proxy
 * (la clé Anthropic n'est jamais exposée au front).
 */
export interface AiPlanner {
  estimateDurations(tasks: Task[]): Promise<DurationEstimate[]>;
  breakdownTask(task: Task): Promise<TaskBreakdown>;
  advise(tasks: Task[], freeMinutes: number): Promise<PlanAdvice>;
}
