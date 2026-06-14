/**
 * Suivi du temps : une tâche active à la fois ({taskId, startedAt}), persistée
 * pour survivre au reload. Tick live à la seconde pour le chrono affiché.
 */
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  elapsedMinutes,
  startTracking,
  stopTracking,
  type ActiveTracking,
  type StopOutcome,
  type Task,
} from "@nestr/core";

const KEY = "nestr.tracking";

function load(): ActiveTracking | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActiveTracking) : null;
  } catch {
    return null;
  }
}

export function useTimeTracking(setTasks: Dispatch<SetStateAction<Task[]>>) {
  const [active, setActive] = useState<ActiveTracking | null>(() => load());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (active) localStorage.setItem(KEY, JSON.stringify(active));
    else localStorage.removeItem(KEY);
  }, [active]);

  // Tick à la seconde uniquement pendant un suivi (chrono live).
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  function start(taskId: string) {
    const t0 = Date.now();
    // Un suivi déjà en cours est d'abord mis en attente (temps conservé).
    if (active) {
      const mins = elapsedMinutes(active.startedAt, t0);
      setTasks((prev) =>
        prev.map((t) => (t.id === active.taskId ? stopTracking(t, mins, "pending") : t)),
      );
    }
    setTasks((prev) => prev.map((t) => (t.id === taskId ? startTracking(t) : t)));
    setActive({ taskId, startedAt: t0 });
    setNow(t0);
  }

  function stop(outcome: StopOutcome) {
    if (!active) return;
    const mins = elapsedMinutes(active.startedAt, Date.now());
    setTasks((prev) =>
      prev.map((t) => (t.id === active.taskId ? stopTracking(t, mins, outcome) : t)),
    );
    setActive(null);
  }

  return {
    activeTaskId: active?.taskId ?? null,
    /** Minutes écoulées (fractionnaires) du suivi en cours, 0 si inactif. */
    elapsedMin: active ? elapsedMinutes(active.startedAt, now) : 0,
    start,
    stop,
  };
}
