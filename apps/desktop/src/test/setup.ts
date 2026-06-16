import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

vi.mock("@tauri-apps/plugin-store", () => {
  const store = new Map<string, unknown>();
  return {
    load: vi.fn(async () => ({
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      set: vi.fn(async (key: string, val: unknown) => { store.set(key, val); }),
      delete: vi.fn(async (key: string) => store.delete(key)),
      save: vi.fn(),
      clear: vi.fn(async () => store.clear()),
    })),
  };
});

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-notification", () => ({
  sendNotification: vi.fn(),
  isPermissionGranted: vi.fn(async () => true),
  requestPermission: vi.fn(async () => "granted"),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(),
}));

vi.mock("@fabianlars/tauri-plugin-oauth", () => ({
  start: vi.fn(async () => 0),
  cancel: vi.fn(),
  onUrl: vi.fn(),
}));
