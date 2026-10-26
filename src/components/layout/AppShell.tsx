'use client';

import React from 'react';
import { SessionUser } from '@/lib/rbac';
import { AppNavbar } from './AppNavbar';
import { AppSidebar } from './AppSidebar';
import { WorkspaceTabBar } from './WorkspaceTabBar';
import { ContextTabsOpenerModal } from './ContextTabsOpenerModal';
import { MobileNavDrawer } from './MobileNavDrawer';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileTabSwitcherSheet } from './MobileTabSwitcherSheet';

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
  maxWidth?: string;
}

export function AppShell({ user, children, maxWidth = 'w-full' }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#07080c] flex flex-col text-zinc-100 selection:bg-blue-500/30 selection:text-white">
      {/* Top Main Navbar */}
      <AppNavbar user={user} />

      {/* Multitasking Workspace Tab Bar */}
      <WorkspaceTabBar />

      {/* Body: Sidebar + Main Content */}
      <div className="flex flex-1 relative items-start">
        <AppSidebar user={user} />

        <main className={`flex-1 p-3.5 sm:p-6 lg:p-8 ${maxWidth} ${maxWidth !== 'w-full' ? 'mx-auto' : ''} min-w-0 pb-24 md:pb-8`}>
          {children}
        </main>
      </div>

      {/* Mobile Experience Enhancements */}
      <MobileNavDrawer user={user} />
      <MobileBottomNav />
      <MobileTabSwitcherSheet />

      {/* Multitasking Command Palette / Tab Opener Modal */}
      <ContextTabsOpenerModal />
    </div>
  );
}
