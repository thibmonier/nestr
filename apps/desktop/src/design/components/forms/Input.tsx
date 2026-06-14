import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Caption shown above the field. */
  label?: string;
  /** Small helper text below the field. */
  hint?: string;
  wrapperStyle?: React.CSSProperties;
}

export function Input({ label, hint, style, wrapperStyle, ...rest }: InputProps) {
  const field: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: "var(--text-sm)",
    color: "var(--text-body)",
    background: "transparent",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius-md)",
    padding: "0.5rem 0.75rem",
    outline: "none",
    transition: "border-color var(--dur-base) var(--ease-standard)",
    ...style,
  };
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", ...wrapperStyle }}>
      {label && (
        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--fw-medium)", color: "var(--text-muted)" }}>
          {label}
        </span>
      )}
      <input
        style={field}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ring)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
        {...rest}
      />
      {hint && <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-subtle)" }}>{hint}</span>}
    </label>
  );
}
