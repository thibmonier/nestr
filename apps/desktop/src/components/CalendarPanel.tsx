import { useEffect, useState } from "react";
import type { CalendarEvent } from "@nestr/core";
import { fetchDayEvents } from "../lib/calendars.js";
import { hhmm, todayISO } from "../lib/format.js";
import { Icon } from "../design/components/foundation/Icon.js";
import { IconButton } from "../design/components/forms/IconButton.js";

const WD = ["L", "M", "M", "J", "V", "S", "D"];
const pad2 = (n: number) => String(n).padStart(2, "0");

/** Volet latéral repliable : mini-calendrier navigable + agenda du jour sélectionné.
 *  `selectedDate` est piloté par le parent (sync avec la vue principale). */
export function CalendarPanel({
  selectedDate,
  onSelectDate,
  onClose,
}: {
  selectedDate: string;
  onSelectDate: (iso: string) => void;
  onClose: () => void;
}) {
  const selectedISO = selectedDate;
  const [viewYear, setViewYear] = useState(() => Number(selectedISO.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(selectedISO.slice(5, 7)) - 1);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Recharge les événements quand le jour sélectionné change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const start = new Date(`${selectedISO}T00:00:00`).toISOString();
    const end = new Date(`${selectedISO}T23:59:59`).toISOString();
    fetchDayEvents(start, end)
      .then((ev) => {
        if (!cancelled) setEvents(ev.slice().sort((a, b) => a.start.localeCompare(b.start)));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedISO]);

  function shiftMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const firstWeekdayMon = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekdayMon; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const cellISO = (d: number) => `${viewYear}-${pad2(viewMonth + 1)}-${pad2(d)}`;

  const today = todayISO();
  const selLabel =
    selectedISO === today
      ? "aujourd'hui"
      : new Date(`${selectedISO}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <aside
      style={{
        width: 300,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        background: "var(--surface-card)",
        borderRight: "1px solid var(--border)",
        padding: "var(--space-5)",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
        <IconButton label="Mois précédent" onClick={() => shiftMonth(-1)}>
          <Icon name="chevron-left" size={18} />
        </IconButton>
        <div style={{ flex: 1, textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", fontWeight: "var(--fw-bold)", color: "var(--text-strong)", textTransform: "capitalize", fontSize: "var(--text-sm)" }}>
          <Icon name="calendar" size={15} /> {monthLabel}
        </div>
        <IconButton label="Mois suivant" onClick={() => shiftMonth(1)}>
          <Icon name="chevron-right" size={18} />
        </IconButton>
        <IconButton label="Fermer le calendrier" onClick={onClose}>
          <Icon name="x" size={16} />
        </IconButton>
      </div>

      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px", marginBottom: 4 }}>
          {WD.map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-subtle)" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px" }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const iso = cellISO(d);
            const isSelected = iso === selectedISO;
            const isToday = iso === today;
            return (
              <button
                key={i}
                onClick={() => onSelectDate(iso)}
                aria-label={iso}
                style={{
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: isToday && !isSelected ? "1px solid var(--accent)" : "1px solid transparent",
                  fontSize: "var(--text-xs)",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  fontWeight: isSelected || isToday ? "var(--fw-bold)" : "var(--fw-regular)",
                  background: isSelected ? "var(--accent)" : "transparent",
                  color: isSelected ? "var(--text-on-accent)" : "var(--text-body)",
                  transition: "background var(--dur-fast) var(--ease-standard)",
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-subtle)" }}>
          Agenda — {selLabel}
        </h3>
        {loading ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>Chargement…</p>
        ) : events.length === 0 ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>Aucun événement.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {events.map((e) => (
              <div key={e.id} style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-start" }}>
                <span style={{ marginTop: "0.3rem", width: 8, height: 8, borderRadius: "var(--radius-pill)", background: e.source === "google" ? "var(--cal-google-fg)" : "var(--cal-apple-fg)", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--text-body)", fontWeight: "var(--fw-medium)" }}>{e.title}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-subtle)" }}>
                    {e.allDay ? "Journée" : `${hhmm(e.start)} – ${hhmm(e.end)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
