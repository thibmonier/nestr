import { renderHook, waitFor } from "@testing-library/react";
import { useServerSync } from "./useServerSync.js";
import type { PlanningPreferences, Task } from "@nestr/core";
import { fetchMe, type MeStatus } from "../lib/auth.js";
import {
  pullPreferences,
  pullTasks,
  pushPreferences,
  pushTasks,
} from "../lib/sync.js";

vi.mock("../lib/auth.js", () => ({
  fetchMe: vi.fn(),
}));

vi.mock("../lib/sync.js", () => ({
  pullTasks: vi.fn(),
  pullPreferences: vi.fn(),
  pushTasks: vi.fn(),
  pushPreferences: vi.fn(),
}));

describe("useServerSync", () => {
  const mockTasks: Task[] = [
    {
      id: "t1",
      title: "Task 1",
      status: "todo",
      priority: "medium",
      createdAt: "2026-06-15T10:00:00Z",
    },
  ];

  const mockPrefs: PlanningPreferences = {
    breakBetweenTasksMin: 10,
    defaultTaskMinutes: 30,
    contexts: ["work"],
    availability: [],
  };

  const mockMe: MeStatus = {
    id: "user-1",
    email: "test@example.com",
    appleConnected: false,
    aiConfigured: false,
    aiProvider: null,
  };

  const defaultOpts = {
    loggedIn: false,
    tasks: [],
    setTasks: vi.fn(),
    prefs: mockPrefs,
    setPrefs: vi.fn(),
    setMe: vi.fn(),
    setError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when loggedIn is false", () => {
    renderHook(() => useServerSync(defaultOpts));

    expect(fetchMe).not.toHaveBeenCalled();
    expect(pullTasks).not.toHaveBeenCalled();
  });

  it("fetches user status and hydrates from server when logged in", async () => {
    const serverTasks: Task[] = [
      {
        id: "server-t1",
        title: "Server Task",
        status: "todo",
        priority: "high",
        createdAt: "2026-06-15T09:00:00Z",
      },
    ];
    const serverPrefs: PlanningPreferences = {
      ...mockPrefs,
      breakBetweenTasksMin: 15,
    };

    vi.mocked(fetchMe).mockResolvedValue(mockMe);
    vi.mocked(pullTasks).mockResolvedValue(serverTasks);
    vi.mocked(pullPreferences).mockResolvedValue(serverPrefs);

    renderHook(() =>
      useServerSync({
        ...defaultOpts,
        loggedIn: true,
      })
    );

    await waitFor(() => {
      expect(fetchMe).toHaveBeenCalledOnce();
    }, { timeout: 1000 });

    await waitFor(() => {
      expect(defaultOpts.setMe).toHaveBeenCalledWith(mockMe);
      expect(defaultOpts.setTasks).toHaveBeenCalledWith(serverTasks);
      expect(defaultOpts.setPrefs).toHaveBeenCalledWith(serverPrefs);
    }, { timeout: 1000 });
  });

  it("pushes local tasks to server when server has no tasks", async () => {
    vi.mocked(fetchMe).mockResolvedValue(mockMe);
    vi.mocked(pullTasks).mockResolvedValue([]);
    vi.mocked(pullPreferences).mockResolvedValue(null);
    vi.mocked(pushTasks).mockResolvedValue(undefined);
    vi.mocked(pushPreferences).mockResolvedValue(undefined);

    renderHook(() =>
      useServerSync({
        ...defaultOpts,
        loggedIn: true,
        tasks: mockTasks,
      })
    );

    await waitFor(() => {
      expect(pushTasks).toHaveBeenCalledWith(mockTasks);
      expect(pushPreferences).toHaveBeenCalledWith(mockPrefs);
    }, { timeout: 1000 });
  });

  it("does not push when server already has tasks", async () => {
    const serverTasks: Task[] = [
      {
        id: "server-t1",
        title: "Server Task",
        status: "done",
        priority: "low",
        createdAt: "2026-06-14T10:00:00Z",
      },
    ];

    vi.mocked(fetchMe).mockResolvedValue(mockMe);
    vi.mocked(pullTasks).mockResolvedValue(serverTasks);
    vi.mocked(pullPreferences).mockResolvedValue(mockPrefs);

    renderHook(() =>
      useServerSync({
        ...defaultOpts,
        loggedIn: true,
        tasks: mockTasks,
      })
    );

    await waitFor(() => {
      expect(defaultOpts.setTasks).toHaveBeenCalledWith(serverTasks);
    }, { timeout: 1000 });

    expect(pushTasks).not.toHaveBeenCalled();
  });

  it("sets error on hydration failure", async () => {
    vi.mocked(fetchMe).mockRejectedValue(new Error("Network error"));

    renderHook(() =>
      useServerSync({
        ...defaultOpts,
        loggedIn: true,
      })
    );

    await waitFor(() => {
      expect(defaultOpts.setError).toHaveBeenCalledWith("Network error");
    }, { timeout: 1000 });
  });

  it("debounces task pushes after hydration", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    vi.mocked(fetchMe).mockResolvedValue(mockMe);
    vi.mocked(pullTasks).mockResolvedValue(mockTasks);
    vi.mocked(pullPreferences).mockResolvedValue(mockPrefs);
    vi.mocked(pushTasks).mockResolvedValue(undefined);

    const updatedTasks = [
      ...mockTasks,
      {
        id: "t2",
        title: "Task 2",
        status: "todo",
        priority: "high",
        createdAt: "2026-06-15T11:00:00Z",
      },
    ];

    const { rerender } = renderHook(({ tasks }) => useServerSync({ ...defaultOpts, loggedIn: true, tasks }), {
      initialProps: { tasks: mockTasks },
    });

    // Wait for hydration promises to resolve
    await waitFor(() => expect(defaultOpts.setMe).toHaveBeenCalled());

    vi.clearAllMocks();

    // Update tasks
    rerender({ tasks: updatedTasks });

    // Should not push immediately
    expect(pushTasks).not.toHaveBeenCalled();

    // Fast-forward just past the debounce delay
    vi.advanceTimersByTime(801);

    // Wait for the push call to happen
    await waitFor(() => expect(pushTasks).toHaveBeenCalledWith(updatedTasks));

    vi.useRealTimers();
  }, 10000);

  it("debounces preference pushes after hydration", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    vi.mocked(fetchMe).mockResolvedValue(mockMe);
    vi.mocked(pullTasks).mockResolvedValue([]);
    vi.mocked(pullPreferences).mockResolvedValue(mockPrefs);
    vi.mocked(pushPreferences).mockResolvedValue(undefined);

    const updatedPrefs: PlanningPreferences = {
      ...mockPrefs,
      breakBetweenTasksMin: 20,
    };

    const { rerender } = renderHook(({ prefs }) => useServerSync({ ...defaultOpts, loggedIn: true, prefs }), {
      initialProps: { prefs: mockPrefs },
    });

    // Wait for hydration
    await waitFor(() => expect(defaultOpts.setMe).toHaveBeenCalled());

    vi.clearAllMocks();

    // Update prefs
    rerender({ prefs: updatedPrefs });

    // Should not push immediately
    expect(pushPreferences).not.toHaveBeenCalled();

    // Fast-forward past debounce
    vi.advanceTimersByTime(801);

    // Wait for push call
    await waitFor(() => expect(pushPreferences).toHaveBeenCalledWith(updatedPrefs));

    vi.useRealTimers();
  }, 10000);

  it("does not push if logged out before hydration completes", async () => {
    let resolveHydration: (value: MeStatus) => void;
    const hydrationPromise = new Promise<MeStatus>((resolve) => {
      resolveHydration = resolve;
    });

    vi.mocked(fetchMe).mockReturnValue(hydrationPromise);

    const { rerender } = renderHook(({ loggedIn }) => useServerSync({ ...defaultOpts, loggedIn }), {
      initialProps: { loggedIn: true },
    });

    // Log out before hydration completes
    rerender({ loggedIn: false });

    // Complete hydration
    resolveHydration!(mockMe);

    // Wait for any pending promises to resolve
    await new Promise((resolve) => setTimeout(resolve, 10));

    // setMe should not be called because the user logged out
    expect(defaultOpts.setMe).not.toHaveBeenCalled();
  });

  it("clears debounce timers on unmount", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    vi.mocked(fetchMe).mockResolvedValue(mockMe);
    vi.mocked(pullTasks).mockResolvedValue(mockTasks);
    vi.mocked(pullPreferences).mockResolvedValue(mockPrefs);
    vi.mocked(pushTasks).mockResolvedValue(undefined);

    const { unmount, rerender } = renderHook(
      ({ tasks }) => useServerSync({ ...defaultOpts, loggedIn: true, tasks }),
      { initialProps: { tasks: mockTasks } }
    );

    // Wait for hydration
    await waitFor(() => expect(defaultOpts.setMe).toHaveBeenCalled());

    vi.clearAllMocks();

    // Update tasks to trigger debounce
    const updatedTasks = [...mockTasks, { id: "t2", title: "Task 2", status: "todo", priority: "medium", createdAt: "2026-06-15T11:00:00Z" }];
    rerender({ tasks: updatedTasks });

    // Unmount before debounce fires
    unmount();

    // Fast-forward past debounce
    vi.advanceTimersByTime(1000);

    // Should not have pushed because unmount cleared the timer
    expect(pushTasks).not.toHaveBeenCalled();

    vi.useRealTimers();
  }, 10000);
});
