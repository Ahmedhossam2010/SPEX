import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Language } from '../../utils/translations';

export interface SpexUiHighlightProps {
  highlightId: string | null;
  onClear: () => void;
  language: Language;
}

export const SpexUiHighlight: React.FC<SpexUiHighlightProps> = ({
  highlightId,
  onClear,
  language,
}) => {
  const isRtl = language === 'ar';
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const measureTarget = useCallback(() => {
    if (!highlightId) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${highlightId}"]`);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [highlightId]);

  useEffect(() => {
    measureTarget();
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget);

    // Auto-dismiss after 7 seconds
    let dismissTimer: NodeJS.Timeout | null = null;
    if (highlightId) {
      dismissTimer = setTimeout(() => {
        onClear();
      }, 7000);
    }

    return () => {
      if (dismissTimer) clearTimeout(dismissTimer);
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget);
    };
  }, [highlightId, measureTarget, onClear]);

  if (!highlightId || !targetRect) return null;

  const isNearBottom = targetRect.top > window.innerHeight - 180;
  const topPos = isNearBottom
    ? Math.max(10, targetRect.top - 46)
    : targetRect.bottom + 12;

  const leftPos = Math.max(
    10,
    Math.min(window.innerWidth - 240, targetRect.left + targetRect.width / 2 - 100)
  );

  return (
    <div className="fixed inset-0 z-40 pointer-events-none select-none">
      {/* Animated Glowing Ring Around Element */}
      <div
        className="fixed pointer-events-none rounded-2xl border-2 border-[#00D3F3] shadow-[0_0_35px_rgba(0,211,243,0.85)] animate-pulse transition-all duration-300"
        style={{
          top: `${Math.max(0, targetRect.top - 6)}px`,
          left: `${Math.max(0, targetRect.left - 6)}px`,
          width: `${targetRect.width + 12}px`,
          height: `${targetRect.height + 12}px`,
        }}
      >
        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-[#00D3F3] animate-ping" />
      </div>

      {/* Pointing Callout Bubble */}
      <div
        style={{ top: `${topPos}px`, left: `${leftPos}px` }}
        className="fixed pointer-events-auto bg-[#0C0E14]/95 backdrop-blur-xl border border-[#00D3F3]/60 rounded-xl px-3 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.8)] flex items-center gap-2 animate-bounce-subtle"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <Sparkles className="w-3.5 h-3.5 text-[#00D3F3] shrink-0" />
        <span className="text-xs font-mono font-bold text-slate-100">
          {isRtl ? '👈 SPEX: بص هنا!' : '👉 SPEX: Look here!'}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer transition"
          title={isRtl ? 'إغلاق الإشارة' : 'Dismiss highlight'}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
