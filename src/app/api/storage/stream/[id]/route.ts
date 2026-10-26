import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { getSession } from '@/lib/auth';
import { can, isSuperAdmin, documentScopeFilter } from '@/lib/rbac';
import { getFileBuffer, fileExists } from '@/lib/storage-engine';
import { stampControlledWatermark } from '@/lib/pdf-stamper';
import { isSmk3OrQhseDocument } from '@/lib/qhse-detector';
import { logAudit } from '@/lib/audit';

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

    if (!can(user, 'document:view')) {
      return NextResponse.json({ error: 'Akses ditolak: Anda membutuhkan izin document:view' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const scopeFilter = documentScopeFilter(user);
    const doc = await DocumentModel.findOne({ _id: id, ...scopeFilter }).lean();
    if (!doc || !doc.currentFile?.storagePath) {
      return NextResponse.json(
        { error: 'File dokumen tidak ditemukan atau di luar lingkup hak akses Anda' },
        { status: 404 }
      );
    }

    const storagePath = doc.currentFile.storagePath;
    if (!fileExists(storagePath)) {
      return NextResponse.json(
        { error: 'File fisik tidak ditemukan pada on-premise storage' },
        { status: 404 }
      );
    }

    let pdfBytes = await getFileBuffer(storagePath);

    // Check if user requested original (no watermark) or if user lacks download_original permission
    const requestedOriginal = req.nextUrl.searchParams.get('original') === 'true';
    const canDownloadOriginal = can(user, 'document:download_original') || isSuperAdmin(user);

    if (!requestedOriginal || !canDownloadOriginal) {
      // Stamp dynamic watermark (Fail Closed for Information Security)
      try {
        pdfBytes = await stampControlledWatermark(pdfBytes, {
          userName: user.fullName,
          userRole: user.roleCodes[0] || 'User',
          verificationToken: doc.currentFile.qrVerificationToken,
          docNumber: doc.docNumber,
          revision: doc.currentVersion,
          isQhse: isSmk3OrQhseDocument(doc as any),
        });
      } catch (err: any) {
        console.error('Failed to stamp watermark:', err);
        await logAudit({
          actor: user,
          action: 'document.watermark_failed',
          resource: { type: 'document', id, name: doc.docNumber },
          status: 'FAILED',
          reason: err.message,
        });
        return NextResponse.json(
          { error: 'Gagal membubuhkan watermark salinan terkendali pada dokumen ini. Distribusi file dibatalkan demi keamanan informasi.' },
          { status: 422 }
        );
      }
    }

    const downloadAsAttachment = req.nextUrl.searchParams.get('download') === 'true';
    const disposition = downloadAsAttachment ? 'attachment' : 'inline';

    await logAudit({
      actor: user,
      action: requestedOriginal && canDownloadOriginal ? 'document.download_original' : 'document.download_watermarked',
      resource: { type: 'document', id, name: doc.docNumber },
      status: 'SUCCESS',
      metadata: { docNumber: doc.docNumber, version: doc.currentVersion },
    });

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${doc.docNumber}.pdf"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch (error: any) {
    console.error('Streaming error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
