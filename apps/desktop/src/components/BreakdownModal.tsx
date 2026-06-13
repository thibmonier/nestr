import { useState } from "react";
import type { Task } from "@nestr/core";
import type { SubtaskProposal } from "../lib/ai.js";

export function BreakdownModal({
  task,
  proposals,
  onApply,
  onCancel,
}: {
  task: Task;
  proposals: SubtaskProposal[];
  onApply: (subtasks: SubtaskProposal[]) => void;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<SubtaskProposal[]>(proposals);

  function patch(i: number, p: Partial<SubtaskProposal>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...p } : r)));
  }
  function remove(i: number) {
    setRows((prev) => prev.filter((_, j) => j !== i));
  }

  const total = rows.reduce((s, r) => s + (r.estimatedMinutes || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold">Découper en sous-tâches</h2>
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Annuler
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Proposition de l'IA pour «&nbsp;{task.title}&nbsp;». Ajuste, retire ce
          que tu ne veux pas, puis applique.
        </p>

        <div className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={r.title}
                onChange={(e) => patch(i, { title: e.target.value })}
                className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600"
              />
              <input
                type="number"
                min="5"
                step="5"
                value={r.estimatedMinutes}
                onChange={(e) =>
                  patch(i, { estimatedMinutes: Number(e.target.value) })
                }
                className="w-20 rounded-lg border border-slate-300 bg-transparent px-2 py-2 text-sm dark:border-slate-600"
              />
              <span className="text-xs text-slate-400">min</span>
              <button
                onClick={() => remove(i)}
                className="text-slate-400 hover:text-red-500"
                aria-label="Retirer"
              >
                ✕
              </button>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-sm text-slate-400">Aucune sous-tâche.</p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {rows.length} sous-tâches · {total} min au total
          </span>
          <button
            onClick={() => onApply(rows)}
            disabled={rows.length === 0}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-40"
          >
            Remplacer par ces sous-tâches
          </button>
        </div>
      </div>
    </div>
  );
}
