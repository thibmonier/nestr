import React from "react";
import { Icon } from "../foundation/Icon.js";

export interface TagProps {
  children?: React.ReactNode;
  /** When set, renders a removable ✕. */
  onRemove?: () => void;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/**
 * Project / activity tag — a quiet slate pill prefixed with a tag glyph.
 * Used to associate a task with a project, client or theme. Optionally
 * removable (renders an ✕ that calls onRemove).
 */
export function Tag({ children, onRemove, onClick, style }: TagProps) {
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        background: "var(--surface-sunken)",
        color: "var(--text-muted)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-pill)",
        padding: "0.1rem 0.5rem",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--fw-medium)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      <Icon name="tag" size={11} />
      {children}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label="Retirer le tag"
          style={{ display: "inline-flex", border: "none", background: "transparent", padding: 0, marginLeft: "0.1rem", color: "var(--text-subtle)", cursor: "pointer" }}
        >
          <Icon name="x" size={11} />
        </button>
      )}
    </span>
  );
}
