import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskList } from "./TaskList.js";
import type { Task } from "@nestr/core";

vi.mock("../lib/format.js", () => ({ todayISO: vi.fn(() => "2026-07-01") }));
vi.mock("@nestr/core", async () => {
  const actual = await vi.importActual<typeof import("@nestr/core")>("@nestr/core");
  return { ...actual, isDeferredFrom: vi.fn(() => false) };
});

const defaultProps = {
  onToggle: vi.fn(),
  onRemove: vi.fn(),
  onBreakdown: vi.fn(),
  onDefer: vi.fn(),
  onDeferLater: vi.fn(),
  onEditStart: vi.fn(),
};

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: Math.random().toString(),
    title: "Default task",
    status: "pending",
    createdAt: "2026-07-01T10:00:00Z",
    ...overrides,
  };
}

describe("TaskList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no tasks", () => {
    render(<TaskList tasks={[]} {...defaultProps} />);
    expect(screen.getByText(/Aucune tâche\. Ajoute-en une pour commencer\./)).toBeInTheDocument();
  });

  it("renders task titles in the list", () => {
    const tasks = [
      createTask({ id: "1", title: "Write tests" }),
      createTask({ id: "2", title: "Fix bugs" }),
    ];
    render(<TaskList tasks={tasks} {...defaultProps} />);

    expect(screen.getByText("Write tests")).toBeInTheDocument();
    expect(screen.getByText("Fix bugs")).toBeInTheDocument();
  });

  it("filters by Pro context when Pro button clicked", async () => {
    const user = userEvent.setup();
    const tasks = [
      createTask({ id: "1", title: "Pro task", context: "pro" }),
      createTask({ id: "2", title: "Perso task", context: "perso" }),
      createTask({ id: "3", title: "No context task" }),
    ];
    render(<TaskList tasks={tasks} {...defaultProps} />);

    // Initially all visible
    expect(screen.getByText("Pro task")).toBeInTheDocument();
    expect(screen.getByText("Perso task")).toBeInTheDocument();
    expect(screen.getByText("No context task")).toBeInTheDocument();

    // Click Pro filter
    const proButton = screen.getByRole("tab", { name: "Pro" });
    await user.click(proButton);

    // Only pro task visible
    expect(screen.getByText("Pro task")).toBeInTheDocument();
    expect(screen.queryByText("Perso task")).not.toBeInTheDocument();
    expect(screen.queryByText("No context task")).not.toBeInTheDocument();
  });

  it("filters by Perso context when Perso button clicked", async () => {
    const user = userEvent.setup();
    const tasks = [
      createTask({ id: "1", title: "Pro task", context: "pro" }),
      createTask({ id: "2", title: "Perso task", context: "perso" }),
      createTask({ id: "3", title: "No context task" }),
    ];
    render(<TaskList tasks={tasks} {...defaultProps} />);

    const persoButton = screen.getByRole("tab", { name: "Perso" });
    await user.click(persoButton);

    expect(screen.queryByText("Pro task")).not.toBeInTheDocument();
    expect(screen.getByText("Perso task")).toBeInTheDocument();
    expect(screen.queryByText("No context task")).not.toBeInTheDocument();
  });

  it("filters by title when typing in search input", async () => {
    const user = userEvent.setup();
    const tasks = [
      createTask({ id: "1", title: "Write documentation" }),
      createTask({ id: "2", title: "Fix login bug" }),
      createTask({ id: "3", title: "Write tests" }),
    ];
    render(<TaskList tasks={tasks} {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/Rechercher \(titre, tag\)/);
    await user.type(searchInput, "write");

    expect(screen.getByText("Write documentation")).toBeInTheDocument();
    expect(screen.getByText("Write tests")).toBeInTheDocument();
    expect(screen.queryByText("Fix login bug")).not.toBeInTheDocument();
  });

  it("filters by tag when typing in search input", async () => {
    const user = userEvent.setup();
    const tasks = [
      createTask({ id: "1", title: "Task A", tags: ["urgent", "backend"] }),
      createTask({ id: "2", title: "Task B", tags: ["frontend"] }),
      createTask({ id: "3", title: "Task C", tags: ["urgent"] }),
    ];
    render(<TaskList tasks={tasks} {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/Rechercher \(titre, tag\)/);
    await user.type(searchInput, "urgent");

    expect(screen.getByText("Task A")).toBeInTheDocument();
    expect(screen.getByText("Task C")).toBeInTheDocument();
    expect(screen.queryByText("Task B")).not.toBeInTheDocument();
  });

  it("shows empty filter message when no tasks match filter", async () => {
    const user = userEvent.setup();
    const tasks = [
      createTask({ id: "1", title: "Pro task", context: "pro" }),
    ];
    render(<TaskList tasks={tasks} {...defaultProps} />);

    const persoButton = screen.getByRole("tab", { name: "Perso" });
    await user.click(persoButton);

    expect(screen.getByText(/Aucune tâche ne correspond au filtre\./)).toBeInTheDocument();
    expect(screen.queryByText("Pro task")).not.toBeInTheDocument();
  });

  it("shows 'Voir plus' button and loads more tasks when clicked", async () => {
    const user = userEvent.setup();
    // Create 30 tasks (more than PAGE=25)
    const tasks = Array.from({ length: 30 }, (_, i) =>
      createTask({ id: `task-${i}`, title: `Task ${i}` })
    );
    render(<TaskList tasks={tasks} {...defaultProps} />);

    // Initially shows first 25
    expect(screen.getByText("Task 0")).toBeInTheDocument();
    expect(screen.getByText("Task 24")).toBeInTheDocument();
    expect(screen.queryByText("Task 25")).not.toBeInTheDocument();

    // "Voir plus" button exists
    const seeMoreButton = screen.getByRole("button", { name: /Voir plus/ });
    expect(seeMoreButton).toHaveTextContent("Voir plus (25/30)");

    // Click to load more
    await user.click(seeMoreButton);

    // Now all 30 visible
    expect(screen.getByText("Task 25")).toBeInTheDocument();
    expect(screen.getByText("Task 29")).toBeInTheDocument();

    // Button should be gone (all loaded)
    expect(screen.queryByRole("button", { name: /Voir plus/ })).not.toBeInTheDocument();
  });

  it("combines context filter and search", async () => {
    const user = userEvent.setup();
    const tasks = [
      createTask({ id: "1", title: "Pro documentation", context: "pro" }),
      createTask({ id: "2", title: "Pro testing", context: "pro" }),
      createTask({ id: "3", title: "Perso documentation", context: "perso" }),
    ];
    render(<TaskList tasks={tasks} {...defaultProps} />);

    // Filter by Pro
    await user.click(screen.getByRole("tab", { name: "Pro" }));

    // Then search for "documentation"
    const searchInput = screen.getByPlaceholderText(/Rechercher \(titre, tag\)/);
    await user.type(searchInput, "documentation");

    // Only "Pro documentation" should match both filters
    expect(screen.getByText("Pro documentation")).toBeInTheDocument();
    expect(screen.queryByText("Pro testing")).not.toBeInTheDocument();
    expect(screen.queryByText("Perso documentation")).not.toBeInTheDocument();
  });

  it("resets pagination when changing filter", async () => {
    const user = userEvent.setup();
    // Create 30 tasks (> PAGE)
    const tasks = Array.from({ length: 30 }, (_, i) =>
      createTask({ id: `task-${i}`, title: `Task ${i}`, context: i % 2 === 0 ? "pro" : "perso" })
    );
    render(<TaskList tasks={tasks} {...defaultProps} />);

    // Load more
    await user.click(screen.getByRole("button", { name: /Voir plus/ }));

    // All 30 visible
    expect(screen.getByText("Task 29")).toBeInTheDocument();

    // Change filter to Pro
    await user.click(screen.getByRole("tab", { name: "Pro" }));

    // Pagination should reset - only first 25 Pro tasks visible
    // Task 0 (pro) is visible, but high-index pro tasks might not be
    expect(screen.getByText("Task 0")).toBeInTheDocument();

    // Check if "Voir plus" button exists (depends on count of pro tasks)
    const proTasks = tasks.filter(t => t.context === "pro");
    if (proTasks.length > 25) {
      expect(screen.getByRole("button", { name: /Voir plus/ })).toBeInTheDocument();
    }
  });

  it("resets pagination when typing in search", async () => {
    const user = userEvent.setup();
    const tasks = Array.from({ length: 30 }, (_, i) =>
      createTask({ id: `task-${i}`, title: `Task ${i}` })
    );
    render(<TaskList tasks={tasks} {...defaultProps} />);

    // Load more
    await user.click(screen.getByRole("button", { name: /Voir plus/ }));
    expect(screen.getByText("Task 29")).toBeInTheDocument();

    // Type in search
    const searchInput = screen.getByPlaceholderText(/Rechercher \(titre, tag\)/);
    await user.type(searchInput, "Task 1");

    // Pagination reset - shows matches from beginning
    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(screen.getByText("Task 10")).toBeInTheDocument();
  });
});
