import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "../model/types.js";
import { buildTravelEvent, navUrl, travelLabel } from "./travel.js";

const event: CalendarEvent = {
  id: "e1",
  source: "google",
  calendarId: "primary",
  title: "RDV client",
  start: "2026-06-20T14:00:00.000Z",
  end: "2026-06-20T15:00:00.000Z",
  location: "12 rue de la Paix, Paris",
  busy: true,
};

describe("navUrl", () => {
  it("Apple Plans encode l'adresse en daddr", () => {
    expect(navUrl("apple", "12 rue de la Paix, Paris")).toBe(
      "https://maps.apple.com/?daddr=12%20rue%20de%20la%20Paix%2C%20Paris&dirflg=d",
    );
  });

  it("Google Maps utilise le format dir api=1", () => {
    expect(navUrl("google", "Paris")).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Paris",
    );
  });

  it("Waze passe navigate=yes", () => {
    expect(navUrl("waze", "Paris")).toBe("https://waze.com/ul?q=Paris&navigate=yes");
  });
});

describe("travelLabel", () => {
  it("formate les minutes seules", () => {
    expect(travelLabel(25 * 60)).toBe("25 min");
  });
  it("formate heures + minutes avec zéro de tête", () => {
    expect(travelLabel(65 * 60)).toBe("1 h 05");
  });
  it("omet les minutes si pile une heure", () => {
    expect(travelLabel(120 * 60)).toBe("2 h");
  });
  it("arrondit au moins à 1 min", () => {
    expect(travelLabel(10)).toBe("1 min");
  });
});

describe("buildTravelEvent", () => {
  it("bloque le créneau [départ, début] selon la durée estimée", () => {
    const t = buildTravelEvent(event, { seconds: 1800, meters: 12000 }, { id: "t1" });
    expect(t.start).toBe("2026-06-20T13:30:00.000Z");
    expect(t.end).toBe(event.start);
    expect(t.source).toBe("local");
    expect(t.title).toBe("Trajet → RDV client");
    expect(t.location).toBe("12 rue de la Paix, Paris");
    expect(t.busy).toBe(true);
  });

  it("recopie l'absence de lieu", () => {
    const t = buildTravelEvent({ ...event, location: undefined }, { seconds: 600, meters: 3000 }, {
      id: "t2",
    });
    expect(t.location).toBeUndefined();
  });
});
