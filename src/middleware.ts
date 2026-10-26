import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

import { JWT_SECRET, COOKIE_NAME } from '@/lib/auth-config';

// Map of route prefixes to required permissions
const ROUTE_PERMISSIONS: { prefix: string; perm: string }[] = [
  { prefix: '/settings/company', perm: 'system:settings' },
  { prefix: '/settings/roles', perm: 'role:manage' },
  { prefix: '/settings/users', perm: 'user:view' },
  { prefix: '/settings/taxonomies', perm: 'taxonomy:manage' },
  { prefix: '/settings/frameworks', perm: 'framework:manage' },
  { prefix: '/system', perm: 'system:settings' },
  { prefix: '/audit-logs', perm: 'audit_log:view' },
  { prefix: '/dcr/new', perm: 'dcr:create' },
  { prefix: '/dcr', perm: 'dcr:view' },
  { prefix: '/ims-matrix', perm: 'ims_matrix:view' },
  { prefix: '/catalog', perm: 'document:view' },
  { prefix: '/', perm: 'dashboard:view' },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/verify') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/seed') ||
    (pathname === '/api/system/company-config' && req.method === 'GET') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/forbidden') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Check token from cookie
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const permissions = (payload.permissions as string[]) || [];

    // Super Admin wildcard bypasses all route permission checks
    if (permissions.includes('*:*')) {
      return NextResponse.next();
    }

    // Check matching route permission
    for (const rule of ROUTE_PERMISSIONS) {
      if (rule.prefix === '/' ? pathname === '/' : pathname.startsWith(rule.prefix)) {
        const hasPerm =
          permissions.includes(rule.perm) ||
          permissions.includes(`${rule.perm.split(':')[0]}:*`);

        if (!hasPerm) {
          const forbiddenUrl = new URL('/forbidden', req.url);
          forbiddenUrl.searchParams.set('required', rule.perm);
          return NextResponse.redirect(forbiddenUrl);
        }
        break;
      }
    }

    return NextResponse.next();
  } catch (err) {
    console.error('Middleware JWT error:', err);
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
