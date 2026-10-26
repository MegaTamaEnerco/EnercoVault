import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { getSession } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/rbac';
import { getAbsolutePath } from '@/lib/storage-engine';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya Super Admin yang berwenang menjalankan verifikasi storage.' },
        { status: 403 }
      );
    }

    await connectDB();

    const docs = await DocumentModel.find({ isDeleted: false })
      .select('docNumber title currentVersion currentFile')
      .lean();

    const results = [];
    let matchingCount = 0;
    let corruptedCount = 0;
    let missingCount = 0;

    for (const doc of docs) {
      const storagePath = doc.currentFile?.storagePath;
      if (!storagePath) {
        missingCount++;
        results.push({
          docNumber: doc.docNumber,
          title: doc.title,
          status: 'MISSING_PATH',
          detail: 'Metadata tidak memiliki storagePath',
        });
        continue;
      }

      const absPath = getAbsolutePath(storagePath);
      if (!existsSync(absPath)) {
        missingCount++;
        results.push({
          docNumber: doc.docNumber,
          title: doc.title,
          status: 'FILE_NOT_FOUND',
          path: storagePath,
          detail: 'Berkas fisik tidak ditemukan di on-premise storage',
        });
        continue;
      }

      // Read file and compute hash
      const buffer = await fs.readFile(absPath);
      const computedHash = crypto.createHash('sha256').update(buffer).digest('hex');
      const expectedHash = doc.currentFile?.sha256Hash;

      if (computedHash === expectedHash) {
        matchingCount++;
        results.push({
          docNumber: doc.docNumber,
          title: doc.title,
          status: 'VERIFIED_MATCH',
          hash: computedHash,
          sizeBytes: buffer.length,
        });
      } else {
        corruptedCount++;
        results.push({
          docNumber: doc.docNumber,
          title: doc.title,
          status: 'HASH_MISMATCH',
          computedHash,
          expectedHash,
          detail: 'Integritas berkas terkompromi (Hash tidak cocok)',
        });
      }
    }

    await logAudit({
      actor: user,
      action: 'system.audit_checksums',
      resource: { type: 'system', name: 'Storage Integrity Audit' },
      status: 'SUCCESS',
      metadata: { total: docs.length, matchingCount, corruptedCount, missingCount },
    });

    return NextResponse.json({
      success: true,
      totalChecked: docs.length,
      matchingCount,
      corruptedCount,
      missingCount,
      isHealthy: corruptedCount === 0 && missingCount === 0,
      results,
    });
  } catch (error: any) {
    console.error('Audit checksums error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
