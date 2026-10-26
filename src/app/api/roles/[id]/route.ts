import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Role } from '@/models/Role';
import { User } from '@/models/User';
import { getSession } from '@/lib/auth';
import { can, isSuperAdmin } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'role:manage') && !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Akses ditolak: Dibutuhkan izin role:manage' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, dataScope, permissions } = body;

    await connectDB();

    const role = await Role.findById(id);
    if (!role) {
      return NextResponse.json({ error: 'Peran tidak ditemukan' }, { status: 404 });
    }

    // Guardrail: Super Admin role must retain *:*
    if (role.code === 'SUPER_ADMIN') {
      if (Array.isArray(permissions) && !permissions.includes('*:*')) {
        return NextResponse.json(
          { error: 'Izin wildcard (*:*) pada Super Administrator tidak boleh dicabut demi integritas sistem' },
          { status: 400 }
        );
      }
    }

    if (name) role.name = name.trim();
    if (description !== undefined) role.description = description.trim();
    if (dataScope) role.dataScope = dataScope;
    if (Array.isArray(permissions)) role.permissions = permissions;

    await role.save();

    await logAudit({
      actor: user,
      action: 'role.update',
      resource: {
        type: 'role',
        id: role._id.toString(),
        name: role.name,
      },
      metadata: {
        code: role.code,
        permissionsCount: role.permissions.length,
      },
    });

    return NextResponse.json(role);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'role:manage') && !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Akses ditolak: Dibutuhkan izin role:manage' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const role = await Role.findById(id);
    if (!role) {
      return NextResponse.json({ error: 'Peran tidak ditemukan' }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json(
        { error: `Peran bawaan sistem (${role.name}) dilindungi dan tidak dapat dihapus.` },
        { status: 400 }
      );
    }

    // Check if any user is currently assigned this role
    const usersCount = await User.countDocuments({ roleIds: role._id });
    if (usersCount > 0) {
      return NextResponse.json(
        {
          error: `Peran tidak dapat dihapus karena masih digunakan oleh ${usersCount} pengguna aktif. Harap ubah peran pengguna terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    await Role.findByIdAndDelete(id);

    await logAudit({
      actor: user,
      action: 'role.delete',
      resource: {
        type: 'role',
        id,
        name: role.name,
      },
      metadata: { code: role.code },
    });

    return NextResponse.json({ success: true, message: `Peran ${role.name} berhasil dihapus` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
