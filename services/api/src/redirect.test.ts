import { describe, expect, it } from "vitest";
import { isAppRedirect } from "./redirect.js";

describe("isAppRedirect", () => {
  it("accepte les loopback desktop (Tauri)", () => {
    expect(isAppRedirect("http://localhost:1420")).toBe(true);
    expect(isAppRedirect("http://localhost:8081/")).toBe(true);
    expect(isAppRedirect("http://127.0.0.1:53917")).toBe(true);
  });

  it("accepte le deep-link mobile nestr://", () => {
    expect(isAppRedirect("nestr://auth")).toBe(true);
    expect(isAppRedirect("nestr://auth/callback")).toBe(true);
    expect(isAppRedirect("nestr://")).toBe(true);
  });

  it("rejette tout domaine externe (open-redirect)", () => {
    expect(isAppRedirect("http://evil.com")).toBe(false);
    expect(isAppRedirect("https://localhost:1420")).toBe(false); // https non loopback
    expect(isAppRedirect("http://localhost.evil.com:80")).toBe(false);
    expect(isAppRedirect("http://localhost")).toBe(false); // port manquant
  });

  it("rejette les schemes ou chemins malicieux", () => {
    expect(isAppRedirect("nestr://../evil")).toBe(false); // '.' hors charset
    expect(isAppRedirect("nestr://auth?x=1")).toBe(false); // '?' hors charset
    expect(isAppRedirect("javascript://alert(1)")).toBe(false);
    expect(isAppRedirect("nestrx://auth")).toBe(false);
    expect(isAppRedirect("")).toBe(false);
  });
});
