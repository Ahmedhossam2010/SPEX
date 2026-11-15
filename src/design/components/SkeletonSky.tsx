import React from 'react';
import { Radio, Database } from 'lucide-react';
import { Button } from './Button';

export interface SkeletonSkyProps {
  label?: string;
  sublabel?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'wide';
  loaded?: number;
  total?: number;
  phase?: string;
  elapsedSec?: number;
  slowHint?: string;
  hasSavedCopy?: boolean;
  onUseSavedCopy?: () => void;
  savedCopyLabel?: string;
}

export const SkeletonSky: React.FC<SkeletonSkyProps> = ({
  label = 'SPHEREx is scanning this patch of sky...',
  sublabel = 'Receiving calibrated infrared frames & astrometry...',
  className = '',
  aspectRatio = 'square',
  loaded,
  total,
  phase,
  elapsedSec = 0,
  slowHint,
  hasSavedCopy = false,
  onUseSavedCopy,
  savedCopyLabel = 'Use offline demo data',
}) => {
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'h-64 sm:h-80',
  }[aspectRatio];

  const hasProgress = typeof loaded === 'number' && typeof total === 'number' && total > 0;
  const pct = hasProgress ? Math.min(100, Math.round((loaded! / total!) * 100)) : 0;
  const slotCount = hasProgress ? Math.min(12, total!) : 8;
  const filledSlots = hasProgress ? Math.round((loaded! / total!) * slotCount) : 0;

  return (
    <div
      className={`relative w-full ${aspectClasses} rounded-2xl bg-[#040711] border border-sky-400/20 overflow-hidden flex flex-col items-center justify-center p-5 sm:p-6 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Detector grid motif background */}
      <div className="absolute inset-0 detector-grid-dense opacity-40" />

      {/* Subtle twinkling placeholder stars */}
      <div className="pointer-events-none absolute inset-0 opacity-45" aria-hidden="true">
        <span className="absolute top-[20%] left-[24%] w-1.5 h-1.5 rounded-full bg-slate-300" />
        <span className="absolute top-[34%] right-[22%] w-1 h-1 rounded-full bg-amber-300" />
        <span className="absolute bottom-[28%] left-[32%] w-1.5 h-1.5 rounded-full bg-sky-300" />
        <span className="absolute bottom-[22%] right-[28%] w-2 h-2 rounded-full bg-slate-400" />
      </div>

      {/* Scanning beam sweep */}
      <div className="animate-scanline" aria-hidden="true" />

      {/* Corner crop-marks */}
      <div className="crop-mark-tl" aria-hidden="true" />
      <div className="crop-mark-tr" aria-hidden="true" />
      <div className="crop-mark-bl" aria-hidden="true" />
      <div className="crop-mark-br" aria-hidden="true" />

      {/* Central SPHEREx Scanner */}
      <div className="relative z-10 flex flex-col items-center gap-3.5 max-w-sm w-full">
        <div className="relative w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-400/35 flex items-center justify-center shadow-[0_0_24px_rgba(56,189,248,0.2)]">
          <Radio className="w-6 h-6 text-sky-400 animate-pulse" />
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-display text-sm sm:text-base font-bold text-slate-100">
            {label}
          </span>
          <span className="text-xs text-slate-400 leading-relaxed">
            {phase || sublabel}
          </span>
          {elapsedSec >= 4 && slowHint && (
            <span className="text-[11px] text-amber-300/90 leading-snug mt-0.5 tabular-nums">
              {slowHint} ({elapsedSec}s)
            </span>
          )}
        </div>

        {/* Frame-by-frame arrival strip */}
        <div className="w-full max-w-[260px] space-y-2">
          <div className="grid grid-cols-8 sm:grid-cols-12 gap-1 justify-center">
            {Array.from({ length: slotCount }).map((_, idx) => {
              const arrived = hasProgress ? idx < filledSlots : idx === 0;
              return (
                <div
                  key={idx}
                  className={`h-2 rounded-sm transition-all duration-300 ${
                    arrived
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.55)]'
                      : 'bg-white/10'
                  }`}
                />
              );
            })}
          </div>

          {hasProgress && (
            <div className="flex items-center justify-between text-[11px] font-mono text-sky-300 tabular-nums">
              <span>
                {loaded}/{total}
              </span>
              <span>{pct}%</span>
            </div>
          )}
        </div>

        {hasSavedCopy && onUseSavedCopy && elapsedSec >= 3 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Database className="w-3.5 h-3.5" />}
            onClick={onUseSavedCopy}
          >
            {savedCopyLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
