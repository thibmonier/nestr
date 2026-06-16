import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppHeader } from "./AppHeader.js";
import type { Theme } from "../lib/theme.js";

vi.mock("../lib/format.js", () => ({
  todayISO: vi.fn(() => "2026-07-01"),
}));

const defaultProps = {
  showCalendar: false,
  onToggleCalendar: vi.fn(),
  selectedDate: "2026-07-01",
  planScope: "jour" as const,
  onPlanScopeChange: vi.fn(),
  pendingCount: 5,
  busy: null as null | "estimate" | "plan",
  aiConfigured: true,
  onEstimate: vi.fn(),
  onPlan: vi.fn(),
  theme: "light" as Theme,
  onToggleTheme: vi.fn(),
  onOpenSettings: vi.fn(),
};

describe("AppHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Nestr logo and title", () => {
    render(<AppHeader {...defaultProps} />);
    expect(screen.getByText("Nestr")).toBeInTheDocument();
    expect(screen.getByAltText("")).toBeInTheDocument(); // Logo image
  });

  it("displays selected date label for today", () => {
    render(<AppHeader {...defaultProps} selectedDate="2026-07-01" />);
    // Format: "Mardi 1 juillet · ton plan du jour"
    expect(screen.getByText(/ton plan du jour/)).toBeInTheDocument();
  });

  it("displays selected date label for other day", () => {
    render(<AppHeader {...defaultProps} selectedDate="2026-07-02" />);
    // Should say "plan de ce jour" instead of "ton plan du jour"
    expect(screen.getByText(/plan de ce jour/)).toBeInTheDocument();
  });

  it("calls onToggleCalendar when calendar button clicked", async () => {
    const user = userEvent.setup();
    const onToggleCalendar = vi.fn();
    render(<AppHeader {...defaultProps} onToggleCalendar={onToggleCalendar} />);

    const calendarButton = screen.getByLabelText("Afficher le calendrier");
    await user.click(calendarButton);

    expect(onToggleCalendar).toHaveBeenCalledOnce();
  });

  it("shows active state on calendar button when calendar is shown", () => {
    render(<AppHeader {...defaultProps} showCalendar={true} />);

    const calendarButton = screen.getByLabelText("Masquer le calendrier");
    expect(calendarButton).toBeInTheDocument();
    expect(calendarButton).toHaveStyle({ background: "var(--accent-soft)" });
  });

  it("renders segmented control with jour/semaine options", () => {
    render(<AppHeader {...defaultProps} />);

    expect(screen.getByRole("tab", { name: "Jour" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Semaine" })).toBeInTheDocument();
  });

  it("calls onPlanScopeChange when scope changed", async () => {
    const user = userEvent.setup();
    const onPlanScopeChange = vi.fn();
    render(<AppHeader {...defaultProps} onPlanScopeChange={onPlanScopeChange} />);

    const semaineTab = screen.getByRole("tab", { name: "Semaine" });
    await user.click(semaineTab);

    expect(onPlanScopeChange).toHaveBeenCalledWith("semaine");
  });

  it("disables estimate button when no pending tasks", () => {
    render(<AppHeader {...defaultProps} pendingCount={0} />);

    const estimateButton = screen.getByRole("button", { name: "Estimer (IA)" });
    expect(estimateButton).toBeDisabled();
  });

  it("disables estimate button when AI not configured", () => {
    render(<AppHeader {...defaultProps} aiConfigured={false} />);

    const estimateButton = screen.getByRole("button", { name: "Estimer (IA)" });
    expect(estimateButton).toBeDisabled();
  });

  it("disables estimate button when busy", () => {
    render(<AppHeader {...defaultProps} busy="plan" />);

    const estimateButton = screen.getByRole("button", { name: "Estimer (IA)" });
    expect(estimateButton).toBeDisabled();
  });

  it("shows 'Estimation…' text when busy estimating", () => {
    render(<AppHeader {...defaultProps} busy="estimate" />);

    expect(screen.getByRole("button", { name: "Estimation…" })).toBeInTheDocument();
  });

  it("calls onEstimate when estimate button clicked", async () => {
    const user = userEvent.setup();
    const onEstimate = vi.fn();
    render(<AppHeader {...defaultProps} onEstimate={onEstimate} />);

    const estimateButton = screen.getByRole("button", { name: "Estimer (IA)" });
    await user.click(estimateButton);

    expect(onEstimate).toHaveBeenCalledOnce();
  });

  it("disables plan button when no pending tasks", () => {
    render(<AppHeader {...defaultProps} pendingCount={0} />);

    const planButton = screen.getByRole("button", { name: /Planifier/ });
    expect(planButton).toBeDisabled();
  });

  it("disables plan button when busy", () => {
    render(<AppHeader {...defaultProps} busy="estimate" />);

    const planButton = screen.getByRole("button", { name: /Planifier/ });
    expect(planButton).toBeDisabled();
  });

  it("shows 'Planifier ma journée' text when scope is jour", () => {
    render(<AppHeader {...defaultProps} planScope="jour" />);

    expect(screen.getByRole("button", { name: /Planifier ma journée/ })).toBeInTheDocument();
  });

  it("shows 'Planifier ma semaine' text when scope is semaine", () => {
    render(<AppHeader {...defaultProps} planScope="semaine" />);

    expect(screen.getByRole("button", { name: /Planifier ma semaine/ })).toBeInTheDocument();
  });

  it("shows 'Planification…' text when busy planning", () => {
    render(<AppHeader {...defaultProps} busy="plan" />);

    expect(screen.getByRole("button", { name: /Planification…/ })).toBeInTheDocument();
  });

  it("calls onPlan when plan button clicked", async () => {
    const user = userEvent.setup();
    const onPlan = vi.fn();
    render(<AppHeader {...defaultProps} onPlan={onPlan} />);

    const planButton = screen.getByRole("button", { name: /Planifier ma journée/ });
    await user.click(planButton);

    expect(onPlan).toHaveBeenCalledOnce();
  });

  it("shows moon icon when theme is light", () => {
    render(<AppHeader {...defaultProps} theme="light" />);

    const themeButton = screen.getByLabelText("Passer en mode sombre");
    expect(themeButton).toBeInTheDocument();
  });

  it("shows sun icon when theme is dark", () => {
    render(<AppHeader {...defaultProps} theme="dark" />);

    const themeButton = screen.getByLabelText("Passer en mode clair");
    expect(themeButton).toBeInTheDocument();
  });

  it("calls onToggleTheme when theme button clicked", async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    render(<AppHeader {...defaultProps} onToggleTheme={onToggleTheme} />);

    const themeButton = screen.getByLabelText("Passer en mode sombre");
    await user.click(themeButton);

    expect(onToggleTheme).toHaveBeenCalledOnce();
  });

  it("disables settings button when busy", () => {
    render(<AppHeader {...defaultProps} busy="plan" />);

    const settingsButton = screen.getByLabelText("Réglages");
    expect(settingsButton).toBeDisabled();
  });

  it("calls onOpenSettings when settings button clicked", async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();
    render(<AppHeader {...defaultProps} onOpenSettings={onOpenSettings} />);

    const settingsButton = screen.getByLabelText("Réglages");
    await user.click(settingsButton);

    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
});
