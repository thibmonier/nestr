import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BreakdownModal } from "./BreakdownModal.js";
import type { Task } from "@nestr/core";
import type { SubtaskProposal } from "../lib/ai.js";

// Mock Modal component
vi.mock("../design/components/feedback/Modal.js", () => ({
  Modal: ({ title, onClose, footer, children }: any) => (
    <div data-testid="modal">
      <div data-testid="modal-title">{title}</div>
      <button onClick={onClose}>Close</button>
      <div>{children}</div>
      <div data-testid="modal-footer">{footer}</div>
    </div>
  ),
}));

const mockTask: Task = {
  id: "task-1",
  title: "Implement feature",
  status: "pending",
  createdAt: "2026-07-01T10:00:00Z",
};

const mockProposals: SubtaskProposal[] = [
  { title: "Design UI", estimatedMinutes: 30 },
  { title: "Write code", estimatedMinutes: 60 },
  { title: "Write tests", estimatedMinutes: 45 },
];

describe("BreakdownModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal with title", () => {
    const onApply = vi.fn();
    const onCancel = vi.fn();

    render(
      <BreakdownModal
        task={mockTask}
        proposals={mockProposals}
        onApply={onApply}
        onCancel={onCancel}
      />
    );

    expect(screen.getByTestId("modal-title")).toHaveTextContent("Découper en sous-tâches");
  });

  it("displays task title in description", () => {
    const onApply = vi.fn();
    const onCancel = vi.fn();

    render(
      <BreakdownModal
        task={mockTask}
        proposals={mockProposals}
        onApply={onApply}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText(/Proposition de l'IA pour/)).toBeInTheDocument();
    expect(screen.getByText(/Implement feature/)).toBeInTheDocument();
  });

  it("renders all subtask proposals", () => {
    const onApply = vi.fn();
    const onCancel = vi.fn();

    render(
      <BreakdownModal
        task={mockTask}
        proposals={mockProposals}
        onApply={onApply}
        onCancel={onCancel}
      />
    );

    expect(screen.getByDisplayValue("Design UI")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Write code")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Write tests")).toBeInTheDocument();

    expect(screen.getByDisplayValue("30")).toBeInTheDocument();
    expect(screen.getByDisplayValue("60")).toBeInTheDocument();
    expect(screen.getByDisplayValue("45")).toBeInTheDocument();
  });

  it("displays total count and minutes in footer", () => {
    const onApply = vi.fn();
    const onCancel = vi.fn();

    render(
      <BreakdownModal
        task={mockTask}
        proposals={mockProposals}
        onApply={onApply}
        onCancel={onCancel}
      />
    );

    const footer = screen.getByTestId("modal-footer");
    expect(footer).toHaveTextContent("3 sous-tâches");
    expect(footer).toHaveTextContent("135 min au total");
  });

  it("allows editing subtask title", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onCancel = vi.fn();

    render(
      <BreakdownModal
        task={mockTask}
        proposals={mockProposals}
        onApply={onApply}
        onCancel={onCancel}
      />
    );

    const titleInput = screen.getByDisplayValue("Design UI");
    await user.clear(titleInput);
    await user.type(titleInput, "Design new UI");

    expect(screen.getByDisplayValue("Design new UI")).toBeInTheDocument();
  });

  it("allows editing subtask estimated minutes", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onCancel = vi.fn();

    render(
      <BreakdownModal
        task={mockTask}
        proposals={mockProposals}
        onApply={onApply}
        onCancel={onCancel}
      />
    );

    const minutesInput = screen.getByDisplayValue("30");
    await user.clear(minutesInput);
    await user.type(minutesInput, "50");

    expect(screen.getByDisplayValue("50")).toBeInTheDocument();

    // Total should update (was 135, now 155)
    const footer = screen.getByTestId("modal-footer");
    expect(footer).toHaveTextContent("155 min au total");
  });

  it("removes subtask when remove button clicked", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onCancel = vi.fn();

    render(
      <BreakdownModal
        task={mockTask}
        proposals={mockProposals}
        onApply={onApply}
        onCancel={onCancel}
      />
    );

    // Initially 3 subtasks
    expect(screen.getByDisplayValue("Design UI")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Write code")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Write tests")).toBeInTheDocument();

    // Remove first subtask
    const removeButtons = screen.getAllByLabelText("Retirer");
    await user.click(removeButtons[0]);

    // Now only 2 subtasks
    expect(screen.queryByDisplayValue("Design UI")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Write code")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Write tests")).toBeInTheDocument();

    // Total should update (was 135, now 105)
    const footer = screen.getByTestId("modal-footer");
    expect(footer).toHaveTextContent("2 sous-tâches");
    expect(footer).toHaveTextContent("105 min au total");
  });

  it("shows empty state when all subtasks removed", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onCancel = vi.fn();

    render(
      <BreakdownModal
        task={mockTask}
        proposals={[{ title: "Only one", estimatedMinutes: 30 }]}
        onApply={onApply}
        onCancel={onCancel}
      />
    );

    const removeButton = screen.getByLabelText("Retirer");
    await user.click(removeButton);

    expect(screen.getByText("Aucune sous-tâche.")).toBeInTheDocument();
  });

  it("disables apply button when no subtasks", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onCancel = vi.fn();

    render(
      <BreakdownModal
        task={mockTask}
        proposals={[{ title: "Only one", estimatedMinutes: 30 }]}
        onApply={onApply}
        onCancel={onCancel}
      />
    );

    const removeButton = screen.getByLabelText("Retirer");
    await user.click(removeButton);

    const applyButton = screen.getByRole("button", { name: "Remplacer par ces sous-tâches" });
    expect(applyButton).toBeDisabled();
  });

  it("calls onApply with current subtasks when apply button clicked", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onCancel = vi.fn();

    render(
      <BreakdownModal
        task={mockTask}
        proposals={mockProposals}
        onApply={onApply}
        onCancel={onCancel}
      />
    );

    const applyButton = screen.getByRole("button", { name: "Remplacer par ces sous-tâches" });
    await user.click(applyButton);

    expect(onApply).toHaveBeenCalledWith(mockProposals);
  });

  it("calls onApply with modified subtasks", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onCancel = vi.fn();

    render(
      <BreakdownModal
        task={mockTask}
        proposals={mockProposals}
        onApply={onApply}
        onCancel={onCancel}
      />
    );

    // Modify first subtask
    const titleInput = screen.getByDisplayValue("Design UI");
    await user.clear(titleInput);
    await user.type(titleInput, "Design new UI");

    const minutesInput = screen.getByDisplayValue("30");
    await user.clear(minutesInput);
    await user.type(minutesInput, "40");

    // Remove last subtask
    const removeButtons = screen.getAllByLabelText("Retirer");
    await user.click(removeButtons[2]);

    const applyButton = screen.getByRole("button", { name: "Remplacer par ces sous-tâches" });
    await user.click(applyButton);

    expect(onApply).toHaveBeenCalledWith([
      { title: "Design new UI", estimatedMinutes: 40 },
      { title: "Write code", estimatedMinutes: 60 },
    ]);
  });

  it("calls onCancel when modal close button clicked", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onCancel = vi.fn();

    render(
      <BreakdownModal
        task={mockTask}
        proposals={mockProposals}
        onApply={onApply}
        onCancel={onCancel}
      />
    );

    const closeButton = screen.getByRole("button", { name: "Close" });
    await user.click(closeButton);

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
