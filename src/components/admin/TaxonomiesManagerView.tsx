'use client';

import React, { useState } from 'react';
import {
  Tags,
  Plus,
  FormInput,
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  Sliders,
  Eye,
  FileText,
  ShieldCheck,
  Award,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { SessionUser } from '@/lib/rbac';
import { CustomFieldType } from '@/models/Taxonomy';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const PRESET_COLORS = [
  { name: 'Biru (Mutu)', hex: '#3b82f6' },
  { name: 'Hijau (Lingkungan)', hex: '#10b981' },
  { name: 'Oranye (K3)', hex: '#f97316' },
  { name: 'Ungu (Legalitas)', hex: '#8b5cf6' },
  { name: 'Merah (Kritis)', hex: '#ef4444' },
  { name: 'Amber (Operasional)', hex: '#f59e0b' },
];

const ICONS = ['FileText', 'ShieldCheck', 'Award', 'AlertTriangle', 'BookOpen', 'Layers'];

export interface TaxonomiesManagerViewProps {
  initialTaxonomies: any[];
  currentUser: SessionUser;
}

interface CustomFieldDraft {
  fieldKey: string;
  label: string;
  fieldType: CustomFieldType;
  options?: string[];
  placeholder?: string;
  isRequired: boolean;
  isFilterable: boolean;
}

export function TaxonomiesManagerView({
  initialTaxonomies,
  currentUser,
}: TaxonomiesManagerViewProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [taxonomies, setTaxonomies] = useState<any[]>(initialTaxonomies);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [taxToDelete, setTaxToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [codePrefix, setCodePrefix] = useState('');
  const [colorTheme, setColorTheme] = useState('#3b82f6');
  const [icon, setIcon] = useState('FileText');
  const [customFields, setCustomFields] = useState<CustomFieldDraft[]>([]);

  // Add Field Draft State
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('TEXT');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldFilterable, setNewFieldFilterable] = useState(true);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const resetModal = () => {
    setName('');
    setCodePrefix('');
    setColorTheme('#3b82f6');
    setIcon('FileText');
    setCustomFields([]);
    setEditingTaxId(null);
    setNewFieldLabel('');
    setNewFieldKey('');
    setNewFieldType('TEXT');
    setNewFieldOptions('');
    setNewFieldRequired(false);
    setNewFieldFilterable(true);
    setIsModalOpen(false);
  };

  const handleOpenAdd = () => {
    resetModal();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tax: any) => {
    setEditingTaxId(tax._id.toString());
    setName(tax.name);
    setCodePrefix(tax.codePrefix);
    setColorTheme(tax.colorTheme || '#3b82f6');
    setIcon(tax.icon || 'FileText');
    setCustomFields(tax.customFieldsSchema ? [...tax.customFieldsSchema] : []);
    setIsModalOpen(true);
  };

  const handleAddFieldToDraft = () => {
    if (!newFieldLabel.trim()) return;

    const generatedKey =
      newFieldKey.trim() ||
      newFieldLabel
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());

    const opts =
      newFieldType === 'SELECT' || newFieldType === 'MULTI_SELECT'
        ? newFieldOptions
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const newField: CustomFieldDraft = {
      fieldKey: generatedKey,
      label: newFieldLabel.trim(),
      fieldType: newFieldType,
      options: opts,
      isRequired: newFieldRequired,
      isFilterable: newFieldFilterable,
    };

    setCustomFields((prev) => [...prev, newField]);
    setNewFieldLabel('');
    setNewFieldKey('');
    setNewFieldType('TEXT');
    setNewFieldOptions('');
    setNewFieldRequired(false);
    setNewFieldFilterable(true);
  };

  const handleRemoveFieldFromDraft = (index: number) => {
    setCustomFields((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveTaxonomy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !codePrefix.trim()) {
      setStatusMsg({ type: 'error', text: 'Nama Kategori dan Prefix Kode wajib diisi.' });
      return;
    }

    setSaving(true);
    setStatusMsg(null);

    try {
      const url = editingTaxId ? `/api/taxonomies/${editingTaxId}` : '/api/taxonomies';
      const method = editingTaxId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          codePrefix: codePrefix.trim().toUpperCase(),
          colorTheme,
          icon,
          customFieldsSchema: customFields,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan kategori');
      }

      if (editingTaxId) {
        setTaxonomies((prev) => prev.map((t) => (t._id.toString() === editingTaxId ? data : t)));
        setStatusMsg({ type: 'success', text: `Kategori "${data.name}" berhasil diperbarui!` });
      } else {
        setTaxonomies((prev) => [...prev, data]);
        setStatusMsg({ type: 'success', text: `Kategori "${data.name}" berhasil dibuat dan siap digunakan!` });
      }

      resetModal();
      setTimeout(() => setStatusMsg(null), 6000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTaxonomy = (id: string, taxName: string) => {
    setTaxToDelete({ id, name: taxName });
  };

  const confirmDeleteTaxonomy = async () => {
    if (!taxToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/taxonomies/${taxToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus kategori');
      }

      setTaxonomies((prev) => prev.filter((t) => t._id.toString() !== taxToDelete.id));
      toastSuccess(`Kategori "${taxToDelete.name}" berhasil dihapus.`);
      setTaxToDelete(null);
    } catch (err: any) {
      toastError(err.message || 'Gagal menghapus kategori.');
    } finally {
      setDeleteLoading(false);
    }
  };

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

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Tags className="w-5 h-5 text-blue-400" />
            Katalog Taksonomi & Form Builder Dinamis
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Rancang kategori dokumen baru dan definisikan atribut input khusus tanpa hardcode database.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 interactive-tap shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kategori Baru</span>
        </button>
      </div>

      {/* Taxonomy Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {taxonomies.map((tax: any) => (
          <div
            key={tax._id.toString()}
            className="glass-panel rounded-2xl p-5 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/20"
                    style={{ backgroundColor: tax.colorTheme || '#3b82f6' }}
                  />
                  <span className="font-semibold text-sm text-white">{tax.name}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-blue-300 border border-zinc-700">
                  Prefix: {tax.codePrefix}
                </span>
              </div>

              <div className="text-[11px] text-zinc-500 font-mono mb-3">
                slug: {tax.slug}
              </div>

              <div className="pt-3 border-t border-zinc-800/80">
                <div className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
                  <FormInput className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Kolom Input Form Dinamis ({tax.customFieldsSchema?.length || 0}):</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {(tax.customFieldsSchema || []).length === 0 ? (
                    <div className="text-[11px] text-zinc-600 italic">
                      Belum ada field kustom tambahan. Menggunakan form standar IMS.
                    </div>
                  ) : (
                    (tax.customFieldsSchema || []).map((f: any, fIdx: number) => (
                      <div
                        key={fIdx}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[11px] flex items-center justify-between"
                      >
                        <div>
                          <span className="text-zinc-200 font-medium">{f.label}</span>
                          <span className="text-[10px] text-zinc-500 font-mono ml-2">
                            ({f.fieldKey})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            {f.fieldType}
                          </span>
                          {f.isRequired && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                              Wajib
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-zinc-800/60">
              <button
                onClick={() => handleOpenEdit(tax)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer interactive-tap"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Edit Taksonomi & Form</span>
              </button>
              <button
                onClick={() => handleDeleteTaxonomy(tax._id.toString(), tax.name)}
                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer interactive-tap"
                title="Hapus Kategori"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Tambah / Edit Kategori & Dynamic Form Builder */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 p-6 space-y-5 shadow-2xl bg-zinc-950">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingTaxId ? 'Edit Kategori & Form Dinamis' : 'Tambah Kategori & Form Builder Baru'}
                </h3>
              </div>
              <button
                onClick={resetModal}
                className="text-zinc-500 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTaxonomy} className="space-y-4">
              {/* Category Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">
                    Nama Kategori Dokumen <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!codePrefix && !editingTaxId) {
                        setCodePrefix(
                          e.target.value
                            .slice(0, 4)
                            .toUpperCase()
                            .replace(/[^A-Z]/g, '')
                        );
                      }
                    }}
                    placeholder="Contoh: Prosedur Pengujian Laboratorium"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">
                    Prefix Nomor Dokumen <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={codePrefix}
                    onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                    placeholder="Contoh: LAB-SOP"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono uppercase"
                  />
                </div>
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Warna Indikator Taksonomi:</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColorTheme(c.hex)}
                      className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
                        colorTheme === c.hex
                          ? 'border-white bg-zinc-800 text-white font-semibold'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-400'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Custom Fields Section */}
              <div className="pt-4 border-t border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FormInput className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">
                      Field Input Form Dinamis ({customFields.length})
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Ditampilkan otomatis saat staf membuat dokumen kategori ini
                  </span>
                </div>

                {/* Draft Fields List */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {customFields.length === 0 ? (
                    <div className="p-3 rounded-xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                      Belum ada field kustom. Tambahkan field baru di bawah ini.
                    </div>
                  ) : (
                    customFields.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="text-white font-medium">{f.label}</span>
                          <span className="text-[11px] text-zinc-500 font-mono ml-2">
                            ({f.fieldKey} • {f.fieldType})
                          </span>
                          {f.options && f.options.length > 0 && (
                            <div className="text-[10px] text-zinc-400 mt-0.5">
                              Opsi: {f.options.join(', ')}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {f.isRequired && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                              Wajib
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveFieldFromDraft(idx)}
                            className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Field Builder Form */}
                <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 space-y-3">
                  <div className="text-[11px] font-semibold text-zinc-300">
                    + Tambah Kolom Input Baru ke Formulir:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      placeholder="Label (mis: Lokasi Alat)"
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    />

                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="TEXT">Teks Singkat (TEXT)</option>
                      <option value="NUMBER">Angka (NUMBER)</option>
                      <option value="DATE">Tanggal (DATE)</option>
                      <option value="SELECT">Pilihan Tunggal (SELECT)</option>
                      <option value="MULTI_SELECT">Pilihan Ganda (MULTI_SELECT)</option>
                      <option value="BOOLEAN">Ya / Tidak (BOOLEAN)</option>
                      <option value="TEXTAREA">Teks Panjang (TEXTAREA)</option>
                    </select>

                    <div className="flex items-center gap-3 px-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newFieldRequired}
                          onChange={(e) => setNewFieldRequired(e.target.checked)}
                          className="rounded text-blue-500"
                        />
                        <span>Wajib</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newFieldFilterable}
                          onChange={(e) => setNewFieldFilterable(e.target.checked)}
                          className="rounded text-blue-500"
                        />
                        <span>Filter</span>
                      </label>
                    </div>
                  </div>

                  {(newFieldType === 'SELECT' || newFieldType === 'MULTI_SELECT') && (
                    <input
                      type="text"
                      value={newFieldOptions}
                      onChange={(e) => setNewFieldOptions(e.target.value)}
                      placeholder="Daftar opsi dipisah koma (mis: Tangki A, Tangki B, Boiler, Genset)"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    />
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddFieldToDraft}
                      disabled={!newFieldLabel.trim()}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium cursor-pointer disabled:opacity-50"
                    >
                      + Tambahkan Field Ini
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={resetModal}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Taksonomi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(taxToDelete)}
        onClose={() => setTaxToDelete(null)}
        onConfirm={confirmDeleteTaxonomy}
        title={taxToDelete ? `Hapus Kategori "${taxToDelete.name}"?` : 'Hapus Kategori?'}
        description="Kategori ini beserta atribut khususnya akan dihapus. Pastikan tidak ada dokumen aktif yang menggunakan taksonomi ini."
        confirmText="Hapus Kategori"
        cancelText="Batal"
        isDestructive={true}
        loading={deleteLoading}
      />
    </div>
  );
}
