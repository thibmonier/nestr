import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { z } from "zod/v4";
import type { Task } from "@nestr/core";

export type AiProvider = "anthropic" | "openai";

type UseCase = "parsing" | "planning" | "advice";

const MODEL_CONFIG: Record<AiProvider, Record<UseCase, string>> = {
  anthropic: {
    parsing: "claude-3-5-haiku-20241022",
    planning: "claude-opus-4-8",
    advice: "claude-opus-4-8",
  },
  openai: {
    parsing: "gpt-4o-mini",
    planning: "gpt-4o-2024-08-06",
    advice: "gpt-4o-2024-08-06",
  },
};

const FALLBACK_MODEL: Record<AiProvider, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o-2024-08-06",
};

const energyEnum = z.enum(["low", "medium", "high"]);

const estimateSchema = z.object({
  estimates: z.array(
    z.object({
      taskId: z.string(),
      estimatedMinutes: z.number(),
      energy: energyEnum,
      rationale: z.string(),
    }),
  ),
});

const breakdownSchema = z.object({
  subtasks: z.array(
    z.object({
      title: z.string(),
      estimatedMinutes: z.number(),
      energy: energyEnum,
    }),
  ),
});

const adviceSchema = z.object({
  summary: z.string(),
  tips: z.array(z.string()),
});

const parseSchema = z.object({
  kind: z.enum(["task", "event"]),
  title: z.string(),
  date: z.string().nullable(),
  start: z.string().nullable(),
  end: z.string().nullable(),
  location: z.string().nullable(),
  people: z.array(z.string()),
  context: z.enum(["pro", "perso"]),
  mode: z.enum(["video", "phone", "action", "trip"]).nullable(),
});

/* JSON Schemas explicites (mode strict OpenAI ; Anthropic utilise le zod). */
const ENERGY = { type: "string", enum: ["low", "medium", "high"] } as const;
const JSON_SCHEMAS = {
  estimate: {
    type: "object",
    additionalProperties: false,
    properties: {
      estimates: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            taskId: { type: "string" },
            estimatedMinutes: { type: "number" },
            energy: ENERGY,
            rationale: { type: "string" },
          },
          required: ["taskId", "estimatedMinutes", "energy", "rationale"],
        },
      },
    },
    required: ["estimates"],
  },
  breakdown: {
    type: "object",
    additionalProperties: false,
    properties: {
      subtasks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            estimatedMinutes: { type: "number" },
            energy: ENERGY,
          },
          required: ["title", "estimatedMinutes", "energy"],
        },
      },
    },
    required: ["subtasks"],
  },
  advice: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      tips: { type: "array", items: { type: "string" } },
    },
    required: ["summary", "tips"],
  },
  parse: {
    type: "object",
    additionalProperties: false,
    properties: {
      kind: { type: "string", enum: ["task", "event"] },
      title: { type: "string" },
      date: { type: ["string", "null"] },
      start: { type: ["string", "null"] },
      end: { type: ["string", "null"] },
      location: { type: ["string", "null"] },
      people: { type: "array", items: { type: "string" } },
      context: { type: "string", enum: ["pro", "perso"] },
      mode: { type: ["string", "null"], enum: ["video", "phone", "action", "trip", null] },
    },
    required: ["kind", "title", "date", "start", "end", "location", "people", "context", "mode"],
  },
} as const;

/** Description compacte d'une tâche pour les prompts. */
function taskLine(t: Task): string {
  const bits = [`id=${t.id}`, `titre="${t.title}"`, `priorité=${t.priority}`];
  if (t.notes) bits.push(`notes="${t.notes}"`);
  if (t.dueDate) bits.push(`échéance=${t.dueDate}`);
  return bits.join(" | ");
}

type SchemaKey = keyof typeof JSON_SCHEMAS;

/** Client LLM abstrait : un appel structuré, validé par zod, quel que soit le provider. */
interface LlmClient {
  provider: AiProvider;
  complete<T>(
    system: string,
    user: string,
    key: SchemaKey,
    zodSchema: z.ZodType<T>,
    effort: "low" | "medium",
    model: string,
  ): Promise<T>;
}

function anthropicClient(apiKey: string): LlmClient {
  const client = new Anthropic({ apiKey });
  return {
    provider: "anthropic",
    async complete(system, user, key, zodSchema, effort, model) {
      const res = await client.messages.parse({
        model,
        max_tokens: 4000,
        ...(key === "advice" ? { thinking: { type: "adaptive" as const } } : {}),
        output_config: { effort, format: zodOutputFormat(zodSchema as never) },
        system,
        messages: [{ role: "user", content: user }],
      });
      return (res.parsed_output ?? null) as never;
    },
  };
}

