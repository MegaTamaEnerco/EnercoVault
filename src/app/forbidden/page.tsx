'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldX, ArrowLeft, LogOut } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07080c] flex items-center justify-center text-zinc-500 text-xs">Memuat...</div>}>
      <ForbiddenContent />
    </Suspense>
  );
}

function ForbiddenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const required = searchParams.get('required') || 'Tidak dispesifikasikan';

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#07080c]">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6 text-red-400">
          <ShieldX className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-semibold text-white mb-2">403 — Akses Ditolak</h1>
        <p className="text-sm text-zinc-400 mb-6 max-w-sm mx-auto">
          Akun Anda tidak memiliki izin yang cukup untuk mengakses halaman atau fitur ini.
        </p>

        <div className="glass-panel rounded-xl p-4 mb-6 text-left border border-zinc-800">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
            Izin yang Dibutuhkan
          </div>
          <code className="text-xs text-red-400 font-mono bg-red-950/40 px-2 py-1 rounded border border-red-800/50 block">
            {required}
          </code>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium flex items-center gap-2 interactive-tap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Dasbor
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-medium flex items-center gap-2 interactive-tap"
          >
            <LogOut className="w-3.5 h-3.5" />
            Ganti Akun
          </button>
        </div>
      </div>
    </div>
  );
}
