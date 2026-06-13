import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  scheduleDay,
  scheduleRange,
  type DailyPlan,
  type PlanningPreferences,
  type Task,
  type WeekPlan,
} from "@nestr/core";
import { TaskModal } from "./components/TaskModal.js";
import { TaskList } from "./components/TaskList.js";
import { CalendarPanel } from "./components/CalendarPanel.js";
import { DayTimeline } from "./components/DayTimeline.js";
import { WeekView } from "./components/WeekView.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import {
  loadPreferences,
  loadTasks,
  savePreferences,
  saveTasks,
} from "./lib/storage.js";
import { localDate, todayISO } from "./lib/format.js";
import {
  advise,
  breakdownTask,
  estimateDurations,
  type PlanAdvice,
  type SubtaskProposal,
} from "./lib/ai.js";
import { BreakdownModal } from "./components/BreakdownModal.js";
import { Button } from "./design/components/forms/Button.js";
import { IconButton } from "./design/components/forms/IconButton.js";
import { Icon } from "./design/components/foundation/Icon.js";
import { AdvicePanel } from "./design/components/feedback/AdvicePanel.js";
import { resolvedTheme, setTheme, type Theme } from "./lib/theme.js";
import { newId } from "./lib/storage.js";
import { fetchDayEvents } from "./lib/calendars.js";
import {
  fetchMe,
  isLoggedIn,
  loginWithGoogle,
  logout,
  saveAppleCredentials,
  type MeStatus,
} from "./lib/auth.js";
import {
  pullPreferences,
  pullTasks,
  pushPreferences,
  pushTasks,
} from "./lib/sync.js";

