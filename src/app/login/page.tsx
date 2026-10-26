'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldAlert,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  Database,
  CheckCircle2,
  Crown,
  FolderTree,
} from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07080c] flex items-center justify-center text-zinc-500 text-xs">Memuat portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/catalog';

  const [identifier, setIdentifier] = useState('superadmin');
  const [password, setPassword] = useState('SuperAdmin2026!');
  const [loading, setLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier || !password) {
      setError('Harap isi username/email dan password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Autentikasi gagal');
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectSuperAdminLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'superadmin', password: 'SuperAdmin2026!' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login Super Admin gagal');

      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeedLoading(true);
    setSeedMsg(null);
    setError(null);
    try {
      const res = await fetch('/api/seed');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seed gagal');
      setSeedMsg('Database siap! Super Admin & Roles berhasil diinisialisasi.');
      setIdentifier('superadmin');
      setPassword('SuperAdmin2026!');
    } catch (err: any) {
      setError('Gagal inisialisasi database: ' + err.message);
    } finally {
      setSeedLoading(false);
    }
  };

  const fillCredentials = (user: string, pass: string) => {
    setIdentifier(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#07080c] relative overflow-hidden">
      {/* Subtle background ambient gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 mb-4 shadow-lg shadow-blue-500/5">
            <ShieldAlert className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">
            Enerco Vault
          </h1>
          <p className="text-xs text-zinc-400">
            Enterprise Document Management & Integrated Compliance (v2.1)
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-white mb-0.5">Masuk ke Portal</h2>
              <p className="text-xs text-zinc-400">
                Akses terkontrol berbasis peran (RBAC)
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
              v2.1 IMS
            </span>
          </div>

          {/* Super Admin Quick One-Click Entry */}
          <button
            type="button"
            onClick={handleDirectSuperAdminLogin}
            disabled={loading}
            className="w-full mb-5 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-blue-600/20 to-indigo-600/20 hover:from-amber-500/30 hover:to-indigo-600/30 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center justify-between interactive-tap shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Masuk Langsung: Super Admin (*:*)</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-300">
              <span>Buka Katalog</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </button>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {seedMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{seedMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Username atau Email Korporat
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@enerco.co.id / superadmin"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Kata Sandi
                </label>
                <span className="text-[11px] text-zinc-500 hover:text-zinc-400 cursor-pointer">
                  Default: SuperAdmin2026!
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center justify-center gap-2 interactive-tap shadow-lg shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Memverifikasi kredensial...</span>
              ) : (
                <>
                  <span>Masuk Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick preset selector for testing RBAC */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Preset Login Cepat:
              </span>
              <button
                type="button"
                onClick={handleSeed}
                disabled={seedLoading}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="Initialize default roles & superadmin in database"
              >
                <Database className="w-3 h-3" />
                {seedLoading ? 'Seeding...' : 'Init DB Seed'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('superadmin', 'SuperAdmin2026!')}
                className="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-left interactive-tap cursor-pointer"
              >
                <div className="font-medium text-amber-300 text-[11px] flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  <span>Super Admin</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">superadmin (*:*)</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('admin@enerco.co.id', 'SuperAdmin2026!')}
                className="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-left interactive-tap cursor-pointer"
              >
                <div className="font-medium text-blue-300 text-[11px]">Email Korporat</div>
                <div className="text-[10px] text-zinc-500 font-mono">admin@enerco.co.id</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-zinc-600 text-[11px]">
          Dilindungi oleh Zero-Cloud On-Premise Storage & Argon2/Bcrypt Guard.
        </div>
      </div>
    </div>
  );
}
