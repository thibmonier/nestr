/** Plan du jour : ordonnancement local (scheduleDay) + conseils IA optionnels. */
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  buildReminders,
  scheduleDay,
  type CalendarEvent,
  type DailyPlan,
  type ParsedEntry,
  type PlanningPreferences,
  type Task,
  type TimeBlock,
} from "@nestr/core";
import { Button, Card, EmptyState, Segmented } from "../components/ui";
import { QuickAdd } from "../components/QuickAdd";
import { advise, parseQuickAdd, type PlanAdvice } from "../lib/ai";
import { fetchDayEvents } from "../lib/calendars";
import { syncReminders } from "../lib/notifications";
import { dayLabel, durationLabel, hhmm, todayISO } from "../lib/format";
import { useTheme, type Palette } from "../theme";

function blockColor(p: ReturnType<typeof useTheme>["palette"], b: TimeBlock): string {
  if (b.kind === "event") return p.blockEvent;
  if (b.kind === "break") return p.textSubtle;
  return p.blockTask;
}

/** Pictogramme texte du vecteur de réalisation (pas d'icônes sur mobile). */
const MODE_GLYPH: Record<string, string> = {
  video: "📹",
  phone: "📞",
  trip: "🚗",
  action: "●",
};

/** Minutes depuis minuit (heure locale) d'un datetime ISO. */
function minutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

const PX_PER_MIN = 1.1;
const MIN_BLOCK_H = 30;

/** Timeline verticale proportionnelle : hauteur de bloc ∝ durée, ligne « maintenant ». */
function ProportionalTimeline({
  blocks,
  date,
  p,
}: {
  blocks: TimeBlock[];
  date: string;
  p: Palette;
}) {
  const starts = blocks.map((b) => minutesOfDay(b.start));
  const ends = blocks.map((b) => minutesOfDay(b.end));
  const dayStart = Math.min(8 * 60, ...starts);
  const dayEnd = Math.max(19 * 60, ...ends);
  const height = (dayEnd - dayStart) * PX_PER_MIN;

  const firstHour = Math.floor(dayStart / 60);
  const lastHour = Math.ceil(dayEnd / 60);
  const hours: number[] = [];
  for (let h = firstHour; h <= lastHour; h++) hours.push(h);

  const now = new Date();
  const isToday = date === todayISO();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = isToday && nowMin >= dayStart && nowMin <= dayEnd;

  const GUTTER = 46;
  return (
    <View style={{ height, marginTop: 4 }}>
      {hours.map((h) => {
        const top = (h * 60 - dayStart) * PX_PER_MIN;
        return (
          <View key={h} style={[styles.hourRow, { top }]}>
            <Text style={[styles.hourLabel, { color: p.textSubtle }]}>
              {String(h).padStart(2, "0")}:00
            </Text>
            <View style={[styles.hourLine, { backgroundColor: p.border }]} />
          </View>
        );
      })}

      {blocks.map((b, i) => {
        const top = (minutesOfDay(b.start) - dayStart) * PX_PER_MIN;
        const h = Math.max(MIN_BLOCK_H, (minutesOfDay(b.end) - minutesOfDay(b.start)) * PX_PER_MIN);
        const accent = blockColor(p, b);
        return (
          <View
            key={i}
            style={[
              styles.propBlock,
              {
                top,
                height: h,
                left: GUTTER,
                backgroundColor: p.card,
                borderColor: p.border,
                borderLeftColor: accent,
              },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.propTitle, { color: p.textStrong }]} numberOfLines={1}>
                {b.title}
              </Text>
              <Text style={[styles.propTime, { color: p.textMuted }]}>
                {hhmm(b.start)}–{hhmm(b.end)}
              </Text>
            </View>
            {b.mode ? <Text style={styles.propMode}>{MODE_GLYPH[b.mode] ?? "●"}</Text> : null}
          </View>
        );
      })}

      {showNow ? (
        <View style={[styles.nowLine, { top: (nowMin - dayStart) * PX_PER_MIN }]}>
          <View style={[styles.nowDot, { backgroundColor: p.danger }]} />
          <View style={[styles.nowBar, { backgroundColor: p.danger }]} />
        </View>
      ) : null}
    </View>
  );
}

