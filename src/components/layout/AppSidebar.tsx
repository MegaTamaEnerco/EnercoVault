'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { SessionUser, can } from '@/lib/rbac';
import { Permission } from '@/lib/permissions';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  perm: Permission;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dasbor Eksekutif',
    href: '/',
    icon: LayoutDashboard,
    perm: 'dashboard:view',
  },
  {
    label: 'Katalog Dokumen',
    href: '/catalog',
    icon: FolderTree,
    perm: 'document:view',
  },
  {
    label: 'Matriks Kepatuhan IMS',
    href: '/ims-matrix',
    icon: Network,
    perm: 'ims_matrix:view',
  },
  {
    label: 'Permintaan Perubahan (DCR)',
    href: '/dcr',
    icon: GitPullRequest,
    perm: 'dcr:view',
  },
  {
    label: 'Kategori Dokumen',
    href: '/settings/taxonomies',
    icon: Tags,
    perm: 'taxonomy:manage',
  },
  {
    label: 'Standar & Klausul ISO',
    href: '/settings/frameworks',
    icon: Award,
    perm: 'framework:manage',
  },
  {
    label: 'Manajemen Pengguna',
    href: '/settings/users',
    icon: Users,
    perm: 'user:view',
  },
  {
    label: 'Hak Akses & Peran',
    href: '/settings/roles',
    icon: ShieldCheck,
    perm: 'role:manage',
  },
  {
    label: 'Catatan Audit',
    href: '/audit-logs',
    icon: History,
    perm: 'audit_log:view',
  },
  {
    label: 'Identitas Perusahaan',
    href: '/settings/company',
    icon: Building2,
    perm: 'system:settings',
  },
  {
    label: 'Pemeliharaan Sistem',
    href: '/system',
    icon: Terminal,
    perm: 'system:settings',
    badge: 'Admin',
  },
];

export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapse state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('enerco_sidebar_collapsed');
      if (stored !== null) {
        setIsCollapsed(stored === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('enerco_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Filter items based on user permissions
  const visibleItems = NAV_ITEMS.filter((item) => can(user, item.perm));

  return (
    <aside
      className={`sticky top-[97px] shrink-0 h-[calc(100vh-97px)] glass-panel border-r border-zinc-800/80 p-2.5 sm:p-3 flex flex-col justify-between hidden md:flex transition-all duration-200 select-none overflow-hidden ${
        isCollapsed ? 'w-[68px]' : 'w-64'
      }`}
    >
      <div className="space-y-1 flex-1 overflow-y-auto no-scrollbar pr-0.5 pb-2">
        <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-zinc-500">
          {!isCollapsed && <span>Modul Navigasi</span>}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? 'Perluas Menu Sidebar' : 'Ciutkan Menu Sidebar'}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors mx-auto cursor-pointer"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {visibleItems.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center ${
                isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
              } rounded-xl text-xs font-medium interactive-tap transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/25 shadow-sm shadow-blue-500/5'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Scope info footer */}
      <div className="shrink-0 pt-2 border-t border-zinc-800/60 mt-1">
        {!isCollapsed ? (
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-500">
            <div className="text-zinc-400 font-medium mb-1 flex items-center justify-between">
              <span>Scope Akses</span>
              <span className="font-mono text-zinc-300">{user.dataScope}</span>
            </div>
            <div className="line-clamp-2">
              {user.permissions.includes('*:*')
                ? 'Super Admin: Bebas akses seluruh berkas.'
                : 'Akses dibatasi sesuai unit kerja.'}
            </div>
          </div>
        ) : (
          <div
            title={`Scope Akses: ${user.dataScope}`}
            className="p-2 text-center rounded-xl bg-zinc-900/60 border border-zinc-800 text-[10px] font-mono text-zinc-400"
          >
            {user.dataScope === 'ALL' ? '*:*' : user.dataScope.slice(0, 3)}
          </div>
        )}
      </div>
    </aside>
  );
}
