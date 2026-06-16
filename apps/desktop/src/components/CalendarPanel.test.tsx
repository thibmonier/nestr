import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarPanel } from "./CalendarPanel.js";
import type { CalendarEvent, PlanningPreferences } from "@nestr/core";

const mockFetchDayEvents = vi.fn();

vi.mock("../lib/calendars.js", () => ({
  fetchDayEvents: (...args: unknown[]) => mockFetchDayEvents(...args),
}));

vi.mock("../lib/format.js", () => ({
  hhmm: (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  todayISO: () => "2026-07-01",
}));

vi.mock("@nestr/core", async () => {
  const actual = await vi.importActual<typeof import("@nestr/core")>("@nestr/core");
  return {
    ...actual,
    navUrl: vi.fn((app: string, location: string) => `https://${app}.maps/?q=${encodeURIComponent(location)}`),
  };
});

const defaultPrefs: PlanningPreferences = {
  navApp: { desktop: "apple", mobile: "apple" },
  locations: { home: "123 Home St", office: "456 Office Ave" },
};

const defaultProps = {
  selectedDate: "2026-07-15",
  localEvents: [],
  prefs: defaultPrefs,
  onReserveTravel: vi.fn(),
  onSelectDate: vi.fn(),
  onClose: vi.fn(),
};

function createEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: Math.random().toString(),
    title: "Meeting",
    start: "2026-07-15T10:00:00Z",
    end: "2026-07-15T11:00:00Z",
    allDay: false,
    source: "google",
    ...overrides,
  };
}