function openaiClient(apiKey: string): LlmClient {
  const client = new OpenAI({ apiKey });
  return {
    provider: "openai",
    async complete(system, user, key, zodSchema, _effort, model) {
      const res = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: key, strict: true, schema: JSON_SCHEMAS[key] as Record<string, unknown> },
        },
      });
      const content = res.choices[0]?.message?.content ?? "{}";
      return zodSchema.parse(JSON.parse(content));
    },
  };
}

export function createPlanner(provider: AiProvider, apiKey: string) {
  const llm: LlmClient = provider === "openai" ? openaiClient(apiKey) : anthropicClient(apiKey);
  const models = MODEL_CONFIG[provider];

  return {
    /** Estime durée et charge cognitive de chaque tâche. */
    async estimateDurations(tasks: Task[]) {
      const out = await llm.complete(
        "Tu es un assistant de productivité. Estime une durée réaliste (minutes) " +
          "et la charge cognitive (energy) pour chaque tâche. Réponds en français pour rationale. " +
          "Sois concret : une tâche floue de travail intellectuel dure rarement moins de 25 min.",
        "Estime ces tâches. Renvoie un objet par tâche, en réutilisant l'id fourni.\n\n" +
          tasks.map(taskLine).join("\n"),
        "estimate",
        estimateSchema,
        "low",
        models.planning,
      );
      return out?.estimates ?? [];
    },

    /** Découpe une grosse tâche en sous-tâches actionnables. */
    async breakdownTask(task: Task) {
      const out = await llm.complete(
        "Tu es un assistant de productivité. Découpe la tâche en 2 à 6 sous-tâches " +
          "concrètes, séquentielles et réalisables, chacune avec une durée et une charge. " +
          "Titres en français, à l'impératif.",
        `Découpe cette tâche :\n${taskLine(task)}`,
        "breakdown",
        breakdownSchema,
        "medium",
        models.planning,
      );
      return out?.subtasks ?? [];
    },

    /** Structure une phrase en langage naturel en tâche ou événement.
     *  Utilise le modèle léger (Haiku/gpt-4o-mini) avec fallback automatique. */
    async parseQuickAdd(text: string, todayISO: string) {
      const systemPrompt =
        "Tu structures une saisie en langage naturel en tâche OU événement d'agenda. " +
        "Choisis kind=event si la phrase décrit un rendez-vous daté avec un horaire ou des personnes " +
        "(réunion, déjeuner, appel) ; sinon kind=task. " +
        `Aujourd'hui = ${todayISO}. Résous les dates relatives (« mardi », « demain ») en YYYY-MM-DD. ` +
        "Horaires en HH:mm 24h, null si absent. Déduis le mode : video (visio), phone (appel), " +
        "trip (déplacement/présentiel hors bureau), action (par défaut). context=pro sauf indice perso. " +
        "people = prénoms/noms cités. Titre court et clair, en français.";

      try {
        const entry = await llm.complete(systemPrompt, text, "parse", parseSchema, "low", models.parsing);
        if (!entry) throw new Error("empty response");
        return entry;
      } catch {
        console.warn(`${models.parsing} parsing failed, fallback to ${FALLBACK_MODEL[provider]}`);
        const entry = await llm.complete(systemPrompt, text, "parse", parseSchema, "low", FALLBACK_MODEL[provider]);
        if (!entry) throw new Error("L'IA n'a pas pu structurer la phrase, reformule un peu.");
        return entry;
      }
    },

    /** Conseils stratégiques pour la journée. */
    async advise(tasks: Task[], freeMinutes: number) {
      const out = await llm.complete(
        "Tu es un coach de productivité. À partir des tâches et du temps libre disponible, " +
          "donne un résumé d'une phrase et 3 à 5 conseils ordonnés et actionnables, en français. " +
          "Tiens compte des priorités, des échéances et de l'énergie.",
        `Temps libre aujourd'hui : ${freeMinutes} minutes.\n\nTâches :\n` +
          tasks.map(taskLine).join("\n"),
        "advice",
        adviceSchema,
        "medium",
        models.advice,
      );
      return out ?? { summary: "", tips: [] as string[] };
    },
  };
}

export { MODEL_CONFIG, FALLBACK_MODEL };
