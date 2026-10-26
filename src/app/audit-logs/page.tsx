import React from 'react';
import { requirePermission } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { AuditLog } from '@/models/AuditLog';
import { AppShell } from '@/components/layout/AppShell';
import { AuditLogView } from '@/components/admin/AuditLogView';

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage() {
  const currentUser = await requirePermission('audit_log:view');
  await connectDB();

  const rawLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(150).lean();
  const logs = JSON.parse(JSON.stringify(rawLogs));

  return (
    <AppShell user={currentUser}>
      <AuditLogView initialLogs={logs} />
    </AppShell>
  );
}
