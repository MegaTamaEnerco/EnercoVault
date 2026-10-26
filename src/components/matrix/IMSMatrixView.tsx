'use client';

import React, { useState, useMemo } from 'react';
import {
  Network,
  Award,
  CheckCircle2,
  Clock,
  Download,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Filter,
  Layers,
  Table2,
  FileText,
  Sparkles,
  TrendingUp,
  Printer,
  X,
  ArrowUpRight,
  Plus,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  FolderTree,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { K3IndonesiaLogo } from '@/components/common/K3IndonesiaLogo';

export interface IMSMatrixViewProps {
  frameworks: any[];
  documents: any[];
}

export function IMSMatrixView({ frameworks, documents }: IMSMatrixViewProps) {
  const [selectedStandard, setSelectedStandard] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'fulfilled' | 'gap'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeViewMode, setActiveViewMode] = useState<'table' | 'tree' | 'gaps'>('table');
  const [expandedClauses, setExpandedClauses] = useState<Record<string, boolean>>({});
  const [inspectingClause, setInspectingClause] = useState<{
    framework: any;
    clause: any;
    matchingDocs: any[];
  } | null>(null);

  // Annex SL High-Level Structure (HLS) Standard Groups
  const hlsGroups = [
    {
      num: '4',
      key: '4. Context',
      hlsKey: 'CONTEXT_OF_ORGANIZATION',
      title: 'Klausul 4: Konteks Organisasi & Pihak Berkepentingan',
      desc: 'Pemetaan isu internal/eksternal, kebutuhan pihak terkait, dan ruang lingkup IMS.',
      color: 'blue',
    },
    {
      num: '5',
      key: '5. Leadership',
      hlsKey: 'LEADERSHIP',
      title: 'Klausul 5: Kepemimpinan, Komitmen & Kebijakan Terpadu',
      desc: 'Kebijakan mutu, K3, dan lingkungan terintegrasi serta peran & akuntabilitas manajemen.',
      color: 'indigo',
    },
    {
      num: '6',
      key: '6. Planning',
      hlsKey: 'PLANNING',
      title: 'Klausul 6: Perencanaan, Manajemen Risiko (HIRADC/IBPRP) & EAI',
      desc: 'Penetapan sasaran mutu, identifikasi bahaya K3, aspek lingkungan, dan peluang perbaikan.',
      color: 'emerald',
    },
    {
      num: '7',
      key: '7. Support',
      hlsKey: 'SUPPORT',
      title: 'Klausul 7: Dukungan, Kompetensi & Informasi Terdokumentasi',
      desc: 'Pengendalian dokumen kendali, rekaman, infrastruktur, sumber daya, dan pelatihan.',
      color: 'cyan',
    },
    {
      num: '8',
      key: '8. Operation',
      hlsKey: 'OPERATION',
      title: 'Klausul 8: Pengendalian Operasional, Ijin Kerja (PTW) & Tanggap Darurat',
      desc: 'Prosedur eksekusi lapangan, SOP B3, izin kerja berisiko tinggi, dan prosedur darurat.',
      color: 'amber',
    },
    {
      num: '9',
      key: '9. Evaluation',
      hlsKey: 'PERFORMANCE_EVALUATION',
      title: 'Klausul 9: Evaluasi Kinerja, Pemantauan, Pengukuran & Audit Internal',
      desc: 'Audit internal berkala, tinjauan manajemen, inspeksi K3, dan pemantauan emisi/limbah.',
      color: 'purple',
    },
    {
      num: '10',
      key: '10. Improvement',
      hlsKey: 'IMPROVEMENT',
      title: 'Klausul 10: Peningkatan Berkelanjutan, Ketidaksesuaian & Tindakan Korektif',
      desc: 'Pelaporan CAPA/NCR, investigasi insiden, dan peningkatan kinerja terpadu.',
      color: 'rose',
    },
  ];

  // Helper to find documents fulfilling a specific clause
  const getDocsForClause = (fwCode: string, clauseNum: string) => {
    return documents.filter((doc) =>
      (doc.complianceMappings || []).some(
        (m: any) =>
          m.frameworkCode === fwCode &&
          (m.clauses || []).some((c: string) => c === clauseNum || c.startsWith(clauseNum))
      )
    );
  };

  const toggleExpand = (clauseKey: string) => {
    setExpandedClauses((prev) => ({ ...prev, [clauseKey]: !prev[clauseKey] }));
  };

  // Pre-calculate Executive Compliance Metrics
  const complianceStats = useMemo(() => {
    let totalClauses = 0;
    let fulfilledClauses = 0;

    const perFwStats = frameworks.map((fw) => {
      const clauses = fw.clauses || [];
      const fwTotal = clauses.length;
      let fwFulfilled = 0;

      clauses.forEach((c: any) => {
        const docs = getDocsForClause(fw.code, c.clauseNumber);
        if (docs.length > 0) fwFulfilled++;
      });

      totalClauses += fwTotal;
      fulfilledClauses += fwFulfilled;

      const rate = fwTotal > 0 ? Math.round((fwFulfilled / fwTotal) * 100) : 0;
      return {
        code: fw.code,
        name: fw.name,
        category: fw.category,
        color: fw.badgeColor || '#3b82f6',
        total: fwTotal,
        fulfilled: fwFulfilled,
        gap: fwTotal - fwFulfilled,
        rate,
      };
    });

    const overallRate = totalClauses > 0 ? Math.round((fulfilledClauses / totalClauses) * 100) : 0;
    const totalGaps = totalClauses - fulfilledClauses;

    return {
      totalClauses,
      fulfilledClauses,
      totalGaps,
      overallRate,
      perFwStats,
    };
  }, [frameworks, documents]);

  // Export CSV
  const exportCsv = () => {
    const rows = [
      ['Framework', 'Klausul', 'Judul Klausul', 'HLS Group', 'Jumlah Dokumen Terpetakan', 'Status', 'Daftar Dokumen'],
    ];

    frameworks.forEach((fw) => {
      (fw.clauses || []).forEach((c: any) => {
        const matchingDocs = getDocsForClause(fw.code, c.clauseNumber);
        const docNames = matchingDocs.map((d: any) => d.docNumber).join('; ');
        rows.push([
          fw.code,
          c.clauseNumber,
          `"${c.title}"`,
          c.hlsGroup || '-',
          matchingDocs.length.toString(),
          matchingDocs.length > 0 ? 'TERPENUHI' : 'AUDIT GAP',
          `"${docNames}"`,
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EnercoVault_IMS_Compliance_Matrix_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter frameworks if specific standard selected
  const visibleFrameworks = frameworks.filter((fw) => {
    if (selectedStandard === 'all') return true;
    return fw.code === selectedStandard;
  });

  return (
    <div className="space-y-6">
      {/* Top ERP Header & Action Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-600/15 border border-blue-500/25 text-blue-400">
              <Network className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Matriks Kepatuhan Terpadu Annex SL & SMK3
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold hidden sm:inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Audit-Ready ERP Engine
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Penelusuran silang (Traceability Matrix) Klausul ISO 9001, ISO 14001, ISO 45001 dan 166 Kriteria SMK3 PP No. 50/2012 terhadap Dokumen Terkendali.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 interactive-tap cursor-pointer border border-zinc-700"
            title="Cetak lembar audit matriks"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Cetak Audit</span>
          </button>

          <button
            onClick={exportCsv}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 interactive-tap cursor-pointer shadow-lg shadow-blue-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Matriks CSV</span>
          </button>
        </div>
      </div>

      {/* ERP Compliance KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: Overall Readiness */}
        <div className="glass-panel rounded-2xl p-4 border border-zinc-800/90 shadow-xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Indeks Kesiapan Audit
            </span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
              {complianceStats.overallRate}%
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">Sesuai Regulasi</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${complianceStats.overallRate}%` }}
            />
          </div>
        </div>

        {/* Card 2: Fulfilled Clauses */}
        <div className="glass-panel rounded-2xl p-4 border border-zinc-800/90 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Klausul Terpenuhi
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight font-mono">
              {complianceStats.fulfilledClauses}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">/ {complianceStats.totalClauses} Persyaratan</span>
          </div>
          <div className="text-[11px] text-emerald-400/90 flex items-center gap-1 font-medium">
            <span>Terdokumentasi dalam Vault</span>
          </div>
        </div>

        {/* Card 3: Gaps / Missing SOPs */}
        <div className="glass-panel rounded-2xl p-4 border border-zinc-800/90 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Kesenjangan Dokumen (GAP)
            </span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${complianceStats.totalGaps > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
              {complianceStats.totalGaps}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">Klausul Tanpa SOP</span>
          </div>
          <div className="text-[11px] text-rose-400/90 flex items-center gap-1 font-medium">
            <span>Perlu Pembuatan Dokumen (DCR)</span>
          </div>
        </div>

        {/* Card 4: Active Standards */}
        <div className="glass-panel rounded-2xl p-4 border border-zinc-800/90 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Standar Terintegrasi
            </span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
              {frameworks.length}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">Frameworks Aktif</span>
          </div>
          <div className="flex items-center gap-1">
            {frameworks.map((f) => (
              <span
                key={f.code}
                className="w-2 h-2 rounded-full"
                title={f.code}
                style={{ backgroundColor: f.badgeColor || '#3b82f6' }}
              />
            ))}
            <span className="text-[10px] text-zinc-400 ml-1">ISO 9001/14001/45001 & SMK3</span>
          </div>
        </div>
      </div>

      {/* Per-Framework Progress Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {complianceStats.perFwStats.map((fw) => (
          <div
            key={fw.code}
            onClick={() => setSelectedStandard(selectedStandard === fw.code ? 'all' : fw.code)}
            className={`p-3 rounded-xl border transition-all cursor-pointer interactive-tap ${
              selectedStandard === fw.code
                ? 'bg-blue-600/15 border-blue-500/50 shadow-md shadow-blue-500/10'
                : 'bg-zinc-900/60 hover:bg-zinc-800/70 border-zinc-800/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fw.color }} />
                <span>{fw.code}</span>
              </span>
              <span className="text-xs font-mono font-bold text-white">{fw.rate}%</span>
            </div>
            <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${fw.rate}%`, backgroundColor: fw.color }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
              <span>{fw.fulfilled} Terpenuhi</span>
              <span className={fw.gap > 0 ? 'text-rose-400 font-semibold' : 'text-zinc-500'}>
                {fw.gap} Gap
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ERP Control Bar: View Switcher, Filter Pills, Search */}
      <div className="glass-panel rounded-2xl p-3 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        {/* Left: View Mode Switcher */}
        <div className="flex items-center bg-zinc-950/80 rounded-xl p-1 border border-zinc-800/90 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveViewMode('table')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeViewMode === 'table'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Matriks Silang ERP</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('tree')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeViewMode === 'tree'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Hirarki Annex SL</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('gaps')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeViewMode === 'gaps'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Temuan Gap ({complianceStats.totalGaps})</span>
          </button>
        </div>

        {/* Center: Search Query */}
        <div className="relative flex-1 max-w-xl">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari klausul, kata kunci standar, atau nomor dokumen..."
            className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800/90 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Right: Status Filter Segmented Controls */}
        <div className="flex items-center gap-1 bg-zinc-950/80 rounded-xl p-1 border border-zinc-800/90 text-[11px] shrink-0 self-start md:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setStatusFilter('fulfilled')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === 'fulfilled'
                ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Terpenuhi
          </button>
          <button
            onClick={() => setStatusFilter('gap')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === 'gap'
                ? 'bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Audit Gap
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: ENTERPRISE TRACEABILITY MATRIX TABLE (ERP GRID VIEW)             */}
      {/* ========================================================================= */}
      {activeViewMode === 'table' && (
        <div className="glass-panel rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-bold text-white min-w-[240px]">
                    Klaster Proses Annex SL (HLS)
                  </th>
                  {visibleFrameworks.map((fw) => (
                    <th key={fw.code} className="py-3.5 px-3 font-semibold min-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fw.badgeColor }} />
                        <span className="text-white">{fw.code}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-normal block font-sans truncate">
                        {fw.name.split('-')[1]?.trim() || fw.name}
                      </span>
                    </th>
                  ))}
                  <th className="py-3.5 px-4 font-semibold text-right min-w-[130px]">
                    Status Kepatuhan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {hlsGroups.map((group) => {
                  // Collect all clauses across visible frameworks matching this group
                  let totalGroupClauses = 0;
                  let fulfilledGroupClauses = 0;

                  visibleFrameworks.forEach((fw) => {
                    const clauses = (fw.clauses || []).filter((c: any) => {
                      const matchGroup = c.hlsGroup === group.hlsKey || c.clauseNumber?.startsWith(group.num);
                      return matchGroup;
                    });
                    totalGroupClauses += clauses.length;
                    clauses.forEach((c: any) => {
                      const docs = getDocsForClause(fw.code, c.clauseNumber);
                      if (docs.length > 0) fulfilledGroupClauses++;
                    });
                  });

                  // If filtering by gap and group has no gaps, skip
                  if (statusFilter === 'gap' && totalGroupClauses > 0 && fulfilledGroupClauses === totalGroupClauses) {
                    return null;
                  }

                  // If filtering by fulfilled and group has none, skip
                  if (statusFilter === 'fulfilled' && fulfilledGroupClauses === 0) {
                    return null;
                  }

                  return (
                    <tr
                      key={group.key}
                      className="hover:bg-zinc-850/40 transition-colors align-top"
                    >
                      {/* Left: Annex SL Core Process Descriptor */}
                      <td className="py-4 px-4 bg-zinc-950/40 border-r border-zinc-800/80">
                        <div className="space-y-1">
                          <div className="font-bold text-white text-xs flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <span>{group.title}</span>
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                            {group.desc}
                          </p>
                          <div className="pt-2 flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                            <span>{fulfilledGroupClauses}/{totalGroupClauses} Terpenuhi</span>
                            <div className="w-16 bg-zinc-800 h-1 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{
                                  width: `${totalGroupClauses > 0 ? (fulfilledGroupClauses / totalGroupClauses) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Standards Columns */}
                      {visibleFrameworks.map((fw) => {
                        const matchingClauses = (fw.clauses || []).filter((c: any) => {
                          const matchGroup = c.hlsGroup === group.hlsKey || c.clauseNumber?.startsWith(group.num);
                          if (searchQuery.trim()) {
                            const q = searchQuery.toLowerCase();
                            return matchGroup && (c.clauseNumber?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q));
                          }
                          return matchGroup;
                        });

                        return (
                          <td key={fw.code} className="py-3 px-3 border-r border-zinc-800/40">
                            {matchingClauses.length === 0 ? (
                              <span className="text-[11px] text-zinc-600 font-mono italic block py-2">
                                — Tidak Berlaku —
                              </span>
                            ) : (
                              <div className="space-y-1.5">
                                {matchingClauses.map((c: any) => {
                                  const matchingDocs = getDocsForClause(fw.code, c.clauseNumber);
                                  const isFulfilled = matchingDocs.length > 0;

                                  if (statusFilter === 'fulfilled' && !isFulfilled) return null;
                                  if (statusFilter === 'gap' && isFulfilled) return null;

                                  return (
                                    <div
                                      key={c.clauseNumber}
                                      onClick={() =>
                                        setInspectingClause({
                                          framework: fw,
                                          clause: c,
                                          matchingDocs,
                                        })
                                      }
                                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer group hover:scale-[1.01] ${
                                        isFulfilled
                                          ? 'bg-zinc-900/80 hover:bg-zinc-800/90 border-emerald-500/20 hover:border-emerald-500/40'
                                          : 'bg-rose-950/20 hover:bg-rose-950/30 border-rose-500/30 hover:border-rose-500/50'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-mono text-[11px] font-bold text-blue-400 group-hover:text-blue-300">
                                          {c.clauseNumber}
                                        </span>
                                        {isFulfilled ? (
                                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono">
                                            <CheckCircle2 className="w-2.5 h-2.5" />
                                            <span>{matchingDocs.length} Dok</span>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 font-mono">
                                            <AlertCircle className="w-2.5 h-2.5" />
                                            <span>0 Dok (Gap)</span>
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-zinc-300 font-medium line-clamp-1 mt-0.5">
                                        {c.title}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Right: Summary Status */}
                      <td className="py-4 px-4 text-right">
                        {totalGroupClauses === 0 ? (
                          <span className="text-[11px] text-zinc-500 font-mono">N/A</span>
                        ) : fulfilledGroupClauses === totalGroupClauses ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-[10px] font-mono">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>100% AUDITED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold text-[10px] font-mono">
                            <Clock className="w-3 h-3" />
                            <span>
                              {Math.round((fulfilledGroupClauses / totalGroupClauses) * 100)}% COMPLIANT
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: DETAILED ANNEX SL HIGH-LEVEL PROCESS TREE (ACCORDION CARDS)       */}
      {/* ========================================================================= */}
      {activeViewMode === 'tree' && (
        <div className="space-y-4">
          {hlsGroups.map((group) => {
            return (
              <div
                key={group.key}
                className="glass-panel rounded-2xl border border-zinc-800/80 overflow-hidden shadow-xl"
              >
                <div className="px-5 py-4 bg-zinc-950/70 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                    <div>
                      <h2 className="font-semibold text-xs text-white">{group.title}</h2>
                      <p className="text-[11px] text-zinc-400">{group.desc}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                    Annex SL Standard Cluster
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {visibleFrameworks.map((fw) => {
                      const groupClauses = (fw.clauses || []).filter((c: any) => {
                        const matchGroup = c.hlsGroup === group.hlsKey || c.clauseNumber?.startsWith(group.num);
                        if (searchQuery.trim()) {
                          const q = searchQuery.toLowerCase();
                          return matchGroup && (c.clauseNumber?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q));
                        }
                        return matchGroup;
                      });

                      if (groupClauses.length === 0) return null;

                      return (
                        <div
                          key={fw.code}
                          className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                            <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fw.badgeColor }} />
                              <span>{fw.code}</span>
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {groupClauses.length} Klausul
                            </span>
                          </div>

                          <div className="space-y-2">
                            {groupClauses.map((c: any) => {
                              const clauseKey = `${fw.code}_${c.clauseNumber}`;
                              const matchingDocs = getDocsForClause(fw.code, c.clauseNumber);
                              const isFulfilled = matchingDocs.length > 0;
                              const isExpanded = Boolean(expandedClauses[clauseKey]);

                              if (statusFilter === 'fulfilled' && !isFulfilled) return null;
                              if (statusFilter === 'gap' && isFulfilled) return null;

                              return (
                                <div
                                  key={c.clauseNumber}
                                  className={`p-2.5 rounded-xl border text-xs transition-all ${
                                    isFulfilled
                                      ? 'bg-zinc-900/80 border-emerald-500/20'
                                      : 'bg-rose-950/20 border-rose-500/30'
                                  }`}
                                >
                                  <div
                                    className="flex items-start justify-between gap-2 cursor-pointer"
                                    onClick={() => toggleExpand(clauseKey)}
                                  >
                                    <div>
                                      <div className="font-mono text-[11px] font-bold text-blue-400">
                                        {c.clauseNumber}
                                      </div>
                                      <div className="text-[11px] text-zinc-200 font-medium line-clamp-2 mt-0.5">
                                        {c.title}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {isFulfilled ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-medium">
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span>{matchingDocs.length}</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 font-medium">
                                          <AlertCircle className="w-3 h-3" />
                                          <span>0 Dok</span>
                                        </span>
                                      )}
                                      {isExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                                      )}
                                    </div>
                                  </div>

                                  {/* Expanded list of fulfilling documents */}
                                  {isExpanded && (
                                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 space-y-2 animate-in fade-in duration-150">
                                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                                        <span>DOKUMEN TERKAIT:</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setInspectingClause({ framework: fw, clause: c, matchingDocs });
                                          }}
                                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        >
                                          <span>Detail Lengkap</span>
                                          <ArrowUpRight className="w-3 h-3" />
                                        </button>
                                      </div>
                                      {matchingDocs.length === 0 ? (
                                        <div className="p-2 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400">
                                          <span className="text-rose-400 font-semibold block">Audit Gap:</span>
                                          {c.mandatoryDocumentHint ? (
                                            <span>Rekomendasi: {c.mandatoryDocumentHint}</span>
                                          ) : (
                                            <span>Belum ada dokumen yang dipetakan ke klausul ini.</span>
                                          )}
                                        </div>
                                      ) : (
                                        matchingDocs.map((doc: any) => (
                                          <Link
                                            key={doc._id.toString()}
                                            href="/catalog"
                                            className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800/80 text-zinc-300 hover:text-white flex items-center justify-between gap-2 text-[10px] border border-zinc-800/80 transition-colors"
                                          >
                                            <div className="flex items-center gap-1.5 truncate">
                                              <span className="font-mono text-blue-400">{doc.docNumber}</span>
                                              <span className="truncate">{doc.title}</span>
                                            </div>
                                            <span className="font-mono text-zinc-400 shrink-0">
                                              Rev. {doc.currentVersion}
                                            </span>
                                          </Link>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: AUDIT GAP FINDER (ACTIONABLE GAP ANALYSIS LIST)                   */}
      {/* ========================================================================= */}
      {activeViewMode === 'gaps' && (
        <div className="glass-panel rounded-2xl border border-zinc-800 shadow-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Daftar Temuan Kesenjangan Dokumen (Audit Gap Register)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Klausul standar aktif yang belum memiliki dokumen terkendali sah sebagai bukti pemenuhan audit.
              </p>
            </div>
            <Link
              href="/catalog?action=add"
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 interactive-tap shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Unggah Dokumen Pemenuhan</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {frameworks.flatMap((fw) =>
              (fw.clauses || []).map((c: any) => {
                const matchingDocs = getDocsForClause(fw.code, c.clauseNumber);
                if (matchingDocs.length > 0) return null;

                if (selectedStandard !== 'all' && fw.code !== selectedStandard) return null;
                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase();
                  const match =
                    c.clauseNumber?.toLowerCase().includes(q) ||
                    c.title?.toLowerCase().includes(q) ||
                    fw.name?.toLowerCase().includes(q);
                  if (!match) return null;
                }

                return (
                  <div
                    key={`${fw.code}_${c.clauseNumber}`}
                    className="p-4 rounded-xl bg-rose-950/15 border border-rose-500/30 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                          {fw.code}
                        </span>
                        <span className="text-[10px] font-mono text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          BELUM ADA SOP
                        </span>
                      </div>
                      <div className="font-mono text-xs font-bold text-white pt-1">
                        Klausul {c.clauseNumber}
                      </div>
                      <div className="text-xs text-zinc-300 font-medium leading-relaxed">
                        {c.title}
                      </div>
                      {c.mandatoryDocumentHint && (
                        <div className="p-2 rounded-lg bg-zinc-950/70 border border-zinc-800 text-[11px] text-zinc-400">
                          <span className="text-blue-400 font-semibold block text-[10px] uppercase font-mono">
                            Rekomendasi Dokumen:
                          </span>
                          <span>{c.mandatoryDocumentHint}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex items-center gap-2 border-t border-rose-500/20">
                      <Link
                        href={`/dcr/new?standard=${fw.code}&clause=${c.clauseNumber}`}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-medium flex items-center justify-center gap-1 interactive-tap"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Usulkan DCR</span>
                      </Link>
                      <button
                        onClick={() => setInspectingClause({ framework: fw, clause: c, matchingDocs: [] })}
                        className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium interactive-tap"
                      >
                        Inspeksi
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-OVER CLAUSE AUDIT INSPECTOR DRAWER                                  */}
      {/* ========================================================================= */}
      {inspectingClause && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={() => setInspectingClause(null)}
        >
          <div
            className="w-full max-w-lg h-full bg-[#0d0f17] border-l border-zinc-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: inspectingClause.framework.badgeColor || '#3b82f6' }}
                  />
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      {inspectingClause.framework.code}
                    </h2>
                    <p className="text-[11px] text-zinc-400">{inspectingClause.framework.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectingClause(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-800/80 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Clause Profile */}
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-400">
                    Klausul {inspectingClause.clause.clauseNumber}
                  </span>
                  {inspectingClause.matchingDocs.length > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold">
                      COMPLIANT ({inspectingClause.matchingDocs.length} DOKUMEN)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-mono font-semibold">
                      AUDIT GAP (0 DOKUMEN)
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white">
                  {inspectingClause.clause.title}
                </h3>
                {inspectingClause.clause.description && (
                  <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                    {inspectingClause.clause.description}
                  </p>
                )}
              </div>

              {/* K3 Indonesia Official Compliance Banner */}
              {(inspectingClause.framework.code === 'SMK3-PP50' || inspectingClause.framework.code.includes('45001')) && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                  <K3IndonesiaLogo size={32} showText={true} />
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    PP 50/2012
                  </span>
                </div>
              )}

              {/* Mandatory Requirement Hint */}
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-1 text-xs">
                <div className="text-[10px] text-blue-400 font-mono uppercase font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Kriteria Bukti Audit Resmi (Evidence Requirement):</span>
                </div>
                <p className="text-zinc-300 font-medium">
                  {inspectingClause.clause.mandatoryDocumentHint ||
                    'SOP / Prosedur Terkendali dengan persetujuan manajemen sah dan stempel validasi aktif.'}
                </p>
              </div>

              {/* Linked Documents List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>Dokumen Pemenuhan di Enerco Vault ({inspectingClause.matchingDocs.length})</span>
                  </span>
                  <Link
                    href="/catalog?action=add"
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah</span>
                  </Link>
                </div>

                {inspectingClause.matchingDocs.length === 0 ? (
                  <div className="p-6 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center space-y-2">
                    <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto opacity-70" />
                    <p className="text-xs text-zinc-300 font-medium">
                      Belum ada dokumen yang dipetakan ke klausul ini.
                    </p>
                    <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                      Buat dokumen baru melalui Formulir Permintaan Perubahan (DCR) atau unggah langsung ke Katalog Dokumen.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {inspectingClause.matchingDocs.map((doc: any) => (
                      <div
                        key={doc._id.toString()}
                        className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-blue-400">
                            {doc.docNumber}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                            Rev. {String(doc.currentVersion).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white line-clamp-2">
                          {doc.title}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[10px] text-zinc-400">
                          <span>{doc.taxonomyId?.name || 'Umum'}</span>
                          <span className="text-emerald-400 font-semibold">{doc.status || 'ACTIVE'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-zinc-800 grid grid-cols-2 gap-2">
              <Link
                href="/catalog"
                className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 interactive-tap"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Buka di Katalog</span>
              </Link>
              <Link
                href={`/dcr/new?standard=${inspectingClause.framework.code}&clause=${inspectingClause.clause.clauseNumber}`}
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 interactive-tap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Usulkan DCR</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
