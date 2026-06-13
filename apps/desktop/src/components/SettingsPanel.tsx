import { useState, type CSSProperties } from "react";
import type { AvailabilityWindow, PlanningPreferences } from "@nestr/core";
import { Modal } from "../design/components/feedback/Modal.js";
import { Input } from "../design/components/forms/Input.js";
import { Button } from "../design/components/forms/Button.js";
import { IconButton } from "../design/components/forms/IconButton.js";
import { Icon } from "../design/components/foundation/Icon.js";

const DAYS: { idx: number; label: string }[] = [
  { idx: 1, label: "Lundi" },
  { idx: 2, label: "Mardi" },
  { idx: 3, label: "Mercredi" },
  { idx: 4, label: "Jeudi" },
  { idx: 5, label: "Vendredi" },
  { idx: 6, label: "Samedi" },
  { idx: 0, label: "Dimanche" },
];

/** Eyebrow de section (libellé majuscule). */
const eyebrow: CSSProperties = {
  margin: "0 0 var(--space-2)",
  fontSize: "var(--text-xs)",
  fontWeight: "var(--fw-semibold)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--text-subtle)",
};

export function SettingsPanel({
  prefs,
  onChange,
  onClose,
  loggedIn,
  appleConnected,
  onConnectApple,
}: {
  prefs: PlanningPreferences;
  onChange: (p: PlanningPreferences) => void;
  onClose: () => void;
  loggedIn: boolean;
  appleConnected: boolean;
  onConnectApple: (appleId: string, appPassword: string) => Promise<void>;
}) {
  const [newContext, setNewContext] = useState("");
  const [appleId, setAppleId] = useState("");
  const [applePassword, setApplePassword] = useState("");
  const [appleBusy, setAppleBusy] = useState(false);
  const [appleMsg, setAppleMsg] = useState<string | null>(null);

  async function submitApple() {
    setAppleBusy(true);
    setAppleMsg(null);
    try {
      await onConnectApple(appleId.trim(), applePassword.trim());
      setAppleId("");
      setApplePassword("");
      setAppleMsg("Calendrier Apple connecté.");
    } catch (e) {
      setAppleMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setAppleBusy(false);
    }
  }

  function update(patch: Partial<PlanningPreferences>) {
    onChange({ ...prefs, ...patch });
  }

  function setDayWindows(day: number, windows: AvailabilityWindow[]) {
    const availability = prefs.availability.map((w, i) =>
      i === day ? windows : w,
    );
    update({ availability });
  }

  function addContext() {
    const c = newContext.trim().toLowerCase();
    if (!c || prefs.contexts.includes(c)) return;
    update({ contexts: [...prefs.contexts, c] });
    setNewContext("");
  }

  function removeContext(c: string) {
    update({
      contexts: prefs.contexts.filter((x) => x !== c),
      // retire ce contexte des fenêtres
      availability: prefs.availability.map((day) =>
        day.map((w) => ({
          ...w,
          contexts: w.contexts.filter((x) => x !== c),
        })),
      ),
    });
  }

  function copyWeekdayToAll(day: number) {
    const src = prefs.availability[day] ?? [];
    const availability = prefs.availability.map((w, i) =>
      i >= 1 && i <= 5 ? src.map((x) => ({ ...x })) : w,
    );
    update({ availability });
  }

  return (
    <Modal title="Réglages des disponibilités" onClose={onClose} maxWidth="48rem">
      {/* Contextes */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h3 style={eyebrow}>Contextes</h3>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-2)" }}>
          {prefs.contexts.map((c) => (
            <span
              key={c}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                borderRadius: "var(--radius-pill)",
                padding: "0.25rem 0.6rem",
                background: "var(--accent-soft)",
                color: "var(--accent-text)",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--fw-medium)",
              }}
            >
              {c}
              <button
                onClick={() => removeContext(c)}
                aria-label={`Supprimer ${c}`}
                style={{ display: "inline-flex", border: "none", background: "transparent", color: "var(--accent-text)", cursor: "pointer", padding: 0, opacity: 0.7 }}
              >
                <Icon name="x" size={12} />
              </button>
            </span>
          ))}
          <Input
            value={newContext}
            onChange={(e) => setNewContext(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addContext()}
            placeholder="ajouter…"
            wrapperStyle={{ width: "8rem" }}
          />
        </div>
      </section>

      {/* Calendrier Apple */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h3 style={eyebrow}>Calendrier Apple (iCloud)</h3>
        {!loggedIn ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
            Connecte-toi d'abord pour enregistrer tes identifiants.
          </p>
        ) : appleConnected ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--tag-days-fg)" }}>
            ✓ Connecté. Saisis de nouveaux identifiants pour les remplacer.
          </p>
        ) : (
          <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
            Apple ID + un mot de passe pour application (appleid.apple.com).
          </p>
        )}
        <div style={{ marginTop: "var(--space-2)", display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "var(--space-2)" }}>
          <Input
            value={appleId}
            onChange={(e) => setAppleId(e.target.value)}
            placeholder="apple-id@email.com"
            wrapperStyle={{ flex: 1, minWidth: "12rem" }}
          />
          <Input
            type="password"
            value={applePassword}
            onChange={(e) => setApplePassword(e.target.value)}
            placeholder="xxxx-xxxx-xxxx-xxxx"
            wrapperStyle={{ flex: 1, minWidth: "12rem" }}
          />
          <Button
            variant="primary"
            onClick={submitApple}
            disabled={!loggedIn || appleBusy || !appleId || !applePassword}
          >
            {appleBusy ? "…" : "Enregistrer"}
          </Button>
        </div>
        {appleMsg && (
          <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {appleMsg}
          </p>
        )}
      </section>

      {/* Plages par jour */}
      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <h3 style={{ ...eyebrow, marginBottom: 0 }}>Plages de disponibilité</h3>
        {DAYS.map(({ idx, label }) => (
          <DayEditor
            key={idx}
            label={label}
            contexts={prefs.contexts}
            windows={prefs.availability[idx] ?? []}
            onChange={(w) => setDayWindows(idx, w)}
            onCopyToWeekdays={
              idx >= 1 && idx <= 5 ? () => copyWeekdayToAll(idx) : undefined
            }
          />
        ))}
      </section>
    </Modal>
  );
}

