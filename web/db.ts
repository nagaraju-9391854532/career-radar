import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dataDir, type ScraperName } from '../src/index.ts';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface StoredPortal {
  id: string;
  userId: string;
  name: string;
  url: string;
  scraper?: ScraperName;
  slug?: string;
  createdAt: string;
  lastFetchedAt?: string | null;
  lastCount?: number | null;
}

export interface JobBookmarkState {
  saved: boolean;
  applied: boolean;
  updatedAt: string;
}

export type WatchRegion = 'india' | 'all';
export type WatchRole = 'tech' | 'all';
export type WatchExp = '0-5' | '0-2' | 'all';

export interface PersistedWatchConfig {
  enabled: boolean;
  intervalMinutes: number;
  region: WatchRegion;
  role: WatchRole;
  exp: WatchExp;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
}

export interface SnapshotRow {
  portalId: string;
  portalName: string;
  scraper: ScraperName;
  slug: string;
  totalBoardCount: number;
  checkedCount: number;
  fetchedAt: string;
  jobsJson: string;
  lastError: string | null;
}

export interface ChangeRow {
  id: string;
  timestamp: string;
  portalId: string;
  portalName: string;
  type: 'added' | 'updated' | 'removed';
  jobId: string;
  jobTitle: string;
  location: string;
  url: string;
  detail: string;
}

const DB_FILE = join(dataDir, 'career-radar.db');
let dbInstance: Database | null = null;

export function getDatabasePath(): string {
  return DB_FILE;
}

