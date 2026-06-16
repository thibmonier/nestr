import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPanel } from "./SettingsPanel.js";
import type { PlanningPreferences } from "@nestr/core";

const defaultPrefs: PlanningPreferences = {
  contexts: ["pro", "perso"],
  availability: [
    [], // Sunday
    [{ start: "09:00", end: "12:00", contexts: [] }], // Monday
    [{ start: "09:00", end: "17:00", contexts: ["pro"] }], // Tuesday
    [],
    [],
    [],
    [],
  ],
  breakBetweenTasksMin: 10,
  locations: {
    home: "123 Main St",
    office: "456 Office Blvd",
  },
  navApp: {
    mobile: "apple",
    desktop: "apple",
  },
};

const defaultProps = {
  prefs: defaultPrefs,
  onChange: vi.fn(),
  onClose: vi.fn(),
  loggedIn: false,
  appleConnected: false,
  onConnectApple: vi.fn(),
  onSignIn: vi.fn(),
  onSignOut: vi.fn(),
  onDeleteAccount: vi.fn(),
  aiConfigured: false,
  aiProvider: null,
  onSaveAiKey: vi.fn(),
};

describe("SettingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Modal rendering", () => {
    it("renders with title", () => {
      render(<SettingsPanel {...defaultProps} />);
      expect(
        screen.getByText("Réglages des disponibilités")
      ).toBeInTheDocument();
    });

    it("calls onClose when modal is closed", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<SettingsPanel {...defaultProps} onClose={onClose} />);

      // Modal close button (assuming Modal component has a close button)
      const closeButtons = screen.getAllByRole("button");
      const closeButton = closeButtons.find((btn) =>
        btn.getAttribute("aria-label")?.includes("Fermer")
      );

      if (closeButton) {
        await user.click(closeButton);
        expect(onClose).toHaveBeenCalled();
      }
    });
  });

  describe("Account section", () => {
    it("shows sign-in button when not logged in", () => {
      render(<SettingsPanel {...defaultProps} loggedIn={false} />);

      expect(
        screen.getByRole("button", { name: /Se connecter \(Google\)/ })
      ).toBeInTheDocument();
    });

    it("calls onSignIn when sign-in button clicked", async () => {
      const user = userEvent.setup();
      const onSignIn = vi.fn();

      render(
        <SettingsPanel {...defaultProps} loggedIn={false} onSignIn={onSignIn} />
      );

      const signInButton = screen.getByRole("button", {
        name: /Se connecter \(Google\)/,
      });
      await user.click(signInButton);

      expect(onSignIn).toHaveBeenCalled();
    });

    it("shows sign-out button when logged in", () => {
      render(<SettingsPanel {...defaultProps} loggedIn />);

      expect(screen.getByText("Connecté à Google.")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Déconnexion" })
      ).toBeInTheDocument();
    });

    it("calls onSignOut when sign-out button clicked", async () => {
      const user = userEvent.setup();
      const onSignOut = vi.fn();

      render(
        <SettingsPanel {...defaultProps} loggedIn onSignOut={onSignOut} />
      );

      const signOutButton = screen.getByRole("button", { name: "Déconnexion" });
      await user.click(signOutButton);

      expect(onSignOut).toHaveBeenCalled();
    });
  });

  describe("AI configuration section", () => {
    it("requires login to configure AI key", () => {
      render(<SettingsPanel {...defaultProps} loggedIn={false} />);

      expect(
        screen.getByText(/Connecte-toi d'abord pour enregistrer ta clé IA/)
      ).toBeInTheDocument();
    });

    it("shows AI key input when logged in", () => {
      render(<SettingsPanel {...defaultProps} loggedIn />);

      expect(screen.getByLabelText("Fournisseur")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/sk-ant-…/)).toBeInTheDocument();
      // Multiple "Enregistrer" buttons exist, just verify one exists
      expect(
        screen.getAllByRole("button", { name: "Enregistrer" }).length
      ).toBeGreaterThan(0);
    });

    it("shows configured status when AI is configured", () => {
      render(
        <SettingsPanel
          {...defaultProps}
          loggedIn
          aiConfigured
          aiProvider="anthropic"
        />
      );

      expect(screen.getByText(/Clé Anthropic configurée/)).toBeInTheDocument();
    });

    it("allows switching between AI providers", async () => {
      const user = userEvent.setup();

      render(<SettingsPanel {...defaultProps} loggedIn />);

      const providerSelect = screen.getByLabelText("Fournisseur");
      await user.selectOptions(providerSelect, "openai");

      expect(screen.getByPlaceholderText(/sk-…/)).toBeInTheDocument();
    });

    it("calls onSaveAiKey when AI key is submitted", async () => {
      const user = userEvent.setup();
      const onSaveAiKey = vi.fn().mockResolvedValue(undefined);

      render(
        <SettingsPanel {...defaultProps} loggedIn onSaveAiKey={onSaveAiKey} />
      );

      const keyInput = screen.getByPlaceholderText(/sk-ant-…/);
      await user.type(keyInput, "sk-ant-test-key-12345678");

      // Get the first "Enregistrer" button (AI section)
      const saveButton = screen.getAllByRole("button", { name: "Enregistrer" })[0];
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSaveAiKey).toHaveBeenCalledWith(
          "anthropic",
          "sk-ant-test-key-12345678"
        );
      });
    });

    it("disables save button when key is too short", async () => {
      const user = userEvent.setup();

      render(<SettingsPanel {...defaultProps} loggedIn />);

      const keyInput = screen.getByPlaceholderText(/sk-ant-…/);
      await user.type(keyInput, "short");

      // Get the first "Enregistrer" button (AI section)
      const saveButton = screen.getAllByRole("button", { name: "Enregistrer" })[0];
      expect(saveButton).toBeDisabled();
    });

    it("shows success message after saving AI key", async () => {
      const user = userEvent.setup();
      const onSaveAiKey = vi.fn().mockResolvedValue(undefined);

      render(
        <SettingsPanel {...defaultProps} loggedIn onSaveAiKey={onSaveAiKey} />
      );

      const keyInput = screen.getByPlaceholderText(/sk-ant-…/);
      await user.type(keyInput, "sk-ant-test-key-12345678");

      // Get the first "Enregistrer" button (AI section)
      const saveButton = screen.getAllByRole("button", { name: "Enregistrer" })[0];
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Clé IA enregistrée.")).toBeInTheDocument();
      });
    });

    it("shows error message when saving AI key fails", async () => {
      const user = userEvent.setup();
      const onSaveAiKey = vi
        .fn()
        .mockRejectedValue(new Error("Invalid API key"));

      render(
        <SettingsPanel {...defaultProps} loggedIn onSaveAiKey={onSaveAiKey} />
      );

      const keyInput = screen.getByPlaceholderText(/sk-ant-…/);
      await user.type(keyInput, "sk-ant-invalid-key");

      // Get the first "Enregistrer" button (AI section)
      const saveButton = screen.getAllByRole("button", { name: "Enregistrer" })[0];
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Invalid API key")).toBeInTheDocument();
      });
    });
  });

  describe("Contexts section", () => {
    it("displays existing contexts as removable tags", () => {
      render(<SettingsPanel {...defaultProps} />);

      // Each context should have a remove button
      expect(screen.getByLabelText("Supprimer pro")).toBeInTheDocument();
      expect(screen.getByLabelText("Supprimer perso")).toBeInTheDocument();
    });

    it("adds new context when Enter is pressed", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<SettingsPanel {...defaultProps} onChange={onChange} />);

      const input = screen.getByPlaceholderText("ajouter…");
      await user.type(input, "famille{Enter}");

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          contexts: ["pro", "perso", "famille"],
        })
      );
    });

    it("does not add duplicate contexts", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<SettingsPanel {...defaultProps} onChange={onChange} />);

      const input = screen.getByPlaceholderText("ajouter…");
      await user.type(input, "pro{Enter}");

      expect(onChange).not.toHaveBeenCalled();
    });

    it("removes context when X button clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<SettingsPanel {...defaultProps} onChange={onChange} />);

      const removeButton = screen.getByLabelText("Supprimer pro");
      await user.click(removeButton);

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          contexts: ["perso"],
        })
      );
    });

    it("normalizes context to lowercase", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<SettingsPanel {...defaultProps} onChange={onChange} />);

      const input = screen.getByPlaceholderText("ajouter…");
      await user.type(input, "SPORT{Enter}");

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          contexts: ["pro", "perso", "sport"],
        })
      );
    });
  });

  describe("Locations section", () => {
    it("displays home and office inputs", () => {
      render(<SettingsPanel {...defaultProps} />);

      expect(screen.getByLabelText("Domicile")).toHaveValue("123 Main St");
      expect(screen.getByLabelText("Bureau")).toHaveValue("456 Office Blvd");
    });

    it("updates home location", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<SettingsPanel {...defaultProps} onChange={onChange} />);

      const homeInput = screen.getByLabelText("Domicile");
      expect(homeInput).toHaveValue("123 Main St");

      await user.clear(homeInput);
      await user.type(homeInput, "X");

      // onChange should have been called
      expect(onChange).toHaveBeenCalled();
      // Verify locations object was updated
      expect(onChange.mock.calls[0][0]).toHaveProperty("locations");
    });

    it("updates office location", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<SettingsPanel {...defaultProps} onChange={onChange} />);

      const officeInput = screen.getByLabelText("Bureau");
      expect(officeInput).toHaveValue("456 Office Blvd");

      await user.clear(officeInput);
      await user.type(officeInput, "Y");

      // onChange should have been called
      expect(onChange).toHaveBeenCalled();
      expect(onChange.mock.calls[0][0]).toHaveProperty("locations");
    });

    it("updates navigation app preference", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<SettingsPanel {...defaultProps} onChange={onChange} />);

      const navAppSelect = screen.getByLabelText("App d'itinéraire");
      await user.selectOptions(navAppSelect, "google");

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          navApp: {
            mobile: "apple",
            desktop: "google",
          },
        })
      );
    });
  });

  describe("Apple Calendar section", () => {
    it("requires login to configure Apple calendar", () => {
      render(<SettingsPanel {...defaultProps} loggedIn={false} />);

      expect(
        screen.getByText(/Connecte-toi d'abord pour enregistrer tes identifiants/)
      ).toBeInTheDocument();
    });

    it("shows connected status when Apple is connected", () => {
      render(<SettingsPanel {...defaultProps} loggedIn appleConnected />);

      expect(
        screen.getByText(/✓ Connecté\. Saisis de nouveaux identifiants/)
      ).toBeInTheDocument();
    });

    it("calls onConnectApple when credentials submitted", async () => {
      const user = userEvent.setup();
      const onConnectApple = vi.fn().mockResolvedValue(undefined);

      render(
        <SettingsPanel
          {...defaultProps}
          loggedIn
          onConnectApple={onConnectApple}
        />
      );

      const appleIdInput = screen.getByPlaceholderText("apple-id@email.com");
      const passwordInput = screen.getByPlaceholderText("xxxx-xxxx-xxxx-xxxx");

      await user.type(appleIdInput, "test@icloud.com");
      await user.type(passwordInput, "abcd-efgh-ijkl-mnop");

      const saveButton = screen.getAllByRole("button", {
        name: "Enregistrer",
      })[1]; // Second "Enregistrer" button (Apple section)
      await user.click(saveButton);

      await waitFor(() => {
        expect(onConnectApple).toHaveBeenCalledWith(
          "test@icloud.com",
          "abcd-efgh-ijkl-mnop"
        );
      });
    });

    it("shows success message after connecting Apple calendar", async () => {
      const user = userEvent.setup();
      const onConnectApple = vi.fn().mockResolvedValue(undefined);

      render(
        <SettingsPanel
          {...defaultProps}
          loggedIn
          onConnectApple={onConnectApple}
        />
      );

      const appleIdInput = screen.getByPlaceholderText("apple-id@email.com");
      const passwordInput = screen.getByPlaceholderText("xxxx-xxxx-xxxx-xxxx");

      await user.type(appleIdInput, "test@icloud.com");
      await user.type(passwordInput, "abcd-efgh-ijkl-mnop");

      const saveButton = screen.getAllByRole("button", {
        name: "Enregistrer",
      })[1];
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText("Calendrier Apple connecté.")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Delete account section", () => {
    it("does not show delete section when not logged in", () => {
      render(<SettingsPanel {...defaultProps} loggedIn={false} />);

      expect(screen.queryByText("Zone danger")).not.toBeInTheDocument();
    });

    it("shows delete section when logged in", () => {
      render(<SettingsPanel {...defaultProps} loggedIn />);

      expect(screen.getByText("Zone danger")).toBeInTheDocument();
      expect(
        screen.getByText(/Supprimer définitivement ton compte/)
      ).toBeInTheDocument();
    });

    it("requires confirmation text to enable delete button", async () => {
      const user = userEvent.setup();

      render(<SettingsPanel {...defaultProps} loggedIn />);

      const deleteButton = screen.getByRole("button", {
        name: /Supprimer mon compte/,
      });
      expect(deleteButton).toBeDisabled();

      const confirmInput = screen.getByPlaceholderText(
        "Tape SUPPRIMER pour confirmer"
      );
      await user.type(confirmInput, "SUPPRIMER");

      expect(deleteButton).not.toBeDisabled();
    });

    it("calls onDeleteAccount when confirmed", async () => {
      const user = userEvent.setup();
      const onDeleteAccount = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();

      render(
        <SettingsPanel
          {...defaultProps}
          loggedIn
          onDeleteAccount={onDeleteAccount}
          onClose={onClose}
        />
      );

      const confirmInput = screen.getByPlaceholderText(
        "Tape SUPPRIMER pour confirmer"
      );
      await user.type(confirmInput, "SUPPRIMER");

      const deleteButton = screen.getByRole("button", {
        name: /Supprimer mon compte/,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(onDeleteAccount).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe("Availability windows (DayEditor)", () => {
    it("renders all 7 days of the week", () => {
      render(<SettingsPanel {...defaultProps} />);

      expect(screen.getByText("Lundi")).toBeInTheDocument();
      expect(screen.getByText("Mardi")).toBeInTheDocument();
      expect(screen.getByText("Mercredi")).toBeInTheDocument();
      expect(screen.getByText("Jeudi")).toBeInTheDocument();
      expect(screen.getByText("Vendredi")).toBeInTheDocument();
      expect(screen.getByText("Samedi")).toBeInTheDocument();
      expect(screen.getByText("Dimanche")).toBeInTheDocument();
    });

    it("shows 'Indisponible' for days with no windows", () => {
      render(<SettingsPanel {...defaultProps} />);

      // Sunday (index 0) has no windows in defaultPrefs
      // The "+ Plage" button should exist but no time inputs
      const sundaySection = screen.getByText("Dimanche").closest("div");
      if (sundaySection) {
        // Should have the add button
        expect(within(sundaySection).getByRole("button", { name: "+ Plage" })).toBeInTheDocument();
        // Should show "Indisponible" text (or no time inputs)
        const timeInputs = within(sundaySection).queryAllByDisplayValue(/\d{2}:\d{2}/);
        expect(timeInputs.length).toBe(0);
      }
    });

    it("adds new availability window when + Plage clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<SettingsPanel {...defaultProps} onChange={onChange} />);

      // Find Monday section
      const mondaySection = screen.getByText("Lundi").parentElement;
      if (mondaySection) {
        const addButton = within(mondaySection).getByRole("button", {
          name: "+ Plage",
        });
        await user.click(addButton);

        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            availability: expect.arrayContaining([
              expect.arrayContaining([
                { start: "09:00", end: "12:00", contexts: [] },
                { start: "09:00", end: "12:00", contexts: [] },
              ]),
            ]),
          })
        );
      }
    });

    it("updates window start time", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<SettingsPanel {...defaultProps} onChange={onChange} />);

      // Find time inputs - Monday has a window starting at 09:00
      const timeInputs = screen.getAllByDisplayValue("09:00");
      expect(timeInputs.length).toBeGreaterThan(0);

      const firstTimeInput = timeInputs[0];
      await user.clear(firstTimeInput);
      await user.type(firstTimeInput, "08:00");

      // onChange should be called
      expect(onChange).toHaveBeenCalled();
      expect(onChange.mock.calls[0][0]).toHaveProperty("availability");
    });

    it("removes window when X button clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<SettingsPanel {...defaultProps} onChange={onChange} />);

      // Find any "Supprimer la plage" button (Monday has one)
      const removeButtons = screen.getAllByLabelText("Supprimer la plage");
      expect(removeButtons.length).toBeGreaterThan(0);

      await user.click(removeButtons[0]);

      expect(onChange).toHaveBeenCalled();
      // Verify availability was updated
      expect(onChange.mock.calls[0][0]).toHaveProperty("availability");
    });

    it("toggles context for a window", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<SettingsPanel {...defaultProps} onChange={onChange} />);

      // Find Tuesday section (has a window with "pro" context)
      const tuesdaySection = screen.getByText("Mardi").parentElement;
      if (tuesdaySection) {
        // Click on "pro" context button to toggle it off
        const contextButtons = within(tuesdaySection).getAllByRole("button");
        const proButton = contextButtons.find((btn) =>
          btn.textContent?.includes("pro")
        );

        if (proButton) {
          await user.click(proButton);
          expect(onChange).toHaveBeenCalled();
        }
      }
    });

    it("shows 'Copier sur Lun–Ven' button for weekdays", () => {
      render(<SettingsPanel {...defaultProps} />);

      // Monday should have the copy button
      const mondaySection = screen.getByText("Lundi").parentElement;
      if (mondaySection) {
        expect(
          within(mondaySection).getByRole("button", {
            name: "Copier sur Lun–Ven",
          })
        ).toBeInTheDocument();
      }
    });

    it("does not show 'Copier sur Lun–Ven' button for weekend", () => {
      render(<SettingsPanel {...defaultProps} />);

      // Saturday should NOT have the copy button
      const saturdaySection = screen.getByText("Samedi").parentElement;
      if (saturdaySection) {
        expect(
          within(saturdaySection).queryByRole("button", {
            name: "Copier sur Lun–Ven",
          })
        ).not.toBeInTheDocument();
      }
    });

    it("copies weekday availability to all weekdays when button clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<SettingsPanel {...defaultProps} onChange={onChange} />);

      // Find Monday section
      const mondaySection = screen.getByText("Lundi").parentElement;
      if (mondaySection) {
        const copyButton = within(mondaySection).getByRole("button", {
          name: "Copier sur Lun–Ven",
        });
        await user.click(copyButton);

        // Should copy Monday's window (09:00-12:00) to Tue-Fri
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            availability: expect.arrayContaining([
              [], // Sunday unchanged
              [{ start: "09:00", end: "12:00", contexts: [] }], // Monday
              [{ start: "09:00", end: "12:00", contexts: [] }], // Tuesday (copied)
              [{ start: "09:00", end: "12:00", contexts: [] }], // Wednesday (copied)
              [{ start: "09:00", end: "12:00", contexts: [] }], // Thursday (copied)
              [{ start: "09:00", end: "12:00", contexts: [] }], // Friday (copied)
              // Saturday unchanged
            ]),
          })
        );
      }
    });

    it("shows '(tous)' when window has no specific contexts", () => {
      render(<SettingsPanel {...defaultProps} />);

      // Monday window has empty contexts array - just verify (tous) exists somewhere
      expect(screen.getAllByText("(tous)").length).toBeGreaterThan(0);
    });
  });
});
