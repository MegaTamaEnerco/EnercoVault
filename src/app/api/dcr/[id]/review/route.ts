import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import { ChangeRequest } from '@/models/ChangeRequest';
import { DocumentModel } from '@/models/Document';
import { Taxonomy } from '@/models/Taxonomy';
import { getSession } from '@/lib/auth';
import { can, isSuperAdmin } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import { archiveFile, saveFileToStorage } from '@/lib/storage-engine';
import { generateDocumentPdf } from '@/lib/pdf-stamper';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const dcr = await ChangeRequest.findById(id);
    if (!dcr) {
      return NextResponse.json({ error: 'DCR tidak ditemukan' }, { status: 404 });
    }

    if (dcr.status === 'APPROVED' || dcr.status === 'REJECTED' || dcr.status === 'CANCELLED') {
      return NextResponse.json(
        { error: `DCR ini sudah berada dalam status final: ${dcr.status}` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { action, comment = '' } = body; // action: 'APPROVE' | 'REJECT' | 'OVERRIDE'

    if (!['APPROVE', 'REJECT', 'OVERRIDE'].includes(action)) {
      return NextResponse.json({ error: 'Aksi review tidak valid' }, { status: 400 });
    }

    const isSuper = isSuperAdmin(user);

    // 1. Super Admin Override / Force Approve
    if (action === 'OVERRIDE') {
      if (!isSuper && !can(user, 'dcr:override')) {
        return NextResponse.json(
          { error: 'Akses ditolak: Anda membutuhkan izin dcr:override atau Super Admin' },
          { status: 403 }
        );
      }

      if (!comment.trim()) {
        return NextResponse.json(
          { error: 'Super Admin wajib menyertakan alasan override/force approve' },
          { status: 400 }
        );
      }

      // Record override in history
      dcr.history.push({
        step: dcr.currentStep,
        role: user.roleCodes[0] || 'SUPER_ADMIN',
        action: 'Super Admin Override & Force Final Approval',
        reviewerId: user.id as any,
        status: 'OVERRIDDEN',
        comment,
        decidedAt: new Date(),
      });

      dcr.status = 'APPROVED';
      dcr.currentStep = dcr.totalSteps;
      await dcr.save();

      // Execute document promotion / archiving
      await promoteDcrToDocument(dcr, user);

      await logAudit({
        actor: user,
        action: 'dcr.override',
        resource: { type: 'dcr', id: dcr._id.toString(), name: dcr.dcrNumber },
        status: 'SUCCESS',
        metadata: { reason: comment, dcrNumber: dcr.dcrNumber },
      });

      return NextResponse.json({
        success: true,
        message: 'DCR berhasil disetujui penuh via Super Admin Force Approve',
        dcr,
      });
    }

    // Determine required permission for the current step
    const currentStepConfig = dcr.workflow.find((w) => w.step === dcr.currentStep);
    const requiredPermission = currentStepConfig?.permission || 'dcr:review_technical';

    // 2. Reject proposal
    if (action === 'REJECT') {
      const isAuthor = dcr.initiatorId?.toString() === user.id;
      const canCancelOwn = isAuthor && can(user, 'dcr:cancel');
      const canReviewCurrentStep = can(user, requiredPermission as any);

      if (!isSuper && !canReviewCurrentStep && !canCancelOwn) {
        return NextResponse.json(
          {
            error: `Akses ditolak: Anda membutuhkan izin '${requiredPermission}' atau Super Admin untuk menolak usulan DCR ini`,
          },
          { status: 403 }
        );
      }

      if (!comment.trim()) {
        return NextResponse.json(
          { error: 'Alasan penolakan DCR wajib dicantumkan' },
          { status: 400 }
        );
      }

      dcr.history.push({
        step: dcr.currentStep,
        role: user.roleCodes[0] || 'Reviewer',
        action: `Penolakan pada Tahap ${dcr.currentStep}`,
        reviewerId: user.id as any,
        status: 'REJECTED',
        comment,
        decidedAt: new Date(),
      });

      dcr.status = 'REJECTED';
      await dcr.save();

      await logAudit({
        actor: user,
        action: 'dcr.reject',
        resource: { type: 'dcr', id: dcr._id.toString(), name: dcr.dcrNumber },
        status: 'SUCCESS',
        metadata: { step: dcr.currentStep, comment },
      });

      return NextResponse.json({
        success: true,
        message: 'Usulan DCR telah ditolak.',
        dcr,
      });
    }

    // 3. Regular Step Approval
    // Segregation of duties: Author cannot approve their own DCR step
    if (!isSuper && dcr.initiatorId?.toString() === user.id) {
      return NextResponse.json(
        {
          error: 'Pelanggaran Segregation of Duties (Prinsip Audit ISO): Penyusun DCR tidak diperkenankan menyetujui tahap evaluasi usulannya sendiri.',
        },
        { status: 403 }
      );
    }

    if (!isSuper && !can(user, requiredPermission as any)) {
      return NextResponse.json(
        {
          error: `Akses ditolak: Anda membutuhkan izin '${requiredPermission}' untuk menyetujui Tahap ${dcr.currentStep}`,
        },
        { status: 403 }
      );
    }

    dcr.history.push({
      step: dcr.currentStep,
      role: currentStepConfig?.role || user.roleCodes[0] || 'Reviewer',
      action: currentStepConfig?.action || `Persetujuan Tahap ${dcr.currentStep}`,
      reviewerId: user.id as any,
      status: 'APPROVED',
      comment: comment || 'Persetujuan diverifikasi sesuai standar',
      decidedAt: new Date(),
    });

    if (dcr.currentStep < dcr.totalSteps) {
      dcr.currentStep += 1;
      await dcr.save();

      await logAudit({
        actor: user,
        action: 'dcr.approve_step',
        resource: { type: 'dcr', id: dcr._id.toString(), name: dcr.dcrNumber },
        status: 'SUCCESS',
        metadata: { approvedStep: dcr.currentStep - 1, nextStep: dcr.currentStep },
      });

      return NextResponse.json({
        success: true,
        message: `Tahap ${dcr.currentStep - 1} disetujui. Lanjut ke Tahap ${dcr.currentStep}.`,
        dcr,
      });
    } else {
      // Final Approval reached!
      dcr.status = 'APPROVED';
      await dcr.save();

      await promoteDcrToDocument(dcr, user);

      await logAudit({
        actor: user,
        action: 'dcr.approve_final',
        resource: { type: 'dcr', id: dcr._id.toString(), name: dcr.dcrNumber },
        status: 'SUCCESS',
        metadata: { dcrNumber: dcr.dcrNumber },
      });

      return NextResponse.json({
        success: true,
        message: 'DCR telah disetujui penuh & revisi dokumen berhasil dipublikasikan!',
        dcr,
      });
    }
  } catch (error: any) {
    console.error('Error reviewing DCR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Helper to promote approved DCR changes to Document model and archive old revisions
 */
async function promoteDcrToDocument(dcr: any, actor: any) {
  const taxonomy = await Taxonomy.findById(dcr.proposedTaxonomyId);

  // If revising an existing document
  if (dcr.targetDocumentId) {
    const doc = await DocumentModel.findById(dcr.targetDocumentId);
    if (!doc) return;

    if (dcr.type === 'OBSOLETE') {
      doc.status = 'OBSOLETE';
      await doc.save();
      return;
    }

    // Archive current file if present
    if (doc.currentFile) {
      let archivedPath = doc.currentFile.storagePath;
      try {
        archivedPath = await archiveFile(doc.currentFile.storagePath);
      } catch (e) {
        console.warn('Archive file warning:', e);
      }

      // Save old revision to history
      doc.revisionHistory.push({
        versionId: doc.currentFile.versionId || new Types.ObjectId(),
        versionNumber: doc.currentVersion,
        storagePath: archivedPath,
        fileName: doc.currentFile.fileName,
        fileSize: doc.currentFile.fileSize,
        mimeType: doc.currentFile.mimeType,
        sha256Hash: doc.currentFile.sha256Hash,
        qrVerificationToken: doc.currentFile.qrVerificationToken,
        uploadedBy: doc.currentFile.uploadedBy || new Types.ObjectId(actor.id),
        uploadedAt: doc.currentFile.uploadedAt || new Date(),
        changeSummary: dcr.reasonForChange,
      });
    }

    // Bump version
    const newVersion = (doc.currentVersion || 1) + 1;
    doc.currentVersion = newVersion;

    if (dcr.proposedMetadata?.title) {
      doc.title = dcr.proposedMetadata.title;
    }
    if (dcr.proposedMetadata?.complianceMappings) {
      doc.complianceMappings = dcr.proposedMetadata.complianceMappings;
    }

    // Generate new PDF with bumped revision
    const newPdfBuffer = await generateDocumentPdf({
      title: doc.title,
      docNumber: doc.docNumber,
      revision: newVersion,
      categoryName: taxonomy?.name || 'Dokumen Terkendali',
      effectiveDate: new Date().toISOString().split('T')[0],
      clauses: (doc.complianceMappings || []).map(
        (m: any) => `${m.frameworkCode}: ${(m.clauses || []).join(', ')}`
      ),
    });

    const stored = await saveFileToStorage(
      newPdfBuffer,
      `${doc.docNumber}-rev${String(newVersion).padStart(2, '0')}.pdf`,
      doc.docNumber
    );

    doc.currentFile = {
      versionId: new Types.ObjectId(),
      versionNumber: newVersion,
      storagePath: stored.storagePath,
      fileName: stored.fileName,
      fileSize: stored.fileSize,
      mimeType: stored.mimeType,
      sha256Hash: stored.sha256Hash,
      qrVerificationToken: stored.qrVerificationToken,
      uploadedBy: new Types.ObjectId(actor.id),
      uploadedAt: new Date(),
      changeSummary: `Revisi disahkan via ${dcr.dcrNumber}: ${dcr.reasonForChange}`,
    };

    doc.status = 'ACTIVE';
    await doc.save();
  }
}
