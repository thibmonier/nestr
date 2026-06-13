import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import type { Task } from "@nestr/core";

const MODEL = "claude-opus-4-8";

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

/** Description compacte d'une tâche pour les prompts. */
function taskLine(t: Task): string {
  const bits = [
    `id=${t.id}`,
    `titre="${t.title}"`,
    `priorité=${t.priority}`,
  ];
  if (t.notes) bits.push(`notes="${t.notes}"`);
  if (t.dueDate) bits.push(`échéance=${t.dueDate}`);
  return bits.join(" | ");
}

export function createPlanner(apiKey: string) {
  const client = new Anthropic({ apiKey });

  return {
    /** Estime durée et charge cognitive de chaque tâche. */
    async estimateDurations(tasks: Task[]) {
      const res = await client.messages.parse({
        model: MODEL,
        max_tokens: 4000,
        output_config: {
          effort: "low",
          format: zodOutputFormat(estimateSchema),
        },
        system:
          "Tu es un assistant de productivité. Estime une durée réaliste (minutes) " +
          "et la charge cognitive (energy) pour chaque tâche. Réponds en français pour rationale. " +
          "Sois concret : une tâche floue de travail intellectuel dure rarement moins de 25 min.",
        messages: [
          {
            role: "user",
            content:
              "Estime ces tâches. Renvoie un objet par tâche, en réutilisant l'id fourni.\n\n" +
              tasks.map(taskLine).join("\n"),
          },
        ],
      });
      return res.parsed_output?.estimates ?? [];
    },

    /** Découpe une grosse tâche en sous-tâches actionnables. */
    async breakdownTask(task: Task) {
      const res = await client.messages.parse({
        model: MODEL,
        max_tokens: 4000,
        output_config: {
          effort: "medium",
          format: zodOutputFormat(breakdownSchema),
        },
        system:
          "Tu es un assistant de productivité. Découpe la tâche en 2 à 6 sous-tâches " +
          "concrètes, séquentielles et réalisables, chacune avec une durée et une charge. " +
          "Titres en français, à l'impératif.",
        messages: [{ role: "user", content: `Découpe cette tâche :\n${taskLine(task)}` }],
      });
      return res.parsed_output?.subtasks ?? [];
    },

    /** Conseils stratégiques pour la journée. */
    async advise(tasks: Task[], freeMinutes: number) {
      const res = await client.messages.parse({
        model: MODEL,
        max_tokens: 4000,
        thinking: { type: "adaptive" },
        output_config: {
          effort: "medium",
          format: zodOutputFormat(adviceSchema),
        },
        system:
          "Tu es un coach de productivité. À partir des tâches et du temps libre disponible, " +
          "donne un résumé d'une phrase et 3 à 5 conseils ordonnés et actionnables, en français. " +
          "Tiens compte des priorités, des échéances et de l'énergie.",
        messages: [
          {
            role: "user",
            content:
              `Temps libre aujourd'hui : ${freeMinutes} minutes.\n\nTâches :\n` +
              tasks.map(taskLine).join("\n"),
          },
        ],
      });
      return (
        res.parsed_output ?? { summary: "", tips: [] as string[] }
      );
    },
  };
}
