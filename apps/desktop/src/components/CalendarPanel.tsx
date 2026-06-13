import { useEffect, useState } from "react";
import type { CalendarEvent } from "@nestr/core";
import { fetchDayEvents } from "../lib/calendars.js";
import { hhmm, todayISO } from "../lib/format.js";
import { Icon } from "../design/components/foundation/Icon.js";
import { IconButton } from "../design/components/forms/IconButton.js";

const WD = ["L", "M", "M", "J", "V", "S", "D"];

/** Volet latéral repliable : mini-calendrier du mois + agenda du jour. */
export function CalendarPanel({ onClose }: { onClose: () => void }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    const d = todayISO();
    const start = new Date(`${d}T00:00:00`).toISOString();
    const end = new Date(`${d}T23:59:59`).toISOString();
    fetchDayEvents(start, end)
      .then((ev) => {
        if (!cancelled) setEvents(ev.slice().sort((a, b) => a.start.localeCompare(b.start)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstWeekdayMon = (new Date(year, month, 1).getDay() + 6) % 7; // Lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekdayMon; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "var(--fw-bold)", color: "var(--text-strong)", textTransform: "capitalize" }}>
          <Icon name="calendar" size={16} /> {monthLabel}
        </div>
        <IconButton label="Fermer le calendrier" onClick={onClose}>
          <Icon name="chevron-left" size={18} />
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
            const isToday = d === today;
            return (
              <div
                key={i}
                style={{
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--text-xs)",
                  borderRadius: "var(--radius-md)",
                  fontWeight: isToday ? "var(--fw-bold)" : "var(--fw-regular)",
                  background: isToday ? "var(--accent)" : "transparent",
                  color: isToday ? "var(--text-on-accent)" : d ? "var(--text-body)" : "transparent",
                }}
              >
                {d ?? ""}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-subtle)" }}>
          Agenda — aujourd'hui
        </h3>
        {events.length === 0 ? (
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
