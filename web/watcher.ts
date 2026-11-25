import { randomUUID } from 'node:crypto';
import {
  createScraper,
  renderScrapedPosting,
  resolveCompany,
  type CompanyInput,
  type Job,
  type ResolvedCompany,
  type ScraperName,
} from '../src/index.ts';

type JobListItem = Awaited<
  ReturnType<ReturnType<typeof createScraper>['getJobsList']>
>[number];
import {
  dbClearChanges,
  dbDeleteSnapshot,
  dbGetWatchConfig,
  dbInsertChanges,
  dbListDueUsers,
  dbLoadChanges,
  dbLoadSnapshots,
  dbSaveSnapshot,
  dbSetSnapshotError,
  dbUpsertWatchConfig,
  getDb,
  type PersistedWatchConfig,
  type WatchExp,
  type WatchRegion,
  type WatchRole,
} from './db.ts';
import {
  extractJobRequirements,
  isIndiaLocation,
  isTechItRole,
  matchesExperienceFilter,
} from './extract.ts';
import {
  loadPortals,
  updatePortalStats,
  type StoredPortal,
} from './portals.ts';

export type { WatchExp, WatchRegion, WatchRole };
export type JobChangeType = 'added' | 'updated' | 'unchanged';

export interface WatchConfig {
  enabled: boolean;
  intervalMinutes: number;
  region: WatchRegion;
  role: WatchRole;
  exp: WatchExp;
}

export interface WatchedJob {
  id: string;
  title: string;
  location: string;
  url: string;
  portalId: string;
  companyName: string;
  scraper: ScraperName;
  slug: string;
  technologies: string[];
  experienceSummary: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  experience: string[];
  changeType: JobChangeType;
  changedFields?: string[];
  lastChangedAt?: string;
}

export interface PortalSnapshot {
  portalId: string;
  portalName: string;
  scraper: ScraperName;
  slug: string;
  totalBoardCount: number;
  checkedCount: number;
  fetchedAt: string;
  jobs: WatchedJob[];
  lastError?: string | null;
}

