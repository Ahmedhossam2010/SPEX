import React from 'react';
import { Hand, MoveHorizontal, MoveVertical, ZoomIn, X } from 'lucide-react';
import { SpexPortrait } from '../spex/SpexPortrait';
import { Language, translations } from '../utils/translations';
import { usePrefersReducedMotion } from '../design/motionKit';

interface SpexGestureCoachProps {
  visible: boolean;
  onDismiss: () => void;
  language: Language;
}

export const SpexGestureCoach: React.FC<SpexGestureCoachProps> = ({
  visible,
  onDismiss,
  language,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  const reducedMotion = usePrefersReducedMotion();

  if (!visible) return null;

  return (
    <div
      data-testid="spex-gesture-coach"
      dir={isRtl ? 'rtl' : 'ltr'}
      role="region"
      aria-label={t.gestureHintTitle}
      className="pointer-events-none absolute inset-x-3 bottom-11 z-30 flex justify-start animate-fade-in"
    >
      <div className="pointer-events-auto relative max-w-[290px] w-full rounded-2xl border border-amber-400/45 bg-[#080F20]/94 backdrop-blur-xl p-3 sm:p-3.5 shadow-[0_18px_48px_rgba(0,0,0,0.75)] space-y-2.5">
        <div className="flex items-start gap-2.5">
          <SpexPortrait
            mood="explaining"
            size={38}
            interactive={false}
            className="shrink-0 rounded-xl bg-amber-500/10 border border-amber-500/25 p-1"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-sm font-bold text-amber-300">
              {t.gestureHintTitle}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-snug">
              {t.gestureHintSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t.tourSkip}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Animated Ghost-Finger Gesture Preview Stage */}
        <div className="relative h-20 rounded-xl bg-[#040711] border border-white/10 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 detector-grid opacity-40" />

          {/* Cross-axis visual tracks */}
          <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
          <div className="absolute inset-y-3 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-cyan-400/70 via-amber-300/60 to-rose-400/70" />

          {/* Ghost Finger Icon */}
          <div
            aria-hidden="true"
            className={`relative z-10 w-9 h-9 rounded-full bg-amber-400/20 border border-amber-300/80 flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)] ${
              reducedMotion ? '' : 'spex-ghost-finger'
            }`}
          >
            <Hand className="w-4 h-4" />
          </div>
        </div>

        {/* Concise gesture legend */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-slate-200">
            <MoveHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{t.gestureDragTime}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-200">
            <MoveVertical className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>{t.gestureDragWave}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <ZoomIn className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{t.gesturePinchReset}</span>
          </div>
        </div>

        <button
          type="button"
          data-testid="gesture-coach-dismiss-btn"
          onClick={onDismiss}
          className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition cursor-pointer"
        >
          {t.coachSkip}
        </button>
      </div>
    </div>
  );
};
