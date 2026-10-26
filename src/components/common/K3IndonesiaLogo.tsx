import React from 'react';

interface K3IndonesiaLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

/**
 * Official K3 Indonesia Logo (Kepmenaker RI No. 1135/MEN/1987)
 * 11-toothed green gear with equal-armed green cross on white circle badge.
 */
export function K3IndonesiaLogo({
  className = '',
  size = 32,
  showText = false,
}: K3IndonesiaLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div
        style={{ width: size, height: size }}
        className="rounded-full shadow-xs shrink-0 flex items-center justify-center relative overflow-hidden bg-white p-0.5 border border-zinc-200"
        title="Logo Resmi K3 Indonesia (Kepmenaker No. 1135/MEN/1987) - Utamakan Keselamatan dan Kesehatan Kerja"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/k3-indonesia-logo.svg"
          alt="Logo K3 Indonesia"
          className="w-full h-full object-contain"
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1 font-bold text-emerald-400 text-[11px] uppercase tracking-wider font-mono">
            <span>K3 INDONESIA</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              SMK3 PP 50
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 font-sans">
            Utamakan Keselamatan & Kesehatan Kerja
          </span>
        </div>
      )}
    </div>
  );
}
