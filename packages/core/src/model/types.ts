/** Domaine Nestr — types partagés (zéro dépendance, sérialisables). */

export type Priority = "low" | "medium" | "high" | "urgent";
export type Energy = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "any";
export type CalendarSource = "google" | "apple";

/** Une tâche à réaliser. Les champs optionnels peuvent être remplis par l'IA. */
export interface Task {
  id: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: Priority;
  /** Durée estimée en minutes (saisie utilisateur ou estimation IA). */
  estimatedMinutes?: number;
  /** Échéance au format ISO (date ou datetime). */
  dueDate?: string;
  /** Charge cognitive — sert à placer les tâches lourdes aux heures de forte énergie. */
  energy?: Energy;
  /** Moment préféré dans la journée. */
  preferredTimeOfDay?: TimeOfDay;
  /**
   * Jours de la semaine autorisés (convention JS : 0=dimanche … 6=samedi).
   * Vide/absent = tous les jours. Contrainte dure : la tâche n'est planifiée
   * que ces jours-là (ex. appel possible uniquement du lundi au vendredi → [1,2,3,4,5]).
   */
  allowedWeekdays?: number[];
  /** id de la tâche parente si c'est une sous-tâche issue d'un découpage. */
  parentId?: string;
  tags?: string[];
  createdAt: string;
}

/** Événement d'agenda importé d'un calendrier externe. */
export interface CalendarEvent {
  id: string;
  source: CalendarSource;
  calendarId: string;
  title: string;
  /** Début/fin au format ISO datetime. */
  start: string;
  end: string;
  allDay?: boolean;
  /** false = l'utilisateur reste disponible (ex. invitation déclinée). */
  busy: boolean;
}

export type BlockKind = "task" | "event" | "break";

/** Un créneau placé dans le plan de la journée. */
export interface TimeBlock {
  start: string;
  end: string;
  kind: BlockKind;
  title: string;
  taskId?: string;
  eventId?: string;
  allDay?: boolean;
}

/** Pourquoi une tâche n'a pas été placée dans le plan du jour. */
export type UnscheduledReason = "no_time" | "wrong_day";

export interface UnscheduledTask {
  task: Task;
  reason: UnscheduledReason;
}

/** Résultat de la planification d'une journée. */
export interface DailyPlan {
  /** Jour planifié, format ISO date (YYYY-MM-DD). */
  date: string;
  blocks: TimeBlock[];
  /** Tâches non placées (manque de temps ou jour non autorisé). */
  unscheduled: UnscheduledTask[];
}

/** Préférences de planification de l'utilisateur. */
export interface PlanningPreferences {
  /** Heure de début de journée de travail, "HH:MM" (locale). */
  workdayStart: string;
  /** Heure de fin, "HH:MM". */
  workdayEnd: string;
  /** Minutes de pause insérées entre deux tâches consécutives. */
  breakBetweenTasksMin: number;
  /** Durée par défaut si une tâche n'a pas d'estimation, en minutes. */
  defaultTaskMinutes: number;
  /** Plage horaire considérée comme "haute énergie" pour les tâches lourdes. */
  highEnergyWindow: { start: string; end: string };
}

export const DEFAULT_PREFERENCES: PlanningPreferences = {
  workdayStart: "09:00",
  workdayEnd: "18:00",
  breakBetweenTasksMin: 10,
  defaultTaskMinutes: 30,
  highEnergyWindow: { start: "09:00", end: "12:00" },
};
