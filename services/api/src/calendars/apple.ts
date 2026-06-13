import type { CalendarEvent } from "@nestr/core";
import { parseICal } from "./ical.js";

const HOST = "https://caldav.icloud.com";

function authHeader(appleId: string, appPassword: string): string {
  return "Basic " + btoa(`${appleId}:${appPassword}`);
}

/** Résout un href (relatif ou absolu) en URL absolue sur le host iCloud. */
function absolute(href: string): string {
  if (href.startsWith("http")) return href;
  return HOST.replace(/\/$/, "") + (href.startsWith("/") ? href : "/" + href);
}

/** Extrait le premier <href> d'un bloc XML (insensible au namespace). */
function firstHref(xml: string): string | null {
  return (
    /<[\w-]*:?href[^>]*>\s*([^<\s][^<]*?)\s*<\/[\w-]*:?href>/i.exec(xml)?.[1] ??
    null
  );
}

/** Isole le contenu d'un élément (tolère préfixe de namespace et attributs). */
function block(xml: string, tag: string): string {
  const re = new RegExp(
    `<[\\w-]*:?${tag}[^>]*>[\\s\\S]*?<\\/[\\w-]*:?${tag}>`,
    "i",
  );
  return re.exec(xml)?.[0] ?? "";
}

async function propfind(
  url: string,
  auth: string,
  depth: "0" | "1",
  body: string,
): Promise<string> {
  const res = await fetch(url, {
    method: "PROPFIND",
    headers: {
      Authorization: auth,
      Depth: depth,
      "Content-Type": "text/xml; charset=utf-8",
      "User-Agent": "Nestr/1.0 (CalDAV)",
    },
    body,
  });
  if (res.status >= 400) {
    throw new Error(`CalDAV PROPFIND ${res.status} sur ${url}`);
  }
  return res.text();
}

const PROP_PRINCIPAL = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`;

const PROP_HOME = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
<d:prop><c:calendar-home-set/></d:prop></d:propfind>`;

const PROP_CALENDARS = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
<d:prop><d:resourcetype/><d:displayname/>
<c:supported-calendar-component-set/></d:prop></d:propfind>`;

/** Découpe un multistatus en blocs <response>. */
function responses(xml: string): string[] {
  return xml.match(/<[\w-]*:?response[^>]*>[\s\S]*?<\/[\w-]*:?response>/gi) ?? [];
}

/** Découvre les collections de calendriers supportant les VEVENT. */
async function discoverCalendars(auth: string): Promise<string[]> {
  const principalXml = await propfind(HOST + "/", auth, "0", PROP_PRINCIPAL);
  const principal = firstHref(block(principalXml, "current-user-principal"));
  if (!principal) throw new Error("CalDAV : principal introuvable");

  const homeXml = await propfind(absolute(principal), auth, "0", PROP_HOME);
  const home = firstHref(block(homeXml, "calendar-home-set"));
  if (!home) throw new Error("CalDAV : calendar-home introuvable");

  const listXml = await propfind(absolute(home), auth, "1", PROP_CALENDARS);
  const calendars: string[] = [];
  for (const block of responses(listXml)) {
    const isCalendar = /<[\w-]*:?calendar\b/i.test(block);
    const hasVevent = /VEVENT/i.test(block);
    const href = firstHref(block);
    if (isCalendar && hasVevent && href) calendars.push(absolute(href));
  }
  return calendars;
}

/** Décode les entités XML basiques d'un bloc calendar-data. */
function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#13;/g, "")
    .replace(/&amp;/g, "&");
}

/** Interroge un calendrier sur une plage et renvoie les événements. */
async function queryCalendar(
  calUrl: string,
  auth: string,
  startISO: string,
  endISO: string,
): Promise<CalendarEvent[]> {
  const fmt = (iso: string) =>
    iso.replace(/[-:]/g, "").replace(/\.\d+/, "").replace(/Z?$/, "Z");

  const body = `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><c:calendar-data/></d:prop>
  <c:filter><c:comp-filter name="VCALENDAR">
    <c:comp-filter name="VEVENT">
      <c:time-range start="${fmt(startISO)}" end="${fmt(endISO)}"/>
    </c:comp-filter>
  </c:comp-filter></c:filter>
</c:calendar-query>`;

  const res = await fetch(calUrl, {
    method: "REPORT",
    headers: {
      Authorization: auth,
      Depth: "1",
      "Content-Type": "text/xml; charset=utf-8",
      "User-Agent": "Nestr/1.0 (CalDAV)",
    },
    body,
  });
  if (res.status >= 400) throw new Error(`CalDAV REPORT ${res.status}`);
  const xml = await res.text();

  const events: CalendarEvent[] = [];
  const re =
    /<[\w-]*:?calendar-data[^>]*>([\s\S]*?)<\/[\w-]*:?calendar-data>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    events.push(...parseICal(unescapeXml(m[1]!), "apple", calUrl));
  }
  return events;
}

/** Récupère les événements iCloud sur la plage [startISO, endISO]. */
export async function fetchAppleEvents(
  appleId: string,
  appPassword: string,
  startISO: string,
  endISO: string,
): Promise<CalendarEvent[]> {
  const auth = authHeader(appleId, appPassword);
  const calendars = await discoverCalendars(auth);
  const results = await Promise.all(
    calendars.map((c) =>
      queryCalendar(c, auth, startISO, endISO).catch(() => [] as CalendarEvent[]),
    ),
  );
  return results.flat();
}
