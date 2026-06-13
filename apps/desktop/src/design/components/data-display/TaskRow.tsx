import React from "react";
import { PriorityBadge, type Priority } from "./PriorityBadge.js";
import { MetaTag } from "./MetaTag.js";
import { Tag } from "./Tag.js";
import { Icon, type IconName } from "../foundation/Icon.js";

export type TaskContext = "pro" | "perso";
export type TaskMode = "video" | "phone" | "action" | "trip";

export interface TaskRowProps {
  title: string;
  /** Struck-through + muted when true. @default false */
  done?: boolean;
  /** @default "medium" */
  priority?: Priority;
  /** Estimated minutes — shown as a clock chip ("1 h 30"). */
  estimatedMin?: number;
  /** Minutes already spent — when > 0 and not done, shows a progress mini-bar. */
  spentMin?: number;
  /** Pro vs perso — shown with a briefcase/user chip. */
  context?: TaskContext;
  /** Completion vector — visio / phone / action / trip; shown as a trailing glyph. */
  mode?: TaskMode;
  /** Free-form project/activity tags. */
  tags?: string[];
  /** Formatted due date, e.g. "15 juin". */
  due?: string;
  /** Allowed-days label, e.g. "Lun–Ven". */
  days?: string;
  onToggle?: () => void;
  /** Opens the edit flow (overflow menu → Modifier). */
  onEdit?: () => void;
  /** Deprioritize / push to later (overflow menu → Reporter à demain). */
  onDefer?: () => void;
  onBreakdown?: () => void;
  onRemove?: () => void;
  /** Make the row a drag source (e.g. backlog → timeline). */
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLLIElement>) => void;
}

const MODE: Record<TaskMode, { icon: IconName; label: string }> = {
  video: { icon: "video", label: "Visio" },
  phone: { icon: "phone", label: "Téléphone" },
  action: { icon: "action", label: "Action" },
  trip: { icon: "trip", label: "Déplacement" },
};

function durationLabel(min?: number | null): string | null {
  if (min == null) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

/**
 * Rich task list row. Beyond the basics it surfaces: pro/perso context,
 * completion mode (visio/phone/action/trip), free-form project tags, an
 * optional time-spent/remaining mini-bar, and an overflow menu
 * (modifier / reporter / découper / supprimer).
 */
export function TaskRow({
  title,
  done = false,
  priority = "medium",
  estimatedMin,
  spentMin,
  context,
  mode,
  tags = [],
  due,
  days,
  onToggle,
  onEdit,
  onDefer,
  onBreakdown,
  onRemove,
  draggable = false,
  onDragStart,
  onDragEnd,
}: TaskRowProps) {
  const [menu, setMenu] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const m = mode ? MODE[mode] : null;
  const ctx = context === "pro" ? { icon: "briefcase" as const, label: "Pro", tone: "neutral" as const }
            : context === "perso" ? { icon: "user" as const, label: "Perso", tone: "context" as const }
            : null;
  const inProgress = !done && spentMin != null && estimatedMin != null && spentMin > 0;
  const pct = inProgress ? Math.min(100, Math.round((spentMin / estimatedMin) * 100)) : 0;
  const remaining = inProgress ? Math.max(0, estimatedMin - spentMin) : null;

  const menuItem = (icon: IconName, label: string, fn?: () => void, danger?: boolean) => (
    <button
      onClick={() => { setMenu(false); fn && fn(); }}
      style={{
        display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%",
        border: "none", background: "transparent", cursor: "pointer", textAlign: "left",
        padding: "0.5rem 0.75rem", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)",
        color: danger ? "var(--danger)" : "var(--text-body)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-sunken)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon name={icon} size={15} /> {label}
    </button>
  );

  return (
    <li
      draggable={draggable || undefined}
      onDragStart={draggable ? onDragStart : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      style={{
        display: "flex", alignItems: "flex-start", gap: "var(--space-3)",
        background: "var(--surface-card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)",
        padding: "0.75rem 0.9rem", listStyle: "none",
        cursor: draggable ? "grab" : "default",
      }}
    >
      <input
        type="checkbox" checked={done} onChange={onToggle}
        style={{ width: "1rem", height: "1rem", marginTop: "0.15rem", accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <p style={{
            margin: 0, flex: 1, minWidth: 0,
            fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)",
            fontWeight: done ? "var(--fw-regular)" : "var(--fw-medium)",
            color: done ? "var(--text-subtle)" : "var(--text-body)",
            textDecoration: done ? "line-through" : "none",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{title}</p>
          {m && (
            <span title={m.label} style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: "1.55rem", height: "1.55rem", borderRadius: "var(--radius-pill)",
              background: "var(--surface-sunken)", color: "var(--text-muted)", flexShrink: 0,
            }}><Icon name={m.icon} size={14} /></span>
          )}
        </div>

        <div style={{ marginTop: "0.4rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-2)" }}>
          <PriorityBadge priority={priority} />
          {ctx && (
            <MetaTag tone={ctx.tone} icon={<Icon name={ctx.icon} size={11} />}>{ctx.label}</MetaTag>
          )}
          {estimatedMin != null && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              <Icon name="clock" size={12} /> {durationLabel(estimatedMin)}
            </span>
          )}
          {due && <MetaTag tone="due" icon={<Icon name="clockArrow" size={11} />}>{due}</MetaTag>}
          {days && <MetaTag tone="days" icon={<Icon name="calendar" size={11} />}>{days}</MetaTag>}
          {tags.map((t) => <Tag key={t}>{t}</Tag>)}
        </div>

        {inProgress && (
          <div style={{ marginTop: "0.55rem", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <div style={{ flex: 1, maxWidth: "12rem", height: "4px", borderRadius: "var(--radius-pill)", background: "var(--surface-sunken)", overflow: "hidden" }}>
              <div style={{ width: pct + "%", height: "100%", background: "var(--accent)" }}></div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-subtle)" }}>
              {durationLabel(spentMin)} passées · {durationLabel(remaining)} restant
            </span>
          </div>
        )}
      </div>

      <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setMenu((v) => !v)} aria-label="Actions"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "1.9rem", height: "1.9rem", border: "none", background: "transparent", borderRadius: "var(--radius-md)", color: "var(--text-subtle)", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-sunken)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        ><Icon name="more" size={18} /></button>
        {menu && (
          <div style={{
            position: "absolute", top: "2.1rem", right: 0, zIndex: 20, minWidth: "13rem",
            background: "var(--surface-card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)", padding: "0.3rem", overflow: "hidden",
          }}>
            {onEdit && menuItem("pencil", "Modifier", onEdit)}
            {onDefer && menuItem("clockArrow", "Reporter à demain", onDefer)}
            {onBreakdown && menuItem("scissors", "Découper (IA)", onBreakdown)}
            {onRemove && <div style={{ height: 1, background: "var(--border)", margin: "0.3rem 0" }}></div>}
            {onRemove && menuItem("trash", "Supprimer", onRemove, true)}
          </div>
        )}
      </div>
    </li>
  );
}
