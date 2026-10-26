import React from 'react';
import { requirePermission } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { Taxonomy } from '@/models/Taxonomy';
import { ComplianceFramework } from '@/models/ComplianceFramework';
import { documentScopeFilter } from '@/lib/rbac';
import { AppShell } from '@/components/layout/AppShell';
import { CatalogView } from '@/components/catalog/CatalogView';

export const dynamic = 'force-dynamic';

export default async function CatalogPage() {
  const currentUser = await requirePermission('document:view');
  await connectDB();

  // Apply RBAC scope filter: Super Admin sees all documents; others see allowed levels & own dept
  const filter = documentScopeFilter(currentUser);
  const rawDocs = await DocumentModel.find(filter)
    .populate('taxonomyId')
    .populate('departmentId')
    .sort({ updatedAt: -1 })
    .lean();

  const rawTaxonomies = await Taxonomy.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  const rawFrameworks = await ComplianceFramework.find({ isActive: true }).lean();

  // Serialize ObjectId and Dates for client component
  const documents = JSON.parse(JSON.stringify(rawDocs));
  const taxonomies = JSON.parse(JSON.stringify(rawTaxonomies));
  const frameworks = JSON.parse(JSON.stringify(rawFrameworks));

  return (
    <AppShell user={currentUser}>
      <CatalogView
        initialDocuments={documents}
        taxonomies={taxonomies}
        frameworks={frameworks}
        currentUser={currentUser}
      />
    </AppShell>
  );
}
