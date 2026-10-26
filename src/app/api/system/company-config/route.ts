import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { can, isSuperAdmin } from '@/lib/rbac';
import { getCompanyConfig, updateCompanyConfig } from '@/lib/company-config';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getCompanyConfig();
    return NextResponse.json({ config });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal mengambil konfigurasi perusahaan' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'system:settings') && !isSuperAdmin(user)) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda membutuhkan izin system:settings untuk mengubah konfigurasi perusahaan' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      companyName,
      systemName,
      tagline,
      headerSubtext,
      copyrightText,
      officeLocation,
      websiteUrl,
      logoUrl,
    } = body;

    if (companyName !== undefined && !companyName.trim()) {
      return NextResponse.json(
        { error: 'Nama resmi perusahaan tidak boleh kosong' },
        { status: 400 }
      );
    }

    let finalLogoUrl = logoUrl;
    if (typeof logoUrl === 'string' && logoUrl.startsWith('data:image/')) {
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const ext = logoUrl.includes('jpeg') || logoUrl.includes('jpg') ? '.jpg' : '.png';
        const base64Data = logoUrl.split(',')[1];
        if (base64Data) {
          const filePath = path.join(uploadsDir, `company-logo${ext}`);
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
          finalLogoUrl = `/uploads/company-logo${ext}?t=${Date.now()}`;
        }
      } catch (err) {
        console.warn('Failed to save base64 logo to disk:', err);
      }
    }

    const updated = await updateCompanyConfig(
      {
        companyName,
        systemName,
        tagline,
        headerSubtext,
        copyrightText,
        officeLocation,
        websiteUrl,
        logoUrl: finalLogoUrl,
      },
      user.id
    );

    await logAudit({
      actor: user,
      action: 'system.company_config_updated',
      resource: { type: 'system_setting', name: 'company_config' },
      status: 'SUCCESS',
      metadata: {
        updatedFields: Object.keys(body),
        companyName: updated.companyName,
        systemName: updated.systemName,
      },
    });

    return NextResponse.json({
      message: 'Konfigurasi identitas perusahaan berhasil diperbarui',
      config: updated,
    });
  } catch (error: any) {
    console.error('Error updating company config:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memperbarui konfigurasi perusahaan' },
      { status: 500 }
    );
  }
}
