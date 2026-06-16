import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickAdd } from "./QuickAdd.js";
import type { ParsedEntry } from "@nestr/core";

vi.mock("../lib/format.js", () => ({
  todayISO: () => "2026-07-01",
}));

describe("QuickAdd", () => {
  const mockParsedEntry: ParsedEntry = {
    kind: "task",
    title: "Déjeuner avec Jean",
    date: "2026-07-02",
    start: "12:00",
    end: "13:00",
    location: "LAB Nantes",
    people: ["Jean"],
    context: "pro",
    mode: null,
  };

  it("renders input and button", () => {
    const onParse = vi.fn();
    const onConfirm = vi.fn();

    render(
      <QuickAdd aiConfigured={true} onParse={onParse} onConfirm={onConfirm} />
    );

    expect(screen.getByPlaceholderText(/Ex. déjeuner mardi avec Jean/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyser" })).toBeInTheDocument();
  });

  it("button is disabled when aiConfigured is false", () => {
    const onParse = vi.fn();
    const onConfirm = vi.fn();

    render(
      <QuickAdd aiConfigured={false} onParse={onParse} onConfirm={onConfirm} />
    );

    const button = screen.getByRole("button", { name: "Analyser" });
    expect(button).toBeDisabled();
    expect(screen.getByPlaceholderText(/Configure ta clé IA/)).toBeInTheDocument();
  });

  it("button is disabled when input is empty", () => {
    const onParse = vi.fn();
    const onConfirm = vi.fn();

    render(
      <QuickAdd aiConfigured={true} onParse={onParse} onConfirm={onConfirm} />
    );

    const button = screen.getByRole("button", { name: "Analyser" });
    expect(button).toBeDisabled();
  });

  it("shows 'Analyse…' while parsing", async () => {
    const user = userEvent.setup();
    const onParse = vi.fn(() => new Promise(() => {})); // Never resolves
    const onConfirm = vi.fn();

    render(
      <QuickAdd aiConfigured={true} onParse={onParse} onConfirm={onConfirm} />
    );

    const input = screen.getByPlaceholderText(/Ex. déjeuner mardi avec Jean/);
    await user.type(input, "déjeuner mardi avec Jean");

    const button = screen.getByRole("button", { name: "Analyser" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Analyse…" })).toBeInTheDocument();
    });
  });

  it("shows draft preview after successful parse", async () => {
    const user = userEvent.setup();
    const onParse = vi.fn().mockResolvedValue(mockParsedEntry);
    const onConfirm = vi.fn();

    render(
      <QuickAdd aiConfigured={true} onParse={onParse} onConfirm={onConfirm} />
    );

    const input = screen.getByPlaceholderText(/Ex. déjeuner mardi avec Jean/);
    await user.type(input, "déjeuner mardi avec Jean au LAB à Nantes");

    const button = screen.getByRole("button", { name: "Analyser" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("Aperçu")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Déjeuner avec Jean")).toBeInTheDocument();
      expect(screen.getByDisplayValue("2026-07-02")).toBeInTheDocument();
      expect(screen.getByDisplayValue("12:00")).toBeInTheDocument();
      expect(screen.getByDisplayValue("13:00")).toBeInTheDocument();
    });

    expect(onParse).toHaveBeenCalledWith("déjeuner mardi avec Jean au LAB à Nantes", "2026-07-01");
  });

  it("calls onConfirm when confirm button clicked", async () => {
    const user = userEvent.setup();
    const onParse = vi.fn().mockResolvedValue(mockParsedEntry);
    const onConfirm = vi.fn();

    render(
      <QuickAdd aiConfigured={true} onParse={onParse} onConfirm={onConfirm} />
    );

    const input = screen.getByPlaceholderText(/Ex. déjeuner mardi avec Jean/);
    await user.type(input, "déjeuner mardi avec Jean");

    const analyseButton = screen.getByRole("button", { name: "Analyser" });
    await user.click(analyseButton);

    await waitFor(() => {
      expect(screen.getByText("Aperçu")).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: "Ajouter la tâche" });
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith(mockParsedEntry);
  });

  it("clears draft and input after confirm", async () => {
    const user = userEvent.setup();
    const onParse = vi.fn().mockResolvedValue(mockParsedEntry);
    const onConfirm = vi.fn();

    render(
      <QuickAdd aiConfigured={true} onParse={onParse} onConfirm={onConfirm} />
    );

    const input = screen.getByPlaceholderText(/Ex. déjeuner mardi avec Jean/);
    await user.type(input, "déjeuner mardi avec Jean");

    const analyseButton = screen.getByRole("button", { name: "Analyser" });
    await user.click(analyseButton);

    await waitFor(() => {
      expect(screen.getByText("Aperçu")).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: "Ajouter la tâche" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText("Aperçu")).not.toBeInTheDocument();
    });

    expect(input).toHaveValue("");
  });

  it("shows error message when parse fails", async () => {
    const user = userEvent.setup();
    const onParse = vi.fn().mockRejectedValue(new Error("Parse error: invalid format"));
    const onConfirm = vi.fn();

    render(
      <QuickAdd aiConfigured={true} onParse={onParse} onConfirm={onConfirm} />
    );

    const input = screen.getByPlaceholderText(/Ex. déjeuner mardi avec Jean/);
    await user.type(input, "invalid text");

    const button = screen.getByRole("button", { name: "Analyser" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("Parse error: invalid format")).toBeInTheDocument();
    });

    expect(screen.queryByText("Aperçu")).not.toBeInTheDocument();
  });

  it("cancel button clears draft", async () => {
    const user = userEvent.setup();
    const onParse = vi.fn().mockResolvedValue(mockParsedEntry);
    const onConfirm = vi.fn();

    render(
      <QuickAdd aiConfigured={true} onParse={onParse} onConfirm={onConfirm} />
    );

    const input = screen.getByPlaceholderText(/Ex. déjeuner mardi avec Jean/);
    await user.type(input, "déjeuner mardi avec Jean");

    const analyseButton = screen.getByRole("button", { name: "Analyser" });
    await user.click(analyseButton);

    await waitFor(() => {
      expect(screen.getByText("Aperçu")).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole("button", { name: "Annuler" });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("Aperçu")).not.toBeInTheDocument();
    });

    expect(onConfirm).not.toHaveBeenCalled();
    // Input should still have value (only cleared on confirm)
    expect(input).toHaveValue("déjeuner mardi avec Jean");
  });
});
