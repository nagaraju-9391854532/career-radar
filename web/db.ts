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

type SqlParam = string | number | null;
type SqlRow = Record<string, unknown>;

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    google_sub TEXT UNIQUE,
    avatar_url TEXT,
    password_hash TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`,
  `CREATE TABLE IF NOT EXISTS portals (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_portals_user ON portals(user_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS watch_configs (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    enabled INTEGER NOT NULL,
    interval_minutes INTEGER NOT NULL,
    region TEXT NOT NULL,
    role TEXT NOT NULL,
    exp TEXT NOT NULL,
    last_sync_at TEXT,
    next_sync_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_watch_due ON watch_configs(enabled, next_sync_at)`,
  `CREATE TABLE IF NOT EXISTS portal_snapshots (
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
  )`,
  `CREATE TABLE IF NOT EXISTS watch_changes (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_changes_user_ts ON watch_changes(user_id, timestamp DESC)`,
  `CREATE TABLE IF NOT EXISTS bookmarks (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_key TEXT NOT NULL,
    saved INTEGER NOT NULL DEFAULT 0,
    applied INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, job_key)
  )`,
];

let localDbInstance: Database | null = null;
let tursoInitPromise: Promise<void> | null = null;
let tursoInitializedUrl: string | null = null;

function getLocalDbFile(): string {
  return join(dataDir, 'career-radar.db');
}

function getTursoConfig(): { endpoint: string; authToken: string } | null {
  const rawUrl = process.env.TURSO_DATABASE_URL?.trim();
  if (!rawUrl) return null;
  const httpBase = rawUrl
    .replace(/^libsql:\/\//i, 'https://')
    .replace(/\/+$/, '');
  const endpoint = httpBase.endsWith('/v2/pipeline')
    ? httpBase
    : `${httpBase}/v2/pipeline`;
  return {
    endpoint,
    authToken: process.env.TURSO_AUTH_TOKEN?.trim() ?? '',
  };
}

export function isTursoConfigured(): boolean {
  return getTursoConfig() !== null;
}

export function getDatabasePath(): string {
  const turso = getTursoConfig();
  if (turso) {
    const parsed = URL.parse(turso.endpoint);
    return parsed ? `turso://${parsed.host}` : 'turso://cloud';
  }
  return getLocalDbFile();
}

function getLocalDb(): Database {
  if (localDbInstance) return localDbInstance;
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(getLocalDbFile(), { create: true });
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  for (const sql of SCHEMA_STATEMENTS) {
    db.exec(sql);
  }
  // Safe additive migration for older local databases without Google OAuth columns
  try {
    db.exec('ALTER TABLE users ADD COLUMN google_sub TEXT');
  } catch {
    // Column already exists
  }
  try {
    db.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub)'
    );
  } catch {
    // Ignore if index already exists
  }
  try {
    db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT');
  } catch {
    // Column already exists
  }
  localDbInstance = db;
  return db;
}

type HranaArg =
  | { type: 'null' }
  | { type: 'integer'; value: string }
  | { type: 'float'; value: number }
  | { type: 'text'; value: string };

interface HranaCell {
  type?: 'null' | 'integer' | 'float' | 'text' | 'blob';
  value?: string | number | null;
  base64?: string;
}

interface HranaExecuteResult {
  cols: Array<{ name?: string }>;
  rows: HranaCell[][];
  affected_row_count: number;
}

interface HranaPipelineResponse {
  results: Array<{
    type: 'ok' | 'error';
    response?: {
      type: string;
      result?: HranaExecuteResult;
    };
    error?: { message?: string; code?: string };
  }>;
}

function encodeHranaArg(value: SqlParam): HranaArg {
  if (value === null || value === undefined) {
    return { type: 'null' };
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { type: 'integer', value: String(value) };
    }
    return { type: 'float', value };
  }
  return { type: 'text', value: String(value) };
}

