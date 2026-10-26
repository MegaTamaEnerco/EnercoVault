'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderTree,
  Layers,
  GitPullRequest,
  Menu,
} from 'lucide-react';
import { useWorkspaceTabs } from './WorkspaceTabsContext';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { tabs, setIsMobileSwitcherOpen, setIsMobileDrawerOpen } = useWorkspaceTabs();

  // Don't render on public / login / verify pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/verify')) {
    return null;
  }

  const isHome = pathname === '/';
  const isCatalog = pathname?.startsWith('/catalog');
  const isDcr = pathname?.startsWith('/dcr');

  return (
    <nav
      aria-label="Navigasi Bawah Seluler"
      className="md:hidden fixed bottom-2 left-3 right-3 z-30 glass-panel rounded-2xl border border-white/10 shadow-2xl p-1.5 flex items-center justify-around backdrop-blur-2xl bg-zinc-950/85"
    >
      {/* Dasbor */}
      <Link
        href="/"
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium interactive-tap transition-colors ${
          isHome ? 'text-blue-400 bg-blue-500/15' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <LayoutDashboard className="w-4 h-4 mb-0.5" />
        <span>Dasbor</span>
      </Link>

      {/* Katalog */}
      <Link
        href="/catalog"
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium interactive-tap transition-colors ${
          isCatalog ? 'text-blue-400 bg-blue-500/15' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <FolderTree className="w-4 h-4 mb-0.5" />
        <span>Katalog</span>
      </Link>

      {/* Tabs Switcher Button */}
      <button
        onClick={() => setIsMobileSwitcherOpen(true)}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-semibold text-blue-400 bg-blue-600/20 border border-blue-500/40 shadow-sm interactive-tap cursor-pointer"
        title="Buka Tab Multitasking"
      >
        <div className="relative">
          <Layers className="w-4 h-4 mb-0.5" />
          <span className="absolute -top-1 -right-2 text-[8px] bg-blue-500 text-white font-bold px-1 rounded-full">
            {tabs.length}
          </span>
        </div>
        <span>Tab ({tabs.length})</span>
      </button>

      {/* DCR */}
      <Link
        href="/dcr"
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium interactive-tap transition-colors ${
          isDcr ? 'text-blue-400 bg-blue-500/15' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <GitPullRequest className="w-4 h-4 mb-0.5" />
        <span>DCR</span>
      </Link>

      {/* Menu Drawer */}
      <button
        onClick={() => setIsMobileDrawerOpen(true)}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium text-zinc-400 hover:text-zinc-200 interactive-tap cursor-pointer"
        title="Buka Menu Lengkap"
      >
        <Menu className="w-4 h-4 mb-0.5" />
        <span>Menu</span>
      </button>
    </nav>
  );
}
