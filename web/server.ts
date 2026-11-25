import { randomUUID } from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  configureCache,
  createScraper,
  fetchJob,
  HttpError,
  isScraperName,
  JobNotFoundError,
  renderScrapedPosting,
  resolveCompany,
  scraperNames,
  UnresolvedCompanyError,
  type CompanyInput,
  type ScraperName,
} from '../src/index.ts';
import {
  assertSafeExternalUrl,
  authenticateRequest,
  checkAuthRateLimit,
  clearSessionCookie,
  getClientIp,
  hashPassword,
  issueSessionCookie,
  verifyPassword,
} from './auth.ts';
import {
  dbCountUsers,
  dbCreateUser,
  dbFindUserByEmail,
  dbImportLegacySingleUserFiles,
  type PublicUser,
} from './db.ts';
import {
  extractJobRequirements,
  isIndiaLocation,
  isTechItRole,
  matchesExperienceFilter,
} from './extract.ts';
import {
  getPortalsFilePath,
  loadBookmarks,
  loadPortals,
  removePortal,
  setBookmarkState,
  updatePortalStats,
  upsertPortal,
} from './portals.ts';
import { PortalWatcher } from './watcher.ts';

const WEB_DIR = fileURLToPath(new URL('.', import.meta.url));
const DEFAULT_PORT = Number(process.env.PORT) || 4321;
const HOST = process.env.HOST || '127.0.0.1';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sendJson(
  res: ServerResponse,
  status: number,
  data: unknown,
  extraHeaders?: Record<string, string>
): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(body);
}

class InputError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = 'InputError';
  }
}

function normalizeUrlInput(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    assertSafeExternalUrl(trimmed);
    return trimmed;
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) {
    const withProtocol = `https://${trimmed}`;
    assertSafeExternalUrl(withProtocol);
    return withProtocol;
  }
  return '';
}

function parseCompanyInput(searchParams: URLSearchParams): CompanyInput {
  const q = searchParams.get('q')?.trim() ?? '';
  const scraper = searchParams.get('scraper')?.trim() ?? '';
  const slug = searchParams.get('slug')?.trim() ?? '';

  if (scraper || slug) {
    if (!scraper || !slug) {
      throw new InputError(
        'Both scraper and slug are required when specifying a board manually.'
      );
    }
    if (!isScraperName(scraper)) {
      throw new InputError(`Unknown scraper: ${scraper}`);
    }
    return { scraper, slug, ...(q ? { company: q } : {}) };
  }

  if (!q) {
    throw new InputError('Please enter a company name or careers page URL.');
  }

  const normalizedUrl = normalizeUrlInput(q);
  if (normalizedUrl) {
    return { url: normalizedUrl };
  }

  return { company: q };
}

async function readJsonBody(
  req: IncomingMessage
): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > 64 * 1024) {
      throw new InputError('Request body too large.');
    }
    chunks.push(buf);
  }
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new InputError('Expected a JSON object.');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError('Invalid JSON request body.');
  }
}

