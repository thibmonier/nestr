import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";
import type { Task } from "@nestr/core";
import { createPlanner, type AiProvider } from "./ai.js";
import {
  exchangeCode,
  googleAuthUrl,
  listGoogleEvents,
  refreshAccessToken,
  type GoogleConfig,
} from "./calendars/google.js";
import { fetchAppleEvents } from "./calendars/apple.js";
import { decodeJwtPayload, decryptText, encryptText } from "./crypto.js";
import { isAppRedirect } from "./redirect.js";
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
  getAiCredential,
  setAiCredential,
} from "./db.js";

interface Env {
  DB: D1Database;
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

/** Planner IA de l'utilisateur (provider + clé chiffrée en DB). 401 si non
 *  connecté, 400 si pas de clé IA configurée. */
async function plannerFor(c: Ctx) {
  const userId = await requireUser(c);
  const cred = await getAiCredential(c.env.DB, userId);
  if (!cred) return null;
  const { apiKey } = JSON.parse(await decryptText(cred.enc, c.env.ENCRYPTION_KEY));
  return createPlanner(cred.provider as AiProvider, apiKey);
}

const NO_AI = { error: "Aucune clé IA configurée. Ajoute ta clé dans les Réglages." } as const;

// --- IA (authentifié ; utilise la clé IA de l'utilisateur) ---
app.post("/ai/estimate", async (c) => {
  const { tasks } = await c.req.json<{ tasks: Task[] }>();
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return c.json({ error: "tasks requis" }, 400);
  }
  const p = await plannerFor(c);
  if (!p) return c.json(NO_AI, 400);
  return c.json({ estimates: await p.estimateDurations(tasks) });
});

app.post("/ai/breakdown", async (c) => {
  const { task } = await c.req.json<{ task: Task }>();
  if (!task?.id) return c.json({ error: "task requis" }, 400);
  const p = await plannerFor(c);
  if (!p) return c.json(NO_AI, 400);
  return c.json({ taskId: task.id, subtasks: await p.breakdownTask(task) });
});

app.post("/ai/advise", async (c) => {
  const { tasks, freeMinutes } = await c.req.json<{
    tasks: Task[];
    freeMinutes: number;
  }>();
  if (!Array.isArray(tasks)) return c.json({ error: "tasks requis" }, 400);
  const p = await plannerFor(c);
  if (!p) return c.json(NO_AI, 400);
  return c.json(await p.advise(tasks, freeMinutes ?? 0));
});

app.post("/ai/parse", async (c) => {
  const { text, todayISO } = await c.req.json<{ text: string; todayISO?: string }>();
  if (typeof text !== "string" || !text.trim()) {
    return c.json({ error: "text requis" }, 400);
  }
  const p = await plannerFor(c);
  if (!p) return c.json(NO_AI, 400);
  const today = todayISO ?? new Date().toISOString().slice(0, 10);
  return c.json({ entry: await p.parseQuickAdd(text.trim(), today) });
});

// --- Auth Google (login + connexion calendrier en une fois) ---

/** Émetteurs `iss` acceptés pour un id_token Google. */
const GOOGLE_ISS = ["accounts.google.com", "https://accounts.google.com"];

app.get("/auth/google", (c) => {
  // L'app (Tauri loopback ou Expo deep-link) passe sa cible de retour. On la
  // transporte dans le `state` OAuth (round-trip jusqu'au callback).
  const appRedirect = c.req.query("app_redirect");
  const state = appRedirect && isAppRedirect(appRedirect) ? appRedirect : "nestr";
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

  // Défense en profondeur : l'id_token vient de notre échange TLS authentifié,
  // mais on vérifie quand même que les claims ciblent bien NOTRE client et un
  // émetteur Google (rejette un token destiné à une autre app / un autre IdP).
  const aud = claims.aud as string | undefined;
  const iss = claims.iss as string | undefined;
  if (aud !== cfg.clientId || !iss || !GOOGLE_ISS.includes(iss)) {
    return c.text("Jeton Google invalide", 401);
  }

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

  // Flux app (Tauri loopback `http://localhost:PORT` ou Expo deep-link
  // `nestr://auth`) : le `state` porte la cible de retour. On y renvoie le
  // token en query plutôt que par postMessage.
  const state = c.req.query("state") ?? "";
  if (isAppRedirect(state)) {
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
  const [google, apple, ai] = await Promise.all([
    getCredential(c.env.DB, userId, "google"),
    getCredential(c.env.DB, userId, "apple"),
    getAiCredential(c.env.DB, userId),
  ]);
  return c.json({
    googleConnected: !!google,
    appleConnected: !!apple,
    aiConfigured: !!ai,
    aiProvider: ai?.provider ?? null,
  });
});

/** Enregistre la clé IA de l'utilisateur (chiffrée). Provider : anthropic | openai. */
app.post("/me/ai", async (c) => {
  const userId = await requireUser(c);
  const { provider, apiKey } = await c.req.json<{ provider: string; apiKey: string }>();
  if (provider !== "anthropic" && provider !== "openai") {
    return c.json({ error: "provider invalide (anthropic | openai)" }, 400);
  }
  if (!apiKey || apiKey.trim().length < 8) {
    return c.json({ error: "clé API requise" }, 400);
  }
  await setAiCredential(
    c.env.DB,
    userId,
    provider,
    await encryptText(JSON.stringify({ apiKey: apiKey.trim() }), c.env.ENCRYPTION_KEY),
  );
  return c.json({ ok: true });
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
  // Détail loggé côté serveur uniquement ; le client reçoit un message générique
  // (évite de fuiter messages d'erreur internes / bodies d'API tierces).
  console.error(err);
  return c.json({ error: "Erreur interne" }, 500);
});

export default app;
