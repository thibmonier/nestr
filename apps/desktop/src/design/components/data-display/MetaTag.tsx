import React from "react";

export type MetaTone = "context" | "due" | "days" | "google" | "apple" | "neutral";

export interface MetaTagProps {
  /** Color coding. @default "neutral" */
  tone?: MetaTone;
  /** Optional leading glyph (e.g. ⏱ for due, 📅 for days). */
  icon?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

const TONES: Record<MetaTone, { bg: string; fg: string }> = {
  context: { bg: "var(--tag-context-bg)", fg: "var(--tag-context-fg)" },
  due: { bg: "var(--tag-due-bg)", fg: "var(--tag-due-fg)" },
  days: { bg: "var(--tag-days-bg)", fg: "var(--tag-days-fg)" },
  google: { bg: "var(--cal-google-bg)", fg: "var(--cal-google-fg)" },
  apple: { bg: "var(--cal-apple-bg)", fg: "var(--cal-apple-fg)" },
  neutral: { bg: "var(--surface-sunken)", fg: "var(--text-muted)" },
};

/**
 * Small rounded meta pill used across task rows and timeline blocks:
 * context, due date, allowed days, and calendar source coding.
 */
export function MetaTag({ tone = "neutral", icon, children, style }: MetaTagProps) {
  const t = TONES[tone] ?? TONES.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        borderRadius: "var(--radius-pill)",
        padding: "0.125rem 0.5rem",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--fw-semibold)",
        background: t.bg,
        color: t.fg,
        ...style,
      }}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
