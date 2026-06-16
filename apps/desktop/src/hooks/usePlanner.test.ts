import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import type { CalendarEvent, DailyPlan, PlanningPreferences, Task } from "@nestr/core";
import { usePlanner } from "./usePlanner.js";
import type { MeStatus } from "../lib/auth.js";

// Mocks
vi.mock("../lib/ai.js", () => ({
  advise: vi.fn(),
  breakdownTask: vi.fn(),
  estimateDurations: vi.fn(),
}));
vi.mock("../lib/calendars.js", () => ({ fetchDayEvents: vi.fn(async () => []) }));
vi.mock("../lib/format.js", () => ({
  localDate: vi.fn((s: string) => s.slice(0, 10)),
  todayISO: vi.fn(() => "2026-07-01"),
}));
vi.mock("../lib/storage.js", () => ({
  newId: vi.fn(() => "new-id-1"),
  loadTasks: vi.fn(() => []),
  saveTasks: vi.fn(),
}));
vi.mock("@nestr/core", async () => {
  const actual = await vi.importActual<typeof import("@nestr/core")>("@nestr/core");
  return {
    ...actual,
    scheduleDay: vi.fn(() => ({
      date: "2026-07-01",
      blocks: [],
      unscheduled: [],
      availableMinutes: 480,
    })),
    scheduleRange: vi.fn(() => ({
      days: [{ date: "2026-07-01", blocks: [], unscheduled: [], availableMinutes: 480 }],
    })),
    addDays: vi.fn((date: string, n: number) => {
      const d = new Date(date);
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    }),
  };
});

// Import mocked modules
import { advise, breakdownTask, estimateDurations } from "../lib/ai.js";
import { fetchDayEvents } from "../lib/calendars.js";
import { scheduleDay, scheduleRange } from "@nestr/core";

interface PlannerOptions {
  tasks: Task[];
  pending: Task[];
  prefs: PlanningPreferences;
  me: MeStatus | null;
  selectedDate: string;
  localEvents: CalendarEvent[];
  setTasks: ReturnType<typeof vi.fn>;
  setError: ReturnType<typeof vi.fn>;
}

function makeOpts(overrides?: Partial<PlannerOptions>): PlannerOptions {
  return {
    tasks: [],
    pending: [],
    prefs: { workStartHour: 9, workEndHour: 18, defaultTaskMinutes: 30 } as PlanningPreferences,
    me: null,
    selectedDate: "2026-07-01",
    localEvents: [],
    setTasks: vi.fn(),
    setError: vi.fn(),
    ...overrides,
  };
}