function decodeHranaCell(cell: HranaCell | undefined): unknown {
  if (!cell || cell.type === 'null') return null;
  if (cell.type === 'integer') {
    const num = Number(cell.value);
    return Number.isSafeInteger(num) ? num : String(cell.value ?? '');
  }
  if (cell.type === 'float') {
    return Number(cell.value);
  }
  return cell.value ?? null;
}

function mapHranaRows<T extends SqlRow>(result: HranaExecuteResult): T[] {
  const colNames = result.cols.map((c, idx) => c.name || `col_${idx}`);
  return result.rows.map((cells) => {
    const obj: SqlRow = {};
    for (let i = 0; i < colNames.length; i++) {
      obj[colNames[i]] = decodeHranaCell(cells[i]);
    }
    return obj as T;
  });
}

async function runTursoPipeline(
  config: { endpoint: string; authToken: string },
  statements: Array<{ sql: string; args?: SqlParam[] }>
): Promise<HranaExecuteResult[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.authToken) {
    headers.Authorization = `Bearer ${config.authToken}`;
  }

  const res = await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      requests: [
        ...statements.map((stmt) => ({
          type: 'execute',
          stmt: {
            sql: stmt.sql,
            args: (stmt.args ?? []).map(encodeHranaArg),
          },
        })),
        { type: 'close' },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Turso database request failed (HTTP ${res.status}): ${text || res.statusText}`
    );
  }

  const payload = (await res.json()) as HranaPipelineResponse;
  const out: HranaExecuteResult[] = [];
  for (let i = 0; i < statements.length; i++) {
    const item = payload.results?.[i];
    if (!item) {
      throw new Error('Missing Turso pipeline result entry.');
    }
    if (item.type === 'error') {
      throw new Error(item.error?.message || 'Turso SQL execution error.');
    }
    if (item.response?.result) {
      out.push(item.response.result);
    }
  }
  return out;
}

async function ensureTursoSchema(config: {
  endpoint: string;
  authToken: string;
}): Promise<void> {
  if (tursoInitPromise && tursoInitializedUrl === config.endpoint) {
    return tursoInitPromise;
  }
  tursoInitializedUrl = config.endpoint;
  tursoInitPromise = runTursoPipeline(
    config,
    SCHEMA_STATEMENTS.map((sql) => ({ sql }))
  ).then(() => undefined);
  try {
    await tursoInitPromise;
  } catch (error) {
    tursoInitPromise = null;
    tursoInitializedUrl = null;
    throw error;
  }
}

async function dbAll<T extends SqlRow>(
  sql: string,
  args: SqlParam[] = []
): Promise<T[]> {
  const turso = getTursoConfig();
  if (turso) {
    await ensureTursoSchema(turso);
    const [res] = await runTursoPipeline(turso, [{ sql, args }]);
    return res ? mapHranaRows<T>(res) : [];
  }
  return getLocalDb()
    .query<T, SqlParam[]>(sql)
    .all(...args);
}

async function dbGet<T extends SqlRow>(
  sql: string,
  args: SqlParam[] = []
): Promise<T | null> {
  const turso = getTursoConfig();
  if (turso) {
    await ensureTursoSchema(turso);
    const [res] = await runTursoPipeline(turso, [{ sql, args }]);
    if (!res || res.rows.length === 0) return null;
    return mapHranaRows<T>(res)[0] ?? null;
  }
  return (
    getLocalDb()
      .query<T, SqlParam[]>(sql)
      .get(...args) ?? null
  );
}

async function dbRun(
  sql: string,
  args: SqlParam[] = []
): Promise<{ changes: number }> {
  const turso = getTursoConfig();
  if (turso) {
    await ensureTursoSchema(turso);
    const results = await runTursoPipeline(turso, [
      { sql: 'PRAGMA foreign_keys = ON' },
      { sql, args },
    ]);
    return { changes: results[1]?.affected_row_count ?? 0 };
  }
  const result = getLocalDb()
    .query(sql)
    .run(...args);
  return { changes: result.changes };
}

async function dbBatch(
  statements: Array<{ sql: string; args?: SqlParam[] }>
): Promise<void> {
  if (statements.length === 0) return;
  const turso = getTursoConfig();
  if (turso) {
    await ensureTursoSchema(turso);
    await runTursoPipeline(turso, [
      { sql: 'PRAGMA foreign_keys = ON' },
      ...statements,
    ]);
    return;
  }
  const db = getLocalDb();
  const tx = db.transaction(() => {
    for (const stmt of statements) {
      db.query(stmt.sql).run(...(stmt.args ?? []));
    }
  });
  tx();
}

export async function initDatabase(): Promise<void> {
  const turso = getTursoConfig();
  if (turso) {
    await ensureTursoSchema(turso);
    return;
  }
  getLocalDb();
}

export function closeDb(): void {
  if (localDbInstance) {
    localDbInstance.close();
    localDbInstance = null;
  }
  tursoInitPromise = null;
  tursoInitializedUrl = null;
}

export async function dbCountUsers(): Promise<number> {
  const row = await dbGet<{ count: number }>(
    'SELECT COUNT(*) AS count FROM users'
  );
  return Number(row?.count ?? 0);
}

export async function dbUpsertGoogleUser(input: {
  googleSub: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}): Promise<{ user: PublicUser; isNewFirstUser: boolean }> {
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanName =
    input.name.trim().slice(0, 80) || cleanEmail.split('@')[0] || 'User';
  const avatar = input.avatarUrl?.trim() || null;

  type UserRow = {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    created_at: string;
  };

  const existing =
    (await dbGet<UserRow>(
      'SELECT id, email, name, avatar_url, created_at FROM users WHERE google_sub = ?',
      [input.googleSub]
    )) ??
    (await dbGet<UserRow>(
      'SELECT id, email, name, avatar_url, created_at FROM users WHERE email = ?',
      [cleanEmail]
    ));

  if (existing) {
    await dbRun(
      'UPDATE users SET google_sub = ?, email = ?, name = ?, avatar_url = ? WHERE id = ?',
      [input.googleSub, cleanEmail, cleanName, avatar, existing.id]
    );
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

  const isFirst = (await dbCountUsers()) === 0;
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await dbRun(
    `INSERT INTO users (id, email, name, google_sub, avatar_url, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, '', ?)`,
    [id, cleanEmail, cleanName, input.googleSub, avatar, createdAt]
  );

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

export async function dbCreateSession(
  tokenHash: string,
  userId: string,
  expiresAt: string,
  createdAt: string
): Promise<void> {
  await dbRun(
    'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
    [tokenHash, userId, expiresAt, createdAt]
  );
}

export async function dbFindSessionUser(
  tokenHash: string,
  nowIso: string
): Promise<PublicUser | null> {
  const row = await dbGet<{
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    created_at: string;
  }>(
    `SELECT u.id, u.email, u.name, u.avatar_url, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
    [tokenHash, nowIso]
  );
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