function DayEditor({
  label,
  windows,
  contexts,
  onChange,
  onCopyToWeekdays,
}: {
  label: string;
  windows: AvailabilityWindow[];
  contexts: string[];
  onChange: (w: AvailabilityWindow[]) => void;
  onCopyToWeekdays?: () => void;
}) {
  function set(i: number, patch: Partial<AvailabilityWindow>) {
    onChange(windows.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  }
  function toggleCtx(i: number, c: string) {
    const w = windows[i]!;
    const has = w.contexts.includes(c);
    set(i, {
      contexts: has ? w.contexts.filter((x) => x !== c) : [...w.contexts, c],
    });
  }

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-semibold)", color: "var(--text-body)" }}>{label}</span>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {onCopyToWeekdays && windows.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onCopyToWeekdays}>
              Copier sur Lun–Ven
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange([...windows, { start: "09:00", end: "12:00", contexts: [] }])
            }
          >
            + Plage
          </Button>
        </div>
      </div>

      {windows.length === 0 && (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>Indisponible</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {windows.map((w, i) => (
          <div key={i} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-2)" }}>
            <Input type="time" value={w.start} onChange={(e) => set(i, { start: e.target.value })} />
            <span style={{ color: "var(--text-subtle)" }}>→</span>
            <Input type="time" value={w.end} onChange={(e) => set(i, { end: e.target.value })} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {contexts.map((c) => {
                const on = w.contexts.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCtx(i, c)}
                    style={{
                      border: "none",
                      borderRadius: "var(--radius-pill)",
                      padding: "0.15rem 0.55rem",
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--fw-medium)",
                      cursor: "pointer",
                      transition: "background var(--dur-base) var(--ease-standard)",
                      background: on ? "var(--accent)" : "var(--surface-sunken)",
                      color: on ? "var(--text-on-accent)" : "var(--text-muted)",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
              {w.contexts.length === 0 && (
                <span style={{ alignSelf: "center", fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>
                  (tous)
                </span>
              )}
            </div>
            <IconButton label="Supprimer la plage" onClick={() => onChange(windows.filter((_, j) => j !== i))}>
              <Icon name="x" size={14} />
            </IconButton>
          </div>
        ))}
      </div>
    </div>
  );
}
