import React from 'react';

export type BadgeVariant =
  | 'LIVE_ARCHIVE_DATA'
  | 'VERIFIED_FITS_CACHE'
  | 'STALE_TAP_CACHE'
  | 'SAVED_BENCHMARK'
  | 'SYNTHETIC_DEMO'
  | 'UNAVAILABLE'
  | 'REAL'
  | 'SAVED'
  | 'TRAINING'
  | 'UNVERIFIED'
  | 'ENLARGED_MOTION'
  | 'INFO';

export interface BadgeProps {
  variant: BadgeVariant;
  size?: 'sm' | 'md';
  customText?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant,
  size = 'md',
  customText,
  className = '',
}) => {
  const configs: Record<
    BadgeVariant,
    { label: string; bg: string; text: string; border: string; glow?: string }
  > = {
    LIVE_ARCHIVE_DATA: {
      label: 'LIVE ARCHIVE DATA',
      bg: 'bg-emerald-500/12',
      text: 'text-emerald-300',
      border: 'border-emerald-500/35',
      glow: 'shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    },
    VERIFIED_FITS_CACHE: {
      label: 'VERIFIED FITS CACHE',
      bg: 'bg-[#00D3F3]/12',
      text: 'text-[#00D3F3]',
      border: 'border-[#00D3F3]/35',
      glow: 'shadow-[0_0_12px_rgba(0,211,243,0.15)]',
    },
    STALE_TAP_CACHE: {
      label: 'STALE TAP CACHE (NOT LIVE)',
      bg: 'bg-amber-500/15',
      text: 'text-amber-300',
      border: 'border-amber-500/40',
    },
    SAVED_BENCHMARK: {
      label: 'SAVED BENCHMARK SNAPSHOT',
      bg: 'bg-indigo-500/15',
      text: 'text-indigo-300',
      border: 'border-indigo-500/35',
    },
    SYNTHETIC_DEMO: {
      label: 'SYNTHETIC DEMO FIELD',
      bg: 'bg-orange-500/15',
      text: 'text-orange-300',
      border: 'border-orange-500/40',
    },
    UNAVAILABLE: {
      label: 'ARCHIVE UNAVAILABLE',
      bg: 'bg-rose-500/15',
      text: 'text-rose-300',
      border: 'border-rose-500/40',
    },
    REAL: {
      label: 'REAL SPHEREx DATA',
      bg: 'bg-[#00D3F3]/10',
      text: 'text-[#00D3F3]',
      border: 'border-[#00D3F3]/30',
      glow: 'shadow-[0_0_12px_rgba(0,211,243,0.15)]',
    },
    SAVED: {
      label: 'REAL SPHEREx DATA - cached',
      bg: 'bg-[#FFB900]/10',
      text: 'text-[#FFB900]',
      border: 'border-[#FFB900]/30',
      glow: 'shadow-[0_0_12px_rgba(255,185,0,0.12)]',
    },
    TRAINING: {
      label: 'TRAINING DATA',
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-300',
      border: 'border-indigo-500/25',
    },
    UNVERIFIED: {
      label: 'POSITION PENDING VERIFICATION',
      bg: 'bg-[#FF637E]/10',
      text: 'text-[#FF637E]',
      border: 'border-[#FF637E]/30',
      glow: 'shadow-[0_0_12px_rgba(255,99,126,0.15)]',
    },
    ENLARGED_MOTION: {
      label: 'ENLARGED FOR ILLUSTRATION',
      bg: 'bg-amber-400/10',
      text: 'text-amber-300',
      border: 'border-amber-400/25',
    },
    INFO: {
      label: 'SCIENCE REFERENCE',
      bg: 'bg-slate-800/60',
      text: 'text-slate-300',
      border: 'border-white/10',
    },
  };

  const config = configs[variant];
  const label = customText || config.label;

  const sizeClasses =
    size === 'sm' ? 'text-[10px] px-2 py-0.5 tracking-wider' : 'text-xs px-2.5 py-1 tracking-wide';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase font-medium rounded-md border ${config.bg} ${config.text} ${config.border} ${config.glow || ''} ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'currentColor' }} />
      <span>{label}</span>
    </span>
  );
};
