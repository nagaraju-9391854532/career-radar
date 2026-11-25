import { Database } from 'bun:sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import {
  closeDb,
  dbClearChanges,
  dbCountPortals,
  dbCountUsers,
  dbCreateSession,
  dbDeleteSession,
  dbDeleteSnapshot,
  dbFindSessionUser,
  dbGetWatchConfig,
  dbInsertChanges,
  dbListDueUsers,
  dbLoadBookmarks,
  dbLoadChanges,
  dbLoadPortals,
  dbLoadSnapshots,
  dbPurgeExpiredSessions,
  dbRemovePortal,
  dbSaveSnapshot,
  dbSetBookmark,
  dbSetSnapshotError,
  dbUpdatePortalStats,
  dbUpsertGoogleUser,
  dbUpsertPortal,
  dbUpsertWatchConfig,
  getDatabasePath,
  isTursoConfigured,
} from '../db.ts';

function encodeResultCell(val: unknown) {
  if (val === null || val === undefined) return { type: 'null' };
  if (typeof val === 'number') {
    return Number.isInteger(val)
      ? { type: 'integer', value: String(val) }
      : { type: 'float', value: val };
  }
  return { type: 'text', value: String(val) };
}

function decodeArg(arg: { type: string; value?: string | number } | undefined) {
  if (!arg || arg.type === 'null') return null;
  if (arg.type === 'integer') return Number(arg.value);
  if (arg.type === 'float') return Number(arg.value);
  return arg.value ?? null;
}

