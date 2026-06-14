/**
 * Suivi du temps (mobile) : une tâche active {taskId, startedAt} persistée en
 * AsyncStorage (survit au reload), tick live à la seconde.
 */
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  elapsedMinutes,
  startTracking,
  stopTracking,
  type ActiveTracking,
  type StopOutcome,
  type Task,
} from "@nestr/core";

const KEY = "nestr.tracking";

export function useTimeTracking(tasks: Task[], persist: (next: Task[]) => void) {
  const [active, setActive] = useState<ActiveTracking | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!raw) return;
      try {
        setActive(JSON.parse(raw) as ActiveTracking);
      } catch {
        /* ignore */
      }
    });
  }, []);

  useEffect(() => {
    if (active) void AsyncStorage.setItem(KEY, JSON.stringify(active));
    else void AsyncStorage.removeItem(KEY);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  function start(taskId: string) {
    const t0 = Date.now();
    let next = tasks;
    if (active) {
      const mins = elapsedMinutes(active.startedAt, t0);
      next = next.map((t) => (t.id === active.taskId ? stopTracking(t, mins, "pending") : t));
    }
    next = next.map((t) => (t.id === taskId ? startTracking(t) : t));
    persist(next);
    setActive({ taskId, startedAt: t0 });
    setNow(t0);
  }

  function stop(outcome: StopOutcome) {
    if (!active) return;
    const mins = elapsedMinutes(active.startedAt, Date.now());
    persist(tasks.map((t) => (t.id === active.taskId ? stopTracking(t, mins, outcome) : t)));
    setActive(null);
  }

  return {
    activeTaskId: active?.taskId ?? null,
    elapsedMin: active ? elapsedMinutes(active.startedAt, now) : 0,
    start,
    stop,
  };
}
