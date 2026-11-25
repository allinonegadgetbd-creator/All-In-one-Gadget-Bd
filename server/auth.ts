import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';
import type { AdminCredential } from './types.ts';

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// Public client-safe Supabase defaults (no secret keys in code)
const DEFAULT_PUBLIC_SUPABASE_URL = 'https://nrwelgnjmkomdginctex.supabase.co';
const DEFAULT_PUBLIC_SUPABASE_KEY = 'sb_publishable_P_CQ5U1MtMt7_o2U26vw1w_ha2Mdk1J';

export function getPublicSupabaseConfig(): { url: string; key: string } {
  const url = (process.env.SUPABASE_URL || DEFAULT_PUBLIC_SUPABASE_URL).trim();
  const key = (
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    DEFAULT_PUBLIC_SUPABASE_KEY
  ).trim();
  return { url, key };
}

export function isSupabaseAuthEnabled(): boolean {
  const { url, key } = getPublicSupabaseConfig();
  return Boolean(url && key);
}

// In-memory store mapping admin session nonce -> Supabase user access JWT for RLS writes
const adminSupabaseJwtMap = new Map<string, string>();

export function getSessionSupabaseJwt(req: Request): string | undefined {
  const token = extractBearerToken(req);
  if (!token) return undefined;
  return adminSupabaseJwtMap.get(token);
}

export async function verifySupabaseUserLogin(
  email: string,
  password: string
): Promise<{ ok: boolean; email?: string; supabaseJwt?: string; error?: string }> {
  const { url, key } = getPublicSupabaseConfig();
  if (!url || !key) {
    return { ok: false, error: 'Supabase Auth is not configured.' };
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    return { ok: false, error: error?.message || 'Invalid email or password.' };
  }

  const allowedEmailsRaw = (process.env.ADMIN_EMAIL || '').trim();
  if (allowedEmailsRaw) {
    const allowed = allowedEmailsRaw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const userEmail = (data.user.email || '').toLowerCase();
    if (!allowed.includes(userEmail)) {
      return { ok: false, error: 'This account is not authorized for admin access.' };
    }
  }

  return {
    ok: true,
    email: data.user.email || email,
    supabaseJwt: data.session?.access_token,
  };
}

export function hashPasscode(passcode: string, existingSalt?: string): { salt: string; hash: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return { salt, hash: derived };
}

export function verifyPasscode(passcode: string, credential: AdminCredential | null): boolean {
  const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
  if (envPasscode.length > 0) {
    const a = Buffer.from(passcode);
    const b = Buffer.from(envPasscode);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
  if (!credential) return false;
  const { hash } = hashPasscode(passcode, credential.salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(credential.hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function needsFirstRunSetup(credential: AdminCredential | null): boolean {
  if (isSupabaseAuthEnabled()) return false;
  const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
  if (envPasscode.length > 0) return false;
  return credential === null;
}

export function createAdminToken(email?: string, supabaseJwt?: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'admin',
      email: email || 'admin',
      exp: Date.now() + TOKEN_TTL_MS,
      nonce: crypto.randomBytes(8).toString('hex'),
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const token = `${payload}.${sig}`;
  if (supabaseJwt) {
    adminSupabaseJwtMap.set(token, supabaseJwt);
  }
  return token;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    if (decoded.role !== 'admin') return false;
    if (!decoded.exp || Date.now() > decoded.exp) {
      adminSupabaseJwtMap.delete(token);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function extractBearerToken(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (typeof req.query.token === 'string') {
    return req.query.token.trim();
  }
  return '';
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Unauthorized. Please sign in to the Admin App.' });
    return;
  }
  next();
}