describe("CalendarPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchDayEvents.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("Rendering", () => {
    it("renders calendar panel with navigation buttons", async () => {
      render(<CalendarPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText("Mois précédent")).toBeInTheDocument();
      });
      expect(screen.getByLabelText("Mois suivant")).toBeInTheDocument();
      expect(screen.getByLabelText("Fermer le calendrier")).toBeInTheDocument();
    });

    it("displays month and year label", async () => {
      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);
      await waitFor(() => {
        expect(screen.getByText(/juillet 2026/i)).toBeInTheDocument();
      });
    });

    it("renders weekday headers", async () => {
      render(<CalendarPanel {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getAllByText("L")).toHaveLength(1);
        expect(screen.getAllByText("M")).toHaveLength(2); // Mardi and Mercredi
        expect(screen.getAllByText("J")).toHaveLength(1);
        expect(screen.getAllByText("V")).toHaveLength(1);
        expect(screen.getAllByText("S")).toHaveLength(1);
        expect(screen.getAllByText("D")).toHaveLength(1);
      });
    });

    it("renders calendar grid with correct number of days", async () => {
      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);

      // July 2026 has 31 days
      await waitFor(() => {
        for (let day = 1; day <= 31; day++) {
          const button = screen.getByRole("button", { name: `2026-07-${String(day).padStart(2, "0")}` });
          expect(button).toBeInTheDocument();
        }
      });
    });

    it("highlights selected date", async () => {
      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);
      await waitFor(() => {
        const selectedButton = screen.getByRole("button", { name: "2026-07-15" });
        expect(selectedButton).toHaveStyle({ background: "var(--accent)" });
      });
    });

    it("highlights today's date with border", async () => {
      // Today is 2026-07-01 (mocked)
      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);
      await waitFor(() => {
        const todayButton = screen.getByRole("button", { name: "2026-07-01" });
        // Check that today has different styling than other non-selected dates
        const regularButton = screen.getByRole("button", { name: "2026-07-02" });
        expect(todayButton.style.border).not.toBe(regularButton.style.border);
      });
    });

    it("shows 'aujourd'hui' when selected date is today", async () => {
      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-01" />);
      await waitFor(() => {
        expect(screen.getByText(/aujourd'hui/)).toBeInTheDocument();
      });
    });

    it("shows formatted date when selected date is not today", async () => {
      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);
      await waitFor(() => {
        // The date should be formatted as "mardi 15 juillet" (weekday day month)
        const agendaHeading = screen.getByText(/Agenda —/);
        expect(agendaHeading).toBeInTheDocument();
        expect(agendaHeading.textContent).toMatch(/\d{1,2}\s+\w+/); // Contains day and month
      });
    });
  });

  describe("Month navigation", () => {
    it("navigates to previous month when left arrow clicked", async () => {
      const user = userEvent.setup();
      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);

      expect(screen.getByText(/juillet 2026/i)).toBeInTheDocument();

      const prevButton = screen.getByLabelText("Mois précédent");
      await user.click(prevButton);

      expect(screen.getByText(/juin 2026/i)).toBeInTheDocument();
    });

    it("navigates to next month when right arrow clicked", async () => {
      const user = userEvent.setup();
      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);

      expect(screen.getByText(/juillet 2026/i)).toBeInTheDocument();

      const nextButton = screen.getByLabelText("Mois suivant");
      await user.click(nextButton);

      expect(screen.getByText(/août 2026/i)).toBeInTheDocument();
    });

    it("handles year boundary when navigating to previous month", async () => {
      const user = userEvent.setup();
      render(<CalendarPanel {...defaultProps} selectedDate="2026-01-15" />);

      expect(screen.getByText(/janvier 2026/i)).toBeInTheDocument();

      const prevButton = screen.getByLabelText("Mois précédent");
      await user.click(prevButton);

      expect(screen.getByText(/décembre 2025/i)).toBeInTheDocument();
    });

    it("handles year boundary when navigating to next month", async () => {
      const user = userEvent.setup();
      render(<CalendarPanel {...defaultProps} selectedDate="2026-12-15" />);

      expect(screen.getByText(/décembre 2026/i)).toBeInTheDocument();

      const nextButton = screen.getByLabelText("Mois suivant");
      await user.click(nextButton);

      expect(screen.getByText(/janvier 2027/i)).toBeInTheDocument();
    });
  });

  describe("Date selection", () => {
    it("calls onSelectDate when a date is clicked", async () => {
      const user = userEvent.setup();
      const onSelectDate = vi.fn();
      render(<CalendarPanel {...defaultProps} onSelectDate={onSelectDate} />);

      const dateButton = screen.getByRole("button", { name: "2026-07-20" });
      await user.click(dateButton);

      expect(onSelectDate).toHaveBeenCalledWith("2026-07-20");
    });

    it("calls onClose when close button clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<CalendarPanel {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText("Fermer le calendrier");
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Event loading", () => {
    it("fetches remote events for selected date", async () => {
      mockFetchDayEvents.mockClear();
      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);

      await waitFor(() => {
        expect(mockFetchDayEvents).toHaveBeenCalled();
      });

      // Verify the call was made with ISO timestamps for the date (may include timezone offset)
      const [start, end] = mockFetchDayEvents.mock.calls[0];
      expect(start).toMatch(/2026-07-1[45]/); // May be offset by timezone
      expect(end).toMatch(/2026-07-1[45]/);
    });

    it("shows loading state while fetching events", () => {
      mockFetchDayEvents.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<CalendarPanel {...defaultProps} />);

      expect(screen.getByText("Chargement…")).toBeInTheDocument();
    });

    it("shows 'Aucun événement' when no events", async () => {
      mockFetchDayEvents.mockResolvedValue([]);
      render(<CalendarPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Aucun événement.")).toBeInTheDocument();
      });
    });

    it("displays remote events after loading", async () => {
      const event = createEvent({
        title: "Team Meeting",
        start: "2026-07-15T14:00:00Z",
        end: "2026-07-15T15:00:00Z",
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);

      await waitFor(() => {
        expect(screen.getByText("Team Meeting")).toBeInTheDocument();
      });
    });

    it("handles fetch error gracefully", async () => {
      mockFetchDayEvents.mockRejectedValue(new Error("Network error"));
      render(<CalendarPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Aucun événement.")).toBeInTheDocument();
      });
    });

    it("refetches events when selected date changes", async () => {
      mockFetchDayEvents.mockClear();
      const { rerender } = render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);

      await waitFor(() => {
        expect(mockFetchDayEvents).toHaveBeenCalled();
      });

      const initialCallCount = mockFetchDayEvents.mock.calls.length;

      rerender(<CalendarPanel {...defaultProps} selectedDate="2026-07-20" />);

      await waitFor(() => {
        expect(mockFetchDayEvents.mock.calls.length).toBeGreaterThan(initialCallCount);
      });

      // Verify the latest call is for the new date (may include timezone offset)
      const lastCall = mockFetchDayEvents.mock.calls[mockFetchDayEvents.mock.calls.length - 1];
      expect(lastCall[0]).toMatch(/2026-07-(19|20)/);
      expect(lastCall[1]).toMatch(/2026-07-(20|21)/);
    });

    it("cancels in-flight fetch when component unmounts", async () => {
      const { unmount } = render(<CalendarPanel {...defaultProps} />);
      unmount();

      // Should not throw or cause issues when fetch completes
      await mockFetchDayEvents.mock.results[0]?.value;
    });
  });

  describe("Event merging", () => {
    it("merges local and remote events", async () => {
      const remoteEvent = createEvent({
        id: "remote-1",
        title: "Remote Event",
        start: "2026-07-15T10:00:00Z",
      });
      const localEvent = createEvent({
        id: "local-1",
        title: "Local Event",
        start: "2026-07-15T12:00:00Z",
      });

      mockFetchDayEvents.mockResolvedValue([remoteEvent]);

      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" localEvents={[localEvent]} />);

      await waitFor(() => {
        expect(screen.getByText("Remote Event")).toBeInTheDocument();
        expect(screen.getByText("Local Event")).toBeInTheDocument();
      });
    });

    it("filters local events to only show those on selected date", async () => {
      const localEvent1 = createEvent({
        id: "local-1",
        title: "Event on 15th",
        start: "2026-07-15T10:00:00Z",
      });
      const localEvent2 = createEvent({
        id: "local-2",
        title: "Event on 20th",
        start: "2026-07-20T10:00:00Z",
      });

      mockFetchDayEvents.mockResolvedValue([]);

      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" localEvents={[localEvent1, localEvent2]} />);

      await waitFor(() => {
        expect(screen.getByText("Event on 15th")).toBeInTheDocument();
        expect(screen.queryByText("Event on 20th")).not.toBeInTheDocument();
      });
    });

    it("sorts events by start time", async () => {
      const event1 = createEvent({ title: "Event A", start: "2026-07-15T14:00:00Z" });
      const event2 = createEvent({ title: "Event B", start: "2026-07-15T10:00:00Z" });
      const event3 = createEvent({ title: "Event C", start: "2026-07-15T12:00:00Z" });

      mockFetchDayEvents.mockResolvedValue([event1, event2, event3]);

      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);

      await waitFor(() => {
        const events = screen.getAllByText(/Event [ABC]/);
        expect(events[0]).toHaveTextContent("Event B");
        expect(events[1]).toHaveTextContent("Event C");
        expect(events[2]).toHaveTextContent("Event A");
      });
    });
  });

  describe("Event display", () => {
    it("shows event title and time range", async () => {
      const event = createEvent({
        title: "Team Meeting",
        start: "2026-07-15T14:00:00Z",
        end: "2026-07-15T15:30:00Z",
        allDay: false,
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);

      await waitFor(() => {
        expect(screen.getByText("Team Meeting")).toBeInTheDocument();
      }, { timeout: 2000 });

      // Verify time range is displayed (hhmm formats the times)
      const timeElements = screen.getAllByText(/\d{2}:\d{2}/);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it("shows 'Journée' for all-day events", async () => {
      const event = createEvent({
        title: "All Day Event",
        allDay: true,
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);

      await waitFor(() => {
        expect(screen.getByText("All Day Event")).toBeInTheDocument();
        expect(screen.getByText("Journée")).toBeInTheDocument();
      });
    });

    it("displays location when present", async () => {
      const event = createEvent({
        title: "Client Meeting",
        location: "123 Main St, Paris",
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);

      await waitFor(() => {
        expect(screen.getByText("123 Main St, Paris")).toBeInTheDocument();
      });
    });

    it("does not show location section when location is missing", async () => {
      const event = createEvent({
        title: "Virtual Meeting",
        location: undefined,
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);

      await waitFor(() => {
        expect(screen.getByText("Virtual Meeting")).toBeInTheDocument();
        expect(screen.queryByText("Itinéraire")).not.toBeInTheDocument();
      });
    });

    it("shows color dot based on event source", async () => {
      const googleEvent = createEvent({ source: "google" });
      const appleEvent = createEvent({ source: "apple" });
      const localEvent = createEvent({ source: "local" });

      mockFetchDayEvents.mockResolvedValue([googleEvent, appleEvent, localEvent]);

      const { container } = render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);

      await waitFor(() => {
        const dots = container.querySelectorAll("span[style*='border-radius']");
        expect(dots.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe("Travel actions", () => {
    it("shows itinéraire link when location present", async () => {
      const event = createEvent({
        title: "Meeting",
        location: "123 Main St",
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      render(<CalendarPanel {...defaultProps} />);

      await waitFor(() => {
        const link = screen.getByRole("link", { name: "Itinéraire" });
        expect(link).toHaveAttribute("href", "https://apple.maps/?q=123%20Main%20St");
      });
    });

    it("shows home travel button when home location configured", async () => {
      const event = createEvent({
        title: "Meeting",
        location: "Office",
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      render(<CalendarPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Trajet \(domicile\)/ })).toBeInTheDocument();
      });
    });

    it("shows office travel button when office location configured", async () => {
      const event = createEvent({
        title: "Meeting",
        location: "Client site",
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      render(<CalendarPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Trajet \(bureau\)/ })).toBeInTheDocument();
      });
    });

    it("does not show home travel button when home not configured", async () => {
      const event = createEvent({
        title: "Meeting",
        location: "Office",
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      const prefsNoHome = {
        ...defaultPrefs,
        locations: { office: "456 Office Ave" },
      };

      render(<CalendarPanel {...defaultProps} prefs={prefsNoHome} />);

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /Trajet \(domicile\)/ })).not.toBeInTheDocument();
      });
    });

    it("calls onReserveTravel with home origin when clicked", async () => {
      const user = userEvent.setup();
      const onReserveTravel = vi.fn().mockResolvedValue(undefined);
      const event = createEvent({
        title: "Meeting",
        location: "Office",
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      render(<CalendarPanel {...defaultProps} onReserveTravel={onReserveTravel} />);

      await waitFor(() => {
        expect(screen.getByText("Meeting")).toBeInTheDocument();
      });

      const homeButton = screen.getByRole("button", { name: /Trajet \(domicile\)/ });
      await user.click(homeButton);

      expect(onReserveTravel).toHaveBeenCalledWith(event, "home");
    });

    it("calls onReserveTravel with office origin when clicked", async () => {
      const user = userEvent.setup();
      const onReserveTravel = vi.fn().mockResolvedValue(undefined);
      const event = createEvent({
        title: "Meeting",
        location: "Client site",
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      render(<CalendarPanel {...defaultProps} onReserveTravel={onReserveTravel} />);

      await waitFor(() => {
        expect(screen.getByText("Meeting")).toBeInTheDocument();
      });

      const officeButton = screen.getByRole("button", { name: /Trajet \(bureau\)/ });
      await user.click(officeButton);

      expect(onReserveTravel).toHaveBeenCalledWith(event, "office");
    });

    it("disables travel buttons while reservation in progress", async () => {
      const user = userEvent.setup();
      const onReserveTravel = vi.fn(() => new Promise(() => {})); // Never resolves
      const event = createEvent({
        title: "Meeting",
        location: "Office",
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      render(<CalendarPanel {...defaultProps} onReserveTravel={onReserveTravel} />);

      await waitFor(() => {
        expect(screen.getByText("Meeting")).toBeInTheDocument();
      });

      const homeButton = screen.getByRole("button", { name: /Trajet \(domicile\)/ });
      const officeButton = screen.getByRole("button", { name: /Trajet \(bureau\)/ });

      await user.click(homeButton);

      // Both buttons should be disabled during reservation
      await waitFor(() => {
        expect(homeButton).toBeDisabled();
        expect(officeButton).toBeDisabled();
      });
    });

    it("shows ellipsis in button text while reservation in progress", async () => {
      const user = userEvent.setup();
      const onReserveTravel = vi.fn(() => new Promise(() => {})); // Never resolves
      const event = createEvent({
        title: "Meeting",
        location: "Office",
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      render(<CalendarPanel {...defaultProps} onReserveTravel={onReserveTravel} />);

      await waitFor(() => {
        expect(screen.getByText("Meeting")).toBeInTheDocument();
      });

      const homeButton = screen.getByRole("button", { name: /Trajet \(domicile\)/ });
      await user.click(homeButton);

      await waitFor(() => {
        expect(screen.getByText("…")).toBeInTheDocument();
      });
    });

    it("re-enables buttons after reservation completes", async () => {
      const user = userEvent.setup();
      const onReserveTravel = vi.fn().mockResolvedValue(undefined);
      const event = createEvent({
        title: "Meeting",
        location: "Office",
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      render(<CalendarPanel {...defaultProps} onReserveTravel={onReserveTravel} />);

      await waitFor(() => {
        expect(screen.getByText("Meeting")).toBeInTheDocument();
      });

      const homeButton = screen.getByRole("button", { name: /Trajet \(domicile\)/ });
      await user.click(homeButton);

      await waitFor(() => {
        expect(homeButton).not.toBeDisabled();
      });
    });
  });

  describe("Edge cases", () => {
    it("handles multiple events on same day", async () => {
      const events = [
        createEvent({ title: "Event 1", start: "2026-07-15T09:00:00Z" }),
        createEvent({ title: "Event 2", start: "2026-07-15T11:00:00Z" }),
        createEvent({ title: "Event 3", start: "2026-07-15T14:00:00Z" }),
      ];
      mockFetchDayEvents.mockResolvedValue(events);

      render(<CalendarPanel {...defaultProps} selectedDate="2026-07-15" />);

      await waitFor(() => {
        expect(screen.getByText("Event 1")).toBeInTheDocument();
        expect(screen.getByText("Event 2")).toBeInTheDocument();
        expect(screen.getByText("Event 3")).toBeInTheDocument();
      });
    });

    it("handles empty string location as no location", async () => {
      const event = createEvent({
        title: "Meeting",
        location: "",
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      render(<CalendarPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Meeting")).toBeInTheDocument();
        expect(screen.queryByText("Itinéraire")).not.toBeInTheDocument();
      });
    });

    it("handles trimmed empty locations", async () => {
      const event = createEvent({
        title: "Meeting",
        location: "   ",
      });
      mockFetchDayEvents.mockResolvedValue([event]);

      const prefsWithTrimmedHome = {
        ...defaultPrefs,
        locations: { home: "   ", office: "Office" },
      };

      render(<CalendarPanel {...defaultProps} prefs={prefsWithTrimmedHome} />);

      await waitFor(() => {
        expect(screen.getByText("Meeting")).toBeInTheDocument();
        // No home button because home is whitespace
        expect(screen.queryByRole("button", { name: /Trajet \(domicile\)/ })).not.toBeInTheDocument();
      });
    });
  });
});
