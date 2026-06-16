import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getStoredTheme,
  systemTheme,
  resolvedTheme,
  applyTheme,
  setTheme,
} from "./theme.js";

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";

    // Mock matchMedia if it doesn't exist
    if (!window.matchMedia) {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    }
  });

  describe("getStoredTheme", () => {
    it("returns null when no theme is stored", () => {
      expect(getStoredTheme()).toBeNull();
    });

    it("returns light when light is stored", () => {
      localStorage.setItem("nestr.theme", "light");
      expect(getStoredTheme()).toBe("light");
    });

    it("returns dark when dark is stored", () => {
      localStorage.setItem("nestr.theme", "dark");
      expect(getStoredTheme()).toBe("dark");
    });

    it("returns null for invalid values", () => {
      localStorage.setItem("nestr.theme", "invalid");
      expect(getStoredTheme()).toBeNull();

      localStorage.setItem("nestr.theme", "");
      expect(getStoredTheme()).toBeNull();

      localStorage.setItem("nestr.theme", "auto");
      expect(getStoredTheme()).toBeNull();
    });
  });

  describe("systemTheme", () => {
    it("returns dark when system prefers dark", () => {
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: true,
        media: "(prefers-color-scheme: dark)",
      } as MediaQueryList);

      expect(systemTheme()).toBe("dark");
    });

    it("returns light when system prefers light", () => {
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
        media: "(prefers-color-scheme: dark)",
      } as MediaQueryList);

      expect(systemTheme()).toBe("light");
    });
  });

  describe("resolvedTheme", () => {
    it("returns stored theme when one exists", () => {
      localStorage.setItem("nestr.theme", "dark");

      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
        media: "(prefers-color-scheme: dark)",
      } as MediaQueryList);

      expect(resolvedTheme()).toBe("dark");
    });

    it("returns system theme when no stored theme", () => {
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: true,
        media: "(prefers-color-scheme: dark)",
      } as MediaQueryList);

      expect(resolvedTheme()).toBe("dark");
    });

    it("overrides system theme with stored theme", () => {
      localStorage.setItem("nestr.theme", "light");

      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: true,
        media: "(prefers-color-scheme: dark)",
      } as MediaQueryList);

      expect(resolvedTheme()).toBe("light");
    });
  });

  describe("applyTheme", () => {
    it("adds theme-dark class when theme is dark", () => {
      applyTheme("dark");

      expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
    });

    it("removes theme-dark class when theme is light", () => {
      document.documentElement.classList.add("theme-dark");

      applyTheme("light");

      expect(document.documentElement.classList.contains("theme-dark")).toBe(false);
    });

    it("handles multiple calls correctly", () => {
      applyTheme("dark");
      expect(document.documentElement.classList.contains("theme-dark")).toBe(true);

      applyTheme("light");
      expect(document.documentElement.classList.contains("theme-dark")).toBe(false);

      applyTheme("dark");
      expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
    });
  });

  describe("setTheme", () => {
    it("stores theme in localStorage and applies it", () => {
      setTheme("dark");

      expect(localStorage.getItem("nestr.theme")).toBe("dark");
      expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
    });

    it("can switch between themes", () => {
      setTheme("dark");
      expect(localStorage.getItem("nestr.theme")).toBe("dark");
      expect(document.documentElement.classList.contains("theme-dark")).toBe(true);

      setTheme("light");
      expect(localStorage.getItem("nestr.theme")).toBe("light");
      expect(document.documentElement.classList.contains("theme-dark")).toBe(false);
    });
  });

  describe("integration", () => {
    it("full theme workflow works correctly", () => {
      // No stored theme, system is dark
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: true,
        media: "(prefers-color-scheme: dark)",
      } as MediaQueryList);

      expect(getStoredTheme()).toBeNull();
      expect(systemTheme()).toBe("dark");
      expect(resolvedTheme()).toBe("dark");

      // User sets light theme
      setTheme("light");

      expect(getStoredTheme()).toBe("light");
      expect(resolvedTheme()).toBe("light");
      expect(document.documentElement.classList.contains("theme-dark")).toBe(false);

      // User switches to dark theme
      setTheme("dark");

      expect(getStoredTheme()).toBe("dark");
      expect(resolvedTheme()).toBe("dark");
      expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
    });
  });
});
