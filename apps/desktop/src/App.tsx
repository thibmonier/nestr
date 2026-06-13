import { useEffect, useMemo, useState } from "react";
import {
  scheduleDay,
  type DailyPlan,
  type PlanningPreferences,
  type Task,
} from "@nestr/core";
import { TaskForm } from "./components/TaskForm.js";
import { TaskList } from "./components/TaskList.js";
import { DayTimeline } from "./components/DayTimeline.js";
import {
  loadPreferences,
  loadTasks,
  savePreferences,
  saveTasks,
} from "./lib/storage.js";
import { todayISO } from "./lib/format.js";

export function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [prefs] = useState<PlanningPreferences>(() => loadPreferences());
  const [plan, setPlan] = useState<DailyPlan | null>(null);

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

  function pling() {
    // Phase 1 : agenda vide (calendriers branchés en Phase 3).
    const generated = scheduleDay({
      date: todayISO(),
      tasks,
      events: [],
      preferences: prefs,
      now: Date.now(),
    });
    setPlan(generated);
  }

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white px-8 py-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Nestr</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ton plan d'action du jour, optimisé.
            </p>
          </div>
          <button
            onClick={pling}
            disabled={pending.length === 0}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Planifier ma journée
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-8 py-8 lg:grid-cols-2">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Tâches ({pending.length})
          </h2>
          <TaskForm onAdd={addTask} />
          <TaskList tasks={tasks} onToggle={toggle} onRemove={remove} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Plan du jour
          </h2>
          <DayTimeline plan={plan} />
        </section>
      </main>
    </div>
  );
}
