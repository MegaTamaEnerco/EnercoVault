import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { Role } from '@/models/Role';
import { verifyPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { Permission, DataScope } from '@/lib/permissions';

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Email / username dan password wajib diisi' },
        { status: 400 }
      );
    }

    await connectDB();

    const normalizedId = String(identifier).trim().toLowerCase();

    // Query user and explicitly select passwordHash and security
    const user = await User.findOne({
      $or: [{ email: normalizedId }, { username: normalizedId }],
    }).select('+passwordHash');

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    if (!user) {
      await logAudit({
        action: 'auth.login_failed',
        resource: { type: 'user', name: identifier },
        status: 'DENIED',
        reason: 'User tidak ditemukan',
        ip,
        userAgent,
      });
      return NextResponse.json(
        { error: 'Kredensial login tidak valid' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      await logAudit({
        actor: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          roleCodes: [],
          permissions: [],
          dataScope: 'ALL',
        },
        action: 'auth.login_blocked',
        resource: { type: 'user', id: user._id.toString() },
        status: 'DENIED',
        reason: 'Akun dinonaktifkan',
        ip,
        userAgent,
      });
      return NextResponse.json(
        { error: 'Akun Anda dinonaktifkan. Silakan hubungi Administrator.' },
        { status: 403 }
      );
    }

    // Check account lockout (5 attempts -> 15 min lock)
    if (user.security?.lockedUntil && new Date(user.security.lockedUntil) > new Date()) {
      const waitMinutes = Math.ceil(
        (new Date(user.security.lockedUntil).getTime() - Date.now()) / 60000
      );
      return NextResponse.json(
        {
          error: `Akun terkunci sementara karena percobaan gagal berulang. Silakan coba ${waitMinutes} menit lagi atau hubungi Super Admin.`,
        },
        { status: 423 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);

    if (!isMatch) {
      const failedAttempts = (user.security?.failedAttempts || 0) + 1;
      let lockedUntil: Date | null = null;

      if (failedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // lock 15 mins
      }

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'security.failedAttempts': failedAttempts,
            'security.lockedUntil': lockedUntil,
          },
        }
      );

      await logAudit({
        actor: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          roleCodes: [],
          permissions: [],
          dataScope: 'ALL',
        },
        action: 'auth.login_failed',
        resource: { type: 'user', id: user._id.toString() },
        status: 'DENIED',
        reason: `Password salah (percobaan ke-${failedAttempts})`,
        ip,
        userAgent,
      });

      return NextResponse.json(
        {
          error:
            failedAttempts >= 5
              ? 'Akun telah dikunci selama 15 menit karena 5 kali percobaan gagal.'
              : `Password salah. Percobaan gagal: ${failedAttempts}/5`,
        },
        { status: 401 }
      );
    }

    // Reset failed attempts & record lastLoginAt
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          'security.failedAttempts': 0,
          'security.lockedUntil': null,
          'security.lastLoginAt': new Date(),
        },
      }
    );

    // Fetch user roles & calculate aggregated permissions & dataScope
    const roles = await Role.find({ _id: { $in: user.roleIds } }).lean();

    const roleCodes = roles.map((r) => r.code);
    const permissionsSet = new Set<Permission>();
    let effectiveDataScope: DataScope = 'OWN';

    for (const r of roles) {
      r.permissions.forEach((p) => permissionsSet.add(p));
      if (r.dataScope === 'ALL') {
        effectiveDataScope = 'ALL';
      } else if (r.dataScope === 'DEPARTMENT' && effectiveDataScope !== 'ALL') {
        effectiveDataScope = 'DEPARTMENT';
      }
    }

    const sessionUser = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      roleCodes,
      permissions: Array.from(permissionsSet),
      dataScope: effectiveDataScope,
      departmentId: user.departmentId?.toString(),
    };

    const token = await createSessionToken(sessionUser);

    await logAudit({
      actor: sessionUser,
      action: 'auth.login_success',
      resource: { type: 'user', id: user._id.toString(), name: user.fullName },
      status: 'SUCCESS',
      ip,
      userAgent,
    });

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60, // 8 hours
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan sistem saat proses autentikasi' },
      { status: 500 }
    );
  }
}
