import React from 'react';
import { requirePermission } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Taxonomy } from '@/models/Taxonomy';
import { AppShell } from '@/components/layout/AppShell';
import { TaxonomiesManagerView } from '@/components/admin/TaxonomiesManagerView';

export const dynamic = 'force-dynamic';

export default async function TaxonomiesSettingsPage() {
  const currentUser = await requirePermission('taxonomy:manage');
  await connectDB();

  const taxonomies = await Taxonomy.find().sort({ sortOrder: 1, createdAt: 1 }).lean();

  return (
    <AppShell user={currentUser}>
      <TaxonomiesManagerView
        initialTaxonomies={JSON.parse(JSON.stringify(taxonomies))}
        currentUser={currentUser}
      />
    </AppShell>
  );
}
