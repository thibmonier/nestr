import type { WeekPlan } from "@nestr/core";
import { DayTimeline } from "./DayTimeline.js";
import { dayLabel } from "../lib/format.js";

const REASON_LABEL: Record<string, string> = {
  wrong_day: "jour non autorisé sur la période",
  no_window: "aucune plage pour ce contexte",
  no_time: "pas assez de temps libre cette semaine",
};

export function WeekView({ week }: { week: WeekPlan }) {
  // N'affiche que les jours qui contiennent au moins un bloc.
  const activeDays = week.days.filter((d) => d.blocks.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {activeDays.length === 0 && (
        <p className="text-sm text-slate-400">
          Rien à placer cette semaine.
        </p>
      )}

      {activeDays.map((d) => (
        <div key={d.date} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold capitalize text-slate-600 dark:text-slate-300">
            {dayLabel(d.date)}
          </h3>
          <DayTimeline plan={d} hideUnscheduled />
        </div>
      ))}

      {week.unscheduled.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
          <p className="mb-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            Non planifié cette semaine ({week.unscheduled.length})
          </p>
          <ul className="list-inside list-disc text-sm text-amber-700 dark:text-amber-300">
            {week.unscheduled.map((u) => (
              <li key={u.task.id}>
                {u.task.title}
                <span className="text-amber-600/80 dark:text-amber-400/80">
                  {" "}
                  — {REASON_LABEL[u.reason] ?? u.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
