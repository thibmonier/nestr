/** Ajout rapide IA : phrase en langage naturel → aperçu structuré éditable. */
import React, { useState } from "react";
import { Text, View } from "react-native";
import type { ParsedEntry, TaskMode } from "@nestr/core";
import { Badge, Button, Card, Field, Segmented } from "./ui";
import { todayISO } from "../lib/format";
import { useTheme } from "../theme";

const MODE_OPTIONS: { value: string; label: string }[] = [
  { value: "action", label: "Action" },
  { value: "video", label: "Visio" },
  { value: "phone", label: "Tél." },
  { value: "trip", label: "Dépl." },
];

export function QuickAdd({
  aiConfigured,
  onParse,
  onConfirm,
}: {
  aiConfigured: boolean;
  onParse: (text: string, todayISO: string) => Promise<ParsedEntry>;
  onConfirm: (entry: ParsedEntry) => void;
}) {
  const { palette: p } = useTheme();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ParsedEntry | null>(null);

  async function analyse() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    try {
      setDraft(await onParse(t, todayISO()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur IA");
    } finally {
      setBusy(false);
    }
  }

  function patch(part: Partial<ParsedEntry>) {
    setDraft((d) => (d ? { ...d, ...part } : d));
  }

  function confirm() {
    if (!draft || !draft.title.trim()) return;
    onConfirm(draft);
    setDraft(null);
    setText("");
  }

  if (!aiConfigured) {
    return (
      <Card style={{ backgroundColor: p.warnBg, borderColor: p.warnBorder }}>
        <Text style={{ color: p.warnFg, fontSize: 13 }}>
          Ajoute ta clé IA dans Réglages pour l'ajout rapide en langage naturel.
        </Text>
      </Card>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
        <View style={{ flex: 1 }}>
          <Field
            value={text}
            onChangeText={setText}
            placeholder="Ex. déjeuner mardi avec Jean au LAB"
            autoCapitalize="none"
            onSubmitEditing={analyse}
            returnKeyType="go"
          />
        </View>
        <Button
          label={busy ? "…" : "Analyser"}
          onPress={analyse}
          loading={busy}
        />
      </View>

      {error ? <Text style={{ color: p.danger, fontSize: 13 }}>{error}</Text> : null}

      {draft ? (
        <Card style={{ gap: 12 }}>
          <Segmented
            options={[
              { value: "task", label: "Tâche" },
              { value: "event", label: "Événement" },
            ]}
            value={draft.kind}
            onChange={(v) => patch({ kind: v as ParsedEntry["kind"] })}
          />

          <Field label="Titre" value={draft.title} onChangeText={(v) => patch({ title: v })} />

          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1.4 }}>
              <Field
                label="Date"
                value={draft.date ?? ""}
                onChangeText={(v) => patch({ date: v || null })}
                placeholder="AAAA-MM-JJ"
                autoCapitalize="none"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Début"
                value={draft.start ?? ""}
                onChangeText={(v) => patch({ start: v || null })}
                placeholder="HH:mm"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Fin"
                value={draft.end ?? ""}
                onChangeText={(v) => patch({ end: v || null })}
                placeholder="HH:mm"
              />
            </View>
          </View>

          {draft.kind === "event" ? (
            <Field
              label="Lieu"
              value={draft.location ?? ""}
              onChangeText={(v) => patch({ location: v || null })}
              placeholder="—"
            />
          ) : null}

          <View style={{ gap: 6 }}>
            <Text style={{ color: p.textMuted, fontSize: 12, fontWeight: "600" }}>Contexte</Text>
            <Segmented
              options={[
                { value: "pro", label: "Pro" },
                { value: "perso", label: "Perso" },
              ]}
              value={draft.context}
              onChange={(v) => patch({ context: v as ParsedEntry["context"] })}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ color: p.textMuted, fontSize: 12, fontWeight: "600" }}>Mode</Text>
            <Segmented
              options={MODE_OPTIONS}
              value={draft.mode ?? "action"}
              onChange={(v) => patch({ mode: v as TaskMode })}
            />
          </View>

          {draft.people.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {draft.people.map((person) => (
                <Badge key={person} text={person} bg={p.sunken} fg={p.textMuted} />
              ))}
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
            <Button label="Annuler" variant="ghost" onPress={() => setDraft(null)} />
            <Button
              label={draft.kind === "event" ? "Ajouter l'événement" : "Ajouter la tâche"}
              onPress={confirm}
            />
          </View>
        </Card>
      ) : null}
    </View>
  );
}
