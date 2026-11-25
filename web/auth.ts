import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { type IncomingMessage } from 'node:http';
import { isIP } from 'node:net';
import { join } from 'node:path';
import { dataDir } from '../src/index.ts';
import {
  dbCreateSession,
  dbDeleteSession,
  dbFindSessionUser,
  dbPurgeExpiredSessions,
  type PublicUser,
} from './db.ts';

export const SESSION_COOKIE_NAME = 'cr_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const AUTH_WINDOW_MS = 10 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 25;

let cachedAuthSecret: string | null = null;
const authAttemptsByIp = new Map<string, number[]>();

function getAuthSecret(): string {
  const envSecret = process.env.AUTH_SECRET?.trim();
  if (envSecret) return envSecret;
  if (cachedAuthSecret) return cachedAuthSecret;

  const secretPath = join(dataDir, '.auth-secret');
  mkdirSync(dataDir, { recursive: true });
  if (existsSync(secretPath)) {
    const existing = readFileSync(secretPath, 'utf8').trim();
    if (existing.length >= 32) {
      cachedAuthSecret = existing;
      return existing;
    }
  }

  const generated = randomBytes(32).toString('hex');
  writeFileSync(secretPath, generated + '\n', { mode: 0o600 });
  cachedAuthSecret = generated;
  return generated;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hexHash] = parts;
  if (!salt || !hexHash) return false;
  try {
    const expected = Buffer.from(hexHash, 'hex');
    const actual = scryptSync(password, salt, 64);
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function signToken(rawToken: string): string {
  const sig = createHmac('sha256', getAuthSecret())
    .update(rawToken)
    .digest('base64url');
  return `${rawToken}.${sig}`;
}

function verifySignedToken(cookieValue: string): string | null {
  const dotIdx = cookieValue.indexOf('.');
  if (dotIdx <= 0) return null;
  const rawToken = cookieValue.slice(0, dotIdx);
  const sig = cookieValue.slice(dotIdx + 1);
  if (!rawToken || !sig) return null;

  const expectedSig = createHmac('sha256', getAuthSecret())
    .update(rawToken)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return rawToken;
}

export function parseCookies(req: IncomingMessage): Record<string, string> {
  const rawHeader = req.headers.cookie;
  if (!rawHeader) return {};
  const cookies: Record<string, string> = {};
  for (const part of rawHeader.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const name = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (name) {
      try {
        cookies[name] = decodeURIComponent(val);
      } catch {
        cookies[name] = val;
      }
    }
  }
  return cookies;
}

function isHttpsRequest(req: IncomingMessage): boolean {
  const proto = req.headers['x-forwarded-proto'];
  if (typeof proto === 'string' && proto.split(',')[0]?.trim() === 'https') {
    return true;
  }
  return Boolean((req.socket as { encrypted?: boolean }).encrypted);
}

export function issueSessionCookie(
  userId: string,
  req: IncomingMessage
): string {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
  const rawToken = randomBytes(32).toString('base64url');
  dbPurgeExpiredSessions(now.toISOString());
  dbCreateSession(hashToken(rawToken), userId, expiresAt, now.toISOString());

  const signed = signToken(rawToken);
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(signed)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (isHttpsRequest(req)) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function clearSessionCookie(req: IncomingMessage): string {
  const cookies = parseCookies(req);
  const tokenVal = cookies[SESSION_COOKIE_NAME];
  if (tokenVal) {
    const rawToken = verifySignedToken(tokenVal);
    if (rawToken) {
      dbDeleteSession(hashToken(rawToken));
    }
  }
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isHttpsRequest(req)) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function authenticateRequest(req: IncomingMessage): PublicUser | null {
  const cookies = parseCookies(req);
  const tokenVal = cookies[SESSION_COOKIE_NAME];
  if (!tokenVal) return null;
  const rawToken = verifySignedToken(tokenVal);
  if (!rawToken) return null;
  return dbFindSessionUser(hashToken(rawToken), new Date().toISOString());
}

export function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]!.trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

export function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (authAttemptsByIp.get(ip) ?? []).filter(
    (t) => now - t < AUTH_WINDOW_MS
  );
  if (recent.length >= AUTH_MAX_ATTEMPTS) {
    authAttemptsByIp.set(ip, recent);
    return false;
  }
  recent.push(now);
  authAttemptsByIp.set(ip, recent);
  return true;
}

export function isPrivateOrUnsafeHost(hostname: string): boolean {
  const host = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  const ipVersion = isIP(host);
  if (ipVersion === 4) {
    const octets = host.split('.').map(Number);
    if (octets.length !== 4) return true;
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
    return false;
  }

  if (ipVersion === 6) {
    if (host === '::1' || host === '::') return true;
    if (
      host.startsWith('fe80:') ||
      host.startsWith('fc') ||
      host.startsWith('fd')
    ) {
      return true;
    }
    return false;
  }

  return false;
}

export function assertSafeExternalUrl(rawUrl: string): void {
  const parsed = URL.parse(rawUrl);
  if (!parsed) {
    throw new TypeError('That does not look like a valid URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new TypeError('Only http:// and https:// URLs are allowed.');
  }
  if (isPrivateOrUnsafeHost(parsed.hostname)) {
    throw new TypeError('Local or private network URLs are not permitted.');
  }
}
