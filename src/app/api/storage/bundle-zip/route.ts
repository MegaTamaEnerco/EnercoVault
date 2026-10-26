import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { getSession } from '@/lib/auth';
import { can, isSuperAdmin, documentScopeFilter } from '@/lib/rbac';
import { getFileBuffer, fileExists } from '@/lib/storage-engine';
import { stampControlledWatermark } from '@/lib/pdf-stamper';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'bundle:export_zip') && !isSuperAdmin(user) && !can(user, 'document:download')) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda membutuhkan izin bundle:export_zip atau document:download' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { documentIds, bundleName = 'EnercoVault_Audit_Bundle' } = body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Pilih minimal 1 dokumen untuk membuat bundel ZIP' },
        { status: 400 }
      );
    }

    if (documentIds.length > 50) {
      return NextResponse.json(
        { error: 'Maksimal 50 dokumen per permintaan ekspor bundel ZIP demi performa dan stabilitas memori server.' },
        { status: 400 }
      );
    }

    await connectDB();

    const scopeFilter = documentScopeFilter(user);
    const docs = await DocumentModel.find({
      _id: { $in: documentIds },
      ...scopeFilter,
    })
      .populate('taxonomyId')
      .lean();

    if (docs.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada dokumen yang ditemukan atau seluruh dokumen berada di luar lingkup hak akses Anda' },
        { status: 404 }
      );
    }

    const zip = new JSZip();

    // 1. Generate Manifest Text File
    const manifestLines = [
      '========================================================================',
      'PT ENERCO PERSADA INDONESIA — INTEGRATED MANAGEMENT SYSTEM (IMS)',
      `VIRTUAL AUDIT / TENDER DOCUMENT BUNDLE: ${bundleName.toUpperCase()}`,
      `Generated At: ${new Date().toISOString()}`,
      `Downloaded By: ${user.fullName} (${user.roleCodes[0] || 'User'})`,
      '========================================================================',
      '',
      'DAFTAR INDUK DOKUMEN DALAM BUNDEL INI (INDEX MANIFEST):',
      '------------------------------------------------------------------------',
    ];

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      const categories = (doc as any).taxonomySnapshot?.name || (doc as any).taxonomyId?.name || 'Umum';
      const mappings = (doc.complianceMappings || [])
        .map((m: any) => `${m.frameworkCode}: ${(m.clauses || []).join(', ')}`)
        .join(' | ');

      manifestLines.push(
        `${String(i + 1).padStart(2, '0')}. Nomor: ${doc.docNumber}`,
        `    Judul: ${doc.title}`,
        `    Kategori: ${categories} | Revisi: Rev. ${String(doc.currentVersion || 1).padStart(2, '0')}`,
        `    Klasifikasi: ${doc.accessLevel} | Status: ${doc.status}`,
        `    Kepatuhan Standar: ${mappings || 'Belum dipetakan'}`,
        `    Token Verifikasi QR: ${doc.currentFile?.qrVerificationToken || 'N/A'}`,
        `    SHA-256 Checksum: ${doc.currentFile?.sha256Hash || 'N/A'}`,
        '------------------------------------------------------------------------'
      );

      // Add actual PDF file if physical file exists
      if (doc.currentFile?.storagePath && fileExists(doc.currentFile.storagePath)) {
        try {
          let pdfBuffer = await getFileBuffer(doc.currentFile.storagePath);
          // Stamp controlled copy watermark for user
          pdfBuffer = await stampControlledWatermark(pdfBuffer, {
            userName: user.fullName,
            userRole: user.roleCodes[0] || 'User',
            verificationToken: doc.currentFile.qrVerificationToken,
            docNumber: doc.docNumber,
            revision: doc.currentVersion,
          });

          const safeFileName = `${doc.docNumber}.pdf`;
          zip.file(safeFileName, pdfBuffer);
        } catch (err) {
          console.error(`Failed to process PDF for ${doc.docNumber}:`, err);
        }
      }
    }

    manifestLines.push(
      '',
      'CATATAN KEAMANAN & PENGENDALIAN DOKUMEN:',
      '- Seluruh salinan elektronik di dalam bundel ini dilindungi oleh stempel validasi terkendali.',
      '- Keabsahan setiap salinan fisik dapat diverifikasi secara publik via URL:',
      '  https://vault.enerco.co.id/verify/[TOKEN_QR]',
      '========================================================================'
    );

    zip.file('INDEX_MANIFEST.txt', manifestLines.join('\n'));

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    await logAudit({
      actor: user,
      action: 'bundle.export_zip',
      resource: { type: 'bundle', name: bundleName },
      status: 'SUCCESS',
      metadata: { totalDocs: docs.length, docNumbers: docs.map((d) => d.docNumber) },
    });

    const safeBundleFileName = `${bundleName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.zip`;

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeBundleFileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Bundle ZIP export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
