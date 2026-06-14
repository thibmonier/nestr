/** Réglages : compte Google, clé IA per-user, thème, déconnexion. */
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Card, Field, Segmented } from "../components/ui";
import { saveAiKey, type AiProvider, type MeStatus } from "../lib/auth";
import { useTheme } from "../theme";

export function SettingsScreen({
  me,
  onReloadMe,
  onLogout,
}: {
  me: MeStatus | null;
  onReloadMe: () => void;
  onLogout: () => void;
}) {
  const { palette: p, name: themeName, toggle } = useTheme();
  const [provider, setProvider] = useState<AiProvider>(me?.aiProvider ?? "anthropic");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (apiKey.trim().length < 8) {
      setMsg("Clé trop courte.");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await saveAiKey(provider, apiKey.trim());
      setApiKey("");
      setMsg("Clé enregistrée.");
      onReloadMe();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section title="Compte" p={p}>
        <Card>
          <Row label="Google" value={me?.googleConnected ? "Connecté" : "—"} p={p} />
          <Row
            label="Apple"
            value={me?.appleConnected ? "Connecté" : "Non configuré"}
            p={p}
          />
        </Card>
      </Section>

      <Section title="Intelligence artificielle" p={p}>
        <Card style={{ gap: 14 }}>
          <Text style={{ color: p.textMuted, fontSize: 13 }}>
            {me?.aiConfigured
              ? `Clé active (${me.aiProvider}). Saisis-en une nouvelle pour la remplacer.`
              : "Saisis ta propre clé API pour activer les fonctions IA."}
          </Text>
          <View style={{ gap: 6 }}>
            <Text style={[styles.lbl, { color: p.textMuted }]}>Fournisseur</Text>
            <Segmented
              options={[
                { value: "anthropic", label: "Anthropic" },
                { value: "openai", label: "OpenAI" },
              ]}
              value={provider}
              onChange={setProvider}
            />
          </View>
          <Field
            label="Clé API"
            value={apiKey}
            onChangeText={setApiKey}
            placeholder={provider === "anthropic" ? "sk-ant-…" : "sk-…"}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button
            label={saving ? "Enregistrement…" : "Enregistrer la clé"}
            onPress={save}
            loading={saving}
          />
          {msg ? (
            <Text style={{ color: p.textMuted, fontSize: 13 }}>{msg}</Text>
          ) : null}
        </Card>
      </Section>

      <Section title="Apparence" p={p}>
        <Card>
          <View style={styles.row}>
            <Text style={{ color: p.textBody, fontSize: 15 }}>Thème sombre</Text>
            <Button
              label={themeName === "dark" ? "Activé" : "Désactivé"}
              variant="ghost"
              onPress={toggle}
            />
          </View>
        </Card>
      </Section>

      <Button label="Se déconnecter" variant="danger" onPress={onLogout} />
    </ScrollView>
  );
}

function Section({
  title,
  children,
  p,
}: {
  title: string;
  children: React.ReactNode;
  p: ReturnType<typeof useTheme>["palette"];
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.section, { color: p.textMuted }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  p,
}: {
  label: string;
  value: string;
  p: ReturnType<typeof useTheme>["palette"];
}) {
  return (
    <View style={styles.row}>
      <Text style={{ color: p.textBody, fontSize: 15 }}>{label}</Text>
      <Text style={{ color: p.textMuted, fontSize: 14 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 22 },
  section: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  lbl: { fontSize: 13, fontWeight: "500" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
});