export function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [prefs, setPrefs] = useState<PlanningPreferences>(() => loadPreferences());
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [advice, setAdvice] = useState<PlanAdvice | null>(null);
  const [busy, setBusy] = useState<null | "estimate" | "plan">(null);
  const [error, setError] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn());
  const [me, setMe] = useState<MeStatus | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [breakingId, setBreakingId] = useState<string | null>(null);
  // null = fermée ; { task: null } = création ; { task } = édition.
  const [taskModal, setTaskModal] = useState<{ task: Task | null } | null>(null);
  const [theme, setThemeState] = useState<Theme>(() => resolvedTheme());
  const [showCalendar, setShowCalendar] = useState(false);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }
  const [breakdown, setBreakdown] = useState<{
    task: Task;
    proposals: SubtaskProposal[];
  } | null>(null);

  useEffect(() => saveTasks(tasks), [tasks]);
  useEffect(() => savePreferences(prefs), [prefs]);

  const hydratedRef = useRef(false);

  // À la connexion : récupère l'état serveur (ou amorce le serveur avec le local).
  useEffect(() => {
    if (!loggedIn) {
      hydratedRef.current = true;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const status = await fetchMe();
        if (cancelled) return;
        setMe(status);
        const [serverTasks, serverPrefs] = await Promise.all([
          pullTasks(),
          pullPreferences(),
        ]);
        if (cancelled) return;
        if (serverTasks.length > 0) setTasks(serverTasks);
        else if (tasks.length > 0) await pushTasks(tasks);
        if (serverPrefs) setPrefs(serverPrefs);
        else await pushPreferences(prefs);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        hydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  // Pousse les changements vers le serveur (debounce).
  useEffect(() => {
    if (!loggedIn || !hydratedRef.current) return;
    const id = setTimeout(() => void pushTasks(tasks).catch(() => {}), 800);
    return () => clearTimeout(id);
  }, [tasks, loggedIn]);

  useEffect(() => {
    if (!loggedIn || !hydratedRef.current) return;
    const id = setTimeout(() => void pushPreferences(prefs).catch(() => {}), 800);
    return () => clearTimeout(id);
  }, [prefs, loggedIn]);

  const pending = useMemo(
    () => tasks.filter((t) => t.status !== "done"),
    [tasks],
  );

  /** Tags existants (autocomplétion de la modale). */
  const allTags = useMemo(
    () => [...new Set(tasks.flatMap((t) => t.tags ?? []))].sort(),
    [tasks],
  );

  /** Crée (si nouvel id) ou met à jour une tâche depuis la modale. */
  function saveTask(task: Task) {
    setTasks((prev) =>
      prev.some((t) => t.id === task.id)
        ? prev.map((t) => (t.id === task.id ? task : t))
        : [...prev, task],
    );
    setTaskModal(null);
  }
  function toggle(id: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "done" ? "todo" : "done" }
          : t,
      ),
    );
  }
  function remove(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  /** Reporte/dépriorise une tâche : échéance repoussée à demain. */
  function defer(id: string) {
    const tomorrow = new Date(`${addDays(todayISO(), 1)}T23:59:59`).toISOString();
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, dueDate: tomorrow } : t)),
    );
  }

  /** Demande à l'IA un découpage de la tâche puis ouvre la modale. */
  async function startBreakdown(task: Task) {
    setError(null);
    setBreakingId(task.id);
    try {
      const proposals = await breakdownTask(task);
      setBreakdown({ task, proposals });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBreakingId(null);
    }
  }

  /** Remplace la tâche parente par les sous-tâches choisies (héritage des contraintes). */
  function applyBreakdown(subs: SubtaskProposal[]) {
    if (!breakdown) return;
    const parent = breakdown.task;
    const children: Task[] = subs.map((s) => ({
      id: newId(),
      title: s.title,
      status: "todo",
      priority: parent.priority,
      estimatedMinutes: s.estimatedMinutes,
      energy: s.energy,
      dueDate: parent.dueDate,
      allowedWeekdays: parent.allowedWeekdays,
      context: parent.context,
      mode: parent.mode,
      parentId: parent.id,
      createdAt: new Date().toISOString(),
    }));
    setTasks((prev) => [
      ...prev.filter((t) => t.id !== parent.id),
      ...children,
    ]);
    setBreakdown(null);
  }

  /** Demande à l'IA d'estimer durée + énergie des tâches sans estimation. */
  async function estimateWithAi() {
    setError(null);
    setBusy("estimate");
    try {
      const estimates = await estimateDurations(pending);
      setTasks((prev) =>
        prev.map((t) => {
          const e = estimates.find((x) => x.taskId === t.id);
          return e
            ? { ...t, estimatedMinutes: e.estimatedMinutes, energy: e.energy }
            : t;
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function signIn() {
    setError(null);
    try {
      await loginWithGoogle();
      setLoggedIn(true); // déclenche l'hydratation depuis le serveur
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function signOut() {
    logout();
    setLoggedIn(false);
    setMe(null);
  }

  async function connectApple(appleId: string, appPassword: string) {
    await saveAppleCredentials(appleId, appPassword);
    setMe((m) => (m ? { ...m, appleConnected: true } : m));
  }

  /** Récupère les événements du jour, planifie (moteur) puis conseils IA. */
  async function planDay() {
    setError(null);
    setBusy("plan");
    try {
      const date = todayISO();
      const start = new Date(`${date}T00:00:00`).toISOString();
      const end = new Date(`${date}T23:59:59`).toISOString();
      const events = await fetchDayEvents(start, end);

      const generated = scheduleDay({
        date,
        tasks,
        events,
        preferences: prefs,
        now: Date.now(),
      });
      setWeekPlan(null);
      setPlan(generated);

      setAdvice(await advise(pending, Math.round(generated.availableMinutes)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  /** Planifie les 7 prochains jours en répartissant les tâches. */
  async function planWeek() {
    setError(null);
    setBusy("plan");
    try {
      const start = todayISO();
      const DAYS = 7;
      const rangeStart = new Date(`${start}T00:00:00`).toISOString();
      const lastDay = addDays(start, DAYS - 1);
      const rangeEnd = new Date(`${lastDay}T23:59:59`).toISOString();

      const events = await fetchDayEvents(rangeStart, rangeEnd);
      const eventsByDate: Record<string, typeof events> = {};
      for (const e of events) {
        const key = localDate(e.start);
        (eventsByDate[key] ??= []).push(e);
      }

      const week = scheduleRange({
        startDate: start,
        days: DAYS,
        tasks,
        eventsByDate,
        preferences: prefs,
        now: Date.now(),
      });
      setPlan(null);
      setWeekPlan(week);

      const totalFree = week.days.reduce((s, d) => s + d.availableMinutes, 0);
      setAdvice(await advise(pending, Math.round(totalFree)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-full" style={{ background: "var(--bg-app)", color: "var(--text-body)" }}>
      {showCalendar && <CalendarPanel onClose={() => setShowCalendar(false)} />}
      <div className="min-w-0 flex-1">
      <header
        className="px-8 py-5"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-card)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-strong)" }}>Nestr</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Ton plan d'action du jour, optimisé.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!showCalendar && (
              <IconButton label="Afficher le calendrier" variant="soft" onClick={() => setShowCalendar(true)}>
                <Icon name="calendar" size={16} />
              </IconButton>
            )}
            <IconButton
              label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
              variant="soft"
              onClick={toggleTheme}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
            </IconButton>
            <Button variant="secondary" onClick={() => setShowSettings(true)} disabled={busy !== null}>
              Réglages
            </Button>
            {loggedIn ? (
              <Button variant="secondary" onClick={signOut}>
                Déconnexion
              </Button>
            ) : (
              <Button variant="secondary" onClick={signIn}>
                Se connecter (Google)
              </Button>
            )}
            <Button variant="accent" onClick={estimateWithAi} disabled={pending.length === 0 || busy !== null}>
              {busy === "estimate" ? "Estimation…" : "Estimer (IA)"}
            </Button>
            <Button variant="primary" size="lg" onClick={planDay} disabled={pending.length === 0 || busy !== null}>
              {busy === "plan" ? "Planification…" : "Planifier ma journée"}
            </Button>
            <Button variant="accent" size="lg" onClick={planWeek} disabled={pending.length === 0 || busy !== null}>
              Planifier ma semaine
            </Button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto max-w-6xl px-8 pt-4">
          <p
            className="px-4 py-2 text-sm"
            style={{
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--danger)",
              background: "var(--prio-urgent-bg)",
              color: "var(--prio-urgent-fg)",
            }}
          >
            {error}
          </p>
        </div>
      )}

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-8 py-8 lg:grid-cols-2">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>
              Tâches ({pending.length})
            </h2>
            <Button variant="primary" onClick={() => setTaskModal({ task: null })}>
              + Nouvelle tâche
            </Button>
          </div>
          <TaskList
            tasks={tasks}
            onToggle={toggle}
            onRemove={remove}
            onBreakdown={startBreakdown}
            onDefer={defer}
            onEditStart={(id) => {
              const t = tasks.find((x) => x.id === id);
              if (t) setTaskModal({ task: t });
            }}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>
            {weekPlan ? "Plan de la semaine" : "Plan du jour"}
          </h2>
          {advice && <AdvicePanel summary={advice.summary} tips={advice.tips} />}
          {weekPlan ? <WeekView week={weekPlan} /> : <DayTimeline plan={plan} />}
        </section>
      </main>

      {showSettings && (
        <SettingsPanel
          prefs={prefs}
          onChange={setPrefs}
          onClose={() => setShowSettings(false)}
          loggedIn={loggedIn}
          appleConnected={me?.appleConnected ?? false}
          onConnectApple={connectApple}
        />
      )}

      {breakdown && (
        <BreakdownModal
          task={breakdown.task}
          proposals={breakdown.proposals}
          onApply={applyBreakdown}
          onCancel={() => setBreakdown(null)}
        />
      )}

      {taskModal && (
        <TaskModal
          task={taskModal.task}
          contexts={prefs.contexts}
          allTags={allTags}
          onSave={saveTask}
          onClose={() => setTaskModal(null)}
        />
      )}
      </div>
    </div>
  );
}
