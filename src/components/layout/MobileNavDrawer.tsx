'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
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
  Building2,
  LogOut,
  Crown,
  FilePlus,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { SessionUser, can } from '@/lib/rbac';
import { Permission } from '@/lib/permissions';
import { useWorkspaceTabs } from './WorkspaceTabsContext';
import { useCompanyConfig } from '@/components/providers/CompanyConfigProvider';

interface MobileNavDrawerProps {
  user: SessionUser;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  perm: Permission;
  badge?: string;
  category: 'operasional' | 'governance';
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dasbor Eksekutif',
    href: '/',
    icon: LayoutDashboard,
    perm: 'dashboard:view',
    category: 'operasional',
  },
  {
    label: 'Katalog Dokumen',
    href: '/catalog',
    icon: FolderTree,
    perm: 'document:view',
    category: 'operasional',
  },
  {
    label: 'Matriks Kepatuhan IMS',
    href: '/ims-matrix',
    icon: Network,
    perm: 'ims_matrix:view',
    category: 'operasional',
  },
  {
    label: 'Permintaan Perubahan (DCR)',
    href: '/dcr',
    icon: GitPullRequest,
    perm: 'dcr:view',
    category: 'operasional',
  },
  {
    label: 'Kategori Dokumen',
    href: '/settings/taxonomies',
    icon: Tags,
    perm: 'taxonomy:manage',
    category: 'governance',
  },
  {
    label: 'Standar & Klausul ISO',
    href: '/settings/frameworks',
    icon: Award,
    perm: 'framework:manage',
    category: 'governance',
  },
  {
    label: 'Manajemen Pengguna',
    href: '/settings/users',
    icon: Users,
    perm: 'user:view',
    category: 'governance',
  },
  {
    label: 'Hak Akses & Peran',
    href: '/settings/roles',
    icon: ShieldCheck,
    perm: 'role:manage',
    category: 'governance',
  },
  {
    label: 'Catatan Audit',
    href: '/audit-logs',
    icon: History,
    perm: 'audit_log:view',
    category: 'governance',
  },
  {
    label: 'Identitas Perusahaan',
    href: '/settings/company',
    icon: Building2,
    perm: 'system:settings',
    category: 'governance',
  },
  {
    label: 'Pemeliharaan Sistem',
    href: '/system',
    icon: Terminal,
    perm: 'system:settings',
    badge: 'Admin',
    category: 'governance',
  },
];

export function MobileNavDrawer({ user }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobileDrawerOpen, setIsMobileDrawerOpen } = useWorkspaceTabs();

  if (!isMobileDrawerOpen) return null;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsMobileDrawerOpen(false);
    router.push('/login');
    router.refresh();
  };

  const isSuper = user.permissions.includes('*:*') || user.roleCodes.includes('SUPER_ADMIN');
  const { config: companyConfig } = useCompanyConfig();
  const visibleItems = NAV_ITEMS.filter((item) => can(user, item.perm));
  const operasionalItems = visibleItems.filter((i) => i.category === 'operasional');
  const governanceItems = visibleItems.filter((i) => i.category === 'governance');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-nav-title"
      className="fixed inset-0 z-50 flex bg-black/80 backdrop-blur-md animate-in fade-in duration-200 md:hidden"
      onClick={() => setIsMobileDrawerOpen(false)}
    >
      <div
        className="w-4/5 max-w-sm h-full bg-[#0d0f17] border-r border-zinc-800 flex flex-col justify-between shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header brand */}
        <div>
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-sm text-white block line-clamp-1">{companyConfig.systemName}</span>
                <span className="text-[10px] text-zinc-400 line-clamp-1">{companyConfig.companyName}</span>
              </div>
            </div>
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-800/80 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User profile card */}
          <div className="p-3.5 mx-3 mt-3 rounded-2xl bg-zinc-900/90 border border-zinc-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-white truncate max-w-[170px]">
                {user.fullName}
              </span>
              {isSuper ? (
                <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Crown className="w-3 h-3 text-amber-400" />
                  *:*
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {user.roleCodes[0] || 'User'}
                </span>
              )}
            </div>
            <span className="text-[11px] text-zinc-400 block truncate">{user.email}</span>
          </div>

          {/* Quick Action Buttons */}
          <div className="px-3 pt-3 grid grid-cols-2 gap-2">
            <Link
              href="/catalog?action=add"
              onClick={() => setIsMobileDrawerOpen(false)}
              className="p-2.5 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-300 text-xs font-medium flex items-center gap-1.5 justify-center interactive-tap"
            >
              <FilePlus className="w-3.5 h-3.5 text-blue-400" />
              <span>+ Dokumen</span>
            </Link>
            <Link
              href="/dcr/new"
              onClick={() => setIsMobileDrawerOpen(false)}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-medium flex items-center gap-1.5 justify-center interactive-tap hover:border-zinc-700"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
              <span>+ Buat DCR</span>
            </Link>
          </div>

          {/* Navigation Items: Operasional */}
          <div className="px-3 pt-4">
            <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-zinc-500">
              Operasional Dokumen
            </div>
            <div className="space-y-1 mt-1">
              {operasionalItems.map((item) => {
                const isActive =
                  item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors interactive-tap ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                        : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Navigation Items: Tata Kelola */}
          {governanceItems.length > 0 && (
            <div className="px-3 pt-4 pb-2">
              <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-zinc-500">
                Tata Kelola & Konfigurasi
              </div>
              <div className="space-y-1 mt-1">
                {governanceItems.map((item) => {
                  const isActive = pathname?.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors interactive-tap ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                          : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {item.badge}
                        </span>
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer logout */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60">
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium flex items-center justify-center gap-2 interactive-tap cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar dari Sesi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
