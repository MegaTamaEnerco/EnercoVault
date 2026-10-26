import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSession } from '@/lib/auth';
import { can, isSuperAdmin } from '@/lib/rbac';
import { updateCompanyConfig, getCompanyConfig } from '@/lib/company-config';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'system:settings') && !isSuperAdmin(user)) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda membutuhkan izin system:settings untuk mengunggah logo perusahaan' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Tidak ada file logo yang diunggah' }, { status: 400 });
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file melebihi batas 5 MB' }, { status: 400 });
    }

    // Determine extension
    const mimeType = file.type;
    let ext = '.png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
    else if (mimeType.includes('svg')) ext = '.svg';
    else if (mimeType.includes('webp')) ext = '.webp';

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `company-logo${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filePath, buffer);

    const logoUrl = `/uploads/${fileName}?t=${Date.now()}`;

    // Update Company Config in DB
    const updated = await updateCompanyConfig({ logoUrl }, user.id);

    await logAudit({
      actor: user,
      action: 'system.company_logo_uploaded',
      resource: { type: 'system_setting', name: 'company_config' },
      status: 'SUCCESS',
      metadata: { fileName, fileSize: file.size, mimeType },
    });

    return NextResponse.json({
      success: true,
      logoUrl,
      config: updated,
      message: 'Logo resmi perusahaan berhasil diunggah dan disimpan',
    });
  } catch (error: any) {
    console.error('Logo upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal mengunggah logo' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'system:settings') && !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const updated = await updateCompanyConfig({ logoUrl: '' }, user.id);

    return NextResponse.json({
      success: true,
      config: updated,
      message: 'Logo perusahaan berhasil dihapus',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
