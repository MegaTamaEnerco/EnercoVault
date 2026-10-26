'use client';

import React, { useState } from 'react';
import {
  Award,
  Plus,
  BookOpen,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ListPlus,
  Layers,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { SessionUser } from '@/lib/rbac';
import { HLSGroup } from '@/models/ComplianceFramework';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export interface FrameworksManagerViewProps {
  initialFrameworks: any[];
  currentUser: SessionUser;
}

const HLS_GROUPS: { key: HLSGroup; label: string }[] = [
  { key: 'CONTEXT_OF_ORGANIZATION', label: 'Klausul 4: Konteks Organisasi' },
  { key: 'LEADERSHIP', label: 'Klausul 5: Kepemimpinan' },
  { key: 'PLANNING', label: 'Klausul 6: Perencanaan' },
  { key: 'SUPPORT', label: 'Klausul 7: Dukungan & Sumber Daya' },
  { key: 'OPERATION', label: 'Klausul 8: Operasional' },
  { key: 'PERFORMANCE_EVALUATION', label: 'Klausul 9: Evaluasi Kinerja' },
  { key: 'IMPROVEMENT', label: 'Klausul 10: Peningkatan Berkelanjutan' },
];

export function FrameworksManagerView({
  initialFrameworks,
  currentUser,
}: FrameworksManagerViewProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [frameworks, setFrameworks] = useState<any[]>(initialFrameworks);
  const [isAddFwOpen, setIsAddFwOpen] = useState(false);
  const [selectedFwForClauses, setSelectedFwForClauses] = useState<any | null>(null);
  const [fwToDelete, setFwToDelete] = useState<{ id: string; name: string } | null>(null);
  const [clauseToDelete, setClauseToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // New Framework Form
  const [fwCode, setFwCode] = useState('');
  const [fwName, setFwName] = useState('');
  const [fwCategory, setFwCategory] = useState<'QUALITY' | 'ENVIRONMENT' | 'OHS' | 'LEGAL' | 'INTEGRATED'>('QUALITY');
  const [fwVersion, setFwVersion] = useState('2026');
  const [fwBadgeColor, setFwBadgeColor] = useState('#2563eb');
  const [savingFw, setSavingFw] = useState(false);

  // Clause Drawer State
  const [clauseSearch, setClauseSearch] = useState('');
  const [newClauseNum, setNewClauseNum] = useState('');
  const [newClauseParent, setNewClauseParent] = useState('');
  const [newClauseTitle, setNewClauseTitle] = useState('');
  const [newClauseHls, setNewClauseHls] = useState<HLSGroup>('OPERATION');
  const [newClauseHint, setNewClauseHint] = useState('');
  const [savingClause, setSavingClause] = useState(false);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateFramework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fwCode.trim() || !fwName.trim()) return;

    setSavingFw(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/frameworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: fwCode.trim().toUpperCase(),
          name: fwName.trim(),
          category: fwCategory,
          version: fwVersion.trim(),
          badgeColor: fwBadgeColor,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat standar baru');

      setFrameworks((prev) => [...prev, data]);
      setStatusMsg({ type: 'success', text: `Standar "${data.name}" (${data.code}) berhasil didaftarkan!` });
      setIsAddFwOpen(false);
      setFwCode('');
      setFwName('');
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSavingFw(false);
    }
  };

  const handleDeleteFramework = (id: string, name: string) => {
    setFwToDelete({ id, name });
  };

  const confirmDeleteFramework = async () => {
    if (!fwToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/frameworks/${fwToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus standar');

      setFrameworks((prev) => prev.filter((f) => f._id.toString() !== fwToDelete.id));
      toastSuccess(`Standar "${fwToDelete.name}" berhasil dihapus.`);
      setFwToDelete(null);
    } catch (err: any) {
      toastError(err.message || 'Gagal menghapus standar.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddClause = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFwForClauses || !newClauseNum.trim() || !newClauseTitle.trim()) return;

    setSavingClause(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/frameworks/${selectedFwForClauses._id}/clauses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clauseNumber: newClauseNum.trim(),
          parentClause: newClauseParent.trim() || newClauseNum.trim().split('.')[0],
          title: newClauseTitle.trim(),
          hlsGroup: newClauseHls,
          mandatoryDocumentHint: newClauseHint.trim(),
        }),
      });

      const updatedFw = await res.json();
      if (!res.ok) throw new Error(updatedFw.error || 'Gagal menambahkan klausul');

      setSelectedFwForClauses(updatedFw);
      setFrameworks((prev) =>
        prev.map((f) => (f._id.toString() === updatedFw._id.toString() ? updatedFw : f))
      );

      setNewClauseNum('');
      setNewClauseParent('');
      setNewClauseTitle('');
      setNewClauseHint('');
      setStatusMsg({ type: 'success', text: `Klausul ${newClauseNum} berhasil ditambahkan ke ${updatedFw.code}` });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSavingClause(false);
    }
  };

  const handleDeleteClause = (clauseNumber: string) => {
    setClauseToDelete(clauseNumber);
  };

  const confirmDeleteClause = async () => {
    if (!selectedFwForClauses || !clauseToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/frameworks/${selectedFwForClauses._id}/clauses?clauseNumber=${encodeURIComponent(clauseToDelete)}`,
        { method: 'DELETE' }
      );
      const updatedFw = await res.json();
      if (!res.ok) throw new Error(updatedFw.error || 'Gagal menghapus klausul');

      setSelectedFwForClauses(updatedFw);
      setFrameworks((prev) =>
        prev.map((f) => (f._id.toString() === updatedFw._id.toString() ? updatedFw : f))
      );
      toastSuccess(`Klausul ${clauseToDelete} berhasil dihapus.`);
      setClauseToDelete(null);
    } catch (err: any) {
      toastError(err.message || 'Gagal menghapus klausul.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredClauses = selectedFwForClauses
    ? (selectedFwForClauses.clauses || []).filter((c: any) => {
        if (!clauseSearch.trim()) return true;
        const q = clauseSearch.toLowerCase();
        return (
          c.clauseNumber.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.hlsGroup?.toLowerCase().includes(q)
        );
      })
    : [];

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-xl animate-in fade-in duration-200 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-zinc-400 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-400" />
            Standar Kepatuhan & Klausul ISO / SMK3
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Kelola klausul Annex SL HLS untuk pemetaan silang otomatis ISO 9001, 14001, 45001 dan SMK3.
          </p>
        </div>
        <button
          onClick={() => setIsAddFwOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 interactive-tap shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Standar Baru</span>
        </button>
      </div>

      {/* Framework Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {frameworks.map((fw: any) => (
          <div
            key={fw._id.toString()}
            className="glass-panel rounded-2xl p-5 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-white tracking-tight">{fw.name}</span>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded border font-semibold"
                  style={{
                    borderColor: fw.badgeColor,
                    color: fw.badgeColor,
                    backgroundColor: `${fw.badgeColor}15`,
                  }}
                >
                  {fw.code}
                </span>
              </div>

              <div className="text-xs text-zinc-400 mb-3">
                Kategori:{' '}
                <span className="text-zinc-300 font-mono font-medium">{fw.category}</span> • Edisi:{' '}
                {fw.version}
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
                <div className="text-xs text-zinc-300 flex items-center gap-1.5 font-medium">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>{fw.clauses?.length || 0} Klausul Terdaftar</span>
                </div>
                <button
                  onClick={() => setSelectedFwForClauses(fw)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Kelola Klausul</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-zinc-800/60">
              <button
                onClick={() => setSelectedFwForClauses(fw)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer interactive-tap"
              >
                <ListPlus className="w-3.5 h-3.5 text-blue-400" />
                <span>Buka Detail Klausul</span>
              </button>
              <button
                onClick={() => handleDeleteFramework(fw._id.toString(), fw.name)}
                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer interactive-tap"
                title="Hapus Standar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Tambah Standar Baru */}
      {isAddFwOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-zinc-800 p-6 space-y-4 shadow-2xl bg-zinc-950">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Tambah Standar Kepatuhan Baru</h3>
              </div>
              <button
                onClick={() => setIsAddFwOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFramework} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">
                  Kode Standar <span className="text-red-400">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={fwCode}
                  onChange={(e) => setFwCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: ISO-27001-2022 atau SNI-19-14001"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">
                  Nama Lengkap Standar <span className="text-red-400">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={fwName}
                  onChange={(e) => setFwName(e.target.value)}
                  placeholder="Contoh: ISO 27001:2022 - Keamanan Informasi & Siber"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Kategori Scope:</label>
                  <select
                    value={fwCategory}
                    onChange={(e) => setFwCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="QUALITY">QUALITY (Mutu)</option>
                    <option value="ENVIRONMENT">ENVIRONMENT (Lingkungan)</option>
                    <option value="OHS">OHS (K3 & Keselamatan)</option>
                    <option value="LEGAL">LEGAL (Regulasi RI)</option>
                    <option value="INTEGRATED">INTEGRATED (IMS Terpadu)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Edisi / Versi:</label>
                  <input
                    type="text"
                    value={fwVersion}
                    onChange={(e) => setFwVersion(e.target.value)}
                    placeholder="2022"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Warna Badge Standar:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fwBadgeColor}
                    onChange={(e) => setFwBadgeColor(e.target.value)}
                    className="w-10 h-8 rounded-lg bg-transparent border border-zinc-700 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={fwBadgeColor}
                    onChange={(e) => setFwBadgeColor(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddFwOpen(false)}
                  disabled={savingFw}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingFw}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  <span>{savingFw ? 'Mendaftarkan...' : 'Daftarkan Standar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Drawer: Kelola Klausul Standar */}
      {selectedFwForClauses && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 p-6 space-y-5 shadow-2xl bg-zinc-950">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5" style={{ color: selectedFwForClauses.badgeColor }} />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Daftar Klausul: {selectedFwForClauses.name}
                  </h3>
                  <div className="text-[11px] font-mono text-zinc-400">
                    Kode: {selectedFwForClauses.code} • Total: {selectedFwForClauses.clauses?.length || 0} Klausul
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedFwForClauses(null)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add New Clause Box */}
            <form
              onSubmit={handleAddClause}
              className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3"
            >
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                <span>Tambah Klausul Baru ke Standar Ini:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  required
                  value={newClauseNum}
                  onChange={(e) => {
                    setNewClauseNum(e.target.value);
                    if (!newClauseParent) setNewClauseParent(e.target.value.split('.')[0]);
                  }}
                  placeholder="Nomor Klausul (mis: 8.5.2)"
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                />

                <input
                  type="text"
                  required
                  value={newClauseTitle}
                  onChange={(e) => setNewClauseTitle(e.target.value)}
                  placeholder="Judul Klausul (mis: Identifikasi & Mampu Telusur)"
                  className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />

                <select
                  value={newClauseHls}
                  onChange={(e) => setNewClauseHls(e.target.value as HLSGroup)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {HLS_GROUPS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={newClauseHint}
                  onChange={(e) => setNewClauseHint(e.target.value)}
                  placeholder="Hint Dokumen Wajib (mis: SOP Penandaan Material, Tagging Log)"
                  className="flex-1 w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={savingClause}
                  className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/30 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{savingClause ? 'Menambahkan...' : 'Tambah Klausul'}</span>
                </button>
              </div>
            </form>

            {/* Search Filter Klausul */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={clauseSearch}
                onChange={(e) => setClauseSearch(e.target.value)}
                placeholder="Cari klausul berdasarkan nomor atau judul..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Klausul Table */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400">
                    <th className="py-2.5 px-3 w-24">Nomor</th>
                    <th className="py-2.5 px-3">Judul Klausul</th>
                    <th className="py-2.5 px-3">Grup Annex SL / HLS</th>
                    <th className="py-2.5 px-3">Petunjuk Dokumen Wajib</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {filteredClauses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500">
                        Tidak ada klausul yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredClauses.map((c: any, idx: number) => (
                      <tr key={idx} className="hover:bg-zinc-900/40">
                        <td className="py-2 px-3 font-mono font-bold text-blue-400">
                          {c.clauseNumber}
                        </td>
                        <td className="py-2 px-3 font-medium text-white">{c.title}</td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            {c.hlsGroup || 'N/A'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-zinc-400 text-[11px]">
                          {c.mandatoryDocumentHint || '—'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleDeleteClause(c.clauseNumber)}
                            className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer"
                            title="Hapus Klausul"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedFwForClauses(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-medium cursor-pointer"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal for Framework Deletion */}
      <ConfirmModal
        isOpen={Boolean(fwToDelete)}
        onClose={() => setFwToDelete(null)}
        onConfirm={confirmDeleteFramework}
        title={fwToDelete ? `Hapus Standar ${fwToDelete.name}?` : 'Hapus Standar?'}
        description="Standar beserta seluruh klausul terkait akan dihapus. Pemetaan dokumen lama pada standar ini tidak dapat diakses lagi."
        confirmText="Hapus Standar"
        cancelText="Batal"
        isDestructive={true}
        loading={deleteLoading}
      />

      {/* Confirm Modal for Clause Deletion */}
      <ConfirmModal
        isOpen={Boolean(clauseToDelete)}
        onClose={() => setClauseToDelete(null)}
        onConfirm={confirmDeleteClause}
        title={`Hapus Klausul ${clauseToDelete}?`}
        description={`Klausul ini akan dihapus dari daftar klausul standar ${selectedFwForClauses?.code}.`}
        confirmText="Hapus Klausul"
        cancelText="Batal"
        isDestructive={true}
        loading={deleteLoading}
      />
    </div>
  );
}
