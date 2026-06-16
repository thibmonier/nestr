import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncReminders, cancelReminders } from "./notifications.js";
import type { Reminder } from "@nestr/core";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => false),
}));

const mockSendNotification = vi.fn();
const mockIsPermissionGranted = vi.fn();
const mockRequestPermission = vi.fn();

vi.mock("@tauri-apps/plugin-notification", () => ({
  sendNotification: mockSendNotification,
  isPermissionGranted: mockIsPermissionGranted,
  requestPermission: mockRequestPermission,
}));

describe("notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("syncReminders (non-Tauri)", () => {
    beforeEach(async () => {
      const { isTauri } = await import("@tauri-apps/api/core");
      vi.mocked(isTauri).mockReturnValue(false);
    });

    it("does nothing when not in Tauri", async () => {
      const reminders: Reminder[] = [
        { fireAt: Date.now() + 5000, title: "Test", body: "Test body" },
      ];

      await syncReminders(reminders);

      expect(mockIsPermissionGranted).not.toHaveBeenCalled();
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  describe("syncReminders (Tauri)", () => {
    beforeEach(async () => {
      vi.resetModules();
      const { isTauri } = await import("@tauri-apps/api/core");
      vi.mocked(isTauri).mockReturnValue(true);
    });

    it("schedules notifications for future reminders", async () => {
      mockIsPermissionGranted.mockResolvedValue(true);

      const now = Date.now();
      const reminders: Reminder[] = [
        { fireAt: now + 5000, title: "Task 1", body: "In 5 seconds" },
        { fireAt: now + 10000, title: "Task 2", body: "In 10 seconds" },
      ];

      await syncReminders(reminders);

      expect(mockIsPermissionGranted).toHaveBeenCalledOnce();
      expect(mockSendNotification).not.toHaveBeenCalled();

      // Fast-forward 5 seconds
      await vi.advanceTimersByTimeAsync(5000);

      expect(mockSendNotification).toHaveBeenCalledWith({
        title: "Task 1",
        body: "In 5 seconds",
      });

      // Fast-forward another 5 seconds
      await vi.advanceTimersByTimeAsync(5000);

      expect(mockSendNotification).toHaveBeenCalledWith({
        title: "Task 2",
        body: "In 10 seconds",
      });
      expect(mockSendNotification).toHaveBeenCalledTimes(2);
    });

    it("skips reminders that are already past", async () => {
      mockIsPermissionGranted.mockResolvedValue(true);

      const now = Date.now();
      const reminders: Reminder[] = [
        { fireAt: now - 1000, title: "Past", body: "Already happened" },
        { fireAt: now + 5000, title: "Future", body: "Will happen" },
      ];

      await syncReminders(reminders);

      await vi.advanceTimersByTimeAsync(5000);

      expect(mockSendNotification).toHaveBeenCalledOnce();
      expect(mockSendNotification).toHaveBeenCalledWith({
        title: "Future",
        body: "Will happen",
      });
    });

    it("requests permission when not granted", async () => {
      mockIsPermissionGranted.mockResolvedValue(false);
      mockRequestPermission.mockResolvedValue("granted");

      const reminders: Reminder[] = [
        { fireAt: Date.now() + 5000, title: "Test", body: "Test body" },
      ];

      await syncReminders(reminders);

      expect(mockIsPermissionGranted).toHaveBeenCalledOnce();
      expect(mockRequestPermission).toHaveBeenCalledOnce();

      await vi.advanceTimersByTimeAsync(5000);

      expect(mockSendNotification).toHaveBeenCalledOnce();
    });

    it("does nothing when permission is denied", async () => {
      mockIsPermissionGranted.mockResolvedValue(false);
      mockRequestPermission.mockResolvedValue("denied");

      const reminders: Reminder[] = [
        { fireAt: Date.now() + 5000, title: "Test", body: "Test body" },
      ];

      await syncReminders(reminders);

      await vi.advanceTimersByTimeAsync(10000);

      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it("clears existing timers before scheduling new ones", async () => {
      mockIsPermissionGranted.mockResolvedValue(true);

      const reminders1: Reminder[] = [
        { fireAt: Date.now() + 5000, title: "First", body: "First set" },
      ];

      await syncReminders(reminders1);

      // Schedule new reminders before first one fires
      const reminders2: Reminder[] = [
        { fireAt: Date.now() + 3000, title: "Second", body: "Second set" },
      ];

      await syncReminders(reminders2);

      // Fast-forward past both times
      await vi.advanceTimersByTimeAsync(6000);

      // Only the second reminder should fire
      expect(mockSendNotification).toHaveBeenCalledOnce();
      expect(mockSendNotification).toHaveBeenCalledWith({
        title: "Second",
        body: "Second set",
      });
    });
  });

  describe("cancelReminders", () => {
    beforeEach(async () => {
      vi.resetModules();
      const { isTauri } = await import("@tauri-apps/api/core");
      vi.mocked(isTauri).mockReturnValue(true);
      mockIsPermissionGranted.mockResolvedValue(true);
    });

    it("cancels all pending reminders", async () => {
      const reminders: Reminder[] = [
        { fireAt: Date.now() + 5000, title: "Task 1", body: "Body 1" },
        { fireAt: Date.now() + 10000, title: "Task 2", body: "Body 2" },
      ];

      await syncReminders(reminders);

      cancelReminders();

      // Fast-forward past all times
      await vi.advanceTimersByTimeAsync(15000);

      // No notifications should have been sent
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it("can be called multiple times safely", () => {
      cancelReminders();
      cancelReminders();
      cancelReminders();

      // Should not throw
      expect(true).toBe(true);
    });
  });
});
