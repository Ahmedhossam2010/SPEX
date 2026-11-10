import React from 'react';
import { Telescope, Compass } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  onExploreBenchmarks?: () => void;
  className?: string;
  actionText?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No one has looked at this patch yet in this release',
  description = 'NASA/IPAC SPHEREx QR2 covers the deep North Ecliptic Pole strip (~0.39 sq deg). The rest of the all-sky survey releases in subsequent batches.',
  onExploreBenchmarks,
  actionText = 'Jump to Verified North Ecliptic Pole Field',
  className = '',
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-[#0C0E14] border border-white/10 p-8 flex flex-col items-center text-center overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 detector-grid opacity-20 pointer-events-none" />

      <div className="relative z-10 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FFB900] mb-4 shadow-[0_0_24px_rgba(255,185,0,0.15)]">
        <Telescope className="w-6 h-6" />
      </div>

      <h3 className="relative z-10 text-base sm:text-lg font-serif font-bold text-[#F1F5F9] mb-2 max-w-md text-balance">
        {title}
      </h3>

      <p className="relative z-10 text-xs sm:text-sm text-[#94A3B8] max-w-md leading-relaxed mb-6 font-sans">
        {description}
      </p>

      {onExploreBenchmarks && (
        <div className="relative z-10">
          <Button
            variant="primary"
            size="md"
            icon={<Compass className="w-4 h-4" />}
            onClick={onExploreBenchmarks}
          >
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};
