import { describe, expect, it, vi } from "vitest";

function mockD1(rows: Array<{ token: string; expires_at: string }>) {
  let remaining = [...rows];
  const db = {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockImplementation(() => {
          const expired = remaining.filter(
            (r) => new Date(r.expires_at).getTime() < Date.now(),
          );
          const batch = expired.slice(0, 100);
          remaining = remaining.filter((r) => !batch.includes(r));
          return Promise.resolve({ meta: { changes: batch.length } });
        }),
      }),
    }),
  };
  return { db: db as unknown as D1Database, remaining: () => remaining };
}

describe("deleteExpiredSessions (integration logic)", () => {
  it("supprime les sessions expirées en batch", async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 86_400_000).toISOString();
    const future = new Date(now.getTime() + 86_400_000).toISOString();

    const sessions = [
      { token: "expired-1", expires_at: past },
      { token: "expired-2", expires_at: past },
      { token: "active-1", expires_at: future },
    ];

    const { db, remaining } = mockD1(sessions);

    const { deleteExpiredSessions } = await import("./db.js");
    const deleted = await deleteExpiredSessions(db);

    expect(deleted).toBe(2);
    expect(remaining().length).toBe(1);
    expect(remaining()[0]!.token).toBe("active-1");
  });

  it("retourne 0 si aucune session expirée", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const { db } = mockD1([{ token: "active", expires_at: future }]);

    const { deleteExpiredSessions } = await import("./db.js");
    const deleted = await deleteExpiredSessions(db);

    expect(deleted).toBe(0);
  });
});
