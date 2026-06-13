import type { CalendarEvent } from "@nestr/core";

const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** URL de consentement OAuth Google (accès hors-ligne pour obtenir un refresh_token). */
export function googleAuthUrl(cfg: GoogleConfig, state: string): string {
  const p = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

/** Échange le code d'autorisation contre des tokens. */
export async function exchangeCode(
  cfg: GoogleConfig,
  code: string,
): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token ${res.status} : ${await res.text()}`);
  return res.json();
}

/** Rafraîchit un access_token à partir d'un refresh_token. */
export async function refreshAccessToken(
  cfg: GoogleConfig,
  refreshToken: string,
): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google refresh ${res.status} : ${await res.text()}`);
  return ((await res.json()) as TokenResponse).access_token;
}

interface GEvent {
  id: string;
  summary?: string;
  status?: string;
  transparency?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

/** Liste les événements du calendrier principal sur la plage donnée. */
export async function listGoogleEvents(
  accessToken: string,
  startISO: string,
  endISO: string,
): Promise<CalendarEvent[]> {
  const p = new URLSearchParams({
    timeMin: startISO,
    timeMax: endISO,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${p}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Google events ${res.status} : ${await res.text()}`);
  const data = (await res.json()) as { items?: GEvent[] };

  return (data.items ?? []).flatMap((e): CalendarEvent[] => {
    const start = e.start?.dateTime ?? e.start?.date;
    const end = e.end?.dateTime ?? e.end?.date;
    if (!start || !end) return [];
    return [
      {
        id: e.id,
        source: "google",
        calendarId: "primary",
        title: e.summary ?? "(sans titre)",
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        allDay: !e.start?.dateTime,
        busy: e.status !== "cancelled" && e.transparency !== "transparent",
      },
    ];
  });
}