function handleApiError(res: ServerResponse, error: unknown): void {
  if (error instanceof InputError) {
    sendJson(res, error.status, {
      error: error.message,
      code: 'INVALID_INPUT',
    });
    return;
  }
  if (error instanceof TypeError) {
    sendJson(res, 400, { error: error.message, code: 'INVALID_INPUT' });
    return;
  }
  if (error instanceof UnresolvedCompanyError) {
    sendJson(res, 404, { error: error.message, code: 'UNRESOLVED_COMPANY' });
    return;
  }
  if (error instanceof JobNotFoundError) {
    sendJson(res, 404, { error: error.message, code: 'JOB_NOT_FOUND' });
    return;
  }
  if (error instanceof HttpError) {
    sendJson(res, 502, {
      error: `Upstream board returned HTTP ${error.status}: ${error.message}`,
      code: 'UPSTREAM_HTTP_ERROR',
      status: error.status,
    });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  sendJson(res, 500, { error: message, code: 'INTERNAL_ERROR' });
}

function requireUser(
  req: IncomingMessage,
  res: ServerResponse
): PublicUser | null {
  const user = authenticateRequest(req);
  if (!user) {
    sendJson(res, 401, {
      error: 'Authentication required.',
      code: 'UNAUTHORIZED',
    });
    return null;
  }
  return user;
}

function assertSameOrigin(req: IncomingMessage): void {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return;
  const parsed = URL.parse(origin);
  if (!parsed || parsed.host !== host) {
    throw new InputError('Cross-origin request rejected.', 403);
  }
}

async function handleSignup(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  assertSameOrigin(req);
  if (!checkAuthRateLimit(getClientIp(req))) {
    throw new InputError('Too many auth attempts. Please wait a bit.', 429);
  }
  const body = await readJsonBody(req);
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const rawName = typeof body.name === 'string' ? body.name.trim() : '';

  if (!EMAIL_RE.test(email)) {
    throw new InputError('Please enter a valid email address.');
  }
  if (password.length < 8) {
    throw new InputError('Password must be at least 8 characters long.');
  }
  if (dbFindUserByEmail(email)) {
    throw new InputError('An account with that email already exists.', 409);
  }

  const isFirstAccount = dbCountUsers() === 0;
  const userId = randomUUID();
  const name = rawName || email.split('@')[0] || 'User';
  const createdAt = new Date().toISOString();

  dbCreateUser({
    id: userId,
    email,
    name: name.slice(0, 80),
    passwordHash: hashPassword(password),
    createdAt,
  });

  if (isFirstAccount) {
    dbImportLegacySingleUserFiles(userId);
  }

  const cookie = issueSessionCookie(userId, req);
  sendJson(
    res,
    201,
    { user: { id: userId, email, name, createdAt } },
    { 'Set-Cookie': cookie }
  );
}

async function handleLogin(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  assertSameOrigin(req);
  if (!checkAuthRateLimit(getClientIp(req))) {
    throw new InputError('Too many auth attempts. Please wait a bit.', 429);
  }
  const body = await readJsonBody(req);
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    throw new InputError('Email and password are required.');
  }

  const user = dbFindUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new InputError('Invalid email or password.', 401);
  }

  const cookie = issueSessionCookie(user.id, req);
  sendJson(
    res,
    200,
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    },
    { 'Set-Cookie': cookie }
  );
}

function handleLogout(req: IncomingMessage, res: ServerResponse): void {
  assertSameOrigin(req);
  const cookie = clearSessionCookie(req);
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': cookie });
}

async function handleApiJob(url: URL, res: ServerResponse): Promise<void> {
  const jobUrl = url.searchParams.get('url')?.trim() ?? '';
  const scraperParam = url.searchParams.get('scraper')?.trim() ?? '';
  const slugParam = url.searchParams.get('slug')?.trim() ?? '';
  const idParam = url.searchParams.get('id')?.trim() ?? '';

  let job;
  if (scraperParam && slugParam && idParam) {
    if (!isScraperName(scraperParam)) {
      throw new InputError(`Unknown scraper: ${scraperParam}`);
    }
    job = await fetchJob({
      scraper: scraperParam,
      slug: slugParam,
      id: idParam,
    });
  } else if (jobUrl) {
    assertSafeExternalUrl(jobUrl);
    job = await fetchJob(jobUrl);
  } else {
    throw new InputError('Provide either url or scraper, slug, and id.');
  }

  const rendered = renderScrapedPosting(job, {
    mode: 'compact',
    postingUrl: jobUrl || undefined,
  });
  const extracted = extractJobRequirements(job, rendered.body);

  sendJson(res, 200, {
    job,
    markdown: rendered.markdown,
    body: rendered.body,
    ...extracted,
  });
}

const STREAM_CONCURRENCY = 3;
let activeFreshFetches = 0;

