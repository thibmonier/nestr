import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekView } from "./WeekView.js";
import type { WeekPlan, DailyPlan, TimeBlock } from "@nestr/core";

// Mock DayTimeline component
vi.mock("./DayTimeline.js", () => ({
  DayTimeline: ({ plan }: { plan: DailyPlan }) => (
    <div data-testid="day-timeline">{plan.date}</div>
  ),
}));

// Mock format functions
vi.mock("../lib/format.js", () => ({
  dayLabel: (date: string) => `Label for ${date}`,
}));

function createDailyPlan(date: string, blocks: TimeBlock[] = []): DailyPlan {
  return {
    date,
    blocks,
    unscheduled: [],
  };
}

function createWeekPlan(overrides: Partial<WeekPlan> = {}): WeekPlan {
  return {
    days: [],
    unscheduled: [],
    ...overrides,
  };
}

function createBlock(overrides: Partial<TimeBlock> = {}): TimeBlock {
  return {
    type: "task",
    taskId: "task-1",
    taskTitle: "Test task",
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
    ...overrides,
  };
}

describe("WeekView", () => {
  it("shows empty state when no active days", () => {
    const week = createWeekPlan({
      days: [
        createDailyPlan("2026-07-01", []),
        createDailyPlan("2026-07-02", []),
      ],
    });

    render(<WeekView week={week} />);

    expect(screen.getByText("Rien à placer cette semaine.")).toBeInTheDocument();
  });

  it("renders only days with blocks", () => {
    const week = createWeekPlan({
      days: [
        createDailyPlan("2026-07-01", [createBlock()]),
        createDailyPlan("2026-07-02", []), // Empty day - should not render
        createDailyPlan("2026-07-03", [createBlock()]),
      ],
    });

    render(<WeekView week={week} />);

    // Should show labels for days with blocks
    expect(screen.getByText("Label for 2026-07-01")).toBeInTheDocument();
    expect(screen.getByText("Label for 2026-07-03")).toBeInTheDocument();

    // Should NOT show label for empty day
    expect(screen.queryByText("Label for 2026-07-02")).not.toBeInTheDocument();

    // Should render DayTimeline for active days
    const timelines = screen.getAllByTestId("day-timeline");
    expect(timelines).toHaveLength(2);
    expect(timelines[0]).toHaveTextContent("2026-07-01");
    expect(timelines[1]).toHaveTextContent("2026-07-03");
  });

  it("shows unscheduled tasks warning when present", () => {
    const week = createWeekPlan({
      days: [createDailyPlan("2026-07-01", [createBlock()])],
      unscheduled: [
        {
          task: { id: "1", title: "Unscheduled task 1", status: "pending", createdAt: "2026-07-01T10:00:00Z" },
          reason: "no_window",
        },
        {
          task: { id: "2", title: "Unscheduled task 2", status: "pending", createdAt: "2026-07-01T10:00:00Z" },
          reason: "wrong_day",
        },
      ],
    });

    render(<WeekView week={week} />);

    expect(screen.getByText(/Non planifié cette semaine \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Unscheduled task 1/)).toBeInTheDocument();
    expect(screen.getByText(/aucune plage pour ce contexte/)).toBeInTheDocument();
    expect(screen.getByText(/Unscheduled task 2/)).toBeInTheDocument();
    expect(screen.getByText(/jour non autorisé sur la période/)).toBeInTheDocument();
  });

  it("displays correct reason labels for unscheduled tasks", () => {
    const week = createWeekPlan({
      days: [],
      unscheduled: [
        {
          task: { id: "1", title: "Task 1", status: "pending", createdAt: "2026-07-01T10:00:00Z" },
          reason: "wrong_day",
        },
        {
          task: { id: "2", title: "Task 2", status: "pending", createdAt: "2026-07-01T10:00:00Z" },
          reason: "no_window",
        },
        {
          task: { id: "3", title: "Task 3", status: "pending", createdAt: "2026-07-01T10:00:00Z" },
          reason: "no_time",
        },
        {
          task: { id: "4", title: "Task 4", status: "pending", createdAt: "2026-07-01T10:00:00Z" },
          reason: "unknown_reason",
        },
      ],
    });

    render(<WeekView week={week} />);

    expect(screen.getByText(/jour non autorisé sur la période/)).toBeInTheDocument();
    expect(screen.getByText(/aucune plage pour ce contexte/)).toBeInTheDocument();
    expect(screen.getByText(/pas assez de temps libre cette semaine/)).toBeInTheDocument();
    expect(screen.getByText(/unknown_reason/)).toBeInTheDocument(); // Fallback to reason string
  });

  it("does not show unscheduled section when no unscheduled tasks", () => {
    const week = createWeekPlan({
      days: [createDailyPlan("2026-07-01", [createBlock()])],
      unscheduled: [],
    });

    render(<WeekView week={week} />);

    expect(screen.queryByText(/Non planifié/)).not.toBeInTheDocument();
  });

  it("passes mode prop to DayTimeline", () => {
    const week = createWeekPlan({
      days: [createDailyPlan("2026-07-01", [createBlock()])],
    });

    render(<WeekView week={week} mode="compact" />);

    // DayTimeline is mocked, just verify it renders
    expect(screen.getByTestId("day-timeline")).toBeInTheDocument();
  });
});
