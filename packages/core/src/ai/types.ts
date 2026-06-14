import type { Energy, Task, TaskMode } from "../model/types.js";

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
 * Entrée structurée par l'IA depuis une phrase en langage naturel
 * (ajout rapide). `kind` arbitre entre tâche et événement d'agenda.
 */
export interface ParsedEntry {
  kind: "task" | "event";
  title: string;
  /** Date au format YYYY-MM-DD, ou null si non précisée. */
  date: string | null;
  /** Horaires HH:mm, ou null. */
  start: string | null;
  end: string | null;
  location: string | null;
  people: string[];
  context: "pro" | "perso";
  mode: TaskMode | null;
}

/**
 * Service IA — implémenté côté app par un client qui appelle le Worker proxy
 * (la clé Anthropic n'est jamais exposée au front).
 */
export interface AiPlanner {
  estimateDurations(tasks: Task[]): Promise<DurationEstimate[]>;
  breakdownTask(task: Task): Promise<TaskBreakdown>;
  advise(tasks: Task[], freeMinutes: number): Promise<PlanAdvice>;
  parseQuickAdd(text: string, todayISO: string): Promise<ParsedEntry>;
}
