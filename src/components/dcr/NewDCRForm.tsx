'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GitPullRequest,
  Sparkles,
  FileText,
  Layers,
  Award,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { SessionUser } from '@/lib/rbac';

export interface NewDCRFormProps {
  documents: any[];
  taxonomies: any[];
  frameworks: any[];
  currentUser: SessionUser;
}

export function NewDCRForm({
  documents,
  taxonomies,
  frameworks,
  currentUser,
}: NewDCRFormProps) {
  const router = useRouter();

  const [type, setType] = useState<'REVISION' | 'NEW_DOCUMENT' | 'OBSOLETE'>('REVISION');
  const [targetDocumentId, setTargetDocumentId] = useState(
    documents[0]?._id?.toString() || ''
  );
  const [proposedTaxonomyId, setProposedTaxonomyId] = useState(
    taxonomies[0]?._id?.toString() || ''
  );
  const [title, setTitle] = useState('');
  const [reasonForChange, setReasonForChange] = useState('');
  const [selectedClauses, setSelectedClauses] = useState<Record<string, string[]>>({});
  const [suggestedHls, setSuggestedHls] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTargetDoc = documents.find(
    (d) => d._id?.toString() === targetDocumentId
  );

  const handleDocumentChange = (id: string) => {
    setTargetDocumentId(id);
    const doc = documents.find((d) => d._id?.toString() === id);
    if (doc) {
      setTitle(`Revisi: ${doc.title}`);
      if (doc.taxonomyId?._id) {
        setProposedTaxonomyId(doc.taxonomyId._id.toString());
      }
      // Populate existing mappings
      const initialMap: Record<string, string[]> = {};
      (doc.complianceMappings || []).forEach((m: any) => {
        initialMap[m.frameworkCode] = m.clauses || [];
      });
      setSelectedClauses(initialMap);
    }
  };

  // Smart Clause Recommender: When selecting clause, recommend matching HLS clauses in other frameworks
  const toggleClause = (fwCode: string, clauseNum: string, hlsGroup?: string) => {
    setSelectedClauses((prev) => {
      const current = prev[fwCode] || [];
      const updated = current.includes(clauseNum)
        ? current.filter((c) => c !== clauseNum)
        : [...current, clauseNum];
      return { ...prev, [fwCode]: updated };
    });

    if (hlsGroup) {
      setSuggestedHls(hlsGroup);
    }
  };

  const applySuggestedHls = (hls: string) => {
    const updated = { ...selectedClauses };
    for (const fw of frameworks) {
      const matching = (fw.clauses || []).filter((c: any) => c.hlsGroup === hls);
      if (matching.length > 0) {
        const existing = updated[fw.code] || [];
        const toAdd = matching.map((m: any) => m.clauseNumber);
        updated[fw.code] = Array.from(new Set([...existing, ...toAdd]));
      }
    }
    setSelectedClauses(updated);
  };

  // 1-Click quick fill test preset
  const handleQuickFill = () => {
    if (documents.length > 0) {
      const doc = documents[0];
      setTargetDocumentId(doc._id.toString());
      setType('REVISION');
      setTitle(`Pembaruan Prosedur Terkait Integrasi Audit Internal & Evaluasi Kepatuhan`);
      setReasonForChange(
        'Penyesuaian tata laksana pelaporan audit mutu dan kepatuhan lingkungan sesuai hasil Management Review Meeting Q3 2026 dan rekomendasi auditor eksternal.'
      );
      setSelectedClauses({
        'ISO-9001-2015': ['9.2', '9.3'],
        'ISO-14001-2015': ['9.2'],
        'ISO-45001-2018': ['9.2'],
        'SMK3-PP50': ['11.1'],
      });
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !reasonForChange.trim()) {
      setError('Judul usulan DCR dan alasan perubahan wajib diisi.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const complianceMappings = Object.entries(selectedClauses)
        .filter(([_, clauses]) => clauses.length > 0)
        .map(([frameworkCode, clauses]) => ({ frameworkCode, clauses }));

      const payload = {
        title: title.trim(),
        type,
        targetDocumentId: type === 'REVISION' || type === 'OBSOLETE' ? targetDocumentId : undefined,
        proposedTaxonomyId,
        reasonForChange: reasonForChange.trim(),
        proposedMetadata: {
          title: title.trim(),
          complianceMappings,
        },
      };

      const res = await fetch('/api/dcr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengajukan DCR');
      }

      router.push('/dcr');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quick fill header banner */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-300 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Ingin menguji alur DCR dengan cepat?</span>
        </div>
        <button
          type="button"
          onClick={handleQuickFill}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold interactive-tap cursor-pointer shadow-sm"
        >
          ⚡ Isi Contoh Usulan (1-Klik)
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Proposal Type Selector */}
      <div>
        <label className="block text-xs font-semibold text-zinc-300 mb-2">
          1. Tipe Usulan Dokumen (DCR Type)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              setType('REVISION');
              if (documents[0]) handleDocumentChange(documents[0]._id.toString());
            }}
            className={`p-3.5 rounded-xl border text-left interactive-tap transition-all cursor-pointer ${
              type === 'REVISION'
                ? 'border-blue-500 bg-blue-600/15 text-white ring-1 ring-blue-500/30'
                : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800/60'
            }`}
          >
            <div className="font-semibold text-xs text-white">REVISI DOKUMEN</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Perubahan / pembaruan versi dokumen yang telah aktif di Vault.
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setType('NEW_DOCUMENT');
              setTitle('');
              setSelectedClauses({});
            }}
            className={`p-3.5 rounded-xl border text-left interactive-tap transition-all cursor-pointer ${
              type === 'NEW_DOCUMENT'
                ? 'border-blue-500 bg-blue-600/15 text-white ring-1 ring-blue-500/30'
                : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800/60'
            }`}
          >
            <div className="font-semibold text-xs text-white">DOKUMEN BARU</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Penerbitan baru (belum memiliki nomor dokumen induk).
            </div>
          </button>

          <button
            type="button"
            onClick={() => setType('OBSOLETE')}
            className={`p-3.5 rounded-xl border text-left interactive-tap transition-all cursor-pointer ${
              type === 'OBSOLETE'
                ? 'border-red-500 bg-red-600/15 text-white ring-1 ring-red-500/30'
                : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800/60'
            }`}
          >
            <div className="font-semibold text-xs text-red-300">PENARIKAN (OBSOLETE)</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Usulan penghapusan / penarikan dokumen dari sirkulasi aktif.
            </div>
          </button>
        </div>
      </div>

      {/* 2. Target Document Picker (if REVISION or OBSOLETE) */}
      {(type === 'REVISION' || type === 'OBSOLETE') && (
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            2. Pilih Dokumen Induk yang Ingin Diubah
          </label>
          <select
            value={targetDocumentId}
            onChange={(e) => handleDocumentChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {documents.map((d) => (
              <option key={d._id.toString()} value={d._id.toString()}>
                [{d.docNumber}] {d.title} (Rev. {d.currentVersion})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 3. Title of DCR */}
      <div>
        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
          Judul Usulan Perubahan <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="misal: Pembaruan Prosedur Kerja di Ketinggian Menyesuaikan Standar SMK3 PP 50/2012"
          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          required
        />
      </div>

      {/* 4. Reason for Change */}
      <div>
        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
          Latar Belakang & Alasan Perubahan (Justifikasi) <span className="text-red-400">*</span>
        </label>
        <textarea
          value={reasonForChange}
          onChange={(e) => setReasonForChange(e.target.value)}
          rows={3}
          placeholder="Jelaskan temuan audit, insiden lapangan, atau kebutuhan regulasi baru yang mendasari perubahan..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          required
        />
      </div>

      {/* 5. Smart Clause Recommender (Annex SL) */}
      <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Pemetaan Klausul Standar & Smart Recommender</span>
          </div>
          {suggestedHls && (
            <button
              type="button"
              onClick={() => applySuggestedHls(suggestedHls)}
              className="text-[10px] text-blue-300 bg-blue-600/20 px-2 py-0.5 rounded border border-blue-500/30 flex items-center gap-1 cursor-pointer hover:bg-blue-600/30"
            >
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span>Sinkronkan Klausul Terkait ({suggestedHls})</span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          {frameworks.map((fw) => (
            <div key={fw._id.toString()} className="text-xs">
              <div className="font-semibold text-zinc-300 mb-1 flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: fw.badgeColor || '#3b82f6' }}
                />
                <span>{fw.code} ({fw.name})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(fw.clauses || []).map((c: any) => {
                  const isSelected = (selectedClauses[fw.code] || []).includes(c.clauseNumber);
                  return (
                    <button
                      key={c.clauseNumber}
                      type="button"
                      onClick={() => toggleClause(fw.code, c.clauseNumber, c.hlsGroup)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border interactive-tap transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 font-bold'
                          : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                      title={c.hlsGroup ? `Annex SL Group: ${c.hlsGroup}` : undefined}
                    >
                      {c.clauseNumber} {c.title}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-medium interactive-tap cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 interactive-tap shadow-lg shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
        >
          <GitPullRequest className="w-4 h-4" />
          <span>{loading ? 'Menerbitkan Usulan...' : 'Kirim Usulan DCR ke Workflow'}</span>
        </button>
      </div>
    </form>
  );
}