export interface ChangeLogEntry {
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

export interface WatcherPersistedState {
  config: WatchConfig;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  snapshots: Record<string, PortalSnapshot>;
  changes: ChangeLogEntry[];
}

export interface WatcherPublicState extends WatcherPersistedState {
  isSyncing: boolean;
  syncingPortalId: string | null;
}

export interface WatchEvent {
  event: 'state' | 'sync_start' | 'sync_portal' | 'sync_done' | 'sync_error';
  data: unknown;
}

const MAX_CHANGES = 100;
const DETAIL_CONCURRENCY = 3;
const SCHEDULER_TICK_MS = 30_000;
const BOARD_LIST_MEMO_TTL_MS = 45_000;

function sanitizeConfig(raw: Partial<WatchConfig> | undefined): WatchConfig {
  const interval = Number(raw?.intervalMinutes);
  return {
    enabled: typeof raw?.enabled === 'boolean' ? raw.enabled : true,
    intervalMinutes:
      Number.isFinite(interval) && interval >= 1 && interval <= 1440
        ? Math.round(interval)
        : 15,
    region: raw?.region === 'all' ? 'all' : 'india',
    role: raw?.role === 'all' ? 'all' : 'tech',
    exp:
      raw?.exp === '0-2' || raw?.exp === 'all' || raw?.exp === '0-5'
        ? raw.exp
        : '0-5',
  };
}

function diffFields(prev: WatchedJob, next: WatchedJob): string[] {
  const changed: string[] = [];
  if (prev.title !== next.title) changed.push('title');
  if (prev.location !== next.location) changed.push('location');
  if (prev.experienceSummary !== next.experienceSummary)
    changed.push('experience');
  if (prev.technologies.join('|') !== next.technologies.join('|'))
    changed.push('technologies');
  if (prev.experience.join('|') !== next.experience.join('|'))
    changed.push('requirements');
  return changed;
}

export function diffPortalJobs(
  prevSnapshot: PortalSnapshot | undefined,
  nextJobs: WatchedJob[],
  portal: { id: string; name: string },
  timestamp: string
): {
  jobs: WatchedJob[];
  changes: ChangeLogEntry[];
  addedCount: number;
  updatedCount: number;
  removedCount: number;
} {
  if (!prevSnapshot) {
    return {
      jobs: nextJobs.map((j) => ({ ...j, changeType: 'unchanged' })),
      changes: [],
      addedCount: 0,
      updatedCount: 0,
      removedCount: 0,
    };
  }

  const prevById = new Map(prevSnapshot.jobs.map((j) => [j.id, j]));
  const nextById = new Map(nextJobs.map((j) => [j.id, j]));
  const changes: ChangeLogEntry[] = [];
  let addedCount = 0;
  let updatedCount = 0;
  let removedCount = 0;

  const mergedJobs: WatchedJob[] = nextJobs.map((job) => {
    const prev = prevById.get(job.id);
    if (!prev) {
      addedCount++;
      changes.push({
        id: randomUUID(),
        timestamp,
        portalId: portal.id,
        portalName: portal.name,
        type: 'added',
        jobId: job.id,
        jobTitle: job.title,
        location: job.location,
        url: job.url,
        detail: job.experienceSummary
          ? `New opening (${job.experienceSummary})`
          : 'New opening posted',
      });
      return {
        ...job,
        changeType: 'added',
        lastChangedAt: timestamp,
      };
    }

    const changedFields = diffFields(prev, job);
    if (changedFields.length > 0) {
      updatedCount++;
      changes.push({
        id: randomUUID(),
        timestamp,
        portalId: portal.id,
        portalName: portal.name,
        type: 'updated',
        jobId: job.id,
        jobTitle: job.title,
        location: job.location,
        url: job.url,
        detail: `Updated ${changedFields.join(', ')}`,
      });
      return {
        ...job,
        changeType: 'updated',
        changedFields,
        lastChangedAt: timestamp,
      };
    }

    return {
      ...job,
      changeType: 'unchanged',
      ...(prev.lastChangedAt ? { lastChangedAt: prev.lastChangedAt } : {}),
    };
  });

  for (const prev of prevSnapshot.jobs) {
    if (!nextById.has(prev.id)) {
      removedCount++;
      changes.push({
        id: randomUUID(),
        timestamp,
        portalId: portal.id,
        portalName: portal.name,
        type: 'removed',
        jobId: prev.id,
        jobTitle: prev.title,
        location: prev.location,
        url: prev.url,
        detail: 'Position closed or no longer matches filter',
      });
    }
  }

  return {
    jobs: mergedJobs,
    changes,
    addedCount,
    updatedCount,
    removedCount,
  };
}

interface SharedListMemo {
  expiresAt: number;
  promise: Promise<{
    resolved: ResolvedCompany;
    allJobs: JobListItem[];
  }>;
}

interface SharedJobMemo {
  expiresAt: number;
  promise: Promise<{
    job: Job;
    renderedBody: string;
  }>;
}

export class PortalWatcher {
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;
  private listenersByUser = new Map<string, Set<(event: WatchEvent) => void>>();
  private activeUserSyncs = new Map<
    string,
    { promise: Promise<void>; syncingPortalId: string | null }
  >();
  private boardListMemo = new Map<string, SharedListMemo>();
  private jobDetailMemo = new Map<string, SharedJobMemo>();
  private stopped = false;

  constructor(
    private readonly withFreshFetch: <T>(fn: () => Promise<T>) => Promise<T>
  ) {}

  async init(): Promise<void> {
    this.stopped = false;
    getDb();
    this.startupTimer = setTimeout(() => {
      void this.runDueUsers();
    }, 1500);
    this.tickTimer = setInterval(() => {
      void this.runDueUsers();
    }, SCHEDULER_TICK_MS);
  }

  stop(): void {
    this.stopped = true;
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.boardListMemo.clear();
    this.jobDetailMemo.clear();
  }

  getState(userId: string): WatcherPublicState {
    const persisted = dbGetWatchConfig(userId);
    const snapshotRows = dbLoadSnapshots(userId);
    const snapshots: Record<string, PortalSnapshot> = {};
    for (const row of snapshotRows) {
      let jobs: WatchedJob[] = [];
      try {
        jobs = JSON.parse(row.jobsJson) as WatchedJob[];
      } catch {
        jobs = [];
      }
      snapshots[row.portalId] = {
        portalId: row.portalId,
        portalName: row.portalName,
        scraper: row.scraper,
        slug: row.slug,
        totalBoardCount: row.totalBoardCount,
        checkedCount: row.checkedCount,
        fetchedAt: row.fetchedAt,
        jobs,
        lastError: row.lastError,
      };
    }

    const active = this.activeUserSyncs.get(userId);
    return {
      config: {
        enabled: persisted.enabled,
        intervalMinutes: persisted.intervalMinutes,
        region: persisted.region,
        role: persisted.role,
        exp: persisted.exp,
      },
      lastSyncAt: persisted.lastSyncAt,
      nextSyncAt: persisted.nextSyncAt,
      snapshots,
      changes: dbLoadChanges(userId, MAX_CHANGES),
      isSyncing: Boolean(active),
      syncingPortalId: active?.syncingPortalId ?? null,
    };
  }

