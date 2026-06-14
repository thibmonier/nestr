import { describe, expect, it } from "vitest";
import { decodeJwtPayload, decryptText, encryptText, randomToken } from "./crypto.js";

// Clé AES-256 de test (32 octets en base64). Jamais utilisée en prod.
const KEY = btoa(String.fromCharCode(...Array.from({ length: 32 }, (_, i) => i)));

describe("encryptText / decryptText", () => {
  it("fait un round-trip fidèle", async () => {
    const secret = JSON.stringify({ apiKey: "sk-ant-très-secret-éàü" });
    const enc = await encryptText(secret, KEY);
    expect(await decryptText(enc, KEY)).toBe(secret);
  });

  it("produit un IV unique à chaque chiffrement (pas de réutilisation de nonce)", async () => {
    const a = await encryptText("même message", KEY);
    const b = await encryptText("même message", KEY);
    expect(a).not.toBe(b); // IV aléatoire → ciphertexts différents
    expect(a.split(":")[0]).not.toBe(b.split(":")[0]); // IV différents
  });

  it("échoue au déchiffrement avec une mauvaise clé", async () => {
    const enc = await encryptText("donnée", KEY);
    const wrong = btoa(String.fromCharCode(...Array.from({ length: 32 }, () => 255)));
    await expect(decryptText(enc, wrong)).rejects.toThrow();
  });

  it("rejette un blob malformé", async () => {
    await expect(decryptText("pas-de-separateur", KEY)).rejects.toThrow();
  });
});

describe("randomToken", () => {
  it("renvoie 64 caractères hex (32 octets)", () => {
    const t = randomToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });

  it("est unique à chaque appel", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => randomToken()));
    expect(tokens.size).toBe(100);
  });
});

describe("decodeJwtPayload", () => {
  it("décode la charge utile d'un JWT", () => {
    const payload = { sub: "123", email: "a@b.fr", aud: "client-id", iss: "accounts.google.com" };
    const b64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const jwt = `header.${b64}.signature`;
    expect(decodeJwtPayload(jwt)).toEqual(payload);
  });

  it("lève sur un JWT sans payload", () => {
    expect(() => decodeJwtPayload("onlyheader")).toThrow();
  });
});
