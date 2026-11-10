import React from 'react';
import { AlertCircle, RotateCcw, Database } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  error?: string;
  canRetry?: boolean;
  onRetry?: () => void;
  hasSavedCopy?: boolean;
  onUseSavedCopy?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Archive Unreachable',
  error = 'Could not establish connection to the NASA/IPAC IRSA TAP endpoint. Outbound network may be offline or rate-limited.',
  canRetry = true,
  onRetry,
  hasSavedCopy = true,
  onUseSavedCopy,
  className = '',
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-[#0C0E14] border border-[#FF637E]/25 p-8 flex flex-col items-center text-center overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 detector-grid opacity-15 pointer-events-none" />

      <div className="relative z-10 w-12 h-12 rounded-2xl bg-[#FF637E]/10 border border-[#FF637E]/30 flex items-center justify-center text-[#FF637E] mb-4 shadow-[0_0_24px_rgba(255,99,126,0.2)]">
        <AlertCircle className="w-6 h-6" />
      </div>

      <h3 className="relative z-10 text-base sm:text-lg font-serif font-bold text-[#F1F5F9] mb-2 max-w-md">
        {title}
      </h3>

      <p className="relative z-10 text-xs sm:text-sm text-[#94A3B8] max-w-md leading-relaxed mb-6 font-sans">
        {error}
      </p>

      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
        {canRetry && onRetry && (
          <Button
            variant="secondary"
            size="md"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={onRetry}
          >
            Retry Connection
          </Button>
        )}

        {hasSavedCopy && onUseSavedCopy && (
          <Button
            variant="primary"
            size="md"
            icon={<Database className="w-4 h-4" />}
            onClick={onUseSavedCopy}
          >
            Use Saved Copy (Offline)
          </Button>
        )}
      </div>
    </div>
  );
};
