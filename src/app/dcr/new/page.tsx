import React from 'react';
import { requirePermission } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { Taxonomy } from '@/models/Taxonomy';
import { ComplianceFramework } from '@/models/ComplianceFramework';
import { AppShell } from '@/components/layout/AppShell';
import { NewDCRForm } from '@/components/dcr/NewDCRForm';
import Link from 'next/link';
import { ArrowLeft, GitPullRequest } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NewDCRPage() {
  const currentUser = await requirePermission('dcr:create');
  await connectDB();

  const rawDocs = await DocumentModel.find({ isDeleted: false })
    .populate('taxonomyId')
    .sort({ docNumber: 1 })
    .lean();

  const rawTaxonomies = await Taxonomy.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  const rawFrameworks = await ComplianceFramework.find({ isActive: true }).lean();

  const documents = JSON.parse(JSON.stringify(rawDocs));
  const taxonomies = JSON.parse(JSON.stringify(rawTaxonomies));
  const frameworks = JSON.parse(JSON.stringify(rawFrameworks));

  return (
    <AppShell user={currentUser} maxWidth="max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dcr"
            className="p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white interactive-tap cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <GitPullRequest className="w-5 h-5 text-blue-400" />
              Formulir Usulan Perubahan Dokumen (DCR)
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Alur pengajuan resmi verifikasi berjenjang ISO 9001/14001/45001 & SMK3 PP 50/2012
            </p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-zinc-800 shadow-xl">
          <NewDCRForm
            documents={documents}
            taxonomies={taxonomies}
            frameworks={frameworks}
            currentUser={currentUser}
          />
        </div>
      </div>
    </AppShell>
  );
}
