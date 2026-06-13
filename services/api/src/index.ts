import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Task } from "@nestr/core";
import { createPlanner } from "./ai.js";
import {
  exchangeCode,
  googleAuthUrl,
  listGoogleEvents,
  refreshAccessToken,
  type GoogleConfig,
} from "./calendars/google.js";
import { fetchAppleEvents } from "./calendars/apple.js";

interface Env {
  ANTHROPIC_API_KEY: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  APPLE_ID?: string;
  APPLE_APP_PASSWORD?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors());

app.get("/", (c) => c.json({ service: "nestr-api", status: "ok" }));

function googleConfig(env: Env): GoogleConfig {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error("Configuration Google OAuth manquante");
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  };
}

// --- Google OAuth ---
app.get("/auth/google", (c) =>
  c.redirect(googleAuthUrl(googleConfig(c.env), "nestr")),
);

// Callback : échange le code, renvoie le refresh_token à l'app via postMessage.
app.get("/auth/google/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.text("Code manquant", 400);
  const tokens = await exchangeCode(googleConfig(c.env), code);
  const payload = JSON.stringify({
    type: "nestr-google-auth",
    refreshToken: tokens.refresh_token ?? null,
  });
  return c.html(`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:2rem">
<p>Google Calendar connecté. Tu peux fermer cette fenêtre.</p>
<script>
  if (window.opener) window.opener.postMessage(${payload}, "*");
  setTimeout(() => window.close(), 800);
</script></body>`);
});

// --- Événements calendrier ---
app.post("/calendars/google/events", async (c) => {
  const { refreshToken, start, end } = await c.req.json<{
    refreshToken: string;
    start: string;
    end: string;
  }>();
  if (!refreshToken) return c.json({ error: "refreshToken requis" }, 400);
  const cfg = googleConfig(c.env);
  const accessToken = await refreshAccessToken(cfg, refreshToken);
  const events = await listGoogleEvents(accessToken, start, end);
  return c.json({ events });
});

app.post("/calendars/apple/events", async (c) => {
  if (!c.env.APPLE_ID || !c.env.APPLE_APP_PASSWORD) {
    return c.json({ error: "Identifiants Apple manquants" }, 400);
  }
  const { start, end } = await c.req.json<{ start: string; end: string }>();
  const events = await fetchAppleEvents(
    c.env.APPLE_ID,
    c.env.APPLE_APP_PASSWORD,
    start,
    end,
  );
  return c.json({ events });
});

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
