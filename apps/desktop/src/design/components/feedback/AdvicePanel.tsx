import React from "react";

export interface AdvicePanelProps {
  /** One-sentence strategy summary, shown bold. */
  summary: string;
  /** Ordered tips rendered as a bullet list. */
  tips?: string[];
  style?: React.CSSProperties;
}

/** AI plan-advice panel. */
export function AdvicePanel({ summary, tips = [], style }: AdvicePanelProps) {
  return (
    <div
      style={{
        background: "var(--accent-soft)",
        border: "1px solid var(--accent-soft-2)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-4)",
        ...style,
      }}
    >
      <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--fw-semibold)", color: "var(--accent-press)" }}>
        {summary}
      </p>
      {tips.length > 0 && (
        <ul style={{ margin: "var(--space-2) 0 0", paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {tips.map((tip, i) => (
            <li key={i} style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--accent-text)" }}>
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
