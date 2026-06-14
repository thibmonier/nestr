/** Liste des tâches : filtre, recherche, toggle, édition, suppression. */
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Task } from "@nestr/core";
import { Badge, EmptyState, Field, prioStyle, Segmented } from "../components/ui";
import { durationLabel } from "../lib/format";
import { useTheme } from "../theme";

const PRIO_LABEL: Record<string, string> = {
  urgent: "Urgent",
  high: "Haute",
  medium: "Moyenne",
  low: "Basse",
};

export function TasksScreen({
  tasks,
  onToggle,
  onEdit,
  onRemove,
}: {
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onRemove: (id: string) => void;
}) {
  const { palette: p } = useTheme();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "pro" | "perso">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (filter !== "all" && (t.context ?? "") !== filter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [tasks, query, filter]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Field
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher une tâche…"
        autoCapitalize="none"
      />
      <Segmented
        options={[
          { value: "all", label: "Toutes" },
          { value: "pro", label: "Pro" },
          { value: "perso", label: "Perso" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucune tâche"
          hint="Appuie sur + pour en ajouter une."
        />
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map((t) => {
            const done = t.status === "done";
            const ps = prioStyle(p, t.priority);
            return (
              <Pressable
                key={t.id}
                onPress={() => onEdit(t)}
                style={[
                  styles.row,
                  { backgroundColor: p.card, borderColor: p.border },
                ]}
              >
                <Pressable
                  onPress={() => onToggle(t.id)}
                  hitSlop={8}
                  style={[
                    styles.check,
                    {
                      borderColor: done ? p.accent : p.borderStrong,
                      backgroundColor: done ? p.accent : "transparent",
                    },
                  ]}
                >
                  {done ? (
                    <Text style={{ color: p.onAccent, fontSize: 13, fontWeight: "700" }}>
                      ✓
                    </Text>
                  ) : null}
                </Pressable>

                <View style={{ flex: 1, gap: 6 }}>
                  <Text
                    style={[
                      styles.rowTitle,
                      {
                        color: done ? p.textSubtle : p.textStrong,
                        textDecorationLine: done ? "line-through" : "none",
                      },
                    ]}
                  >
                    {t.title}
                  </Text>
                  <View style={styles.tags}>
                    <Badge text={PRIO_LABEL[t.priority] ?? t.priority} bg={ps.bg} fg={ps.fg} />
                    {t.context ? (
                      <Badge text={t.context} bg={p.tagContext.bg} fg={p.tagContext.fg} />
                    ) : null}
                    {t.estimatedMinutes ? (
                      <Badge
                        text={durationLabel(t.estimatedMinutes)}
                        bg={p.sunken}
                        fg={p.textMuted}
                      />
                    ) : null}
                    {t.dueDate ? (
                      <Badge
                        text={t.dueDate.slice(0, 10)}
                        bg={p.tagDue.bg}
                        fg={p.tagDue.fg}
                      />
                    ) : null}
                  </View>
                </View>

                <Pressable onPress={() => onRemove(t.id)} hitSlop={8}>
                  <Text style={{ color: p.textSubtle, fontSize: 20 }}>🗑</Text>
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
