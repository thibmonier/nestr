/** Calendrier : mini-mois navigable + agenda du jour (events locaux + connecteurs). */
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { CalendarEvent } from "@nestr/core";
import { EmptyState } from "../components/ui";
import { fetchDayEvents } from "../lib/calendars";
import { hhmm, todayISO } from "../lib/format";
import { useTheme, type Palette } from "../theme";

const WD = ["L", "M", "M", "J", "V", "S", "D"];
const pad2 = (n: number) => String(n).padStart(2, "0");

function dotColor(p: Palette, source: CalendarEvent["source"]): string {
  if (source === "local") return p.blockEvent;
  return p.accent;
}

export function CalendarScreen({ localEvents }: { localEvents: CalendarEvent[] }) {
  const { palette: p } = useTheme();
  const today = todayISO();
  const [selectedISO, setSelectedISO] = useState(today);
  const [viewYear, setViewYear] = useState(() => Number(today.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(today.slice(5, 7)) - 1);
  const [remote, setRemote] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDayEvents(`${selectedISO}T00:00:00`, `${selectedISO}T23:59:59`)
      .then((ev) => {
        if (!cancelled) setRemote(ev);
      })
      .catch(() => {
        if (!cancelled) setRemote([]);
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
    return [...remote, ...local].sort((a, b) => a.start.localeCompare(b.start));
  }, [remote, localEvents, selectedISO]);

  function shiftMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  const firstWeekdayMon = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekdayMon; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const cellISO = (d: number) => `${viewYear}-${pad2(viewMonth + 1)}-${pad2(d)}`;

  const selLabel =
    selectedISO === today
      ? "aujourd'hui"
      : new Date(`${selectedISO}T12:00:00`).toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.monthHeader}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={10}>
          <Text style={[styles.nav, { color: p.textMuted }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: p.textStrong }]}>{monthLabel}</Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={10}>
          <Text style={[styles.nav, { color: p.textMuted }]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WD.map((d, i) => (
          <View key={`wd${i}`} style={styles.cell}>
            <Text style={[styles.wd, { color: p.textSubtle }]}>{d}</Text>
          </View>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={styles.cell} />;
          const iso = cellISO(d);
          const isSelected = iso === selectedISO;
          const isToday = iso === today;
          return (
            <Pressable
              key={iso}
              onPress={() => setSelectedISO(iso)}
              style={styles.cell}
            >
              <View
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: p.accent },
                  !isSelected && isToday && { borderColor: p.accent, borderWidth: 1 },
                ]}
              >
                <Text
                  style={{
                    color: isSelected ? p.onAccent : p.textBody,
                    fontWeight: isSelected || isToday ? "700" : "400",
                    fontSize: 13,
                  }}
                >
                  {d}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.agendaTitle, { color: p.textSubtle }]}>
        AGENDA — {selLabel.toUpperCase()}
      </Text>

      {loading ? (
        <ActivityIndicator color={p.accent} style={{ marginTop: 16 }} />
      ) : events.length === 0 ? (
        <EmptyState title="Aucun événement" hint="Rien de prévu ce jour-là." />
      ) : (
        <View style={{ gap: 10 }}>
          {events.map((e) => (
            <View key={e.id} style={styles.eventRow}>
              <View style={[styles.eventDot, { backgroundColor: dotColor(p, e.source) }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.eventTitle, { color: p.textStrong }]}>{e.title}</Text>
                <Text style={[styles.eventTime, { color: p.textSubtle }]}>
                  {e.allDay ? "Journée" : `${hhmm(e.start)} – ${hhmm(e.end)}`}
                  {e.location ? ` · ${e.location}` : ""}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthLabel: { fontSize: 16, fontWeight: "700", textTransform: "capitalize" },
  nav: { fontSize: 28, fontWeight: "600", paddingHorizontal: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, alignItems: "center", paddingVertical: 3 },
  wd: { fontSize: 11, fontVariant: ["tabular-nums"] },
  dayCell: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  agendaTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  eventRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  eventTitle: { fontSize: 15, fontWeight: "600" },
  eventTime: { fontSize: 12, marginTop: 2, fontVariant: ["tabular-nums"] },
});
