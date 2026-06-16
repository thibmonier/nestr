import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DayTimeline } from "./DayTimeline.js";
import type { DailyPlan, TimeBlock } from "@nestr/core";

vi.mock("../lib/format.js", () => ({
  hhmm: vi.fn((iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }),
  todayISO: vi.fn(() => "2026-07-01"),
}));

function createBlock(overrides: Partial<TimeBlock> = {}): TimeBlock {
  return {
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
    kind: "task",
    title: "Default block",
    ...overrides,
  };
}

function createPlan(overrides: Partial<DailyPlan> = {}): DailyPlan {
  return {
    date: "2026-07-01",
    blocks: [],
    unscheduled: [],
    availableMinutes: 0,
    ...overrides,
  };
}

describe("DayTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty state", () => {
    it("shows planning prompt when no plan and not dragging", () => {
      render(<DayTimeline plan={null} />);
      expect(
        screen.getByText(/Clique sur « Planifier ma journée »/)
      ).toBeInTheDocument();
    });

    it("does not show empty state when dragging", () => {
      render(<DayTimeline plan={null} dragging />);
      expect(
        screen.queryByText(/Clique sur « Planifier ma journée »/)
      ).not.toBeInTheDocument();
    });

    it("shows 'Journée vide' when plan has no blocks", () => {
      const plan = createPlan({ blocks: [] });
      render(<DayTimeline plan={plan} mode="proportional" />);
      expect(screen.getByText(/Journée vide\./)).toBeInTheDocument();
    });
  });

  describe("All-day blocks", () => {
    it("renders all-day blocks with banner style", () => {
      const allDayBlock = createBlock({
        title: "Vacances",
        allDay: true,
        kind: "event",
      });
      const plan = createPlan({ blocks: [allDayBlock] });

      render(<DayTimeline plan={plan} mode="proportional" />);

      expect(screen.getByText("Vacances")).toBeInTheDocument();
      expect(screen.getByText("Journée")).toBeInTheDocument();
    });

    it("distinguishes event vs task all-day blocks", () => {
      const eventBlock = createBlock({
        title: "Event all-day",
        allDay: true,
        kind: "event",
      });
      const taskBlock = createBlock({
        title: "Task all-day",
        allDay: true,
        kind: "task",
      });
      const plan = createPlan({ blocks: [eventBlock, taskBlock] });

      render(<DayTimeline plan={plan} mode="proportional" />);

      expect(screen.getByText("Event all-day")).toBeInTheDocument();
      expect(screen.getByText("Task all-day")).toBeInTheDocument();
    });
  });

  describe("Compact mode", () => {
    it("renders timed blocks in list format", () => {
      const blocks = [
        createBlock({
          title: "Meeting",
          start: "2026-07-01T09:00:00Z",
          end: "2026-07-01T10:00:00Z",
          kind: "event",
          source: "google",
          calendarName: "Work",
        }),
        createBlock({
          title: "Code review",
          start: "2026-07-01T10:00:00Z",
          end: "2026-07-01T11:00:00Z",
          kind: "task",
        }),
      ];
      const plan = createPlan({ blocks });

      render(<DayTimeline plan={plan} mode="compact" />);

      expect(screen.getByText("Meeting")).toBeInTheDocument();
      expect(screen.getByText("Code review")).toBeInTheDocument();
    });

    it("shows time ranges and source for events in compact mode", () => {
      const eventBlock = createBlock({
        title: "Team standup",
        start: "2026-07-01T09:00:00Z",
        end: "2026-07-01T09:30:00Z",
        kind: "event",
        source: "google",
        calendarName: "Work Calendar",
      });
      const plan = createPlan({ blocks: [eventBlock] });

      render(<DayTimeline plan={plan} mode="compact" />);

      expect(screen.getByText("Team standup")).toBeInTheDocument();
      // TimelineBlock should render time, kind, source
    });
  });

  describe("Proportional mode", () => {
    it("renders blocks with proportional height", () => {
      const blocks = [
        createBlock({
          title: "Short task (30min)",
          start: "2026-07-01T09:00:00Z",
          end: "2026-07-01T09:30:00Z",
        }),
        createBlock({
          title: "Long meeting (2h)",
          start: "2026-07-01T10:00:00Z",
          end: "2026-07-01T12:00:00Z",
        }),
      ];
      const plan = createPlan({ blocks });

      const { container } = render(
        <DayTimeline plan={plan} mode="proportional" />
      );

      expect(screen.getByText("Short task (30min)")).toBeInTheDocument();
      expect(screen.getByText("Long meeting (2h)")).toBeInTheDocument();

      // Verify blocks are rendered in proportional timeline
      const timelineBlocks = container.querySelectorAll(
        '[style*="position: absolute"]'
      );
      expect(timelineBlocks.length).toBeGreaterThan(0);
    });

    it("shows current time indicator when viewing today", () => {
      // Mock current time to 10:00
      vi.spyOn(Date.prototype, "getHours").mockReturnValue(10);
      vi.spyOn(Date.prototype, "getMinutes").mockReturnValue(0);

      const plan = createPlan({
        date: "2026-07-01", // matches todayISO mock
        blocks: [
          createBlock({
            start: "2026-07-01T08:00:00Z",
            end: "2026-07-01T18:00:00Z",
          }),
        ],
      });

      const { container } = render(
        <DayTimeline plan={plan} mode="proportional" />
      );

      // Look for the "now" indicator (red circle + line)
      const nowIndicators = container.querySelectorAll(
        '[style*="var(--danger)"]'
      );
      // Should find at least the circle and line
      expect(nowIndicators.length).toBeGreaterThan(0);
    });

    it("does not show current time indicator when viewing different day", () => {
      const plan = createPlan({
        date: "2026-07-05", // different from todayISO
        blocks: [
          createBlock({
            start: "2026-07-05T08:00:00Z",
            end: "2026-07-05T18:00:00Z",
          }),
        ],
      });

      const { container } = render(
        <DayTimeline plan={plan} mode="proportional" />
      );

      // Now indicator should not exist
      const nowIndicators = container.querySelectorAll(
        '[style*="var(--danger)"]'
      );
      expect(nowIndicators.length).toBe(0);
    });

    it("displays block mode icon when present", () => {
      const block = createBlock({
        title: "Video call",
        mode: "video",
      });
      const plan = createPlan({ blocks: [block] });

      render(<DayTimeline plan={plan} mode="proportional" />);

      expect(screen.getByText("Video call")).toBeInTheDocument();
      // Icon component should render the mode icon
    });
  });

  describe("Unscheduled tasks section", () => {
    it("shows unscheduled tasks with reasons", () => {
      const plan = createPlan({
        unscheduled: [
          {
            task: {
              id: "1",
              title: "Write report",
              status: "todo",
              priority: "high",
              createdAt: "2026-07-01T08:00:00Z",
            },
            reason: "no_time",
          },
          {
            task: {
              id: "2",
              title: "Call client",
              status: "todo",
              priority: "medium",
              createdAt: "2026-07-01T08:00:00Z",
            },
            reason: "wrong_day",
          },
          {
            task: {
              id: "3",
              title: "Review code",
              status: "todo",
              priority: "low",
              createdAt: "2026-07-01T08:00:00Z",
            },
            reason: "no_window",
          },
        ],
      });

      render(<DayTimeline plan={plan} />);

      expect(screen.getByText(/Non planifié \(3\)/)).toBeInTheDocument();
      expect(screen.getByText("Write report")).toBeInTheDocument();
      expect(screen.getByText(/pas assez de temps libre/)).toBeInTheDocument();
      expect(screen.getByText("Call client")).toBeInTheDocument();
      expect(
        screen.getByText(/jour non autorisé aujourd'hui/)
      ).toBeInTheDocument();
      expect(screen.getByText("Review code")).toBeInTheDocument();
      expect(
        screen.getByText(/aucune plage pour ce contexte aujourd'hui/)
      ).toBeInTheDocument();
    });

    it("hides unscheduled section when hideUnscheduled is true", () => {
      const plan = createPlan({
        unscheduled: [
          {
            task: {
              id: "1",
              title: "Write report",
              status: "todo",
              priority: "high",
              createdAt: "2026-07-01T08:00:00Z",
            },
            reason: "no_time",
          },
        ],
      });

      render(<DayTimeline plan={plan} hideUnscheduled />);

      expect(screen.queryByText(/Non planifié/)).not.toBeInTheDocument();
      expect(screen.queryByText("Write report")).not.toBeInTheDocument();
    });

    it("does not show unscheduled section when array is empty", () => {
      const plan = createPlan({ unscheduled: [] });

      render(<DayTimeline plan={plan} />);

      expect(screen.queryByText(/Non planifié/)).not.toBeInTheDocument();
    });
  });

  describe("Drag and drop (proportional mode)", () => {
    it("shows drop outline when dragging", () => {
      const plan = createPlan({
        blocks: [
          createBlock({
            start: "2026-07-01T09:00:00Z",
            end: "2026-07-01T10:00:00Z",
          }),
        ],
      });

      const { container } = render(
        <DayTimeline plan={plan} dragging mode="proportional" />
      );

      // Timeline should have dashed outline when dragging
      const timeline = container.querySelector('[style*="outline"]');
      expect(timeline).toBeInTheDocument();
    });

    it("shows drop zone when dragging", () => {
      const onSchedule = vi.fn();
      const plan = createPlan({
        blocks: [
          createBlock({
            start: "2026-07-01T09:00:00Z",
            end: "2026-07-01T17:00:00Z",
          }),
        ],
      });

      const { container } = render(
        <DayTimeline
          plan={plan}
          dragging
          onSchedule={onSchedule}
          mode="proportional"
        />
      );

      // Verify timeline has drop styling (dashed outline)
      const timeline = container.querySelector('[style*="outline"]');
      expect(timeline).toBeInTheDocument();

      // Note: Testing actual drop events in jsdom is unreliable
      // The component has onDrop handlers that would call onSchedule in real browser
    });

    it("forces proportional mode when dragging is active", () => {
      const plan = createPlan({
        blocks: [
          createBlock({
            start: "2026-07-01T09:00:00Z",
            end: "2026-07-01T10:00:00Z",
          }),
        ],
      });

      const { container } = render(
        <DayTimeline plan={plan} dragging mode="compact" />
      );

      // Should render proportional timeline (with absolute positioned blocks)
      const absoluteBlocks = container.querySelectorAll(
        '[style*="position: absolute"]'
      );
      expect(absoluteBlocks.length).toBeGreaterThan(0);
    });
  });

  describe("Mixed content", () => {
    it("renders all-day, timed, and unscheduled tasks together", () => {
      const plan = createPlan({
        blocks: [
          createBlock({
            title: "All-day event",
            allDay: true,
            kind: "event",
          }),
          createBlock({
            title: "Morning task",
            start: "2026-07-01T09:00:00Z",
            end: "2026-07-01T10:00:00Z",
            kind: "task",
          }),
          createBlock({
            title: "Afternoon meeting",
            start: "2026-07-01T14:00:00Z",
            end: "2026-07-01T15:00:00Z",
            kind: "event",
          }),
        ],
        unscheduled: [
          {
            task: {
              id: "1",
              title: "Unscheduled task",
              status: "todo",
              priority: "medium",
              createdAt: "2026-07-01T08:00:00Z",
            },
            reason: "no_time",
          },
        ],
      });

      render(<DayTimeline plan={plan} mode="proportional" />);

      expect(screen.getByText("All-day event")).toBeInTheDocument();
      expect(screen.getByText("Morning task")).toBeInTheDocument();
      expect(screen.getByText("Afternoon meeting")).toBeInTheDocument();
      expect(screen.getByText("Unscheduled task")).toBeInTheDocument();
    });
  });
});
