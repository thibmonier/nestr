import type {
  CalendarEvent,
  DailyPlan,
  PlanningPreferences,
  Task,
  TimeBlock,
  TimeOfDay,
  UnscheduledReason,
  UnscheduledTask,
} from "../model/types.js";
import {
  addDays,
  atLocal,
  Interval,
  MINUTE,
  minutesOf,
  subtractBusy,
  toISO,
} from "../model/time.js";
import { prioritize } from "./prioritize.js";
import { isDeferredFrom } from "./deferral.js";

export interface ScheduleInput {
  /** Jour à planifier, "YYYY-MM-DD". */
  date: string;
  tasks: Task[];
  events: CalendarEvent[];
  preferences: PlanningPreferences;
  /** Instant courant (epoch ms) — sert à l'urgence et à ne pas planifier dans le passé. */
  now: number;
}

/** Créneau libre mutable (issu d'une fenêtre de disponibilité) utilisé au placement. */
interface FreeSlot {
  start: number;
  end: number;
  contexts: string[];
}

/** Une fenêtre/créneau accepte-t-il une tâche de ce contexte ? */
function accepts(contexts: string[], taskContext: string | undefined): boolean {
  return contexts.length === 0 || !taskContext || contexts.includes(taskContext);
}

function timeOfDayOf(ms: number): TimeOfDay {
  const h = new Date(ms).getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

/**
 * Bonus de placement d'une tâche dans un créneau commençant à `slotStart`.
 * Récompense le respect du moment préféré et de la fenêtre haute énergie.
 */
function placementBonus(
  task: Task,
  slotStart: number,
  highEnergy: Interval,
): number {
  let bonus = 0;
  if (task.preferredTimeOfDay && task.preferredTimeOfDay !== "any") {
    if (timeOfDayOf(slotStart) === task.preferredTimeOfDay) bonus += 50;
  }
  if (task.energy === "high" && slotStart >= highEnergy.start && slotStart < highEnergy.end) {
    bonus += 30;
  }
  return bonus;
}

/**
 * Planifie une journée : extrait les créneaux libres de l'agenda puis place
 * les tâches par priorité dans le meilleur créneau disponible.
 *
 * Moteur déterministe — base raffinée ensuite par l'IA (estimations, découpage).
 */
export function scheduleDay(input: ScheduleInput): DailyPlan {
  const { date, events, preferences, now } = input;

  const highEnergy: Interval = {
    start: atLocal(date, preferences.highEnergyWindow.start),
    end: atLocal(date, preferences.highEnergyWindow.end),
  };

  // Intervalles occupés par les événements "busy".
  const busy: Interval[] = events
    .filter((e) => e.busy)
    .map((e) => ({
      start: new Date(e.start).getTime(),
      end: new Date(e.end).getTime(),
    }))
    // Ignore les events aux dates non parsables (sinon NaN → créneau faussé).
    .filter((i) => Number.isFinite(i.start) && Number.isFinite(i.end) && i.end > i.start);

  // Jour de semaine planifié (0=dimanche … 6=samedi), à midi pour éviter les bords.
  const weekday = new Date(atLocal(date, "12:00")).getDay();
  const windows = preferences.availability[weekday] ?? [];

  // Créneaux libres = chaque fenêtre, tronquée au présent et amputée des events.
  let slots: FreeSlot[] = [];
  for (const w of windows) {
    const wInterval: Interval = {
      start: Math.max(atLocal(date, w.start), now),
      end: atLocal(date, w.end),
    };
    if (wInterval.end <= wInterval.start) continue;
    for (const free of subtractBusy(wInterval, busy)) {
      slots.push({ start: free.start, end: free.end, contexts: w.contexts });
    }
  }

  const availableMinutes = slots.reduce(
    (sum, s) => sum + (s.end - s.start) / MINUTE,
    0,
  );

  // Exclut les tâches reportées (deferredTo) à un jour postérieur à celui-ci.
  const ordered = prioritize(
    input.tasks.filter((t) => t.status !== "done" && !isDeferredFrom(t, date)),
    now,
  );

  const blocks: TimeBlock[] = [];
  const unscheduled: UnscheduledTask[] = [];
  const breakMs = preferences.breakBetweenTasksMin * MINUTE;

  for (const task of ordered) {
    // Contrainte dure : jour non autorisé pour cette tâche.
    if (
      task.allowedWeekdays &&
      task.allowedWeekdays.length > 0 &&
      !task.allowedWeekdays.includes(weekday)
    ) {
      unscheduled.push({ task, reason: "wrong_day" });
      continue;
    }

    // Aucune fenêtre du jour n'accepte le contexte de la tâche.
    if (!windows.some((w) => accepts(w.contexts, task.context))) {
      unscheduled.push({ task, reason: "no_window" });
      continue;
    }

    // Durée robuste : une estimation absente/invalide/≤0 (ex. NaN renvoyé par
    // l'IA) retombe sur la durée par défaut plutôt que de produire un bloc
    // corrompu ou de faire crasher toute la planification (toISO(NaN)).
    const estMin = task.estimatedMinutes;
    const minutes =
      typeof estMin === "number" && Number.isFinite(estMin) && estMin > 0
        ? estMin
        : preferences.defaultTaskMinutes;
    const durationMs = minutes * MINUTE;

    // Choisit le créneau compatible avec le contexte et le meilleur bonus.
    let best: { slot: FreeSlot; bonus: number } | null = null;
    for (const slot of slots) {
      if (slot.end - slot.start < durationMs) continue;
      if (!accepts(slot.contexts, task.context)) continue;
      const bonus = placementBonus(task, slot.start, highEnergy);
      if (
        !best ||
        bonus > best.bonus ||
        (bonus === best.bonus && slot.start < best.slot.start)
      ) {
        best = { slot, bonus };
      }
    }

    if (!best) {
      unscheduled.push({ task, reason: "no_time" });
      continue;
    }

    const start = best.slot.start;
    const end = start + durationMs;
    blocks.push({
      start: toISO(start),
      end: toISO(end),
      kind: "task",
      title: task.title,
      taskId: task.id,
      ...(task.mode ? { mode: task.mode } : {}),
    });

    // Réduit le créneau, en réservant une pause après la tâche.
    best.slot.start = end + breakMs;
    slots = slots.filter((s) => s.end - s.start >= MINUTE);
  }

  // Ajoute les événements d'agenda comme blocs pour une vue complète de la journée.
  for (const e of events) {
    blocks.push({
      start: e.start,
      end: e.end,
      kind: "event",
      title: e.title,
      eventId: e.id,
      allDay: e.allDay,
      source: e.source,
      calendarName: e.calendarName,
    });
  }

  blocks.sort((a, b) => a.start.localeCompare(b.start));

  return { date, blocks, unscheduled, availableMinutes };
}

export interface ScheduleRangeInput {
  /** Premier jour planifié, "YYYY-MM-DD". */
  startDate: string;
  /** Nombre de jours à planifier (ex. 7). */
  days: number;
  tasks: Task[];
  /** Événements d'agenda par jour ("YYYY-MM-DD" → events). */
  eventsByDate: Record<string, CalendarEvent[]>;
  preferences: PlanningPreferences;
  now: number;
}

export interface WeekPlan {
  /** Un plan par jour de la plage. */
  days: DailyPlan[];
  /** Tâches non placées sur toute la plage. */
  unscheduled: UnscheduledTask[];
}

/** Date "YYYY-MM-DD" de l'échéance (ignore l'heure). */
const dueDay = (t: Task): string | undefined => t.dueDate?.slice(0, 10);

/**
 * Détermine pourquoi une tâche n'a pu être placée nulle part sur la plage :
 * aucun jour autorisé, aucune fenêtre pour son contexte, ou manque de temps.
 */
function rangeReason(
  task: Task,
  startDate: string,
  days: number,
  prefs: PlanningPreferences,
): UnscheduledReason {
  let anyDay = false;
  let anyWindow = false;
  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    const due = dueDay(task);
    if (due && due < date) continue; // après l'échéance ce jour-là
    const wd = new Date(atLocal(date, "12:00")).getDay();
    if (task.allowedWeekdays?.length && !task.allowedWeekdays.includes(wd)) {
      continue;
    }
    anyDay = true;
    const windows = prefs.availability[wd] ?? [];
    if (windows.some((w) => accepts(w.contexts, task.context))) anyWindow = true;
  }
  if (!anyDay) return "wrong_day";
  if (!anyWindow) return "no_window";
  return "no_time";
}

