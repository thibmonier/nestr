import React from "react";

export type ButtonVariant = "primary" | "secondary" | "accent" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. `primary` = filled indigo CTA. @default "primary" */
  variant?: ButtonVariant;
  /** @default "md" */
  size?: ButtonSize;
  children?: React.ReactNode;
}

const SIZES: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: "0.375rem 0.75rem", fontSize: "var(--text-xs)" },
  md: { padding: "0.625rem 1rem", fontSize: "var(--text-sm)" },
  lg: { padding: "0.625rem 1.25rem", fontSize: "var(--text-sm)" },
};

const VARIANTS: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "var(--accent)",
    color: "var(--text-on-accent)",
    border: "1px solid transparent",
    boxShadow: "var(--shadow)",
  },
  secondary: {
    background: "transparent",
    color: "var(--text-muted)",
    border: "1px solid var(--border-strong)",
  },
  accent: {
    background: "transparent",
    color: "var(--accent-text)",
    border: "1px solid var(--indigo-300)",
  },
  ghost: {
    background: "transparent",
    color: "var(--accent-text)",
    border: "1px solid transparent",
  },
};

/** Primary action button for Nestr. */
export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  onClick,
  style,
  ...rest
}: ButtonProps) {
  const base: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontWeight: variant === "primary" || variant === "accent" ? "var(--fw-semibold)" : "var(--fw-medium)",
    borderRadius: "var(--radius-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "background var(--dur-base) var(--ease-standard), color var(--dur-base) var(--ease-standard)",
    lineHeight: 1,
    whiteSpace: "nowrap",
    ...SIZES[size],
    ...VARIANTS[variant],
    ...style,
  };

  return (
    <button type={type} disabled={disabled} onClick={onClick} style={base} {...rest}>
      {children}
    </button>
  );
}
