/**
 * Client Apple Maps Server API : signe un token MapKit (ES256), l'échange
 * contre un access token, puis appelle géocodage et ETA trafic.
 * La clé privée (.p8) reste côté Worker — jamais exposée au client.
 */
import type { TravelEstimate } from "@nestr/core";

const TOKEN_URL = "https://maps-api.apple.com/v1/token";
const BASE = "https://maps-api.apple.com/v1";

export interface AppleMapsConfig {
  /** Contenu du .p8 : clé privée EC P-256 au format PEM (PKCS8). */
  privateKeyPem: string;
  keyId: string;
  teamId: string;
}

interface CachedToken {
  accessToken: string;
  /** Expiration en secondes epoch. */
  expiresAt: number;
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlStr(str: string): string {
  return b64url(new TextEncoder().encode(str));
}

/** Décode un PEM PKCS8 en ArrayBuffer DER. */
function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

/** "lat,lng" si l'entrée est déjà une paire de coordonnées, sinon null. */
function asCoords(input: string): string | null {
  const t = input.trim();
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(t) ? t.replace(/\s+/g, "") : null;
}

export interface AppleMapsClient {
  /** Géocode une adresse → "lat,lng", ou null si introuvable. */
  geocode(address: string, nowSec: number): Promise<string | null>;
  /** Résout une adresse OU une paire "lat,lng" en coordonnées. */
  resolveCoords(input: string, nowSec: number): Promise<string | null>;
  /** ETA trafic voiture entre deux points "lat,lng". */
  eta(
    origin: string,
    destination: string,
    departureISO: string | undefined,
    nowSec: number,
  ): Promise<TravelEstimate | null>;
}

export function createAppleMaps(cfg: AppleMapsConfig): AppleMapsClient {
  let cached: CachedToken | null = null;

  async function signMapKitJwt(nowSec: number): Promise<string> {
    const header = { alg: "ES256", kid: cfg.keyId, typ: "JWT" };
    const payload = { iss: cfg.teamId, iat: nowSec, exp: nowSec + 30 * 60 };
    const input = `${b64urlStr(JSON.stringify(header))}.${b64urlStr(JSON.stringify(payload))}`;
    const key = await crypto.subtle.importKey(
      "pkcs8",
      pemToDer(cfg.privateKeyPem),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(input),
    );
    return `${input}.${b64url(new Uint8Array(sig))}`;
  }

  async function accessToken(nowSec: number): Promise<string> {
    if (cached && cached.expiresAt > nowSec + 60) return cached.accessToken;
    const jwt = await signMapKitJwt(nowSec);
    const res = await fetch(TOKEN_URL, { headers: { Authorization: `Bearer ${jwt}` } });
    if (!res.ok) throw new Error(`Apple Maps token: ${res.status}`);
    const data = (await res.json()) as { accessToken: string; expiresInSeconds?: number };
    cached = {
      accessToken: data.accessToken,
      expiresAt: nowSec + (data.expiresInSeconds ?? 1800),
    };
    return data.accessToken;
  }

  async function authed(path: string, nowSec: number): Promise<unknown> {
    const token = await accessToken(nowSec);
    const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Apple Maps ${path}: ${res.status}`);
    return res.json();
  }

  async function geocode(address: string, nowSec: number): Promise<string | null> {
    const data = (await authed(`/geocode?q=${encodeURIComponent(address)}`, nowSec)) as {
      results?: { coordinate?: { latitude: number; longitude: number } }[];
    };
    const co = data.results?.[0]?.coordinate;
    return co ? `${co.latitude},${co.longitude}` : null;
  }

  async function resolveCoords(input: string, nowSec: number): Promise<string | null> {
    return asCoords(input) ?? geocode(input, nowSec);
  }

  async function eta(
    origin: string,
    destination: string,
    departureISO: string | undefined,
    nowSec: number,
  ): Promise<TravelEstimate | null> {
    const params = new URLSearchParams({
      origin,
      destinations: destination,
      transportType: "Automobile",
    });
    if (departureISO) params.set("departureDate", departureISO);
    const data = (await authed(`/etas?${params.toString()}`, nowSec)) as {
      etas?: { expectedTravelTimeSeconds?: number; distanceMeters?: number }[];
    };
    const e = data.etas?.[0];
    if (!e) return null;
    return { seconds: e.expectedTravelTimeSeconds ?? 0, meters: e.distanceMeters ?? 0 };
  }

  return { geocode, resolveCoords, eta };
}
