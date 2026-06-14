import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "./client.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => vi.restoreAllMocks());

describe("createClient", () => {
  it("ajoute le header Authorization quand un token est présent", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createClient({ baseUrl: "https://api.test", getToken: () => "tok123" });

    await client.api("/me/tasks", { method: "PUT", body: { tasks: [] } });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.test/me/tasks");
    expect(init.method).toBe("PUT");
    expect(init.headers.Authorization).toBe("Bearer tok123");
    expect(init.body).toBe(JSON.stringify({ tasks: [] }));
  });

  it("omet Authorization sans token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    const client = createClient({ baseUrl: "https://api.test", getToken: () => null });

    await client.fetchMe();
    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBeUndefined();
  });

  it("appelle onUnauthorized et lève sur 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "x" }, 401)));
    const onUnauthorized = vi.fn();
    const client = createClient({
      baseUrl: "https://api.test",
      getToken: () => "tok",
      onUnauthorized,
    });

    await expect(client.fetchMe()).rejects.toThrow(/Session expirée/);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("déballe les réponses enveloppées", async () => {
    const estimates = [{ taskId: "a", estimatedMinutes: 30, energy: "low", rationale: "" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ estimates })));
    const client = createClient({ baseUrl: "https://api.test", getToken: () => "t" });

    expect(await client.estimateDurations([])).toEqual(estimates);
  });

  it("tolère une source calendrier en échec sans bloquer les autres", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "Apple non configuré" }, 400)) // apple KO
      .mockResolvedValueOnce(jsonResponse({ events: [{ id: "g1" }] })); // google OK
    vi.stubGlobal("fetch", fetchMock);
    const client = createClient({ baseUrl: "https://api.test", getToken: () => "t" });

    const events = await client.fetchDayEvents("2026-06-15T00:00:00", "2026-06-15T23:59:59");
    expect(events).toEqual([{ id: "g1" }]);
  });
});
