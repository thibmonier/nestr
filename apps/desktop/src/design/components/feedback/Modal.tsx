import React from "react";
import { IconButton } from "../forms/IconButton.js";
import { Icon } from "../foundation/Icon.js";

export interface ModalProps {
  title: string;
  /** Close handler — clicking the scrim or the ✕ calls this. */
  onClose?: () => void;
  children?: React.ReactNode;
  /** Optional footer area (actions). */
  footer?: React.ReactNode;
  /** @default "42rem" */
  maxWidth?: string;
}

/**
 * Centered modal dialog over a scrim. Header (title + close) and a body
 * slot. Matches the Settings / Breakdown modals in the app.
 */
export function Modal({ title, onClose, children, footer, maxWidth = "42rem" }: ModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        background: "var(--overlay-scrim)",
        padding: "var(--space-6)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth,
          background: "var(--surface-card)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          padding: "var(--space-6)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: "var(--text-lg)", fontWeight: "var(--fw-bold)", color: "var(--text-strong)" }}>
            {title}
          </h2>
          {onClose && (
            <IconButton label="Fermer" onClick={onClose}>
              <Icon name="x" size={16} />
            </IconButton>
          )}
        </div>
        {children}
        {footer && <div style={{ marginTop: "var(--space-5)" }}>{footer}</div>}
      </div>
    </div>
  );
}
