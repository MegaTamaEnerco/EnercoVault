import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ChangeRequest } from '@/models/ChangeRequest';
import { DocumentModel } from '@/models/Document';
import { Taxonomy } from '@/models/Taxonomy';
import { getSession } from '@/lib/auth';
import { can, isSuperAdmin } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'dcr:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const dcrs = await ChangeRequest.find(filter)
      .populate('initiatorId', 'fullName username email roleCodes')
      .populate('targetDocumentId', 'docNumber title currentVersion status accessLevel')
      .populate('proposedTaxonomyId', 'name codePrefix colorTheme')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ dcrs });
  } catch (error: any) {
    console.error('Error fetching DCRs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'dcr:create')) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda membutuhkan izin dcr:create' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json();
    const {
      title,
      type = 'REVISION',
      targetDocumentId,
      proposedTaxonomyId,
      reasonForChange,
      proposedMetadata,
    } = body;

    if (!title || !reasonForChange) {
      return NextResponse.json(
        { error: 'Judul usulan DCR dan alasan perubahan wajib diisi' },
        { status: 400 }
      );
    }

    // Determine taxonomy
    let taxonomyId = proposedTaxonomyId;
    let targetDoc = null;
    if (targetDocumentId) {
      targetDoc = await DocumentModel.findById(targetDocumentId);
      if (targetDoc && !taxonomyId) {
        taxonomyId = targetDoc.taxonomyId;
      }
    }

    if (!taxonomyId) {
      const defaultTax = await Taxonomy.findOne({ isActive: true });
      taxonomyId = defaultTax?._id;
    }

    // Generate unique DCR Number (e.g., DCR-2026-004)
    const year = new Date().getFullYear();
    const count = await ChangeRequest.countDocuments();
    const dcrNumber = `DCR-${year}-${String(count + 1).padStart(3, '0')}`;

    // Standard 3-step IMS approval workflow
    const workflow = [
      {
        step: 1,
        role: 'QHSE_MANAGER',
        permission: 'dcr:review_technical',
        action: 'Kajian Teknis Standar Mutu, Lingkungan & K3 (Annex SL)',
      },
      {
        step: 2,
        role: 'CORPORATE_SECRETARY',
        permission: 'dcr:review_doccontrol',
        action: 'Registrasi Masterlist & Format Tata Naskah Dokumen',
      },
      {
        step: 3,
        role: 'PRESIDENT_DIRECTOR',
        permission: 'dcr:approve_final',
        action: 'Pengesahan Pucuk Pimpinan / Direksi',
      },
    ];

    const newDcr = await ChangeRequest.create({
      dcrNumber,
      title,
      type,
      status: 'IN_REVIEW',
      targetDocumentId: targetDoc?._id || undefined,
      proposedTaxonomyId: taxonomyId,
      departmentId: user.departmentId ? user.departmentId : undefined,
      initiatorId: user.id,
      reasonForChange,
      currentStep: 1,
      totalSteps: 3,
      workflow,
      history: [
        {
          step: 0,
          role: user.roleCodes[0] || 'User',
          action: 'Pengajuan usulan DCR oleh pemohon',
          reviewerId: user.id,
          status: 'APPROVED',
          comment: 'Usulan DCR diterbitkan ke alur persetujuan',
          decidedAt: new Date(),
        },
      ],
      proposedMetadata: proposedMetadata || {},
    });

    await logAudit({
      actor: user,
      action: 'dcr.create',
      resource: { type: 'dcr', id: newDcr._id.toString(), name: dcrNumber },
      status: 'SUCCESS',
      metadata: { title, type, targetDoc: targetDoc?.docNumber },
    });

    const populated = await ChangeRequest.findById(newDcr._id)
      .populate('initiatorId', 'fullName username email')
      .populate('targetDocumentId', 'docNumber title currentVersion')
      .populate('proposedTaxonomyId', 'name codePrefix')
      .lean();

    return NextResponse.json({ success: true, dcr: populated || newDcr }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating DCR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
