import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { dataDir, type ScraperName } from '../src/index.ts';

export interface StoredPortal {
  id: string;
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

const PORTALS_FILE = join(dataDir, 'career-portals.json');
const BOOKMARKS_FILE = join(dataDir, 'job-bookmarks.json');

export function getPortalsFilePath(): string {
  return PORTALS_FILE;
}

export async function loadBookmarks(): Promise<
  Record<string, JobBookmarkState>
> {
  try {
    const raw = await readFile(BOOKMARKS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, JobBookmarkState>;
  } catch {
    return {};
  }
}

export async function setBookmarkState(
  key: string,
  patch: { saved?: boolean; applied?: boolean }
): Promise<Record<string, JobBookmarkState>> {
  const bookmarks = await loadBookmarks();
  const prev = bookmarks[key] ?? {
    saved: false,
    applied: false,
    updatedAt: new Date().toISOString(),
  };
  const nextSaved = typeof patch.saved === 'boolean' ? patch.saved : prev.saved;
  const nextApplied =
    typeof patch.applied === 'boolean' ? patch.applied : prev.applied;

  if (!nextSaved && !nextApplied) {
    delete bookmarks[key];
  } else {
    bookmarks[key] = {
      saved: nextSaved,
      applied: nextApplied,
      updatedAt: new Date().toISOString(),
    };
  }

  await mkdir(dirname(BOOKMARKS_FILE), { recursive: true });
  await writeFile(
    BOOKMARKS_FILE,
    JSON.stringify(bookmarks, null, 2) + '\n',
    'utf8'
  );
  return bookmarks;
}

export async function loadPortals(): Promise<StoredPortal[]> {
  try {
    const raw = await readFile(PORTALS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredPortal =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.url === 'string'
    );
  } catch {
    return [];
  }
}

async function savePortals(portals: StoredPortal[]): Promise<void> {
  await mkdir(dirname(PORTALS_FILE), { recursive: true });
  await writeFile(
    PORTALS_FILE,
    JSON.stringify(portals, null, 2) + '\n',
    'utf8'
  );
}

export async function upsertPortal(input: {
  name: string;
  url: string;
  scraper?: ScraperName;
  slug?: string;
}): Promise<StoredPortal> {
  const portals = await loadPortals();
  const normalizedTarget = input.url.trim().toLowerCase();
  const existing = portals.find(
    (p) => p.url.trim().toLowerCase() === normalizedTarget
  );

  if (existing) {
    existing.name = input.name.trim() || existing.name;
    if (input.scraper) existing.scraper = input.scraper;
    if (input.slug) existing.slug = input.slug;
    await savePortals(portals);
    return existing;
  }

  const created: StoredPortal = {
    id: randomUUID(),
    name: input.name.trim(),
    url: input.url.trim(),
    ...(input.scraper ? { scraper: input.scraper } : {}),
    ...(input.slug ? { slug: input.slug } : {}),
    createdAt: new Date().toISOString(),
    lastFetchedAt: null,
    lastCount: null,
  };
  portals.unshift(created);
  await savePortals(portals);
  return created;
}

export async function updatePortalStats(
  id: string,
  stats: { lastFetchedAt: string; lastCount: number }
): Promise<void> {
  const portals = await loadPortals();
  const target = portals.find((p) => p.id === id);
  if (!target) return;
  target.lastFetchedAt = stats.lastFetchedAt;
  target.lastCount = stats.lastCount;
  await savePortals(portals);
}

export async function removePortal(id: string): Promise<boolean> {
  const portals = await loadPortals();
  const next = portals.filter((p) => p.id !== id);
  if (next.length === portals.length) return false;
  await savePortals(next);
  return true;
}
