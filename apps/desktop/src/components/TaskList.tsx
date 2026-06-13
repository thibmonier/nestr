import { useState } from "react";
import type { Task } from "@nestr/core";
import { TaskRow, type TaskContext } from "../design/components/data-display/TaskRow.js";
import { EmptyState } from "../design/components/feedback/EmptyState.js";

const DAY_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/** Libellé compact d'une contrainte de jours autorisés. */
function weekdaysLabel(days: number[]): string {
  const set = [...days].sort((a, b) => a - b).join(",");
  if (set === "1,2,3,4,5") return "Lun–Ven";
  if (set === "0,6") return "Week-end";
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_SHORT[d])
    .join(" ");
}

function dueLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

/** Le contexte libre de @nestr/core ne s'affiche en chip que s'il vaut pro/perso. */
function asContext(context?: string): TaskContext | undefined {
  return context === "pro" || context === "perso" ? context : undefined;
}

/** Édition inline du titre (interim avant la modale d'édition complète). */
function InlineEdit({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  function commit() {
    const t = value.trim();
    if (t) onSave(t);
    else onCancel();
  }
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        background: "var(--surface-card)",
        border: "1px solid var(--accent)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: "0.6rem 0.9rem",
        listStyle: "none",
      }}
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onCancel();
        }}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: "var(--text-body)",
        }}
      />
      <button
        onClick={commit}
        style={{
          border: "none",
          borderRadius: "var(--radius-md)",
          background: "var(--accent)",
          color: "var(--text-on-accent)",
          padding: "0.3rem 0.7rem",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          fontWeight: "var(--fw-semibold)",
          cursor: "pointer",
        }}
      >
        Enregistrer
      </button>
      <button
        onClick={onCancel}
        style={{
          border: "none",
          background: "transparent",
          color: "var(--text-muted)",
          padding: "0.3rem 0.5rem",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          cursor: "pointer",
        }}
      >
        Annuler
      </button>
    </li>
  );
}

export function TaskList({
  tasks,
  editingId,
  onToggle,
  onRemove,
  onBreakdown,
  onDefer,
  onEditStart,
  onRename,
  onEditCancel,
}: {
  tasks: Task[];
  editingId: string | null;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onBreakdown: (task: Task) => void;
  onDefer: (id: string) => void;
  onEditStart: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onEditCancel: () => void;
}) {
  if (tasks.length === 0) {
    return <EmptyState>Aucune tâche. Ajoute-en une pour commencer.</EmptyState>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((t) =>
        t.id === editingId ? (
          <InlineEdit
            key={t.id}
            initial={t.title}
            onSave={(title) => onRename(t.id, title)}
            onCancel={onEditCancel}
          />
        ) : (
          <TaskRow
            key={t.id}
            title={t.title}
            done={t.status === "done"}
            priority={t.priority}
            estimatedMin={t.estimatedMinutes}
            spentMin={t.spentMinutes}
            mode={t.mode}
            context={asContext(t.context)}
            tags={t.tags}
            due={t.dueDate ? dueLabel(t.dueDate) : undefined}
            days={
              t.allowedWeekdays && t.allowedWeekdays.length > 0
                ? weekdaysLabel(t.allowedWeekdays)
                : undefined
            }
            onToggle={() => onToggle(t.id)}
            onEdit={() => onEditStart(t.id)}
            onDefer={() => onDefer(t.id)}
            onBreakdown={t.status !== "done" ? () => onBreakdown(t) : undefined}
            onRemove={() => onRemove(t.id)}
          />
        ),
      )}
    </ul>
  );
}
