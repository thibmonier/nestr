import { useState, type DragEvent } from "react";
import { isDeferredFrom, type Task } from "@nestr/core";
import { TaskRow, type TaskContext } from "../design/components/data-display/TaskRow.js";
import { EmptyState } from "../design/components/feedback/EmptyState.js";
import { SegmentedControl } from "../design/components/navigation/SegmentedControl.js";
import { Input } from "../design/components/forms/Input.js";
import { todayISO } from "../lib/format.js";

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
  const safe = iso.includes("T") ? iso : `${iso}T12:00:00`;
  return new Date(safe).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

/** Le contexte libre de @nestr/core ne s'affiche en chip que s'il vaut pro/perso. */
function asContext(context?: string): TaskContext | undefined {
  return context === "pro" || context === "perso" ? context : undefined;
}

export function TaskList({
  tasks,
  onToggle,
  onRemove,
  onBreakdown,
  onDefer,
  onDeferLater,
  onEditStart,
  activeTaskId,
  elapsedMin,
  onStart,
  onStop,
  draggable,
  onTaskDragStart,
  onTaskDragEnd,
}: {
  tasks: Task[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onBreakdown: (task: Task) => void;
  onDefer: (id: string) => void;
  onDeferLater: (id: string) => void;
  onEditStart: (id: string) => void;
  activeTaskId?: string | null;
  elapsedMin?: number;
  onStart?: (id: string) => void;
  onStop?: (outcome: "pending" | "done") => void;
  draggable?: boolean;
  onTaskDragStart?: (id: string, e: DragEvent<HTMLLIElement>) => void;
  onTaskDragEnd?: () => void;
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
            {visible.map((t) => (
              <TaskRow
                key={t.id}
                title={t.title}
                draggable={draggable && t.status !== "done"}
                onDragStart={(e) => onTaskDragStart?.(t.id, e)}
                onDragEnd={() => onTaskDragEnd?.()}
                done={t.status === "done"}
                priority={t.priority}
                estimatedMin={t.estimatedMinutes}
                spentMin={t.spentMinutes}
                mode={t.mode}
                context={asContext(t.context)}
                tags={t.tags}
                due={t.dueDate ? dueLabel(t.dueDate) : undefined}
                deferred={
                  isDeferredFrom(t, todayISO()) ? dueLabel(t.deferredTo!) : undefined
                }
                days={
                  t.allowedWeekdays && t.allowedWeekdays.length > 0
                    ? weekdaysLabel(t.allowedWeekdays)
                    : undefined
                }
                tracking={activeTaskId === t.id}
                liveSpentMin={
                  activeTaskId === t.id
                    ? (t.spentMinutes ?? 0) + Math.round(elapsedMin ?? 0)
                    : undefined
                }
                onStart={onStart ? () => onStart(t.id) : undefined}
                onStop={onStop}
                onToggle={() => onToggle(t.id)}
                onEdit={() => onEditStart(t.id)}
                onDefer={() => onDefer(t.id)}
                onDeferLater={() => onDeferLater(t.id)}
                onBreakdown={t.status !== "done" ? () => onBreakdown(t) : undefined}
                onRemove={() => onRemove(t.id)}
              />
            ))}
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
