import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ComplianceFramework, IClause } from '@/models/ComplianceFramework';
import { getSession } from '@/lib/auth';
import { can, isSuperAdmin } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';

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

    if (!can(user, 'framework:manage') && !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Akses ditolak: Dibutuhkan izin framework:manage' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { clauseNumber, parentClause, title, hlsGroup, mandatoryDocumentHint, description } = body;

    if (!clauseNumber?.trim() || !title?.trim()) {
      return NextResponse.json(
        { error: 'Nomor klausul dan Judul klausul wajib diisi' },
        { status: 400 }
      );
    }

    await connectDB();

    const fw = await ComplianceFramework.findById(id);
    if (!fw) {
      return NextResponse.json({ error: 'Standar tidak ditemukan' }, { status: 404 });
    }

    // Check duplicate clause number
    const isDuplicate = fw.clauses.some((c) => c.clauseNumber === clauseNumber.trim());
    if (isDuplicate) {
      return NextResponse.json(
        { error: `Klausul "${clauseNumber.trim()}" sudah ada di standar ${fw.code}` },
        { status: 400 }
      );
    }

    const newClause: IClause = {
      clauseNumber: clauseNumber.trim(),
      parentClause: parentClause?.trim() || clauseNumber.trim().split('.')[0],
      title: title.trim(),
      hlsGroup,
      mandatoryDocumentHint: mandatoryDocumentHint?.trim(),
      description: description?.trim(),
    };

    fw.clauses.push(newClause);
    await fw.save();

    await logAudit({
      actor: user,
      action: 'framework.update',
      resource: {
        type: 'framework',
        id: fw._id.toString(),
        name: fw.name,
      },
      metadata: {
        code: fw.code,
        actionType: 'add_clause',
        clauseNumber: newClause.clauseNumber,
      },
    });

    return NextResponse.json(fw);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(user, 'framework:manage') && !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Akses ditolak: Dibutuhkan izin framework:manage' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const clauseNumber = searchParams.get('clauseNumber');

    if (!clauseNumber) {
      return NextResponse.json({ error: 'Parameter clauseNumber wajib disertakan' }, { status: 400 });
    }

    await connectDB();

    const fw = await ComplianceFramework.findById(id);
    if (!fw) {
      return NextResponse.json({ error: 'Standar tidak ditemukan' }, { status: 404 });
    }

    fw.clauses = fw.clauses.filter((c) => c.clauseNumber !== clauseNumber);
    await fw.save();

    await logAudit({
      actor: user,
      action: 'framework.update',
      resource: {
        type: 'framework',
        id: fw._id.toString(),
        name: fw.name,
      },
      metadata: {
        code: fw.code,
        actionType: 'delete_clause',
        clauseNumber,
      },
    });

    return NextResponse.json(fw);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
