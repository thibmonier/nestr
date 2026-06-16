import { DEFAULT_PREFERENCES, type CalendarEvent, type PlanningPreferences, type Task } from "@nestr/core";
import { loadEvents, saveEvents, loadTasks, saveTasks, loadPreferences, savePreferences, newId } from "./storage";

beforeEach(() => {
  localStorage.clear();
});

describe("loadEvents", () => {
  it("returns empty array when localStorage is empty", () => {
    expect(loadEvents()).toEqual([]);
  });

  it("loads saved events", () => {
    const events: CalendarEvent[] = [
      {
        id: "evt-1",
        source: "local",
        calendarId: "cal-1",
        title: "Meeting",
        start: "2026-06-15T10:00:00Z",
        end: "2026-06-15T11:00:00Z",
        busy: true,
      },
    ];
    saveEvents(events);
    expect(loadEvents()).toEqual(events);
  });

  it("returns empty array on corrupt JSON", () => {
    localStorage.setItem("nestr.events", "{invalid json");
    expect(loadEvents()).toEqual([]);
  });
});

describe("loadTasks", () => {
  it("returns empty array when localStorage is empty", () => {
    expect(loadTasks()).toEqual([]);
  });

  it("loads saved tasks", () => {
    const tasks: Task[] = [
      {
        id: "task-1",
        title: "Review PR",
        status: "todo",
        priority: "high",
        createdAt: "2026-06-15T10:00:00Z",
      },
    ];
    saveTasks(tasks);
    expect(loadTasks()).toEqual(tasks);
  });

  it("returns empty array on corrupt JSON", () => {
    localStorage.setItem("nestr.tasks", "not valid json");
    expect(loadTasks()).toEqual([]);
  });
});

describe("loadPreferences", () => {
  it("returns DEFAULT_PREFERENCES when localStorage is empty", () => {
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it("merges saved preferences with DEFAULT_PREFERENCES", () => {
    const partial: Partial<PlanningPreferences> = {
      breakBetweenTasksMin: 15,
      defaultTaskMinutes: 45,
    };
    localStorage.setItem("nestr.preferences", JSON.stringify(partial));
    const loaded = loadPreferences();
    expect(loaded.breakBetweenTasksMin).toBe(15);
    expect(loaded.defaultTaskMinutes).toBe(45);
    expect(loaded.contexts).toEqual(DEFAULT_PREFERENCES.contexts);
    expect(loaded.availability).toEqual(DEFAULT_PREFERENCES.availability);
  });

  it("saves and loads preferences roundtrip", () => {
    const prefs: PlanningPreferences = {
      ...DEFAULT_PREFERENCES,
      breakBetweenTasksMin: 20,
      contexts: ["work", "home"],
    };
    savePreferences(prefs);
    expect(loadPreferences()).toEqual(prefs);
  });

  it("returns DEFAULT_PREFERENCES on corrupt JSON", () => {
    localStorage.setItem("nestr.preferences", "{malformed");
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });
});

describe("newId", () => {
  it("returns a string", () => {
    const id = newId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns unique IDs", () => {
    const id1 = newId();
    const id2 = newId();
    expect(id1).not.toBe(id2);
  });
});
