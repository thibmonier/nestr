import { renderHook } from "@testing-library/react";
import { useReminders } from "./useReminders.js";
import { buildReminders, type DailyPlan } from "@nestr/core";
import { cancelReminders, syncReminders } from "../lib/notifications.js";

vi.mock("@nestr/core", () => ({
  buildReminders: vi.fn(() => []),
}));

vi.mock("../lib/notifications.js", () => ({
  syncReminders: vi.fn(),
  cancelReminders: vi.fn(),
}));

describe("useReminders", () => {
  const mockPlan: DailyPlan = {
    date: "2026-06-15",
    blocks: [],
    unscheduled: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncs reminders when plan is provided", () => {
    const reminders = [
      { fireAt: Date.now() + 10000, title: "Task 1", body: "In 10 min" },
    ];
    vi.mocked(buildReminders).mockReturnValue(reminders);

    renderHook(() => useReminders(mockPlan));

    expect(buildReminders).toHaveBeenCalledWith(mockPlan, {
      now: expect.any(Number),
      leadMinutes: 5,
    });
    expect(syncReminders).toHaveBeenCalledWith(reminders);
  });

  it("does not sync reminders when plan is null", () => {
    renderHook(() => useReminders(null));

    expect(buildReminders).not.toHaveBeenCalled();
    expect(syncReminders).not.toHaveBeenCalled();
  });

  it("cancels reminders on unmount", () => {
    const { unmount } = renderHook(() => useReminders(mockPlan));

    unmount();

    expect(cancelReminders).toHaveBeenCalledOnce();
  });

  it("cancels and resyncs reminders when plan changes", () => {
    const reminders1 = [
      { fireAt: Date.now() + 5000, title: "Task 1", body: "In 5 min" },
    ];
    const reminders2 = [
      { fireAt: Date.now() + 15000, title: "Task 2", body: "In 15 min" },
    ];
    vi.mocked(buildReminders).mockReturnValueOnce(reminders1).mockReturnValueOnce(reminders2);

    const { rerender } = renderHook(({ plan }) => useReminders(plan), {
      initialProps: { plan: mockPlan },
    });

    expect(syncReminders).toHaveBeenCalledWith(reminders1);

    const updatedPlan: DailyPlan = {
      ...mockPlan,
      blocks: [{ id: "b1", taskId: "t1", start: "09:00", end: "10:00" }],
    };

    rerender({ plan: updatedPlan });

    // cancelReminders called once during rerender cleanup, then new reminders synced
    expect(cancelReminders).toHaveBeenCalledOnce();
    expect(syncReminders).toHaveBeenCalledWith(reminders2);
    expect(syncReminders).toHaveBeenCalledTimes(2);
  });
});
