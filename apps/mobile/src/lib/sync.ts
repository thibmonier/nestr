/** Sync tâches + préférences : délègue au client partagé. */
import { client } from "./api";

export const { pullTasks, pushTasks, pullPreferences, pushPreferences } = client;
