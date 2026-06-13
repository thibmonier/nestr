import type {
  CalendarEvent,
  DailyPlan,
  PlanningPreferences,
  Task,
  TimeBlock,
  TimeOfDay,
  UnscheduledTask,
} from "../model/types.js";
import {
  atLocal,
  Interval,
  MINUTE,
  minutesOf,
  subtractBusy,
  toISO,
} from "../model/time.js";
import { prioritize } from "./prioritize.js";

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
    }));

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

  const ordered = prioritize(
    input.tasks.filter((t) => t.status !== "done"),
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

    const durationMs =
      (task.estimatedMinutes ?? preferences.defaultTaskMinutes) * MINUTE;

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

export { minutesOf };
