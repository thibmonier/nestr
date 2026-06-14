import { describe, expect, it } from "vitest";
import { buildReminders } from "./reminders.js";
import type { DailyPlan, TimeBlock } from "../model/types.js";

/** 15/06/2026 — instants UTC pour des tests déterministes. */
const NOON = Date.UTC(2026, 5, 15, 12, 0, 0);

function block(over: Partial<TimeBlock>): TimeBlock {
  return {
    start: new Date(Date.UTC(2026, 5, 15, 14, 0, 0)).toISOString(),
    end: new Date(Date.UTC(2026, 5, 15, 15, 0, 0)).toISOString(),
    kind: "task",
    title: "Bloc",
    ...over,
  };
}

function plan(blocks: TimeBlock[]): DailyPlan {
  return { date: "2026-06-15", blocks, unscheduled: [], availableMinutes: 0 };
}

describe("buildReminders", () => {
  it("crée un rappel par bloc tâche/événement à l'heure de début", () => {
    const p = plan([block({ taskId: "t1", title: "Écrire" })]);
    const [r] = buildReminders(p, { now: NOON });
    expect(r?.fireAt).toBe(Date.UTC(2026, 5, 15, 14, 0, 0));
    expect(r?.taskId).toBe("t1");
    expect(r?.title).toBe("Écrire");
  });

  it("applique le délai d'avance (leadMinutes)", () => {
    const p = plan([block({ taskId: "t1" })]);
    const [r] = buildReminders(p, { now: NOON, leadMinutes: 15 });
    expect(r?.fireAt).toBe(Date.UTC(2026, 5, 15, 13, 45, 0));
  });

  it("écarte les rappels déjà passés", () => {
    const past = block({ taskId: "old", start: new Date(Date.UTC(2026, 5, 15, 9, 0, 0)).toISOString() });
    const future = block({ taskId: "next" });
    const out = buildReminders(plan([past, future]), { now: NOON });
    expect(out.map((r) => r.taskId)).toEqual(["next"]);
  });

  it("ignore les pauses et les événements journée entière", () => {
    const out = buildReminders(
      plan([
        block({ kind: "break", title: "Pause" }),
        block({ kind: "event", eventId: "e1", allDay: true, title: "Férié" }),
        block({ taskId: "t1", title: "Vrai" }),
      ]),
      { now: NOON },
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.taskId).toBe("t1");
  });

  it("trie les rappels par instant de déclenchement croissant", () => {
    const late = block({ taskId: "b", start: new Date(Date.UTC(2026, 5, 15, 16, 0, 0)).toISOString() });
    const early = block({ taskId: "a", start: new Date(Date.UTC(2026, 5, 15, 14, 0, 0)).toISOString() });
    const out = buildReminders(plan([late, early]), { now: NOON });
    expect(out.map((r) => r.taskId)).toEqual(["a", "b"]);
  });

  it("produit des id déterministes et stables", () => {
    const p = plan([block({ taskId: "t1" })]);
    const a = buildReminders(p, { now: NOON });
    const b = buildReminders(p, { now: NOON });
    expect(a[0]?.id).toBe(b[0]?.id);
    expect(a[0]?.id).toBe("nestr:2026-06-15:t1");
  });
});
