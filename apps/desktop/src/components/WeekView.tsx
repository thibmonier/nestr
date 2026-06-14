import type { WeekPlan } from "@nestr/core";
import { DayTimeline, type TimelineMode } from "./DayTimeline.js";
import { dayLabel } from "../lib/format.js";

const REASON_LABEL: Record<string, string> = {
  wrong_day: "jour non autorisé sur la période",
  no_window: "aucune plage pour ce contexte",
  no_time: "pas assez de temps libre cette semaine",
};

export function WeekView({ week, mode }: { week: WeekPlan; mode?: TimelineMode }) {
  // N'affiche que les jours qui contiennent au moins un bloc.
  const activeDays = week.days.filter((d) => d.blocks.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {activeDays.length === 0 && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
          Rien à placer cette semaine.
        </p>
      )}

      {activeDays.map((d) => (
        <div key={d.date} className="flex flex-col gap-2">
          <h3
            style={{
              margin: 0,
              textTransform: "capitalize",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--fw-semibold)",
              color: "var(--text-body)",
            }}
          >
            {dayLabel(d.date)}
          </h3>
          <DayTimeline plan={d} hideUnscheduled mode={mode} />
        </div>
      ))}

      {week.unscheduled.length > 0 && (
        <div
          style={{
            background: "var(--warn-bg)",
            border: "1px solid var(--warn-border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
          }}
        >
          <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", fontWeight: "var(--fw-semibold)", color: "var(--warn-fg)" }}>
            Non planifié cette semaine ({week.unscheduled.length})
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", listStyle: "disc", fontSize: "var(--text-sm)", color: "var(--warn-fg)" }}>
            {week.unscheduled.map((u) => (
              <li key={u.task.id}>
                {u.task.title}
                <span style={{ opacity: 0.8 }}> — {REASON_LABEL[u.reason] ?? u.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
