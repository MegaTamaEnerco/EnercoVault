'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export interface WorkspaceTab {
  id: string;
  title: string;
  href: string;
  iconName?: string;
  isPinned?: boolean;
  badge?: string;
  createdAt: number;
}

// Known route definitions for automatic title & icon assignment
export const KNOWN_ROUTES: Record<string, { title: string; iconName: string }> = {
  '/': { title: 'Dasbor Eksekutif', iconName: 'LayoutDashboard' },
  '/catalog': { title: 'Katalog Dokumen', iconName: 'FolderTree' },
  '/ims-matrix': { title: 'Matriks Kepatuhan IMS', iconName: 'Network' },
  '/dcr': { title: 'Permintaan Perubahan (DCR)', iconName: 'GitPullRequest' },
  '/dcr/new': { title: 'Ajukan DCR Baru', iconName: 'FilePlus' },
  '/settings/taxonomies': { title: 'Kategori Dokumen', iconName: 'Tags' },
  '/settings/frameworks': { title: 'Standar & Klausul ISO', iconName: 'Award' },
  '/settings/users': { title: 'Manajemen Pengguna', iconName: 'Users' },
  '/settings/roles': { title: 'Hak Akses & Peran', iconName: 'ShieldCheck' },
  '/audit-logs': { title: 'Catatan Audit', iconName: 'History' },
  '/system': { title: 'Pemeliharaan Sistem', iconName: 'Terminal' },
};

const DEFAULT_TABS: WorkspaceTab[] = [
  { id: '/', title: 'Dasbor Eksekutif', href: '/', iconName: 'LayoutDashboard', isPinned: true, createdAt: 1 },
  { id: '/catalog', title: 'Katalog Dokumen', href: '/catalog', iconName: 'FolderTree', createdAt: 2 },
];

const STORAGE_KEY = 'enerco_workspace_tabs_v2';

interface WorkspaceTabsContextType {
  tabs: WorkspaceTab[];
  activeTabId: string;
  openTab: (tab: { id: string; title: string; href: string; iconName?: string; isPinned?: boolean; badge?: string }) => void;
  closeTab: (id: string, e?: React.MouseEvent) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  togglePinTab: (id: string) => void;
  isOpenerOpen: boolean;
  setIsOpenerOpen: (open: boolean) => void;
  isMobileSwitcherOpen: boolean;
  setIsMobileSwitcherOpen: (open: boolean) => void;
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
}

const WorkspaceTabsContext = createContext<WorkspaceTabsContextType | undefined>(undefined);

export function WorkspaceTabsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [tabs, setTabs] = useState<WorkspaceTab[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState<string>(pathname || '/');
  const [isOpenerOpen, setIsOpenerOpen] = useState(false);
  const [isMobileSwitcherOpen, setIsMobileSwitcherOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load tabs from localStorage on initial client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTabs(parsed);
        }
      }
    } catch {
      // Fallback to default
    }
    setIsInitialized(true);
  }, []);

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
    } catch {
      // Ignore quota/private mode errors
    }
  }, [tabs, isInitialized]);

  // Sync current pathname with tabs
  useEffect(() => {
    if (!pathname || pathname.startsWith('/login') || pathname.startsWith('/verify')) return;

    setActiveTabId(pathname);

    setTabs((prevTabs) => {
      const existing = prevTabs.find((t) => t.href === pathname || t.id === pathname);
      if (existing) {
        return prevTabs;
      }

      // Detect meta from known routes or generate cleanly
      const meta = KNOWN_ROUTES[pathname] || {
        title: pathname.split('/').filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') || 'Halaman',
        iconName: 'FolderTree',
      };

      const newTab: WorkspaceTab = {
        id: pathname,
        title: meta.title,
        href: pathname,
        iconName: meta.iconName,
        createdAt: Date.now(),
      };

      return [...prevTabs, newTab];
    });
  }, [pathname]);

  const openTab = useCallback(
    (tabData: { id: string; title: string; href: string; iconName?: string; isPinned?: boolean; badge?: string }) => {
      setTabs((prev) => {
        const exists = prev.find((t) => t.id === tabData.id || t.href === tabData.href);
        if (exists) {
          return prev;
        }
        return [
          ...prev,
          {
            ...tabData,
            createdAt: Date.now(),
          },
        ];
      });
      setActiveTabId(tabData.id);
      setIsOpenerOpen(false);
      setIsMobileSwitcherOpen(false);
      router.push(tabData.href);
    },
    [router]
  );

  const closeTab = useCallback(
    (id: string, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      setTabs((prev) => {
        const tabToClose = prev.find((t) => t.id === id);
        if (tabToClose?.isPinned) return prev; // Cannot close pinned tabs

        const newTabs = prev.filter((t) => t.id !== id);
        if (newTabs.length === 0) {
          // Keep at least default dashboard tab
          return DEFAULT_TABS;
        }

        // If closing active tab, switch to adjacent tab
        if (activeTabId === id) {
          const closingIndex = prev.findIndex((t) => t.id === id);
          const nextTab = newTabs[Math.max(0, closingIndex - 1)] || newTabs[0];
          setActiveTabId(nextTab.id);
          router.push(nextTab.href);
        }

        return newTabs;
      });
    },
    [activeTabId, router]
  );

  const closeOtherTabs = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const target = prev.find((t) => t.id === id);
        if (!target) return prev;
        const pinned = prev.filter((t) => t.isPinned && t.id !== id);
        return [...pinned, target];
      });
      setActiveTabId(id);
    },
    []
  );

  const closeAllTabs = useCallback(() => {
    setTabs((prev) => {
      const pinned = prev.filter((t) => t.isPinned);
      return pinned.length > 0 ? pinned : [DEFAULT_TABS[0]];
    });
    router.push('/');
    setActiveTabId('/');
    setIsMobileSwitcherOpen(false);
  }, [router]);

  const togglePinTab = useCallback((id: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isPinned: !t.isPinned } : t))
    );
  }, []);

  return (
    <WorkspaceTabsContext.Provider
      value={{
        tabs,
        activeTabId,
        openTab,
        closeTab,
        closeOtherTabs,
        closeAllTabs,
        togglePinTab,
        isOpenerOpen,
        setIsOpenerOpen,
        isMobileSwitcherOpen,
        setIsMobileSwitcherOpen,
        isMobileDrawerOpen,
        setIsMobileDrawerOpen,
      }}
    >
      {children}
    </WorkspaceTabsContext.Provider>
  );
}

export function useWorkspaceTabs() {
  const context = useContext(WorkspaceTabsContext);
  if (!context) {
    throw new Error('useWorkspaceTabs must be used within a WorkspaceTabsProvider');
  }
  return context;
}
