import { describe, expect, it } from "vitest";
import { clearDeferral, deferTask, isDeferredFrom } from "./deferral.js";
import type { Task } from "../model/types.js";

const base: Task = {
  id: "t1",
  title: "Tâche",
  status: "todo",
  priority: "medium",
  createdAt: "2026-06-15T08:00:00.000Z",
};

describe("deferTask", () => {
  it("pose la date de report sans muter l'original", () => {
    const d = deferTask(base, "2026-06-16");
    expect(d.deferredTo).toBe("2026-06-16");
    expect(base.deferredTo).toBeUndefined();
  });
});

describe("clearDeferral", () => {
  it("retire la date de report", () => {
    const cleared = clearDeferral(deferTask(base, "2026-06-16"));
    expect(cleared.deferredTo).toBeUndefined();
    expect("deferredTo" in cleared).toBe(false);
  });
});

describe("isDeferredFrom", () => {
  it("masque la tâche les jours antérieurs au report", () => {
    expect(isDeferredFrom(deferTask(base, "2026-06-16"), "2026-06-15")).toBe(true);
  });
  it("réaffiche la tâche le jour du report et après", () => {
    const d = deferTask(base, "2026-06-16");
    expect(isDeferredFrom(d, "2026-06-16")).toBe(false);
    expect(isDeferredFrom(d, "2026-06-17")).toBe(false);
  });
  it("ne masque jamais une tâche non reportée", () => {
    expect(isDeferredFrom(base, "2026-06-15")).toBe(false);
  });
});
