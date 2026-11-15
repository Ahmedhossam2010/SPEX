import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X, Sparkles, Check } from 'lucide-react';
import { Language, translations } from '../../utils/translations';
import { SpexPortrait } from '../../spex/SpexPortrait';
import { SPEXMood } from '../../spex/spexAssets';

export interface TourStep {
  id: string;
  targetId: string;
  title: string;
  desc: string;
  mood: SPEXMood;
}

export interface SpexGuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onStepComplete?: () => void;
}

export const SpexGuidedTour: React.FC<SpexGuidedTourProps> = ({
  isOpen,
  onClose,
  language,
  onStepComplete,
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [popupRect, setPopupRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  const steps: TourStep[] = [
    {
      id: 'step_play',
      targetId: 'play',
      title: t.tourStepPlayTitle,
      desc: t.tourStepPlayBody,
      mood: 'greeting',
    },
    {
      id: 'step_timeline',
      targetId: 'timeline',
      title: t.tourStepTimelineTitle,
      desc: t.tourStepTimelineBody,
      mood: 'explaining',
    },
    {
      id: 'step_telescopes',
      targetId: 'other_telescopes',
      title: t.tourStepTelescopesTitle,
      desc: t.tourStepTelescopesBody,
      mood: 'discovery',
    },
    {
      id: 'step_survey_pass',
      targetId: 'survey_pass',
      title: t.tourStepPassTitle,
      desc: t.tourStepPassBody,
      mood: 'thinking',
    },
    {
      id: 'step_share',
      targetId: 'share',
      title: t.tourStepShareTitle,
      desc: t.tourStepShareBody,
      mood: 'proud',
    },
    {
      id: 'step_help',
      targetId: 'help',
      title: t.tourStepHelpTitle,
      desc: t.tourStepHelpBody,
      mood: 'eureka',
    },
  ];

  const currentStep = steps[currentStepIdx] || steps[0];

  const measureRects = useCallback(() => {
    if (!currentStep || typeof document === 'undefined') return;
    const el = document.querySelector(`[data-tour="${currentStep.targetId}"]`) as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
    if (popupRef.current) {
      const pr = popupRef.current.getBoundingClientRect();
      setPopupRect({ x: pr.left, y: pr.top, w: pr.width, h: pr.height });
    }
  }, [currentStep]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIdx(0);
    }
  }, [isOpen]);

  const handleFinish = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('spex_tour_completed', 'true');
      }
    } catch {
      // ignore storage errors
    }
    onStepComplete?.();
    onClose();
  }, [onClose, onStepComplete]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(measureRects, 80);
    const raf = requestAnimationFrame(measureRects);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleFinish();
      }
    };
    window.addEventListener('resize', measureRects);
    window.addEventListener('scroll', measureRects, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measureRects);
      window.removeEventListener('scroll', measureRects, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, currentStepIdx, measureRects, handleFinish]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  let popupStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 100,
  };

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  if (targetRect) {
    if (vw < 640) {
      const placeAbove = targetRect.top > vh * 0.45;
      popupStyle = {
        ...popupStyle,
        left: '12px',
        right: '12px',
        ...(placeAbove
          ? { bottom: `${Math.min(vh - 140, Math.max(16, vh - targetRect.top + 20))}px` }
          : { top: `${Math.min(vh - 220, Math.max(16, targetRect.bottom + 20))}px` }),
      };
    } else {
      const boxW = 340;
      const boxH = 220;
      let left = targetRect.left + targetRect.width / 2 - boxW / 2;
      left = Math.max(16, Math.min(vw - boxW - 16, left));

      let top = targetRect.bottom + 24;
      if (top + boxH > vh - 16) {
        top = targetRect.top - boxH - 24;
      }
      top = Math.max(16, Math.min(vh - boxH - 16, top));

      popupStyle = {
        ...popupStyle,
        top: `${top}px`,
        left: `${left}px`,
        width: `${boxW}px`,
      };
    }
  } else {
    popupStyle = {
      ...popupStyle,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: '360px',
      width: 'calc(100vw - 2rem)',
    };
  }

  // Compute SVG arrow from popup border toward targetRect center
  let arrowCoords: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (targetRect && popupRect) {
    const tx = targetRect.left + targetRect.width / 2;
    const ty = targetRect.top + targetRect.height / 2;
    const px = popupRect.x + popupRect.w / 2;
    const py = popupRect.y + popupRect.h / 2;

    const dx = tx - px;
    const dy = ty - py;
    const dist = Math.hypot(dx, dy);
    if (dist > 28) {
      const startY = ty < py ? popupRect.y : ty > py + popupRect.h / 2 ? popupRect.y + popupRect.h : py;
      const startX = Math.max(popupRect.x + 20, Math.min(popupRect.x + popupRect.w - 20, tx));
      const pad = 10;
      const ux = (tx - startX) / Math.max(1, Math.hypot(tx - startX, ty - startY));
      const uy = (ty - startY) / Math.max(1, Math.hypot(tx - startX, ty - startY));
      arrowCoords = {
        x1: startX,
        y1: startY,
        x2: tx - ux * (Math.min(targetRect.width, targetRect.height) / 2 + pad),
        y2: ty - uy * (Math.min(targetRect.height, targetRect.width) / 2 + pad),
      };
    }
  }

  return (
    <div
      data-testid="spex-guided-tour"
      className="fixed inset-0 z-50 pointer-events-none select-none"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/35 pointer-events-none transition-opacity duration-200"
      />

      {targetRect && (
        <div
          className="fixed pointer-events-none rounded-xl border-2 border-[#FFB900] shadow-[0_0_24px_rgba(255,185,0,0.75)] transition-all duration-200"
          style={{
            top: `${Math.max(0, targetRect.top - 5)}px`,
            left: `${Math.max(0, targetRect.left - 5)}px`,
            width: `${targetRect.width + 10}px`,
            height: `${targetRect.height + 10}px`,
            zIndex: 92,
          }}
        >
          <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-[#FFB900] animate-ping" />
        </div>
      )}

      {arrowCoords && (
        <svg
          className="fixed inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 95 }}
          aria-hidden="true"
        >
          <defs>
            <marker
              id="spex-tour-arrowhead"
              markerWidth="10"
              markerHeight="8"
              refX="8"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 10 4, 0 8" fill="#FFB900" />
            </marker>
          </defs>
          <line
            x1={arrowCoords.x1}
            y1={arrowCoords.y1}
            x2={arrowCoords.x2}
            y2={arrowCoords.y2}
            stroke="#FFB900"
            strokeWidth="2.5"
            strokeLinecap="round"
            markerEnd="url(#spex-tour-arrowhead)"
          />
        </svg>
      )}

      <div
        ref={popupRef}
        style={popupStyle}
        role="dialog"
        aria-modal="false"
        aria-label={currentStep.title}
        className="pointer-events-auto bg-[#090D18]/95 backdrop-blur-2xl border border-[#FFB900]/45 rounded-2xl p-4 shadow-[0_16px_50px_rgba(0,0,0,0.92)] text-slate-100 space-y-3"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFB900]/20 to-[#00D3F3]/20 border border-[#FFB900]/40 p-1 flex items-center justify-center shrink-0">
              <SpexPortrait mood={currentStep.mood} size={28} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#FFB900] font-bold tracking-wider uppercase">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>
                  {currentStepIdx + 1} / {steps.length}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 leading-tight truncate">
                {currentStep.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            data-testid="tour-close-btn"
            onClick={handleFinish}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            aria-label={t.tourSkip}
            title={t.tourSkip}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{currentStep.desc}</p>

        <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
          <button
            type="button"
            data-testid="tour-skip-btn"
            onClick={handleFinish}
            className="text-xs font-mono text-slate-400 hover:text-slate-200 transition cursor-pointer px-2 py-1"
          >
            {t.tourSkip}
          </button>

          <div className="flex items-center gap-2">
            {currentStepIdx > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-200 transition cursor-pointer"
              >
                <ChevronLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                <span>{isRtl ? 'السابق' : 'Back'}</span>
              </button>
            )}

            <button
              type="button"
              data-testid="tour-next-btn"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FFB900] hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold transition shadow-md cursor-pointer"
            >
              <span>
                {currentStepIdx === steps.length - 1
                  ? isRtl
                    ? 'إنهاء'
                    : 'Done'
                  : isRtl
                  ? 'التالي'
                  : 'Next'}
              </span>
              {currentStepIdx === steps.length - 1 ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
