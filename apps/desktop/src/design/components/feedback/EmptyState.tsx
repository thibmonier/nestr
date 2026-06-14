import React from "react";

export interface EmptyStateProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function EmptyState({ children, style }: EmptyStateProps) {
  return (
    <p
      style={{
        margin: 0,
        border: "1px dashed var(--border-strong)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
        textAlign: "center",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        color: "var(--text-subtle)",
        ...style,
      }}
    >
      {children}
    </p>
  );
}
