import { useState } from "react";
import type { ParsedEntry, TaskMode } from "@nestr/core";
import { Input } from "../design/components/forms/Input.js";
import { Button } from "../design/components/forms/Button.js";
import { SegmentedControl } from "../design/components/navigation/SegmentedControl.js";
import { Icon } from "../design/components/foundation/Icon.js";
import { Tag } from "../design/components/data-display/Tag.js";
import { todayISO } from "../lib/format.js";

const MODES: { value: string; label: string }[] = [
  { value: "", label: "—" },
  { value: "action", label: "Action" },
  { value: "video", label: "Visio" },
  { value: "phone", label: "Téléphone" },
  { value: "trip", label: "Déplacement" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
      <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--fw-medium)", color: "var(--text-muted)" }}>{label}</span>
      {children}
    </div>
  );
}

/**
 * Ajout rapide IA : une phrase en langage naturel → aperçu structuré
 * (tâche ou événement) éditable avant validation.
 */
export function QuickAdd({
  aiConfigured,
  onParse,
  onConfirm,
}: {
  aiConfigured: boolean;
  onParse: (text: string, todayISO: string) => Promise<ParsedEntry>;
  onConfirm: (entry: ParsedEntry) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ParsedEntry | null>(null);

  async function analyse() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    try {
      setDraft(await onParse(t, todayISO()));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function patch(p: Partial<ParsedEntry>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
  }

  function confirm() {
    if (!draft || !draft.title.trim()) return;
    onConfirm(draft);
    setDraft(null);
    setText("");
  }

  function cancel() {
    setDraft(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: "0.7rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "inline-flex" }}>
            <Icon name="clockArrow" size={16} />
          </span>
          <Input
            value={text}
            disabled={!aiConfigured || busy}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void analyse();
              }
            }}
            placeholder={
              aiConfigured
                ? "Ex. déjeuner mardi avec Jean au LAB à Nantes"
                : "Configure ta clé IA dans les Réglages pour l'ajout rapide"
            }
            style={{ paddingLeft: "2.2rem" }}
          />
        </div>
        <Button onClick={analyse} disabled={!aiConfigured || busy || !text.trim()}>
          {busy ? "Analyse…" : "Analyser"}
        </Button>
      </div>

      {error && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--prio-urgent-fg)" }}>{error}</p>
      )}

      {draft && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            background: "var(--surface-card)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--fw-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>
              Aperçu
            </span>
            <SegmentedControl
              size="sm"
              value={draft.kind}
              onChange={(v) => patch({ kind: v as ParsedEntry["kind"] })}
              options={[
                { value: "task", label: "Tâche" },
                { value: "event", label: "Événement" },
              ]}
            />
          </div>

          <Field label="Titre">
            <Input value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
            <Field label="Date">
              <Input type="date" value={draft.date ?? ""} onChange={(e) => patch({ date: e.target.value || null })} />
            </Field>
            <Field label="Début">
              <Input type="time" value={draft.start ?? ""} onChange={(e) => patch({ start: e.target.value || null })} />
            </Field>
            <Field label="Fin">
              <Input type="time" value={draft.end ?? ""} onChange={(e) => patch({ end: e.target.value || null })} />
            </Field>
          </div>

          {draft.kind === "event" && (
            <Field label="Lieu">
              <Input value={draft.location ?? ""} onChange={(e) => patch({ location: e.target.value || null })} placeholder="—" />
            </Field>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <Field label="Contexte">
              <SegmentedControl
                size="sm"
                value={draft.context}
                onChange={(v) => patch({ context: v as ParsedEntry["context"] })}
                options={[
                  { value: "pro", label: "Pro" },
                  { value: "perso", label: "Perso" },
                ]}
              />
            </Field>
            <Field label="Mode">
              <SegmentedControl
                size="sm"
                value={draft.mode ?? ""}
                onChange={(v) => patch({ mode: (v || null) as TaskMode | null })}
                options={MODES}
              />
            </Field>
          </div>

          {draft.people.length > 0 && (
            <Field label="Personnes">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                {draft.people.map((person) => (
                  <Tag key={person} onRemove={() => patch({ people: draft.people.filter((x) => x !== person) })}>
                    {person}
                  </Tag>
                ))}
              </div>
            </Field>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
            <Button variant="secondary" onClick={cancel}>Annuler</Button>
            <Button onClick={confirm} disabled={!draft.title.trim()}>
              {draft.kind === "event" ? "Ajouter l'événement" : "Ajouter la tâche"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