export async function dbDeleteSession(tokenHash: string): Promise<void> {
  await dbRun('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
}

export async function dbPurgeExpiredSessions(nowIso: string): Promise<void> {
  await dbRun('DELETE FROM sessions WHERE expires_at <= ?', [nowIso]);
}

export async function dbLoadPortals(userId: string): Promise<StoredPortal[]> {
  const rows = await dbAll<{
    id: string;
    user_id: string;
    name: string;
    url: string;
    scraper: string | null;
    slug: string | null;
    created_at: string;
    last_fetched_at: string | null;
    last_count: number | null;
  }>(
    `SELECT id, user_id, name, url, scraper, slug, created_at, last_fetched_at, last_count
     FROM portals
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

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

export async function dbCountPortals(userId: string): Promise<number> {
  const row = await dbGet<{ count: number }>(
    'SELECT COUNT(*) AS count FROM portals WHERE user_id = ?',
    [userId]
  );
  return Number(row?.count ?? 0);
}

export async function dbUpsertPortal(
  userId: string,
  portal: {
    id: string;
    name: string;
    url: string;
    scraper?: ScraperName;
    slug?: string;
    createdAt: string;
  }
): Promise<StoredPortal> {
  const normalizedTarget = portal.url.trim().toLowerCase();
  const existing = (await dbLoadPortals(userId)).find(
    (p) => p.url.trim().toLowerCase() === normalizedTarget
  );

  if (existing) {
    const nextName = portal.name.trim() || existing.name;
    const nextScraper = portal.scraper ?? existing.scraper ?? null;
    const nextSlug = portal.slug ?? existing.slug ?? null;
    await dbRun(
      'UPDATE portals SET name = ?, scraper = ?, slug = ? WHERE id = ? AND user_id = ?',
      [nextName, nextScraper, nextSlug, existing.id, userId]
    );
    return {
      ...existing,
      name: nextName,
      ...(nextScraper ? { scraper: nextScraper } : {}),
      ...(nextSlug ? { slug: nextSlug } : {}),
    };
  }

  await dbRun(
    `INSERT INTO portals (id, user_id, name, url, scraper, slug, created_at, last_fetched_at, last_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
    [
      portal.id,
      userId,
      portal.name.trim(),
      portal.url.trim(),
      portal.scraper ?? null,
      portal.slug ?? null,
      portal.createdAt,
    ]
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

export async function dbUpdatePortalStats(
  userId: string,
  portalId: string,
  stats: { lastFetchedAt: string; lastCount: number }
): Promise<void> {
  await dbRun(
    'UPDATE portals SET last_fetched_at = ?, last_count = ? WHERE id = ? AND user_id = ?',
    [stats.lastFetchedAt, stats.lastCount, portalId, userId]
  );
}

export async function dbRemovePortal(
  userId: string,
  portalId: string
): Promise<boolean> {
  const res = await dbRun('DELETE FROM portals WHERE id = ? AND user_id = ?', [
    portalId,
    userId,
  ]);
  return res.changes > 0;
}

export async function dbGetWatchConfig(
  userId: string
): Promise<PersistedWatchConfig> {
  const row = await dbGet<{
    enabled: number;
    interval_minutes: number;
    region: string;
    role: string;
    exp: string;
    last_sync_at: string | null;
    next_sync_at: string | null;
  }>(
    `SELECT enabled, interval_minutes, region, role, exp, last_sync_at, next_sync_at
     FROM watch_configs WHERE user_id = ?`,
    [userId]
  );

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
    await dbUpsertWatchConfig(userId, defaults);
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

export async function dbUpsertWatchConfig(
  userId: string,
  config: PersistedWatchConfig
): Promise<void> {
  await dbRun(
    `INSERT INTO watch_configs (user_id, enabled, interval_minutes, region, role, exp, last_sync_at, next_sync_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       enabled = excluded.enabled,
       interval_minutes = excluded.interval_minutes,
       region = excluded.region,
       role = excluded.role,
       exp = excluded.exp,
       last_sync_at = excluded.last_sync_at,
       next_sync_at = excluded.next_sync_at`,
    [
      userId,
      config.enabled ? 1 : 0,
      config.intervalMinutes,
      config.region,
      config.role,
      config.exp,
      config.lastSyncAt,
      config.nextSyncAt,
    ]
  );
}

export async function dbListDueUsers(nowIso: string): Promise<string[]> {
  const rows = await dbAll<{ user_id: string }>(
    `SELECT wc.user_id
     FROM watch_configs wc
     WHERE wc.enabled = 1
       AND (wc.next_sync_at IS NULL OR wc.next_sync_at <= ?)
       AND EXISTS (SELECT 1 FROM portals p WHERE p.user_id = wc.user_id)`,
    [nowIso]
  );
  return rows.map((r) => r.user_id);
}

export async function dbLoadSnapshots(userId: string): Promise<SnapshotRow[]> {
  const rows = await dbAll<{
    portal_id: string;
    portal_name: string;
    scraper: string;
    slug: string;
    total_board_count: number;
    checked_count: number;
    fetched_at: string;
    jobs_json: string;
    last_error: string | null;
  }>(
    `SELECT portal_id, portal_name, scraper, slug, total_board_count, checked_count, fetched_at, jobs_json, last_error
     FROM portal_snapshots WHERE user_id = ?`,
    [userId]
  );
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

export async function dbSaveSnapshot(
  userId: string,
  snap: SnapshotRow
): Promise<void> {
  await dbRun(
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
       last_error = excluded.last_error`,
    [
      userId,
      snap.portalId,
      snap.portalName,
      snap.scraper,
      snap.slug,
      snap.totalBoardCount,
      snap.checkedCount,
      snap.fetchedAt,
      snap.jobsJson,
      snap.lastError,
    ]
  );
}

export async function dbSetSnapshotError(
  userId: string,
  portalId: string,
  error: string
): Promise<void> {
  await dbRun(
    'UPDATE portal_snapshots SET last_error = ? WHERE user_id = ? AND portal_id = ?',
    [error, userId, portalId]
  );
}

export async function dbDeleteSnapshot(
  userId: string,
  portalId: string
): Promise<void> {
  await dbRun(
    'DELETE FROM portal_snapshots WHERE user_id = ? AND portal_id = ?',
    [userId, portalId]
  );
}

export async function dbLoadChanges(
  userId: string,
  limit = 100
): Promise<ChangeRow[]> {
  const rows = await dbAll<{
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
  }>(
    `SELECT id, timestamp, portal_id, portal_name, type, job_id, job_title, location, url, detail
     FROM watch_changes
     WHERE user_id = ?
     ORDER BY timestamp DESC
     LIMIT ?`,
    [userId, limit]
  );

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

export async function dbInsertChanges(
  userId: string,
  entries: ChangeRow[],
  maxKeep = 100
): Promise<void> {
  if (entries.length === 0) return;
  const statements: Array<{ sql: string; args?: SqlParam[] }> = entries.map(
    (c) => ({
      sql: `INSERT OR REPLACE INTO watch_changes (id, user_id, timestamp, portal_id, portal_name, type, job_id, job_title, location, url, detail)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
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
        c.detail,
      ],
    })
  );
  statements.push({
    sql: `DELETE FROM watch_changes
          WHERE user_id = ?
            AND id NOT IN (
              SELECT id FROM watch_changes WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?
            )`,
    args: [userId, userId, maxKeep],
  });
  await dbBatch(statements);
}

export async function dbClearChanges(userId: string): Promise<void> {
  await dbRun('DELETE FROM watch_changes WHERE user_id = ?', [userId]);
}

export async function dbLoadBookmarks(
  userId: string
): Promise<Record<string, JobBookmarkState>> {
  const rows = await dbAll<{
    job_key: string;
    saved: number;
    applied: number;
    updated_at: string;
  }>(
    'SELECT job_key, saved, applied, updated_at FROM bookmarks WHERE user_id = ?',
    [userId]
  );
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

export async function dbSetBookmark(
  userId: string,
  jobKey: string,
  patch: { saved?: boolean; applied?: boolean }
): Promise<Record<string, JobBookmarkState>> {
  const existing = await dbGet<{
    saved: number;
    applied: number;
    updated_at: string;
  }>(
    'SELECT saved, applied, updated_at FROM bookmarks WHERE user_id = ? AND job_key = ?',
    [userId, jobKey]
  );

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
    await dbRun('DELETE FROM bookmarks WHERE user_id = ? AND job_key = ?', [
      userId,
      jobKey,
    ]);
  } else {
    await dbRun(
      `INSERT INTO bookmarks (user_id, job_key, saved, applied, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, job_key) DO UPDATE SET
         saved = excluded.saved,
         applied = excluded.applied,
         updated_at = excluded.updated_at`,
      [
        userId,
        jobKey,
        nextSaved ? 1 : 0,
        nextApplied ? 1 : 0,
        new Date().toISOString(),
      ]
    );
  }
  return dbLoadBookmarks(userId);
}

/** Imports single-user JSON files into the very first account created on an upgrade. */
export async function dbImportLegacySingleUserFiles(
  userId: string
): Promise<void> {
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
            await dbUpsertPortal(userId, {
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
            await dbSetBookmark(userId, key, {
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
