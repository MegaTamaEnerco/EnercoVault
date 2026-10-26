import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SessionUser, can, ForbiddenError } from './rbac';
import { Permission } from './permissions';

import { JWT_SECRET, COOKIE_NAME } from './auth-config';
export { COOKIE_NAME };

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    roleCodes: user.roleCodes,
    permissions: user.permissions,
    dataScope: user.dataScope,
    departmentId: user.departmentId,
    impersonatedBy: user.impersonatedBy,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      username: payload.username as string,
      email: payload.email as string,
      fullName: payload.fullName as string,
      roleCodes: (payload.roleCodes as string[]) || [],
      permissions: (payload.permissions as Permission[]) || [],
      dataScope: (payload.dataScope as SessionUser['dataScope']) || 'ALL',
      departmentId: payload.departmentId as string | undefined,
      impersonatedBy: payload.impersonatedBy as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Get current authenticated session from server cookies
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Require valid session or redirect to /login
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * Require permission guard for Server Actions and Server Components
 */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireAuth();
  if (!can(user, permission)) {
    throw new ForbiddenError(permission);
  }
  return user;
}
