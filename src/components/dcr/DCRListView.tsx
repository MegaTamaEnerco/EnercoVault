'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GitPullRequest,
  Plus,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Crown,
  Eye,
  Check,
  AlertCircle,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { SessionUser, isSuperAdmin } from '@/lib/rbac';
import { DCRReviewModal } from './DCRReviewModal';

export interface DCRListViewProps {
  initialDcrs: any[];
  currentUser: SessionUser;
}

export function DCRListView({ initialDcrs, currentUser }: DCRListViewProps) {
  const router = useRouter();
  const [dcrs, setDcrs] = useState<any[]>(initialDcrs);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDcr, setSelectedDcr] = useState<any | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const isSuper = isSuperAdmin(currentUser);

  const filteredDcrs = dcrs.filter((d) => {
    if (filterStatus === 'all') return true;
    return d.status === filterStatus;
  });

  const handleDcrUpdated = (updated: any) => {
    setDcrs((prev) =>
      prev.map((d) => (d._id?.toString() === updated._id?.toString() ? updated : d))
    );
    setNotification(
      `Status DCR ${updated.dcrNumber} berhasil diperbarui menjadi ${updated.status}!`
    );
    setTimeout(() => setNotification(null), 5000);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-blue-400" />
            Usulan Perubahan & Permintaan Dokumen (DCR)
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Alur persetujuan 3-tahap (Review Teknis → Document Control → Final Approval) dengan auto-archiving.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dcr/new"
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 interactive-tap shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan DCR Baru</span>
          </Link>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg shadow-emerald-500/5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-emerald-400 hover:text-white font-medium text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Super Admin Privilege Banner */}
      {isSuper && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Hak Istimewa Super Admin Aktif (*:*):</strong> Anda memiliki hak bypass untuk mengevaluasi pada semua tahapan, atau melakukan <em>⚡ Force Final Approve</em> instan yang langsung mempublikasikan revisi dokumen ke storage.
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs font-medium">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg interactive-tap transition-all cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-blue-600 text-white font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Semua Usulan ({dcrs.length})
        </button>
        <button
          onClick={() => setFilterStatus('IN_REVIEW')}
          className={`px-3 py-1.5 rounded-lg interactive-tap transition-all cursor-pointer ${
            filterStatus === 'IN_REVIEW'
              ? 'bg-amber-600 text-white font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Sedang Direview ({dcrs.filter((d) => d.status === 'IN_REVIEW').length})
        </button>
        <button
          onClick={() => setFilterStatus('APPROVED')}
          className={`px-3 py-1.5 rounded-lg interactive-tap transition-all cursor-pointer ${
            filterStatus === 'APPROVED'
              ? 'bg-emerald-600 text-white font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Disetujui ({dcrs.filter((d) => d.status === 'APPROVED').length})
        </button>
        <button
          onClick={() => setFilterStatus('REJECTED')}
          className={`px-3 py-1.5 rounded-lg interactive-tap transition-all cursor-pointer ${
            filterStatus === 'REJECTED'
              ? 'bg-red-600 text-white font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Ditolak ({dcrs.filter((d) => d.status === 'REJECTED').length})
        </button>
      </div>

      {/* DCR Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-zinc-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400">
                <th className="py-3 px-4 font-medium">Nomor DCR</th>
                <th className="py-3 px-4 font-medium">Judul Usulan</th>
                <th className="py-3 px-4 font-medium">Tipe</th>
                <th className="py-3 px-4 font-medium">Pemohon</th>
                <th className="py-3 px-4 font-medium">Progres Persetujuan</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredDcrs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <GitPullRequest className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                    <div>Tidak ada usulan DCR pada filter ini.</div>
                    <Link
                      href="/dcr/new"
                      className="mt-3 px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-medium interactive-tap inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajukan DCR Baru Sekarang</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredDcrs.map((dcr: any) => (
                  <tr
                    key={dcr._id.toString()}
                    className="hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                    onClick={() => setSelectedDcr(dcr)}
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-blue-400 group-hover:underline">
                      {dcr.dcrNumber}
                    </td>
                    <td className="py-3.5 px-4 text-white font-medium max-w-xs">
                      <div className="line-clamp-1">{dcr.title}</div>
                      {dcr.targetDocumentId && (
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          Target: {dcr.targetDocumentId.docNumber} (Rev. {dcr.targetDocumentId.currentVersion})
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {dcr.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">
                      {dcr.initiatorId?.fullName || dcr.initiatorId?.username || 'User'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] text-zinc-300 font-medium mb-1">
                        Tahap {dcr.currentStep} dari {dcr.totalSteps}
                      </div>
                      <div className="w-24 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            dcr.status === 'APPROVED'
                              ? 'bg-emerald-500'
                              : dcr.status === 'REJECTED'
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                          style={{
                            width: `${(dcr.currentStep / dcr.totalSteps) * 100}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
                          dcr.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : dcr.status === 'REJECTED'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}
                      >
                        {dcr.status === 'APPROVED' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : dcr.status === 'REJECTED' ? (
                          <AlertCircle className="w-3 h-3 text-red-400" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-400" />
                        )}
                        <span>{dcr.status}</span>
                      </span>
                    </td>
                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setSelectedDcr(dcr)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium interactive-tap cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Tinjau & Aksi</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DCR Review & Approval Modal */}
      <DCRReviewModal
        dcr={selectedDcr}
        isOpen={Boolean(selectedDcr)}
        onClose={() => setSelectedDcr(null)}
        currentUser={currentUser}
        onDcrUpdated={handleDcrUpdated}
      />
    </div>
  );
}
