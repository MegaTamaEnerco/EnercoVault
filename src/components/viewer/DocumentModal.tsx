'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Download,
  ShieldCheck,
  Calendar,
  Layers,
  FileCheck,
  Hash,
  Award,
  Trash2,
  ExternalLink,
  QrCode,
  FileText,
  Copy,
  Check,
  Maximize2,
} from 'lucide-react';
import { SessionUser, isSuperAdmin } from '@/lib/rbac';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { isSmk3OrQhseDocument } from '@/lib/qhse-detector';
import { K3IndonesiaLogo } from '@/components/common/K3IndonesiaLogo';

export interface DocumentModalProps {
  document: any | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: SessionUser;
  onDeleted?: (id: string) => void;
}

export function DocumentModal({
  document: doc,
  isOpen,
  onClose,
  currentUser,
  onDeleted,
}: DocumentModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'preview' | 'metadata'>('preview');
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const token =
    doc?.currentFile?.qrVerificationToken ||
    (doc?.docNumber ? `EV-${doc.docNumber}` : 'EV-VERIFIED');
  const verifyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/verify/${token}`
      : `/verify/${token}`;

  useEffect(() => {
    if (!doc) return;
    let isMounted = true;
    QRCode.toDataURL(verifyUrl, {
      width: 320,
      margin: 1.5,
      color: { dark: '#090d16', light: '#ffffff' },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating QR data URL:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [doc, verifyUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopiedLink(true);
      toastSuccess('Tautan verifikasi berhasil disalin ke clipboard.');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toastError('Gagal menyalin tautan.');
    }
  };

  // Close on Escape key press (WCAG 2.1 AA)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleteConfirmOpen && !qrModalOpen) onClose();
      if (e.key === 'Escape' && qrModalOpen) setQrModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, deleteConfirmOpen, qrModalOpen]);

  if (!isOpen || !doc) return null;

  const isSuper = isSuperAdmin(currentUser);
  const isQhse = isSmk3OrQhseDocument(doc as any);
  const streamUrl = `/api/storage/stream/${doc._id}`;

  const executeDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${doc._id}?hard=true`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menghapus dokumen.');
      }
      toastSuccess(`Dokumen ${doc.docNumber} berhasil dihapus.`);
      setDeleteConfirmOpen(false);
      onDeleted?.(doc._id);
      onClose();
    } catch (err: any) {
      toastError(err.message || 'Terjadi kesalahan saat menghapus dokumen.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-modal-title"
    >
      <div className="relative w-full max-w-6xl h-[90vh] glass-panel rounded-2xl border border-zinc-700/80 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-400">{doc.docNumber}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Rev. {String(doc.currentVersion || 1).padStart(2, '0')}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${
                    doc.accessLevel === 'CONFIDENTIAL'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : doc.accessLevel === 'RESTRICTED'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}
                >
                  {doc.accessLevel}
                </span>

                {/* K3 Indonesia Header Badge for SMK3 / QHSE documents */}
                {isQhse && (
                  <div
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold"
                    title="Dokumen Resmi K3 / SMK3 PP 50/2012 (Kemnaker RI)"
                  >
                    <K3IndonesiaLogo size={16} showText={false} />
                    <span>SMK3 • K3 INDONESIA</span>
                  </div>
                )}
              </div>
              <h2
                id="document-modal-title"
                className="text-sm font-semibold text-white tracking-tight line-clamp-1 mt-0.5"
              >
                {doc.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* QR Verification Modal Trigger */}
            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-medium flex items-center gap-1.5 interactive-tap cursor-pointer"
              title="Lihat & Unduh QR Code Verifikasi Resmi"
            >
              <QrCode className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">QR Verifikasi</span>
            </button>

            {/* Download with watermark */}
            <a
              href={`${streamUrl}?download=true`}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 interactive-tap shadow-sm"
              title="Unduh salinan terkendali dengan stempel footer validasi"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salinan Terkendali</span>
            </a>

            {/* Super Admin original download */}
            {isSuper && (
              <a
                href={`${streamUrl}?original=true&download=true`}
                className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 interactive-tap"
                title="Super Admin: Unduh file asli tanpa watermark"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">File Asli (*:*)</span>
              </a>
            )}

            {isSuper && (
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={deleting}
                className="p-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 interactive-tap cursor-pointer"
                title="Hapus dokumen permanen (Super Admin)"
                aria-label="Hapus dokumen permanen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 interactive-tap ml-2 cursor-pointer"
              title="Tutup dialog (Esc)"
              aria-label="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Segmented Tab Control (Apple-style pill tabs for small viewports) */}
        <div className="flex md:hidden border-b border-zinc-800 bg-zinc-950/80 p-1.5 gap-1.5 px-4">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'preview'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Pratinjau PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('metadata')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'metadata'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Info & Kepatuhan</span>
          </button>
        </div>

        {/* Split-Screen Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Canvas: Embedded PDF Preview */}
          <div
            className={`flex-1 bg-zinc-950 flex flex-col border-r border-zinc-800/80 overflow-hidden ${
              activeTab === 'preview' ? 'flex' : 'hidden md:flex'
            }`}
          >
            <div className="p-2 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-400 px-4">
              <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                Pratinjau Resmi (Watermarked & Verified Stream)
              </span>
              <a
                href={streamUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium text-[11px]"
              >
                <span>Buka Layar Penuh</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex-1 w-full h-full relative bg-zinc-900/40">
              <iframe
                src={streamUrl}
                className="w-full h-full border-none"
                title="PDF Document Preview"
              />
            </div>
          </div>

          {/* Right Panel: Metadata & IMS Compliance Badges */}
          <div
            className={`w-full md:w-80 lg:w-96 p-5 overflow-y-auto space-y-5 bg-zinc-900/30 ${
              activeTab === 'metadata' ? 'block' : 'hidden md:block'
            }`}
          >
            {/* Status & Validity Card */}
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Status & Validitas Dokumen
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Status Sistem:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  {doc.status || 'ACTIVE'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Kategori Taksonomi:</span>
                <span className="text-white font-medium">
                  {doc.taxonomySnapshot?.name || doc.taxonomyId?.name || 'Umum'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Tanggal Berlaku:</span>
                <span className="text-zinc-300 font-mono">
                  {doc.effectiveDate
                    ? new Date(doc.effectiveDate).toLocaleDateString('id-ID')
                    : 'Segera'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Evaluasi Berkala:</span>
                <span className="text-zinc-300 font-mono">
                  {doc.nextReviewDate
                    ? new Date(doc.nextReviewDate).toLocaleDateString('id-ID')
                    : '1 Tahun'}
                </span>
              </div>
            </div>

            {/* Official K3 Indonesia & SMK3 Statutory Card */}
            {isQhse && (
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <K3IndonesiaLogo size={28} showText={true} />
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    KEPMENAKER 1135
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                  Dokumen ini diklasifikasikan sebagai instrumen kepatuhan <strong>Keselamatan dan Kesehatan Kerja (K3)</strong> sesuai <strong>SMK3 PP No. 50/2012</strong> dan <strong>UU No. 1 Tahun 1970</strong>. Setiap salinan resmi memuat lambang resmi K3 Indonesia dan stempel terverifikasi.
                </p>
              </div>
            )}

            {/* IMS & Standard Compliance Badges */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Pemenuhan Klausul IMS & SMK3</span>
              </div>

              {(!doc.complianceMappings || doc.complianceMappings.length === 0) ? (
                <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-500">
                  Belum dipetakan ke klausul standar.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {doc.complianceMappings.map((m: any, mIdx: number) => (
                    <div
                      key={mIdx}
                      className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs"
                    >
                      <div className="font-semibold text-blue-400 font-mono text-[11px] mb-1">
                        {m.frameworkCode}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(m.clauses || []).map((c: string, cIdx: number) => (
                          <span
                            key={cIdx}
                            className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-mono"
                          >
                            Klausul {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic Custom Attributes */}
            {doc.customAttributes && Object.keys(doc.customAttributes).length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>Metadata Khusus Kategori</span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs">
                  {Object.entries(doc.customAttributes).map(([key, val]) => (
                    <div key={key} className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                        {key}:
                      </span>
                      <span className="text-zinc-200 font-medium">
                        {Array.isArray(val) ? val.join(', ') : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cryptographic Security & Verification */}
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3.5 text-xs shadow-lg">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-blue-400" />
                  <span>Verifikasi Digital On-Premise</span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Aktif
                </span>
              </div>

              {/* Scannable QR Code Canvas */}
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/90 gap-2.5">
                <div
                  onClick={() => setQrModalOpen(true)}
                  className="p-2.5 rounded-xl bg-white shadow-md cursor-pointer hover:scale-105 transition-transform group relative"
                  title="Klik untuk memperbesar QR Code"
                >
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt={`QR Code Verifikasi ${doc.docNumber}`}
                      className="w-32 h-32 rounded object-contain block"
                    />
                  ) : (
                    <div className="w-32 h-32 flex items-center justify-center bg-zinc-100 text-zinc-400">
                      <QrCode className="w-8 h-8 animate-pulse text-zinc-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center text-white text-[11px] font-semibold transition-opacity gap-1 backdrop-blur-xs">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Perbesar</span>
                  </div>
                </div>

                <span className="text-[10px] text-zinc-400 font-mono text-center">
                  Pindai dengan kamera smartphone untuk validasi dokumen resmi
                </span>

                {/* Quick Action Buttons for QR */}
                <div className="flex items-center gap-1.5 w-full pt-1">
                  <a
                    href={verifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[11px] font-medium flex items-center justify-center gap-1 interactive-tap"
                    title="Buka halaman verifikasi publik di tab baru"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Buka Link</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium flex items-center justify-center gap-1 interactive-tap cursor-pointer"
                    title="Salin tautan verifikasi ke clipboard"
                  >
                    {copiedLink ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedLink ? 'Disalin' : 'Salin'}</span>
                  </button>

                  <a
                    href={`/api/documents/${doc._id}/qrcode?download=true`}
                    download={`QR-${doc.docNumber}.png`}
                    className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium flex items-center justify-center gap-1 interactive-tap cursor-pointer"
                    title="Unduh berkas gambar QR Code (.png)"
                  >
                    <Download className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Token & Cryptographic Checksum Details */}
              <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                <div>
                  <span className="text-[10px] text-zinc-500 font-mono block">QR Token ID:</span>
                  <span className="text-blue-300 font-mono text-[11px] font-semibold break-all block">
                    {token}
                  </span>
                </div>

                {doc.currentFile?.sha256Hash && (
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono block">SHA-256 Checksum:</span>
                    <span className="text-zinc-400 font-mono text-[10px] break-all block leading-relaxed">
                      {doc.currentFile.sha256Hash}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated QR Code Inspection & Audit Dialog */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md glass-panel rounded-2xl border border-zinc-700 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">QR Code Verifikasi Resmi</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">{doc.docNumber} • Rev. {String(doc.currentVersion || 1).padStart(2, '0')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center py-2">
              <div className="p-4 rounded-2xl bg-white shadow-xl">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt={`QR Code ${doc.docNumber}`}
                    className="w-56 h-56 rounded-lg object-contain block"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center bg-zinc-100">
                    <QrCode className="w-12 h-12 text-zinc-400 animate-pulse" />
                  </div>
                )}
              </div>
              <p className="text-xs text-zinc-400 text-center mt-3 max-w-xs">
                Arahkan kamera smartphone ke QR Code di atas untuk membuka sertifikat validasi dokumen secara live.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Token:</span>
                <span className="text-blue-400 font-semibold">{token}</span>
              </div>
              <div className="flex flex-col gap-0.5 text-[11px]">
                <span className="text-zinc-500">URL Validasi:</span>
                <span className="text-zinc-300 break-all">{verifyUrl}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={verifyUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 interactive-tap"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Verifikasi</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 interactive-tap cursor-pointer"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedLink ? 'Tautan Disalin' : 'Salin Tautan'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/documents/${doc._id}/qrcode?download=true`}
                download={`QR-${doc.docNumber}.png`}
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-medium flex items-center justify-center gap-1.5 interactive-tap"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Unduh PNG</span>
              </a>
              <a
                href={`/api/documents/${doc._id}/qrcode?format=svg&download=true`}
                download={`QR-${doc.docNumber}.svg`}
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-medium flex items-center justify-center gap-1.5 interactive-tap"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>Unduh SVG</span>
              </a>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={executeDelete}
        title={`Hapus Dokumen ${doc.docNumber}?`}
        description="Dokumen fisik dan seluruh catatan riwayat versi terkait akan dihapus secara permanen dari penyimpanan on-premise."
        confirmText="Hapus Permanen"
        cancelText="Batal"
        isDestructive={true}
        loading={deleting}
      />
    </div>
  );
}
