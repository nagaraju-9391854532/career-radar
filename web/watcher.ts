import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  createScraper,
  dataDir,
  renderScrapedPosting,
  resolveCompany,
  type CompanyInput,
  type ScraperName,
} from '../src/index.ts';
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

export type WatchRegion = 'india' | 'all';
export type WatchRole = 'tech' | 'all';
export type WatchExp = '0-5' | '0-2' | 'all';
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

const WATCHER_FILE = join(dataDir, 'watcher-state.json');
const MAX_CHANGES = 100;
const DETAIL_CONCURRENCY = 3;

const DEFAULT_CONFIG: WatchConfig = {
  enabled: true,
  intervalMinutes: 15,
  region: 'india',
  role: 'tech',
  exp: '0-5',
};

function sanitizeConfig(raw: Partial<WatchConfig> | undefined): WatchConfig {
  const interval = Number(raw?.intervalMinutes);
  return {
    enabled:
      typeof raw?.enabled === 'boolean' ? raw.enabled : DEFAULT_CONFIG.enabled,
    intervalMinutes:
      Number.isFinite(interval) && interval >= 1 && interval <= 1440
        ? Math.round(interval)
        : DEFAULT_CONFIG.intervalMinutes,
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

export class PortalWatcher {
  private state: WatcherPersistedState = {
    config: { ...DEFAULT_CONFIG },
    lastSyncAt: null,
    nextSyncAt: null,
    snapshots: {},
    changes: [],
  };
  private isSyncing = false;
  private syncingPortalId: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private initialTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<(event: WatchEvent) => void>();
  private activeSyncPromise: Promise<void> | null = null;
  private stopped = false;

  constructor(
    private readonly withFreshFetch: <T>(fn: () => Promise<T>) => Promise<T>
  ) {}

  async init(): Promise<void> {
    this.stopped = false;
    await this.loadFromDisk();
    this.scheduleNextRun(true);
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.initialTimer) {
      clearTimeout(this.initialTimer);
      this.initialTimer = null;
    }
  }

  getState(): WatcherPublicState {
    return {
      ...this.state,
      isSyncing: this.isSyncing,
      syncingPortalId: this.syncingPortalId,
    };
  }

  subscribe(listener: (event: WatchEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: WatchEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore individual SSE stream write errors
      }
    }
  }

  private async loadFromDisk(): Promise<void> {
    try {
      const raw = await readFile(WATCHER_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<WatcherPersistedState>;
      this.state = {
        config: sanitizeConfig(parsed.config),
        lastSyncAt:
          typeof parsed.lastSyncAt === 'string' ? parsed.lastSyncAt : null,
        nextSyncAt:
          typeof parsed.nextSyncAt === 'string' ? parsed.nextSyncAt : null,
        snapshots:
          parsed.snapshots && typeof parsed.snapshots === 'object'
            ? parsed.snapshots
            : {},
        changes: Array.isArray(parsed.changes)
          ? parsed.changes.slice(0, MAX_CHANGES)
          : [],
      };
    } catch {
      this.state = {
        config: { ...DEFAULT_CONFIG },
        lastSyncAt: null,
        nextSyncAt: null,
        snapshots: {},
        changes: [],
      };
    }
  }

  private async saveToDisk(): Promise<void> {
    await mkdir(dirname(WATCHER_FILE), { recursive: true });
    await writeFile(
      WATCHER_FILE,
      JSON.stringify(this.state, null, 2) + '\n',
      'utf8'
    );
  }

  private scheduleNextRun(isStartup = false): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.initialTimer) {
      clearTimeout(this.initialTimer);
      this.initialTimer = null;
    }
    if (this.stopped || !this.state.config.enabled) {
      this.state.nextSyncAt = null;
      return;
    }

    const intervalMs = this.state.config.intervalMinutes * 60_000;
    const lastMs = this.state.lastSyncAt
      ? Date.parse(this.state.lastSyncAt)
      : 0;
    const elapsed = lastMs ? Date.now() - lastMs : Infinity;
    const delayMs = isStartup
      ? elapsed >= intervalMs
        ? 1500
        : Math.max(2000, intervalMs - elapsed)
      : intervalMs;

    this.state.nextSyncAt = new Date(Date.now() + delayMs).toISOString();

    const trigger = () => {
      if (this.stopped || !this.state.config.enabled) return;
      void this.syncAllPortals().finally(() => {
        if (!this.stopped && this.state.config.enabled) {
          this.scheduleNextRun(false);
        }
      });
    };

    if (isStartup) {
      this.initialTimer = setTimeout(trigger, delayMs);
    } else {
      this.timer = setTimeout(trigger, delayMs);
    }
  }

  async updateConfig(
    patch: Partial<WatchConfig> & { syncNow?: boolean }
  ): Promise<WatcherPublicState> {
    const prev = this.state.config;
    const next = sanitizeConfig({ ...prev, ...patch });
    const filterChanged =
      prev.region !== next.region ||
      prev.role !== next.role ||
      prev.exp !== next.exp;
    this.state.config = next;

    if (!next.enabled) {
      this.state.nextSyncAt = null;
    }
    await this.saveToDisk();
    this.scheduleNextRun(false);
    this.emit({ event: 'state', data: this.getState() });

    if (patch.syncNow || (next.enabled && filterChanged)) {
      void this.syncAllPortals();
    }
    return this.getState();
  }

  async clearChanges(): Promise<WatcherPublicState> {
    this.state.changes = [];
    await this.saveToDisk();
    this.emit({ event: 'state', data: this.getState() });
    return this.getState();
  }

  async removePortalSnapshot(portalId: string): Promise<void> {
    if (this.state.snapshots[portalId]) {
      delete this.state.snapshots[portalId];
      await this.saveToDisk();
      this.emit({ event: 'state', data: this.getState() });
    }
  }

  async syncPortalById(portalId: string): Promise<void> {
    const portals = await loadPortals();
    const portal = portals.find((p) => p.id === portalId);
    if (!portal) return;
    if (this.activeSyncPromise) {
      await this.activeSyncPromise;
    }
    this.activeSyncPromise = this.runPortals([portal]);
    await this.activeSyncPromise;
  }

  async syncAllPortals(): Promise<void> {
    if (this.activeSyncPromise) {
      return this.activeSyncPromise;
    }
    const portals = await loadPortals();
    this.activeSyncPromise = this.runPortals(portals);
    try {
      await this.activeSyncPromise;
    } finally {
      this.activeSyncPromise = null;
    }
  }

  private async runPortals(portals: StoredPortal[]): Promise<void> {
    if (this.stopped) return;
    this.isSyncing = true;
    const startedAt = new Date().toISOString();

    // Remove snapshots for portals that no longer exist
    const allPortals = await loadPortals();
    const activeIds = new Set(allPortals.map((p) => p.id));
    for (const id of Object.keys(this.state.snapshots)) {
      if (!activeIds.has(id)) delete this.state.snapshots[id];
    }

    this.emit({
      event: 'sync_start',
      data: { startedAt, portalCount: portals.length },
    });

    let addedTotal = 0;
    let updatedTotal = 0;
    let removedTotal = 0;

    for (const portal of portals) {
      if (this.stopped) break;
      this.syncingPortalId = portal.id;
      try {
        const result = await this.syncSinglePortal(portal);
        addedTotal += result.addedCount;
        updatedTotal += result.updatedCount;
        removedTotal += result.removedCount;
        this.emit({
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
        const message = error instanceof Error ? error.message : String(error);
        const existing = this.state.snapshots[portal.id];
        if (existing) {
          existing.lastError = message;
        }
        this.emit({
          event: 'sync_error',
          data: {
            portalId: portal.id,
            portalName: portal.name,
            error: message,
          },
        });
      }
    }

    this.syncingPortalId = null;
    this.isSyncing = false;
    this.state.lastSyncAt = new Date().toISOString();
    if (this.state.config.enabled) {
      this.state.nextSyncAt = new Date(
        Date.now() + this.state.config.intervalMinutes * 60_000
      ).toISOString();
    } else {
      this.state.nextSyncAt = null;
    }

    await this.saveToDisk();
    this.emit({
      event: 'sync_done',
      data: {
        lastSyncAt: this.state.lastSyncAt,
        nextSyncAt: this.state.nextSyncAt,
        addedTotal,
        updatedTotal,
        removedTotal,
        state: this.getState(),
      },
    });
  }

  private async syncSinglePortal(portal: StoredPortal): Promise<{
    snapshot: PortalSnapshot;
    addedCount: number;
    updatedCount: number;
    removedCount: number;
  }> {
    const { region, role, exp } = this.state.config;
    const input: CompanyInput =
      portal.scraper && portal.slug
        ? { company: portal.name, scraper: portal.scraper, slug: portal.slug }
        : /^https?:\/\//i.test(portal.url)
          ? { company: portal.name, url: portal.url }
          : { company: portal.name || portal.url };

    return this.withFreshFetch(async () => {
      const resolved = await resolveCompany(input);
      const scraper = createScraper(resolved);
      try {
        const allJobs = await scraper.getJobsList();
        const filteredList = allJobs.filter((job) => {
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
              const fullJob = await scraper.getJob(item.id);
              const rendered = renderScrapedPosting(fullJob, {
                mode: 'compact',
                postingUrl: item.url,
              });
              const extracted = extractJobRequirements(fullJob, rendered.body);
              if (hasExpFilter && !matchesExperienceFilter(extracted, exp)) {
                continue;
              }
              matchedJobs.push({
                id: item.id,
                title: fullJob.title,
                location: fullJob.location,
                url: fullJob.url,
                portalId: portal.id,
                companyName: portal.name || resolved.name,
                scraper: resolved.scraper,
                slug: resolved.slug,
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
          await Promise.all(
            Array.from({ length: workerCount }, () => worker())
          );
        }

        const fetchedAt = new Date().toISOString();
        const prevSnapshot = this.state.snapshots[portal.id];
        const diff = diffPortalJobs(
          prevSnapshot,
          matchedJobs,
          { id: portal.id, name: portal.name || resolved.name },
          fetchedAt
        );

        const snapshot: PortalSnapshot = {
          portalId: portal.id,
          portalName: portal.name || resolved.name,
          scraper: resolved.scraper,
          slug: resolved.slug,
          totalBoardCount: allJobs.length,
          checkedCount: filteredList.length,
          fetchedAt,
          jobs: diff.jobs,
          lastError: null,
        };

        this.state.snapshots[portal.id] = snapshot;
        if (diff.changes.length > 0) {
          this.state.changes = [...diff.changes, ...this.state.changes].slice(
            0,
            MAX_CHANGES
          );
        }
        await this.saveToDisk();
        await updatePortalStats(portal.id, {
          lastFetchedAt: fetchedAt,
          lastCount: snapshot.jobs.length,
        });

        return {
          snapshot,
          addedCount: diff.addedCount,
          updatedCount: diff.updatedCount,
          removedCount: diff.removedCount,
        };
      } finally {
        scraper.dispose();
      }
    });
  }
}
