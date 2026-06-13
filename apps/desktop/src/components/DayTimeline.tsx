import type { DailyPlan, TimeBlock } from "@nestr/core";
import { hhmm, todayISO } from "../lib/format.js";
import { EmptyState } from "../design/components/feedback/EmptyState.js";

const PX_PER_MIN = 1.15;
const GUTTER = 56; // largeur colonne des heures (px)

/** Minutes locales depuis minuit pour un ISO datetime. */
function minOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function durLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

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

  const allDay = plan.blocks.filter((b) => b.allDay);
  const timed = plan.blocks
    .filter((b) => !b.allDay)
    .map((b) => ({ ...b, startMin: minOfDay(b.start), endMin: minOfDay(b.end) }))
    .sort((a, b) => a.startMin - b.startMin);

  return (
    <div className="flex flex-col gap-4">
      {allDay.map((b, i) => (
        <AllDayBanner key={`ad-${i}`} block={b} />
      ))}

      {timed.length === 0 ? (
        plan.blocks.length === 0 && (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>Journée vide.</p>
        )
      ) : (
        <ProportionalTimeline date={plan.date} blocks={timed} />
      )}

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

function AllDayBanner({ block }: { block: TimeBlock }) {
  const isEvent = block.kind === "event";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        background: "var(--surface-card)",
        border: "1px solid var(--border)",
        borderLeft: `4px solid ${isEvent ? "var(--block-event)" : "var(--block-task)"}`,
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
        padding: "0.5rem 0.75rem",
      }}
    >
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-subtle)", width: GUTTER - 12, flexShrink: 0 }}>
        Journée
      </span>
      <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-medium)", color: "var(--text-body)" }}>{block.title}</span>
    </div>
  );
}

type TimedBlock = TimeBlock & { startMin: number; endMin: number };

function ProportionalTimeline({ date, blocks }: { date: string; blocks: TimedBlock[] }) {
  const firstStart = Math.min(...blocks.map((b) => b.startMin));
  const lastEnd = Math.max(...blocks.map((b) => b.endMin));
  // Plage = bornes des blocs arrondies à l'heure, marge d'une demi-heure.
  const dayStart = Math.max(0, Math.floor((firstStart - 30) / 60) * 60);
  const dayEnd = Math.min(24 * 60, Math.ceil((lastEnd + 30) / 60) * 60);
  const height = (dayEnd - dayStart) * PX_PER_MIN;

  const hours: number[] = [];
  for (let h = dayStart; h <= dayEnd; h += 60) hours.push(h);

  const now = new Date();
  const isToday = date === todayISO();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = isToday && nowMin >= dayStart && nowMin <= dayEnd;

  return (
    <div style={{ position: "relative", height, marginTop: "var(--space-2)" }}>
      {/* grille horaire */}
      {hours.map((h) => (
        <div
          key={h}
          style={{ position: "absolute", top: (h - dayStart) * PX_PER_MIN, left: 0, right: 0, display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}
        >
          <span style={{ width: GUTTER - 12, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-subtle)", transform: "translateY(-0.5em)" }}>
            {fmtMin(h)}
          </span>
          <div style={{ flex: 1, borderTop: "1px solid var(--border)" }} />
        </div>
      ))}

      {/* ligne « maintenant » */}
      {showNow && (
        <div style={{ position: "absolute", top: (nowMin - dayStart) * PX_PER_MIN, left: GUTTER - 12, right: 0, zIndex: 5, display: "flex", alignItems: "center", gap: "0.4rem", pointerEvents: "none" }}>
          <span style={{ width: 8, height: 8, borderRadius: "var(--radius-pill)", background: "var(--danger)", marginLeft: -4 }} />
          <div style={{ flex: 1, borderTop: "2px solid var(--danger)" }} />
        </div>
      )}

      {/* blocs proportionnels */}
      {blocks.map((b, i) => {
        const top = (b.startMin - dayStart) * PX_PER_MIN;
        const h = (b.endMin - b.startMin) * PX_PER_MIN;
        const isEvent = b.kind === "event";
        const accent = isEvent ? "var(--block-event)" : "var(--block-task)";
        const compact = h < 50;
        return (
          <div key={i} style={{ position: "absolute", top, left: GUTTER, right: 0, height: Math.max(0, h - 6) }}>
            <div
              style={{
                height: "100%",
                boxSizing: "border-box",
                background: isEvent ? "color-mix(in srgb, var(--block-event) 12%, var(--surface-card))" : "var(--surface-card)",
                border: "1px solid var(--border)",
                borderLeft: `4px solid ${accent}`,
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-sm)",
                padding: compact ? "0.2rem 0.6rem" : "0.4rem 0.7rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: "0.15rem",
                overflow: "hidden",
              }}
            >
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {b.title}
              </span>
              {!compact && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-subtle)" }}>
                  <span>{hhmm(b.start)}–{hhmm(b.end)}</span>
                  <span style={{ color: isEvent ? "var(--block-event)" : "var(--accent-text)", fontFamily: "var(--font-sans)", fontWeight: "var(--fw-medium)" }}>
                    {durLabel(b.endMin - b.startMin)}
                  </span>
                  {isEvent && (
                    <span>· {b.source === "google" ? "Google" : b.source === "apple" ? "Apple" : "Agenda"} {b.calendarName ?? ""}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