export function PlanScreen({
  tasks,
  preferences,
  aiConfigured,
  localEvents = [],
  onQuickAdd,
}: {
  tasks: Task[];
  preferences: PlanningPreferences;
  aiConfigured: boolean;
  /** Événements créés localement (ajout rapide), fusionnés au plan du jour. */
  localEvents?: CalendarEvent[];
  /** Validation de l'ajout rapide IA (crée tâche ou événement côté parent). */
  onQuickAdd?: (entry: ParsedEntry) => void;
}) {
  const { palette: p } = useTheme();
  const date = todayISO();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<PlanAdvice | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"proportional" | "compact">("proportional");

  const compute = useCallback(async () => {
    setLoading(true);
    setError(null);
    const start = `${date}T00:00:00`;
    const end = `${date}T23:59:59`;
    let events: CalendarEvent[] = [];
    try {
      events = await fetchDayEvents(start, end);
    } catch {
      events = [];
    }
    const startISO = new Date(start).toISOString();
    const endISO = new Date(end).toISOString();
    events = [
      ...events,
      ...localEvents.filter((e) => e.start >= startISO && e.start <= endISO),
    ];
    const result = scheduleDay({
      date,
      tasks: tasks.filter((t) => t.status !== "done"),
      events,
      preferences,
      now: Date.now(),
    });
    setPlan(result);
    setLoading(false);
    // Reprogramme les rappels locaux (5 min avant chaque tâche/événement).
    void syncReminders(buildReminders(result, { now: Date.now(), leadMinutes: 5 }));
  }, [date, tasks, preferences, localEvents]);

  useEffect(() => {
    void compute();
  }, [compute]);

  async function runAdvise() {
    if (!plan) return;
    setAdviceLoading(true);
    setError(null);
    try {
      const a = await advise(
        tasks.filter((t) => t.status !== "done"),
        plan.availableMinutes,
      );
      setAdvice(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur IA");
    } finally {
      setAdviceLoading(false);
    }
  }

  const blocks = plan?.blocks ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={compute} tintColor={p.accent} />
      }
    >
      {onQuickAdd ? (
        <QuickAdd aiConfigured={aiConfigured} onParse={parseQuickAdd} onConfirm={onQuickAdd} />
      ) : null}

      <View style={{ gap: 4 }}>
        <Text style={[styles.day, { color: p.textStrong }]}>{dayLabel(date)}</Text>
        {plan ? (
          <Text style={{ color: p.textMuted, fontSize: 13 }}>
            {durationLabel(plan.availableMinutes)} disponibles ·{" "}
            {blocks.filter((b) => b.kind === "task").length} tâches placées
          </Text>
        ) : null}
      </View>

      {blocks.length > 0 ? (
        <Segmented
          options={[
            { value: "proportional", label: "Proportionnel" },
            { value: "compact", label: "Compact" },
          ]}
          value={view}
          onChange={setView}
        />
      ) : null}

      {aiConfigured ? (
        <Button
          label={adviceLoading ? "Analyse…" : "Conseils IA pour la journée"}
          variant="ghost"
          onPress={runAdvise}
          loading={adviceLoading}
        />
      ) : (
        <Card style={{ backgroundColor: p.warnBg, borderColor: p.warnBorder }}>
          <Text style={{ color: p.warnFg, fontSize: 13 }}>
            Ajoute ta clé IA dans Réglages pour activer les conseils.
          </Text>
        </Card>
      )}

      {error ? (
        <Text style={{ color: p.danger, fontSize: 13 }}>{error}</Text>
      ) : null}

      {advice ? (
        <Card style={{ backgroundColor: p.accentSoft, borderColor: p.border }}>
          <Text style={{ color: p.accentText, fontWeight: "700", marginBottom: 6 }}>
            {advice.summary}
          </Text>
          {advice.tips.map((tip, i) => (
            <Text key={i} style={{ color: p.textBody, fontSize: 13, marginBottom: 4 }}>
              • {tip}
            </Text>
          ))}
        </Card>
      ) : null}

      {loading && !plan ? (
        <ActivityIndicator color={p.accent} style={{ marginTop: 32 }} />
      ) : blocks.length === 0 ? (
        <EmptyState
          title="Rien à planifier"
          hint="Ajoute des tâches, puis tire pour rafraîchir."
        />
      ) : view === "proportional" ? (
        <ProportionalTimeline blocks={blocks} date={date} p={p} />
      ) : (
        <View style={{ gap: 8 }}>
          {blocks.map((b, i) => (
            <View
              key={i}
              style={[styles.block, { backgroundColor: p.card, borderColor: p.border }]}
            >
              <View style={[styles.dot, { backgroundColor: blockColor(p, b) }]} />
              <Text style={[styles.time, { color: p.textMuted }]}>
                {hhmm(b.start)}
              </Text>
              <Text style={[styles.blockTitle, { color: p.textStrong }]} numberOfLines={1}>
                {b.title}
              </Text>
              {b.mode ? <Text style={{ fontSize: 13 }}>{MODE_GLYPH[b.mode] ?? "●"}</Text> : null}
            </View>
          ))}
        </View>
      )}

      {plan && plan.unscheduled.length > 0 ? (
        <View style={{ gap: 6, marginTop: 8 }}>
          <Text style={{ color: p.textMuted, fontSize: 13, fontWeight: "600" }}>
            Non placées ({plan.unscheduled.length})
          </Text>
          {plan.unscheduled.map((u) => (
            <Text key={u.task.id} style={{ color: p.textSubtle, fontSize: 13 }}>
              • {u.task.title}
            </Text>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  day: { fontSize: 20, fontWeight: "700", textTransform: "capitalize" },
  block: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  time: { fontSize: 13, fontVariant: ["tabular-nums"], width: 48 },
  blockTitle: { fontSize: 15, fontWeight: "600", flex: 1 },
  hourRow: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 6 },
  hourLabel: { fontSize: 11, width: 40, fontVariant: ["tabular-nums"] },
  hourLine: { flex: 1, height: StyleSheet.hairlineWidth },
  propBlock: {
    position: "absolute",
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    overflow: "hidden",
  },
  propTitle: { fontSize: 14, fontWeight: "600" },
  propTime: { fontSize: 11, fontVariant: ["tabular-nums"], marginTop: 1 },
  propMode: { fontSize: 14 },
  nowLine: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center" },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  nowBar: { flex: 1, height: 2 },
});
