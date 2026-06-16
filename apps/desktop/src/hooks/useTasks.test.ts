import { renderHook, act } from "@testing-library/react";
import { useTasks } from "./useTasks.js";
import type { Task } from "@nestr/core";

// Mock storage and format modules
vi.mock("../lib/storage.js", () => ({
  loadTasks: vi.fn(() => []),
  saveTasks: vi.fn(),
}));

vi.mock("../lib/format.js", () => ({
  todayISO: vi.fn(() => "2026-06-15"),
}));

import { loadTasks, saveTasks } from "../lib/storage.js";
import { todayISO } from "../lib/format.js";

describe("useTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with loadTasks() result", () => {
    const mockTasks: Task[] = [
      {
        id: "1",
        title: "Test task",
        status: "todo",
        priority: "normal",
        createdAt: "2026-06-15T10:00:00Z",
      },
    ];
    vi.mocked(loadTasks).mockReturnValue(mockTasks);

    const { result } = renderHook(() => useTasks());

    expect(loadTasks).toHaveBeenCalledOnce();
    expect(result.current.tasks).toEqual(mockTasks);
  });

  it("saveTask adds new task", () => {
    vi.mocked(loadTasks).mockReturnValue([]);
    const { result } = renderHook(() => useTasks());

    const newTask: Task = {
      id: "2",
      title: "New task",
      status: "todo",
      priority: "normal",
      createdAt: "2026-06-15T11:00:00Z",
    };

    act(() => {
      result.current.saveTask(newTask);
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0]).toEqual(newTask);
  });

  it("saveTask updates existing task (by id)", () => {
    const existingTask: Task = {
      id: "3",
      title: "Original",
      status: "todo",
      priority: "normal",
      createdAt: "2026-06-15T10:00:00Z",
    };
    vi.mocked(loadTasks).mockReturnValue([existingTask]);
    const { result } = renderHook(() => useTasks());

    const updatedTask: Task = {
      ...existingTask,
      title: "Updated",
    };

    act(() => {
      result.current.saveTask(updatedTask);
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe("Updated");
  });

  it("toggle switches status between todo and done", () => {
    const task: Task = {
      id: "4",
      title: "Task to toggle",
      status: "todo",
      priority: "normal",
      createdAt: "2026-06-15T10:00:00Z",
    };
    vi.mocked(loadTasks).mockReturnValue([task]);
    const { result } = renderHook(() => useTasks());

    act(() => {
      result.current.toggle("4");
    });

    expect(result.current.tasks[0].status).toBe("done");
  });

  it("toggle switches back from done to todo", () => {
    const task: Task = {
      id: "5",
      title: "Done task",
      status: "done",
      priority: "normal",
      createdAt: "2026-06-15T10:00:00Z",
    };
    vi.mocked(loadTasks).mockReturnValue([task]);
    const { result } = renderHook(() => useTasks());

    act(() => {
      result.current.toggle("5");
    });

    expect(result.current.tasks[0].status).toBe("todo");
  });

  it("remove deletes task by id", () => {
    const tasks: Task[] = [
      {
        id: "6",
        title: "Task 1",
        status: "todo",
        priority: "normal",
        createdAt: "2026-06-15T10:00:00Z",
      },
      {
        id: "7",
        title: "Task 2",
        status: "todo",
        priority: "normal",
        createdAt: "2026-06-15T10:00:00Z",
      },
    ];
    vi.mocked(loadTasks).mockReturnValue(tasks);
    const { result } = renderHook(() => useTasks());

    act(() => {
      result.current.remove("6");
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe("7");
  });

  it("pending filters out done tasks", () => {
    const tasks: Task[] = [
      {
        id: "8",
        title: "Todo",
        status: "todo",
        priority: "normal",
        createdAt: "2026-06-15T10:00:00Z",
      },
      {
        id: "9",
        title: "Done",
        status: "done",
        priority: "normal",
        createdAt: "2026-06-15T10:00:00Z",
      },
      {
        id: "10",
        title: "Another todo",
        status: "todo",
        priority: "normal",
        createdAt: "2026-06-15T10:00:00Z",
      },
    ];
    vi.mocked(loadTasks).mockReturnValue(tasks);
    const { result } = renderHook(() => useTasks());

    expect(result.current.pending).toHaveLength(2);
    expect(result.current.pending.every((t) => t.status !== "done")).toBe(true);
  });

  it("allTags computes sorted unique tags", () => {
    const tasks: Task[] = [
      {
        id: "11",
        title: "Task 1",
        status: "todo",
        priority: "normal",
        createdAt: "2026-06-15T10:00:00Z",
        tags: ["work", "urgent"],
      },
      {
        id: "12",
        title: "Task 2",
        status: "todo",
        priority: "normal",
        createdAt: "2026-06-15T10:00:00Z",
        tags: ["personal", "urgent"],
      },
      {
        id: "13",
        title: "Task 3",
        status: "todo",
        priority: "normal",
        createdAt: "2026-06-15T10:00:00Z",
        tags: ["work"],
      },
    ];
    vi.mocked(loadTasks).mockReturnValue(tasks);
    const { result } = renderHook(() => useTasks());

    expect(result.current.allTags).toEqual(["personal", "urgent", "work"]);
  });

  it("saveTasks is called on state change (effect)", () => {
    vi.mocked(loadTasks).mockReturnValue([]);
    const { result } = renderHook(() => useTasks());

    const newTask: Task = {
      id: "14",
      title: "Trigger save",
      status: "todo",
      priority: "normal",
      createdAt: "2026-06-15T10:00:00Z",
    };

    // Clear the initial saveTasks call from the first render
    vi.mocked(saveTasks).mockClear();

    act(() => {
      result.current.saveTask(newTask);
    });

    // Effect should trigger saveTasks
    expect(saveTasks).toHaveBeenCalledWith([newTask]);
  });

  it("defer moves task to tomorrow", () => {
    const task: Task = {
      id: "15",
      title: "Defer me",
      status: "todo",
      priority: "normal",
      createdAt: "2026-06-15T10:00:00Z",
    };
    vi.mocked(loadTasks).mockReturnValue([task]);
    vi.mocked(todayISO).mockReturnValue("2026-06-15");

    const { result } = renderHook(() => useTasks());

    act(() => {
      result.current.defer("15");
    });

    // Should defer to 2026-06-16 (tomorrow)
    expect(result.current.tasks[0].deferredTo).toBe("2026-06-16");
  });

  it("deferLater moves task 7 days ahead", () => {
    const task: Task = {
      id: "16",
      title: "Defer later",
      status: "todo",
      priority: "normal",
      createdAt: "2026-06-15T10:00:00Z",
    };
    vi.mocked(loadTasks).mockReturnValue([task]);
    vi.mocked(todayISO).mockReturnValue("2026-06-15");

    const { result } = renderHook(() => useTasks());

    act(() => {
      result.current.deferLater("16");
    });

    // Should defer to 2026-06-22 (+7 days)
    expect(result.current.tasks[0].deferredTo).toBe("2026-06-22");
  });
});
