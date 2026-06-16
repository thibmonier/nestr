import { beforeEach, describe, expect, it, vi } from "vitest";
import * as SecureStorage from "./secure-storage.js";

// Mock secure-storage module
vi.mock("./secure-storage.js", () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  migrateFromLocalStorage: vi.fn(),
}));

// Mock @nestr/client
vi.mock("@nestr/client", () => ({
  createClient: vi.fn((config) => {
    const mockApi = async (path: string, options?: any) => {
      const token = await config.getToken?.();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${config.baseUrl}${path}`, {
        ...options,
        headers: {
          ...headers,
          ...options?.headers,
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });

      if (response.status === 401) {
        await config.onUnauthorized?.();
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    };

    return {
      api: mockApi,
      fetchMe: vi.fn(),
      saveAiKey: vi.fn(),
      deleteAccount: vi.fn(),
    };
  }),
}));

describe("api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("getSession", () => {
    it("delegates to SecureStorage.getItem with SESSION_KEY", async () => {
      const mockToken = "test-token-123";
      vi.mocked(SecureStorage.getItem).mockResolvedValue(mockToken);

      const { getSession } = await import("./api.js");
      const result = await getSession();

      expect(SecureStorage.getItem).toHaveBeenCalledWith("nestr.session");
      expect(result).toBe(mockToken);
    });

    it("returns null when no session exists", async () => {
      vi.mocked(SecureStorage.getItem).mockResolvedValue(null);

      const { getSession } = await import("./api.js");
      const result = await getSession();

      expect(result).toBeNull();
    });
  });

  describe("setSession", () => {
    it("delegates to SecureStorage.setItem with SESSION_KEY and token", async () => {
      const testToken = "new-token-456";
      vi.mocked(SecureStorage.setItem).mockResolvedValue(undefined);

      const { setSession } = await import("./api.js");
      await setSession(testToken);

      expect(SecureStorage.setItem).toHaveBeenCalledWith("nestr.session", testToken);
    });
  });

  describe("clearSession", () => {
    it("delegates to SecureStorage.removeItem with SESSION_KEY", async () => {
      vi.mocked(SecureStorage.removeItem).mockResolvedValue(undefined);

      const { clearSession } = await import("./api.js");
      await clearSession();

      expect(SecureStorage.removeItem).toHaveBeenCalledWith("nestr.session");
    });
  });

  describe("migrateSession", () => {
    it("delegates to SecureStorage.migrateFromLocalStorage with SESSION_KEY", async () => {
      vi.mocked(SecureStorage.migrateFromLocalStorage).mockResolvedValue(undefined);

      const { migrateSession } = await import("./api.js");
      await migrateSession();

      expect(SecureStorage.migrateFromLocalStorage).toHaveBeenCalledWith("nestr.session");
    });
  });

  describe("API_URL", () => {
    it("defaults to localhost:8787 when VITE_API_URL is not set", async () => {
      const { API_URL } = await import("./api.js");
      expect(API_URL).toBe("http://localhost:8787");
    });
  });

  describe("client.api", () => {
    beforeEach(() => {
      vi.mocked(SecureStorage.getItem).mockResolvedValue(null);
    });

    it("adds Bearer header from session token", async () => {
      const mockToken = "auth-token-789";
      vi.mocked(SecureStorage.getItem).mockResolvedValue(mockToken);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: "success" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { api } = await import("./api.js");
      await api("/test", { method: "GET" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/test"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer auth-token-789",
          }),
        })
      );
    });

    it("throws on 401 and calls clearSession", async () => {
      const mockToken = "expired-token";
      vi.mocked(SecureStorage.getItem).mockResolvedValue(mockToken);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { api } = await import("./api.js");

      await expect(api("/protected", { method: "GET" })).rejects.toThrow("Unauthorized");
      expect(SecureStorage.removeItem).toHaveBeenCalledWith("nestr.session");
    });

    it("throws on non-ok response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal Server Error" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { api } = await import("./api.js");

      await expect(api("/error", { method: "GET" })).rejects.toThrow("HTTP 500");
    });

    it("sends request without Authorization header when no token exists", async () => {
      vi.mocked(SecureStorage.getItem).mockResolvedValue(null);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: "public" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const { api } = await import("./api.js");
      await api("/public", { method: "GET" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/public"),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });
  });
});