  subscribe(userId: string, listener: (event: WatchEvent) => void): () => void {
    let set = this.listenersByUser.get(userId);
    if (!set) {
      set = new Set();
      this.listenersByUser.set(userId, set);
    }
    set.add(listener);
    return () => {
      const current = this.listenersByUser.get(userId);
      if (!current) return;
      current.delete(listener);
      if (current.size === 0) {
        this.listenersByUser.delete(userId);
      }
    };
  }

  private emit(userId: string, event: WatchEvent): void {
    const listeners = this.listenersByUser.get(userId);
    if (!listeners) return;
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        // Ignore individual SSE stream write errors
      }
    }
  }

  async updateConfig(
    userId: string,
    patch: Partial<WatchConfig> & { syncNow?: boolean }
  ): Promise<WatcherPublicState> {
    const prev = dbGetWatchConfig(userId);
    const nextConfig = sanitizeConfig({ ...prev, ...patch });
    const filterChanged =
      prev.region !== nextConfig.region ||
      prev.role !== nextConfig.role ||
      prev.exp !== nextConfig.exp;

    const nextPersisted: PersistedWatchConfig = {
      ...nextConfig,
      lastSyncAt: prev.lastSyncAt,
      nextSyncAt: nextConfig.enabled
        ? new Date(
            Date.now() + nextConfig.intervalMinutes * 60_000
          ).toISOString()
        : null,
    };

    dbUpsertWatchConfig(userId, nextPersisted);
    const state = this.getState(userId);
    this.emit(userId, { event: 'state', data: state });

    if (patch.syncNow || (nextConfig.enabled && filterChanged)) {
      void this.syncUserPortals(userId);
    }
    return state;
  }

  async clearChanges(userId: string): Promise<WatcherPublicState> {
    dbClearChanges(userId);
    const state = this.getState(userId);
    this.emit(userId, { event: 'state', data: state });
    return state;
  }

  async removePortalSnapshot(userId: string, portalId: string): Promise<void> {
    dbDeleteSnapshot(userId, portalId);
    this.emit(userId, { event: 'state', data: this.getState(userId) });
  }

  async syncPortalById(userId: string, portalId: string): Promise<void> {
    const portals = loadPortals(userId);
    const portal = portals.find((p) => p.id === portalId);
    if (!portal) return;
    const existing = this.activeUserSyncs.get(userId);
    if (existing) {
      await existing.promise;
    }
    return this.launchUserSync(userId, [portal]);
  }

  async syncUserPortals(userId: string): Promise<void> {
    const existing = this.activeUserSyncs.get(userId);
    if (existing) {
      return existing.promise;
    }
    const portals = loadPortals(userId);
    return this.launchUserSync(userId, portals);
  }

  private async runDueUsers(): Promise<void> {
    if (this.stopped) return;
    const dueIds = dbListDueUsers(new Date().toISOString());
    for (const userId of dueIds) {
      if (this.stopped) break;
      if (!this.activeUserSyncs.has(userId)) {
        await this.syncUserPortals(userId);
      }
    }
  }

  private async launchUserSync(
    userId: string,
    portals: StoredPortal[]
  ): Promise<void> {
    if (this.stopped) return;
    const tracker = {
      promise: Promise.resolve(),
      syncingPortalId: null as string | null,
    };
    const promise = this.runPortals(userId, portals, tracker).finally(() => {
      if (this.activeUserSyncs.get(userId) === tracker) {
        this.activeUserSyncs.delete(userId);
      }
    });
    tracker.promise = promise;
    this.activeUserSyncs.set(userId, tracker);
    return promise;
  }

  private async runPortals(
    userId: string,
    portals: StoredPortal[],
    tracker: { syncingPortalId: string | null }
  ): Promise<void> {
    if (this.stopped) return;
    const startedAt = new Date().toISOString();

    const allPortals = loadPortals(userId);
    const activeIds = new Set(allPortals.map((p) => p.id));
    for (const snap of dbLoadSnapshots(userId)) {
      if (!activeIds.has(snap.portalId)) {
        dbDeleteSnapshot(userId, snap.portalId);
      }
    }

    this.emit(userId, {
      event: 'sync_start',
      data: { startedAt, portalCount: portals.length },
    });

    let addedTotal = 0;
    let updatedTotal = 0;
    let removedTotal = 0;

    for (const portal of portals) {
      if (this.stopped) break;
      tracker.syncingPortalId = portal.id;
      try {
        const result = await this.syncSinglePortal(userId, portal);
        if (this.stopped) return;
        addedTotal += result.addedCount;
        updatedTotal += result.updatedCount;
        removedTotal += result.removedCount;
        this.emit(userId, {
          event: 'sync_portal',
          data: {
            portalId: portal.id,
            portalName: portal.name,
            snapshot: result.snapshot,
            addedCount: result.addedCount,
            updatedCount: result.updatedCount,
            removedCount: result.removedCount,
          },
        });
      } catch (error) {
        if (this.stopped) return;
        const message = error instanceof Error ? error.message : String(error);
        dbSetSnapshotError(userId, portal.id, message);
        this.emit(userId, {
          event: 'sync_error',
          data: {
            portalId: portal.id,
            portalName: portal.name,
            error: message,
          },
        });
      }
    }

    tracker.syncingPortalId = null;
    if (this.stopped) return;
    const currentConfig = dbGetWatchConfig(userId);
    const lastSyncAt = new Date().toISOString();
    const nextSyncAt = currentConfig.enabled
      ? new Date(
          Date.now() + currentConfig.intervalMinutes * 60_000
        ).toISOString()
      : null;

    dbUpsertWatchConfig(userId, {
      ...currentConfig,
      lastSyncAt,
      nextSyncAt,
    });

    const state = this.getState(userId);
    this.emit(userId, {
      event: 'sync_done',
      data: {
        lastSyncAt,
        nextSyncAt,
        addedCount: addedTotal,
        addedTotal,
        updatedTotal,
        removedTotal,
        state,
      },
    });
  }

  private getSharedBoardList(portal: StoredPortal) {
    const key =
      portal.scraper && portal.slug
        ? `${portal.scraper}:${portal.slug}`
        : portal.url.trim().toLowerCase();
    const now = Date.now();
    const existing = this.boardListMemo.get(key);
    if (existing && existing.expiresAt > now) {
      return existing.promise;
    }

    const input: CompanyInput =
      portal.scraper && portal.slug
        ? { company: portal.name, scraper: portal.scraper, slug: portal.slug }
        : /^https?:\/\//i.test(portal.url)
          ? { company: portal.name, url: portal.url }
          : { company: portal.name || portal.url };

    const promise = this.withFreshFetch(async () => {
      const resolved = await resolveCompany(input);
      const scraper = createScraper(resolved);
      try {
        const allJobs = await scraper.getJobsList();
        return {
          resolved,
          allJobs,
        };
      } finally {
        scraper.dispose();
      }
    }).catch((err) => {
      this.boardListMemo.delete(key);
      throw err;
    });

    this.boardListMemo.set(key, {
      expiresAt: now + BOARD_LIST_MEMO_TTL_MS,
      promise,
    });
    return promise;
  }

  private getSharedJobDetail(resolved: ResolvedCompany, item: JobListItem) {
    const key = `${resolved.scraper}:${resolved.slug}:${item.id}`;
    const now = Date.now();
    const existing = this.jobDetailMemo.get(key);
    if (existing && existing.expiresAt > now) {
      return existing.promise;
    }

    const promise = this.withFreshFetch(async () => {
      const scraper = createScraper(resolved);
      try {
        const fullJob = await scraper.getJob(item.id);
        const rendered = renderScrapedPosting(fullJob, {
          mode: 'compact',
          postingUrl: item.url,
        });
        return { job: fullJob, renderedBody: rendered.body };
      } finally {
        scraper.dispose();
      }
    }).catch((err) => {
      this.jobDetailMemo.delete(key);
      throw err;
    });

    this.jobDetailMemo.set(key, {
      expiresAt: now + BOARD_LIST_MEMO_TTL_MS,
      promise,
    });
    return promise;
  }

  private async syncSinglePortal(
    userId: string,
    portal: StoredPortal
  ): Promise<{
    snapshot: PortalSnapshot;
    addedCount: number;
    updatedCount: number;
    removedCount: number;
  }> {
    const { region, role, exp } = dbGetWatchConfig(userId);
    const listData = await this.getSharedBoardList(portal);
    const filteredList = listData.allJobs.filter((job) => {
      if (region === 'india' && !isIndiaLocation(job.location)) {
        return false;
      }
      if (role === 'tech' && !isTechItRole(job.title)) {
        return false;
      }
      return true;
    });

    const hasExpFilter = exp !== 'all';
    const matchedJobs: WatchedJob[] = [];
    let nextIndex = 0;
    const workerCount = Math.min(
      DETAIL_CONCURRENCY,
      Math.max(1, filteredList.length)
    );

    const worker = async () => {
      while (!this.stopped) {
        const idx = nextIndex++;
        if (idx >= filteredList.length) break;
        const item = filteredList[idx];
        try {
          const { job: fullJob, renderedBody } = await this.getSharedJobDetail(
            listData.resolved,
            item
          );
          const extracted = extractJobRequirements(fullJob, renderedBody);
          if (hasExpFilter && !matchesExperienceFilter(extracted, exp)) {
            continue;
          }
          matchedJobs.push({
            id: item.id,
            title: fullJob.title,
            location: fullJob.location,
            url: fullJob.url,
            portalId: portal.id,
            companyName: portal.name || listData.resolved.name,
            scraper: listData.resolved.scraper,
            slug: listData.resolved.slug,
            technologies: extracted.technologies,
            experienceSummary: extracted.experienceSummary,
            experienceMin: extracted.experienceMin,
            experienceMax: extracted.experienceMax,
            experience: extracted.experience,
            changeType: 'unchanged',
          });
        } catch {
          // Skip single-posting transient 404s during background sync
        }
      }
    };

    if (filteredList.length > 0) {
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
    }

    const fetchedAt = new Date().toISOString();
    if (this.stopped) {
      return {
        snapshot: {
          portalId: portal.id,
          portalName: portal.name || listData.resolved.name,
          scraper: listData.resolved.scraper,
          slug: listData.resolved.slug,
          totalBoardCount: listData.allJobs.length,
          checkedCount: filteredList.length,
          fetchedAt,
          jobs: [],
          lastError: null,
        },
        addedCount: 0,
        updatedCount: 0,
        removedCount: 0,
      };
    }

    const prevRow = dbLoadSnapshots(userId).find(
      (s) => s.portalId === portal.id
    );
    const prevSnapshot: PortalSnapshot | undefined = prevRow
      ? {
          portalId: prevRow.portalId,
          portalName: prevRow.portalName,
          scraper: prevRow.scraper,
          slug: prevRow.slug,
          totalBoardCount: prevRow.totalBoardCount,
          checkedCount: prevRow.checkedCount,
          fetchedAt: prevRow.fetchedAt,
          jobs: JSON.parse(prevRow.jobsJson) as WatchedJob[],
          lastError: prevRow.lastError,
        }
      : undefined;

    const diff = diffPortalJobs(
      prevSnapshot,
      matchedJobs,
      { id: portal.id, name: portal.name || listData.resolved.name },
      fetchedAt
    );

    const snapshot: PortalSnapshot = {
      portalId: portal.id,
      portalName: portal.name || listData.resolved.name,
      scraper: listData.resolved.scraper,
      slug: listData.resolved.slug,
      totalBoardCount: listData.allJobs.length,
      checkedCount: filteredList.length,
      fetchedAt,
      jobs: diff.jobs,
      lastError: null,
    };

    dbSaveSnapshot(userId, {
      portalId: snapshot.portalId,
      portalName: snapshot.portalName,
      scraper: snapshot.scraper,
      slug: snapshot.slug,
      totalBoardCount: snapshot.totalBoardCount,
      checkedCount: snapshot.checkedCount,
      fetchedAt: snapshot.fetchedAt,
      jobsJson: JSON.stringify(snapshot.jobs),
      lastError: null,
    });
    if (diff.changes.length > 0) {
      dbInsertChanges(userId, diff.changes, MAX_CHANGES);
    }
    updatePortalStats(userId, portal.id, {
      lastFetchedAt: fetchedAt,
      lastCount: snapshot.jobs.length,
    });

    return {
      snapshot,
      addedCount: diff.addedCount,
      updatedCount: diff.updatedCount,
      removedCount: diff.removedCount,
    };
  }
}
