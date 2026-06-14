/** Liste des tâches : filtre, recherche, toggle, édition, suppression. */
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Task } from "@nestr/core";
import { Badge, EmptyState, Field, prioStyle, Segmented } from "../components/ui";
import { durationLabel } from "../lib/format";
import { useTheme, type Palette } from "../theme";

const PRIO_LABEL: Record<string, string> = {
  urgent: "Urgent",
  high: "Haute",
  medium: "Moyenne",
  low: "Basse",
};

/** Une ligne de tâche, mémoïsée pour limiter les re-rendus pendant le défilement. */
const TaskRow = React.memo(function TaskRow({
  task,
  p,
  onToggle,
  onEdit,
  onRemove,
}: {
  task: Task;
  p: Palette;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onRemove: (id: string) => void;
}) {
  const done = task.status === "done";
  const ps = prioStyle(p, task.priority);
  return (
    <Pressable
      onPress={() => onEdit(task)}
      style={[styles.row, { backgroundColor: p.card, borderColor: p.border }]}
    >
      <Pressable
        onPress={() => onToggle(task.id)}
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
          <Text style={{ color: p.onAccent, fontSize: 13, fontWeight: "700" }}>✓</Text>
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
          {task.title}
        </Text>
        <View style={styles.tags}>
          <Badge text={PRIO_LABEL[task.priority] ?? task.priority} bg={ps.bg} fg={ps.fg} />
          {task.context ? (
            <Badge text={task.context} bg={p.tagContext.bg} fg={p.tagContext.fg} />
          ) : null}
          {task.estimatedMinutes ? (
            <Badge text={durationLabel(task.estimatedMinutes)} bg={p.sunken} fg={p.textMuted} />
          ) : null}
          {task.dueDate ? (
            <Badge text={task.dueDate.slice(0, 10)} bg={p.tagDue.bg} fg={p.tagDue.fg} />
          ) : null}
        </View>
      </View>

      <Pressable onPress={() => onRemove(task.id)} hitSlop={8}>
        <Text style={{ color: p.textSubtle, fontSize: 20 }}>🗑</Text>
      </Pressable>
    </Pressable>
  );
});

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

  // Champ de recherche + filtre hors FlatList : évite la perte de focus du
  // TextInput au re-rendu (gotcha ListHeaderComponent).
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
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
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            p={p}
            onToggle={onToggle}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState title="Aucune tâche" hint="Appuie sur + pour en ajouter une." />
        }
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
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
