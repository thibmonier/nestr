/** Reprogramme les notifications desktop à chaque changement de plan. */
import { useEffect } from "react";
import { buildReminders, type DailyPlan } from "@nestr/core";
import { cancelReminders, syncReminders } from "../lib/notifications.js";

export function useReminders(plan: DailyPlan | null): void {
  useEffect(() => {
    if (!plan) return;
    void syncReminders(buildReminders(plan, { now: Date.now(), leadMinutes: 5 }));
    return () => cancelReminders();
  }, [plan]);
}