function beginFreshFetch(): void {
  activeFreshFetches++;
  if (activeFreshFetches === 1) {
    configureCache({ enabled: false });
  }
}

function endFreshFetch(): void {
  activeFreshFetches = Math.max(0, activeFreshFetches - 1);
  if (activeFreshFetches === 0) {
    configureCache({ enabled: undefined });
  }
}

async function withFreshFetch<T>(fn: () => Promise<T>): Promise<T> {
  beginFreshFetch();
  try {
    return await fn();
  } finally {
    endFreshFetch();
  }
}

const watcher = new PortalWatcher(withFreshFetch);

async function handleApiJobsStream(
  userId: string,
  url: URL,
  res: ServerResponse
): Promise<void> {
  const startedAt = Date.now();
  const input = parseCompanyInput(url.searchParams);
  const regionFilter = (url.searchParams.get('region') ?? 'all')
    .trim()
    .toLowerCase();
  const roleFilter = (url.searchParams.get('role') ?? 'all')
    .trim()
    .toLowerCase();
  const expFilter = (url.searchParams.get('exp') ?? 'all').trim().toLowerCase();
  const isFresh = /^(1|true|yes)$/i.test(url.searchParams.get('fresh') ?? '');
  const portalId = url.searchParams.get('portalId')?.trim() ?? '';

  let closed = false;
  res.on('close', () => {
    if (!res.writableEnded) closed = true;
  });

  const sendEvent = (event: string, data: unknown) => {
    if (closed || res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  if (isFresh) beginFreshFetch();
  let scraper: ReturnType<typeof createScraper> | null = null;
  try {
    const resolved = await resolveCompany(input);
    if (closed) return;

    const activeScraper = createScraper(resolved);
    scraper = activeScraper;
    const allJobs = await activeScraper.getJobsList();
    if (closed) return;

    const jobs = allJobs.filter((job) => {
      if (regionFilter === 'india' && !isIndiaLocation(job.location)) {
        return false;
      }
      if (roleFilter === 'tech' && !isTechItRole(job.title)) {
        return false;
      }
      return true;
    });
    const hasExpPreFilter = expFilter !== '' && expFilter !== 'all';

    sendEvent('list', {
      company: {
        name: resolved.name,
        scraper: resolved.scraper,
        slug: resolved.slug,
        homepage: resolved.homepage ?? null,
        discovered: resolved.discovered,
      },
      totalBoardCount: allJobs.length,
      count: jobs.length,
      region: regionFilter,
      role: roleFilter,
      exp: expFilter,
      fresh: isFresh,
      fetchedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      jobs: hasExpPreFilter ? [] : jobs,
    });

    let nextIndex = 0;
    let completed = 0;
    let matched = 0;
    const workerCount = Math.min(STREAM_CONCURRENCY, Math.max(1, jobs.length));

    const worker = async () => {
      while (!closed) {
        const index = nextIndex++;
        if (index >= jobs.length) break;
        const item = jobs[index];
        try {
          const fullJob = await activeScraper.getJob(item.id);
          if (closed) break;
          const rendered = renderScrapedPosting(fullJob, {
            mode: 'compact',
            postingUrl: item.url,
          });
          const extracted = extractJobRequirements(fullJob, rendered.body);
          completed++;

          if (
            hasExpPreFilter &&
            !matchesExperienceFilter(extracted, expFilter)
          ) {
            if (completed % 5 === 0 || completed === jobs.length) {
              sendEvent('progress', {
                completed,
                total: jobs.length,
                matched,
              });
            }
            continue;
          }

          matched++;
          sendEvent('detail', {
            index,
            id: item.id,
            title: fullJob.title,
            location: fullJob.location,
            url: fullJob.url,
            technologies: extracted.technologies,
            experienceSummary: extracted.experienceSummary,
            experienceMin: extracted.experienceMin,
            experienceMax: extracted.experienceMax,
            experience: extracted.experience,
            completed,
            matched,
            total: jobs.length,
          });
        } catch (error) {
          if (closed) break;
          completed++;
          if (!hasExpPreFilter) {
            sendEvent('detail_error', {
              index,
              id: item.id,
              error: error instanceof Error ? error.message : String(error),
              completed,
              matched,
              total: jobs.length,
            });
          } else if (completed % 5 === 0 || completed === jobs.length) {
            sendEvent('progress', {
              completed,
              total: jobs.length,
              matched,
            });
          }
        }
      }
    };

    if (jobs.length > 0) {
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
    }

    if (!closed) {
      const fetchedAt = new Date().toISOString();
      if (portalId) {
        updatePortalStats(userId, portalId, {
          lastFetchedAt: fetchedAt,
          lastCount: matched,
        });
      }
      sendEvent('done', {
        completed,
        matched,
        total: jobs.length,
        totalBoardCount: allJobs.length,
        fetchedAt,
        elapsedMs: Date.now() - startedAt,
      });
      res.end();
    }
  } catch (error) {
    if (!res.headersSent) {
      handleApiError(res, error);
      return;
    }
    sendEvent('fail', {
      error: error instanceof Error ? error.message : String(error),
    });
    if (!res.writableEnded) res.end();
  } finally {
    if (isFresh) endFreshFetch();
    scraper?.dispose();
  }
}

async function serveStatic(
  pathname: string,
  res: ServerResponse
): Promise<void> {
  const relativePath =
    pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const fullPath = resolve(join(WEB_DIR, relativePath));
  if (!fullPath.startsWith(resolve(WEB_DIR))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const content = await readFile(fullPath);
    const mime = MIME_TYPES[extname(fullPath)] ?? 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-store',
    });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
}

function handleGetPortals(userId: string, res: ServerResponse): void {
  const portals = loadPortals(userId);
  sendJson(res, 200, {
    portals,
    storagePath: getPortalsFilePath(),
  });
}

async function resolvePortalEntry(
  userId: string,
  raw: {
    name?: unknown;
    url?: unknown;
    scraper?: unknown;
    slug?: unknown;
  }
) {
  const rawUrl = typeof raw.url === 'string' ? raw.url.trim() : '';
  const rawName = typeof raw.name === 'string' ? raw.name.trim() : '';
  const rawScraper = typeof raw.scraper === 'string' ? raw.scraper.trim() : '';
  const rawSlug = typeof raw.slug === 'string' ? raw.slug.trim() : '';

  if (!rawUrl && !(rawScraper && rawSlug)) {
    throw new InputError('Provide a career portal URL or company name.');
  }
  if ((rawScraper && !rawSlug) || (!rawScraper && rawSlug)) {
    throw new InputError('Both scraper and slug must be provided together.');
  }
  if (rawScraper && !isScraperName(rawScraper)) {
    throw new InputError(`Unknown scraper: ${rawScraper}`);
  }

  const normalizedUrl = rawUrl ? normalizeUrlInput(rawUrl) || rawUrl : '';
  const input: CompanyInput =
    rawScraper && isScraperName(rawScraper)
      ? {
          ...(rawName ? { company: rawName } : {}),
          scraper: rawScraper,
          slug: rawSlug,
        }
      : normalizedUrl.startsWith('http')
        ? { ...(rawName ? { company: rawName } : {}), url: normalizedUrl }
        : { company: rawName || rawUrl };

  let resolvedScraper: ScraperName | undefined =
    rawScraper && isScraperName(rawScraper) ? rawScraper : undefined;
  let resolvedSlug: string | undefined = rawSlug || undefined;
  let resolvedName = rawName;

  try {
    const resolved = await resolveCompany(input);
    resolvedScraper = resolved.scraper;
    resolvedSlug = resolved.slug;
    if (!resolvedName) resolvedName = resolved.name;
  } catch (error) {
    if (error instanceof UnresolvedCompanyError) {
      throw new UnresolvedCompanyError(
        rawUrl || rawName,
        `Could not resolve a supported job board for '${rawUrl || rawName}'. You can still specify Scraper + Slug manually.`
      );
    }
    throw error;
  }

  return upsertPortal(userId, {
    name: resolvedName || resolvedSlug || rawUrl,
    url: normalizedUrl || rawName,
    scraper: resolvedScraper,
    slug: resolvedSlug,
  });
}

async function handleCreatePortals(
  userId: string,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  assertSameOrigin(req);
  const body = await readJsonBody(req);
  if (Array.isArray(body.entries)) {
    const saved = [];
    const errors = [];
    for (const item of body.entries) {
      if (!item || typeof item !== 'object') continue;
      try {
        saved.push(
          await resolvePortalEntry(userId, item as Record<string, unknown>)
        );
      } catch (error) {
        const label =
          typeof (item as Record<string, unknown>).url === 'string'
            ? String((item as Record<string, unknown>).url)
            : 'entry';
        errors.push({
          entry: label,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    if (saved.length > 0 && watcher.getState(userId).config.enabled) {
      void watcher.syncUserPortals(userId);
    }
    sendJson(res, saved.length ? 201 : 400, { saved, errors });
    return;
  }

  const portal = await resolvePortalEntry(userId, body);
  if (watcher.getState(userId).config.enabled) {
    void watcher.syncPortalById(userId, portal.id);
  }
  sendJson(res, 201, { portal });
}

async function handleDeletePortal(
  userId: string,
  req: IncomingMessage,
  url: URL,
  res: ServerResponse
): Promise<void> {
  assertSameOrigin(req);
  const id = url.searchParams.get('id')?.trim() ?? '';
  if (!id) throw new InputError('Portal id is required.');
  const removed = removePortal(userId, id);
  if (!removed) {
    sendJson(res, 404, { error: 'Portal not found.' });
    return;
  }
  await watcher.removePortalSnapshot(userId, id);
  sendJson(res, 200, { ok: true, id });
}

function handleWatchEvents(userId: string, res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  const writeEvent = (event: string, data: unknown) => {
    if (res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  writeEvent('state', watcher.getState(userId));
  const unsubscribe = watcher.subscribe(userId, (ev) => {
    writeEvent(ev.event, ev.data);
  });
  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(': ping\n\n');
  }, 25_000);

  res.on('close', () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
}

async function handleUpdateWatchConfig(
  userId: string,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  assertSameOrigin(req);
  const body = await readJsonBody(req);
  const state = await watcher.updateConfig(userId, {
    ...(typeof body.enabled === 'boolean' ? { enabled: body.enabled } : {}),
    ...(typeof body.intervalMinutes === 'number'
      ? { intervalMinutes: body.intervalMinutes }
      : {}),
    ...(body.region === 'india' || body.region === 'all'
      ? { region: body.region }
      : {}),
    ...(body.role === 'tech' || body.role === 'all' ? { role: body.role } : {}),
    ...(body.exp === '0-5' || body.exp === '0-2' || body.exp === 'all'
      ? { exp: body.exp }
      : {}),
    ...(typeof body.syncNow === 'boolean' ? { syncNow: body.syncNow } : {}),
  });
  sendJson(res, 200, { state });
}

async function handleTriggerWatchSync(
  userId: string,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  assertSameOrigin(req);
  const body = await readJsonBody(req);
  const portalId =
    typeof body.portalId === 'string' ? body.portalId.trim() : '';
  if (portalId) {
    void watcher.syncPortalById(userId, portalId);
  } else {
    void watcher.syncUserPortals(userId);
  }
  sendJson(res, 202, { ok: true, state: watcher.getState(userId) });
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const method = req.method ?? 'GET';
  const url = new URL(
    req.url ?? '/',
    `http://${req.headers.host ?? `${HOST}:${DEFAULT_PORT}`}`
  );

  try {
    if (url.pathname === '/api/health' && method === 'GET') {
      sendJson(res, 200, { ok: true, scrapers: scraperNames });
      return;
    }

    if (url.pathname === '/api/auth/signup' && method === 'POST') {
      await handleSignup(req, res);
      return;
    }
    if (url.pathname === '/api/auth/login' && method === 'POST') {
      await handleLogin(req, res);
      return;
    }
    if (url.pathname === '/api/auth/logout' && method === 'POST') {
      handleLogout(req, res);
      return;
    }
    if (url.pathname === '/api/auth/me' && method === 'GET') {
      const user = requireUser(req, res);
      if (!user) return;
      sendJson(res, 200, { user });
      return;
    }

    if (url.pathname === '/api/watch/state' && method === 'GET') {
      const user = requireUser(req, res);
      if (!user) return;
      sendJson(res, 200, watcher.getState(user.id));
      return;
    }
    if (url.pathname === '/api/watch/events' && method === 'GET') {
      const user = requireUser(req, res);
      if (!user) return;
      handleWatchEvents(user.id, res);
      return;
    }
    if (url.pathname === '/api/watch/config' && method === 'POST') {
      const user = requireUser(req, res);
      if (!user) return;
      await handleUpdateWatchConfig(user.id, req, res);
      return;
    }
    if (url.pathname === '/api/watch/sync' && method === 'POST') {
      const user = requireUser(req, res);
      if (!user) return;
      await handleTriggerWatchSync(user.id, req, res);
      return;
    }
    if (url.pathname === '/api/watch/changes' && method === 'DELETE') {
      assertSameOrigin(req);
      const user = requireUser(req, res);
      if (!user) return;
      const state = await watcher.clearChanges(user.id);
      sendJson(res, 200, { state });
      return;
    }

    if (url.pathname === '/api/portals') {
      const user = requireUser(req, res);
      if (!user) return;
      if (method === 'GET') {
        handleGetPortals(user.id, res);
        return;
      }
      if (method === 'POST') {
        await handleCreatePortals(user.id, req, res);
        return;
      }
      if (method === 'DELETE') {
        await handleDeletePortal(user.id, req, url, res);
        return;
      }
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    if (url.pathname === '/api/bookmarks') {
      const user = requireUser(req, res);
      if (!user) return;
      if (method === 'GET') {
        sendJson(res, 200, { bookmarks: loadBookmarks(user.id) });
        return;
      }
      if (method === 'POST') {
        assertSameOrigin(req);
        const body = await readJsonBody(req);
        const key = typeof body.key === 'string' ? body.key.trim() : '';
        if (!key) throw new InputError('Bookmark key is required.');
        const bookmarks = setBookmarkState(user.id, key, {
          ...(typeof body.saved === 'boolean' ? { saved: body.saved } : {}),
          ...(typeof body.applied === 'boolean'
            ? { applied: body.applied }
            : {}),
        });
        sendJson(res, 200, { bookmarks });
        return;
      }
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    if (method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    if (url.pathname === '/api/jobs/stream') {
      const user = requireUser(req, res);
      if (!user) return;
      await handleApiJobsStream(user.id, url, res);
      return;
    }
    if (url.pathname === '/api/job') {
      const user = requireUser(req, res);
      if (!user) return;
      await handleApiJob(url, res);
      return;
    }
    await serveStatic(url.pathname, res);
  } catch (error) {
    handleApiError(res, error);
  }
}

export async function startServer(port = DEFAULT_PORT, host = HOST) {
  await watcher.init();
  const server = createServer((req, res) => {
    void handleRequest(req, res);
  });
  server.on('close', () => {
    watcher.stop();
  });
  return new Promise<ReturnType<typeof createServer>>(
    (resolvePromise, reject) => {
      server.once('error', reject);
      server.listen(port, host, () => {
        resolvePromise(server);
      });
    }
  );
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const server = await startServer(DEFAULT_PORT, HOST);
  const address = server.address();
  const actualPort =
    address && typeof address === 'object' ? address.port : DEFAULT_PORT;
  console.log(`Career Radar running at http://${HOST}:${actualPort}`);
}
