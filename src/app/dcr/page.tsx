import React from 'react';
import { requirePermission } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { ChangeRequest } from '@/models/ChangeRequest';
import { AppShell } from '@/components/layout/AppShell';
import { DCRListView } from '@/components/dcr/DCRListView';

export const dynamic = 'force-dynamic';

export default async function DCRPage() {
  const currentUser = await requirePermission('dcr:view');
  await connectDB();

  const rawDcrs = await ChangeRequest.find()
    .populate('initiatorId', 'fullName username email roleCodes')
    .populate('targetDocumentId', 'docNumber title currentVersion status accessLevel')
    .populate('proposedTaxonomyId', 'name codePrefix colorTheme')
    .sort({ createdAt: -1 })
    .lean();

  const dcrs = JSON.parse(JSON.stringify(rawDcrs));

  return (
    <AppShell user={currentUser}>
      <DCRListView initialDcrs={dcrs} currentUser={currentUser} />
    </AppShell>
  );
}
