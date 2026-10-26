'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  GitPullRequest,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Crown,
  FileText,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { SessionUser, isSuperAdmin } from '@/lib/rbac';

export interface DCRReviewModalProps {
  dcr: any | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: SessionUser;
  onDcrUpdated: (updatedDcr: any) => void;
}

export function DCRReviewModal({
  dcr,
  isOpen,
  onClose,
  currentUser,
  onDcrUpdated,
}: DCRReviewModalProps) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key press (WCAG 2.1 AA)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !dcr) return null;

  const isSuper = isSuperAdmin(currentUser);
  const isFinal = dcr.status === 'APPROVED' || dcr.status === 'REJECTED';

  const handleAction = async (action: 'APPROVE' | 'REJECT' | 'OVERRIDE') => {
    if (action === 'OVERRIDE' && !comment.trim()) {
      setError('Super Admin wajib mengisi alasan override/force approve.');
      return;
    }

    if (action === 'REJECT' && !comment.trim()) {
      setError('Harap cantumkan alasan penolakan pada kolom komentar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/dcr/${dcr._id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses review DCR');
      }

      onDcrUpdated(data.dcr);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dcr-review-modal-title"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] glass-panel rounded-2xl border border-zinc-700/80 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-400">{dcr.dcrNumber}</span>
                <span className="text-[10px] px-2 py-0.2 rounded font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {dcr.type}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${
                    dcr.status === 'APPROVED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : dcr.status === 'REJECTED'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}
                >
                  {dcr.status}
                </span>
              </div>
              <h2
                id="dcr-review-modal-title"
                className="text-base font-semibold text-white tracking-tight line-clamp-1 mt-0.5"
              >
                {dcr.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 interactive-tap cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Workflow Pipeline Stepper */}
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <div className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span>Alur Persetujuan Perubahan Dokumen</span>
              <span className="text-[11px] font-mono text-blue-400">
                Tahap {dcr.currentStep} dari {dcr.totalSteps}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(dcr.workflow || []).map((w: any) => {
                const isPassed = dcr.status === 'APPROVED' || dcr.currentStep > w.step;
                const isCurrent = dcr.status === 'IN_REVIEW' && dcr.currentStep === w.step;

                return (
                  <div
                    key={w.step}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      isPassed
                        ? 'border-emerald-500/30 bg-emerald-500/5 text-zinc-300'
                        : isCurrent
                        ? 'border-blue-500 bg-blue-600/10 text-white shadow-sm ring-1 ring-blue-500/30'
                        : 'border-zinc-800 bg-zinc-900/30 text-zinc-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[10px] font-bold">
                        TAHAP {w.step}
                      </span>
                      {isPassed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Disetujui
                        </span>
                      ) : isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 font-semibold animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          Menunggu
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-600">Antrian</span>
                      )}
                    </div>
                    <div className="font-semibold text-xs text-white">{w.role}</div>
                    <div className="text-[10px] text-zinc-400 mt-1 line-clamp-2">{w.action}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DCR Core Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
              <div className="font-semibold text-zinc-300 text-[11px] uppercase tracking-wider">
                Informasi Pengajuan
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-500">Pemohon (Initiator):</span>
                <span className="text-white font-medium">
                  {dcr.initiatorId?.fullName || dcr.initiatorId?.username || 'User'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-500">Tanggal Pengajuan:</span>
                <span className="text-zinc-300 font-mono">
                  {new Date(dcr.createdAt).toLocaleDateString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Kategori Taksonomi:</span>
                <span className="text-white font-medium">
                  {dcr.proposedTaxonomyId?.name || 'Dokumen Terkendali'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
              <div className="font-semibold text-zinc-300 text-[11px] uppercase tracking-wider">
                Target Dokumen yang Diubah
              </div>
              {dcr.targetDocumentId ? (
                <>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Nomor Dokumen:</span>
                    <span className="font-mono text-blue-400 font-semibold">
                      {dcr.targetDocumentId.docNumber}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500">Judul Dokumen:</span>
                    <span className="text-white font-medium truncate max-w-xs">
                      {dcr.targetDocumentId.title}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-zinc-500">Versi Saat Ini:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-300 font-mono">
                        Rev. {String(dcr.targetDocumentId.currentVersion || 1).padStart(2, '0')}
                      </span>
                      <a
                        href={`/api/storage/stream/${dcr.targetDocumentId._id || dcr.targetDocumentId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:text-blue-300 border border-blue-500/20 text-[10px] font-medium flex items-center gap-1 interactive-tap"
                        title="Buka dokumen aktif saat ini"
                      >
                        <span>Lihat Dokumen</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-zinc-400 py-3">
                  Usulan pembuatan dokumen baru (belum ada dokumen induk sebelumnya).
                </div>
              )}
            </div>
          </div>

          {/* Reason for change */}
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2 text-xs">
            <div className="font-semibold text-zinc-300 text-[11px] uppercase tracking-wider">
              Latar Belakang & Alasan Perubahan
            </div>
            <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {dcr.reasonForChange}
            </p>
          </div>

          {/* History of Decisions */}
          {dcr.history && dcr.history.length > 0 && (
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3 text-xs">
              <div className="font-semibold text-zinc-300 text-[11px] uppercase tracking-wider">
                Catatan & Riwayat Keputusan
              </div>
              <div className="space-y-2">
                {dcr.history.map((h: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{h.role}</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                            h.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : h.status === 'OVERRIDDEN'
                              ? 'bg-amber-500/10 text-amber-300'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {h.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-1">{h.comment}</div>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 shrink-0">
                      {new Date(h.decidedAt).toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviewer Action Area */}
          {!isFinal && (
            <div className="p-4 rounded-xl bg-blue-600/5 border border-blue-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span>Keputusan Reviewer</span>
                </span>
                {isSuper && (
                  <span className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Akses Penuh Super Admin (*:*)
                  </span>
                )}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tuliskan catatan teknis atau alasan keputusan..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleAction('REJECT')}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-red-600/15 hover:bg-red-600/25 text-red-300 border border-red-500/30 text-xs font-semibold interactive-tap cursor-pointer disabled:opacity-50"
                >
                  Tolak Usulan
                </button>

                <div className="flex items-center gap-2">
                  {isSuper && (
                    <button
                      type="button"
                      onClick={() => handleAction('OVERRIDE')}
                      disabled={loading}
                      className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 interactive-tap cursor-pointer disabled:opacity-50 shadow-sm shadow-amber-500/10"
                      title="Super Admin Bypass: Langsung setujui penuh semua tahapan & publikasikan revisi"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>⚡ Force Final Approve (*:*)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAction('APPROVE')}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 interactive-tap shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {dcr.currentStep === dcr.totalSteps
                        ? 'Pengesahan Akhir (Final Approve)'
                        : `Setujui Tahap ${dcr.currentStep}`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
