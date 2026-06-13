import type { CalendarEvent, CalendarSource } from "@nestr/core";

/** Décalage (ms) du fuseau `tz` à l'instant `utcMs`. */
function tzOffsetAt(utcMs: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const m: Record<string, number> = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) {
    if (p.type !== "literal") m[p.type] = Number(p.value);
  }
  const asUTC = Date.UTC(
    m.year!,
    m.month! - 1,
    m.day!,
    (m.hour ?? 0) % 24,
    m.minute ?? 0,
    m.second ?? 0,
  );
  return asUTC - utcMs;
}

/** Convertit une heure locale (fuseau `tz`) en epoch ms UTC. */
function zonedToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  tz: string,
): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  return guess - tzOffsetAt(guess, tz);
}

/** Parse une valeur DTSTART/DTEND iCal → epoch ms. `params` = "TZID=...;VALUE=DATE". */
function parseDate(value: string, params: string): number {
  const tzid = /TZID=([^;:]+)/.exec(params)?.[1];
  const isDate = /VALUE=DATE(?![-])/.test(params) || /^\d{8}$/.test(value);

  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?$/.exec(value);
  if (!m) return NaN;
  const [, y, mo, d, hh, mm, ss, z] = m;
  const Y = +y!,
    Mo = +mo!,
    D = +d!,
    H = +(hh ?? "0"),
    Mi = +(mm ?? "0"),
    S = +(ss ?? "0");

  if (isDate) return Date.UTC(Y, Mo - 1, D);
  if (z) return Date.UTC(Y, Mo - 1, D, H, Mi, S);
  if (tzid) {
    try {
      return zonedToUtc(Y, Mo, D, H, Mi, S, tzid);
    } catch {
      /* fuseau inconnu → repli UTC */
    }
  }
  return Date.UTC(Y, Mo - 1, D, H, Mi, S);
}

/** Déplie les lignes iCal (continuation = ligne suivante commençant par espace/tab). */
function unfold(ics: string): string[] {
  return ics
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

/**
 * Parse un flux iCalendar et renvoie les VEVENT normalisés.
 * Les événements transparents ou annulés sont marqués `busy: false`.
 */
export function parseICal(
  ics: string,
  source: CalendarSource,
  calendarId: string,
): CalendarEvent[] {
  const lines = unfold(ics);
  const events: CalendarEvent[] = [];
  let cur: Record<string, { value: string; params: string }> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) events.push(...toEvent(cur, source, calendarId));
      cur = null;
      continue;
    }
    if (!cur) continue;

    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const left = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const semi = left.indexOf(";");
    const key = (semi < 0 ? left : left.slice(0, semi)).toUpperCase();
    const params = semi < 0 ? "" : left.slice(semi + 1);
    cur[key] = { value, params };
  }
  return events;
}

function toEvent(
  ev: Record<string, { value: string; params: string }>,
  source: CalendarSource,
  calendarId: string,
): CalendarEvent[] {
  const dtstart = ev["DTSTART"];
  const dtend = ev["DTEND"];
  if (!dtstart) return [];

  const start = parseDate(dtstart.value, dtstart.params);
  const end = dtend
    ? parseDate(dtend.value, dtend.params)
    : start + 30 * 60_000;
  if (Number.isNaN(start) || Number.isNaN(end)) return [];

  const status = ev["STATUS"]?.value?.toUpperCase();
  const transp = ev["TRANSP"]?.value?.toUpperCase();
  const allDay = /VALUE=DATE(?![-])/.test(dtstart.params) || /^\d{8}$/.test(dtstart.value);

  return [
    {
      id: ev["UID"]?.value ?? `${source}-${start}`,
      source,
      calendarId,
      title: ev["SUMMARY"]?.value ?? "(sans titre)",
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      allDay,
      busy: status !== "CANCELLED" && transp !== "TRANSPARENT",
    },
  ];
}
