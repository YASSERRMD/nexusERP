/**
 * Authentication & Authorization Module for NexusERP
 */

import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_DURATION = 24 * 60 * 60;

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

export interface UserSession {
  id: string;
  orgId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

export async function createSession(userId: string, orgId: string, ipAddress?: string, userAgent?: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

  await db.session.create({
    data: { userId, orgId, token, expiresAt, ipAddress, userAgent },
  });

  return token;
}

export async function validateSession(token: string): Promise<UserSession | null> {
  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  const roles = session.user.roles.map(ur => ur.role.code);
  const permissions = session.user.roles.flatMap(ur =>
    ur.role.permissions.map(rp => `${rp.permission.module}:${rp.permission.action}:${rp.permission.resource}`)
  );

  return {
    id: session.user.id,
    orgId: session.user.orgId,
    email: session.user.email,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    roles,
    permissions: [...new Set(permissions)],
  };
}

export async function invalidateSession(token: string): Promise<void> {
  await db.session.delete({ where: { token } }).catch(() => {});
}

export async function getCurrentUser(request: any): Promise<UserSession | null> {
  const token = request.cookies.get('session_token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) return null;
  return validateSession(token);
}

export async function requireAuth(request: any): Promise<{ user: UserSession } | { error: string; status: number }> {
  const user = await getCurrentUser(request);
  if (!user) return { error: 'Unauthorized', status: 401 };
  return { user };
}

export function hasPermission(user: UserSession, module: string, action: string, resource: string): boolean {
  if (user.roles.includes('SUPER_ADMIN')) return true;
  return user.permissions.includes(`${module}:${action}:${resource}`);
}

export function rateLimit(key: string, maxRequests: number = 100, windowMs: number = 60000) {
  const store = (global as any).rateLimitStore || new Map<string, { count: number; resetAt: number }>();
  (global as any).rateLimitStore = store;

  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (record.count >= maxRequests) {
    return { success: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { success: true, remaining: maxRequests - record.count, resetAt: record.resetAt };
}

export async function login(
  email: string,
  password: string,
  orgSlug?: string
): Promise<{ success: true; token: string; user: UserSession } | { success: false; error: string }> {
  const user = await db.user.findFirst({
    where: {
      email,
      isActive: true,
      ...(orgSlug && { organization: { slug: orgSlug } }),
    },
    include: {
      organization: true,
      roles: {
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      },
    },
  });

  if (!user) return { success: false, error: 'Invalid credentials' };
  if (!verifyPassword(password, user.passwordHash)) return { success: false, error: 'Invalid credentials' };

  const token = await createSession(user.id, user.orgId);

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await setSessionCookie(token);

  const roles = user.roles.map(ur => ur.role.code);
  const permissions = user.roles.flatMap(ur =>
    ur.role.permissions.map(rp => `${rp.permission.module}:${rp.permission.action}:${rp.permission.resource}`)
  );

  return {
    success: true,
    token,
    user: {
      id: user.id,
      orgId: user.orgId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions: [...new Set(permissions)],
    },
  };
}

export async function logout(token: string): Promise<void> {
  await invalidateSession(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session_token');
}
