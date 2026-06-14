import { useState } from "react";
import type { Energy, Priority, Task, TaskMode } from "@nestr/core";
import { newId } from "../lib/storage.js";
import { Modal } from "../design/components/feedback/Modal.js";
import { Input } from "../design/components/forms/Input.js";
import { Select } from "../design/components/forms/Select.js";
import { Button } from "../design/components/forms/Button.js";
import { SegmentedControl } from "../design/components/navigation/SegmentedControl.js";
import { Tag } from "../design/components/data-display/Tag.js";

const DAY_PRESETS: Record<string, number[] | undefined> = {
  all: undefined,
  weekdays: [1, 2, 3, 4, 5],
  weekend: [0, 6],
};

const MODES: { value: TaskMode; label: string }[] = [
  { value: "action", label: "Action" },
  { value: "video", label: "Visio" },
  { value: "phone", label: "Téléphone" },
  { value: "trip", label: "Déplacement" },
];

/** Déduit le preset de jours depuis allowedWeekdays (édition). */
function daysPreset(wd?: number[]): keyof typeof DAY_PRESETS {
  if (!wd || wd.length === 0) return "all";
  const s = [...wd].sort((a, b) => a - b).join(",");
  if (s === "1,2,3,4,5") return "weekdays";
  if (s === "0,6") return "weekend";
  return "all";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
      <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--fw-medium)", color: "var(--text-muted)" }}>{label}</span>
      {children}
    </label>
  );
}

export function TaskModal({
  task,
  contexts,
  allTags = [],
  onSave,
  onClose,
}: {
  /** Présent = édition ; absent = création. */
  task?: Task | null;
  contexts: string[];
  allTags?: string[];
  onSave: (task: Task) => void;
  onClose: () => void;
}) {
  const editing = !!task;
  const [title, setTitle] = useState(task?.title ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [context, setContext] = useState(task?.context ?? "");
  const [mode, setMode] = useState<TaskMode | "">(task?.mode ?? "");
  const [minutes, setMinutes] = useState(task?.estimatedMinutes != null ? String(task.estimatedMinutes) : "");
  const [energy, setEnergy] = useState<Energy | "">(task?.energy ?? "");
  const [due, setDue] = useState(task?.dueDate ? task.dueDate.slice(0, 10) : "");
  const [days, setDays] = useState<keyof typeof DAY_PRESETS>(daysPreset(task?.allowedWeekdays));
  const [tags, setTags] = useState<string[]>(task?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  function addTag(t: string) {
    const v = t.trim();
    if (!v || tags.includes(v)) return;
    setTags((p) => [...p, v]);
    setTagInput("");
  }

  function save() {
    const t = title.trim();
    if (!t) return;
    const base: Task =
      task ?? { id: newId(), title: t, status: "todo", priority, createdAt: new Date().toISOString() };
    onSave({
      ...base,
      title: t,
      priority,
      context: context || undefined,
      mode: mode || undefined,
      estimatedMinutes: minutes ? Number(minutes) : undefined,
      energy: energy || undefined,
      dueDate: due ? new Date(`${due}T23:59:59`).toISOString() : undefined,
      allowedWeekdays: DAY_PRESETS[days],
      tags: tags.length ? tags : undefined,
    });
  }

  return (
    <Modal
      title={editing ? "Modifier la tâche" : "Nouvelle tâche"}
      maxWidth="34rem"
      onClose={onClose}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={!title.trim()}>
            {editing ? "Enregistrer" : "Ajouter la tâche"}
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Field label="Intitulé">
          <Input
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Préparer le support de présentation"
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <Field label="Contexte">
            <Select value={context} onChange={(e) => setContext(e.target.value)}>
              <option value="">—</option>
              {contexts.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Priorité">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgente</option>
            </Select>
          </Field>
        </div>

        <Field label="Vecteur de réalisation">
          <SegmentedControl
            size="sm"
            options={[{ value: "", label: "—" }, ...MODES]}
            value={mode}
            onChange={(v) => setMode(v as TaskMode | "")}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-4)" }}>
          <Field label="Durée (min)">
            <Input type="number" min="5" step="5" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="auto (IA)" />
          </Field>
          <Field label="Énergie">
            <Select value={energy} onChange={(e) => setEnergy(e.target.value as Energy | "")}>
              <option value="">—</option>
              <option value="low">Faible</option>
              <option value="medium">Moyenne</option>
              <option value="high">Forte</option>
            </Select>
          </Field>
          <Field label="Jours autorisés">
            <Select value={days} onChange={(e) => setDays(e.target.value as keyof typeof DAY_PRESETS)}>
              <option value="all">Tous les jours</option>
              <option value="weekdays">Lun–Ven</option>
              <option value="weekend">Week-end</option>
            </Select>
          </Field>
        </div>

        <Field label="Échéance">
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>

        <Field label="Tags (projet, activité…)">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>
            {tags.map((t) => (
              <Tag key={t} onRemove={() => setTags((p) => p.filter((x) => x !== t))}>{t}</Tag>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              list="nestr-tags"
              placeholder="ajouter un tag…"
              style={{
                flex: 1,
                minWidth: "8rem",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--text-body)",
                background: "transparent",
                border: "1px dashed var(--border-strong)",
                borderRadius: "var(--radius-md)",
                padding: "0.4rem 0.6rem",
                outline: "none",
              }}
            />
            <datalist id="nestr-tags">
              {allTags.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
        </Field>
      </div>
    </Modal>
  );
}
