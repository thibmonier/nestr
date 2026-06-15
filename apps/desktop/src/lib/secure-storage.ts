/** Stockage sécurisé : Tauri Store en production, localStorage en fallback (dev browser). */
import { isTauri } from "@tauri-apps/api/core";

type StoreHandle = {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  save(): Promise<void>;
};

let store: StoreHandle | null = null;
let storeReady: Promise<StoreHandle | null> | null = null;

function loadStore(): Promise<StoreHandle | null> {
  if (!isTauri()) return Promise.resolve(null);
  if (!storeReady) {
    storeReady = import("@tauri-apps/plugin-store")
      .then(({ LazyStore }) => {
        store = new LazyStore("session.json");
        return store;
      })
      .catch(() => null);
  }
  return storeReady;
}

export async function getItem(key: string): Promise<string | null> {
  const s = store ?? (await loadStore());
  if (s) return ((await s.get(key)) as string) ?? null;
  return localStorage.getItem(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  const s = store ?? (await loadStore());
  if (s) {
    await s.set(key, value);
    await s.save();
  } else {
    localStorage.setItem(key, value);
  }
}

export async function removeItem(key: string): Promise<void> {
  const s = store ?? (await loadStore());
  if (s) {
    await s.delete(key);
    await s.save();
  } else {
    localStorage.removeItem(key);
  }
}

/** Migration one-shot : copie les données de localStorage vers le store Tauri. */
export async function migrateFromLocalStorage(
  key: string,
): Promise<void> {
  if (!isTauri()) return;
  const s = store ?? (await loadStore());
  if (!s) return;
  const existing = await s.get(key);
  if (existing != null) return;
  const legacy = localStorage.getItem(key);
  if (!legacy) return;
  await s.set(key, legacy);
  await s.save();
  localStorage.removeItem(key);
}
