import { describe, expect, it } from "vitest";
import { scheduleDay } from "./scheduler.js";
import { subtractBusy, atLocal } from "../model/time.js";
import { DEFAULT_PREFERENCES, type Task, type CalendarEvent } from "../model/types.js";

const DATE = "2026-06-15";
// "now" avant le début de journée pour ne rien tronquer.
const NOW = atLocal(DATE, "07:00");

function task(p: Partial<Task> & { id: string }): Task {
  return {
    title: p.id,
    status: "todo",
    priority: "medium",
    createdAt: new Date(NOW).toISOString(),
    ...p,
  };
}

describe("subtractBusy", () => {
  it("renvoie toute la plage si rien d'occupé", () => {
    const wd = { start: atLocal(DATE, "09:00"), end: atLocal(DATE, "18:00") };
    expect(subtractBusy(wd, [])).toEqual([wd]);
  });

  it("retire un événement central et garde les deux côtés", () => {
    const wd = { start: atLocal(DATE, "09:00"), end: atLocal(DATE, "18:00") };
    const busy = [{ start: atLocal(DATE, "12:00"), end: atLocal(DATE, "13:00") }];
    const free = subtractBusy(wd, busy);
    expect(free).toHaveLength(2);
    expect(free[0]!.end).toBe(atLocal(DATE, "12:00"));
    expect(free[1]!.start).toBe(atLocal(DATE, "13:00"));
  });

  it("fusionne les événements qui se chevauchent", () => {
    const wd = { start: atLocal(DATE, "09:00"), end: atLocal(DATE, "18:00") };
    const busy = [
      { start: atLocal(DATE, "10:00"), end: atLocal(DATE, "11:30") },
      { start: atLocal(DATE, "11:00"), end: atLocal(DATE, "12:00") },
    ];
    const free = subtractBusy(wd, busy);
    expect(free).toHaveLength(2);
    expect(free[0]!.end).toBe(atLocal(DATE, "10:00"));
    expect(free[1]!.start).toBe(atLocal(DATE, "12:00"));
  });
});

describe("scheduleDay", () => {
  const prefs = { ...DEFAULT_PREFERENCES };

  it("place les tâches urgentes avant les tâches basses", () => {
    const tasks = [
      task({ id: "low", priority: "low", estimatedMinutes: 60 }),
      task({ id: "urgent", priority: "urgent", estimatedMinutes: 60 }),
    ];
    const plan = scheduleDay({ date: DATE, tasks, events: [], preferences: prefs, now: NOW });
    const taskBlocks = plan.blocks.filter((b) => b.kind === "task");
    expect(taskBlocks[0]!.taskId).toBe("urgent");
    expect(taskBlocks[1]!.taskId).toBe("low");
    expect(plan.unscheduled).toHaveLength(0);
  });

  it("respecte les événements d'agenda (busy)", () => {
    const events: CalendarEvent[] = [
      {
        id: "mtg",
        source: "google",
        calendarId: "primary",
        title: "Réunion",
        start: new Date(atLocal(DATE, "09:00")).toISOString(),
        end: new Date(atLocal(DATE, "10:00")).toISOString(),
        busy: true,
      },
    ];
    const tasks = [task({ id: "t1", estimatedMinutes: 30 })];
    const plan = scheduleDay({ date: DATE, tasks, events, preferences: prefs, now: NOW });
    const tb = plan.blocks.find((b) => b.kind === "task")!;
    // Ne démarre pas avant 10:00 (après la réunion).
    expect(new Date(tb.start).getTime()).toBeGreaterThanOrEqual(atLocal(DATE, "10:00"));
  });

  it("met en unscheduled ce qui ne tient pas dans la journée", () => {
    const tasks = [
      task({ id: "big", priority: "high", estimatedMinutes: 600 }),
      task({ id: "huge", priority: "low", estimatedMinutes: 600 }),
    ];
    const plan = scheduleDay({ date: DATE, tasks, events: [], preferences: prefs, now: NOW });
    expect(plan.unscheduled.map((u) => u.task.id)).toContain("huge");
    expect(plan.unscheduled.find((u) => u.task.id === "huge")?.reason).toBe("no_time");
  });

  it("écarte une tâche dont le jour n'est pas autorisé", () => {
    // 2026-06-15 est un lundi (getDay 1). On autorise seulement le week-end.
    const tasks = [
      task({ id: "appel", priority: "urgent", estimatedMinutes: 30, allowedWeekdays: [0, 6] }),
    ];
    const plan = scheduleDay({ date: DATE, tasks, events: [], preferences: prefs, now: NOW });
    expect(plan.blocks.filter((b) => b.kind === "task")).toHaveLength(0);
    expect(plan.unscheduled[0]).toMatchObject({ reason: "wrong_day" });
    expect(plan.unscheduled[0]?.task.id).toBe("appel");
  });

  it("place une tâche le jour autorisé (lundi)", () => {
    const tasks = [
      task({ id: "appel", estimatedMinutes: 30, allowedWeekdays: [1, 2, 3, 4, 5] }),
    ];
    const plan = scheduleDay({ date: DATE, tasks, events: [], preferences: prefs, now: NOW });
    expect(plan.blocks.filter((b) => b.kind === "task")).toHaveLength(1);
    expect(plan.unscheduled).toHaveLength(0);
  });

  it("ignore les tâches déjà terminées", () => {
    const tasks = [task({ id: "done", status: "done", estimatedMinutes: 60 })];
    const plan = scheduleDay({ date: DATE, tasks, events: [], preferences: prefs, now: NOW });
    expect(plan.blocks.filter((b) => b.kind === "task")).toHaveLength(0);
  });

  it("insère une pause entre deux tâches consécutives", () => {
    const tasks = [
      task({ id: "a", priority: "high", estimatedMinutes: 30 }),
      task({ id: "b", priority: "medium", estimatedMinutes: 30 }),
    ];
    const plan = scheduleDay({ date: DATE, tasks, events: [], preferences: prefs, now: NOW });
    const tb = plan.blocks.filter((b) => b.kind === "task");
    const gap =
      (new Date(tb[1]!.start).getTime() - new Date(tb[0]!.end).getTime()) / 60000;
    expect(gap).toBe(prefs.breakBetweenTasksMin);
  });
});
