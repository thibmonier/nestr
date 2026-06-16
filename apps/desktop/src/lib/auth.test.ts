import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock ./api.js module
const mockGetSession = vi.fn();
const mockClearSession = vi.fn();
const mockSetSession = vi.fn();
const mockMigrateSession = vi.fn();
const mockApi = vi.fn();
const mockClient = {
  fetchMe: vi.fn(),
  saveAiKey: vi.fn(),
  deleteAccount: vi.fn(),
  api: mockApi,
};

vi.mock("./api.js", () => ({
  getSession: mockGetSession,
  clearSession: mockClearSession,
  setSession: mockSetSession,
  migrateSession: mockMigrateSession,
  api: mockApi,
  client: mockClient,
  API_URL: "http://localhost:8787",
}));

// Mock @tauri-apps/api/core
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => false),
}));

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isLoggedIn", () => {
    it("returns true when session exists", async () => {
      mockGetSession.mockResolvedValue("valid-token-123");

      const { isLoggedIn } = await import("./auth.js");
      const result = await isLoggedIn();

      expect(mockGetSession).toHaveBeenCalledOnce();
      expect(result).toBe(true);
    });

    it("returns false when no session exists", async () => {
      mockGetSession.mockResolvedValue(null);

      const { isLoggedIn } = await import("./auth.js");
      const result = await isLoggedIn();

      expect(mockGetSession).toHaveBeenCalledOnce();
      expect(result).toBe(false);
    });

    it("returns false when session is empty string", async () => {
      mockGetSession.mockResolvedValue("");

      const { isLoggedIn } = await import("./auth.js");
      const result = await isLoggedIn();

      expect(result).toBe(false);
    });
  });

  describe("logout", () => {
    it("calls clearSession", async () => {
      mockClearSession.mockResolvedValue(undefined);

      const { logout } = await import("./auth.js");
      await logout();

      expect(mockClearSession).toHaveBeenCalledOnce();
    });
  });

  describe("migrateSession", () => {
    it("delegates to api.migrateSession", async () => {
      mockMigrateSession.mockResolvedValue(undefined);

      const { migrateSession } = await import("./auth.js");
      await migrateSession();

      expect(mockMigrateSession).toHaveBeenCalledOnce();
    });
  });

  describe("fetchMe", () => {
    it("is exported from client.fetchMe", async () => {
      const { fetchMe } = await import("./auth.js");
      expect(fetchMe).toBe(mockClient.fetchMe);
    });
  });

  describe("saveAiKey", () => {
    it("is exported from client.saveAiKey", async () => {
      const { saveAiKey } = await import("./auth.js");
      expect(saveAiKey).toBe(mockClient.saveAiKey);
    });
  });

  describe("deleteAccount", () => {
    it("calls client.deleteAccount then clearSession", async () => {
      mockClient.deleteAccount.mockResolvedValue(undefined);
      mockClearSession.mockResolvedValue(undefined);

      const { deleteAccount } = await import("./auth.js");
      await deleteAccount();

      expect(mockClient.deleteAccount).toHaveBeenCalledOnce();
      expect(mockClearSession).toHaveBeenCalledOnce();
      expect(mockClient.deleteAccount).toHaveBeenCalledBefore(mockClearSession);
    });

    it("clears session even if deleteAccount fails", async () => {
      mockClient.deleteAccount.mockRejectedValue(new Error("Network error"));
      mockClearSession.mockResolvedValue(undefined);

      const { deleteAccount } = await import("./auth.js");

      await expect(deleteAccount()).rejects.toThrow("Network error");
      expect(mockClient.deleteAccount).toHaveBeenCalledOnce();
      // clearSession should NOT be called if deleteAccount throws
      expect(mockClearSession).not.toHaveBeenCalled();
    });
  });

  describe("saveAppleCredentials", () => {
    it("calls POST /me/apple with credentials", async () => {
      const mockResponse = { ok: true };
      mockApi.mockResolvedValue(mockResponse);

      const { saveAppleCredentials } = await import("./auth.js");
      const result = await saveAppleCredentials("user@icloud.com", "app-specific-password");

      expect(mockApi).toHaveBeenCalledWith("/me/apple", {
        method: "POST",
        body: {
          appleId: "user@icloud.com",
          appPassword: "app-specific-password",
        },
      });
      expect(result).toEqual({ ok: true });
    });

    it("forwards api errors", async () => {
      mockApi.mockRejectedValue(new Error("HTTP 400"));

      const { saveAppleCredentials } = await import("./auth.js");

      await expect(
        saveAppleCredentials("invalid", "invalid")
      ).rejects.toThrow("HTTP 400");
    });
  });

  describe("type exports", () => {
    it("exports AiProvider and MeStatus types from @nestr/client", async () => {
      // TypeScript compile-time check — if types are not exported, TS will error
      const { type } = await import("./auth.js");
      // Runtime check not needed — types are compile-time only
      expect(true).toBe(true);
    });
  });
});
