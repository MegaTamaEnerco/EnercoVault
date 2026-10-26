'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Plus,
  X,
  Pin,
  PinOff,
  Layers,
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
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { useWorkspaceTabs, WorkspaceTab } from './WorkspaceTabsContext';

// Icon map helper
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

export function WorkspaceTabBar() {
  const pathname = usePathname();
  const {
    tabs,
    activeTabId,
    closeTab,
    togglePinTab,
    setIsOpenerOpen,
    setIsMobileSwitcherOpen,
    closeOtherTabs,
  } = useWorkspaceTabs();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view smoothly
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeTabId]);

  // Don't render on public / login / verify pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/verify')) {
    return null;
  }

  return (
    <div className="w-full bg-[#0a0c13] border-b border-zinc-800/80 px-2 sm:px-4 py-1.5 flex items-center justify-between gap-2 select-none z-30 sticky top-[57px]">
      {/* Left: Scrollable Tabs Container */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
        {/* Mobile Tab Switcher Quick Button */}
        <button
          onClick={() => setIsMobileSwitcherOpen(true)}
          className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-400 text-xs font-semibold shrink-0 interactive-tap"
          title="Buka Daftar Tab Multitasking"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{tabs.length}</span>
        </button>

        {/* Horizontal Tab Pills */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId || tab.href === pathname;
            const Icon = (tab.iconName && ICON_MAP[tab.iconName]) || FolderTree;

            return (
              <div
                key={tab.id}
                data-active={isActive}
                className={`group relative flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 interactive-tap border cursor-pointer ${
                  isActive
                    ? 'bg-zinc-800/90 text-white border-blue-500/40 shadow-sm shadow-blue-500/10'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800/60 hover:text-zinc-200 hover:bg-zinc-800/50 hover:border-zinc-700/60'
                }`}
              >
                <Link
                  href={tab.href}
                  className="flex items-center gap-2 focus:outline-none"
                  title={tab.title}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-400'
                    }`}
                  />
                  <span className="truncate max-w-[120px] sm:max-w-[160px]">{tab.title}</span>
                </Link>

                {tab.isPinned ? (
                  <button
                    onClick={() => togglePinTab(tab.id)}
                    title="Buka Sematan Tab"
                    className="p-0.5 rounded text-amber-400/80 hover:text-amber-300 opacity-80 group-hover:opacity-100"
                  >
                    <Pin className="w-3 h-3 fill-amber-400/20" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => closeTab(tab.id, e)}
                    title="Tutup Tab"
                    className={`p-0.5 rounded transition-opacity ${
                      isActive ? 'text-zinc-400 hover:text-red-400' : 'text-zinc-600 hover:text-zinc-300'
                    } group-hover:opacity-100 opacity-60 hover:opacity-100`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}

                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 rounded-full" />
                )}
              </div>
            );
          })}
        </div>

        {/* Plus Context Opener Button */}
        <button
          onClick={() => setIsOpenerOpen(true)}
          title="Buka Tab Baru (Ctrl+K)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium shrink-0 interactive-tap cursor-pointer transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline text-[11px]">Tab Baru</span>
        </button>
      </div>

      {/* Right Controls: Quick Multitasking Helper */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <button
          onClick={() => setIsOpenerOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[11px] font-mono interactive-tap cursor-pointer"
        >
          <span>Pintasan</span>
          <kbd className="text-[10px] bg-zinc-800 px-1 rounded text-zinc-300">Ctrl+K</kbd>
        </button>
      </div>
    </div>
  );
}
