import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { Role } from '@/models/Role';
import { getSession, hashPassword } from '@/lib/auth';
import { can, isSuperAdmin } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'user:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const users = await User.find()
      .populate('roleIds')
      .populate('departmentId')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'user:create')) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda membutuhkan izin user:create' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { fullName, username, email, password, roleIds, departmentId } = body;

    if (!fullName || !username || !email || !password || !roleIds || roleIds.length === 0) {
      return NextResponse.json(
        { error: 'Nama lengkap, username, email, password, dan minimal 1 role wajib diisi.' },
        { status: 400 }
      );
    }

    // Safeguard: only Super Admin can create accounts with SUPER_ADMIN role
    const superAdminRole = await Role.findOne({ code: 'SUPER_ADMIN' });
    if (superAdminRole && roleIds.includes(superAdminRole._id.toString()) && !isSuperAdmin(user)) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya Super Administrator yang berhak menetapkan peran Super Admin.' },
        { status: 403 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    // Check duplicate
    const existing = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Username atau email sudah digunakan oleh akun lain.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      fullName: fullName.trim(),
      passwordHash,
      roleIds,
      departmentId: departmentId || undefined,
      isActive: true,
      security: {
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    await logAudit({
      actor: user,
      action: 'user.create',
      resource: { type: 'user', id: newUser._id.toString(), name: newUser.fullName },
      status: 'SUCCESS',
      metadata: { username: normalizedUsername, email: normalizedEmail },
    });

    const populated = await User.findById(newUser._id)
      .populate('roleIds')
      .populate('departmentId')
      .lean();

    return NextResponse.json({ success: true, user: populated }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
