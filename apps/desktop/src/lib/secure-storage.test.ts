import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock @tauri-apps/api/core
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => false),
}));

// Mock @tauri-apps/plugin-store
vi.mock("@tauri-apps/plugin-store", () => {
  class MockLazyStore {
    private data = new Map<string, unknown>();

    async get(key: string): Promise<unknown> {
      return this.data.get(key);
    }

    async set(key: string, value: unknown): Promise<void> {
      this.data.set(key, value);
    }

    async delete(key: string): Promise<boolean> {
      return this.data.delete(key);
    }

    async save(): Promise<void> {
      // No-op for mock
    }
  }

  return {
    LazyStore: MockLazyStore,
  };
});

describe("secure-storage (localStorage fallback)", () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    const { isTauri } = await import("@tauri-apps/api/core");
    vi.mocked(isTauri).mockReturnValue(false);
  });

  it("should get item from localStorage", async () => {
    localStorage.setItem("test-key", "test-value");

    const { getItem } = await import("./secure-storage");
    const value = await getItem("test-key");

    expect(value).toBe("test-value");
  });

  it("should return null for non-existent key", async () => {
    const { getItem } = await import("./secure-storage");
    const value = await getItem("non-existent");

    expect(value).toBeNull();
  });

  it("should set item in localStorage", async () => {
    const { setItem } = await import("./secure-storage");
    await setItem("test-key", "test-value");

    expect(localStorage.getItem("test-key")).toBe("test-value");
  });

  it("should remove item from localStorage", async () => {
    localStorage.setItem("test-key", "test-value");

    const { removeItem } = await import("./secure-storage");
    await removeItem("test-key");

    expect(localStorage.getItem("test-key")).toBeNull();
  });

  it("should not migrate when not in Tauri", async () => {
    localStorage.setItem("legacy-key", "legacy-value");

    const { migrateFromLocalStorage } = await import("./secure-storage");
    await migrateFromLocalStorage("legacy-key");

    expect(localStorage.getItem("legacy-key")).toBe("legacy-value");
  });
});

describe("secure-storage (Tauri store)", () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    const { isTauri } = await import("@tauri-apps/api/core");
    vi.mocked(isTauri).mockReturnValue(true);
  });

  it("should get item from Tauri store", async () => {
    const { setItem, getItem } = await import("./secure-storage");
    await setItem("test-key", "test-value");

    const value = await getItem("test-key");

    expect(value).toBe("test-value");
  });

  it("should return null for non-existent key in store", async () => {
    const { getItem } = await import("./secure-storage");
    const value = await getItem("non-existent");

    expect(value).toBeNull();
  });

  it("should set item in Tauri store", async () => {
    const { setItem, getItem } = await import("./secure-storage");
    await setItem("test-key", "test-value");

    const value = await getItem("test-key");

    expect(value).toBe("test-value");
  });

  it("should remove item from Tauri store", async () => {
    const { setItem, removeItem, getItem } = await import("./secure-storage");
    await setItem("test-key", "test-value");
    await removeItem("test-key");

    const value = await getItem("test-key");

    expect(value).toBeNull();
  });

  it("should migrate from localStorage to store", async () => {
    localStorage.setItem("legacy-key", "legacy-value");

    const { migrateFromLocalStorage, getItem } = await import("./secure-storage");
    await migrateFromLocalStorage("legacy-key");

    const value = await getItem("legacy-key");
    expect(value).toBe("legacy-value");
    expect(localStorage.getItem("legacy-key")).toBeNull();
  });

  it("should not overwrite existing store value during migration", async () => {
    localStorage.setItem("existing-key", "legacy-value");

    const { setItem, migrateFromLocalStorage, getItem } = await import("./secure-storage");
    await setItem("existing-key", "store-value");
    await migrateFromLocalStorage("existing-key");

    const value = await getItem("existing-key");
    expect(value).toBe("store-value");
    expect(localStorage.getItem("existing-key")).toBe("legacy-value");
  });

  it("should skip migration if localStorage has no value", async () => {
    const { migrateFromLocalStorage, getItem } = await import("./secure-storage");
    await migrateFromLocalStorage("non-existent");

    const value = await getItem("non-existent");
    expect(value).toBeNull();
  });

  it("should reuse store instance across calls", async () => {
    const { setItem, getItem } = await import("./secure-storage");

    await setItem("key1", "value1");
    await setItem("key2", "value2");

    const value1 = await getItem("key1");
    const value2 = await getItem("key2");

    expect(value1).toBe("value1");
    expect(value2).toBe("value2");
  });
});

describe("secure-storage (Tauri store load failure)", () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    const { isTauri } = await import("@tauri-apps/api/core");
    vi.mocked(isTauri).mockReturnValue(true);
  });

  it("should fallback to localStorage when store fails to load", async () => {
    // Mock store import to fail
    vi.doMock("@tauri-apps/plugin-store", () => {
      throw new Error("Store unavailable");
    });

    vi.resetModules();
    const { isTauri } = await import("@tauri-apps/api/core");
    vi.mocked(isTauri).mockReturnValue(true);

    const { setItem, getItem } = await import("./secure-storage");
    await setItem("test-key", "test-value");

    const value = await getItem("test-key");

    expect(value).toBe("test-value");
    expect(localStorage.getItem("test-key")).toBe("test-value");
  });
});
