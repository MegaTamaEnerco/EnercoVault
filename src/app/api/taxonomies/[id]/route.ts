import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Taxonomy } from '@/models/Taxonomy';
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

    if (!can(user, 'taxonomy:manage') && !isSuperAdmin(user)) {
      return NextResponse.json(
        { error: 'Akses ditolak: Dibutuhkan izin taxonomy:manage' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { name, codePrefix, icon, colorTheme, customFieldsSchema, retentionConfig } = body;

    await connectDB();

    const tax = await Taxonomy.findById(id);
    if (!tax) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    if (name) tax.name = name.trim();
    if (codePrefix) tax.codePrefix = codePrefix.trim().toUpperCase();
    if (icon) tax.icon = icon;
    if (colorTheme) tax.colorTheme = colorTheme;
    if (Array.isArray(customFieldsSchema)) tax.customFieldsSchema = customFieldsSchema;
    if (retentionConfig) tax.retentionConfig = retentionConfig;

    await tax.save();

    await logAudit({
      actor: user,
      action: 'taxonomy.update',
      resource: {
        type: 'taxonomy',
        id: tax._id.toString(),
        name: tax.name,
      },
      metadata: {
        codePrefix: tax.codePrefix,
        customFieldsCount: tax.customFieldsSchema?.length,
      },
    });

    return NextResponse.json(tax);
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

    if (!can(user, 'taxonomy:manage') && !isSuperAdmin(user)) {
      return NextResponse.json(
        { error: 'Akses ditolak: Dibutuhkan izin taxonomy:manage' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await connectDB();

    const tax = await Taxonomy.findById(id);
    if (!tax) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    // Safety check: Are there documents using this taxonomy?
    const docsCount = await DocumentModel.countDocuments({
      taxonomyId: tax._id,
      isDeleted: false,
    });

    if (docsCount > 0) {
      return NextResponse.json(
        {
          error: `Kategori tidak dapat dihapus karena masih digunakan oleh ${docsCount} dokumen aktif. Silakan pindahkan dokumen terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    await Taxonomy.findByIdAndDelete(id);

    await logAudit({
      actor: user,
      action: 'taxonomy.delete',
      resource: {
        type: 'taxonomy',
        id,
        name: tax.name,
      },
      metadata: { codePrefix: tax.codePrefix },
    });

    return NextResponse.json({ success: true, message: `Kategori ${tax.name} berhasil dihapus` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
