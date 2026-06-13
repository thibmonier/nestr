import type { Priority, Task } from "@nestr/core";
import { durationLabel } from "../lib/format.js";

const PRIORITY_STYLE: Record<Priority, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  medium: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

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

export function TaskList({
  tasks,
  onToggle,
  onRemove,
}: {
  tasks: Task[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
        Aucune tâche. Ajoute-en une pour commencer.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((t) => (
        <li
          key={t.id}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <input
            type="checkbox"
            checked={t.status === "done"}
            onChange={() => onToggle(t.id)}
            className="h-4 w-4 accent-indigo-600"
          />
          <div className="flex-1">
            <p
              className={
                t.status === "done"
                  ? "text-sm text-slate-400 line-through"
                  : "text-sm font-medium text-slate-800 dark:text-slate-100"
              }
            >
              {t.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_STYLE[t.priority]}`}
              >
                {PRIORITY_LABEL[t.priority]}
              </span>
              {t.estimatedMinutes != null && (
                <span className="text-slate-500 dark:text-slate-400">
                  {durationLabel(t.estimatedMinutes)}
                </span>
              )}
              {t.context && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                  {t.context}
                </span>
              )}
              {t.energy && (
                <span className="text-slate-400">énergie {t.energy}</span>
              )}
              {t.dueDate && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                  ⏱ {dueLabel(t.dueDate)}
                </span>
              )}
              {t.allowedWeekdays && t.allowedWeekdays.length > 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  📅 {weekdaysLabel(t.allowedWeekdays)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => onRemove(t.id)}
            className="text-slate-400 transition hover:text-red-500"
            aria-label="Supprimer"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
