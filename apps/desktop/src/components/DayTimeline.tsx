import type { DailyPlan } from "@nestr/core";
import { hhmm } from "../lib/format.js";

export function DayTimeline({ plan }: { plan: DailyPlan | null }) {
  if (!plan) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400 dark:border-slate-700">
        Clique sur « Planifier ma journée » pour générer ton emploi du temps
        optimisé.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {plan.blocks.length === 0 && (
          <p className="text-sm text-slate-400">Journée vide.</p>
        )}
        {plan.blocks.map((b, i) => (
          <div
            key={i}
            className={`flex items-stretch gap-3 rounded-xl border-l-4 bg-white px-4 py-3 shadow-sm dark:bg-slate-800 ${
              b.kind === "event"
                ? "border-l-violet-400"
                : "border-l-indigo-500"
            }`}
          >
            <div className="w-28 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
              {b.allDay ? "Toute la journée" : `${hhmm(b.start)} – ${hhmm(b.end)}`}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {b.title}
              </p>
              <span className="text-xs text-slate-400">
                {b.kind === "event" ? "Agenda" : "Tâche"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {plan.unscheduled.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
          <p className="mb-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            Non planifié ({plan.unscheduled.length}) — pas assez de temps libre
          </p>
          <ul className="list-inside list-disc text-sm text-amber-700 dark:text-amber-300">
            {plan.unscheduled.map((t) => (
              <li key={t.id}>{t.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
