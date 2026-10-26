import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Taxonomy } from '@/models/Taxonomy';
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
    const taxonomies = await Taxonomy.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    return NextResponse.json(taxonomies);
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

    if (!can(user, 'taxonomy:manage') && !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Akses ditolak: Dibutuhkan izin taxonomy:manage' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      codePrefix,
      slug,
      icon = 'FileText',
      colorTheme = '#3b82f6',
      customFieldsSchema = [],
      retentionConfig,
      accessPolicy,
    } = body;

    if (!name?.trim() || !codePrefix?.trim()) {
      return NextResponse.json(
        { error: 'Nama kategori dan Prefix kode wajib diisi' },
        { status: 400 }
      );
    }

    const cleanSlug =
      (slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) +
      (Date.now() % 1000);

    await connectDB();

    const existingPrefix = await Taxonomy.findOne({
      codePrefix: codePrefix.trim().toUpperCase(),
    });
    if (existingPrefix) {
      return NextResponse.json(
        { error: `Prefix kode "${codePrefix.toUpperCase()}" sudah digunakan oleh kategori lain` },
        { status: 400 }
      );
    }

    const newTax = await Taxonomy.create({
      name: name.trim(),
      slug: cleanSlug,
      codePrefix: codePrefix.trim().toUpperCase(),
      icon,
      colorTheme,
      customFieldsSchema,
      retentionConfig: retentionConfig || {
        hasExpiry: false,
        defaultReviewMonths: 12,
        alertDaysBeforeExpiry: [60, 30, 14],
        isMandatoryForCompliance: false,
      },
      accessPolicy: accessPolicy || {
        defaultAccessLevel: 'INTERNAL',
      },
      sortOrder: (await Taxonomy.countDocuments()) + 1,
    });

    await logAudit({
      actor: user,
      action: 'taxonomy.create',
      resource: {
        type: 'taxonomy',
        id: newTax._id.toString(),
        name: newTax.name,
      },
      metadata: {
        codePrefix: newTax.codePrefix,
        customFieldsCount: customFieldsSchema.length,
      },
    });

    return NextResponse.json(newTax, { status: 201 });
  } catch (err: any) {
    console.error('Error creating taxonomy:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
