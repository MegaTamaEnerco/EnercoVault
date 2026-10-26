import React from 'react';
import { requirePermission } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getCompanyConfig } from '@/lib/company-config';
import { AppShell } from '@/components/layout/AppShell';
import { CompanyProfileConfigCard } from '@/components/admin/CompanyProfileConfigCard';
import Link from 'next/link';
import { Building2, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CompanySettingsPage() {
  const currentUser = await requirePermission('system:settings');
  await connectDB();

  const companyConfig = await getCompanyConfig();

  return (
    <AppShell user={currentUser}>
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Link href="/system" className="hover:text-zinc-200 transition-colors">
            Pengaturan Sistem
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white font-medium">Identitas Perusahaan</span>
        </div>

        {/* Company Profile Configuration Card */}
        <CompanyProfileConfigCard
          initialConfig={JSON.parse(JSON.stringify(companyConfig))}
        />
      </div>
    </AppShell>
  );
}
