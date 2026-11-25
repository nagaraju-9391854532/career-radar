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

export function loadPortals(userId: string): StoredPortal[] {
  return dbLoadPortals(userId);
}

export function upsertPortal(
  userId: string,
  input: {
    name: string;
    url: string;
    scraper?: ScraperName;
    slug?: string;
  }
): StoredPortal {
  const existing = dbLoadPortals(userId).find(
    (p) => p.url.trim().toLowerCase() === input.url.trim().toLowerCase()
  );
  if (!existing && dbCountPortals(userId) >= MAX_PORTALS_PER_USER) {
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

export function updatePortalStats(
  userId: string,
  id: string,
  stats: { lastFetchedAt: string; lastCount: number }
): void {
  dbUpdatePortalStats(userId, id, stats);
}

export function removePortal(userId: string, id: string): boolean {
  return dbRemovePortal(userId, id);
}

export function loadBookmarks(
  userId: string
): Record<string, JobBookmarkState> {
  return dbLoadBookmarks(userId);
}

export function setBookmarkState(
  userId: string,
  key: string,
  patch: { saved?: boolean; applied?: boolean }
): Record<string, JobBookmarkState> {
  return dbSetBookmark(userId, key, patch);
}
