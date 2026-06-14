import React from "react";

export type SegmentOption = string | { value: string; label: React.ReactNode };

export interface SegmentedControlProps {
  options: SegmentOption[];
  /** Currently selected value. */
  value: string;
  onChange?: (value: string) => void;
  /** @default "md" */
  size?: "sm" | "md";
  style?: React.CSSProperties;
}

export function SegmentedControl({ options, value, onChange, size = "md", style }: SegmentedControlProps) {
  const pad = size === "sm" ? "0.25rem 0.6rem" : "0.35rem 0.8rem";
  const fs = size === "sm" ? "var(--text-xs)" : "var(--text-sm)";
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        gap: "0.15rem",
        background: "var(--surface-sunken)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "0.15rem",
        ...style,
      }}
    >
      {options.map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        const active = v === value;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(v)}
            style={{
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: pad,
              fontFamily: "var(--font-sans)",
              fontSize: fs,
              fontWeight: "var(--fw-medium)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: active ? "var(--surface-card)" : "transparent",
              color: active ? "var(--text-strong)" : "var(--text-muted)",
              boxShadow: active ? "var(--shadow-sm)" : "none",
              transition: "background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
