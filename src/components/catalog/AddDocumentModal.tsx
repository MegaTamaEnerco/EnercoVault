'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FilePlus,
  Layers,
  Upload,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Award,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { SessionUser } from '@/lib/rbac';

export interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  taxonomies: any[];
  frameworks: any[];
  currentUser: SessionUser;
  onDocumentAdded: (newDoc: any) => void;
}

export function AddDocumentModal({
  isOpen,
  onClose,
  taxonomies,
  frameworks,
  currentUser,
  onDocumentAdded,
}: AddDocumentModalProps) {
  const [selectedTaxonomyId, setSelectedTaxonomyId] = useState(
    taxonomies[0]?._id?.toString() || ''
  );
  const [docNumber, setDocNumber] = useState('');
  const [title, setTitle] = useState('');
  const [accessLevel, setAccessLevel] = useState<
    'PUBLIC' | 'INTERNAL' | 'RESTRICTED' | 'CONFIDENTIAL'
  >('INTERNAL');
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});
  const [selectedClauses, setSelectedClauses] = useState<
    Record<string, string[]>
  >({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selectedTaxonomy and docNumber when modal opens
  useEffect(() => {
    if (isOpen && taxonomies.length > 0) {
      const activeTax = taxonomies.find((t) => t._id?.toString() === selectedTaxonomyId) || taxonomies[0];
      setSelectedTaxonomyId(activeTax._id.toString());
      if (!docNumber) {
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        setDocNumber(`MTE-${activeTax.codePrefix || 'DOC'}-${randomSuffix}`);
      }
    }
  }, [isOpen, taxonomies]);

  // Close on Escape key press (WCAG 2.1 AA)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentTaxonomy = taxonomies.find(
    (t) => t._id?.toString() === selectedTaxonomyId
  );

  const generateNewDocNumber = (prefix?: string) => {
    const code = prefix || currentTaxonomy?.codePrefix || 'DOC';
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setDocNumber(`MTE-${code}-${randomSuffix}`);
  };

  const handleTaxonomyChange = (id: string) => {
    setSelectedTaxonomyId(id);
    const tax = taxonomies.find((t) => t._id?.toString() === id);
    if (tax?.codePrefix) {
      generateNewDocNumber(tax.codePrefix);
    }
    setCustomAttributes({});
  };

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomAttributes((prev) => ({ ...prev, [key]: value }));
  };

  const toggleClause = (frameworkCode: string, clauseNum: string) => {
    setSelectedClauses((prev) => {
      const currentList = prev[frameworkCode] || [];
      if (currentList.includes(clauseNum)) {
        return {
          ...prev,
          [frameworkCode]: currentList.filter((c) => c !== clauseNum),
        };
      } else {
        return {
          ...prev,
          [frameworkCode]: [...currentList, clauseNum],
        };
      }
    });
  };

  // Quick preset test data fill for instant testing
  const handleQuickFill = () => {
    const sopTax = taxonomies.find((t) => t.slug === 'sop-instruksi-kerja') || taxonomies[0];
    if (sopTax) {
      setSelectedTaxonomyId(sopTax._id.toString());
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setDocNumber(`MTE-${sopTax.codePrefix || 'SOP'}-${randomSuffix}`);
      setTitle('Prosedur Tanggap Darurat & Manajemen Limbah Bahan Berbahaya (B3)');
      setAccessLevel('INTERNAL');
      setCustomAttributes({
        prosesBisnis: 'Operasional Lapangan & Mitigasi Risiko Lingkungan',
        outputRekaman: 'Formulir Manifest Limbah B3 & Berita Acara Insiden',
      });
      setSelectedClauses({
        'ISO-9001-2015': ['7.5.1', '8.5.1'],
        'ISO-14001-2015': ['6.1.2', '8.1', '8.2'],
        'ISO-45001-2018': ['8.1.2'],
        'SMK3-PP50': ['6.1', '8.1'],
      });
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !selectedTaxonomyId) {
      setError('Judul dokumen dan kategori taksonomi wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('docNumber', docNumber.trim() || '');
      formData.append('title', title.trim());
      formData.append('taxonomyId', selectedTaxonomyId);
      formData.append('accessLevel', accessLevel);
      formData.append('effectiveDate', effectiveDate);
      formData.append('customAttributes', JSON.stringify(customAttributes));

      // Build complianceMappings array
      const complianceMappings = Object.entries(selectedClauses)
        .filter(([_, clauses]) => clauses.length > 0)
        .map(([frameworkCode, clauses]) => ({ frameworkCode, clauses }));
      formData.append('complianceMappings', JSON.stringify(complianceMappings));

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan dokumen');
      }

      onDocumentAdded(data.document);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalSelectedClauses = Object.values(selectedClauses).reduce(
    (acc, curr) => acc + curr.length,
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-document-modal-title"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] glass-panel rounded-2xl border border-zinc-700/80 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="add-document-modal-title" className="text-base font-semibold text-white">
                Tambah Dokumen Baru
              </h2>
              <p className="text-xs text-zinc-400">
                Simpan dokumen ke brankas dan tautkan ke klausul standar yang sesuai
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickFill}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 interactive-tap cursor-pointer"
              title="Isi form otomatis dengan contoh data"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Isi Contoh</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 interactive-tap cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Section 1: Taxonomy / Category Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              1. Pilih Kategori Dokumen
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {taxonomies.map((tax) => {
                const isSelected = tax._id?.toString() === selectedTaxonomyId;
                return (
                  <button
                    key={tax._id.toString()}
                    type="button"
                    onClick={() => handleTaxonomyChange(tax._id.toString())}
                    className={`p-3 rounded-xl border text-left interactive-tap transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600/15 text-white shadow-sm ring-1 ring-blue-500/30'
                        : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-white">{tax.name}</div>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      Prefix: {tax.codePrefix} • Review: {tax.retentionConfig?.defaultReviewMonths || 12} Bln
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Core Document Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-zinc-300">
                  Nomor Dokumen Baku
                </label>
                <button
                  type="button"
                  onClick={() => generateNewDocNumber()}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  title="Generate nomor dokumen acak sesuai prefix taksonomi"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Generate Baru</span>
                </button>
              </div>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
                placeholder="misal: MTE-SOP-102"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Klasifikasi Akses (RBAC)
              </label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="INTERNAL">INTERNAL (Akses seluruh karyawan)</option>
                <option value="RESTRICTED">RESTRICTED (Unit & Auditor)</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL (Direksi & Super Admin)</option>
                <option value="PUBLIC">PUBLIC (Dapat diakses publik)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Judul Dokumen Resmi <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="misal: Prosedur Keselamatan Kerja di Ketinggian (Working at Height)"
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Section 3: Dynamic Custom Fields from Taxonomy */}
          {currentTaxonomy?.customFieldsSchema && currentTaxonomy.customFieldsSchema.length > 0 && (
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Kolom Khusus Taksonomi ({currentTaxonomy.name})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentTaxonomy.customFieldsSchema.map((field: any) => {
                  return (
                    <div key={field.fieldKey}>
                      <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                        {field.label} {field.isRequired && <span className="text-red-400">*</span>}
                      </label>
                      {field.fieldType === 'SELECT' ? (
                        <select
                          value={customAttributes[field.fieldKey] || ''}
                          onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="">-- Pilih {field.label} --</option>
                          {(field.options || []).map((opt: string) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.fieldType === 'NUMBER' ? 'number' : 'text'}
                          value={customAttributes[field.fieldKey] || ''}
                          onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                          placeholder={field.placeholder || `Isi ${field.label}`}
                          className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 4: Multi-Standard Clause Mappings */}
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Pemetaan Standar IMS (ISO 9001, 14001, 45001 & SMK3)</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                Terpilih: {totalSelectedClauses} Klausul
              </span>
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
                          onClick={() => toggleClause(fw.code, c.clauseNumber)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border interactive-tap transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 font-bold'
                              : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                          }`}
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

          {/* Section 5: PDF Upload or Auto-Generate */}
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Berkas Dokumen (PDF)</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Unggah berkas PDF, atau biarkan sistem membuat dokumen berstempel digital secara otomatis.
            </p>

            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
              className="text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
            />
            {selectedFile ? (
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Berkas terpilih: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <div className="text-[11px] text-blue-400/80 flex items-center gap-1 mt-1">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>Sistem akan membuat berkas template resmi secara otomatis.</span>
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-medium interactive-tap cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 interactive-tap shadow-lg shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Menyimpan ke Storage...' : 'Simpan & Publikasikan Dokumen'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
