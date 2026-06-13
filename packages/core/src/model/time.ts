/** Outils de manipulation d'intervalles temporels (epoch ms). */

export interface Interval {
  /** epoch ms inclus. */
  start: number;
  /** epoch ms exclus. */
  end: number;
}

export const MINUTE = 60_000;

export const minutesOf = (i: Interval): number => (i.end - i.start) / MINUTE;

/** Combine "YYYY-MM-DD" + "HH:MM" en epoch ms dans le fuseau local. */
export function atLocal(dateISO: string, hhmm: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0).getTime();
}

export const toISO = (ms: number): string => new Date(ms).toISOString();

/** Fusionne des intervalles qui se chevauchent ou se touchent. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: Interval[] = [{ ...sorted[0]! }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const last = out[out.length - 1]!;
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

/**
 * Soustrait des intervalles occupés d'une plage de travail.
 * Renvoie les créneaux libres triés par ordre chronologique.
 */
export function subtractBusy(workday: Interval, busy: Interval[]): Interval[] {
  const merged = mergeIntervals(
    busy
      .map((b) => ({
        start: Math.max(b.start, workday.start),
        end: Math.min(b.end, workday.end),
      }))
      .filter((b) => b.end > b.start),
  );

  const free: Interval[] = [];
  let cursor = workday.start;
  for (const b of merged) {
    if (b.start > cursor) free.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < workday.end) free.push({ start: cursor, end: workday.end });
  return free;
}
