import React from 'react';
import { requirePermission } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { User } from '@/models/User';
import { Role } from '@/models/Role';
import { Taxonomy } from '@/models/Taxonomy';
import { ComplianceFramework } from '@/models/ComplianceFramework';
import { ChangeRequest } from '@/models/ChangeRequest';
import { getCompanyConfig } from '@/lib/company-config';
import { AppShell } from '@/components/layout/AppShell';
import { SystemConsoleView } from '@/components/admin/SystemConsoleView';

export const dynamic = 'force-dynamic';

export default async function SystemConsolePage() {
  const currentUser = await requirePermission('system:settings');
  await connectDB();

  const totalDocs = await DocumentModel.countDocuments({ isDeleted: false });
  const totalUsers = await User.countDocuments();
  const totalRoles = await Role.countDocuments();
  const totalTaxonomies = await Taxonomy.countDocuments();
  const totalFrameworks = await ComplianceFramework.countDocuments();
  const totalDcrs = await ChangeRequest.countDocuments();
  const companyConfig = await getCompanyConfig();

  const stats = {
    totalDocs,
    totalUsers,
    totalRoles,
    totalTaxonomies,
    totalFrameworks,
    totalDcrs,
  };

  return (
    <AppShell user={currentUser}>
      <SystemConsoleView
        stats={stats}
        currentUser={currentUser}
        initialCompanyConfig={JSON.parse(JSON.stringify(companyConfig))}
      />
    </AppShell>
  );
}
