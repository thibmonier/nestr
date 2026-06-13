import { useState } from "react";
import type { Energy, Priority, Task, TaskMode } from "@nestr/core";
import { newId } from "../lib/storage.js";
import { Button } from "../design/components/forms/Button.js";
import { Input } from "../design/components/forms/Input.js";
import { Select } from "../design/components/forms/Select.js";

const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];
const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

const DAY_PRESETS: Record<string, number[] | undefined> = {
  all: undefined,
  weekdays: [1, 2, 3, 4, 5],
  weekend: [0, 6],
};

export function TaskForm({
  onAdd,
  contexts,
}: {
  onAdd: (task: Task) => void;
  contexts: string[];
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [minutes, setMinutes] = useState("");
  const [energy, setEnergy] = useState<Energy | "">("");
  const [dueDate, setDueDate] = useState("");
  const [days, setDays] = useState<keyof typeof DAY_PRESETS>("all");
  const [context, setContext] = useState("");
  const [mode, setMode] = useState<TaskMode | "">("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onAdd({
      id: newId(),
      title: t,
      status: "todo",
      priority,
      estimatedMinutes: minutes ? Number(minutes) : undefined,
      energy: energy || undefined,
      createdAt: new Date().toISOString(),
      dueDate: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : undefined,
      allowedWeekdays: DAY_PRESETS[days],
      context: context || undefined,
      mode: mode || undefined,
    });
    setTitle("");
    setMinutes("");
    setEnergy("");
    setPriority("medium");
    setDueDate("");
    setDays("all");
    setContext("");
    setMode("");
  }

  return (
    <form
      onSubmit={submit}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-end",
        gap: "var(--space-3)",
        background: "var(--surface-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: "var(--space-4)",
      }}
    >
      <Input
        label="Nouvelle tâche"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex. Préparer le support de présentation"
        wrapperStyle={{ flex: 1, minWidth: "14rem" }}
      />

      <Select
        label="Priorité"
        value={priority}
        onChange={(e) => setPriority(e.target.value as Priority)}
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABEL[p]}
          </option>
        ))}
      </Select>

      <Input
        label="Durée (min)"
        type="number"
        min="5"
        step="5"
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
        placeholder="auto"
        wrapperStyle={{ width: "6rem" }}
      />

      <Select
        label="Énergie"
        value={energy}
        onChange={(e) => setEnergy(e.target.value as Energy | "")}
      >
        <option value="">—</option>
        <option value="low">Faible</option>
        <option value="medium">Moyenne</option>
        <option value="high">Forte</option>
      </Select>

      <Select
        label="Vecteur"
        value={mode}
        onChange={(e) => setMode(e.target.value as TaskMode | "")}
      >
        <option value="">—</option>
        <option value="video">Visio</option>
        <option value="phone">Téléphone</option>
        <option value="action">Action</option>
        <option value="trip">Déplacement</option>
      </Select>

      <Select
        label="Contexte"
        value={context}
        onChange={(e) => setContext(e.target.value)}
      >
        <option value="">—</option>
        {contexts.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>

      <Input
        label="Échéance"
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />

      <Select
        label="Jours autorisés"
        value={days}
        onChange={(e) => setDays(e.target.value as keyof typeof DAY_PRESETS)}
      >
        <option value="all">Tous les jours</option>
        <option value="weekdays">Lun–Ven</option>
        <option value="weekend">Week-end</option>
      </Select>

      <Button type="submit" variant="primary">
        Ajouter
      </Button>
    </form>
  );
}
