import React from 'react';
import { requirePermission } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { ComplianceFramework } from '@/models/ComplianceFramework';
import { DocumentModel } from '@/models/Document';
import { AppShell } from '@/components/layout/AppShell';
import { IMSMatrixView } from '@/components/matrix/IMSMatrixView';

export const dynamic = 'force-dynamic';

export default async function IMSMatrixPage() {
  const currentUser = await requirePermission('ims_matrix:view');
  await connectDB();

  const rawFrameworks = await ComplianceFramework.find({ isActive: true }).lean();
  const rawDocs = await DocumentModel.find({ isDeleted: false })
    .select('docNumber title currentVersion status complianceMappings accessLevel taxonomyId departmentId updatedAt')
    .populate('taxonomyId', 'name codePrefix colorTheme')
    .populate('departmentId', 'name code')
    .lean();

  const frameworks = JSON.parse(JSON.stringify(rawFrameworks));
  const documents = JSON.parse(JSON.stringify(rawDocs));

  return (
    <AppShell user={currentUser}>
      <IMSMatrixView frameworks={frameworks} documents={documents} />
    </AppShell>
  );
}
