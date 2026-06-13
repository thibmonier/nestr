import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Task } from "@nestr/core";
import { createPlanner } from "./ai.js";

interface Env {
  ANTHROPIC_API_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors());

app.get("/", (c) => c.json({ service: "nestr-api", status: "ok" }));

/** Garde-fou : clé présente + corps JSON. */
function planner(c: { env: Env }) {
  const key = c.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY manquante");
  return createPlanner(key);
}

app.post("/ai/estimate", async (c) => {
  const { tasks } = await c.req.json<{ tasks: Task[] }>();
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return c.json({ error: "tasks requis" }, 400);
  }
  const estimates = await planner(c).estimateDurations(tasks);
  return c.json({ estimates });
});

app.post("/ai/breakdown", async (c) => {
  const { task } = await c.req.json<{ task: Task }>();
  if (!task?.id) return c.json({ error: "task requis" }, 400);
  const subtasks = await planner(c).breakdownTask(task);
  return c.json({ taskId: task.id, subtasks });
});

app.post("/ai/advise", async (c) => {
  const { tasks, freeMinutes } = await c.req.json<{
    tasks: Task[];
    freeMinutes: number;
  }>();
  if (!Array.isArray(tasks)) return c.json({ error: "tasks requis" }, 400);
  const advice = await planner(c).advise(tasks, freeMinutes ?? 0);
  return c.json(advice);
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

export default app;
