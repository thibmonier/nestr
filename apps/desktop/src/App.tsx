import { useEffect, useState } from "react";
import type { PlanningPreferences, Task } from "@nestr/core";
import { TaskModal } from "./components/TaskModal.js";
import { TaskList } from "./components/TaskList.js";
import { CalendarPanel } from "./components/CalendarPanel.js";
import { DayTimeline } from "./components/DayTimeline.js";
import { WeekView } from "./components/WeekView.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { BreakdownModal } from "./components/BreakdownModal.js";
import { AppHeader } from "./components/AppHeader.js";
import { Button } from "./design/components/forms/Button.js";
import { AdvicePanel } from "./design/components/feedback/AdvicePanel.js";
import { SegmentedControl } from "./design/components/navigation/SegmentedControl.js";
import { loadPreferences, savePreferences } from "./lib/storage.js";
import { todayISO } from "./lib/format.js";
import { resolvedTheme, setTheme, type Theme } from "./lib/theme.js";
import { useTasks } from "./hooks/useTasks.js";
import { useAccount } from "./hooks/useAccount.js";
import { useServerSync } from "./hooks/useServerSync.js";
import { usePlanner } from "./hooks/usePlanner.js";

export function App() {
  const { tasks, setTasks, pending, allTags, saveTask, toggle, remove, defer } =
    useTasks();
  const [prefs, setPrefs] = useState<PlanningPreferences>(() => loadPreferences());
  const [error, setError] = useState<string | null>(null);

  const account = useAccount(setError);
  const { loggedIn, me } = account;

  const [showSettings, setShowSettings] = useState(false);
  const [taskModal, setTaskModal] = useState<{ task: Task | null } | null>(null);
  const [theme, setThemeState] = useState<Theme>(() => resolvedTheme());
  const [showCalendar, setShowCalendar] = useState(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [planScope, setPlanScope] = useState<"jour" | "semaine">("jour");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [timelineMode, setTimelineMode] = useState<"compact" | "proportional">(
    "proportional",
  );

  useEffect(() => savePreferences(prefs), [prefs]);

  useServerSync({
    loggedIn,
    tasks,
    setTasks,
    prefs,
    setPrefs,
    setMe: account.setMe,
    setError,
  });

  const planner = usePlanner({
    tasks,
    pending,
    prefs,
    me,
    selectedDate,
    setTasks,
    setError,
  });
  const { plan, weekPlan, advice, busy, breakdown } = planner;

  function planNow() {
    return planScope === "semaine" ? planner.planWeek() : planner.planDay();
  }

  /** Clic sur un jour du calendrier : sync la vue principale (planifie ce jour). */
  function selectDay(iso: string) {
    setSelectedDate(iso);
    setPlanScope("jour");
    void planner.planDay(iso, false);
  }

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
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
        <AppHeader
          showCalendar={showCalendar}
          onToggleCalendar={() => setShowCalendar((v) => !v)}
          selectedDate={selectedDate}
          planScope={planScope}
          onPlanScopeChange={setPlanScope}
          pendingCount={pending.length}
          busy={busy}
          aiConfigured={!!me?.aiConfigured}
          onEstimate={planner.estimateWithAi}
          onPlan={planNow}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setShowSettings(true)}
        />

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
              onBreakdown={planner.startBreakdown}
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
              <DayTimeline
                plan={plan}
                dragging={!!dragTaskId}
                onSchedule={(startMin) => {
                  planner.scheduleManually(dragTaskId, startMin);
                  setDragTaskId(null);
                }}
                mode={timelineMode}
              />
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
            onConnectApple={account.connectApple}
            onSignIn={account.signIn}
            onSignOut={account.signOut}
            aiConfigured={me?.aiConfigured ?? false}
            aiProvider={me?.aiProvider ?? null}
            onSaveAiKey={account.saveAi}
          />
        )}

        {breakdown && (
          <BreakdownModal
            task={breakdown.task}
            proposals={breakdown.proposals}
            onApply={planner.applyBreakdown}
            onCancel={() => planner.setBreakdown(null)}
          />
        )}

        {taskModal && (
          <TaskModal
            task={taskModal.task}
            contexts={prefs.contexts}
            allTags={allTags}
            onSave={(t) => {
              saveTask(t);
              setTaskModal(null);
            }}
            onClose={() => setTaskModal(null)}
          />
        )}
      </div>
    </div>
  );
}
