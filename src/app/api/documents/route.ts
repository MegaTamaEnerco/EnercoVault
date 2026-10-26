import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { Taxonomy } from '@/models/Taxonomy';
import { getSession } from '@/lib/auth';
import { can, documentScopeFilter, isSuperAdmin } from '@/lib/rbac';
import { saveFileToStorage } from '@/lib/storage-engine';
import { generateDocumentPdf } from '@/lib/pdf-stamper';
import { logAudit } from '@/lib/audit';
import { PDFDocument } from 'pdf-lib';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'document:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    const taxonomySlug = searchParams.get('taxonomy');
    const frameworkCode = searchParams.get('framework');

    const filter: Record<string, unknown> = documentScopeFilter(user);

    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { docNumber: { $regex: query, $options: 'i' } },
      ];
    }

    if (taxonomySlug && taxonomySlug !== 'all') {
      const tax = await Taxonomy.findOne({ slug: taxonomySlug });
      if (tax) {
        filter.taxonomyId = tax._id;
      }
    }

    if (frameworkCode && frameworkCode !== 'all') {
      filter['complianceMappings.frameworkCode'] = frameworkCode;
    }

    const docs = await DocumentModel.find(filter)
      .populate('taxonomyId')
      .populate('departmentId')
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ documents: docs });
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'document:create')) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda membutuhkan izin document:create' },
        { status: 403 }
      );
    }

    await connectDB();

    // Check if multipart form data (with file upload) or JSON
    const contentType = req.headers.get('content-type') || '';
    let docNumber = '';
    let title = '';
    let taxonomyId = '';
    let accessLevel: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED' | 'CONFIDENTIAL' = 'INTERNAL';
    let effectiveDateStr = '';
    let customAttributes: Record<string, unknown> = {};
    let complianceMappings: { frameworkCode: string; clauses: string[] }[] = [];
    let fileBuffer: Buffer | null = null;
    let fileName = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      docNumber = String(formData.get('docNumber') || '').trim().toUpperCase();
      title = String(formData.get('title') || '').trim();
      taxonomyId = String(formData.get('taxonomyId') || '').trim();
      accessLevel = (formData.get('accessLevel') as any) || 'INTERNAL';
      effectiveDateStr = String(formData.get('effectiveDate') || '');

      const customAttrJson = formData.get('customAttributes');
      if (customAttrJson) {
        try {
          customAttributes = JSON.parse(String(customAttrJson));
        } catch {}
      }

      const mappingsJson = formData.get('complianceMappings');
      if (mappingsJson) {
        try {
          complianceMappings = JSON.parse(String(mappingsJson));
        } catch {}
      }

      const file = formData.get('file') as File | null;
      if (file && file.size > 0) {
        if (file.size > 50 * 1024 * 1024) {
          return NextResponse.json(
            { error: 'Ukuran file melebihi batas maksimal 50 MB' },
            { status: 400 }
          );
        }

        fileName = file.name;
        const bytes = await file.arrayBuffer();
        fileBuffer = Buffer.from(bytes);

        // Magic bytes validation: must start with %PDF-
        if (fileBuffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
          return NextResponse.json(
            { error: 'Format berkas tidak valid: Hanya berkas dokumen PDF sah yang diperkenankan' },
            { status: 400 }
          );
        }

        // Structural integrity check
        try {
          await PDFDocument.load(fileBuffer, { ignoreEncryption: false });
        } catch (pdfErr: any) {
          return NextResponse.json(
            { error: `Berkas PDF tidak valid atau terenkripsi: ${pdfErr.message}` },
            { status: 400 }
          );
        }
      }
    } else {
      const body = await req.json();
      docNumber = String(body.docNumber || '').trim().toUpperCase();
      title = String(body.title || '').trim();
      taxonomyId = String(body.taxonomyId || '').trim();
      accessLevel = body.accessLevel || 'INTERNAL';
      effectiveDateStr = body.effectiveDate || '';
      customAttributes = body.customAttributes || {};
      complianceMappings = body.complianceMappings || [];
    }

    const taxonomy = await Taxonomy.findById(taxonomyId);
    if (!taxonomy) {
      return NextResponse.json({ error: 'Kategori taksonomi tidak ditemukan' }, { status: 404 });
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Judul dokumen resmi wajib diisi' },
        { status: 400 }
      );
    }

    // Auto-generate docNumber if not provided
    if (!docNumber) {
      const prefix = taxonomy.codePrefix || 'DOC';
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      docNumber = `MTE-${prefix}-${randomSuffix}`;
    }

    // Check for duplicate docNumber
    const existing = await DocumentModel.findOne({ docNumber });
    if (existing) {
      // Append random number if collision
      docNumber = `${docNumber}-${Math.floor(10 + Math.random() * 90)}`;
    }

    // If no PDF file uploaded by user, automatically generate an official template PDF
    if (!fileBuffer) {
      fileName = `${docNumber}.pdf`;
      fileBuffer = await generateDocumentPdf({
        title,
        docNumber,
        revision: 1,
        categoryName: taxonomy.name,
        effectiveDate: effectiveDateStr || undefined,
        clauses: complianceMappings.map((m) => `${m.frameworkCode}: ${m.clauses.join(', ')}`),
      });
    }

    // Save to physical on-premise storage engine with SHA-256 hash
    const stored = await saveFileToStorage(fileBuffer, fileName, docNumber);

    const effectiveDate = effectiveDateStr ? new Date(effectiveDateStr) : new Date();
    const nextReviewMonths = taxonomy.retentionConfig?.defaultReviewMonths || 12;
    const nextReviewDate = new Date(effectiveDate);
    nextReviewDate.setMonth(nextReviewDate.getMonth() + nextReviewMonths);

    const newDoc = await DocumentModel.create({
      docNumber,
      title,
      taxonomyId: taxonomy._id,
      taxonomySnapshot: {
        name: taxonomy.name,
        codePrefix: taxonomy.codePrefix,
        colorTheme: taxonomy.colorTheme,
      },
      departmentId: user.departmentId ? user.departmentId : undefined,
      ownerId: user.id,
      accessLevel,
      status: 'ACTIVE',
      currentVersion: 1,
      effectiveDate,
      nextReviewDate,
      complianceMappings,
      customAttributes,
      currentFile: {
        versionId: undefined,
        versionNumber: 1,
        storagePath: stored.storagePath,
        fileName: stored.fileName,
        fileSize: stored.fileSize,
        mimeType: stored.mimeType,
        sha256Hash: stored.sha256Hash,
        qrVerificationToken: stored.qrVerificationToken,
        uploadedBy: user.id,
        uploadedAt: new Date(),
        changeSummary: 'Terbitan Baru',
      },
      revisionHistory: [],
    });

    await logAudit({
      actor: user,
      action: 'document.create',
      resource: { type: 'document', id: newDoc._id.toString(), name: docNumber },
      status: 'SUCCESS',
      metadata: { title, docNumber, accessLevel, sha256: stored.sha256Hash },
    });

    const populated = await DocumentModel.findById(newDoc._id)
      .populate('taxonomyId')
      .populate('departmentId')
      .lean();

    return NextResponse.json({ success: true, document: populated || newDoc }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating document:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
