/** Chiffrement AES-GCM des secrets + utilitaires de tokens. */

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function importKey(keyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    b64ToBytes(keyB64),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Chiffre une chaîne → "ivB64:ciphertextB64". */
export async function encryptText(plain: string, keyB64: string): Promise<string> {
  const key = await importKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plain),
  );
  return `${bytesToB64(iv)}:${bytesToB64(new Uint8Array(ct))}`;
}

/** Déchiffre une chaîne "ivB64:ciphertextB64". */
export async function decryptText(enc: string, keyB64: string): Promise<string> {
  const [ivB64, ctB64] = enc.split(":");
  if (!ivB64 || !ctB64) throw new Error("blob chiffré invalide");
  const key = await importKey(keyB64);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(ivB64) },
    key,
    b64ToBytes(ctB64),
  );
  return new TextDecoder().decode(pt);
}

/** Token de session aléatoire (hex 32 octets). */
export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Décode la charge utile d'un JWT (sans vérif de signature).
 * Le id_token Google est obtenu directement depuis l'endpoint token via notre
 * échange authentifié (client secret), donc fiable sans re-vérifier.
 */
export function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const part = jwt.split(".")[1];
  if (!part) throw new Error("JWT invalide");
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const json = new TextDecoder().decode(b64ToBytes(b64.padEnd(Math.ceil(b64.length / 4) * 4, "=")));
  return JSON.parse(json);
}
