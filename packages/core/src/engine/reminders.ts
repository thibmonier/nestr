/**
 * Rappels de notification dérivés d'un plan de journée. Logique pure et
 * déterministe (on passe `now`) : la couche app se charge de programmer les
 * notifications locales (expo-notifications / Tauri) à partir de cette liste.
 */
import type { DailyPlan, TimeBlock } from "../model/types.js";

const MS_PER_MIN = 60_000;

export interface Reminder {
  /** id stable et déterministe — sert à dédupliquer / annuler. */
  id: string;
  title: string;
  body: string;
  /** Instant de déclenchement, epoch ms. */
  fireAt: number;
  taskId?: string;
  eventId?: string;
}

export interface ReminderOptions {
  /** Minutes d'avance avant le début du bloc (défaut 0 = à l'heure pile). */
  leadMinutes?: number;
  /** Maintenant (epoch ms) — les rappels déjà passés sont écartés. */
  now: number;
}

/** "HH:MM" locale à partir d'un instant epoch ms. */
function hhmm(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function refOf(block: TimeBlock): string {
  return block.taskId ?? block.eventId ?? `${block.kind}-${block.start}`;
}

function reminderFor(date: string, block: TimeBlock, lead: number): Reminder {
  const startMs = Date.parse(block.start);
  const fireAt = startMs - lead * MS_PER_MIN;
  const at = hhmm(startMs);
  const isTask = block.kind === "task";
  const body =
    lead > 0
      ? `${isTask ? "Tâche" : "Événement"} à ${at} (dans ${lead} min)`
      : `${isTask ? "Tâche planifiée" : "Événement"} à ${at}`;
  return {
    id: `nestr:${date}:${refOf(block)}`,
    title: block.title,
    body,
    fireAt,
    ...(block.taskId ? { taskId: block.taskId } : {}),
    ...(block.eventId ? { eventId: block.eventId } : {}),
  };
}

/**
 * Construit les rappels d'un plan : un par bloc tâche ou événement (les pauses
 * et les événements journée entière sont ignorés). Les rappels dont l'instant
 * de déclenchement est passé sont écartés. Triés par `fireAt` croissant.
 */
export function buildReminders(plan: DailyPlan, opts: ReminderOptions): Reminder[] {
  const lead = Math.max(0, opts.leadMinutes ?? 0);
  return plan.blocks
    .filter((b) => (b.kind === "task" || b.kind === "event") && !b.allDay)
    .map((b) => reminderFor(plan.date, b, lead))
    .filter((r) => r.fireAt > opts.now)
    .sort((a, b) => a.fireAt - b.fireAt);
}
