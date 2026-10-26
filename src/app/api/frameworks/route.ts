import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ComplianceFramework } from '@/models/ComplianceFramework';
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
    const frameworks = await ComplianceFramework.find().sort({ code: 1 }).lean();
    return NextResponse.json(frameworks);
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

    if (!can(user, 'framework:manage') && !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Akses ditolak: Dibutuhkan izin framework:manage' }, { status: 403 });
    }

    const body = await req.json();
    const { code, name, category, version = '2015', badgeColor = '#2563eb' } = body;

    if (!code?.trim() || !name?.trim() || !category) {
      return NextResponse.json(
        { error: 'Kode standar, Nama lengkap, dan Kategori kepatuhan wajib diisi' },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await ComplianceFramework.findOne({
      code: code.trim().toUpperCase(),
    });
    if (existing) {
      return NextResponse.json(
        { error: `Standar kepatuhan dengan kode "${code.toUpperCase()}" sudah terdaftar` },
        { status: 400 }
      );
    }

    const newFw = await ComplianceFramework.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      category,
      version: version.trim(),
      badgeColor,
      isActive: true,
      clauses: [],
    });

    await logAudit({
      actor: user,
      action: 'framework.create',
      resource: {
        type: 'framework',
        id: newFw._id.toString(),
        name: newFw.name,
      },
      metadata: { code: newFw.code, category },
    });

    return NextResponse.json(newFw, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
