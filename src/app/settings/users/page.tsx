import React from 'react';
import { requirePermission } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { Role } from '@/models/Role';
import { Department } from '@/models/Department';
import { AppShell } from '@/components/layout/AppShell';
import { UsersManagementView } from '@/components/admin/UsersManagementView';

export const dynamic = 'force-dynamic';

export default async function UsersSettingsPage() {
  const currentUser = await requirePermission('user:view');
  await connectDB();

  const rawUsers = await User.find()
    .populate('roleIds')
    .populate('departmentId')
    .sort({ createdAt: -1 })
    .lean();
  const rawRoles = await Role.find().lean();
  const rawDepts = await Department.find().lean();

  const users = JSON.parse(JSON.stringify(rawUsers));
  const roles = JSON.parse(JSON.stringify(rawRoles));
  const departments = JSON.parse(JSON.stringify(rawDepts));

  return (
    <AppShell user={currentUser}>
      <UsersManagementView
        initialUsers={users}
        roles={roles}
        departments={departments}
        currentUser={currentUser}
      />
    </AppShell>
  );
}
