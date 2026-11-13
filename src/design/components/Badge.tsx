import React from 'react';

export type BadgeVariant = 'REAL' | 'SAVED' | 'TRAINING' | 'UNVERIFIED' | 'ENLARGED_MOTION' | 'INFO';

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
