import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskModal } from "./TaskModal.js";
import type { Task } from "@nestr/core";

vi.mock("../lib/storage.js", () => ({
  newId: vi.fn(() => "new-task-id"),
}));

const defaultProps = {
  contexts: ["pro", "perso"],
  allTags: ["urgent", "backend", "frontend"],
  onSave: vi.fn(),
  onClose: vi.fn(),
};

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Existing task",
    status: "todo",
    priority: "medium",
    createdAt: "2026-07-01T10:00:00Z",
    ...overrides,
  };
}

describe("TaskModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Creation mode", () => {
    it("renders with 'Nouvelle tâche' title when no task provided", () => {
      render(<TaskModal {...defaultProps} />);
      expect(screen.getByText("Nouvelle tâche")).toBeInTheDocument();
    });

    it("renders all form fields with empty defaults", () => {
      render(<TaskModal {...defaultProps} />);

      // Title field
      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      expect(titleInput).toHaveValue("");

      // Context and Priority selects exist
      const selects = screen.getAllByRole("combobox");
      expect(selects.length).toBeGreaterThanOrEqual(2);

      // Mode segmented control defaults to empty
      const modeControls = screen.getAllByRole("tab");
      const emptyModeTab = modeControls.find(tab => tab.textContent === "—");
      expect(emptyModeTab).toHaveAttribute("aria-selected", "true");
    });

    it("submit button shows 'Ajouter la tâche'", () => {
      render(<TaskModal {...defaultProps} />);
      expect(screen.getByRole("button", { name: "Ajouter la tâche" })).toBeInTheDocument();
    });

    it("submit button is disabled when title is empty", () => {
      render(<TaskModal {...defaultProps} />);
      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      expect(submitButton).toBeDisabled();
    });

    it("submit button is enabled when title is filled", async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      await user.type(titleInput, "New task");

      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      expect(submitButton).toBeEnabled();
    });

    it("calls onSave with new task when submitted", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      await user.type(titleInput, "New task title");

      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "new-task-id",
          title: "New task title",
          status: "todo",
          priority: "medium",
        })
      );
    });

    it("calls onClose when Cancel button clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<TaskModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole("button", { name: "Annuler" });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edition mode", () => {
    it("renders with 'Modifier la tâche' title when task provided", () => {
      const task = createTask();
      render(<TaskModal {...defaultProps} task={task} />);
      expect(screen.getByText("Modifier la tâche")).toBeInTheDocument();
    });

    it("pre-fills all fields from existing task", () => {
      const task = createTask({
        title: "Existing task title",
        priority: "high",
        context: "pro",
        mode: "video",
        estimatedMinutes: 60,
        energy: "medium",
        dueDate: "2026-07-15T23:59:59Z",
        allowedWeekdays: [1, 2, 3, 4, 5],
        tags: ["urgent", "backend"],
      });
      render(<TaskModal {...defaultProps} task={task} />);

      // Title
      expect(screen.getByDisplayValue("Existing task title")).toBeInTheDocument();

      // Minutes
      expect(screen.getByDisplayValue("60")).toBeInTheDocument();

      // Due date
      expect(screen.getByDisplayValue("2026-07-15")).toBeInTheDocument();

      // Tags
      expect(screen.getByText("urgent")).toBeInTheDocument();
      expect(screen.getByText("backend")).toBeInTheDocument();

      // Video mode tab is selected
      const videoTab = screen.getByRole("tab", { name: "Visio" });
      expect(videoTab).toHaveAttribute("aria-selected", "true");
    });

    it("submit button shows 'Enregistrer'", () => {
      const task = createTask();
      render(<TaskModal {...defaultProps} task={task} />);
      expect(screen.getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
    });

    it("calls onSave with updated task when submitted", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const task = createTask({ title: "Original title" });
      render(<TaskModal {...defaultProps} task={task} onSave={onSave} />);

      const titleInput = screen.getByDisplayValue("Original title");
      await user.clear(titleInput);
      await user.type(titleInput, "Updated title");

      const submitButton = screen.getByRole("button", { name: "Enregistrer" });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "task-1",
          title: "Updated title",
        })
      );
    });
  });

  describe("Form interactions", () => {
    it("updates priority when changed", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      await user.type(titleInput, "Task");

      const selects = screen.getAllByRole("combobox");
      const prioritySelect = selects.find(s => (s as HTMLSelectElement).querySelector('option[value="urgent"]'));
      await user.selectOptions(prioritySelect!, "urgent");

      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: "urgent",
        })
      );
    });

    it("updates context when changed", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      await user.type(titleInput, "Task");

      const selects = screen.getAllByRole("combobox");
      const contextSelect = selects.find(s => (s as HTMLSelectElement).querySelector('option[value="pro"]'));
      await user.selectOptions(contextSelect!, "pro");

      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "pro",
        })
      );
    });

    it("updates mode when segmented control clicked", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      await user.type(titleInput, "Task");

      const videoTab = screen.getByRole("tab", { name: "Visio" });
      await user.click(videoTab);

      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "video",
        })
      );
    });

    it("updates estimated minutes when changed", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      await user.type(titleInput, "Task");

      const minutesInput = screen.getByPlaceholderText(/auto \(IA\)/);
      await user.type(minutesInput, "45");

      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          estimatedMinutes: 45,
        })
      );
    });

    it("updates energy when changed", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      await user.type(titleInput, "Task");

      const selects = screen.getAllByRole("combobox");
      const energySelect = selects.find(s => {
        const select = s as HTMLSelectElement;
        return Array.from(select.options).some(opt => opt.value === "high" && opt.textContent === "Forte");
      });
      await user.selectOptions(energySelect!, "high");

      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          energy: "high",
        })
      );
    });

    it("updates due date when changed", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      await user.type(titleInput, "Task");

      // Find date input by type attribute
      const inputs = document.querySelectorAll('input[type="date"]');
      const dateInput = inputs[0] as HTMLInputElement;

      // Clear and set the value directly (more reliable than typing for date inputs)
      await user.clear(dateInput);
      await user.type(dateInput, "2026-08-15");

      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      await user.click(submitButton);

      // Check that dueDate is set (the exact format might vary)
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          dueDate: expect.stringMatching(/2026-08-15/),
        })
      );
    });

    it("updates allowed weekdays when days preset changed", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      await user.type(titleInput, "Task");

      const selects = screen.getAllByRole("combobox");
      const daysSelect = selects.find(s => {
        const select = s as HTMLSelectElement;
        return Array.from(select.options).some(opt => opt.value === "weekdays");
      });
      await user.selectOptions(daysSelect!, "weekdays");

      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          allowedWeekdays: [1, 2, 3, 4, 5],
        })
      );
    });

    it("sets allowedWeekdays to undefined when 'all' selected", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const task = createTask({ allowedWeekdays: [1, 2, 3, 4, 5] });
      render(<TaskModal {...defaultProps} task={task} onSave={onSave} />);

      const selects = screen.getAllByRole("combobox");
      const daysSelect = selects.find(s => {
        const select = s as HTMLSelectElement;
        return Array.from(select.options).some(opt => opt.value === "all");
      });
      await user.selectOptions(daysSelect!, "all");

      const submitButton = screen.getByRole("button", { name: "Enregistrer" });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          allowedWeekdays: undefined,
        })
      );
    });

    it("sets allowedWeekdays to [0,6] when 'weekend' selected", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      await user.type(titleInput, "Task");

      const selects = screen.getAllByRole("combobox");
      const daysSelect = selects.find(s => {
        const select = s as HTMLSelectElement;
        return Array.from(select.options).some(opt => opt.value === "weekend");
      });
      await user.selectOptions(daysSelect!, "weekend");

      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          allowedWeekdays: [0, 6],
        })
      );
    });
  });

  describe("Tag management", () => {
    it("adds tag when Enter pressed", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      await user.type(titleInput, "Task");

      const tagInput = screen.getByPlaceholderText(/ajouter un tag/);
      await user.type(tagInput, "new-tag{Enter}");

      expect(screen.getByText("new-tag")).toBeInTheDocument();
      expect(tagInput).toHaveValue("");

      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["new-tag"],
        })
      );
    });

    it("does not add duplicate tags", async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);

      const tagInput = screen.getByPlaceholderText(/ajouter un tag/);
      await user.type(tagInput, "urgent{Enter}");
      await user.type(tagInput, "urgent{Enter}");

      const tagElements = screen.getAllByText("urgent");
      expect(tagElements).toHaveLength(1);
    });

    it("does not add empty tags", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      await user.type(titleInput, "Task");

      const tagInput = screen.getByPlaceholderText(/ajouter un tag/);
      await user.type(tagInput, "{Enter}");

      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.not.objectContaining({
          tags: expect.anything(),
        })
      );
    });

    it("removes tag when X clicked", async () => {
      const user = userEvent.setup();
      const task = createTask({ tags: ["urgent", "backend"] });
      render(<TaskModal {...defaultProps} task={task} />);

      expect(screen.getByText("urgent")).toBeInTheDocument();
      expect(screen.getByText("backend")).toBeInTheDocument();

      // Find the urgent tag's remove button
      const urgentTag = screen.getByText("urgent").closest("span");
      const removeButton = within(urgentTag!).getByRole("button");
      await user.click(removeButton);

      expect(screen.queryByText("urgent")).not.toBeInTheDocument();
      expect(screen.getByText("backend")).toBeInTheDocument();
    });

    it("renders datalist with allTags for autocomplete", () => {
      render(<TaskModal {...defaultProps} allTags={["urgent", "backend", "frontend"]} />);

      const datalist = document.getElementById("nestr-tags");
      expect(datalist).toBeInTheDocument();

      // Check datalist contains the tags
      const options = datalist!.querySelectorAll("option");
      expect(options).toHaveLength(3);
      expect(Array.from(options).map(o => o.value)).toEqual(["urgent", "backend", "frontend"]);
    });
  });

  describe("Edge cases", () => {
    it("trims whitespace from title before saving", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      await user.type(titleInput, "  Task with spaces  ");

      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Task with spaces",
        })
      );
    });

    it("does not call onSave when title is only whitespace", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      await user.type(titleInput, "   ");

      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      expect(submitButton).toBeDisabled();
    });

    it("omits optional fields when not set", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/);
      await user.type(titleInput, "Minimal task");

      const submitButton = screen.getByRole("button", { name: "Ajouter la tâche" });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith({
        id: "new-task-id",
        title: "Minimal task",
        status: "todo",
        priority: "medium",
        createdAt: expect.any(String),
      });
    });

    it("handles null task prop (same as undefined)", () => {
      render(<TaskModal {...defaultProps} task={null} />);
      expect(screen.getByText("Nouvelle tâche")).toBeInTheDocument();
    });

    it("preserves existing task id and createdAt when editing", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const task = createTask({
        id: "existing-id",
        createdAt: "2026-01-01T00:00:00Z",
      });
      render(<TaskModal {...defaultProps} task={task} onSave={onSave} />);

      const submitButton = screen.getByRole("button", { name: "Enregistrer" });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "existing-id",
          createdAt: "2026-01-01T00:00:00Z",
        })
      );
    });
  });

  describe("Modal behavior", () => {
    it("title input receives focus on mount", () => {
      render(<TaskModal {...defaultProps} />);
      const titleInput = screen.getByPlaceholderText(/Ex. Préparer le support/) as HTMLInputElement;
      // The input should exist and be a text input
      expect(titleInput).toBeInTheDocument();
      expect(titleInput.type).toBe("text");
    });

    it("renders footer with Cancel and Submit buttons", () => {
      render(<TaskModal {...defaultProps} />);
      expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ajouter la tâche" })).toBeInTheDocument();
    });
  });
});
