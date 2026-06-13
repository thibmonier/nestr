import React from "react";

export type Priority = "low" | "medium" | "high" | "urgent";

export interface PriorityBadgeProps {
  /** @default "medium" */
  priority?: Priority;
  /** Override the default French label. */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

const MAP: Record<Priority, { bg: string; fg: string; label: string }> = {
  urgent: { bg: "var(--prio-urgent-bg)", fg: "var(--prio-urgent-fg)", label: "Urgente" },
  high: { bg: "var(--prio-high-bg)", fg: "var(--prio-high-fg)", label: "Haute" },
  medium: { bg: "var(--prio-medium-bg)", fg: "var(--prio-medium-fg)", label: "Moyenne" },
  low: { bg: "var(--prio-low-bg)", fg: "var(--prio-low-fg)", label: "Basse" },
};

/** Pill encoding a task's priority with the Nestr color scale. */
export function PriorityBadge({ priority = "medium", children, style }: PriorityBadgeProps) {
  const p = MAP[priority] ?? MAP.medium;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "var(--radius-pill)",
        padding: "0.125rem 0.5rem",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--fw-semibold)",
        background: p.bg,
        color: p.fg,
        ...style,
      }}
    >
      {children ?? p.label}
    </span>
  );
}
