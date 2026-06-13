import { describe, expect, it } from "vitest";
import { scheduleDay, scheduleRange } from "./scheduler.js";
import { subtractBusy, atLocal } from "../model/time.js";
import {
  DEFAULT_PREFERENCES,
  type PlanningPreferences,
  type Task,
  type CalendarEvent,
} from "../model/types.js";

const DATE = "2026-06-15";

/** Disponibilité simple : une fenêtre 09:00–18:00 tous contextes, chaque jour. */
function simpleAvailability(): PlanningPreferences["availability"] {
  const day = [{ start: "09:00", end: "18:00", contexts: [] as string[] }];
  return Array.from({ length: 7 }, () => day);
}
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
  const prefs: PlanningPreferences = {
    ...DEFAULT_PREFERENCES,
    availability: simpleAvailability(),
  };

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

  describe("fenêtres de disponibilité par contexte", () => {
    // Lundi : matin pro (09–12), après-midi perso (14–18), midi off.
    const ctxPrefs: PlanningPreferences = {
      ...DEFAULT_PREFERENCES,
      contexts: ["pro", "perso"],
      availability: Array.from({ length: 7 }, () => [
        { start: "09:00", end: "12:00", contexts: ["pro"] },
        { start: "14:00", end: "18:00", contexts: ["perso"] },
      ]),
    };

    it("place une tâche pro le matin et une perso l'après-midi", () => {
      const tasks = [
        task({ id: "p", context: "pro", estimatedMinutes: 60 }),
        task({ id: "q", context: "perso", estimatedMinutes: 60 }),
      ];
      const plan = scheduleDay({ date: DATE, tasks, events: [], preferences: ctxPrefs, now: NOW });
      const pro = plan.blocks.find((b) => b.taskId === "p")!;
      const perso = plan.blocks.find((b) => b.taskId === "q")!;
      expect(new Date(pro.start).getHours()).toBeLessThan(12);
      expect(new Date(perso.start).getHours()).toBeGreaterThanOrEqual(14);
      expect(plan.unscheduled).toHaveLength(0);
    });

    it("ne place pas une tâche pro dans une fenêtre perso", () => {
      // Journée 100% perso → la tâche pro n'a aucune fenêtre.
      const persoOnly: PlanningPreferences = {
        ...ctxPrefs,
        availability: Array.from({ length: 7 }, () => [
          { start: "09:00", end: "18:00", contexts: ["perso"] },
        ]),
      };
      const tasks = [task({ id: "pro", context: "pro", estimatedMinutes: 30 })];
      const plan = scheduleDay({ date: DATE, tasks, events: [], preferences: persoOnly, now: NOW });
      expect(plan.blocks.filter((b) => b.kind === "task")).toHaveLength(0);
      expect(plan.unscheduled[0]).toMatchObject({ reason: "no_window" });
    });

    it("une tâche sans contexte se place dans n'importe quelle fenêtre", () => {
      const tasks = [task({ id: "flex", estimatedMinutes: 30 })];
      const plan = scheduleDay({ date: DATE, tasks, events: [], preferences: ctxPrefs, now: NOW });
      expect(plan.blocks.filter((b) => b.kind === "task")).toHaveLength(1);
    });

    it("compte les minutes disponibles (fenêtres moins déjeuner)", () => {
      const plan = scheduleDay({ date: DATE, tasks: [], events: [], preferences: ctxPrefs, now: NOW });
      // 09–12 (180) + 14–18 (240) = 420
      expect(plan.availableMinutes).toBe(420);
    });
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

describe("scheduleRange", () => {
  // DATE = 2026-06-15 lundi. Plage lundi→mercredi.
  const prefs: PlanningPreferences = {
    ...DEFAULT_PREFERENCES,
    availability: simpleAvailability(),
  };

  it("reporte au lendemain une tâche qui ne tient pas le jour même", () => {
    const tasks = [
      task({ id: "a", priority: "high", estimatedMinutes: 360 }),
      task({ id: "b", priority: "medium", estimatedMinutes: 360 }),
    ];
    const week = scheduleRange({
      startDate: DATE,
      days: 3,
      tasks,
      eventsByDate: {},
      preferences: prefs,
      now: NOW,
    });
    const day0 = week.days[0]!.blocks.filter((b) => b.kind === "task");
    const day1 = week.days[1]!.blocks.filter((b) => b.kind === "task");
    expect(day0.map((b) => b.taskId)).toEqual(["a"]);
    expect(day1.map((b) => b.taskId)).toEqual(["b"]);
    expect(week.unscheduled).toHaveLength(0);
  });

  it("place une tâche le bon jour autorisé dans la plage", () => {
    // Mercredi 2026-06-17 = getDay 3. Tâche autorisée mercredi seulement.
    const tasks = [task({ id: "merc", estimatedMinutes: 30, allowedWeekdays: [3] })];
    const week = scheduleRange({
      startDate: DATE,
      days: 5,
      tasks,
      eventsByDate: {},
      preferences: prefs,
      now: NOW,
    });
    const wedTasks = week.days[2]!.blocks.filter((b) => b.kind === "task");
    expect(wedTasks.map((b) => b.taskId)).toEqual(["merc"]);
    expect(week.days[0]!.blocks.filter((b) => b.kind === "task")).toHaveLength(0);
    expect(week.unscheduled).toHaveLength(0);
  });

  it("laisse non planifiée une tâche dont l'échéance précède la plage", () => {
    const tasks = [
      task({ id: "tard", estimatedMinutes: 30, dueDate: "2026-06-10T23:59:59.000Z" }),
    ];
    const week = scheduleRange({
      startDate: DATE,
      days: 3,
      tasks,
      eventsByDate: {},
      preferences: prefs,
      now: NOW,
    });
    expect(week.unscheduled.map((u) => u.task.id)).toEqual(["tard"]);
  });
});
