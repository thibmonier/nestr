import { describe, expect, it } from "vitest";
import { scheduleDay } from "./scheduler.js";
import { atLocal, MINUTE } from "../model/time.js";
import {
  DEFAULT_PREFERENCES,
  type CalendarEvent,
  type PlanningPreferences,
  type Task,
} from "../model/types.js";

const DATE = "2026-06-15";
const NOW = atLocal(DATE, "07:00");

const prefs: PlanningPreferences = {
  ...DEFAULT_PREFERENCES,
  defaultTaskMinutes: 30,
  availability: Array.from({ length: 7 }, () => [
    { start: "09:00", end: "18:00", contexts: [] as string[] },
  ]),
};

function task(p: Partial<Task> & { id: string }): Task {
  return {
    title: p.id,
    status: "todo",
    priority: "medium",
    createdAt: new Date(NOW).toISOString(),
    ...p,
  };
}

const blockMinutes = (start: string, end: string) =>
  (new Date(end).getTime() - new Date(start).getTime()) / MINUTE;

describe("scheduleDay — robustesse aux entrées invalides", () => {
  it("ne plante pas et retombe sur la durée par défaut si estimatedMinutes = NaN", () => {
    const tasks = [task({ id: "nan", estimatedMinutes: Number.NaN })];
    const plan = scheduleDay({ date: DATE, tasks, events: [], preferences: prefs, now: NOW });
    const block = plan.blocks.find((b) => b.taskId === "nan");
    expect(block).toBeDefined();
    expect(blockMinutes(block!.start, block!.end)).toBe(30);
  });

  it("retombe sur la durée par défaut pour une durée ≤ 0", () => {
    const plan = scheduleDay({
      date: DATE,
      tasks: [task({ id: "neg", estimatedMinutes: -15 }), task({ id: "zero", estimatedMinutes: 0 })],
      events: [],
      preferences: prefs,
      now: NOW,
    });
    for (const id of ["neg", "zero"]) {
      const b = plan.blocks.find((x) => x.taskId === id)!;
      expect(blockMinutes(b.start, b.end)).toBe(30);
    }
  });

  it("ignore un événement aux dates non parsables au lieu de fausser les créneaux", () => {
    const events: CalendarEvent[] = [
      {
        id: "bad",
        source: "google",
        calendarId: "primary",
        title: "Corrompu",
        start: "pas-une-date",
        end: "pas-une-date",
        busy: true,
      },
    ];
    const plan = scheduleDay({
      date: DATE,
      tasks: [task({ id: "t", estimatedMinutes: 60 })],
      events,
      preferences: prefs,
      now: NOW,
    });
    // L'event invalide n'ampute pas le temps libre (09:00–18:00 = 540 min) ni ne crashe.
    expect(plan.availableMinutes).toBe(540);
    expect(plan.blocks.some((b) => b.taskId === "t")).toBe(true);
    expect(Number.isFinite(plan.availableMinutes)).toBe(true);
  });
});
