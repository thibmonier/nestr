import { describe, expect, it } from "vitest";
import { parsedToEvent, parsedToTask } from "./quickadd.js";
import type { ParsedEntry } from "./types.js";

const OPTS = { id: "x1", now: Date.parse("2026-06-14T08:00:00Z"), todayISO: "2026-06-14" };

function entry(partial: Partial<ParsedEntry>): ParsedEntry {
  return {
    kind: "task",
    title: "Sans titre",
    date: null,
    start: null,
    end: null,
    location: null,
    people: [],
    context: "perso",
    mode: null,
    ...partial,
  };
}

describe("parsedToTask", () => {
  it("mappe titre, contexte et applique le mode par défaut action", () => {
    const t = parsedToTask(entry({ title: "Courses U drive", context: "perso" }), OPTS);
    expect(t.title).toBe("Courses U drive");
    expect(t.context).toBe("perso");
    expect(t.mode).toBe("action");
    expect(t.status).toBe("todo");
    expect(t.priority).toBe("medium");
  });

  it("convertit la date en échéance ISO", () => {
    const t = parsedToTask(entry({ date: "2026-06-20" }), OPTS);
    expect(t.dueDate).toBe(new Date("2026-06-20T23:59:59").toISOString());
  });

  it("déduit la durée estimée d'un créneau start/end", () => {
    const t = parsedToTask(entry({ start: "09:00", end: "10:30" }), OPTS);
    expect(t.estimatedMinutes).toBe(90);
  });

  it("ignore une durée incohérente (end <= start)", () => {
    const t = parsedToTask(entry({ start: "10:00", end: "09:00" }), OPTS);
    expect(t.estimatedMinutes).toBeUndefined();
  });

  it("transforme les personnes en tags", () => {
    const t = parsedToTask(entry({ people: ["Jean", "Marie"] }), OPTS);
    expect(t.tags).toEqual(["Jean", "Marie"]);
  });

  it("conserve le mode fourni", () => {
    const t = parsedToTask(entry({ mode: "video" }), OPTS);
    expect(t.mode).toBe("video");
  });
});

describe("parsedToEvent", () => {
  it("crée un événement local avec lieu", () => {
    const e = parsedToEvent(
      entry({ kind: "event", title: "Déjeuner avec Jean", date: "2026-06-16", start: "12:00", end: "14:00", location: "LAB, Nantes", context: "perso" }),
      OPTS,
    );
    expect(e.source).toBe("local");
    expect(e.title).toBe("Déjeuner avec Jean");
    expect(e.location).toBe("LAB, Nantes");
    expect(e.start).toBe(new Date("2026-06-16T12:00:00").toISOString());
    expect(e.end).toBe(new Date("2026-06-16T14:00:00").toISOString());
    expect(e.busy).toBe(true);
  });

  it("comble horaires manquants (09:00, +60 min) et date du jour", () => {
    const e = parsedToEvent(entry({ kind: "event", title: "Point" }), OPTS);
    expect(e.start).toBe(new Date("2026-06-14T09:00:00").toISOString());
    expect(e.end).toBe(new Date("2026-06-14T10:00:00").toISOString());
  });

  it("force une fin > début si l'IA renvoie une fin incohérente", () => {
    const e = parsedToEvent(entry({ kind: "event", title: "X", date: "2026-06-14", start: "15:00", end: "14:00" }), OPTS);
    expect(e.start).toBe(new Date("2026-06-14T15:00:00").toISOString());
    expect(e.end).toBe(new Date("2026-06-14T16:00:00").toISOString());
  });
});
