import { renderHook, act, waitFor } from "@testing-library/react";
import { useAccount } from "./useAccount.js";
import {
  deleteAccount,
  isLoggedIn,
  loginWithGoogle,
  logout,
  migrateSession,
  saveAiKey,
  saveAppleCredentials,
} from "../lib/auth.js";

vi.mock("../lib/auth.js", () => ({
  deleteAccount: vi.fn(),
  fetchMe: vi.fn(),
  isLoggedIn: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  migrateSession: vi.fn(),
  saveAiKey: vi.fn(),
  saveAppleCredentials: vi.fn(),
}));

describe("useAccount", () => {
  const mockSetError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(migrateSession).mockResolvedValue(undefined);
    vi.mocked(isLoggedIn).mockResolvedValue(false);
  });

  it("calls migrateSession then isLoggedIn on mount", async () => {
    vi.mocked(isLoggedIn).mockResolvedValue(true);

    const { result } = renderHook(() => useAccount(mockSetError));

    await waitFor(() => {
      expect(migrateSession).toHaveBeenCalledOnce();
      expect(isLoggedIn).toHaveBeenCalledOnce();
      expect(result.current.loggedIn).toBe(true);
    });
  });

  it("signIn calls loginWithGoogle and sets loggedIn true", async () => {
    vi.mocked(loginWithGoogle).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAccount(mockSetError));

    // Wait for mount effect (migrateSession + isLoggedIn) to settle
    await waitFor(() => {
      expect(migrateSession).toHaveBeenCalledOnce();
    });

    await act(async () => {
      await result.current.signIn();
    });

    expect(loginWithGoogle).toHaveBeenCalledOnce();
    expect(result.current.loggedIn).toBe(true);
    expect(mockSetError).toHaveBeenCalledWith(null);
  });

  it("signIn calls setError on failure", async () => {
    vi.mocked(loginWithGoogle).mockRejectedValue(new Error("Login failed"));

    const { result } = renderHook(() => useAccount(mockSetError));

    await act(async () => {
      await result.current.signIn();
    });

    expect(mockSetError).toHaveBeenCalledWith("Login failed");
    expect(result.current.loggedIn).toBe(false);
  });

  it("signOut calls logout and resets state", async () => {
    vi.mocked(logout).mockResolvedValue(undefined);
    vi.mocked(isLoggedIn).mockResolvedValue(true);

    const { result } = renderHook(() => useAccount(mockSetError));

    await waitFor(() => {
      expect(result.current.loggedIn).toBe(true);
    });

    act(() => {
      result.current.setMe({
        id: "user-1",
        email: "test@example.com",
        appleConnected: true,
        aiConfigured: true,
        aiProvider: "openai",
      });
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(logout).toHaveBeenCalledOnce();
    expect(result.current.loggedIn).toBe(false);
    expect(result.current.me).toBeNull();
  });

  it("connectApple calls saveAppleCredentials and updates me", async () => {
    vi.mocked(saveAppleCredentials).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAccount(mockSetError));

    act(() => {
      result.current.setMe({
        id: "user-1",
        email: "test@example.com",
        appleConnected: false,
        aiConfigured: false,
        aiProvider: null,
      });
    });

    await act(async () => {
      await result.current.connectApple("apple@example.com", "app-password");
    });

    expect(saveAppleCredentials).toHaveBeenCalledWith("apple@example.com", "app-password");
    expect(result.current.me?.appleConnected).toBe(true);
  });

  it("saveAi calls saveAiKey and updates me", async () => {
    vi.mocked(saveAiKey).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAccount(mockSetError));

    act(() => {
      result.current.setMe({
        id: "user-1",
        email: "test@example.com",
        appleConnected: false,
        aiConfigured: false,
        aiProvider: null,
      });
    });

    await act(async () => {
      await result.current.saveAi("openai", "sk-test-key");
    });

    expect(saveAiKey).toHaveBeenCalledWith("openai", "sk-test-key");
    expect(result.current.me?.aiConfigured).toBe(true);
    expect(result.current.me?.aiProvider).toBe("openai");
  });

  it("removeAccount calls deleteAccount and resets state", async () => {
    vi.mocked(deleteAccount).mockResolvedValue(undefined);
    vi.mocked(isLoggedIn).mockResolvedValue(true);

    const { result } = renderHook(() => useAccount(mockSetError));

    await waitFor(() => {
      expect(result.current.loggedIn).toBe(true);
    });

    await act(async () => {
      await result.current.removeAccount();
    });

    expect(deleteAccount).toHaveBeenCalledOnce();
    expect(result.current.loggedIn).toBe(false);
    expect(result.current.me).toBeNull();
  });
});
