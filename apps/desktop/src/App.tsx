import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  scheduleDay,
  scheduleRange,
  type DailyPlan,
  type PlanningPreferences,
  type Task,
  type WeekPlan,
} from "@nestr/core";
import { TaskForm } from "./components/TaskForm.js";
import { TaskList } from "./components/TaskList.js";
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
import { advise, estimateDurations, type PlanAdvice } from "./lib/ai.js";
import {
  connectGoogle,
  fetchDayEvents,
  googleConnected,
} from "./lib/calendars.js";

export function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [prefs, setPrefs] = useState<PlanningPreferences>(() => loadPreferences());
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [advice, setAdvice] = useState<PlanAdvice | null>(null);
  const [busy, setBusy] = useState<null | "estimate" | "plan">(null);
  const [error, setError] = useState<string | null>(null);
  const [googleOn, setGoogleOn] = useState(() => googleConnected());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => saveTasks(tasks), [tasks]);
  useEffect(() => savePreferences(prefs), [prefs]);

  const pending = useMemo(
    () => tasks.filter((t) => t.status !== "done"),
    [tasks],
  );

  function addTask(task: Task) {
    setTasks((prev) => [...prev, task]);
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

  async function linkGoogle() {
    setError(null);
    try {
      await connectGoogle();
      setGoogleOn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
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
    <div className="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white px-8 py-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Nestr</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ton plan d'action du jour, optimisé.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              disabled={busy !== null}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Réglages
            </button>
            <button
              onClick={linkGoogle}
              disabled={busy !== null}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {googleOn ? "✓ Google connecté" : "Connecter Google"}
            </button>
            <button
              onClick={estimateWithAi}
              disabled={pending.length === 0 || busy !== null}
              className="rounded-lg border border-indigo-300 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-40 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-950"
            >
              {busy === "estimate" ? "Estimation…" : "Estimer (IA)"}
            </button>
            <button
              onClick={planDay}
              disabled={pending.length === 0 || busy !== null}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "plan" ? "Planification…" : "Planifier ma journée"}
            </button>
            <button
              onClick={planWeek}
              disabled={pending.length === 0 || busy !== null}
              className="rounded-lg border border-indigo-600 px-5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-indigo-300 dark:hover:bg-indigo-950"
            >
              Planifier ma semaine
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto max-w-6xl px-8 pt-4">
          <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        </div>
      )}

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-8 py-8 lg:grid-cols-2">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Tâches ({pending.length})
          </h2>
          <TaskForm onAdd={addTask} contexts={prefs.contexts} />
          <TaskList tasks={tasks} onToggle={toggle} onRemove={remove} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {weekPlan ? "Plan de la semaine" : "Plan du jour"}
          </h2>
          {advice && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/40">
              <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
                {advice.summary}
              </p>
              <ul className="mt-2 list-inside list-disc text-sm text-indigo-700 dark:text-indigo-300">
                {advice.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
          {weekPlan ? <WeekView week={weekPlan} /> : <DayTimeline plan={plan} />}
        </section>
      </main>

      {showSettings && (
        <SettingsPanel
          prefs={prefs}
          onChange={setPrefs}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
