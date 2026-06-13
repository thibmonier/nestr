import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";
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
import { decodeJwtPayload, decryptText, encryptText } from "./crypto.js";
import {
  createSession,
  getCredential,
  getPreferences,
  getTasks,
  setCredential,
  setPreferences,
  setTasks,
  upsertUser,
  userIdForSession,
} from "./db.js";

interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  ENCRYPTION_KEY: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
}

type Ctx = Context<{ Bindings: Env }>;

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

/** Lit le token de session (Bearer) → user_id, ou renvoie 401. */
async function requireUser(c: Ctx): Promise<string> {
  const auth = c.req.header("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const userId = token ? await userIdForSession(c.env.DB, token) : null;
  if (!userId) throw new HttpError(401, "Non authentifié");
  return userId;
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function planner(c: Ctx) {
  if (!c.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY manquante");
  return createPlanner(c.env.ANTHROPIC_API_KEY);
}

// --- IA (non authentifié, pas de données utilisateur persistées) ---
app.post("/ai/estimate", async (c) => {
  const { tasks } = await c.req.json<{ tasks: Task[] }>();
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return c.json({ error: "tasks requis" }, 400);
  }
  return c.json({ estimates: await planner(c).estimateDurations(tasks) });
});

app.post("/ai/breakdown", async (c) => {
  const { task } = await c.req.json<{ task: Task }>();
  if (!task?.id) return c.json({ error: "task requis" }, 400);
  return c.json({ taskId: task.id, subtasks: await planner(c).breakdownTask(task) });
});

app.post("/ai/advise", async (c) => {
  const { tasks, freeMinutes } = await c.req.json<{
    tasks: Task[];
    freeMinutes: number;
  }>();
  if (!Array.isArray(tasks)) return c.json({ error: "tasks requis" }, 400);
  return c.json(await planner(c).advise(tasks, freeMinutes ?? 0));
});

// --- Auth Google (login + connexion calendrier en une fois) ---

/** Seules les URL loopback sont acceptées comme cible de retour (anti open-redirect). */
const LOOPBACK_RE = /^http:\/\/(localhost|127\.0\.0\.1):\d+\/?$/;

app.get("/auth/google", (c) => {
  // En Tauri : l'app passe un serveur loopback comme cible de retour. On le
  // transporte dans le `state` OAuth (round-trip jusqu'au callback).
  const appRedirect = c.req.query("app_redirect");
  const state = appRedirect && LOOPBACK_RE.test(appRedirect) ? appRedirect : "nestr";
  return c.redirect(googleAuthUrl(googleConfig(c.env), state));
});

app.get("/auth/google/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.text("Code manquant", 400);

  const cfg = googleConfig(c.env);
  const tokens = await exchangeCode(cfg, code);
  const claims = tokens.id_token ? decodeJwtPayload(tokens.id_token) : {};
  const sub = claims.sub as string | undefined;
  if (!sub) return c.text("Identité Google introuvable", 400);

  const user = await upsertUser(
    c.env.DB,
    sub,
    (claims.email as string) ?? null,
    (claims.name as string) ?? null,
  );
  if (tokens.refresh_token) {
    await setCredential(
      c.env.DB,
      user.id,
      "google",
      await encryptText(
        JSON.stringify({ refreshToken: tokens.refresh_token }),
        c.env.ENCRYPTION_KEY,
      ),
    );
  }
  const session = await createSession(c.env.DB, user.id);

  // Flux Tauri (loopback) : le `state` est l'URL du serveur localhost de l'app.
  // On y renvoie le token en query plutôt que par postMessage.
  const state = c.req.query("state") ?? "";
  if (LOOPBACK_RE.test(state)) {
    const target = new URL(state);
    target.searchParams.set("token", session);
    if (user.email) target.searchParams.set("email", user.email);
    return c.redirect(target.toString());
  }

  const payload = JSON.stringify({
    type: "nestr-auth",
    sessionToken: session,
    email: user.email,
  });
  return c.html(`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:2rem">
<p>Connecté à Nestr. Tu peux fermer cette fenêtre.</p>
<script>
  if (window.opener) window.opener.postMessage(${payload}, "*");
  setTimeout(() => window.close(), 800);
</script></body>`);
});

// --- Compte ---
app.get("/me", async (c) => {
  const userId = await requireUser(c);
  const [google, apple] = await Promise.all([
    getCredential(c.env.DB, userId, "google"),
    getCredential(c.env.DB, userId, "apple"),
  ]);
  return c.json({ googleConnected: !!google, appleConnected: !!apple });
});

app.get("/me/tasks", async (c) => {
  const userId = await requireUser(c);
  return c.json({ tasks: (await getTasks(c.env.DB, userId)) ?? [] });
});

app.put("/me/tasks", async (c) => {
  const userId = await requireUser(c);
  const { tasks } = await c.req.json<{ tasks: Task[] }>();
  await setTasks(c.env.DB, userId, tasks ?? []);
  return c.json({ ok: true });
});

app.get("/me/preferences", async (c) => {
  const userId = await requireUser(c);
  return c.json({ preferences: await getPreferences(c.env.DB, userId) });
});

app.put("/me/preferences", async (c) => {
  const userId = await requireUser(c);
  const { preferences } = await c.req.json<{ preferences: unknown }>();
  await setPreferences(c.env.DB, userId, preferences);
  return c.json({ ok: true });
});

app.post("/me/apple", async (c) => {
  const userId = await requireUser(c);
  const { appleId, appPassword } = await c.req.json<{
    appleId: string;
    appPassword: string;
  }>();
  if (!appleId || !appPassword) {
    return c.json({ error: "appleId et appPassword requis" }, 400);
  }
  await setCredential(
    c.env.DB,
    userId,
    "apple",
    await encryptText(JSON.stringify({ appleId, appPassword }), c.env.ENCRYPTION_KEY),
  );
  return c.json({ ok: true });
});

// --- Événements calendrier (identifiants stockés par utilisateur) ---
app.post("/calendars/google/events", async (c) => {
  const userId = await requireUser(c);
  const { start, end } = await c.req.json<{ start: string; end: string }>();
  const enc = await getCredential(c.env.DB, userId, "google");
  if (!enc) return c.json({ error: "Google non connecté" }, 400);
  const { refreshToken } = JSON.parse(await decryptText(enc, c.env.ENCRYPTION_KEY));
  const accessToken = await refreshAccessToken(googleConfig(c.env), refreshToken);
  return c.json({ events: await listGoogleEvents(accessToken, start, end) });
});

app.post("/calendars/apple/events", async (c) => {
  const userId = await requireUser(c);
  const { start, end } = await c.req.json<{ start: string; end: string }>();
  const enc = await getCredential(c.env.DB, userId, "apple");
  if (!enc) return c.json({ error: "Apple non configuré" }, 400);
  const { appleId, appPassword } = JSON.parse(
    await decryptText(enc, c.env.ENCRYPTION_KEY),
  );
  return c.json({ events: await fetchAppleEvents(appleId, appPassword, start, end) });
});

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status as 401);
  console.error(err);
  return c.json({ error: err.message }, 500);
});

export default app;
