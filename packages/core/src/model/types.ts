/** Domaine Nestr — types partagés (zéro dépendance, sérialisables). */

export type Priority = "low" | "medium" | "high" | "urgent";
export type Energy = "low" | "medium" | "high";
/** Vecteur de réalisation d'une tâche. */
export type TaskMode = "video" | "phone" | "action" | "trip";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "any";
export type CalendarSource = "google" | "apple" | "local";

/** Une tâche à réaliser. Les champs optionnels peuvent être remplis par l'IA. */
export interface Task {
  id: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: Priority;
  /** Durée estimée en minutes (saisie utilisateur ou estimation IA). */
  estimatedMinutes?: number;
  /** Minutes déjà passées sur la tâche (suivi du temps). */
  spentMinutes?: number;
  /** Vecteur de réalisation : visio / téléphone / action / déplacement. */
  mode?: TaskMode;
  /** Échéance au format ISO (date ou datetime). */
  dueDate?: string;
  /**
   * Date de report (dépriorisation), format ISO date "YYYY-MM-DD". La tâche est
   * masquée du plan des jours strictement antérieurs à cette date. Absent = non
   * reportée.
   */
  deferredTo?: string;
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
  /**
   * Contexte de la tâche (ex. "pro", "perso", ou un contexte personnalisé).
   * La tâche n'est placée que dans une fenêtre de disponibilité qui accepte
   * ce contexte. Absent = tâche flexible, placée dans n'importe quelle fenêtre.
   */
  context?: string;
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
  /** Nom lisible du calendrier d'origine (ex. "Perso", "Work"). */
  calendarName?: string;
  title: string;
  /** Début/fin au format ISO datetime. */
  start: string;
  end: string;
  allDay?: boolean;
  /** Lieu (rempli par l'ajout rapide ; absent pour la plupart des imports). */
  location?: string;
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
  /** Vecteur de réalisation de la tâche (blocs `task`), pour l'affichage. */
  mode?: TaskMode;
  allDay?: boolean;
  /** Pour les blocs d'agenda : source et nom du calendrier d'origine. */
  source?: CalendarSource;
  calendarName?: string;
}

/**
 * Pourquoi une tâche n'a pas été placée :
 * - no_time : des fenêtres acceptent son contexte mais sont pleines
 * - wrong_day : jour de semaine non autorisé (allowedWeekdays)
 * - no_window : aucune fenêtre du jour n'accepte son contexte
 */
export type UnscheduledReason = "no_time" | "wrong_day" | "no_window";

export interface UnscheduledTask {
  task: Task;
  reason: UnscheduledReason;
}

/** Résultat de la planification d'une journée. */
export interface DailyPlan {
  /** Jour planifié, format ISO date (YYYY-MM-DD). */
  date: string;
  blocks: TimeBlock[];
  /** Tâches non placées (manque de temps, jour ou contexte non disponible). */
  unscheduled: UnscheduledTask[];
  /** Minutes libres disponibles ce jour (fenêtres moins événements occupés). */
  availableMinutes: number;
}

/**
 * Fenêtre de disponibilité quotidienne. `contexts` = contextes de tâches
 * acceptés ; vide = accepte tout. Les trous entre fenêtres (déjeuner, etc.)
 * sont indisponibles.
 */
export interface AvailabilityWindow {
  /** "HH:MM" locale. */
  start: string;
  /** "HH:MM" locale. */
  end: string;
  contexts: string[];
}

/** Disponibilités de la semaine, indexées par jour JS (0=dimanche … 6=samedi). */
export type WeeklyAvailability = AvailabilityWindow[][];

/** App de navigation pour les deep-links d'itinéraire. */
export type NavApp = "apple" | "google" | "waze";

/** Adresses de référence pour le calcul du temps de trajet. */
export interface SavedLocations {
  home?: string;
  office?: string;
}

/**
 * App de navigation préférée par plateforme. Waze est inadapté au desktop :
 * seules Apple Plans et Google Maps y sont proposées.
 */
export interface NavPreferences {
  mobile: NavApp;
  desktop: "apple" | "google";
}

/** Préférences de planification de l'utilisateur. */
export interface PlanningPreferences {
  /** Contextes de tâches disponibles (ex. ["pro", "perso", "famille"]). */
  contexts: string[];
  /** Fenêtres de disponibilité par jour de semaine. */
  availability: WeeklyAvailability;
  /** Minutes de pause insérées entre deux tâches consécutives. */
  breakBetweenTasksMin: number;
  /** Durée par défaut si une tâche n'a pas d'estimation, en minutes. */
  defaultTaskMinutes: number;
  /** Plage horaire considérée comme "haute énergie" pour les tâches lourdes. */
  highEnergyWindow: { start: string; end: string };
  /** Adresses de référence (domicile, bureau) pour le calcul de trajet. */
  locations?: SavedLocations;
  /** App de navigation préférée par plateforme. */
  navApp?: NavPreferences;
}

const WEEKDAY_WINDOWS: AvailabilityWindow[] = [
  { start: "08:00", end: "09:00", contexts: ["perso"] },
  { start: "09:00", end: "12:30", contexts: ["pro"] },
  { start: "14:00", end: "18:30", contexts: ["pro"] },
  { start: "18:30", end: "22:00", contexts: ["perso"] },
];

const WEEKEND_WINDOWS: AvailabilityWindow[] = [
  { start: "09:00", end: "12:30", contexts: ["perso"] },
  { start: "14:00", end: "19:00", contexts: ["perso"] },
];

/** availability[jour] — 0=dimanche, 1-5=lun-ven, 6=samedi. */
const DEFAULT_AVAILABILITY: WeeklyAvailability = [
  WEEKEND_WINDOWS, // dimanche
  WEEKDAY_WINDOWS,
  WEEKDAY_WINDOWS,
  WEEKDAY_WINDOWS,
  WEEKDAY_WINDOWS,
  WEEKDAY_WINDOWS,
  WEEKEND_WINDOWS, // samedi
];

export const DEFAULT_PREFERENCES: PlanningPreferences = {
  contexts: ["pro", "perso"],
  availability: DEFAULT_AVAILABILITY,
  breakBetweenTasksMin: 10,
  defaultTaskMinutes: 30,
  highEnergyWindow: { start: "09:00", end: "12:00" },
  locations: {},
  navApp: { mobile: "apple", desktop: "apple" },
};
