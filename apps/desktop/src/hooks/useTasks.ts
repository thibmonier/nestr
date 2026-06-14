/** État des tâches : persistance locale, CRUD, dérivés (pending, tags). */
import { useEffect, useMemo, useState } from "react";
import { addDays, type Task } from "@nestr/core";
import { loadTasks, saveTasks } from "../lib/storage.js";
import { todayISO } from "../lib/format.js";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());

  useEffect(() => saveTasks(tasks), [tasks]);

  const pending = useMemo(
    () => tasks.filter((t) => t.status !== "done"),
    [tasks],
  );

  /** Tags existants (autocomplétion de la modale). */
  const allTags = useMemo(
    () => [...new Set(tasks.flatMap((t) => t.tags ?? []))].sort(),
    [tasks],
  );

  /** Crée (si nouvel id) ou met à jour une tâche. */
  function saveTask(task: Task) {
    setTasks((prev) =>
      prev.some((t) => t.id === task.id)
        ? prev.map((t) => (t.id === task.id ? task : t))
        : [...prev, task],
    );
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

  return { tasks, setTasks, pending, allTags, saveTask, toggle, remove, defer };
}
