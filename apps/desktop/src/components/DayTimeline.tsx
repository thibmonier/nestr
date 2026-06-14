import { useRef, useState, type DragEvent as ReactDragEvent } from "react";
import type { DailyPlan, TimeBlock } from "@nestr/core";
import { hhmm, todayISO } from "../lib/format.js";
import { EmptyState } from "../design/components/feedback/EmptyState.js";
import { TimelineBlock } from "../design/components/data-display/TimelineBlock.js";
import { Icon } from "../design/components/foundation/Icon.js";

export type TimelineMode = "compact" | "proportional";

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
  dragging,
  onSchedule,
  mode = "proportional",
}: {
  plan: DailyPlan | null;
  hideUnscheduled?: boolean;
  /** Un glisser de tâche est en cours → la timeline devient zone de dépôt. */
  dragging?: boolean;
  /** Dépôt à `startMin` (minutes locales) sur la timeline. */
  onSchedule?: (startMin: number) => void;
  /** Rendu compact (liste) ou proportionnel (∝ durée). @default "proportional" */
  mode?: TimelineMode;
}) {
  // Sans plan et sans glisser en cours : invite à planifier.
  if (!plan && !dragging) {
    return (
      <EmptyState style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Clique sur « Planifier ma journée » pour générer ton emploi du temps
        optimisé.
      </EmptyState>
    );
  }

  const allDay = (plan?.blocks ?? []).filter((b) => b.allDay);
  const timed = (plan?.blocks ?? [])
    .filter((b) => !b.allDay)
    .map((b) => ({ ...b, startMin: minOfDay(b.start), endMin: minOfDay(b.end) }))
    .sort((a, b) => a.startMin - b.startMin);

  // Le glisser-déposer nécessite la grille proportionnelle (axe temps).
  const effectiveMode: TimelineMode = dragging ? "proportional" : mode;

  return (
    <div className="flex flex-col gap-4">
      {allDay.map((b, i) => (
        <AllDayBanner key={`ad-${i}`} block={b} />
      ))}

      {timed.length === 0 && !dragging ? (
        (plan?.blocks.length ?? 0) === 0 && (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>Journée vide.</p>
        )
      ) : effectiveMode === "compact" ? (
        <div className="flex flex-col gap-2">
          {timed.map((b, i) => (
            <TimelineBlock
              key={i}
              time={`${hhmm(b.start)} – ${hhmm(b.end)}`}
              title={b.title}
              kind={b.kind === "event" ? "event" : "task"}
              source={b.source}
              calendarName={b.calendarName}
              mode={b.mode}
            />
          ))}
        </div>
      ) : (
        <ProportionalTimeline
          date={plan?.date ?? todayISO()}
          blocks={timed}
          dragging={dragging}
          onSchedule={onSchedule}
        />
      )}

      {!hideUnscheduled && (plan?.unscheduled.length ?? 0) > 0 && (
        <div
          style={{
            background: "var(--warn-bg)",
            border: "1px solid var(--warn-border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
          }}
        >
          <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", fontWeight: "var(--fw-semibold)", color: "var(--warn-fg)" }}>
            Non planifié ({plan?.unscheduled.length})
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", listStyle: "disc", fontSize: "var(--text-sm)", color: "var(--warn-fg)" }}>
            {(plan?.unscheduled ?? []).map((u) => (
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

function ProportionalTimeline({
  date,
  blocks,
  dragging,
  onSchedule,
}: {
  date: string;
  blocks: TimedBlock[];
  dragging?: boolean;
  onSchedule?: (startMin: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverMin, setHoverMin] = useState<number | null>(null);

  // Plage = bornes des blocs (marge 30 min), défaut 08:00–19:00 si vide.
  const firstStart = blocks.length ? Math.min(...blocks.map((b) => b.startMin)) : 8 * 60;
  const lastEnd = blocks.length ? Math.max(...blocks.map((b) => b.endMin)) : 19 * 60;
  const dayStart = Math.max(0, Math.floor((firstStart - 30) / 60) * 60);
  const dayEnd = Math.min(24 * 60, Math.ceil((lastEnd + 30) / 60) * 60);
  const height = (dayEnd - dayStart) * PX_PER_MIN;

  const hours: number[] = [];
  for (let h = dayStart; h <= dayEnd; h += 60) hours.push(h);

  const now = new Date();
  const isToday = date === todayISO();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = isToday && nowMin >= dayStart && nowMin <= dayEnd;

  function minFromEvent(e: ReactDragEvent): number {
    const rect = wrapRef.current!.getBoundingClientRect();
    let min = dayStart + (e.clientY - rect.top) / PX_PER_MIN;
    min = Math.round(min / 15) * 15; // snap 15 min
    return Math.max(dayStart, Math.min(dayEnd - 15, min));
  }

  return (
    <div
      ref={wrapRef}
      onDragOver={dragging ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setHoverMin(minFromEvent(e)); } : undefined}
      onDragLeave={dragging ? () => setHoverMin(null) : undefined}
      onDrop={dragging ? (e) => { e.preventDefault(); const m = minFromEvent(e); setHoverMin(null); onSchedule?.(m); } : undefined}
      style={{
        position: "relative",
        height,
        marginTop: "var(--space-2)",
        outline: dragging ? "2px dashed var(--indigo-300)" : "none",
        outlineOffset: 6,
        borderRadius: "var(--radius-md)",
      }}
    >
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

      {/* indicateur de dépôt pendant le glisser */}
      {dragging && hoverMin != null && (
        <div style={{ position: "absolute", top: (hoverMin - dayStart) * PX_PER_MIN, left: GUTTER, right: 0, zIndex: 8, display: "flex", alignItems: "center", gap: "0.4rem", pointerEvents: "none" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", fontWeight: "var(--fw-semibold)", color: "var(--text-on-accent)", background: "var(--accent)", borderRadius: "var(--radius-sm)", padding: "0.05rem 0.35rem", marginLeft: "-2.7rem" }}>
            {fmtMin(hoverMin)}
          </span>
          <div style={{ flex: 1, borderTop: "2px solid var(--accent)" }} />
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
                <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--fw-semibold)", color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {b.title}
                </span>
                {b.mode && (
                  <span style={{ color: "var(--text-muted)", flexShrink: 0, display: "inline-flex" }}>
                    <Icon name={b.mode} size={14} />
                  </span>
                )}
              </div>
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