/**
 * Planifie une plage de jours : place les tâches au plus tôt, en reportant au
 * lendemain celles qui ne tiennent pas, sans jamais dépasser leur échéance ni
 * leurs jours autorisés. Réutilise le placement journalier (fenêtres + contexte).
 */
export function scheduleRange(input: ScheduleRangeInput): WeekPlan {
  const { startDate, days, eventsByDate, preferences, now } = input;

  const rangeEnd = addDays(startDate, days - 1);
  let remaining = prioritize(
    input.tasks.filter((t) => t.status !== "done" && !isDeferredFrom(t, rangeEnd)),
    now,
  );

  const dayPlans: DailyPlan[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    const dayNow = i === 0 ? now : atLocal(date, "00:00");

    // Éligibles ce jour : échéance non dépassée.
    const eligible = remaining.filter((t) => {
      const due = dueDay(t);
      return !due || due >= date;
    });

    const plan = scheduleDay({
      date,
      tasks: eligible,
      events: eventsByDate[date] ?? [],
      preferences,
      now: dayNow,
    });
    dayPlans.push(plan);

    const placed = new Set(
      plan.blocks.filter((b) => b.kind === "task").map((b) => b.taskId),
    );
    remaining = remaining.filter((t) => !placed.has(t.id));
  }

  const unscheduled: UnscheduledTask[] = remaining.map((task) => ({
    task,
    reason: rangeReason(task, startDate, days, preferences),
  }));

  return { days: dayPlans, unscheduled };
}

export { minutesOf };