describe("usePlanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initial state — plan/weekPlan/advice null, busy null", () => {
    const { result } = renderHook(() => usePlanner(makeOpts()));

    expect(result.current.plan).toBeNull();
    expect(result.current.weekPlan).toBeNull();
    expect(result.current.advice).toBeNull();
    expect(result.current.busy).toBeNull();
    expect(result.current.breakingId).toBeNull();
    expect(result.current.breakdown).toBeNull();
  });

  it("planDay — calls fetchDayEvents + scheduleDay, sets plan", async () => {
    const opts = makeOpts({ selectedDate: "2026-07-01" });
    const { result } = renderHook(() => usePlanner(opts));

    await act(async () => {
      await result.current.planDay();
    });

    const expectedStart = new Date("2026-07-01T00:00:00").toISOString();
    const expectedEnd = new Date("2026-07-01T23:59:59").toISOString();
    expect(fetchDayEvents).toHaveBeenCalledWith(expectedStart, expectedEnd);
    expect(scheduleDay).toHaveBeenCalledWith(
      expect.objectContaining({
        date: "2026-07-01",
        tasks: opts.tasks,
        preferences: opts.prefs,
      })
    );
    expect(result.current.plan).toEqual({
      date: "2026-07-01",
      blocks: [],
      unscheduled: [],
      availableMinutes: 480,
    });
    expect(result.current.busy).toBeNull();
  });

  it("planDay with AI — when me.aiConfigured=true, also calls advise", async () => {
    const me: MeStatus = { email: "test@example.com", aiConfigured: true };
    const pending: Task[] = [
      {
        id: "task-1",
        title: "Task 1",
        status: "todo",
        priority: 1,
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ];
    const mockAdvice = { suggestions: ["Do task 1 first"] };
    vi.mocked(advise).mockResolvedValueOnce(mockAdvice);

    const opts = makeOpts({ me, pending });
    const { result } = renderHook(() => usePlanner(opts));

    await act(async () => {
      await result.current.planDay();
    });

    expect(advise).toHaveBeenCalledWith(pending, 480);
    await waitFor(() => {
      expect(result.current.advice).toEqual(mockAdvice);
    });
  });

  it("planDay without AI — when me is null, doesn't call advise", async () => {
    const opts = makeOpts({ me: null });
    const { result } = renderHook(() => usePlanner(opts));

    await act(async () => {
      await result.current.planDay();
    });

    expect(advise).not.toHaveBeenCalled();
    expect(result.current.advice).toBeNull();
  });

  it("planDay error — when fetchDayEvents rejects, calls setError", async () => {
    const error = new Error("Fetch failed");
    vi.mocked(fetchDayEvents).mockRejectedValueOnce(error);

    const opts = makeOpts();
    const { result } = renderHook(() => usePlanner(opts));

    await act(async () => {
      await result.current.planDay();
    });

    expect(opts.setError).toHaveBeenCalledWith("Fetch failed");
    expect(result.current.busy).toBeNull();
  });

  it("planWeek — calls scheduleRange, sets weekPlan", async () => {
    const opts = makeOpts({ selectedDate: "2026-07-01" });
    const { result } = renderHook(() => usePlanner(opts));

    await act(async () => {
      await result.current.planWeek();
    });

    expect(fetchDayEvents).toHaveBeenCalled();
    expect(scheduleRange).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: "2026-07-01",
        days: 7,
        tasks: opts.tasks,
        preferences: opts.prefs,
      })
    );
    expect(result.current.weekPlan).toEqual({
      days: [{ date: "2026-07-01", blocks: [], unscheduled: [], availableMinutes: 480 }],
    });
    expect(result.current.plan).toBeNull();
  });

  it("scheduleManually — creates a block in the plan", () => {
    const task: Task = {
      id: "task-1",
      title: "Test Task",
      status: "todo",
      priority: 1,
      estimatedMinutes: 60,
      createdAt: "2026-07-01T00:00:00.000Z",
    };
    const opts = makeOpts({
      tasks: [task],
      selectedDate: "2026-07-01",
    });
    const { result } = renderHook(() => usePlanner(opts));

    // Set initial plan
    act(() => {
      result.current.scheduleManually("task-1", 540); // 9:00 AM (540 minutes from midnight)
    });

    const startD = new Date("2026-07-01T00:00:00");
    startD.setMinutes(540);
    const endD = new Date(startD.getTime() + 60 * 60_000);
    expect(result.current.plan).toEqual({
      date: "2026-07-01",
      blocks: [
        {
          start: startD.toISOString(),
          end: endD.toISOString(),
          kind: "task",
          title: "Test Task",
          taskId: "task-1",
        },
      ],
      unscheduled: [],
      availableMinutes: 0,
    });
  });

  it("scheduleManually with null taskId — does nothing", () => {
    const opts = makeOpts();
    const { result } = renderHook(() => usePlanner(opts));

    act(() => {
      result.current.scheduleManually(null, 540);
    });

    expect(result.current.plan).toBeNull();
  });

  it("estimateWithAi — calls estimateDurations, calls setTasks", async () => {
    const pending: Task[] = [
      { id: "task-1", title: "Task 1", status: "todo", priority: 1, createdAt: "2026-07-01T00:00:00.000Z" },
    ];
    const estimates = [{ taskId: "task-1", estimatedMinutes: 45, energy: "medium" as const }];
    vi.mocked(estimateDurations).mockResolvedValueOnce(estimates);

    const opts = makeOpts({ pending, tasks: pending });
    const { result } = renderHook(() => usePlanner(opts));

    await act(async () => {
      await result.current.estimateWithAi();
    });

    expect(estimateDurations).toHaveBeenCalledWith(pending);
    expect(opts.setTasks).toHaveBeenCalledWith(expect.any(Function));

    // Verify the setTasks function updates correctly
    const updateFn = vi.mocked(opts.setTasks).mock.calls[0][0] as (prev: Task[]) => Task[];
    const updated = updateFn(pending);
    expect(updated[0]).toEqual({
      ...pending[0],
      estimatedMinutes: 45,
      energy: "medium",
    });
  });

  it("startBreakdown — calls breakdownTask, sets breakdown", async () => {
    const task: Task = {
      id: "task-1",
      title: "Complex Task",
      status: "todo",
      priority: 1,
      createdAt: "2026-07-01T00:00:00.000Z",
    };
    const proposals = [
      { title: "Subtask 1", estimatedMinutes: 30, energy: "low" as const },
      { title: "Subtask 2", estimatedMinutes: 45, energy: "medium" as const },
    ];
    vi.mocked(breakdownTask).mockResolvedValueOnce(proposals);

    const opts = makeOpts();
    const { result } = renderHook(() => usePlanner(opts));

    await act(async () => {
      await result.current.startBreakdown(task);
    });

    expect(breakdownTask).toHaveBeenCalledWith(task);
    expect(result.current.breakdown).toEqual({ task, proposals });
    expect(result.current.breakingId).toBeNull();
  });

  it("applyBreakdown — replaces parent with children in setTasks", () => {
    const parentTask: Task = {
      id: "parent-1",
      title: "Parent Task",
      status: "todo",
      priority: 1,
      dueDate: "2026-07-15",
      createdAt: "2026-07-01T00:00:00.000Z",
    };
    const proposals = [
      { title: "Subtask 1", estimatedMinutes: 30, energy: "low" as const },
      { title: "Subtask 2", estimatedMinutes: 45, energy: "medium" as const },
    ];

    const opts = makeOpts({ tasks: [parentTask] });
    const { result } = renderHook(() => usePlanner(opts));

    // Set breakdown state
    act(() => {
      result.current.setBreakdown({ task: parentTask, proposals });
    });

    // Apply breakdown
    act(() => {
      result.current.applyBreakdown(proposals);
    });

    expect(opts.setTasks).toHaveBeenCalledWith(expect.any(Function));

    // Verify the setTasks function creates children correctly
    const updateFn = vi.mocked(opts.setTasks).mock.calls[0][0] as (prev: Task[]) => Task[];
    const updated = updateFn([parentTask]);

    expect(updated).toHaveLength(2);
    expect(updated[0]).toMatchObject({
      id: "new-id-1",
      title: "Subtask 1",
      status: "todo",
      priority: 1,
      estimatedMinutes: 30,
      energy: "low",
      dueDate: "2026-07-15",
      parentId: "parent-1",
    });
    expect(updated[1]).toMatchObject({
      id: "new-id-1",
      title: "Subtask 2",
      estimatedMinutes: 45,
      energy: "medium",
      parentId: "parent-1",
    });
    expect(result.current.breakdown).toBeNull();
  });
});
