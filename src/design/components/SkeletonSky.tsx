import React from 'react';

export interface SkeletonSkyProps {
  label?: string;
  sublabel?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'wide';
}

export const SkeletonSky: React.FC<SkeletonSkyProps> = ({
  label = 'SPHEREx DETECTOR READOUT IN PROGRESS',
  sublabel = 'Synthesizing calibrated 64×64 infrared arrays & WCS astrometry...',
  className = '',
  aspectRatio = 'square',
}) => {
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'h-64 sm:h-80',
  }[aspectRatio];

  return (
    <div
      className={`relative w-full ${aspectClasses} rounded-2xl bg-[#05070E] border border-white/10 overflow-hidden flex flex-col items-center justify-center p-6 text-center ${className}`}
    >
      {/* Detector grid motif background */}
      <div className="absolute inset-0 detector-grid-dense opacity-30" />

      {/* Sweep scanline */}
      <div className="animate-scanline" />

      {/* Corner crop-marks */}
      <div className="crop-mark-tl" aria-hidden="true" />
      <div className="crop-mark-tr" aria-hidden="true" />
      <div className="crop-mark-bl" aria-hidden="true" />
      <div className="crop-mark-br" aria-hidden="true" />

      {/* Central readout animation */}
      <div className="relative z-10 flex flex-col items-center gap-3 max-w-sm">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[#00D3F3]/20 animate-ping opacity-40" />
          <div className="absolute inset-0 rounded-full border border-t-[#00D3F3] border-r-transparent border-b-[#FFB900] border-l-transparent animate-spin" />
          <div className="w-2 h-2 rounded-full bg-[#00D3F3] shadow-[0_0_10px_#00D3F3]" />
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-widest text-[#00D3F3] font-medium">
            {label}
          </span>
          <span className="text-xs text-[#94A3B8] font-sans leading-relaxed">
            {sublabel}
          </span>
        </div>

        {/* Micro readout coordinates */}
        <div className="font-mono text-[10px] text-slate-500 tracking-wider">
          FOV ~6.6′ · 6.15″/PIX · BAND D1-D6
        </div>
      </div>
    </div>
  );
};
