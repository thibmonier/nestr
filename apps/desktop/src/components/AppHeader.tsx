/** En-tête condensé : logo, date du jour sélectionné, actions de planification. */
import { Button } from "../design/components/forms/Button.js";
import { IconButton } from "../design/components/forms/IconButton.js";
import { Icon } from "../design/components/foundation/Icon.js";
import { SegmentedControl } from "../design/components/navigation/SegmentedControl.js";
import { todayISO } from "../lib/format.js";
import type { Theme } from "../lib/theme.js";
import nestrMark from "../design/assets/nestr-mark.png";

interface AppHeaderProps {
  showCalendar: boolean;
  onToggleCalendar: () => void;
  selectedDate: string;
  planScope: "jour" | "semaine";
  onPlanScopeChange: (v: "jour" | "semaine") => void;
  pendingCount: number;
  busy: null | "estimate" | "plan";
  aiConfigured: boolean;
  onEstimate: () => void;
  onPlan: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

function dateLabel(selectedDate: string): string {
  const d = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export function AppHeader(props: AppHeaderProps) {
  const {
    showCalendar,
    onToggleCalendar,
    selectedDate,
    planScope,
    onPlanScopeChange,
    pendingCount,
    busy,
    aiConfigured,
    onEstimate,
    onPlan,
    theme,
    onToggleTheme,
    onOpenSettings,
  } = props;

  return (
    <header
      className="px-8 py-5"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-card)" }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconButton
            label={showCalendar ? "Masquer le calendrier" : "Afficher le calendrier"}
            variant="soft"
            onClick={onToggleCalendar}
            style={
              showCalendar
                ? { background: "var(--accent-soft)", color: "var(--accent-text)" }
                : undefined
            }
          >
            <Icon name="calendar" size={18} />
          </IconButton>
          <img src={nestrMark} alt="" width={36} height={36} style={{ borderRadius: "var(--radius-md)" }} />
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ margin: 0, color: "var(--text-strong)" }}>Nestr</h1>
            <p className="text-xs" style={{ margin: 0, color: "var(--text-muted)" }}>
              {dateLabel(selectedDate)}{" "}
              · {selectedDate === todayISO() ? "ton plan du jour" : "plan de ce jour"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            size="sm"
            value={planScope}
            onChange={(v) => onPlanScopeChange(v as "jour" | "semaine")}
            options={[
              { value: "jour", label: "Jour" },
              { value: "semaine", label: "Semaine" },
            ]}
          />
          <span title={!aiConfigured ? "Configure ta clé IA dans les Réglages" : undefined}>
            <Button variant="ghost" onClick={onEstimate} disabled={pendingCount === 0 || busy !== null || !aiConfigured}>
              {busy === "estimate" ? "Estimation…" : "Estimer (IA)"}
            </Button>
          </span>
          <Button variant="primary" size="lg" onClick={onPlan} disabled={pendingCount === 0 || busy !== null}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <Icon name="sparkles" size={15} />
              {busy === "plan" ? "Planification…" : planScope === "semaine" ? "Planifier ma semaine" : "Planifier ma journée"}
            </span>
          </Button>
          <IconButton
            label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
            variant="soft"
            onClick={onToggleTheme}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
          </IconButton>
          <IconButton label="Réglages" variant="soft" onClick={onOpenSettings} disabled={busy !== null}>
            <Icon name="settings" size={16} />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
