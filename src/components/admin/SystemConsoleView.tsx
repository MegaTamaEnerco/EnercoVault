'use client';

import React, { useState } from 'react';
import {
  Terminal,
  HardDrive,
  Database,
  RefreshCw,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FolderLock,
  Lock,
  Layers,
  FileCheck,
} from 'lucide-react';
import { SessionUser } from '@/lib/rbac';
import { ICompanyConfig } from '@/lib/company-config-types';
import { CompanyProfileConfigCard } from './CompanyProfileConfigCard';

export interface SystemConsoleViewProps {
  stats: {
    totalDocs: number;
    totalUsers: number;
    totalRoles: number;
    totalTaxonomies: number;
    totalFrameworks: number;
    totalDcrs: number;
  };
  currentUser: SessionUser;
  initialCompanyConfig?: ICompanyConfig;
}

export function SystemConsoleView({
  stats,
  currentUser,
  initialCompanyConfig,
}: SystemConsoleViewProps) {
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunAudit = async () => {
    setAuditLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/system/audit-checksums', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit gagal dijalankan');
      setAuditResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            System Console & Storage Maintenance
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Panel kendali infrastruktur on-premise, verifikasi integritas hash SHA-256, dan snapshot database (Khusus Super Admin).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/system/backup"
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 interactive-tap shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Snapshot Backup (JSON)</span>
          </a>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Company Identity & Secondary Info Configuration */}
      <CompanyProfileConfigCard initialConfig={initialCompanyConfig} />

      {/* Main Grid: Storage & Database Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* On-Premise Storage Engine Card */}
        <div className="glass-panel rounded-2xl p-5 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">
                Custom On-Premise Storage Engine
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              Zero-Cloud Active
            </span>
          </div>

          <p className="text-xs text-zinc-400">
            Penyimpanan terisolasi lokal pada disk server tanpa ketergantungan cloud (Zero S3/R2).
          </p>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-500">Root Directory:</span>
              <span className="text-zinc-200">./vault-storage</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-500">Active Storage:</span>
              <span className="text-emerald-400">ONLINE (/storage/active/YYYY/MM)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-500">Archive Vault:</span>
              <span className="text-blue-400">ONLINE (/storage/archive/YYYY/MM)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-500">Staging Temp:</span>
              <span className="text-zinc-400">ONLINE (/temp_uploads)</span>
            </div>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={auditLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center justify-center gap-2 interactive-tap cursor-pointer border border-zinc-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
            <span>
              {auditLoading ? 'Menghitung Checksum SHA-256...' : 'Jalankan Audit Integritas Checksum SHA-256'}
            </span>
          </button>
        </div>

        {/* Database & Infrastructure Metrics */}
        <div className="glass-panel rounded-2xl p-5 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">
                Database Engine & Snapshot
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
              MongoDB 7.0+ Active
            </span>
          </div>

          <p className="text-xs text-zinc-400">
            Metrik koleksi data terindeks dan integritas relasi referensial.
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px] uppercase font-mono">Dokumen Vault</span>
              <span className="text-lg font-bold text-white tracking-tight">{stats.totalDocs}</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px] uppercase font-mono">Usulan DCR</span>
              <span className="text-lg font-bold text-white tracking-tight">{stats.totalDcrs}</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px] uppercase font-mono">Akun Pengguna</span>
              <span className="text-lg font-bold text-white tracking-tight">{stats.totalUsers}</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px] uppercase font-mono">Role Terdaftar</span>
              <span className="text-lg font-bold text-white tracking-tight">{stats.totalRoles}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Standar Kepatuhan: {stats.totalFrameworks} | Kategori Taksonomi: {stats.totalTaxonomies}</span>
            <span className="text-emerald-400 font-mono">CONNECTED</span>
          </div>
        </div>
      </div>

      {/* SHA-256 Audit Results Section */}
      {auditResult && (
        <div className="glass-panel rounded-2xl p-5 border border-zinc-800 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Laporan Hasil Verifikasi Integritas Berkas (SHA-256)
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Total diperiksa: {auditResult.totalChecked} berkas • Cocok: {auditResult.matchingCount} • Korup: {auditResult.corruptedCount} • Hilang: {auditResult.missingCount}
                </p>
              </div>
            </div>

            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                auditResult.isHealthy
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}
            >
              {auditResult.isHealthy ? '● STATUS STORAGE 100% HEALTHY' : '▲ DITEMUKAN MASALAH INTEGRITAS'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/30">
                  <th className="py-2.5 px-3 font-medium">Nomor Dokumen</th>
                  <th className="py-2.5 px-3 font-medium">Judul Dokumen</th>
                  <th className="py-2.5 px-3 font-medium">Ukuran Fisik</th>
                  <th className="py-2.5 px-3 font-medium">Checksum SHA-256</th>
                  <th className="py-2.5 px-3 font-medium text-right">Hasil Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {(auditResult.results || []).map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-blue-400">
                      {r.docNumber}
                    </td>
                    <td className="py-2.5 px-3 text-white max-w-xs truncate">{r.title}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400 text-[11px]">
                      {r.sizeBytes ? `${(r.sizeBytes / 1024).toFixed(1)} KB` : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-zinc-500 truncate max-w-[200px]">
                      {r.hash || r.expectedHash || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {r.status === 'VERIFIED_MATCH' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          VALID & AUTHENTIC
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          {r.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
