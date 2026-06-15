/** Événements créés localement (ajout rapide IA) : persistance AsyncStorage + CRUD. */
import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent } from "@nestr/core";
import { loadEvents, saveEvents } from "../lib/storage";

export function useLocalEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    void loadEvents().then(setEvents);
  }, []);

  const persist = useCallback((next: CalendarEvent[]) => {
    setEvents(next);
    void saveEvents(next);
  }, []);

  const addEvent = useCallback(
    (event: CalendarEvent) => setEvents((prev) => {
      const next = [...prev, event];
      void saveEvents(next);
      return next;
    }),
    [],
  );

  const removeEvent = useCallback(
    (id: string) => setEvents((prev) => {
      const next = prev.filter((e) => e.id !== id);
      void saveEvents(next);
      return next;
    }),
    [],
  );

  return { events, addEvent, removeEvent, setEvents: persist };
}
