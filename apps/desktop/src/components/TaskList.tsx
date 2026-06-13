import { useState } from "react";
import type { Task } from "@nestr/core";
import { TaskRow, type TaskContext } from "../design/components/data-display/TaskRow.js";
import { EmptyState } from "../design/components/feedback/EmptyState.js";
import { SegmentedControl } from "../design/components/navigation/SegmentedControl.js";
import { Input } from "../design/components/forms/Input.js";

/** Combien de tâches affichées avant « Voir plus » (limite la liste longue). */
const PAGE = 25;

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
  const [filter, setFilter] = useState<"tous" | "pro" | "perso">("tous");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  if (tasks.length === 0) {
    return <EmptyState>Aucune tâche. Ajoute-en une pour commencer.</EmptyState>;
  }

  const q = query.trim().toLowerCase();
  const filtered = tasks.filter((t) => {
    if (filter !== "tous" && t.context !== filter) return false;
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
    );
  });
  const visible = filtered.slice(0, limit);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          size="sm"
          value={filter}
          onChange={(v) => {
            setFilter(v as "tous" | "pro" | "perso");
            setLimit(PAGE);
          }}
          options={[
            { value: "tous", label: "Tous" },
            { value: "pro", label: "Pro" },
            { value: "perso", label: "Perso" },
          ]}
        />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
          placeholder="Rechercher (titre, tag)…"
          wrapperStyle={{ width: "14rem" }}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState>Aucune tâche ne correspond au filtre.</EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {visible.map((t) =>
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

          {filtered.length > limit && (
            <button
              onClick={() => setLimit((n) => n + PAGE)}
              style={{
                alignSelf: "center",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius-md)",
                background: "transparent",
                color: "var(--text-muted)",
                padding: "0.4rem 0.9rem",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--fw-medium)",
                cursor: "pointer",
              }}
            >
              Voir plus ({visible.length}/{filtered.length})
            </button>
          )}
        </>
      )}
    </div>
  );
}
