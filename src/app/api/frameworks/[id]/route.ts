import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ComplianceFramework } from '@/models/ComplianceFramework';
import { DocumentModel } from '@/models/Document';
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

    if (!can(user, 'framework:manage') && !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Akses ditolak: Dibutuhkan izin framework:manage' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, category, version, badgeColor, isActive } = body;

    await connectDB();

    const fw = await ComplianceFramework.findById(id);
    if (!fw) {
      return NextResponse.json({ error: 'Standar tidak ditemukan' }, { status: 404 });
    }

    if (name) fw.name = name.trim();
    if (category) fw.category = category;
    if (version) fw.version = version.trim();
    if (badgeColor) fw.badgeColor = badgeColor;
    if (typeof isActive === 'boolean') fw.isActive = isActive;

    await fw.save();

    await logAudit({
      actor: user,
      action: 'framework.update',
      resource: {
        type: 'framework',
        id: fw._id.toString(),
        name: fw.name,
      },
      metadata: { code: fw.code },
    });

    return NextResponse.json(fw);
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

    if (!can(user, 'framework:manage') && !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Akses ditolak: Dibutuhkan izin framework:manage' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const fw = await ComplianceFramework.findById(id);
    if (!fw) {
      return NextResponse.json({ error: 'Standar tidak ditemukan' }, { status: 404 });
    }

    // Safety check: Are there documents mapped to this framework code?
    const docsCount = await DocumentModel.countDocuments({
      'complianceMappings.frameworkCode': fw.code,
      isDeleted: false,
    });

    if (docsCount > 0) {
      return NextResponse.json(
        {
          error: `Standar tidak dapat dihapus karena masih menjadi acuan pemenuhan oleh ${docsCount} dokumen aktif.`,
        },
        { status: 400 }
      );
    }

    await ComplianceFramework.findByIdAndDelete(id);

    await logAudit({
      actor: user,
      action: 'framework.delete',
      resource: {
        type: 'framework',
        id,
        name: fw.name,
      },
      metadata: { code: fw.code },
    });

    return NextResponse.json({ success: true, message: `Standar ${fw.code} berhasil dihapus` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
