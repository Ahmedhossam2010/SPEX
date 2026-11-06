import React from 'react';

interface SpherexLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
  subtext?: string;
}

/**
 * Authoritative SPEX "The Changing Sky" Brand Logo
 * Uses the exact provided brand asset: /assets/aistudio/eye_logo_no_text_centered_e772aeab.png
 * Preserves true geometry, proportions, celestial gradients, and alignment.
 */
export const SpherexLogo: React.FC<SpherexLogoProps> = ({
  className = '',
  size = 40,
  showText = false,
  textClassName = '',
  subtext,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className="relative flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-105"
        style={{ width: size, height: size }}
      >
        <img
          src="/assets/aistudio/eye_logo_no_text_centered_e772aeab.png"
          alt="SPEX — The Changing Sky"
          width={size}
          height={size}
          className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(56,189,248,0.35)]"
          loading="eager"
        />
      </div>

      {showText && (
        <div className={`flex flex-col select-none ${textClassName}`}>
          <div className="flex items-center gap-2">
            <span className="font-['Outfit'] font-black tracking-widest text-slate-900 dark:text-slate-100 uppercase text-base sm:text-lg leading-none">
              SPEX
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-semibold border border-cyan-500/20 leading-none">
              SPHEREx
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono text-slate-500 dark:text-slate-400 tracking-tight leading-tight mt-0.5">
            {subtext || 'The Changing Sky'}
          </span>
        </div>
      )}
    </div>
  );
};
