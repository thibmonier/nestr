/**
 * Notifications locales (mobile) : permissions + (re)programmation des rappels
 * à partir des `Reminder` du domaine. No-op sur le web (expo-notifications n'y
 * programme pas de notification planifiée).
 */
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import type { Reminder } from "@nestr/core";

const isNative = Platform.OS === "ios" || Platform.OS === "android";

// Affiche les notifications même app au premier plan.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Demande la permission (idempotent). Renvoie true si accordée. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNative || !Device.isDevice) return false;
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Rappels Nestr",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return true;
}

/**
 * Reprogramme tous les rappels : annule l'existant puis planifie la nouvelle
 * liste. Idempotent — à rappeler après chaque génération de plan.
 */
export async function syncReminders(reminders: Reminder[]): Promise<void> {
  if (!isNative) return;
  const granted = await ensureNotificationPermission();
  if (!granted) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, data: { taskId: r.taskId, eventId: r.eventId } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(r.fireAt),
      },
    });
  }
}
