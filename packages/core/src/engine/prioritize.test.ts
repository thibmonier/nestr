import { describe, expect, it } from "vitest";
import { prioritize, scoreTask } from "./prioritize.js";
import type { Task } from "../model/types.js";

const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);

function task(p: Partial<Task> & { id: string }): Task {
  return {
    title: p.id,
    status: "todo",
    priority: "medium",
    createdAt: new Date(NOW).toISOString(),
    ...p,
  };
}

/** dueDate ISO à `h` heures de NOW. */
const dueIn = (h: number) => new Date(NOW + h * 3_600_000).toISOString();

describe("scoreTask", () => {
  it("applique les poids de priorité", () => {
    expect(scoreTask(task({ id: "u", priority: "urgent" }), NOW)).toBe(1000);
    expect(scoreTask(task({ id: "h", priority: "high" }), NOW)).toBe(100);
    expect(scoreTask(task({ id: "m", priority: "medium" }), NOW)).toBe(10);
    expect(scoreTask(task({ id: "l", priority: "low" }), NOW)).toBe(1);
  });

  it("ajoute un gros bonus aux échéances dépassées", () => {
    const s = scoreTask(task({ id: "x", priority: "low", dueDate: dueIn(-1) }), NOW);
    expect(s).toBe(1 + 5000);
  });

  it("gradue le bonus selon l'urgence de l'échéance", () => {
    expect(scoreTask(task({ id: "a", dueDate: dueIn(12) }), NOW)).toBe(10 + 800);
    expect(scoreTask(task({ id: "b", dueDate: dueIn(48) }), NOW)).toBe(10 + 200);
    // au-delà de 72h : décroissance linéaire
    const far = scoreTask(task({ id: "c", dueDate: dueIn(200) }), NOW);
    expect(far).toBeGreaterThan(10);
    expect(far).toBeLessThan(10 + 200);
  });

  it("ignore une échéance non parsable (robustesse)", () => {
    const s = scoreTask(task({ id: "bad", priority: "medium", dueDate: "pas-une-date" }), NOW);
    expect(s).toBe(10); // pas de NaN, pas de bonus
  });
});

describe("prioritize", () => {
  it("trie par score décroissant", () => {
    const out = prioritize(
      [
        task({ id: "low", priority: "low" }),
        task({ id: "urgent", priority: "urgent" }),
        task({ id: "medium", priority: "medium" }),
      ],
      NOW,
    );
    expect(out.map((t) => t.id)).toEqual(["urgent", "medium", "low"]);
  });

  it("est stable à score égal (préserve l'ordre d'origine)", () => {
    const out = prioritize(
      [
        task({ id: "first", priority: "medium" }),
        task({ id: "second", priority: "medium" }),
        task({ id: "third", priority: "medium" }),
      ],
      NOW,
    );
    expect(out.map((t) => t.id)).toEqual(["first", "second", "third"]);
  });
});
