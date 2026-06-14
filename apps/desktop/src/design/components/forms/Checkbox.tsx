import React from "react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Optional inline label to the right of the box. */
  label?: string;
  wrapperStyle?: React.CSSProperties;
}

export function Checkbox({ label, checked, onChange, style, wrapperStyle, ...rest }: CheckboxProps) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer", ...wrapperStyle }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: "1rem", height: "1rem", accentColor: "var(--accent)", cursor: "pointer", ...style }}
        {...rest}
      />
      {label && <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--text-body)" }}>{label}</span>}
    </label>
  );
}
