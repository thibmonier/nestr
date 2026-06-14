import React from "react";
import { MetaTag } from "./MetaTag.js";

export interface TimelineBlockProps {
  /** Time range string, e.g. "09:00 – 10:30" or "Toute la journée". */
  time: string;
  title: string;
  /** Task slot (indigo bar) or calendar event (violet bar). @default "task" */
  kind?: "task" | "event";
  /** For events: which calendar it came from ("local" = ajout rapide). */
  source?: "google" | "apple" | "local";
  /** For events: human calendar name, e.g. "Perso". */
  calendarName?: string;
  style?: React.CSSProperties;
}

export function TimelineBlock({ time, title, kind = "task", source, calendarName, style }: TimelineBlockProps) {
  const accent = kind === "event" ? "var(--block-event)" : "var(--block-task)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: "var(--space-3)",
        background: "var(--surface-card)",
        borderRadius: "var(--radius-lg)",
        borderLeft: `4px solid ${accent}`,
        boxShadow: "var(--shadow-sm)",
        padding: "0.75rem 1rem",
        ...style,
      }}
    >
      <div style={{ width: "7rem", flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        {time}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--fw-medium)", color: "var(--text-body)" }}>
          {title}
        </p>
        {kind === "event" ? (
          <span style={{ marginTop: "0.25rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <MetaTag tone={source === "google" ? "google" : source === "apple" ? "apple" : "neutral"}>
              {source === "google" ? "Google" : source === "apple" ? "Apple" : "Agenda"}
            </MetaTag>
            {calendarName && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>{calendarName}</span>}
          </span>
        ) : (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>Tâche</span>
        )}
      </div>
    </div>
  );
}
