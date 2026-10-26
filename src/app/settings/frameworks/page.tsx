import React from 'react';
import { requirePermission } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { ComplianceFramework } from '@/models/ComplianceFramework';
import { AppShell } from '@/components/layout/AppShell';
import { FrameworksManagerView } from '@/components/admin/FrameworksManagerView';

export const dynamic = 'force-dynamic';

export default async function FrameworksSettingsPage() {
  const currentUser = await requirePermission('framework:manage');
  await connectDB();

  const frameworks = await ComplianceFramework.find().sort({ code: 1 }).lean();

  return (
    <AppShell user={currentUser}>
      <FrameworksManagerView
        initialFrameworks={JSON.parse(JSON.stringify(frameworks))}
        currentUser={currentUser}
      />
    </AppShell>
  );
}
