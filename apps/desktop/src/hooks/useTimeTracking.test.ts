import { renderHook, act } from "@testing-library/react";
import type { Task } from "@nestr/core";
import { useTimeTracking } from "./useTimeTracking.js";
import { elapsedMinutes, startTracking, stopTracking } from "@nestr/core";

vi.mock("@nestr/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@nestr/core")>();
  return {
    ...actual,
    elapsedMinutes: vi.fn(),
    startTracking: vi.fn(),
    stopTracking: vi.fn(),
  };
});

describe("useTimeTracking", () => {
  const mockSetTasks = vi.fn();

  const mockTask1: Task = {
    id: "task-1",
    title: "Task 1",
    status: "todo",
    createdAt: new Date("2026-06-15T10:00:00Z"),
  };

  const mockTask2: Task = {
    id: "task-2",
    title: "Task 2",
    status: "todo",
    createdAt: new Date("2026-06-15T11:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default mock implementations
    vi.mocked(elapsedMinutes).mockReturnValue(5);
    vi.mocked(startTracking).mockImplementation((task) => task);
    vi.mocked(stopTracking).mockImplementation((task, _mins, outcome) => ({
      ...task,
      status: outcome,
    }));

    // Mock Date.now for consistent timing
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes with null when no localStorage", () => {
    const { result } = renderHook(() => useTimeTracking(mockSetTasks));

    expect(result.current.activeTaskId).toBeNull();
    expect(result.current.elapsedMin).toBe(0);
  });

  it("restores from localStorage", () => {
    const tracking = {
      taskId: "task-1",
      startedAt: Date.now() - 300000, // 5 minutes ago
    };
    localStorage.setItem("nestr.tracking", JSON.stringify(tracking));

    const { result } = renderHook(() => useTimeTracking(mockSetTasks));

    expect(result.current.activeTaskId).toBe("task-1");
    expect(elapsedMinutes).toHaveBeenCalledWith(
      tracking.startedAt,
      expect.any(Number)
    );
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("nestr.tracking", "invalid json");

    const { result } = renderHook(() => useTimeTracking(mockSetTasks));

    expect(result.current.activeTaskId).toBeNull();
  });

  it("start sets activeTaskId", () => {
    const { result } = renderHook(() => useTimeTracking(mockSetTasks));

    act(() => {
      result.current.start("task-1");
    });

    expect(result.current.activeTaskId).toBe("task-1");
  });

  it("start persists to localStorage", () => {
    const { result } = renderHook(() => useTimeTracking(mockSetTasks));

    act(() => {
      result.current.start("task-1");
    });

    const stored = localStorage.getItem("nestr.tracking");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.taskId).toBe("task-1");
    expect(parsed.startedAt).toBe(Date.now());
  });

  it("start calls startTracking on the task", () => {
    mockSetTasks.mockImplementation((fn) => fn([mockTask1, mockTask2]));

    const { result } = renderHook(() => useTimeTracking(mockSetTasks));

    act(() => {
      result.current.start("task-1");
    });

    expect(mockSetTasks).toHaveBeenCalled();
    expect(startTracking).toHaveBeenCalledWith(mockTask1);
  });

  it("stop clears activeTaskId", () => {
    const { result } = renderHook(() => useTimeTracking(mockSetTasks));

    act(() => {
      result.current.start("task-1");
    });

    expect(result.current.activeTaskId).toBe("task-1");

    act(() => {
      result.current.stop("done");
    });

    expect(result.current.activeTaskId).toBeNull();
  });

  it("stop removes localStorage entry", () => {
    const { result } = renderHook(() => useTimeTracking(mockSetTasks));

    act(() => {
      result.current.start("task-1");
    });

    expect(localStorage.getItem("nestr.tracking")).toBeTruthy();

    act(() => {
      result.current.stop("done");
    });

    expect(localStorage.getItem("nestr.tracking")).toBeNull();
  });

  it("stop calls stopTracking with correct outcome", () => {
    mockSetTasks.mockImplementation((fn) => fn([mockTask1]));

    const { result } = renderHook(() => useTimeTracking(mockSetTasks));

    act(() => {
      result.current.start("task-1");
    });

    act(() => {
      result.current.stop("cancelled");
    });

    expect(stopTracking).toHaveBeenCalledWith(mockTask1, 5, "cancelled");
  });

  it("stop does nothing when no active tracking", () => {
    const { result } = renderHook(() => useTimeTracking(mockSetTasks));

    act(() => {
      result.current.stop("done");
    });

    expect(mockSetTasks).not.toHaveBeenCalled();
    expect(stopTracking).not.toHaveBeenCalled();
  });

  it("start while active stops previous task with pending status", () => {
    mockSetTasks.mockImplementation((fn) => fn([mockTask1, mockTask2]));

    const { result } = renderHook(() => useTimeTracking(mockSetTasks));

    // Start first task
    act(() => {
      result.current.start("task-1");
    });

    vi.mocked(stopTracking).mockClear();
    vi.mocked(startTracking).mockClear();

    // Start second task
    act(() => {
      result.current.start("task-2");
    });

    expect(stopTracking).toHaveBeenCalledWith(mockTask1, 5, "pending");
    expect(startTracking).toHaveBeenCalledWith(mockTask2);
    expect(result.current.activeTaskId).toBe("task-2");
  });

  it("updates elapsed time every second", () => {
    let callCount = 0;
    vi.mocked(elapsedMinutes).mockImplementation(() => {
      callCount++;
      return callCount;
    });

    const { result } = renderHook(() => useTimeTracking(mockSetTasks));

    act(() => {
      result.current.start("task-1");
    });

    expect(result.current.elapsedMin).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.elapsedMin).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.elapsedMin).toBe(3);
  });

  it("clears interval when tracking stops", () => {
    const { result } = renderHook(() => useTimeTracking(mockSetTasks));

    act(() => {
      result.current.start("task-1");
    });

    act(() => {
      result.current.stop("done");
    });

    const countAfterStop = vi.mocked(elapsedMinutes).mock.calls.length;

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(vi.mocked(elapsedMinutes).mock.calls.length).toBe(countAfterStop);
  });

  it("calculates elapsed time correctly from startedAt", () => {
    vi.mocked(elapsedMinutes).mockReturnValue(10);

    const tracking = {
      taskId: "task-1",
      startedAt: Date.now() - 600000, // 10 minutes ago
    };
    localStorage.setItem("nestr.tracking", JSON.stringify(tracking));

    const { result } = renderHook(() => useTimeTracking(mockSetTasks));

    expect(elapsedMinutes).toHaveBeenCalledWith(
      tracking.startedAt,
      expect.any(Number)
    );
    expect(result.current.elapsedMin).toBe(10);
  });
});
