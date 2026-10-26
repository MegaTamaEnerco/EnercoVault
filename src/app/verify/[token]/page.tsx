import React from 'react';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { getCompanyConfig } from '@/lib/company-config';
import { isSmk3OrQhseDocument } from '@/lib/qhse-detector';
import { K3IndonesiaLogo } from '@/components/common/K3IndonesiaLogo';
import {
  ShieldCheck,
  AlertTriangle,
  FileX,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  Hash,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface VerifyPageProps {
  params: Promise<{ token: string }>;
}

export default async function VerifyTokenPage({ params }: VerifyPageProps) {
  const { token } = await params;
  await connectDB();
  const companyConfig = await getCompanyConfig();

  // 1. Check if matches current active file of any document
  const activeDoc = await DocumentModel.findOne({
    'currentFile.qrVerificationToken': token,
  })
    .populate('taxonomyId')
    .lean();

  let isArchived = false;
  let archivedRevision = 0;
  let docData: any = activeDoc;

  // 2. If not active, check if matches any previous revision in history
  if (!activeDoc) {
    const docWithHistory = await DocumentModel.findOne({
      'revisionHistory.file.qrVerificationToken': token,
    })
      .populate('taxonomyId')
      .lean();

    if (docWithHistory) {
      isArchived = true;
      const matchingRev = docWithHistory.revisionHistory?.find(
        (r: any) => r.file?.qrVerificationToken === token
      );
      archivedRevision = matchingRev?.versionNumber || 0;
      docData = docWithHistory;
    }
  }

  const isValidCurrent = Boolean(activeDoc && !isArchived && docData?.status === 'ACTIVE');
  const isObsolete = Boolean(isArchived || docData?.status === 'OBSOLETE');
  const notFound = !docData;
  const isQhse = docData ? isSmk3OrQhseDocument(docData) : false;

  return (
    <div className="min-h-screen bg-[#07080c] flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="max-w-xl mx-auto w-full text-center pt-6 pb-4">
        {companyConfig.logoUrl ? (
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={companyConfig.logoUrl}
              alt={companyConfig.companyName}
              className="h-12 w-auto max-w-[180px] object-contain rounded-xl bg-white/10 p-1.5 border border-zinc-700/80 shadow-md"
            />
          </div>
        ) : null}

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
          <ShieldCheck className="w-4 h-4" />
          <span>{companyConfig.systemName} • Verifikasi Dokumen</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Pemeriksaan Salinan Dokumen
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          {companyConfig.companyName} • {companyConfig.tagline}
        </p>
      </div>

      {/* Main Verification Card */}
      <div className="max-w-xl mx-auto w-full my-auto">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-zinc-700/80 shadow-2xl relative overflow-hidden">
          {/* Case 1: VALID & ACTIVE CURRENT COPY */}
          {isValidCurrent && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-emerald-400 font-bold text-sm tracking-wide">
                      Dokumen Resmi Terverifikasi
                    </span>
                    {isQhse && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        K3 INDONESIA
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                    Salinan fisik ini sesuai dengan versi aktif yang terdaftar di sistem {companyConfig.companyName}.
                  </div>
                </div>
              </div>

              {/* K3 Indonesia Certification Banner */}
              {isQhse && (
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                  <K3IndonesiaLogo size={32} showText={true} />
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                    Kepmenaker 1135 / PP 50
                  </span>
                </div>
              )}

              {/* Document Identity Info */}
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-500">Nomor Dokumen:</span>
                  <span className="font-mono font-bold text-blue-400 text-sm">
                    {docData.docNumber}
                  </span>
                </div>

                <div className="py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 block mb-1">Judul Dokumen:</span>
                  <span className="text-white font-semibold text-sm leading-snug">
                    {docData.title}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-b border-zinc-800">
                  <div>
                    <span className="text-zinc-500 block">Revisi Berlaku:</span>
                    <span className="font-mono text-zinc-200 font-bold">
                      Rev. {String(docData.currentVersion || 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Status Dokumen:</span>
                    <span className="text-emerald-400 font-semibold font-mono">
                      ● Aktif
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-b border-zinc-800">
                  <div>
                    <span className="text-zinc-500 block">Tanggal Berlaku:</span>
                    <span className="text-zinc-200 font-mono">
                      {docData.effectiveDate
                        ? new Date(docData.effectiveDate).toLocaleDateString('id-ID')
                        : 'Segera'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Jadwal Tinjauan:</span>
                    <span className="text-zinc-200 font-mono">
                      {docData.nextReviewDate
                        ? new Date(docData.nextReviewDate).toLocaleDateString('id-ID')
                        : '1 Tahun'}
                    </span>
                  </div>
                </div>

                <div className="py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 block mb-1">Kesesuaian Standar:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(docData.complianceMappings || []).map((m: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-mono"
                      >
                        {m.frameworkCode} ({m.clauses?.join(', ')})
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-zinc-500 block font-mono text-[10px]">
                    Token Verifikasi QR:
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400 break-all block mt-0.5">
                    {token}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Case 2: OBSOLETE / SUPERSEDED OLD REVISION */}
          {isObsolete && !notFound && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-amber-400 font-bold text-sm tracking-wide">
                    Versi Dokumen Telah Digantikan
                  </div>
                  <div className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                    Salinan ini adalah <strong>Rev. {String(archivedRevision || 1).padStart(2, '0')}</strong> yang sudah tidak berlaku dan telah digantikan oleh <strong>Rev. {String(docData.currentVersion).padStart(2, '0')}</strong>.
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs space-y-2">
                <div className="text-zinc-400 font-semibold">Petunjuk Penggunaan:</div>
                <p className="text-zinc-300">
                  Untuk menjaga keselamatan dan mutu kerja, dokumen versi lama tidak boleh dijadikan panduan operasional. Silakan hubungi Document Controller untuk mendapatkan dokumen terkini.
                </p>
                <div className="pt-2 text-[11px] text-blue-400">
                  Dokumen Induk: <span className="font-mono font-bold">{docData.docNumber}</span> ({docData.title})
                </div>
              </div>
            </div>
          )}

          {/* Case 3: NOT FOUND / INVALID TOKEN */}
          {notFound && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
                <FileX className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white mb-1">
                  Token Verifikasi Tidak Terdaftar
                </h2>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Kode verifikasi QR <code className="text-red-400 font-mono text-[11px]">{token}</code> tidak ditemukan dalam basis data dokumen sah {companyConfig.companyName}.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-500">
                Pastikan Anda memindai kode QR resmi yang tercetak pada dokumen kendali {companyConfig.systemName}.
              </div>
            </div>
          )}

          {/* Card Footer */}
          <div className="mt-8 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>{companyConfig.systemName} Security Core</span>
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              <span>Masuk Portal</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Legal Notice */}
      <div className="max-w-xl mx-auto w-full text-center text-zinc-600 text-[11px] py-4">
        {companyConfig.copyrightText}
      </div>
    </div>
  );
}
