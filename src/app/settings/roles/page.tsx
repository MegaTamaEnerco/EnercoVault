import React from 'react';
import { requirePermission } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Role } from '@/models/Role';
import { AppShell } from '@/components/layout/AppShell';
import { RolesManagerView } from '@/components/admin/RolesManagerView';

export const dynamic = 'force-dynamic';

export default async function RolesSettingsPage() {
  const currentUser = await requirePermission('role:manage');
  await connectDB();

  const roles = await Role.find().sort({ isSystem: -1, createdAt: 1 }).lean();

  return (
    <AppShell user={currentUser}>
      <RolesManagerView
        initialRoles={JSON.parse(JSON.stringify(roles))}
        currentUser={currentUser}
      />
    </AppShell>
  );
}
