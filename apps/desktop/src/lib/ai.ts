/** IA : délègue au client partagé (endpoints /ai/* authentifiés). */
import { client } from "./api.js";

export type {
  DurationEstimate,
  PlanAdvice,
  SubtaskProposal,
} from "@nestr/client";

export const { estimateDurations, breakdownTask, advise } = client;
