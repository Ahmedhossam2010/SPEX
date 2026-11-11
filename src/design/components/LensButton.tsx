import React from 'react';

export type LensMode = 'time' | 'colors' | 'doubt' | 'neighbors';

export interface LensButtonProps {
  id: LensMode;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  color?: 'amber' | 'cyan' | 'rose' | 'emerald';
  className?: string;
}

export const LensButton: React.FC<LensButtonProps> = ({
  id,
  label,
  sublabel,
  icon,
  isActive,
  onClick,
  color = 'amber',
  className = '',
}) => {
  const activeColorStyles = {
    amber: 'border-[#FFB900] bg-[#FFB900]/15 text-[#FFB900] shadow-[0_0_20px_rgba(255,185,0,0.3)]',
    cyan: 'border-[#00D3F3] bg-[#00D3F3]/15 text-[#00D3F3] shadow-[0_0_20px_rgba(0,211,243,0.3)]',
    rose: 'border-[#FF637E] bg-[#FF637E]/15 text-[#FF637E] shadow-[0_0_20px_rgba(255,99,126,0.3)]',
    emerald: 'border-emerald-400 bg-emerald-500/15 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]',
  }[color];

  return (
    <button
      type="button"
      data-tour={`lens_${id}`}
      onClick={onClick}
      className={`relative group flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all duration-200 cursor-pointer select-none backdrop-blur-md ${
        isActive
          ? activeColorStyles
          : 'border-white/10 bg-[#0C0E14]/80 text-[#94A3B8] hover:text-[#F1F5F9] hover:border-white/20 hover:bg-[#141824]'
      } ${className}`}
    >
      <div className={`shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
        {icon}
      </div>

      <div className="flex flex-col text-left">
        <span className="text-xs sm:text-sm font-semibold tracking-wide leading-tight">
          {label}
        </span>
        {sublabel && (
          <span className="text-[10px] text-slate-400 font-mono tracking-wider leading-none mt-0.5">
            {sublabel}
          </span>
        )}
      </div>

      {isActive && (
        <span
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
          style={{ backgroundColor: 'currentColor' }}
        />
      )}
    </button>
  );
};
