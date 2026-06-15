/** Racine de l'app mobile Nestr : thème, auth Google, navigation par onglets. */
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  DEFAULT_PREFERENCES,
  type PlanningPreferences,
  type Task,
} from "@nestr/core";
import { Button } from "./src/components/ui";
import { fetchMe, isLoggedIn, loginWithGoogle, logout, type MeStatus } from "./src/lib/auth";
import { loadPreferences, loadTasks, saveTasks } from "./src/lib/storage";
import { pullPreferences, pullTasks, pushTasks } from "./src/lib/sync";
import { PlanScreen } from "./src/screens/PlanScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { TaskModal } from "./src/screens/TaskModal";
import { TasksScreen } from "./src/screens/TasksScreen";
import { useTimeTracking } from "./src/hooks/useTimeTracking";
import { useLocalEvents } from "./src/hooks/useLocalEvents";
import { ThemeProvider, useTheme } from "./src/theme";

type Tab = "tasks" | "plan" | "settings";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "tasks", label: "Tâches", icon: "☑" },
  { key: "plan", label: "Plan", icon: "◷" },
  { key: "settings", label: "Réglages", icon: "⚙" },
];

function Root() {
  const { palette: p, name: themeName } = useTheme();

  const [booting, setBooting] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [me, setMe] = useState<MeStatus | null>(null);
  const [tasks, setTasksState] = useState<Task[]>([]);
  const [prefs, setPrefs] = useState<PlanningPreferences>(DEFAULT_PREFERENCES);

  const [tab, setTab] = useState<Tab>("tasks");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const loadData = useCallback(async () => {
    // Cache local d'abord (affichage immédiat), puis serveur fait foi.
    setTasksState(await loadTasks());
    setPrefs(await loadPreferences());
    try {
      const [serverTasks, serverPrefs, meStatus] = await Promise.all([
        pullTasks(),
        pullPreferences(),
        fetchMe(),
      ]);
      setTasksState(serverTasks);
      void saveTasks(serverTasks);
      if (serverPrefs) setPrefs(serverPrefs);
      setMe(meStatus);
    } catch {
      // hors-ligne / session expirée : on garde le cache local.
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const logged = await isLoggedIn();
        setAuthed(logged);
        if (logged) await loadData();
      } catch {
        setAuthed(false);
      } finally {
        setBooting(false);
      }
    })();
  }, [loadData]);

  const persist = useCallback((next: Task[]) => {
    setTasksState(next);
    void saveTasks(next);
    void pushTasks(next).catch(() => {});
  }, []);

  const tracking = useTimeTracking(tasks, persist);
  const localEvents = useLocalEvents();

  async function handleLogin() {
    setLoggingIn(true);
    setLoginError(null);
    try {
      await loginWithGoogle();
      setAuthed(true);
      await loadData();
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "Connexion échouée.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    await logout();
    setAuthed(false);
    setMe(null);
    setTasksState([]);
  }

  function toggleTask(id: string) {
    persist(
      tasks.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "done" ? "todo" : "done" }
          : t,
      ),
    );
  }
  function removeTask(id: string) {
    persist(tasks.filter((t) => t.id !== id));
  }
  function saveTask(task: Task) {
    const exists = tasks.some((t) => t.id === task.id);
    persist(exists ? tasks.map((t) => (t.id === task.id ? task : t)) : [task, ...tasks]);
    setModalOpen(false);
    setEditing(null);
  }

  if (booting) {
    return (
      <View style={[styles.center, { backgroundColor: p.bg }]}>
        <ActivityIndicator color={p.accent} size="large" />
      </View>
    );
  }

  if (!authed) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: p.bg }]}>
        <StatusBar style={themeName === "dark" ? "light" : "dark"} />
        <View style={[styles.center, { gap: 16, padding: 32 }]}>
          <Text style={[styles.brand, { color: p.textStrong }]}>Nestr</Text>
          <Text style={{ color: p.textMuted, textAlign: "center", fontSize: 15 }}>
            Ta journée, planifiée par l'IA. Connecte-toi pour commencer.
          </Text>
          <View style={{ alignSelf: "stretch" }}>
            <Button
              label={loggingIn ? "Connexion…" : "Continuer avec Google"}
              onPress={handleLogin}
              loading={loggingIn}
            />
          </View>
          {loginError ? (
            <Text style={{ color: p.danger, fontSize: 13, textAlign: "center" }}>
              {loginError}
            </Text>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const title = TABS.find((t) => t.key === tab)?.label ?? "Nestr";
  const contexts = prefs.contexts.length ? prefs.contexts : ["pro", "perso"];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: p.bg }]}>
      <StatusBar style={themeName === "dark" ? "light" : "dark"} />

      <View style={[styles.header, { borderColor: p.border }]}>
        <Text style={[styles.headerTitle, { color: p.textStrong }]}>{title}</Text>
        {tab === "tasks" ? (
          <Pressable
            onPress={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            style={[styles.add, { backgroundColor: p.accent }]}
            hitSlop={8}
          >
            <Text style={{ color: p.onAccent, fontSize: 22, fontWeight: "700" }}>+</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.flex}>
        {tab === "tasks" ? (
          <TasksScreen
            tasks={tasks}
            onToggle={toggleTask}
            onRemove={removeTask}
            onEdit={(t) => {
              setEditing(t);
              setModalOpen(true);
            }}
            activeTaskId={tracking.activeTaskId}
            elapsedMin={tracking.elapsedMin}
            onStart={tracking.start}
            onStop={tracking.stop}
          />
        ) : tab === "plan" ? (
          <PlanScreen
            tasks={tasks}
            preferences={prefs}
            aiConfigured={!!me?.aiConfigured}
            localEvents={localEvents.events}
          />
        ) : (
          <SettingsScreen me={me} onReloadMe={loadData} onLogout={handleLogout} />
        )}
      </View>

      <View style={[styles.tabbar, { backgroundColor: p.card, borderColor: p.border }]}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)}>
              <Text style={{ fontSize: 20, opacity: active ? 1 : 0.45 }}>{t.icon}</Text>
              <Text
                style={{
                  fontSize: 11,
                  marginTop: 2,
                  color: active ? p.accentText : p.textSubtle,
                  fontWeight: active ? "700" : "500",
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TaskModal
        visible={modalOpen}
        initial={editing}
        contexts={contexts}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={saveTask}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 34, fontWeight: "800", letterSpacing: -0.5 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  add: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 18,
  },
  tabItem: { flex: 1, alignItems: "center" },
});
