/**
 * Client HTTP du Worker Nestr, partagé desktop + mobile.
 *
 * La couche réseau (API authentifiée, IA, calendriers, sync) est identique
 * entre plateformes ; seules la récupération du token de session et l'URL de
 * base diffèrent. On les injecte → une seule source de vérité pour les
 * endpoints (évite les divergences type le bug « /ai/* sans Bearer »).
 */
import type {
  CalendarEvent,
  ParsedEntry,
  PlanningPreferences,
  Task,
  TravelEstimate,
} from "@nestr/core";
import type {
  AiProvider,
  DurationEstimate,
  MeStatus,
  PlanAdvice,
  SubtaskProposal,
} from "./types.js";

export interface ClientOptions {
  /** URL de base du Worker (ex. https://nestr-api.…workers.dev). */
  baseUrl: string;
  /** Token de session courant (sync ou async selon le store de la plateforme). */
  getToken: () => string | null | Promise<string | null>;
  /** Appelé sur 401 (purge de session côté plateforme). Optionnel. */
  onUnauthorized?: () => void | Promise<void>;
}

export interface NestrClient {
  api<T>(path: string, opts?: { method?: string; body?: unknown }): Promise<T>;
  fetchMe(): Promise<MeStatus>;
  saveAiKey(provider: AiProvider, apiKey: string): Promise<{ ok: boolean }>;
  estimateDurations(tasks: Task[]): Promise<DurationEstimate[]>;
  breakdownTask(task: Task): Promise<SubtaskProposal[]>;
  advise(tasks: Task[], freeMinutes: number): Promise<PlanAdvice>;
  parseQuickAdd(text: string, todayISO: string): Promise<ParsedEntry>;
  /** Temps de trajet (Apple Maps). origin/destination = adresse ou "lat,lng". */
  travelTime(
    origin: string,
    destination: string,
    departureISO?: string,
  ): Promise<TravelEstimate>;
  fetchDayEvents(start: string, end: string): Promise<CalendarEvent[]>;
  pullTasks(): Promise<Task[]>;
  pushTasks(tasks: Task[]): Promise<{ ok: boolean }>;
  pullPreferences(): Promise<PlanningPreferences | null>;
  pushPreferences(preferences: PlanningPreferences): Promise<{ ok: boolean }>;
}

export function createClient(opts: ClientOptions): NestrClient {
  /** fetch JSON authentifié (Bearer). Lève sur erreur HTTP ; 401 ⇒ purge. */
  async function api<T>(
    path: string,
    o: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    const token = await opts.getToken();
    const res = await fetch(`${opts.baseUrl}${path}`, {
      method: o.method ?? "GET",
      headers: {
        "content-type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
    });
    if (res.status === 401) {
      await opts.onUnauthorized?.();
      throw new Error("Session expirée — reconnecte-toi.");
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`${path} : ${res.status} ${detail}`);
    }
    return res.json() as Promise<T>;
  }

  async function postEvents(
    path: string,
    start: string,
    end: string,
  ): Promise<CalendarEvent[]> {
    const { events } = await api<{ events: CalendarEvent[] }>(path, {
      method: "POST",
      body: { start, end },
    });
    return events;
  }

  return {
    api,

    fetchMe: () => api<MeStatus>("/me"),

    saveAiKey: (provider, apiKey) =>
      api("/me/ai", { method: "POST", body: { provider, apiKey } }),

    async estimateDurations(tasks) {
      const { estimates } = await api<{ estimates: DurationEstimate[] }>(
        "/ai/estimate",
        { method: "POST", body: { tasks } },
      );
      return estimates;
    },

    async breakdownTask(task) {
      const { subtasks } = await api<{ subtasks: SubtaskProposal[] }>(
        "/ai/breakdown",
        { method: "POST", body: { task } },
      );
      return subtasks;
    },

    advise: (tasks, freeMinutes) =>
      api<PlanAdvice>("/ai/advise", {
        method: "POST",
        body: { tasks, freeMinutes },
      }),

    async parseQuickAdd(text, todayISO) {
      const { entry } = await api<{ entry: ParsedEntry }>("/ai/parse", {
        method: "POST",
        body: { text, todayISO },
      });
      return entry;
    },

    travelTime: (origin, destination, departureISO) =>
      api<TravelEstimate>("/calendar/travel", {
        method: "POST",
        body: { origin, destination, departure: departureISO },
      }),

    /** Événements de toutes les sources connectées ; source non configurée ignorée. */
    async fetchDayEvents(start, end) {
      const results = await Promise.all([
        postEvents("/calendars/apple/events", start, end).catch(() => []),
        postEvents("/calendars/google/events", start, end).catch(() => []),
      ]);
      return results.flat();
    },

    async pullTasks() {
      const { tasks } = await api<{ tasks: Task[] }>("/me/tasks");
      return tasks ?? [];
    },

    pushTasks: (tasks) => api("/me/tasks", { method: "PUT", body: { tasks } }),

    async pullPreferences() {
      const { preferences } = await api<{
        preferences: PlanningPreferences | null;
      }>("/me/preferences");
      return preferences;
    },

    pushPreferences: (preferences) =>
      api("/me/preferences", { method: "PUT", body: { preferences } }),
  };
}
