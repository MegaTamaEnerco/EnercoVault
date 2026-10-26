'use client';

import React from 'react';
import Link from 'next/link';
import {
  X,
  Plus,
  Layers,
  Pin,
  Trash2,
  ExternalLink,
  LayoutDashboard,
  FolderTree,
  Network,
  GitPullRequest,
  FilePlus,
  Tags,
  Award,
  Users,
  ShieldCheck,
  History,
  Terminal,
} from 'lucide-react';
import { useWorkspaceTabs } from './WorkspaceTabsContext';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  FolderTree,
  Network,
  GitPullRequest,
  FilePlus,
  Tags,
  Award,
  Users,
  ShieldCheck,
  History,
  Terminal,
};

export function MobileTabSwitcherSheet() {
  const {
    isMobileSwitcherOpen,
    setIsMobileSwitcherOpen,
    tabs,
    activeTabId,
    closeTab,
    closeAllTabs,
    setIsOpenerOpen,
    openTab,
  } = useWorkspaceTabs();

  if (!isMobileSwitcherOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-tabs-title"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-200 md:hidden"
      onClick={() => setIsMobileSwitcherOpen(false)}
    >
      <div
        className="w-full max-h-[85vh] bg-[#0d0f17] border-t border-zinc-800 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle indicator (Apple sheet style) */}
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h2 id="mobile-tabs-title" className="text-sm font-semibold text-white">
              Ruang Kerja Multitasking ({tabs.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {tabs.length > 1 && (
              <button
                onClick={closeAllTabs}
                className="text-[11px] text-zinc-400 hover:text-red-400 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 interactive-tap cursor-pointer"
              >
                Tutup Semua
              </button>
            )}
            <button
              onClick={() => setIsMobileSwitcherOpen(false)}
              className="p-1 rounded-full text-zinc-400 hover:text-white bg-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Cards Grid */}
        <div className="p-4 overflow-y-auto max-h-[60vh] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const Icon = (tab.iconName && ICON_MAP[tab.iconName]) || FolderTree;

            return (
              <div
                key={tab.id}
                onClick={() => {
                  openTab(tab);
                  setIsMobileSwitcherOpen(false);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative interactive-tap flex flex-col justify-between ${
                  isActive
                    ? 'bg-blue-600/15 border-blue-500/50 shadow-lg shadow-blue-500/10'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white line-clamp-1">
                          {tab.title}
                        </span>
                        {tab.isPinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400/20 shrink-0" />}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {tab.href}
                      </span>
                    </div>
                  </div>

                  {!tab.isPinned && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id, e);
                      }}
                      title="Tutup tab"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-zinc-800/60">
                  <span className={isActive ? 'text-blue-400 font-medium' : 'text-zinc-500'}>
                    {isActive ? '● Sedang Dilihat' : 'Ketuk untuk Buka'}
                  </span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Action footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center gap-2">
          <button
            onClick={() => {
              setIsMobileSwitcherOpen(false);
              setIsOpenerOpen(true);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 interactive-tap shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buka Modul / Halaman Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
}
