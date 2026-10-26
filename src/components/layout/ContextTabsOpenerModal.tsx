'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  LayoutDashboard,
  FolderTree,
  Network,
  GitPullRequest,
  Tags,
  Award,
  Users,
  ShieldCheck,
  History,
  Terminal,
  FilePlus,
  Plus,
  ArrowRight,
  Pin,
  Command,
} from 'lucide-react';
import { useWorkspaceTabs } from './WorkspaceTabsContext';

interface ModuleItem {
  id: string;
  title: string;
  category: 'Operasional' | 'Kepatuhan & Tata Kelola' | 'Tindakan Cepat';
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconName: string;
  badge?: string;
}

const AVAILABLE_MODULES: ModuleItem[] = [
  {
    id: '/',
    title: 'Dasbor Eksekutif',
    category: 'Operasional',
    description: 'Ringkasan kesehatan dokumen, status revisi, dan KPI kepatuhan IMS',
    href: '/',
    icon: LayoutDashboard,
    iconName: 'LayoutDashboard',
  },
  {
    id: '/catalog',
    title: 'Katalog Dokumen',
    category: 'Operasional',
    description: 'Pusat repositori SOP, WI, Form, Manual dengan filter taksonomi multi-dimensi',
    href: '/catalog',
    icon: FolderTree,
    iconName: 'FolderTree',
  },
  {
    id: '/ims-matrix',
    title: 'Matriks Kepatuhan IMS',
    category: 'Operasional',
    description: 'Pemetaan multi-standar ISO 9001, 14001, 45001 & SMK3 terhadap dokumen',
    href: '/ims-matrix',
    icon: Network,
    iconName: 'Network',
  },
  {
    id: '/dcr',
    title: 'Permintaan Perubahan Dokumen (DCR)',
    category: 'Operasional',
    description: 'Alur kerja persetujuan perubahan: pengajuan, peninjauan, dan pengesahan',
    href: '/dcr',
    icon: GitPullRequest,
    iconName: 'GitPullRequest',
  },
  {
    id: '/catalog?action=add',
    title: 'Tambah Dokumen Baru',
    category: 'Tindakan Cepat',
    description: 'Registrasi berkas ISO baru dengan generator template resmi otomatis',
    href: '/catalog?action=add',
    icon: FilePlus,
    iconName: 'FilePlus',
    badge: 'Formulir',
  },
  {
    id: '/dcr/new',
    title: 'Ajukan DCR Baru',
    category: 'Tindakan Cepat',
    description: 'Memulai formulir usulan revisi dokumen terkendali',
    href: '/dcr/new',
    icon: Plus,
    iconName: 'Plus',
    badge: 'Revisi',
  },
  {
    id: '/settings/taxonomies',
    title: 'Kategori Dokumen (Taksonomi)',
    category: 'Kepatuhan & Tata Kelola',
    description: 'Pengelolaan jenis dokumen, departemen, dan unit operasional',
    href: '/settings/taxonomies',
    icon: Tags,
    iconName: 'Tags',
  },
  {
    id: '/settings/frameworks',
    title: 'Standar & Klausul ISO',
    category: 'Kepatuhan & Tata Kelola',
    description: 'Manajemen framework regulasi internasional dan klausul audit',
    href: '/settings/frameworks',
    icon: Award,
    iconName: 'Award',
  },
  {
    id: '/settings/users',
    title: 'Manajemen Pengguna',
    category: 'Kepatuhan & Tata Kelola',
    description: 'Pengelolaan akun karyawan, unit kerja, dan proteksi akun',
    href: '/settings/users',
    icon: Users,
    iconName: 'Users',
  },
  {
    id: '/settings/roles',
    title: 'Hak Akses & Peran (RBAC)',
    category: 'Kepatuhan & Tata Kelola',
    description: 'Matriks izin terperinci dan hak akses dokumen',
    href: '/settings/roles',
    icon: ShieldCheck,
    iconName: 'ShieldCheck',
  },
  {
    id: '/audit-logs',
    title: 'Catatan Audit',
    category: 'Kepatuhan & Tata Kelola',
    description: 'Jejak audit forensik permanen seluruh aktivitas pengguna dan dokumen',
    href: '/audit-logs',
    icon: History,
    iconName: 'History',
  },
  {
    id: '/system',
    title: 'Pemeliharaan Sistem',
    category: 'Kepatuhan & Tata Kelola',
    description: 'Verifikasi checksum SHA-256 berkas fisik dan pencadangan data',
    href: '/system',
    icon: Terminal,
    iconName: 'Terminal',
    badge: 'Admin',
  },
];

