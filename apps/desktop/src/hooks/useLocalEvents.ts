/** Événements créés localement (ajout rapide IA) : persistance + CRUD léger. */
import { useEffect, useState } from "react";
import type { CalendarEvent } from "@nestr/core";
import { loadEvents, saveEvents } from "../lib/storage.js";

export function useLocalEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadEvents());

  useEffect(() => saveEvents(events), [events]);

  function addEvent(event: CalendarEvent) {
    setEvents((prev) => [...prev, event]);
  }

  function removeEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return { events, addEvent, removeEvent };
}
