import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
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
  dbImportLegacySingleUserFiles,
  dbPurgeExpiredSessions,
  dbUpsertGoogleUser,
  type PublicUser,
} from './db.ts';

export const SESSION_COOKIE_NAME = 'cr_session';
export const OAUTH_STATE_COOKIE_NAME = 'cr_oauth_state';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

let cachedAuthSecret: string | null = null;

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

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function signValue(payload: string): string {
  const sig = createHmac('sha256', getAuthSecret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifySignedValue(cookieValue: string): string | null {
  const dotIdx = cookieValue.lastIndexOf('.');
  if (dotIdx <= 0) return null;
  const payload = cookieValue.slice(0, dotIdx);
  const sig = cookieValue.slice(dotIdx + 1);
  if (!payload || !sig) return null;

  const expectedSig = createHmac('sha256', getAuthSecret())
    .update(payload)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return payload;
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

function formatCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
  req: IncomingMessage
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isHttpsRequest(req)) {
    parts.push('Secure');
  }
  return parts.join('; ');
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

  return formatCookie(
    SESSION_COOKIE_NAME,
    signValue(rawToken),
    Math.floor(SESSION_TTL_MS / 1000),
    req
  );
}

export function clearSessionCookie(req: IncomingMessage): string {
  const cookies = parseCookies(req);
  const tokenVal = cookies[SESSION_COOKIE_NAME];
  if (tokenVal) {
    const rawToken = verifySignedValue(tokenVal);
    if (rawToken) {
      dbDeleteSession(hashToken(rawToken));
    }
  }
  return formatCookie(SESSION_COOKIE_NAME, '', 0, req);
}

export function authenticateRequest(req: IncomingMessage): PublicUser | null {
  const cookies = parseCookies(req);
  const tokenVal = cookies[SESSION_COOKIE_NAME];
  if (!tokenVal) return null;
  const rawToken = verifySignedValue(tokenVal);
  if (!rawToken) return null;
  return dbFindSessionUser(hashToken(rawToken), new Date().toISOString());
}

export function resolveOAuthRedirectUri(req: IncomingMessage): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const publicOrigin = process.env.PUBLIC_ORIGIN?.trim().replace(/\/+$/, '');
  if (publicOrigin) return `${publicOrigin}/api/auth/google/callback`;

  const proto = isHttpsRequest(req) ? 'https' : 'http';
  const host = req.headers.host || '127.0.0.1:4321';
  return `${proto}://${host}/api/auth/google/callback`;
}

export function createGoogleAuthStart(req: IncomingMessage): {
  authUrl: string;
  stateCookie: string;
} {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
    );
  }

  const state = randomBytes(24).toString('base64url');
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  const redirectUri = resolveOAuthRedirectUri(req);

  const encodedStatePayload = Buffer.from(
    JSON.stringify({
      state,
      codeVerifier,
      redirectUri,
      exp: Date.now() + OAUTH_STATE_TTL_MS,
    }),
    'utf8'
  ).toString('base64url');

  const stateCookie = formatCookie(
    OAUTH_STATE_COOKIE_NAME,
    signValue(encodedStatePayload),
    Math.floor(OAUTH_STATE_TTL_MS / 1000),
    req
  );

  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });

  return {
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`,
    stateCookie,
  };
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export async function defaultGoogleExchange(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<GoogleProfile> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: params.codeVerifier,
    }),
  });
  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(
      tokenData.error_description ||
        tokenData.error ||
        'Google token exchange failed.'
    );
  }

  const profileRes = await fetch(
    'https://openidconnect.googleapis.com/v1/userinfo',
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }
  );
  const profile = (await profileRes.json()) as Partial<GoogleProfile>;
  if (!profileRes.ok || !profile.sub || !profile.email) {
    throw new Error('Could not read verified Google profile.');
  }
  return profile as GoogleProfile;
}

export async function completeGoogleAuthCallback(
  req: IncomingMessage,
  url: URL,
  exchangeFn: typeof defaultGoogleExchange = defaultGoogleExchange
): Promise<{
  user: PublicUser;
  sessionCookie: string;
  clearStateCookie: string;
}> {
  const clearStateCookie = formatCookie(OAUTH_STATE_COOKIE_NAME, '', 0, req);
  const oauthError = url.searchParams.get('error');
  if (oauthError) {
    throw new Error(`Google sign-in cancelled (${oauthError}).`);
  }

  const code = url.searchParams.get('code')?.trim();
  const stateParam = url.searchParams.get('state')?.trim();
  if (!code || !stateParam) {
    throw new Error('Missing authorization code or state from Google.');
  }

  const cookies = parseCookies(req);
  const signedState = cookies[OAUTH_STATE_COOKIE_NAME];
  if (!signedState) {
    throw new Error('OAuth state cookie missing or expired. Please try again.');
  }
  const encodedPayload = verifySignedValue(signedState);
  if (!encodedPayload) {
    throw new Error('Invalid OAuth state signature.');
  }

  const parsed = JSON.parse(
    Buffer.from(encodedPayload, 'base64url').toString('utf8')
  ) as {
    state: string;
    codeVerifier: string;
    redirectUri: string;
    exp: number;
  };

  if (Date.now() > parsed.exp) {
    throw new Error('Google sign-in session expired. Please try again.');
  }
  const a = Buffer.from(stateParam);
  const b = Buffer.from(parsed.state);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('OAuth state mismatch.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials are not configured.');
  }

  const profile = await exchangeFn({
    code,
    codeVerifier: parsed.codeVerifier,
    redirectUri: parsed.redirectUri,
    clientId,
    clientSecret,
  });

  if (profile.email_verified === false) {
    throw new Error('Google account email is not verified.');
  }

  const { user, isNewFirstUser } = dbUpsertGoogleUser({
    googleSub: profile.sub,
    email: profile.email,
    name: profile.name || profile.email.split('@')[0] || 'User',
    avatarUrl: profile.picture ?? null,
  });

  if (isNewFirstUser) {
    dbImportLegacySingleUserFiles(user.id);
  }

  const sessionCookie = issueSessionCookie(user.id, req);
  return { user, sessionCookie, clearStateCookie };
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
