import { describe, expect, it } from "vitest";
import { elapsedMinutes, startTracking, stopTracking } from "./tracking.js";
import type { Task } from "../model/types.js";

const base: Task = {
  id: "t1",
  title: "Tâche",
  status: "todo",
  priority: "medium",
  createdAt: "2026-06-15T08:00:00.000Z",
};

describe("elapsedMinutes", () => {
  it("renvoie les minutes écoulées (fractionnaires)", () => {
    const start = Date.UTC(2026, 5, 15, 9, 0, 0);
    expect(elapsedMinutes(start, start + 90_000)).toBeCloseTo(1.5);
  });
  it("ne renvoie jamais de valeur négative", () => {
    const t = Date.UTC(2026, 5, 15, 9, 0, 0);
    expect(elapsedMinutes(t, t - 60_000)).toBe(0);
  });
});

describe("startTracking", () => {
  it("passe la tâche en cours sans muter l'original", () => {
    const started = startTracking(base);
    expect(started.status).toBe("in_progress");
    expect(base.status).toBe("todo");
  });
});

describe("stopTracking", () => {
  it("ajoute le temps écoulé (arrondi) et remet en attente", () => {
    const t = stopTracking({ ...base, status: "in_progress", spentMinutes: 10 }, 5.4, "pending");
    expect(t.spentMinutes).toBe(15);
    expect(t.status).toBe("todo");
  });
  it("marque terminé avec le cumul de temps", () => {
    const t = stopTracking({ ...base, status: "in_progress" }, 25, "done");
    expect(t.spentMinutes).toBe(25);
    expect(t.status).toBe("done");
  });
  it("part de 0 si aucun temps déjà passé et clampe les négatifs", () => {
    const t = stopTracking(base, -3, "pending");
    expect(t.spentMinutes).toBe(0);
  });
});
