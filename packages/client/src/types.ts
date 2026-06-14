/** Types partagés du client Nestr (API Worker, IA, compte). */
import type { Energy } from "@nestr/core";

export type AiProvider = "anthropic" | "openai";

/** État du compte renvoyé par `/me`. */
export interface MeStatus {
  googleConnected: boolean;
  appleConnected: boolean;
  aiConfigured: boolean;
  aiProvider: AiProvider | null;
}

export interface DurationEstimate {
  taskId: string;
  estimatedMinutes: number;
  energy: Energy;
  rationale: string;
}

export interface PlanAdvice {
  summary: string;
  tips: string[];
}

export interface SubtaskProposal {
  title: string;
  estimatedMinutes: number;
  energy: Energy;
}