export function getDb(): Database {
  if (dbInstance) return dbInstance;
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(DB_FILE, { create: true });
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      google_sub TEXT UNIQUE,
      avatar_url TEXT,
      password_hash TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS portals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      scraper TEXT,
      slug TEXT,
      created_at TEXT NOT NULL,
      last_fetched_at TEXT,
      last_count INTEGER,
      UNIQUE(user_id, url)
    );

    CREATE INDEX IF NOT EXISTS idx_portals_user ON portals(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS watch_configs (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      enabled INTEGER NOT NULL,
      interval_minutes INTEGER NOT NULL,
      region TEXT NOT NULL,
      role TEXT NOT NULL,
      exp TEXT NOT NULL,
      last_sync_at TEXT,
      next_sync_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_watch_due ON watch_configs(enabled, next_sync_at);

    CREATE TABLE IF NOT EXISTS portal_snapshots (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      portal_id TEXT NOT NULL,
      portal_name TEXT NOT NULL,
      scraper TEXT NOT NULL,
      slug TEXT NOT NULL,
      total_board_count INTEGER NOT NULL,
      checked_count INTEGER NOT NULL,
      fetched_at TEXT NOT NULL,
      jobs_json TEXT NOT NULL,
      last_error TEXT,
      PRIMARY KEY (user_id, portal_id)
    );

    CREATE TABLE IF NOT EXISTS watch_changes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      timestamp TEXT NOT NULL,
      portal_id TEXT NOT NULL,
      portal_name TEXT NOT NULL,
      type TEXT NOT NULL,
      job_id TEXT NOT NULL,
      job_title TEXT NOT NULL,
      location TEXT NOT NULL,
      url TEXT NOT NULL,
      detail TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_changes_user_ts ON watch_changes(user_id, timestamp DESC);

    CREATE TABLE IF NOT EXISTS bookmarks (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_key TEXT NOT NULL,
      saved INTEGER NOT NULL,
      applied INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, job_key)
    );
  `);
  const userCols = db
    .query<{ name: string }, []>('PRAGMA table_info(users)')
    .all()
    .map((c) => c.name);
  if (!userCols.includes('google_sub')) {
    db.exec('ALTER TABLE users ADD COLUMN google_sub TEXT');
    db.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub)'
    );
  }
  if (!userCols.includes('avatar_url')) {
    db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT');
  }

  dbInstance = db;
  return db;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function dbCountUsers(): number {
  const row = getDb()
    .query<{ count: number }, []>('SELECT COUNT(*) AS count FROM users')
    .get();
  return row?.count ?? 0;
}

export function dbUpsertGoogleUser(input: {
  googleSub: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}): { user: PublicUser; isNewFirstUser: boolean } {
  const db = getDb();
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanName =
    input.name.trim().slice(0, 80) || cleanEmail.split('@')[0] || 'User';
  const avatar = input.avatarUrl?.trim() || null;

  const existing =
    db
      .query<
        {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
        },
        [string]
      >(
        'SELECT id, email, name, avatar_url, created_at FROM users WHERE google_sub = ?'
      )
      .get(input.googleSub) ??
    db
      .query<
        {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
        },
        [string]
      >(
        'SELECT id, email, name, avatar_url, created_at FROM users WHERE email = ?'
      )
      .get(cleanEmail);

  if (existing) {
    db.query(
      'UPDATE users SET google_sub = ?, email = ?, name = ?, avatar_url = ? WHERE id = ?'
    ).run(input.googleSub, cleanEmail, cleanName, avatar, existing.id);
    return {
      user: {
        id: existing.id,
        email: cleanEmail,
        name: cleanName,
        avatarUrl: avatar,
        createdAt: existing.created_at,
      },
      isNewFirstUser: false,
    };
  }

  const isFirst = dbCountUsers() === 0;
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.query(
    `INSERT INTO users (id, email, name, google_sub, avatar_url, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, '', ?)`
  ).run(id, cleanEmail, cleanName, input.googleSub, avatar, createdAt);

  return {
    user: {
      id,
      email: cleanEmail,
      name: cleanName,
      avatarUrl: avatar,
      createdAt,
    },
    isNewFirstUser: isFirst,
  };
}

export function dbCreateSession(
  tokenHash: string,
  userId: string,
  expiresAt: string,
  createdAt: string
): void {
  getDb()
    .query(
      'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
    )
    .run(tokenHash, userId, expiresAt, createdAt);
}

export function dbFindSessionUser(
  tokenHash: string,
  nowIso: string
): PublicUser | null {
  const row = getDb()
    .query<
      {
        id: string;
        email: string;
        name: string;
        avatar_url: string | null;
        created_at: string;
      },
      [string, string]
    >(
      `SELECT u.id, u.email, u.name, u.avatar_url, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .get(tokenHash, nowIso);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

export function dbDeleteSession(tokenHash: string): void {
  getDb().query('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function dbPurgeExpiredSessions(nowIso: string): void {
  getDb().query('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso);
}

export function dbLoadPortals(userId: string): StoredPortal[] {
  const rows = getDb()
    .query<
      {
        id: string;
        user_id: string;
        name: string;
        url: string;
        scraper: string | null;
        slug: string | null;
        created_at: string;
        last_fetched_at: string | null;
        last_count: number | null;
      },
      [string]
    >(
      `SELECT id, user_id, name, url, scraper, slug, created_at, last_fetched_at, last_count
       FROM portals
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .all(userId);

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    url: row.url,
    ...(row.scraper ? { scraper: row.scraper as ScraperName } : {}),
    ...(row.slug ? { slug: row.slug } : {}),
    createdAt: row.created_at,
    lastFetchedAt: row.last_fetched_at,
    lastCount: row.last_count,
  }));
}

export function dbCountPortals(userId: string): number {
  const row = getDb()
    .query<{ count: number }, [string]>(
      'SELECT COUNT(*) AS count FROM portals WHERE user_id = ?'
    )
    .get(userId);
  return row?.count ?? 0;
}

export function dbUpsertPortal(
  userId: string,
  portal: {
    id: string;
    name: string;
    url: string;
    scraper?: ScraperName;
    slug?: string;
    createdAt: string;
  }
): StoredPortal {
  const db = getDb();
  const normalizedTarget = portal.url.trim().toLowerCase();
  const existing = dbLoadPortals(userId).find(
    (p) => p.url.trim().toLowerCase() === normalizedTarget
  );

  if (existing) {
    const nextName = portal.name.trim() || existing.name;
    const nextScraper = portal.scraper ?? existing.scraper ?? null;
    const nextSlug = portal.slug ?? existing.slug ?? null;
    db.query(
      'UPDATE portals SET name = ?, scraper = ?, slug = ? WHERE id = ? AND user_id = ?'
    ).run(nextName, nextScraper, nextSlug, existing.id, userId);
    return {
      ...existing,
      name: nextName,
      ...(nextScraper ? { scraper: nextScraper } : {}),
      ...(nextSlug ? { slug: nextSlug } : {}),
    };
  }

  db.query(
    `INSERT INTO portals (id, user_id, name, url, scraper, slug, created_at, last_fetched_at, last_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)`
  ).run(
    portal.id,
    userId,
    portal.name.trim(),
    portal.url.trim(),
    portal.scraper ?? null,
    portal.slug ?? null,
    portal.createdAt
  );

  return {
    id: portal.id,
    userId,
    name: portal.name.trim(),
    url: portal.url.trim(),
    ...(portal.scraper ? { scraper: portal.scraper } : {}),
    ...(portal.slug ? { slug: portal.slug } : {}),
    createdAt: portal.createdAt,
    lastFetchedAt: null,
    lastCount: null,
  };
}

export function dbUpdatePortalStats(
  userId: string,
  portalId: string,
  stats: { lastFetchedAt: string; lastCount: number }
): void {
  getDb()
    .query(
      'UPDATE portals SET last_fetched_at = ?, last_count = ? WHERE id = ? AND user_id = ?'
    )
    .run(stats.lastFetchedAt, stats.lastCount, portalId, userId);
}

export function dbRemovePortal(userId: string, portalId: string): boolean {
  const res = getDb()
    .query('DELETE FROM portals WHERE id = ? AND user_id = ?')
    .run(portalId, userId);
  return res.changes > 0;
}

export function dbGetWatchConfig(userId: string): PersistedWatchConfig {
  const db = getDb();
  const row = db
    .query<
      {
        enabled: number;
        interval_minutes: number;
        region: string;
        role: string;
        exp: string;
        last_sync_at: string | null;
        next_sync_at: string | null;
      },
      [string]
    >(
      `SELECT enabled, interval_minutes, region, role, exp, last_sync_at, next_sync_at
       FROM watch_configs WHERE user_id = ?`
    )
    .get(userId);

  if (!row) {
    const defaults: PersistedWatchConfig = {
      enabled: true,
      intervalMinutes: 15,
      region: 'india',
      role: 'tech',
      exp: '0-5',
      lastSyncAt: null,
      nextSyncAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    };
    dbUpsertWatchConfig(userId, defaults);
    return defaults;
  }

  return {
    enabled: row.enabled !== 0,
    intervalMinutes: row.interval_minutes,
    region: row.region === 'all' ? 'all' : 'india',
    role: row.role === 'all' ? 'all' : 'tech',
    exp:
      row.exp === '0-2' || row.exp === 'all' || row.exp === '0-5'
        ? row.exp
        : '0-5',
    lastSyncAt: row.last_sync_at,
    nextSyncAt: row.next_sync_at,
  };
}

export function dbUpsertWatchConfig(
  userId: string,
  config: PersistedWatchConfig
): void {
  getDb()
    .query(
      `INSERT INTO watch_configs (user_id, enabled, interval_minutes, region, role, exp, last_sync_at, next_sync_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         enabled = excluded.enabled,
         interval_minutes = excluded.interval_minutes,
         region = excluded.region,
         role = excluded.role,
         exp = excluded.exp,
         last_sync_at = excluded.last_sync_at,
         next_sync_at = excluded.next_sync_at`
    )
    .run(
      userId,
      config.enabled ? 1 : 0,
      config.intervalMinutes,
      config.region,
      config.role,
      config.exp,
      config.lastSyncAt,
      config.nextSyncAt
    );
}

export function dbListDueUsers(nowIso: string): string[] {
  const rows = getDb()
    .query<{ user_id: string }, [string]>(
      `SELECT wc.user_id
       FROM watch_configs wc
       WHERE wc.enabled = 1
         AND (wc.next_sync_at IS NULL OR wc.next_sync_at <= ?)
         AND EXISTS (SELECT 1 FROM portals p WHERE p.user_id = wc.user_id)`
    )
    .all(nowIso);
  return rows.map((r) => r.user_id);
}

export function dbLoadSnapshots(userId: string): SnapshotRow[] {
  const rows = getDb()
    .query<
      {
        portal_id: string;
        portal_name: string;
        scraper: string;
        slug: string;
        total_board_count: number;
        checked_count: number;
        fetched_at: string;
        jobs_json: string;
        last_error: string | null;
      },
      [string]
    >(
      `SELECT portal_id, portal_name, scraper, slug, total_board_count, checked_count, fetched_at, jobs_json, last_error
       FROM portal_snapshots WHERE user_id = ?`
    )
    .all(userId);
  return rows.map((row) => ({
    portalId: row.portal_id,
    portalName: row.portal_name,
    scraper: row.scraper as ScraperName,
    slug: row.slug,
    totalBoardCount: row.total_board_count,
    checkedCount: row.checked_count,
    fetchedAt: row.fetched_at,
    jobsJson: row.jobs_json,
    lastError: row.last_error,
  }));
}

export function dbSaveSnapshot(userId: string, snap: SnapshotRow): void {
  getDb()
    .query(
      `INSERT INTO portal_snapshots (user_id, portal_id, portal_name, scraper, slug, total_board_count, checked_count, fetched_at, jobs_json, last_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, portal_id) DO UPDATE SET
         portal_name = excluded.portal_name,
         scraper = excluded.scraper,
         slug = excluded.slug,
         total_board_count = excluded.total_board_count,
         checked_count = excluded.checked_count,
         fetched_at = excluded.fetched_at,
         jobs_json = excluded.jobs_json,
         last_error = excluded.last_error`
    )
    .run(
      userId,
      snap.portalId,
      snap.portalName,
      snap.scraper,
      snap.slug,
      snap.totalBoardCount,
      snap.checkedCount,
      snap.fetchedAt,
      snap.jobsJson,
      snap.lastError
    );
}

export function dbSetSnapshotError(
  userId: string,
  portalId: string,
  error: string
): void {
  getDb()
    .query(
      'UPDATE portal_snapshots SET last_error = ? WHERE user_id = ? AND portal_id = ?'
    )
    .run(error, userId, portalId);
}

export function dbDeleteSnapshot(userId: string, portalId: string): void {
  getDb()
    .query('DELETE FROM portal_snapshots WHERE user_id = ? AND portal_id = ?')
    .run(userId, portalId);
}

export function dbLoadChanges(userId: string, limit = 100): ChangeRow[] {
  const rows = getDb()
    .query<
      {
        id: string;
        timestamp: string;
        portal_id: string;
        portal_name: string;
        type: string;
        job_id: string;
        job_title: string;
        location: string;
        url: string;
        detail: string;
      },
      [string, number]
    >(
      `SELECT id, timestamp, portal_id, portal_name, type, job_id, job_title, location, url, detail
       FROM watch_changes
       WHERE user_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`
    )
    .all(userId, limit);

  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    portalId: row.portal_id,
    portalName: row.portal_name,
    type: row.type === 'added' || row.type === 'removed' ? row.type : 'updated',
    jobId: row.job_id,
    jobTitle: row.job_title,
    location: row.location,
    url: row.url,
    detail: row.detail,
  }));
}

export function dbInsertChanges(
  userId: string,
  entries: ChangeRow[],
  maxKeep = 100
): void {
  if (entries.length === 0) return;
  const db = getDb();
  const insert = db.query(
    `INSERT OR REPLACE INTO watch_changes (id, user_id, timestamp, portal_id, portal_name, type, job_id, job_title, location, url, detail)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const tx = db.transaction((items: ChangeRow[]) => {
    for (const c of items) {
      insert.run(
        c.id,
        userId,
        c.timestamp,
        c.portalId,
        c.portalName,
        c.type,
        c.jobId,
        c.jobTitle,
        c.location,
        c.url,
        c.detail
      );
    }
    db.query(
      `DELETE FROM watch_changes
       WHERE user_id = ?
         AND id NOT IN (
           SELECT id FROM watch_changes WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?
         )`
    ).run(userId, userId, maxKeep);
  });
  tx(entries);
}

export function dbClearChanges(userId: string): void {
  getDb().query('DELETE FROM watch_changes WHERE user_id = ?').run(userId);
}

export function dbLoadBookmarks(
  userId: string
): Record<string, JobBookmarkState> {
  const rows = getDb()
    .query<
      { job_key: string; saved: number; applied: number; updated_at: string },
      [string]
    >(
      'SELECT job_key, saved, applied, updated_at FROM bookmarks WHERE user_id = ?'
    )
    .all(userId);
  const out: Record<string, JobBookmarkState> = {};
  for (const row of rows) {
    out[row.job_key] = {
      saved: row.saved !== 0,
      applied: row.applied !== 0,
      updatedAt: row.updated_at,
    };
  }
  return out;
}

export function dbSetBookmark(
  userId: string,
  jobKey: string,
  patch: { saved?: boolean; applied?: boolean }
): Record<string, JobBookmarkState> {
  const db = getDb();
  const existing = db
    .query<
      { saved: number; applied: number; updated_at: string },
      [string, string]
    >(
      'SELECT saved, applied, updated_at FROM bookmarks WHERE user_id = ? AND job_key = ?'
    )
    .get(userId, jobKey);

  const nextSaved =
    typeof patch.saved === 'boolean'
      ? patch.saved
      : existing
        ? existing.saved !== 0
        : false;
  const nextApplied =
    typeof patch.applied === 'boolean'
      ? patch.applied
      : existing
        ? existing.applied !== 0
        : false;

  if (!nextSaved && !nextApplied) {
    db.query('DELETE FROM bookmarks WHERE user_id = ? AND job_key = ?').run(
      userId,
      jobKey
    );
  } else {
    db.query(
      `INSERT INTO bookmarks (user_id, job_key, saved, applied, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, job_key) DO UPDATE SET
         saved = excluded.saved,
         applied = excluded.applied,
         updated_at = excluded.updated_at`
    ).run(
      userId,
      jobKey,
      nextSaved ? 1 : 0,
      nextApplied ? 1 : 0,
      new Date().toISOString()
    );
  }
  return dbLoadBookmarks(userId);
}

/** Imports single-user JSON files into the very first account created on an upgrade. */
export function dbImportLegacySingleUserFiles(userId: string): void {
  const portalsPath = join(dataDir, 'career-portals.json');
  if (existsSync(portalsPath)) {
    try {
      const parsed = JSON.parse(readFileSync(portalsPath, 'utf8'));
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (
            item &&
            typeof item === 'object' &&
            typeof item.name === 'string' &&
            typeof item.url === 'string'
          ) {
            dbUpsertPortal(userId, {
              id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
              name: item.name,
              url: item.url,
              scraper:
                typeof item.scraper === 'string'
                  ? (item.scraper as ScraperName)
                  : undefined,
              slug: typeof item.slug === 'string' ? item.slug : undefined,
              createdAt:
                typeof item.createdAt === 'string'
                  ? item.createdAt
                  : new Date().toISOString(),
            });
          }
        }
      }
    } catch {
      // Ignore corrupt legacy JSON
    }
  }

  const bookmarksPath = join(dataDir, 'job-bookmarks.json');
  if (existsSync(bookmarksPath)) {
    try {
      const parsed = JSON.parse(readFileSync(bookmarksPath, 'utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [key, val] of Object.entries(parsed)) {
          if (val && typeof val === 'object') {
            const bm = val as { saved?: unknown; applied?: unknown };
            dbSetBookmark(userId, key, {
              saved: Boolean(bm.saved),
              applied: Boolean(bm.applied),
            });
          }
        }
      }
    } catch {
      // Ignore corrupt legacy JSON
    }
  }
}
