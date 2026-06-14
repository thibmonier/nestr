/**
 * Synchronisation serveur : à la connexion, hydrate depuis le serveur (ou amorce
 * le serveur avec le local) ; ensuite pousse les changements (debounce 800 ms).
 */
import { useEffect, useRef } from "react";
import type { PlanningPreferences, Task } from "@nestr/core";
import { fetchMe, type MeStatus } from "../lib/auth.js";
import {
  pullPreferences,
  pullTasks,
  pushPreferences,
  pushTasks,
} from "../lib/sync.js";

interface SyncOptions {
  loggedIn: boolean;
  tasks: Task[];
  setTasks: (t: Task[]) => void;
  prefs: PlanningPreferences;
  setPrefs: (p: PlanningPreferences) => void;
  setMe: (m: MeStatus) => void;
  setError: (s: string | null) => void;
}

export function useServerSync(opts: SyncOptions) {
  const { loggedIn, tasks, setTasks, prefs, setPrefs, setMe, setError } = opts;
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
}
