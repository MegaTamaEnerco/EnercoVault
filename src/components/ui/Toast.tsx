'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, message }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback(
    (msg: string, title?: string) => showToast(msg, 'success', title),
    [showToast]
  );

  const error = useCallback(
    (msg: string, title?: string) => showToast(msg, 'error', title),
    [showToast]
  );

  const info = useCallback(
    (msg: string, title?: string) => showToast(msg, 'info', title),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}

      {/* Floating Apple-style Toast Container */}
      <div
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2 sm:p-0"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';

          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl glass-panel shadow-xl border backdrop-blur-xl transition-all animate-in slide-in-from-bottom-3 duration-200 ${
                isSuccess
                  ? 'border-emerald-500/30 bg-[#0f1d19]/90 text-emerald-200'
                  : isError
                  ? 'border-red-500/30 bg-[#241215]/90 text-red-200'
                  : 'border-blue-500/30 bg-[#0e1628]/90 text-blue-200'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {isError && <AlertCircle className="w-4 h-4 text-red-400" />}
                {!isSuccess && !isError && <Info className="w-4 h-4 text-blue-400" />}
              </div>

              <div className="flex-1 text-xs">
                {t.title && <div className="font-semibold text-white mb-0.5">{t.title}</div>}
                <div className="text-zinc-300 leading-snug">{t.message}</div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 shrink-0 interactive-tap cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if rendered outside provider so it never throws
    return {
      showToast: (msg: string) => console.log('[Toast]', msg),
      success: (msg: string) => console.log('[Toast Success]', msg),
      error: (msg: string) => console.error('[Toast Error]', msg),
      info: (msg: string) => console.log('[Toast Info]', msg),
    };
  }
  return ctx;
}
