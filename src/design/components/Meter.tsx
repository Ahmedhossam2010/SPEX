import React from 'react';

export interface MeterProps {
  level: number; // 1 to 5
  maxLevel?: number; // default 5
  label?: string;
  significanceSigma?: number;
  className?: string;
}

export const Meter: React.FC<MeterProps> = ({
  level,
  maxLevel = 5,
  label,
  significanceSigma,
  className = '',
}) => {
  const clampedLevel = Math.max(1, Math.min(maxLevel, Math.round(level)));

  const levelLabels = [
    'Tentative (low signal)',
    'Marginal (possible residual)',
    'Moderate detection',
    'High confidence (>5σ)',
    'Confirmed discovery (>10σ)',
  ];

  const currentLabel = label || levelLabels[clampedLevel - 1] || `${clampedLevel}/${maxLevel}`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#94A3B8] font-mono uppercase tracking-wider text-[11px]">
          Confidence
        </span>
        <span className="text-[#F1F5F9] font-medium text-xs">
          {currentLabel}
          {significanceSigma != null && (
            <span className="text-[#00D3F3] ml-1 font-mono">({significanceSigma.toFixed(1)}σ)</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: maxLevel }).map((_, idx) => {
          const active = idx < clampedLevel;
          return (
            <div
              key={idx}
              className={`h-2 flex-1 rounded-sm transition-all duration-300 ${
                active
                  ? 'bg-gradient-to-r from-[#FFB900] to-[#FB9600] shadow-[0_0_8px_rgba(255,185,0,0.4)]'
                  : 'bg-white/10'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
