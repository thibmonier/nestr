import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createAppleMaps, type AppleMapsConfig } from "./apple.js";

/** Construit un PEM PKCS8 à partir d'une vraie clé EC P-256 générée. */
async function makeConfig(): Promise<AppleMapsConfig> {
  const pair = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const der = new Uint8Array(
    (await crypto.subtle.exportKey("pkcs8", pair.privateKey)) as ArrayBuffer,
  );
  let b = "";
  for (const x of der) b += String.fromCharCode(x);
  const b64 = btoa(b).replace(/(.{64})/g, "$1\n");
  const pem = `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----`;
  return { privateKeyPem: pem, keyId: "KID123", teamId: "TEAM123" };
}

let cfg: AppleMapsConfig;
beforeAll(async () => {
  cfg = await makeConfig();
});
afterEach(() => vi.restoreAllMocks());

/** Renvoie une Response JSON mockée. */
function jsonRes(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const NOW = 1_750_000_000;

describe("createAppleMaps.geocode", () => {
  it("signe un token, l'échange, puis retourne lat,lng", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ accessToken: "AT", expiresInSeconds: 1800 }))
      .mockResolvedValueOnce(jsonRes({ results: [{ coordinate: { latitude: 48.87, longitude: 2.33 } }] }));
    vi.stubGlobal("fetch", fetchMock);

    const coords = await createAppleMaps(cfg).geocode("Paris", NOW);
    expect(coords).toBe("48.87,2.33");
    // 1er appel = token, 2e = geocode avec Bearer access token.
    expect(fetchMock.mock.calls[0]![0]).toContain("/v1/token");
    expect(fetchMock.mock.calls[1]![1].headers.Authorization).toBe("Bearer AT");
  });
});

describe("createAppleMaps.resolveCoords", () => {
  it("passe une paire lat,lng sans appeler le réseau", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const out = await createAppleMaps(cfg).resolveCoords("48.8, 2.3", NOW);
    expect(out).toBe("48.8,2.3");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("createAppleMaps.eta", () => {
  it("retourne secondes + mètres et réutilise le token en cache", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ accessToken: "AT", expiresInSeconds: 1800 }))
      .mockImplementation(() =>
        Promise.resolve(jsonRes({ etas: [{ expectedTravelTimeSeconds: 1800, distanceMeters: 12000 }] })),
      );
    vi.stubGlobal("fetch", fetchMock);

    const maps = createAppleMaps(cfg);
    const a = await maps.eta("48.8,2.3", "48.9,2.4", "2026-06-20T13:00:00.000Z", NOW);
    const b = await maps.eta("48.8,2.3", "48.9,2.4", undefined, NOW);
    expect(a).toEqual({ seconds: 1800, meters: 12000 });
    expect(b).toEqual({ seconds: 1800, meters: 12000 });
    // token (1) + 2 etas = 3 appels : pas de re-échange de token.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]![0]).toContain("departureDate=2026-06-20");
  });

  it("propage l'erreur si le token échoue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 401 })));
    await expect(createAppleMaps(cfg).eta("0,0", "1,1", undefined, NOW)).rejects.toThrow(
      /token: 401/,
    );
  });
});
