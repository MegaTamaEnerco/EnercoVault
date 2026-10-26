import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { getSession } from '@/lib/auth';
import { can, isSuperAdmin, documentScopeFilter } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!can(user, 'document:view') && !isSuperAdmin(user)) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda membutuhkan izin document:view' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await connectDB();

    const scopeFilter = documentScopeFilter(user);
    const doc = await DocumentModel.findOne({ _id: id, ...scopeFilter })
      .populate('taxonomyId')
      .populate('departmentId')
      .populate('ownerId', 'fullName username email')
      .lean();

    if (!doc) {
      return NextResponse.json(
        { error: 'Dokumen tidak ditemukan atau di luar batas hak akses Anda' },
        { status: 404 }
      );
    }

    return NextResponse.json({ document: doc });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!can(user, 'document:delete')) {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda membutuhkan izin document:delete' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const isHard = req.nextUrl.searchParams.get('hard') === 'true' && isSuperAdmin(user);

    await connectDB();
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 });
    }

    if (isHard) {
      await DocumentModel.deleteOne({ _id: id });
    } else {
      doc.isDeleted = true;
      doc.deletedAt = new Date();
      doc.deletedBy = user.id as any;
      await doc.save();
    }

    await logAudit({
      actor: user,
      action: isHard ? 'document.hard_delete' : 'document.soft_delete',
      resource: { type: 'document', id, name: doc.docNumber },
      status: 'SUCCESS',
      reason: isHard ? 'Penghapusan permanen oleh Super Admin' : 'Arsip hapus (soft delete)',
    });

    return NextResponse.json({
      success: true,
      message: isHard ? 'Dokumen berhasil dihapus permanen' : 'Dokumen berhasil dipindahkan ke arsip hapus',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
