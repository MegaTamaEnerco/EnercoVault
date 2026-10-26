'use client';

import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

export interface AuditLogViewProps {
  initialLogs: any[];
}

export function AuditLogView({ initialLogs }: AuditLogViewProps) {
  const [logs] = useState<any[]>(initialLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [inspectLog, setInspectLog] = useState<any | null>(null);

  const filteredLogs = logs.filter((log) => {
    // Status filter
    if (selectedStatus !== 'all' && log.status !== selectedStatus) return false;

    // Category filter
    if (selectedCategory !== 'all') {
      if (!log.action.startsWith(selectedCategory)) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = log.action?.toLowerCase().includes(q);
      const matchActor =
        log.actorUsername?.toLowerCase().includes(q) ||
        log.actorEmail?.toLowerCase().includes(q);
      const matchResource =
        log.resource?.name?.toLowerCase().includes(q) ||
        log.resource?.type?.toLowerCase().includes(q);
      const matchIp = log.ip?.toLowerCase().includes(q);

      if (!matchAction && !matchActor && !matchResource && !matchIp) {
        return false;
      }
    }

    return true;
  });

  const exportCsv = () => {
    const rows = [
      ['Timestamp', 'Actor Username', 'Actor Role', 'Action', 'Resource Type', 'Resource ID', 'Status', 'IP', 'Reason'],
    ];

    filteredLogs.forEach((l) => {
      rows.push([
        new Date(l.createdAt).toISOString(),
        l.actorUsername || 'SYSTEM',
        l.actorRole || '-',
        l.action || '',
        l.resource?.type || '-',
        l.resource?.id || '-',
        l.status || '',
        l.ip || '',
        `"${(l.reason || '').replace(/"/g, '""')}"`,
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EnercoVault_AuditTrail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            Audit Trail & Log Keamanan Sistem
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Catatan immutable (append-only) seluruh aktivitas login, perubahan dokumen, DCR, dan aksi Super Admin.
          </p>
        </div>

        <button
          onClick={exportCsv}
          className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-2 interactive-tap cursor-pointer border border-zinc-700 shadow-sm"
        >
          <Download className="w-4 h-4 text-blue-400" />
          <span>Ekspor CSV ({filteredLogs.length} Rekaman)</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs font-medium">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg interactive-tap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Semua Aksi ({logs.length})
          </button>
          <button
            onClick={() => setSelectedCategory('auth')}
            className={`px-3 py-1.5 rounded-lg interactive-tap transition-all cursor-pointer ${
              selectedCategory === 'auth'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Autentikasi (auth.*)
          </button>
          <button
            onClick={() => setSelectedCategory('document')}
            className={`px-3 py-1.5 rounded-lg interactive-tap transition-all cursor-pointer ${
              selectedCategory === 'document'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Dokumen & File (document.*)
          </button>
          <button
            onClick={() => setSelectedCategory('dcr')}
            className={`px-3 py-1.5 rounded-lg interactive-tap transition-all cursor-pointer ${
              selectedCategory === 'dcr'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Workflow DCR (dcr.*)
          </button>
          <button
            onClick={() => setSelectedCategory('user')}
            className={`px-3 py-1.5 rounded-lg interactive-tap transition-all cursor-pointer ${
              selectedCategory === 'user'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            User & Akun (user.*)
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan aksi, username, nomor dokumen, atau IP..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">Semua Status Hasil</option>
            <option value="SUCCESS">Hanya Sukses (SUCCESS)</option>
            <option value="DENIED">Hanya Ditolak (DENIED)</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-zinc-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400">
                <th className="py-3 px-4 font-medium">Waktu (WIB)</th>
                <th className="py-3 px-4 font-medium">Aktor</th>
                <th className="py-3 px-4 font-medium">Aksi Sistem</th>
                <th className="py-3 px-4 font-medium">Resource Terkait</th>
                <th className="py-3 px-4 font-medium">Hasil</th>
                <th className="py-3 px-4 font-medium">IP Address</th>
                <th className="py-3 px-4 font-medium text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    Tidak ada rekaman audit log yang sesuai filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: any) => (
                  <tr
                    key={log._id.toString()}
                    className="hover:bg-zinc-800/30 transition-colors cursor-pointer"
                    onClick={() => setInspectLog(log)}
                  >
                    <td className="py-3 px-4 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                      })}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{log.actorUsername || 'SYSTEM'}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{log.actorRole || 'ANONYMOUS'}</div>
                    </td>

                    <td className="py-3 px-4">
                      <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-blue-300 border border-zinc-700">
                        {log.action}
                      </code>
                      {log.reason && (
                        <div className="text-[10px] text-zinc-400 mt-0.5 italic">{log.reason}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-zinc-300">
                      <div className="text-xs">{log.resource?.name || log.resource?.type}</div>
                      {log.resource?.id && (
                        <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[120px]">
                          ID: {log.resource.id}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {log.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Sukses
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-red-400 font-medium">
                          <XCircle className="w-3 h-3" />
                          Ditolak
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-zinc-400 text-[11px]">
                      {log.ip || '127.0.0.1'}
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setInspectLog(log)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 interactive-tap cursor-pointer"
                        title="Inspeksi Payload JSON"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Metadata Inspector Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl glass-panel rounded-2xl border border-zinc-700/80 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-white">
                  Inspeksi Log Audit: <span className="font-mono text-blue-300">{inspectLog.action}</span>
                </h2>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 font-mono text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Waktu:</span>
                  <span className="text-white">{new Date(inspectLog.createdAt).toISOString()}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Aktor:</span>
                  <span className="text-white">{inspectLog.actorUsername} ({inspectLog.actorRole})</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Status:</span>
                  <span className={inspectLog.status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'}>
                    {inspectLog.status}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">IP / Client:</span>
                  <span className="text-zinc-300">{inspectLog.ip}</span>
                </div>
              </div>

              <div>
                <span className="text-zinc-400 font-medium block mb-1">
                  Metadata & Event Payload (JSON):
                </span>
                <pre className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-64">
                  {JSON.stringify(inspectLog.metadata || {}, null, 2)}
                </pre>
              </div>

              {inspectLog.userAgent && (
                <div className="text-[10px] text-zinc-500 font-mono">
                  User Agent: {inspectLog.userAgent}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
