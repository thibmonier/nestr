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

describe("deleteUserAccount (RGPD cascade delete)", () => {
  function mockD1Batch() {
    const calls: Array<{ sql: string; bindings: unknown[] }> = [];
    const db = {
      prepare: vi.fn().mockImplementation((sql: string) => ({
        bind: vi.fn().mockImplementation((...bindings: unknown[]) => {
          calls.push({ sql, bindings });
          return { sql, bindings };
        }),
      })),
      batch: vi.fn().mockImplementation((stmts: unknown[]) =>
        Promise.resolve(
          stmts.map(() => ({ meta: { changes: 1 } })),
        ),
      ),
    };
    return { db: db as unknown as D1Database, calls: () => calls };
  }

  it("supprime les 6 tables en batch atomique", async () => {
    const { db, calls } = mockD1Batch();
    const { deleteUserAccount } = await import("./db.js");
    const counts = await deleteUserAccount(db, "user-42");

    expect(calls().length).toBe(6);
    expect(counts.sessions).toBe(1);
    expect(counts.tasks).toBe(1);
    expect(counts.preferences).toBe(1);
    expect(counts.calendar_credentials).toBe(1);
    expect(counts.ai_credentials).toBe(1);
    expect(counts.users).toBe(1);
  });

  it("utilise WHERE id pour users, WHERE user_id pour le reste", async () => {
    const { db, calls } = mockD1Batch();
    const { deleteUserAccount } = await import("./db.js");
    await deleteUserAccount(db, "user-42");

    const userStmt = calls().find((c) => c.sql.includes("FROM users"));
    const sessionStmt = calls().find((c) => c.sql.includes("FROM sessions"));
    expect(userStmt!.sql).toContain("WHERE id = ?");
    expect(sessionStmt!.sql).toContain("WHERE user_id = ?");
  });

  it("retourne 0 pour les tables vides", async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({}),
      }),
      batch: vi.fn().mockResolvedValue(
        Array.from({ length: 6 }, () => ({ meta: { changes: 0 } })),
      ),
    } as unknown as D1Database;

    const { deleteUserAccount } = await import("./db.js");
    const counts = await deleteUserAccount(db, "ghost-user");

    expect(Object.values(counts).every((v) => v === 0)).toBe(true);
  });
});

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
