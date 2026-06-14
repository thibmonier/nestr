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
  type PlanningPreferences,
  type Task,
  type TimeBlock,
} from "@nestr/core";
import { Button, Card, EmptyState } from "../components/ui";
import { advise, type PlanAdvice } from "../lib/ai";
import { fetchDayEvents } from "../lib/calendars";
import { syncReminders } from "../lib/notifications";
import { dayLabel, durationLabel, hhmm, todayISO } from "../lib/format";
import { useTheme } from "../theme";

function blockColor(p: ReturnType<typeof useTheme>["palette"], b: TimeBlock): string {
  if (b.kind === "event") return p.blockEvent;
  if (b.kind === "break") return p.textSubtle;
  return p.blockTask;
}

export function PlanScreen({
  tasks,
  preferences,
  aiConfigured,
}: {
  tasks: Task[];
  preferences: PlanningPreferences;
  aiConfigured: boolean;
}) {
  const { palette: p } = useTheme();
  const date = todayISO();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<PlanAdvice | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback(async () => {
    setLoading(true);
    setError(null);
    let events: CalendarEvent[] = [];
    try {
      events = await fetchDayEvents(`${date}T00:00:00`, `${date}T23:59:59`);
    } catch {
      events = [];
    }
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
  }, [date, tasks, preferences]);

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
      <View style={{ gap: 4 }}>
        <Text style={[styles.day, { color: p.textStrong }]}>{dayLabel(date)}</Text>
        {plan ? (
          <Text style={{ color: p.textMuted, fontSize: 13 }}>
            {durationLabel(plan.availableMinutes)} disponibles ·{" "}
            {blocks.filter((b) => b.kind === "task").length} tâches placées
          </Text>
        ) : null}
      </View>

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
});
