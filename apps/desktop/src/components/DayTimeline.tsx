import type { DailyPlan } from "@nestr/core";
import { hhmm } from "../lib/format.js";
import { TimelineBlock } from "../design/components/data-display/TimelineBlock.js";
import { EmptyState } from "../design/components/feedback/EmptyState.js";

export function DayTimeline({
  plan,
  hideUnscheduled,
}: {
  plan: DailyPlan | null;
  hideUnscheduled?: boolean;
}) {
  if (!plan) {
    return (
      <EmptyState style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Clique sur « Planifier ma journée » pour générer ton emploi du temps
        optimisé.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {plan.blocks.length === 0 && (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
            Journée vide.
          </p>
        )}
        {plan.blocks.map((b, i) => (
          <TimelineBlock
            key={i}
            time={b.allDay ? "Toute la journée" : `${hhmm(b.start)} – ${hhmm(b.end)}`}
            title={b.title}
            kind={b.kind === "event" ? "event" : "task"}
            source={b.source}
            calendarName={b.calendarName}
          />
        ))}
      </div>

      {!hideUnscheduled && plan.unscheduled.length > 0 && (
        <div
          style={{
            background: "var(--warn-bg)",
            border: "1px solid var(--warn-border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
          }}
        >
          <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", fontWeight: "var(--fw-semibold)", color: "var(--warn-fg)" }}>
            Non planifié ({plan.unscheduled.length})
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", listStyle: "disc", fontSize: "var(--text-sm)", color: "var(--warn-fg)" }}>
            {plan.unscheduled.map((u) => (
              <li key={u.task.id}>
                {u.task.title}
                <span style={{ opacity: 0.8 }}>
                  {u.reason === "wrong_day"
                    ? " — jour non autorisé aujourd'hui"
                    : u.reason === "no_window"
                      ? " — aucune plage pour ce contexte aujourd'hui"
                      : " — pas assez de temps libre"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
