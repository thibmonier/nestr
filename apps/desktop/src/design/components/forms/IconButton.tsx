import React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label (sets aria-label). */
  label: string;
  /** @default "ghost" */
  variant?: "ghost" | "soft";
  children?: React.ReactNode;
}

const VARIANTS: Record<"ghost" | "soft", React.CSSProperties> = {
  ghost: { background: "transparent", color: "var(--text-subtle)" },
  soft: { background: "var(--surface-sunken)", color: "var(--text-muted)" },
};

export function IconButton({ children, label, variant = "ghost", onClick, style, ...rest }: IconButtonProps) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2rem",
    height: "2rem",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontFamily: "var(--font-sans)",
    fontSize: "var(--text-sm)",
    cursor: "pointer",
    transition: "background var(--dur-base) var(--ease-standard), color var(--dur-base) var(--ease-standard)",
    ...VARIANTS[variant],
    ...style,
  };
  return (
    <button type="button" aria-label={label} onClick={onClick} style={base} {...rest}>
      {children}
    </button>
  );
}
