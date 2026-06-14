/** Modale d'ajout / édition d'une tâche. */
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Priority, Task } from "@nestr/core";
import { Button, Field, Segmented } from "../components/ui";
import { newId } from "../lib/storage";
import { useTheme } from "../theme";

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "Basse" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Haute" },
  { value: "urgent", label: "Urgente" },
];

export function TaskModal({
  visible,
  initial,
  contexts,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: Task | null;
  contexts: string[];
  onClose: () => void;
  onSave: (task: Task) => void;
}) {
  const { palette: p } = useTheme();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [context, setContext] = useState<string>(contexts[0] ?? "pro");
  const [minutes, setMinutes] = useState("");
  const [due, setDue] = useState("");
  const [tags, setTags] = useState("");

  // Réinitialise les champs à chaque ouverture.
  React.useEffect(() => {
    if (!visible) return;
    setTitle(initial?.title ?? "");
    setPriority(initial?.priority ?? "medium");
    setContext(initial?.context ?? contexts[0] ?? "pro");
    setMinutes(initial?.estimatedMinutes ? String(initial.estimatedMinutes) : "");
    setDue(initial?.dueDate?.slice(0, 10) ?? "");
    setTags(initial?.tags?.join(", ") ?? "");
  }, [visible, initial, contexts]);

  function save() {
    const t = title.trim();
    if (!t) return;
    const mins = parseInt(minutes, 10);
    const task: Task = {
      id: initial?.id ?? newId(),
      title: t,
      status: initial?.status ?? "todo",
      priority,
      context,
      estimatedMinutes: Number.isFinite(mins) && mins > 0 ? mins : undefined,
      dueDate: due.trim() || undefined,
      tags: tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    onSave(task);
  }

  const ctxOptions = contexts.map((c) => ({ value: c, label: c }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.scrim, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <View style={[styles.sheet, { backgroundColor: p.bg }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: p.textStrong }]}>
              {initial ? "Modifier la tâche" : "Nouvelle tâche"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={{ color: p.textMuted, fontSize: 22 }}>×</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 8 }}>
            <Field
              label="Intitulé"
              value={title}
              onChangeText={setTitle}
              placeholder="Ex. Préparer la réunion produit"
              autoFocus
            />

            {ctxOptions.length > 1 ? (
              <View style={{ gap: 6 }}>
                <Text style={[styles.lbl, { color: p.textMuted }]}>Contexte</Text>
                <Segmented options={ctxOptions} value={context} onChange={setContext} />
              </View>
            ) : null}

            <View style={{ gap: 6 }}>
              <Text style={[styles.lbl, { color: p.textMuted }]}>Priorité</Text>
              <Segmented options={PRIORITIES} value={priority} onChange={setPriority} />
            </View>

            <Field
              label="Durée estimée (min)"
              value={minutes}
              onChangeText={setMinutes}
              keyboardType="number-pad"
              placeholder="30"
            />
            <Field
              label="Échéance (AAAA-MM-JJ)"
              value={due}
              onChangeText={setDue}
              placeholder="2026-06-20"
              autoCapitalize="none"
            />
            <Field
              label="Tags (séparés par des virgules)"
              value={tags}
              onChangeText={setTags}
              placeholder="réunion, produit"
              autoCapitalize="none"
            />
          </ScrollView>

          <View style={styles.actions}>
            <Button label="Annuler" variant="ghost" onPress={onClose} />
            <View style={{ flex: 1 }}>
              <Button label={initial ? "Enregistrer" : "Ajouter"} onPress={save} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "92%",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 18, fontWeight: "700" },
  lbl: { fontSize: 13, fontWeight: "500" },
  actions: { flexDirection: "row", gap: 10, alignItems: "center" },
});