export function ContextTabsOpenerModal() {
  const { isOpenerOpen, setIsOpenerOpen, openTab, tabs, activeTabId, closeTab } = useWorkspaceTabs();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpenerOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpenerOpen]);

  // Handle global shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpenerOpen(!isOpenerOpen);
      } else if (e.key === 'Escape' && isOpenerOpen) {
        setIsOpenerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenerOpen, setIsOpenerOpen]);

  if (!isOpenerOpen) return null;

  const filteredModules = AVAILABLE_MODULES.filter(
    (m) =>
      m.title.toLowerCase().includes(query.toLowerCase()) ||
      m.description.toLowerCase().includes(query.toLowerCase()) ||
      m.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tab-opener-title"
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-3 sm:px-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={() => setIsOpenerOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-[#0f111a]/95 border border-zinc-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900/60">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari modul, fitur, atau halaman untuk dibuka di tab baru..."
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded">
            ESC
          </kbd>
          <button
            onClick={() => setIsOpenerOpen(false)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Currently open tabs row */}
        {tabs.length > 0 && !query && (
          <div className="px-4 py-3 bg-zinc-950/40 border-b border-zinc-800/80">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Tab yang Sedang Dibuka ({tabs.length})</span>
              <span className="text-[10px] text-zinc-500 font-normal">Klik untuk beralih</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <div
                    key={tab.id}
                    onClick={() => {
                      openTab(tab);
                    }}
                    className={`group px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition-all ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm'
                        : 'bg-zinc-900/90 text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    {tab.isPinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400/20" />}
                    <span>{tab.title}</span>
                    {!tab.isPinned && (
                      <button
                        onClick={(e) => closeTab(tab.id, e)}
                        title="Tutup tab"
                        className="opacity-60 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modules List */}
        <div className="overflow-y-auto flex-1 p-2 sm:p-3 space-y-1 divide-y divide-zinc-800/40">
          {filteredModules.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Tidak ada modul yang cocok dengan kata kunci &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filteredModules.map((item) => {
              const Icon = item.icon;
              const isAlreadyOpen = tabs.some((t) => t.id === item.id || t.href === item.href);

              return (
                <button
                  key={item.id}
                  onClick={() =>
                    openTab({
                      id: item.id,
                      title: item.title,
                      href: item.href,
                      iconName: item.iconName,
                      badge: item.badge,
                    })
                  }
                  className="w-full text-left p-3 rounded-xl hover:bg-zinc-800/60 flex items-start justify-between gap-3 group transition-colors interactive-tap cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {item.badge}
                          </span>
                        )}
                        {isAlreadyOpen && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-medium">
                            Terbuka
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-500 group-hover:text-blue-400 transition-colors shrink-0 mt-1">
                    <span className="text-[11px] hidden sm:inline font-mono">Buka Tab</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts info */}
        <div className="px-4 py-2.5 bg-zinc-950/80 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="bg-zinc-800 px-1 rounded text-zinc-400">Ctrl</kbd>+
              <kbd className="bg-zinc-800 px-1 rounded text-zinc-400">K</kbd> Buka Menu
            </span>
            <span className="hidden sm:inline">Pintasan Multitasking Ruang Kerja</span>
          </div>
          <span>Enerco Vault v2.1</span>
        </div>
      </div>
    </div>
  );
}
