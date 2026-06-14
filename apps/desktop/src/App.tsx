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
import { SegmentedControl } from "./design/components/navigation/SegmentedControl.js";
import { newId } from "./lib/storage.js";
import nestrMark from "./design/assets/nestr-mark.png";
import { fetchDayEvents } from "./lib/calendars.js";
import {
  fetchMe,
  isLoggedIn,
  loginWithGoogle,
  logout,
  saveAppleCredentials,
  saveAiKey,
  type MeStatus,
  type AiProvider,
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
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [planScope, setPlanScope] = useState<"jour" | "semaine">("jour");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [timelineMode, setTimelineMode] = useState<"compact" | "proportional">("proportional");

  function planNow() {
    return planScope === "semaine" ? planWeek() : planDay();
  }

  /** Clic sur un jour du calendrier : sync la vue principale (planifie ce jour). */
  function selectDay(iso: string) {
    setSelectedDate(iso);
    setPlanScope("jour");
    void planDay(iso, false);
  }

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

  /** Place manuellement la tâche glissée à `startMin` sur la timeline du jour
   *  (override d'affichage, sans relancer le moteur). */
  function scheduleManually(startMin: number) {
    const id = dragTaskId;
    setDragTaskId(null);
    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const dur = task.estimatedMinutes ?? prefs.defaultTaskMinutes;
    const date = plan?.date ?? todayISO();
    const startD = new Date(`${date}T00:00:00`);
    startD.setMinutes(startMin);
    const endD = new Date(startD.getTime() + dur * 60_000);
    const block = {
      start: startD.toISOString(),
      end: endD.toISOString(),
      kind: "task" as const,
      title: task.title,
      taskId: id,
    };
    setWeekPlan(null);
    setPlan((prev) => {
      const base = prev ?? { date, blocks: [], unscheduled: [], availableMinutes: 0 };
      return {
        ...base,
        blocks: [...base.blocks.filter((b) => b.taskId !== id), block],
        unscheduled: base.unscheduled.filter((u) => u.task.id !== id),
      };
    });
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

  async function saveAi(provider: AiProvider, apiKey: string) {
    await saveAiKey(provider, apiKey);
    setMe((m) => (m ? { ...m, aiConfigured: true, aiProvider: provider } : m));
  }

  /** Récupère les événements du jour, planifie (moteur) puis conseils IA.
   *  `date` = jour à planifier (défaut : jour sélectionné). `withAdvice` permet
   *  de sauter l'appel IA lors d'une simple navigation de calendrier. */
  async function planDay(date: string = selectedDate, withAdvice = true) {
    setError(null);
    setBusy("plan");
    try {
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

      if (withAdvice && me?.aiConfigured) {
        setAdvice(await advise(pending, Math.round(generated.availableMinutes)));
      }
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
      const start = selectedDate;
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

      if (me?.aiConfigured) {
        const totalFree = week.days.reduce((s, d) => s + d.availableMinutes, 0);
        setAdvice(await advise(pending, Math.round(totalFree)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-full" style={{ background: "var(--bg-app)", color: "var(--text-body)" }}>
      {showCalendar && (
        <CalendarPanel
          selectedDate={selectedDate}
          onSelectDate={selectDay}
          onClose={() => setShowCalendar(false)}
        />
      )}
      <div className="min-w-0 flex-1">
      <header
        className="px-8 py-5"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-card)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconButton
              label={showCalendar ? "Masquer le calendrier" : "Afficher le calendrier"}
              variant="soft"
              onClick={() => setShowCalendar((v) => !v)}
              style={
                showCalendar
                  ? { background: "var(--accent-soft)", color: "var(--accent-text)" }
                  : undefined
              }
            >
              <Icon name="calendar" size={18} />
            </IconButton>
            <img src={nestrMark} alt="" width={36} height={36} style={{ borderRadius: "var(--radius-md)" }} />
            <div>
              <h1 className="text-lg font-bold tracking-tight" style={{ margin: 0, color: "var(--text-strong)" }}>Nestr</h1>
              <p className="text-xs" style={{ margin: 0, color: "var(--text-muted)" }}>
                {(() => {
                  const d = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
                  return d.charAt(0).toUpperCase() + d.slice(1);
                })()}{" "}
                · {selectedDate === todayISO() ? "ton plan du jour" : "plan de ce jour"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              size="sm"
              value={planScope}
              onChange={(v) => setPlanScope(v as "jour" | "semaine")}
              options={[
                { value: "jour", label: "Jour" },
                { value: "semaine", label: "Semaine" },
              ]}
            />
            <span title={!me?.aiConfigured ? "Configure ta clé IA dans les Réglages" : undefined}>
              <Button variant="ghost" onClick={estimateWithAi} disabled={pending.length === 0 || busy !== null || !me?.aiConfigured}>
                {busy === "estimate" ? "Estimation…" : "Estimer (IA)"}
              </Button>
            </span>
            <Button variant="primary" size="lg" onClick={planNow} disabled={pending.length === 0 || busy !== null}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <Icon name="sparkles" size={15} />
                {busy === "plan" ? "Planification…" : planScope === "semaine" ? "Planifier ma semaine" : "Planifier ma journée"}
              </span>
            </Button>
            <IconButton
              label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
              variant="soft"
              onClick={toggleTheme}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
            </IconButton>
            <IconButton label="Réglages" variant="soft" onClick={() => setShowSettings(true)} disabled={busy !== null}>
              <Icon name="settings" size={16} />
            </IconButton>
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
            draggable
            onTaskDragStart={(id, e) => {
              e.dataTransfer.setData("text/plain", id);
              e.dataTransfer.effectAllowed = "move";
              setDragTaskId(id);
            }}
            onTaskDragEnd={() => setDragTaskId(null)}
          />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>
              {weekPlan ? "Plan de la semaine" : "Plan du jour"}
            </h2>
            {(plan || weekPlan) && (
              <SegmentedControl
                size="sm"
                value={timelineMode}
                onChange={(v) => setTimelineMode(v as "compact" | "proportional")}
                options={[
                  { value: "proportional", label: "Proportionnel" },
                  { value: "compact", label: "Compact" },
                ]}
              />
            )}
          </div>
          {advice && <AdvicePanel summary={advice.summary} tips={advice.tips} />}
          {weekPlan ? (
            <WeekView week={weekPlan} mode={timelineMode} />
          ) : (
            <DayTimeline plan={plan} dragging={!!dragTaskId} onSchedule={scheduleManually} mode={timelineMode} />
          )}
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
          onSignIn={signIn}
          onSignOut={signOut}
          aiConfigured={me?.aiConfigured ?? false}
          aiProvider={me?.aiProvider ?? null}
          onSaveAiKey={saveAi}
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
