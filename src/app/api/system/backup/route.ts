import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { Role } from '@/models/Role';
import { Department } from '@/models/Department';
import { Taxonomy } from '@/models/Taxonomy';
import { ComplianceFramework } from '@/models/ComplianceFramework';
import { DocumentModel } from '@/models/Document';
import { ChangeRequest } from '@/models/ChangeRequest';
import { getSession } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya Super Admin yang berwenang mengekspor snapshot backup.' },
        { status: 403 }
      );
    }

    await connectDB();

    const snapshot = {
      system: 'Enerco Vault Enterprise',
      version: 'v2.1',
      exportedAt: new Date().toISOString(),
      exportedBy: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      collections: {
        roles: await Role.find().lean(),
        departments: await Department.find().lean(),
        taxonomies: await Taxonomy.find().lean(),
        complianceFrameworks: await ComplianceFramework.find().lean(),
        documents: await DocumentModel.find().lean(),
        changeRequests: await ChangeRequest.find().lean(),
        users: await User.find().select('-passwordHash').lean(),
      },
    };

    await logAudit({
      actor: user,
      action: 'system.backup',
      resource: { type: 'system', name: 'Database Snapshot Export' },
      status: 'SUCCESS',
      metadata: {
        documentsCount: snapshot.collections.documents.length,
        usersCount: snapshot.collections.users.length,
      },
    });

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `EnercoVault_Backup_${dateStr}.json`;

    return new NextResponse(JSON.stringify(snapshot, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Backup export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
