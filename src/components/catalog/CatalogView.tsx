'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FolderTree,
  Search,
  Plus,
  Eye,
  Download,
  Award,
  Layers,
  FileText,
  Filter,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Archive,
  CheckSquare,
  Square,
  Package,
  Loader2,
  X,
} from 'lucide-react';
import { SessionUser, can, isSuperAdmin } from '@/lib/rbac';
import { DocumentModal } from '@/components/viewer/DocumentModal';
import { AddDocumentModal } from '@/components/catalog/AddDocumentModal';
import { isSmk3OrQhseDocument } from '@/lib/qhse-detector';
import { K3IndonesiaLogo } from '@/components/common/K3IndonesiaLogo';

export interface CatalogViewProps {
  initialDocuments: any[];
  taxonomies: any[];
  frameworks: any[];
  currentUser: SessionUser;
}

export function CatalogView({
  initialDocuments,
  taxonomies,
  frameworks,
  currentUser,
}: CatalogViewProps) {
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<any[]>(initialDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaxonomySlug, setSelectedTaxonomySlug] = useState('all');
  const [selectedFramework, setSelectedFramework] = useState('all');
  const [selectedDocForModal, setSelectedDocForModal] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Multi-Select for Virtual Audit / Tender Bundling
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [bundleName, setBundleName] = useState('MTE_IMS_TENDER_BUNDLE_2026');
  const [isBundling, setIsBundling] = useState(false);
  const [bundleError, setBundleError] = useState<string | null>(null);

  const canCreate = can(currentUser, 'document:create') || isSuperAdmin(currentUser);
  const canBundle =
    can(currentUser, 'bundle:export_zip') ||
    can(currentUser, 'document:download') ||
    isSuperAdmin(currentUser);

  // Auto-open modal if ?action=add in URL
  useEffect(() => {
    if (searchParams.get('action') === 'add' && canCreate) {
      setIsAddModalOpen(true);
    }
  }, [searchParams, canCreate]);

  // Filter documents based on query, taxonomy, and framework
  const filteredDocuments = documents.filter((doc) => {
    if (doc.isDeleted) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = doc.docNumber?.toLowerCase().includes(q);
      const matchTitle = doc.title?.toLowerCase().includes(q);
      const matchTax = doc.taxonomySnapshot?.name?.toLowerCase().includes(q);
      const matchClauses = (doc.complianceMappings || []).some(
        (m: any) =>
          m.frameworkCode.toLowerCase().includes(q) ||
          (m.clauses || []).some((c: string) => c.toLowerCase().includes(q))
      );
      if (!matchNumber && !matchTitle && !matchTax && !matchClauses) {
        return false;
      }
    }

    // Taxonomy filter
    if (selectedTaxonomySlug !== 'all') {
      const tax = taxonomies.find((t) => t.slug === selectedTaxonomySlug);
      const docTaxId = doc.taxonomyId?._id?.toString() || doc.taxonomyId?.toString();
      if (tax && docTaxId !== tax._id?.toString()) {
        return false;
      }
    }

    // Framework filter
    if (selectedFramework !== 'all') {
      const hasFw = (doc.complianceMappings || []).some((m: any) =>
        selectedFramework === 'ISO-ALL'
          ? m.frameworkCode.startsWith('ISO')
          : m.frameworkCode === selectedFramework
      );
      if (!hasFw) return false;
    }

    return true;
  });

  const allFilteredSelected =
    filteredDocuments.length > 0 &&
    filteredDocuments.every((d) => selectedDocIds.includes(d._id.toString()));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      // Unselect all filtered documents
      const filteredIds = new Set(filteredDocuments.map((d) => d._id.toString()));
      setSelectedDocIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      // Select all filtered documents
      const filteredIds = filteredDocuments.map((d) => d._id.toString());
      setSelectedDocIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDocumentAdded = (newDoc: any) => {
    setSelectedTaxonomySlug('all');
    setSelectedFramework('all');
    setSearchQuery('');
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDocForModal(newDoc);
    setSuccessMsg(`Dokumen ${newDoc.docNumber} ("${newDoc.title}") berhasil diterbitkan & disimpan ke Vault.`);
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  const handleDocumentDeleted = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d._id?.toString() !== id));
    setSelectedDocIds((prev) => prev.filter((x) => x !== id));
  };

  const handleDownloadBundle = async () => {
    if (selectedDocIds.length === 0) return;
    setIsBundling(true);
    setBundleError(null);

    try {
      const res = await fetch('/api/storage/bundle-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: selectedDocIds,
          bundleName: bundleName.trim() || 'EnercoVault_Audit_Bundle',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Gagal mengunduh bundle (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bundleName.trim() || 'EnercoVault_Audit_Bundle'}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setIsBundleModalOpen(false);
      setSuccessMsg(
        `Bundel "${bundleName}" (${selectedDocIds.length} dokumen) berhasil dikemas ke dalam format ZIP berserta Index Manifest.`
      );
      setTimeout(() => setSuccessMsg(null), 7000);
    } catch (err: any) {
      setBundleError(err.message || 'Terjadi kesalahan saat membuat bundel ZIP');
    } finally {
      setIsBundling(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg shadow-emerald-500/5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-400 hover:text-white font-medium text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Top action & header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-blue-400" />
            Katalog Dokumen Terintegrasi (IMS)
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Total {documents.length} dokumen terkendali sah dengan stempel validasi, QR token & watermark on-the-fly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canBundle && selectedDocIds.length > 0 && (
            <button
              onClick={() => setIsBundleModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-2 interactive-tap shadow-lg shadow-amber-600/20 cursor-pointer animate-pulse"
            >
              <Package className="w-4 h-4" />
              <span>Unduh Bundel ({selectedDocIds.length})</span>
            </button>
          )}

          {canCreate && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 interactive-tap shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Dokumen Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* IMS Perspective Switcher Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs font-medium">
        <button
          onClick={() => setSelectedFramework('all')}
          className={`px-3 py-1.5 rounded-lg interactive-tap transition-all cursor-pointer ${
            selectedFramework === 'all'
              ? 'bg-blue-600 text-white font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Semua Dokumen ({documents.length})
        </button>
        <button
          onClick={() => setSelectedFramework('ISO-9001-2015')}
          className={`px-3 py-1.5 rounded-lg interactive-tap transition-all cursor-pointer ${
            selectedFramework === 'ISO-9001-2015'
              ? 'bg-blue-600 text-white font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Fokus Mutu (ISO 9001)
        </button>
        <button
          onClick={() => setSelectedFramework('ISO-14001-2015')}
          className={`px-3 py-1.5 rounded-lg interactive-tap transition-all cursor-pointer ${
            selectedFramework === 'ISO-14001-2015'
              ? 'bg-emerald-600 text-white font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Fokus Lingkungan (ISO 14001)
        </button>
        <button
          onClick={() => setSelectedFramework('ISO-45001-2018')}
          className={`px-3 py-1.5 rounded-lg interactive-tap transition-all cursor-pointer ${
            selectedFramework === 'ISO-45001-2018'
              ? 'bg-orange-600 text-white font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Fokus K3 (ISO 45001 & SMK3)
        </button>
      </div>

      {/* Search & Category Pills */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nomor dokumen, judul resmi, klausul ISO, atau kata kunci..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        {/* Dynamic Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <button
            onClick={() => setSelectedTaxonomySlug('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium interactive-tap transition-all cursor-pointer ${
              selectedTaxonomySlug === 'all'
                ? 'bg-zinc-700 text-white font-semibold'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            Semua Kategori ({documents.length})
          </button>
          {taxonomies.map((tax) => {
            const isSelected = selectedTaxonomySlug === tax.slug;
            const count = documents.filter((d) => {
              const dTaxId = d.taxonomyId?._id?.toString() || d.taxonomyId?.toString();
              return dTaxId === tax._id?.toString();
            }).length;

            return (
              <button
                key={tax._id.toString()}
                onClick={() => setSelectedTaxonomySlug(tax.slug)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium interactive-tap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-semibold'
                    : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                <span>{tax.name}</span>
                <span className="text-[10px] opacity-60 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-zinc-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400">
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    title={allFilteredSelected ? 'Batalkan Semua Pilihan' : 'Pilih Semua Dokumen'}
                    className="p-1 text-zinc-400 hover:text-blue-400 cursor-pointer"
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 font-medium">Nomor Dokumen</th>
                <th className="py-3 px-4 font-medium">Judul Dokumen</th>
                <th className="py-3 px-4 font-medium">Kategori</th>
                <th className="py-3 px-4 font-medium">Klasifikasi</th>
                <th className="py-3 px-4 font-medium">Versi</th>
                <th className="py-3 px-4 font-medium">Pemenuhan Standar</th>
                <th className="py-3 px-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                    <div>Belum ada dokumen yang cocok dengan filter atau kata kunci ini.</div>
                    {canCreate && (
                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="mt-3 px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-medium interactive-tap inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Dokumen Baru</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc: any) => {
                  const isSelected = selectedDocIds.includes(doc._id.toString());

                  return (
                    <tr
                      key={doc._id.toString()}
                      className={`hover:bg-zinc-800/40 transition-colors group cursor-pointer focus:outline-none focus:bg-zinc-800/60 ${
                        isSelected ? 'bg-blue-950/20 border-l-2 border-l-blue-500' : ''
                      }`}
                      onClick={() => setSelectedDocForModal(doc)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Buka dokumen ${doc.docNumber}: ${doc.title}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedDocForModal(doc);
                        }
                      }}
                    >
                      <td
                        className="py-3 px-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectDoc(doc._id.toString());
                        }}
                      >
                        <button className="p-1 cursor-pointer">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-600 hover:text-zinc-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-blue-400 group-hover:underline">
                        {doc.docNumber}
                      </td>
                      <td className="py-3 px-4 text-white font-medium">
                        <div className="line-clamp-1">{doc.title}</div>
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        {doc.taxonomySnapshot?.name || doc.taxonomyId?.name || 'Umum'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            doc.accessLevel === 'CONFIDENTIAL'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : doc.accessLevel === 'RESTRICTED'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          }`}
                        >
                          {doc.accessLevel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">
                        Rev. {String(doc.currentVersion || 1).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {isSmk3OrQhseDocument(doc) && (
                            <span
                              className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-semibold"
                              title="Instrumen Kepatuhan SMK3 PP 50 / K3 Indonesia"
                            >
                              <K3IndonesiaLogo size={12} showText={false} />
                              <span>K3</span>
                            </span>
                          )}
                          {(doc.complianceMappings || []).map((m: any, mIdx: number) => (
                            <span
                              key={mIdx}
                              className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono"
                            >
                              {m.frameworkCode}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()} // Prevent row click
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedDocForModal(doc)}
                            title="Buka Document Viewer Modal"
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 interactive-tap cursor-pointer text-[11px] font-medium inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span>Lihat</span>
                          </button>
                          <a
                            href={`/api/storage/stream/${doc._id}?download=true`}
                            title="Unduh Salinan Terkendali"
                            className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 interactive-tap cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Multi-Select Action Dock */}
      {selectedDocIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/90 border border-blue-500/40 shadow-2xl shadow-blue-500/10 rounded-2xl p-2.5 sm:px-5 sm:py-3 flex items-center gap-3 sm:gap-6 backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
            <span className="text-xs font-semibold text-white">
              {selectedDocIds.length} Dokumen Terpilih
            </span>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDocIds([])}
              className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-lg cursor-pointer"
            >
              Batal
            </button>

            {canBundle && (
              <button
                onClick={() => setIsBundleModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 interactive-tap cursor-pointer shadow-md shadow-blue-600/30"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Unduh Bundel Tender (ZIP)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Virtual Audit / Tender Bundle Download Modal */}
      {isBundleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-zinc-800 p-6 space-y-4 shadow-2xl bg-zinc-950">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Ekspor Bundel Virtual Audit / Tender (ZIP)
                </h3>
              </div>
              <button
                onClick={() => setIsBundleModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Enerco Vault akan mengemas <strong className="text-white">{selectedDocIds.length} dokumen</strong> terpilih
              ke dalam arsip ZIP mandiri ber-watermark resmi untuk keperluan tender atau audit ISO/SMK3,
              lengkap dengan file <strong className="text-blue-300 font-mono">INDEX_MANIFEST.txt</strong>.
            </p>

            {bundleError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {bundleError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Nama Berkas Bundel ZIP:
              </label>
              <input
                type="text"
                value={bundleName}
                onChange={(e) => setBundleName(e.target.value)}
                placeholder="Contoh: BUNDEL_AUDIT_TAHAP1_2026"
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <div className="text-zinc-300 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pengamanan Otomatis Bundel:</span>
              </div>
              <div>• Watermark dinamis tercetak pada setiap halaman PDF (Nama pengunduh & waktu).</div>
              <div>• Manifest indeks menyertakan SHA-256 integrity checksum & token verifikasi QR.</div>
              <div>• Setiap aktivitas ekspor bundel dicatat secara kekal pada Audit Log sistem.</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setIsBundleModalOpen(false)}
                disabled={isBundling}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDownloadBundle}
                disabled={isBundling}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
              >
                {isBundling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengemas & Memberi Watermark...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Buat & Unduh Berkas ZIP</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split-Screen Document Viewer Modal */}
      <DocumentModal
        document={selectedDocForModal}
        isOpen={Boolean(selectedDocForModal)}
        onClose={() => setSelectedDocForModal(null)}
        currentUser={currentUser}
        onDeleted={handleDocumentDeleted}
      />

      {/* Add Document Modal */}
      <AddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        taxonomies={taxonomies}
        frameworks={frameworks}
        currentUser={currentUser}
        onDocumentAdded={handleDocumentAdded}
      />
    </div>
  );
}

