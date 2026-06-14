import React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children?: React.ReactNode;
  wrapperStyle?: React.CSSProperties;
}

/** Chevron bas, inliné en data-URI (currentColor non supporté en background → teinte slate-500). */
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export function Select({ label, children, style, wrapperStyle, ...rest }: SelectProps) {
  const field: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: "var(--text-sm)",
    color: "var(--text-body)",
    background: "transparent",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius-md)",
    padding: "0.5rem 2rem 0.5rem 0.75rem",
    outline: "none",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    backgroundImage: CHEVRON,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.6rem center",
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
      <select
        style={field}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ring)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}
