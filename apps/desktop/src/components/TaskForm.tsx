import { useState } from "react";
import type { Energy, Priority, Task } from "@nestr/core";
import { newId } from "../lib/storage.js";
import { todayISO } from "../lib/format.js";

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
    });
    setTitle("");
    setMinutes("");
    setEnergy("");
    setPriority("medium");
    setDueDate("");
    setDays("all");
    setContext("");
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <label className="flex min-w-[14rem] flex-1 flex-col gap-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Nouvelle tâche
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. Préparer le support de présentation"
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-600"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Priorité
        </span>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex w-24 flex-col gap-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Durée (min)
        </span>
        <input
          type="number"
          min="5"
          step="5"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="auto"
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Énergie
        </span>
        <select
          value={energy}
          onChange={(e) => setEnergy(e.target.value as Energy | "")}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600"
        >
          <option value="">—</option>
          <option value="low">Faible</option>
          <option value="medium">Moyenne</option>
          <option value="high">Forte</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Contexte
        </span>
        <select
          value={context}
          onChange={(e) => setContext(e.target.value)}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600"
        >
          <option value="">—</option>
          {contexts.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Échéance
        </span>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Jours autorisés
        </span>
        <select
          value={days}
          onChange={(e) => setDays(e.target.value as keyof typeof DAY_PRESETS)}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600"
        >
          <option value="all">Tous les jours</option>
          <option value="weekdays">Lun–Ven</option>
          <option value="weekend">Week-end</option>
        </select>
      </label>

      <button
        type="submit"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
      >
        Ajouter
      </button>
    </form>
  );
}
