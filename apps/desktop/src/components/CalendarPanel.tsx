import { useEffect, useMemo, useState } from "react";
import {
  navUrl,
  type CalendarEvent,
  type PlanningPreferences,
  type TravelOrigin,
} from "@nestr/core";
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
  localEvents,
  prefs,
  onReserveTravel,
  onSelectDate,
  onClose,
}: {
  selectedDate: string;
  /** Événements créés localement (ajout rapide), fusionnés à l'agenda du jour. */
  localEvents: CalendarEvent[];
  prefs: PlanningPreferences;
  /** Réserve un bloc trajet depuis le domicile ou le bureau vers l'événement. */
  onReserveTravel: (event: CalendarEvent, origin: TravelOrigin) => Promise<void>;
  onSelectDate: (iso: string) => void;
  onClose: () => void;
}) {
  const selectedISO = selectedDate;
  const [viewYear, setViewYear] = useState(() => Number(selectedISO.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(selectedISO.slice(5, 7)) - 1);
  const [remoteEvents, setRemoteEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const start = new Date(`${selectedISO}T00:00:00`).toISOString();
    const end = new Date(`${selectedISO}T23:59:59`).toISOString();
    fetchDayEvents(start, end)
      .then((ev) => {
        if (!cancelled) setRemoteEvents(ev);
      })
      .catch(() => {
        if (!cancelled) setRemoteEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedISO]);

  const events = useMemo(() => {
    const start = new Date(`${selectedISO}T00:00:00`).toISOString();
    const end = new Date(`${selectedISO}T23:59:59`).toISOString();
    const local = localEvents.filter((e) => e.start >= start && e.start <= end);
    return [...remoteEvents, ...local].sort((a, b) => a.start.localeCompare(b.start));
  }, [remoteEvents, localEvents, selectedISO]);

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
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {events.map((e) => (
              <EventRow key={e.id} event={e} prefs={prefs} onReserveTravel={onReserveTravel} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

/** Ligne d'agenda : titre, horaire, adresse + actions trajet/itinéraire. */
function EventRow({
  event,
  prefs,
  onReserveTravel,
}: {
  event: CalendarEvent;
  prefs: PlanningPreferences;
  onReserveTravel: (event: CalendarEvent, origin: TravelOrigin) => Promise<void>;
}) {
  const [busy, setBusy] = useState<TravelOrigin | null>(null);
  const dot =
    event.source === "google"
      ? "var(--cal-google-fg)"
      : event.source === "apple"
        ? "var(--cal-apple-fg)"
        : "var(--block-event)";
  const navApp = prefs.navApp?.desktop ?? "apple";
  const home = prefs.locations?.home?.trim();
  const office = prefs.locations?.office?.trim();

  async function reserve(origin: TravelOrigin) {
    setBusy(origin);
    try {
      await onReserveTravel(event, origin);
    } finally {
      setBusy(null);
    }
  }

  const link: React.CSSProperties = {
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    fontSize: "var(--text-2xs)",
    fontWeight: "var(--fw-medium)",
    color: "var(--accent-text)",
  };

  return (
    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-start" }}>
      <span style={{ marginTop: "0.3rem", width: 8, height: 8, borderRadius: "var(--radius-pill)", background: dot, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-body)", fontWeight: "var(--fw-medium)" }}>{event.title}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-subtle)" }}>
          {event.allDay ? "Journée" : `${hhmm(event.start)} – ${hhmm(event.end)}`}
        </div>
        {event.location ? (
          <>
            <div style={{ display: "flex", gap: "0.3rem", alignItems: "flex-start", marginTop: "0.2rem", fontSize: "var(--text-2xs)", color: "var(--text-subtle)" }}>
              <Icon name="trip" size={11} />
              <span style={{ minWidth: 0 }}>{event.location}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", marginTop: "0.35rem", alignItems: "center" }}>
              <a href={navUrl(navApp, event.location)} target="_blank" rel="noreferrer" style={{ ...link, textDecoration: "none" }}>
                Itinéraire
              </a>
              {home ? (
                <button style={link} disabled={busy !== null} onClick={() => reserve("home")}>
                  {busy === "home" ? "…" : "Trajet (domicile)"}
                </button>
              ) : null}
              {office ? (
                <button style={link} disabled={busy !== null} onClick={() => reserve("office")}>
                  {busy === "office" ? "…" : "Trajet (bureau)"}
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