describe('Turso HTTP pipeline backend', () => {
  let memDb: Database;
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.TURSO_DATABASE_URL;
  const originalToken = process.env.TURSO_AUTH_TOKEN;

  beforeAll(() => {
    closeDb();
    memDb = new Database(':memory:');
    process.env.TURSO_DATABASE_URL = 'libsql://career-radar-test.turso.io';
    process.env.TURSO_AUTH_TOKEN = 'test-turso-token';

    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit
    ) => {
      const targetUrl = typeof input === 'string' ? input : input.toString();
      if (targetUrl !== 'https://career-radar-test.turso.io/v2/pipeline') {
        return originalFetch(input, init);
      }

      const authHeader = new Headers(init?.headers).get('Authorization');
      if (authHeader !== 'Bearer test-turso-token') {
        return new Response('Unauthorized', { status: 401 });
      }

      const payload = JSON.parse(String(init?.body || '{}')) as {
        requests: Array<{
          type: 'execute' | 'close';
          stmt?: {
            sql: string;
            args?: Array<{ type: string; value?: string | number }>;
          };
        }>;
      };

      const results = [];
      for (const req of payload.requests) {
        if (req.type === 'close') {
          results.push({ type: 'ok', response: { type: 'close' } });
          continue;
        }
        try {
          const sql = req.stmt?.sql ?? '';
          const args = (req.stmt?.args ?? []).map(decodeArg);
          const trimmed = sql.trim().toUpperCase();
          if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA')) {
            const stmt = memDb.query(sql);
            const rawRows = stmt.all(...args) as Array<Record<string, unknown>>;
            const cols =
              rawRows.length > 0
                ? Object.keys(rawRows[0]).map((name) => ({ name }))
                : [];
            const rows = rawRows.map((row) =>
              cols.map((c) => encodeResultCell(row[c.name]))
            );
            results.push({
              type: 'ok',
              response: {
                type: 'execute',
                result: { cols, rows, affected_row_count: 0 },
              },
            });
          } else {
            const res = memDb.query(sql).run(...args);
            results.push({
              type: 'ok',
              response: {
                type: 'execute',
                result: {
                  cols: [],
                  rows: [],
                  affected_row_count: res.changes,
                },
              },
            });
          }
        } catch (error) {
          results.push({
            type: 'error',
            error: {
              message: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }
      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;
  });

  afterAll(() => {
    closeDb();
    memDb.close();
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.TURSO_DATABASE_URL;
    else process.env.TURSO_DATABASE_URL = originalUrl;
    if (originalToken === undefined) delete process.env.TURSO_AUTH_TOKEN;
    else process.env.TURSO_AUTH_TOKEN = originalToken;
  });

  it('persists users, sessions, portals, snapshots, watch config, changes, and bookmarks via /v2/pipeline', async () => {
    expect(isTursoConfigured()).toBe(true);
    expect(getDatabasePath()).toBe('turso://career-radar-test.turso.io');

    const created = await dbUpsertGoogleUser({
      googleSub: 'google-sub-1',
      email: 'Alice@Example.com',
      name: 'Alice Dev',
      avatarUrl: 'https://example.com/a.png',
    });
    expect(created.isNewFirstUser).toBe(true);
    expect(created.user.email).toBe('alice@example.com');
    expect(await dbCountUsers()).toBe(1);

    const updated = await dbUpsertGoogleUser({
      googleSub: 'google-sub-1',
      email: 'alice@example.com',
      name: 'Alice Updated',
      avatarUrl: null,
    });
    expect(updated.isNewFirstUser).toBe(false);
    expect(updated.user.id).toBe(created.user.id);
    expect(updated.user.name).toBe('Alice Updated');

    const now = Date.now();
    await dbCreateSession(
      'hash-1',
      created.user.id,
      new Date(now + 60_000).toISOString(),
      new Date(now).toISOString()
    );
    await dbCreateSession(
      'hash-expired',
      created.user.id,
      new Date(now - 60_000).toISOString(),
      new Date(now - 120_000).toISOString()
    );
    const sessionUser = await dbFindSessionUser(
      'hash-1',
      new Date(now).toISOString()
    );
    expect(sessionUser?.id).toBe(created.user.id);
    expect(
      await dbFindSessionUser('hash-expired', new Date(now).toISOString())
    ).toBeNull();
    await dbPurgeExpiredSessions(new Date(now).toISOString());
    await dbDeleteSession('hash-1');
    expect(
      await dbFindSessionUser('hash-1', new Date(now).toISOString())
    ).toBeNull();

    const p1 = await dbUpsertPortal(created.user.id, {
      id: 'portal-1',
      name: 'Google',
      url: 'https://www.google.com/about/careers/applications/jobs/results/',
      scraper: 'GoogleScraper',
      slug: 'google',
      createdAt: new Date(now).toISOString(),
    });
    const p2 = await dbUpsertPortal(created.user.id, {
      id: 'portal-2',
      name: 'Zapier',
      url: 'https://jobs.ashbyhq.com/zapier',
      scraper: 'AshbyScraper',
      slug: 'zapier',
      createdAt: new Date(now + 1000).toISOString(),
    });
    expect(await dbCountPortals(created.user.id)).toBe(2);
    await dbUpdatePortalStats(created.user.id, p1.id, {
      lastFetchedAt: new Date(now).toISOString(),
      lastCount: 42,
    });
    const loadedPortals = await dbLoadPortals(created.user.id);
    expect(loadedPortals.find((p) => p.id === p1.id)?.lastCount).toBe(42);

    const cfg = await dbGetWatchConfig(created.user.id);
    expect(cfg.enabled).toBe(true);
    await dbUpsertWatchConfig(created.user.id, {
      ...cfg,
      nextSyncAt: new Date(now - 1000).toISOString(),
    });
    expect(await dbListDueUsers(new Date(now).toISOString())).toEqual([
      created.user.id,
    ]);

    await dbSaveSnapshot(created.user.id, {
      portalId: p1.id,
      portalName: 'Google',
      scraper: 'GoogleScraper',
      slug: 'google',
      totalBoardCount: 100,
      checkedCount: 42,
      fetchedAt: new Date(now).toISOString(),
      jobsJson: '[]',
      lastError: null,
    });
    await dbSaveSnapshot(created.user.id, {
      portalId: p2.id,
      portalName: 'Zapier',
      scraper: 'AshbyScraper',
      slug: 'zapier',
      totalBoardCount: 20,
      checkedCount: 5,
      fetchedAt: new Date(now).toISOString(),
      jobsJson: '[]',
      lastError: null,
    });
    await dbSetSnapshotError(created.user.id, p1.id, 'Transient error');
    let snaps = await dbLoadSnapshots(created.user.id);
    expect(snaps.find((s) => s.portalId === p1.id)?.lastError).toBe(
      'Transient error'
    );
    await dbDeleteSnapshot(created.user.id, p1.id);
    snaps = await dbLoadSnapshots(created.user.id);
    expect(snaps.map((s) => s.portalId)).toEqual([p2.id]);

    await dbInsertChanges(created.user.id, [
      {
        id: 'chg-1',
        timestamp: new Date(now).toISOString(),
        portalId: p2.id,
        portalName: 'Zapier',
        type: 'added',
        jobId: 'job-1',
        jobTitle: 'Backend Engineer',
        location: 'Remote',
        url: 'https://jobs.ashbyhq.com/zapier/job-1',
        detail: 'Added',
      },
    ]);
    expect((await dbLoadChanges(created.user.id)).length).toBe(1);
    await dbClearChanges(created.user.id);
    expect((await dbLoadChanges(created.user.id)).length).toBe(0);

    await dbSetBookmark(created.user.id, 'ashby:zapier:job-1', {
      saved: true,
      applied: false,
    });
    let bm = await dbLoadBookmarks(created.user.id);
    expect(bm['ashby:zapier:job-1']?.saved).toBe(true);
    expect(bm['ashby:zapier:job-1']?.applied).toBe(false);

    await dbSetBookmark(created.user.id, 'ashby:zapier:job-1', {
      saved: false,
    });
    bm = await dbLoadBookmarks(created.user.id);
    expect(bm['ashby:zapier:job-1']).toBeUndefined();

    expect(await dbRemovePortal(created.user.id, p2.id)).toBe(true);
    expect(await dbCountPortals(created.user.id)).toBe(1);
  });
});
