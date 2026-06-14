/**
 * Notifications desktop (Tauri) : l'app étant ouverte, on déclenche une
 * notification système via un timer programmé à l'instant de chaque rappel.
 * No-op hors Tauri (dev navigateur). Les imports du plugin sont dynamiques
 * pour ne pas charger `invoke` côté web.
 */
import { isTauri } from "@tauri-apps/api/core";
import type { Reminder } from "@nestr/core";

let timers: ReturnType<typeof setTimeout>[] = [];

function clearTimers(): void {
  for (const t of timers) clearTimeout(t);
  timers = [];
}

async function ensurePermission(): Promise<boolean> {
  const { isPermissionGranted, requestPermission } = await import(
    "@tauri-apps/plugin-notification"
  );
  if (await isPermissionGranted()) return true;
  return (await requestPermission()) === "granted";
}

/**
 * Annule les rappels en attente puis reprogramme la nouvelle liste. Idempotent
 * — à rappeler après chaque génération de plan.
 */
export async function syncReminders(reminders: Reminder[]): Promise<void> {
  if (!isTauri()) return;
  clearTimers();
  if (!(await ensurePermission())) return;
  const { sendNotification } = await import("@tauri-apps/plugin-notification");
  const now = Date.now();
  for (const r of reminders) {
    const delay = r.fireAt - now;
    if (delay <= 0) continue;
    // setTimeout plafonne à ~24,8 jours ; les plans sont journaliers, donc OK.
    timers.push(
      setTimeout(() => void sendNotification({ title: r.title, body: r.body }), delay),
    );
  }
}

/** Annule tous les rappels programmés (ex. au démontage). */
export function cancelReminders(): void {
  clearTimers();
}
