/**
 * Orchestration de la planification : moteur (jour/semaine), conseils IA,
 * estimation, découpage, et placement manuel sur la timeline.
 */
import { useState, type Dispatch, type SetStateAction } from "react";
import {
  addDays,
  scheduleDay,
  scheduleRange,
  type CalendarEvent,
  type DailyPlan,
  type PlanningPreferences,
  type Task,
  type WeekPlan,
} from "@nestr/core";
import { advise, breakdownTask, estimateDurations, type PlanAdvice, type SubtaskProposal } from "../lib/ai.js";
import { fetchDayEvents } from "../lib/calendars.js";
import { localDate, todayISO } from "../lib/format.js";
import { newId } from "../lib/storage.js";
import type { MeStatus } from "../lib/auth.js";

interface PlannerOptions {
  tasks: Task[];
  pending: Task[];
  prefs: PlanningPreferences;
  me: MeStatus | null;
  selectedDate: string;
  /** Événements créés localement (ajout rapide), fusionnés au plan. */
  localEvents: CalendarEvent[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  setError: (s: string | null) => void;
}

export function usePlanner(opts: PlannerOptions) {
  const { tasks, pending, prefs, me, selectedDate, localEvents, setTasks, setError } = opts;

  /** Événements locaux dont le début tombe dans [startISO, endISO]. */
  function localInRange(startISO: string, endISO: string): CalendarEvent[] {
    return localEvents.filter((e) => e.start >= startISO && e.start <= endISO);
  }

  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [advice, setAdvice] = useState<PlanAdvice | null>(null);
  const [busy, setBusy] = useState<null | "estimate" | "plan">(null);
  const [breakingId, setBreakingId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<{
    task: Task;
    proposals: SubtaskProposal[];
  } | null>(null);

  /** Récupère les événements du jour, planifie (moteur) puis conseils IA. */
  async function planDay(date: string = selectedDate, withAdvice = true) {
    setError(null);
    setBusy("plan");
    try {
      const start = new Date(`${date}T00:00:00`).toISOString();
      const end = new Date(`${date}T23:59:59`).toISOString();
      const events = [...(await fetchDayEvents(start, end)), ...localInRange(start, end)];

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

      const events = [
        ...(await fetchDayEvents(rangeStart, rangeEnd)),
        ...localInRange(rangeStart, rangeEnd),
      ];
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

  /** Place manuellement la tâche `taskId` à `startMin` sur la timeline du jour
   *  (override d'affichage, sans relancer le moteur). */
  function scheduleManually(taskId: string | null, startMin: number) {
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
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
      taskId,
      ...(task.mode ? { mode: task.mode } : {}),
    };
    setWeekPlan(null);
    setPlan((prev) => {
      const base = prev ?? { date, blocks: [], unscheduled: [], availableMinutes: 0 };
      return {
        ...base,
        blocks: [...base.blocks.filter((b) => b.taskId !== taskId), block],
        unscheduled: base.unscheduled.filter((u) => u.task.id !== taskId),
      };
    });
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
    setTasks((prev) => [...prev.filter((t) => t.id !== parent.id), ...children]);
    setBreakdown(null);
  }

  return {
    plan,
    weekPlan,
    advice,
    busy,
    breakingId,
    breakdown,
    setBreakdown,
    planDay,
    planWeek,
    scheduleManually,
    estimateWithAi,
    startBreakdown,
    applyBreakdown,
  };
}
