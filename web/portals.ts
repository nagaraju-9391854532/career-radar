import { randomUUID } from 'node:crypto';
import type { ScraperName } from '../src/index.ts';
import {
  dbCountPortals,
  dbLoadBookmarks,
  dbLoadPortals,
  dbRemovePortal,
  dbSetBookmark,
  dbUpdatePortalStats,
  dbUpsertPortal,
  getDatabasePath,
  type JobBookmarkState,
  type StoredPortal,
} from './db.ts';

export type { JobBookmarkState, StoredPortal };

export const MAX_PORTALS_PER_USER = 25;

export function getPortalsFilePath(): string {
  return getDatabasePath();
}

export async function loadPortals(userId: string): Promise<StoredPortal[]> {
  return dbLoadPortals(userId);
}

export async function upsertPortal(
  userId: string,
  input: {
    name: string;
    url: string;
    scraper?: ScraperName;
    slug?: string;
  }
): Promise<StoredPortal> {
  const existing = (await dbLoadPortals(userId)).find(
    (p) => p.url.trim().toLowerCase() === input.url.trim().toLowerCase()
  );
  if (!existing && (await dbCountPortals(userId)) >= MAX_PORTALS_PER_USER) {
    throw new Error(
      `Portal limit reached (max ${MAX_PORTALS_PER_USER} saved career portals per account).`
    );
  }
  return dbUpsertPortal(userId, {
    id: randomUUID(),
    name: input.name,
    url: input.url,
    scraper: input.scraper,
    slug: input.slug,
    createdAt: new Date().toISOString(),
  });
}

export async function updatePortalStats(
  userId: string,
  id: string,
  stats: { lastFetchedAt: string; lastCount: number }
): Promise<void> {
  await dbUpdatePortalStats(userId, id, stats);
}

export async function removePortal(
  userId: string,
  id: string
): Promise<boolean> {
  return dbRemovePortal(userId, id);
}

export async function loadBookmarks(
  userId: string
): Promise<Record<string, JobBookmarkState>> {
  return dbLoadBookmarks(userId);
}

export async function setBookmarkState(
  userId: string,
  key: string,
  patch: { saved?: boolean; applied?: boolean }
): Promise<Record<string, JobBookmarkState>> {
  return dbSetBookmark(userId, key, patch);
}
