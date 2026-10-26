import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { getSession } from '@/lib/auth';
import { can, isSuperAdmin, documentScopeFilter } from '@/lib/rbac';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'document:view') && !isSuperAdmin(user)) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda membutuhkan izin document:view' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await connectDB();

    const scopeFilter = documentScopeFilter(user);
    const doc = await DocumentModel.findOne({ _id: id, ...scopeFilter }).lean();

    if (!doc) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan atau di luar lingkup hak akses Anda' },
        { status: 404 }
      );
    }

    const token = doc.currentFile?.qrVerificationToken || `EV-${doc.docNumber}`;
    const baseUrl = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify/${token}`;

    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') || 'png';
    const sizeParam = parseInt(searchParams.get('size') || '300', 10);
    const size = Math.min(Math.max(sizeParam, 120), 1000);
    const download = searchParams.get('download') === 'true';

    if (format === 'svg') {
      const svg = await QRCode.toString(verifyUrl, {
        type: 'svg',
        width: size,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });

      const disposition = download
        ? `attachment; filename="QR-${doc.docNumber}.svg"`
        : 'inline';

      return new NextResponse(svg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': disposition,
          'Cache-Control': 'private, max-age=86400',
        },
      });
    }

    // Default PNG format
    const pngBuffer = await QRCode.toBuffer(verifyUrl, {
      type: 'png',
      width: size,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    const disposition = download
      ? `attachment; filename="QR-${doc.docNumber}.png"`
      : 'inline';

    return new NextResponse(pngBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': disposition,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (error: any) {
    console.error('QR code generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghasilkan QR code' },
      { status: 500 }
    );
  }
}
