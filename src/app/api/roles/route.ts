import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Role } from '@/models/Role';
import { getSession } from '@/lib/auth';
import { can, isSuperAdmin } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const roles = await Role.find().sort({ isSystem: -1, createdAt: 1 }).lean();
    return NextResponse.json(roles);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'role:manage') && !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Akses ditolak: Dibutuhkan izin role:manage' }, { status: 403 });
    }

    const body = await req.json();
    const { code, name, description, dataScope = 'ALL', permissions = [] } = body;

    if (!code?.trim() || !name?.trim()) {
      return NextResponse.json(
        { error: 'Kode peran dan Nama peran wajib diisi' },
        { status: 400 }
      );
    }

    await connectDB();

    const existingRole = await Role.findOne({
      code: code.trim().toUpperCase(),
    });
    if (existingRole) {
      return NextResponse.json(
        { error: `Peran dengan kode "${code.toUpperCase()}" sudah terdaftar` },
        { status: 400 }
      );
    }

    const newRole = await Role.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description?.trim(),
      dataScope,
      permissions,
      isSystem: false,
    });

    await logAudit({
      actor: user,
      action: 'role.create',
      resource: {
        type: 'role',
        id: newRole._id.toString(),
        name: newRole.name,
      },
      metadata: {
        code: newRole.code,
        permissionsCount: permissions.length,
      },
    });

    return NextResponse.json(newRole, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
