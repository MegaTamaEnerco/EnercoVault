'use client';

import React, { useState, useRef } from 'react';
import {
  Building2,
  Save,
  RotateCcw,
  Sparkles,
  FileText,
  CheckCircle2,
  Globe,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Eye,
  Upload,
  Image as ImageIcon,
  Trash2,
  Award,
} from 'lucide-react';
import { ICompanyConfig, DEFAULT_COMPANY_CONFIG } from '@/lib/company-config-types';
import { useCompanyConfig } from '@/components/providers/CompanyConfigProvider';
import { useToast } from '@/components/ui/Toast';
import { K3IndonesiaLogo } from '@/components/common/K3IndonesiaLogo';

interface CompanyProfileConfigCardProps {
  initialConfig?: ICompanyConfig;
}

export function CompanyProfileConfigCard({
  initialConfig,
}: CompanyProfileConfigCardProps) {
  const { config: globalConfig, updateLocalConfig } = useCompanyConfig();
  const { success: toastSuccess, error: toastError } = useToast();

  const [form, setForm] = useState<ICompanyConfig>(
    initialConfig || globalConfig || DEFAULT_COMPANY_CONFIG
  );
  const [saving, setSaving] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'pdf' | 'web'>('pdf');
  const [simulateQhse, setSimulateQhse] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof ICompanyConfig, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toastError('Ukuran file logo terlalu besar. Maksimal 5 MB.');
      return;
    }

    // Validate type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toastError('Format file tidak didukung. Harap unggah PNG, JPG, SVG, atau WebP.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/system/company-config/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengunggah logo');

      setForm((prev) => ({ ...prev, logoUrl: data.logoUrl }));
      updateLocalConfig(data.config || { ...form, logoUrl: data.logoUrl });
      toastSuccess('Logo resmi perusahaan berhasil diunggah dan disimpan!');
    } catch (err: any) {
      toastError(err.message || 'Gagal mengunggah logo perusahaan');
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const res = await fetch('/api/system/company-config/logo', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus logo');

      setForm((prev) => ({ ...prev, logoUrl: '' }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      updateLocalConfig(data.config || { ...form, logoUrl: '' });
      toastSuccess('Logo resmi perusahaan berhasil dihapus.');
    } catch (err: any) {
      toastError(err.message || 'Gagal menghapus logo');
    }
  };

  const handleResetToDefault = () => {
    if (
      confirm(
        'Apakah Anda yakin ingin memulihkan seluruh identitas perusahaan ke preset default PT Enerco Persada Indonesia?'
      )
    ) {
      setForm(DEFAULT_COMPANY_CONFIG);
      toastSuccess('Preset default dimuat. Klik "Simpan Perubahan" untuk menerapkan.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.companyName.trim()) {
      toastError('Nama resmi perusahaan tidak boleh kosong.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/system/company-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan konfigurasi');

      updateLocalConfig(data.config || form);
      toastSuccess('Konfigurasi identitas & logo perusahaan berhasil diperbarui!');
    } catch (err: any) {
      toastError(err.message || 'Terjadi kesalahan saat menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-zinc-800 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">
                Profil & Identitas Perusahaan
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                Dynamic Branding & Letterhead
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sesuaikan logo resmi korporat, nama resmi, informasi sekunder, serta kop surat (letterhead) pada seluruh dokumen & sertifikat QR.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetToDefault}
          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 interactive-tap self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset ke Default</span>
        </button>
      </div>

      {/* Main Grid: Form Left, Live Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Inputs (7 cols on lg) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-5">
          {/* Logo Upload Section */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <span>Logo Resmi Perusahaan (Corporate Letterhead Logo)</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">PNG, JPG, SVG, WebP (&le; 2MB)</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Logo Preview Canvas */}
              <div className="w-24 h-24 rounded-2xl bg-zinc-950 border border-zinc-700/80 p-2 flex items-center justify-center shrink-0 relative overflow-hidden group shadow-inner">
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.logoUrl}
                    alt="Logo Perusahaan"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-600 gap-1">
                    <Building2 className="w-8 h-8 text-zinc-600" />
                    <span className="text-[9px] font-mono">Belum Ada</span>
                  </div>
                )}
              </div>

              {/* Upload Actions & Guidance */}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium flex items-center gap-1.5 interactive-tap cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{form.logoUrl ? 'Ganti Logo' : 'Unggah Logo Resmi'}</span>
                  </button>

                  {form.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 text-xs font-medium flex items-center gap-1.5 interactive-tap cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Logo</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Logo akan disematkan secara otomatis pada kop surat resmi dokumen PDF, stempel salinan terkendali, navbar aplikasi, dan sertifikat verifikasi publik.
                </p>
              </div>
            </div>
          </div>

          {/* Company Legal Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span>Nama Resmi Perusahaan (Corporate Legal Name) <span className="text-red-400">*</span></span>
              <span className="text-[10px] text-zinc-500 font-mono">Header Dokumen & Sertifikat</span>
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              placeholder="Contoh: PT Enerco Persada Indonesia"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-700 focus:border-blue-500 text-white text-xs outline-none transition-colors"
            />
            <p className="text-[11px] text-zinc-400">
              Digunakan sebagai nama entitas sah pada seluruh dokumen terkendali, audit trail, dan sertifikat QR.
            </p>
          </div>

          {/* System Name / Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Nama Brand / Sistem (System Name)
              </label>
              <input
                type="text"
                value={form.systemName}
                onChange={(e) => handleChange('systemName', e.target.value)}
                placeholder="Contoh: Enerco Vault"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-700 focus:border-blue-500 text-white text-xs outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Sub-Header Sistem (Tagline)
              </label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="Contoh: Sistem Pengendalian Dokumen Terpadu (IMS)"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-700 focus:border-blue-500 text-white text-xs outline-none transition-colors"
              />
            </div>
          </div>

          {/* Secondary Information */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Informasi Sekunder Header Kop Surat (Header Subtext)
            </label>
            <input
              type="text"
              value={form.headerSubtext}
              onChange={(e) => handleChange('headerSubtext', e.target.value)}
              placeholder="Contoh: SISTEM MANAJEMEN QHSE & LEGALITAS"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-700 focus:border-blue-500 text-white text-xs outline-none transition-colors"
            />
            <p className="text-[11px] text-zinc-400">
              Dicetak tepat di bawah nama perusahaan pada header kop surat dokumen terkendali.
            </p>
          </div>

          {/* Copyright Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Teks Hak Cipta / Footer Legalitas (Copyright Notice)
            </label>
            <input
              type="text"
              value={form.copyrightText}
              onChange={(e) => handleChange('copyrightText', e.target.value)}
              placeholder="Contoh: © 2026 PT Enerco Persada Indonesia. Hak Cipta Dilindungi Undang-Undang."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-700 focus:border-blue-500 text-white text-xs outline-none transition-colors"
            />
          </div>

          {/* Location & Website */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>Lokasi Operasional / Domisili</span>
              </label>
              <input
                type="text"
                value={form.officeLocation || ''}
                onChange={(e) => handleChange('officeLocation', e.target.value)}
                placeholder="Contoh: Jakarta, Indonesia"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-700 focus:border-blue-500 text-white text-xs outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-zinc-400" />
                <span>Situs Resmi Perusahaan</span>
              </label>
              <input
                type="text"
                value={form.websiteUrl || ''}
                onChange={(e) => handleChange('websiteUrl', e.target.value)}
                placeholder="Contoh: https://enerco.co.id"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-700 focus:border-blue-500 text-white text-xs outline-none transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 interactive-tap shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan Konfigurasi...' : 'Simpan & Terapkan Identitas Perusahaan'}</span>
            </button>
          </div>
        </form>

        {/* Live Preview (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-blue-400" />
              <span>Pratinjau Hasil Langsung (Live Preview)</span>
            </span>

            {/* Segmented control */}
            <div className="flex items-center bg-zinc-900/90 rounded-lg p-0.5 border border-zinc-800 text-[11px]">
              <button
                type="button"
                onClick={() => setActivePreviewTab('pdf')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  activePreviewTab === 'pdf'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Kop Surat PDF
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('web')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  activePreviewTab === 'web'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Navbar & Verifikasi
              </button>
            </div>
          </div>

          {activePreviewTab === 'pdf' ? (
            /* PDF Header Preview */
            <div className="p-4 rounded-xl bg-white text-zinc-900 shadow-xl border border-zinc-300 space-y-3 font-sans select-none">
              <div className="flex items-center justify-between border-b pb-1.5 text-[10px]">
                <span className="text-zinc-500 font-mono uppercase tracking-wider">
                  Pratinjau Kop Surat Resmi (Letterhead)
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-emerald-800 font-medium">
                  <input
                    type="checkbox"
                    checked={simulateQhse}
                    onChange={(e) => setSimulateQhse(e.target.checked)}
                    className="rounded accent-emerald-600"
                  />
                  <span>Dokumen SMK3 / QHSE</span>
                </label>
              </div>

              {/* Exact Header Box Mockup: 4-Cell Audit Table */}
              <div className={`rounded-lg border ${simulateQhse ? 'border-emerald-800 bg-white' : 'border-slate-700 bg-white'} overflow-hidden shadow-sm grid ${simulateQhse ? 'grid-cols-[80px_1fr_64px_130px]' : 'grid-cols-[80px_1fr_130px]'}`}>
                {/* Cell 1: Corporate Logo */}
                <div className="p-2 flex items-center justify-center border-r border-slate-200 bg-slate-50/50">
                  {form.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.logoUrl}
                      alt="Logo Kop Surat"
                      className="max-h-12 max-w-[68px] object-contain shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded border border-slate-300 bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                      LOGO
                    </div>
                  )}
                </div>

                {/* Cell 2: Corporate & System Details */}
                <div className="p-2.5 flex flex-col justify-center border-r border-slate-200 min-w-0">
                  <div className="text-[10px] font-bold text-blue-900 tracking-tight font-mono truncate">
                    {form.systemName.toUpperCase()} — INTEGRATED SYSTEM
                  </div>
                  <div className="text-xs font-bold text-slate-900 uppercase truncate">
                    {form.companyName.toUpperCase()}
                  </div>
                  <div className="text-[8.5px] text-slate-500 font-medium uppercase truncate">
                    {form.headerSubtext.toUpperCase()}
                  </div>
                  <div className="text-[8px] text-slate-400 font-medium uppercase truncate">
                    {form.officeLocation ? form.officeLocation.toUpperCase() : 'INDONESIA'}
                  </div>
                </div>

                {/* Cell 3: Statutory Emblem (SMK3 / QHSE) */}
                {simulateQhse && (
                  <div className="p-1.5 flex flex-col items-center justify-center border-r border-slate-200 bg-emerald-50/30">
                    <span className="text-[7.5px] font-bold text-emerald-800 font-mono tracking-tighter">
                      K3 INDONESIA
                    </span>
                    <div className="my-0.5">
                      <K3IndonesiaLogo size={24} showText={false} />
                    </div>
                    <span className="text-[6.5px] text-emerald-700 font-bold tracking-tighter">
                      SMK3 PP 50
                    </span>
                  </div>
                )}

                {/* Cell 4: Document Control Register Grid */}
                <div className="divide-y divide-slate-200 text-[8.5px] font-mono flex flex-col justify-between">
                  <div className="px-2 py-1 flex items-center justify-between">
                    <span className="text-slate-400 font-bold text-[7.5px]">NO. DOK</span>
                    <span className="font-bold text-slate-800 truncate max-w-[70px]">SOP-QHSE-001</span>
                  </div>
                  <div className="px-2 py-1 flex items-center justify-between">
                    <span className="text-slate-400 font-bold text-[7.5px]">REVISI</span>
                    <span className="text-slate-700">01</span>
                  </div>
                  <div className="px-2 py-1 flex items-center justify-between">
                    <span className="text-slate-400 font-bold text-[7.5px]">STATUS</span>
                    <span className="text-emerald-700 font-bold text-[8px]">TERKENDALI</span>
                  </div>
                  <div className="px-2 py-1 flex items-center justify-between">
                    <span className="text-slate-400 font-bold text-[7.5px]">{simulateQhse ? 'REGULASI' : 'DIST'}</span>
                    <span className="text-emerald-800 font-bold text-[7.5px]">{simulateQhse ? 'KEMNAKER RI' : 'INTERNAL'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="text-xs font-bold text-slate-800">
                  PEDOMAN PENGENDALIAN DOKUMEN & KESELAMATAN KERJA (K3)
                </div>
                <div className="text-[10px] text-slate-600 flex items-center gap-2">
                  <span>Kategori Taksonomi: Standar Operasional Baku (SOP)</span>
                  {simulateQhse && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold text-[9px]">
                      K3 / SMK3 Terakreditasi
                    </span>
                  )}
                </div>
                <div className="text-[9.5px] text-slate-500 leading-relaxed pt-1 italic">
                  &ldquo;Dokumen ini menetapkan persyaratan baku dalam lingkup {form.companyName}, memastikan keselarasan regulasi UU No. 1/1970 dan audit SMK3 PP No. 50/2012.&rdquo;
                </div>
              </div>

              {/* Mini Sign Off Box */}
              <div className="p-2 rounded border border-slate-300 bg-slate-50 text-[9px] flex items-center justify-between">
                <div>
                  <span className="font-bold block text-slate-700">
                    PENGESAHAN ELEKTRONIK ({form.systemName.toUpperCase()} SIGN-OFF)
                  </span>
                  <span className="text-slate-500">Status: VERIFIED & SEALED VIA SYSTEM</span>
                </div>
                <div className="w-9 h-9 bg-slate-200 border border-slate-400 rounded flex items-center justify-center text-[7px] text-slate-600 font-mono">
                  QR CODE
                </div>
              </div>
            </div>
          ) : (
            /* Web / Navbar & Verification Preview */
            <div className="space-y-3">
              {/* Navbar mockup */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="text-[10px] text-zinc-500 uppercase font-mono">Pratinjau Navbar Aplikasi</div>
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                  {form.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.logoUrl}
                      alt="Logo Navbar"
                      className="w-8 h-8 rounded-lg object-contain bg-white/10 p-1 border border-zinc-700 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-white">{form.systemName}</span>
                      <span className="px-1 py-0.2 rounded text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">v2.1</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">{form.tagline}</p>
                  </div>
                </div>
              </div>

              {/* Public Verification Footer Mockup */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="text-[10px] text-zinc-500 uppercase font-mono">Pratinjau Sertifikat Verifikasi QR</div>
                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    {form.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.logoUrl}
                        alt="Logo"
                        className="w-7 h-7 object-contain rounded bg-white/5 p-0.5 border border-zinc-700"
                      />
                    )}
                    <div>
                      <div className="text-[11px] font-semibold text-white">
                        {form.companyName}
                      </div>
                      <div className="text-[10px] text-zinc-400">{form.tagline}</div>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Salinan fisik terdaftar sah di basis data {form.companyName}</span>
                  </div>

                  <div className="text-[9.5px] text-zinc-500 pt-1 text-center border-t border-zinc-800">
                    {form.copyrightText}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
