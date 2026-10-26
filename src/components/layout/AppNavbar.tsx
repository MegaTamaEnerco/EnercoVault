'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogOut, Crown, Menu, Plus, Layers } from 'lucide-react';
import { SessionUser } from '@/lib/rbac';
import { useWorkspaceTabs } from './WorkspaceTabsContext';
import { useCompanyConfig } from '@/components/providers/CompanyConfigProvider';

interface AppNavbarProps {
  user: SessionUser;
}

export function AppNavbar({ user }: AppNavbarProps) {
  const router = useRouter();
  const tabsContext = useWorkspaceTabs();
  const { config: companyConfig } = useCompanyConfig();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const isSuper = user.permissions.includes('*:*') || user.roleCodes.includes('SUPER_ADMIN');

  return (
    <header className="sticky top-0 z-40 w-full glass-nav px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
      {/* Brand logo & mobile hamburger */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          onClick={() => tabsContext?.setIsMobileDrawerOpen(true)}
          className="p-2 -ml-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 md:hidden interactive-tap cursor-pointer"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <a href="/" className="flex items-center gap-2.5 interactive-tap">
          {companyConfig.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={companyConfig.logoUrl}
              alt={companyConfig.companyName}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain bg-white/10 p-1 border border-zinc-700/80 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-semibold text-xs sm:text-sm tracking-tight text-white line-clamp-1">
                {companyConfig.systemName}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                v2.1
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 hidden sm:block line-clamp-1">
              {companyConfig.tagline}
            </p>
          </div>
        </a>
      </div>

      {/* Middle Quick Links & Multitasking Context Opener */}
      <div className="hidden md:flex items-center gap-2">
        <button
          onClick={() => tabsContext?.setIsOpenerOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 interactive-tap cursor-pointer shadow-sm shadow-blue-500/5"
          title="Buka Tab Modul Multitasking (Ctrl+K)"
        >
          <Plus className="w-3.5 h-3.5 text-blue-400" />
          <span>Buka Tab Modul</span>
          <kbd className="text-[10px] bg-blue-900/40 px-1 rounded text-blue-300 font-mono ml-0.5">
            ⌘K
          </kbd>
        </button>

        <a
          href="/catalog"
          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-800 flex items-center gap-1.5 interactive-tap"
        >
          <span>Katalog</span>
        </a>

        <a
          href="/catalog?action=add"
          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-800 flex items-center gap-1.5 interactive-tap"
        >
          <span>+ Dokumen</span>
        </a>
      </div>

      {/* User profile & RBAC status */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Tab Switcher Shortcut */}
        <button
          onClick={() => tabsContext?.setIsMobileSwitcherOpen(true)}
          className="md:hidden p-1.5 px-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1 text-xs font-medium interactive-tap"
          title="Tab Terbuka"
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>{tabsContext?.tabs.length || 1}</span>
        </button>

        {isSuper ? (
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] sm:text-xs font-medium shadow-sm shadow-amber-500/10">
            <Crown className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Super Admin</span>
            <span className="text-[9px] sm:text-[10px] font-mono bg-amber-400/20 px-1 py-0.2 rounded text-amber-200">
              *:*
            </span>
          </div>
        ) : (
          <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] sm:text-xs font-medium">
            {user.roleCodes[0] || 'User'}
          </div>
        )}

        <div className="hidden lg:flex flex-col text-right">
          <span className="text-xs font-medium text-white">{user.fullName}</span>
          <span className="text-[11px] text-zinc-400">{user.email}</span>
        </div>

        <button
          onClick={handleLogout}
          title="Keluar dari sistem"
          className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 interactive-tap cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
