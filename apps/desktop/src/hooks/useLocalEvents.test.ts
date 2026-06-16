import { renderHook, act } from "@testing-library/react";
import type { CalendarEvent } from "@nestr/core";
import { useLocalEvents } from "./useLocalEvents.js";
import { loadEvents, saveEvents } from "../lib/storage.js";

vi.mock("../lib/storage.js", () => ({
  loadEvents: vi.fn(),
  saveEvents: vi.fn(),
}));

describe("useLocalEvents", () => {
  const mockEvents: CalendarEvent[] = [
    {
      id: "event-1",
      title: "Meeting",
      start: "2026-06-15T10:00:00Z",
      end: "2026-06-15T11:00:00Z",
      location: null,
      calendarId: "cal-1",
    } as CalendarEvent,
    {
      id: "event-2",
      title: "Lunch",
      start: "2026-06-15T12:00:00Z",
      end: "2026-06-15T13:00:00Z",
      location: null,
      calendarId: "cal-1",
    } as CalendarEvent,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadEvents).mockReturnValue([]);
  });

  it("initializes with loadEvents result", () => {
    vi.mocked(loadEvents).mockReturnValue(mockEvents);
    const { result } = renderHook(() => useLocalEvents());

    expect(loadEvents).toHaveBeenCalledOnce();
    expect(result.current.events).toEqual(mockEvents);
  });

  it("initializes with empty array when loadEvents returns empty", () => {
    const { result } = renderHook(() => useLocalEvents());
    expect(result.current.events).toEqual([]);
  });

  it("addEvent appends to list", () => {
    vi.mocked(loadEvents).mockReturnValue(mockEvents);
    const { result } = renderHook(() => useLocalEvents());

    const newEvent = {
      id: "event-3",
      title: "Dinner",
      start: "2026-06-15T18:00:00Z",
      end: "2026-06-15T19:00:00Z",
    } as CalendarEvent;

    act(() => {
      result.current.addEvent(newEvent);
    });

    expect(result.current.events).toHaveLength(3);
    expect(result.current.events[2]).toEqual(newEvent);
  });

  it("removeEvent filters by id", () => {
    vi.mocked(loadEvents).mockReturnValue(mockEvents);
    const { result } = renderHook(() => useLocalEvents());

    act(() => {
      result.current.removeEvent("event-1");
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].id).toBe("event-2");
  });

  it("removeEvent does nothing if id not found", () => {
    vi.mocked(loadEvents).mockReturnValue(mockEvents);
    const { result } = renderHook(() => useLocalEvents());

    act(() => {
      result.current.removeEvent("non-existent");
    });

    expect(result.current.events).toHaveLength(2);
  });

  it("saveEvents called on state change after add", () => {
    vi.mocked(loadEvents).mockReturnValue(mockEvents);
    const { result } = renderHook(() => useLocalEvents());

    vi.mocked(saveEvents).mockClear();

    const newEvent = { id: "event-3", title: "Dinner" } as CalendarEvent;

    act(() => {
      result.current.addEvent(newEvent);
    });

    expect(saveEvents).toHaveBeenCalledWith([...mockEvents, newEvent]);
  });

  it("saveEvents called on initial mount", () => {
    vi.mocked(loadEvents).mockReturnValue(mockEvents);
    renderHook(() => useLocalEvents());
    expect(saveEvents).toHaveBeenCalledWith(mockEvents);
  });
});
