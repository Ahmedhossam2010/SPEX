import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Compass,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Language } from '../../utils/translations';
import { SpexPortrait } from '../../spex/SpexPortrait';
import { SPEXMood } from '../../spex/spexAssets';

export interface TourStep {
  id: string;
  targetId: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  mood: SPEXMood;
  prepareAction?: () => void;
}

export interface SpexGuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onActivateLens?: (lens: 'time' | 'colors' | 'doubt' | 'neighbors') => void;
  onActivateCurtain?: (active: boolean) => void;
}

export const SpexGuidedTour: React.FC<SpexGuidedTourProps> = ({
  isOpen,
  onClose,
  language,
  onActivateLens,
  onActivateCurtain,
}) => {
  const isRtl = language === 'ar';
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps: TourStep[] = [
    {
      id: 'step_viewport',
      targetId: 'viewport_canvas',
      titleEn: 'Astronomical Sky Viewport',
      titleAr: 'نافذة الرصد الفلكي الرئيسية',
      descEn:
        'This is real, calibrated infrared data from NASA’s SPHEREx space telescope. You can pan, zoom, and inspect genuine cosmic sources in deep space.',
      descAr:
        'دي بيانات حقيقية ومعايرة بالأشعة تحت الحمراء من تلسكوب ناسا SPHEREx. تقدر تسحب وتكبر وتستكشف الأجرام الفلكية الحقيقية في أعماق الفضاء.',
      mood: 'greeting',
    },
    {
      id: 'step_time_lens',
      targetId: 'lens_time',
      titleEn: 'TIME Lens · Temporal Comparison',
      titleAr: 'عدسة الزمن والتعاقب الفلكي',
      descEn:
        'Compare exposures taken ~2.1 minutes apart to spot fast astrophysical shifts, flickers, and motion across the sky.',
      descAr:
        'قارن بين لقطات تفصل بينها 2.1 دقيقة بس عشان تكتشف التغيرات والوميض والحركة الكونية السريعة في سماء SPHEREx.',
      mood: 'explaining',
      prepareAction: () => {
        if (onActivateLens) onActivateLens('time');
      },
    },
    {
      id: 'step_epoch_selector',
      targetId: 'epoch_selector',
      titleEn: 'Observation Epochs',
      titleAr: 'لقطات التعاقب الزمني',
      descEn:
        'Toggle between Visit 1, Visit 2, and the computed difference image to isolate exactly what changed between scans.',
      descAr:
        'تنقل بين اللقطة الأولى والتانية وصورة الفارق المحسوبة عشان تعزل بالظبط إيه اللي اتغير بين المسحات.',
      mood: 'thinking',
      prepareAction: () => {
        if (onActivateLens) onActivateLens('time');
      },
    },
    {
      id: 'step_curtain',
      targetId: 'curtain_divider',
      titleEn: 'Comparison Curtain',
      titleAr: 'ستارة المقارنة المباشرة',
      descEn:
        'Drag this divider handle left and right to wipe directly between the before and after observations in real time.',
      descAr:
        'اسحب مقبض الستارة يمين وشمال عشان تقارن بالعين المجردة بين الصورتين قبل وبعد في نفس اللحظة.',
      mood: 'eureka',
      prepareAction: () => {
        if (onActivateLens) onActivateLens('time');
        if (onActivateCurtain) onActivateCurtain(true);
      },
    },
    {
      id: 'step_colors_lens',
      targetId: 'lens_colors',
      titleEn: 'HIDDEN COLORS Lens',
      titleAr: 'عدسة الألوان الخفية',
      descEn:
        'Explore 102 infrared spectral channels from 0.75 to 5.0 µm, uncovering cool brown dwarfs, dust clouds, and cosmic ices.',
      descAr:
        'استكشف 102 قناة طيفية للأشعة تحت الحمراء بتكشف الأقزام البنية الباردة وسحب الغبار والجليد الكوني المخفي.',
      mood: 'discovery',
      prepareAction: () => {
        if (onActivateLens) onActivateLens('colors');
      },
    },
    {
      id: 'step_doubt_lens',
      targetId: 'lens_doubt',
      titleEn: 'DOUBT Lens · Data Quality',
      titleAr: 'عدسة الشك وفحص الجودة',
      descEn:
        'Inspect sensor saturation, cosmic rays, and edge artifacts to ensure your discovery is a real cosmic object, not a detector glitch.',
      descAr:
        'افحص تشبع الحساس والأشعة الكونية عشان تتأكد إن اللي بتشوفه جرم سماوي حقيقي مش عيب جهاز أو شوائب كاميرا.',
      mood: 'investigator',
      prepareAction: () => {
        if (onActivateLens) onActivateLens('doubt');
      },
    },
    {
      id: 'step_neighbors_lens',
      targetId: 'lens_neighbors',
      titleEn: 'NEIGHBORS Lens · Reference Catalogs',
      titleAr: 'عدسة الجيران والكتالوجات',
      descEn:
        'Cross-match SPHEREx detections against Gaia DR3 and AllWISE to identify known stars, asteroids, and brown dwarfs.',
      descAr:
        'طابق رصدات SPHEREx مع كتالوجات غايا DR3 ووايز لمعرفة النجوم المسجلة سابقاً وحركتها الخاصة ومواقعها الموثقة.',
      mood: 'explaining',
      prepareAction: () => {
        if (onActivateLens) onActivateLens('neighbors');
      },
    },
    {
      id: 'step_spex_companion',
      targetId: 'spex_companion',
      titleEn: 'SPEX Cat Companion',
      titleAr: 'مرافقك الفلكي سبيكس',
      descEn:
        'I am always right here with you! Click me anytime to ask questions, understand anomalies, or get friendly explanations in plain language.',
      descAr:
        'أنا دايماً جنبك هنا! اضغط عليا في أي وقت واسألني عن الصورة أو اطلب توضيح ومساعدة في أي تفصيلة فلكية.',
      mood: 'greeting',
    },
    {
      id: 'step_postcard',
      targetId: 'postcard_button',
      titleEn: 'Discovery Postcard',
      titleAr: 'بطاقة الاكتشاف والمشاركة',
      descEn:
        'Ready to share? Generate an authentic NASA-style discovery postcard with verified coordinates, real pixels, and your name!',
      descAr:
        'جاهز للمشاركة؟ اصنع كارت اكتشاف فلكي رسمي فيه الصورة الحقيقية والإحداثيات الموثقة وشاركه مع العالم!',
      mood: 'proud',
    },
  ];

  const currentStep = steps[currentStepIdx];

  // Measure target bounding rect whenever step changes
  const updateTargetRect = useCallback(() => {
    if (!currentStep) return;
    const el = document.querySelector(`[data-tour="${currentStep.targetId}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!isOpen) return;

    if (currentStep?.prepareAction) {
      currentStep.prepareAction();
    }

    const timer = setTimeout(updateTargetRect, 150);
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect);
    };
  }, [isOpen, currentStepIdx, currentStep, updateTargetRect]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  // Determine popup placement relative to target
  let popupStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 100,
  };

  if (targetRect) {
    const isMobile = window.innerWidth < 640;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    if (isMobile) {
      // Mobile: Always anchor either above or below target or bottom center
      if (targetRect.top > viewportHeight / 2) {
        popupStyle = {
          ...popupStyle,
          bottom: `${viewportHeight - targetRect.top + 16}px`,
          left: '16px',
          right: '16px',
        };
      } else {
        popupStyle = {
          ...popupStyle,
          top: `${targetRect.bottom + 16}px`,
          left: '16px',
          right: '16px',
        };
      }
    } else {
      // Desktop: place nearby with bounds check
      const desiredTop = targetRect.top > viewportHeight - 260
        ? targetRect.top - 200
        : Math.max(80, targetRect.top);

      let desiredLeft = targetRect.right + 20;
      if (desiredLeft + 360 > viewportWidth) {
        desiredLeft = Math.max(20, targetRect.left - 380);
      }

      popupStyle = {
        ...popupStyle,
        top: `${desiredTop}px`,
        left: `${desiredLeft}px`,
        maxWidth: '380px',
      };
    }
  } else {
    // Fallback: center in viewport
    popupStyle = {
      ...popupStyle,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: '400px',
    };
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto select-none" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Dimmed backdrop with smooth fade */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Target Element Spotlight Cutout */}
      {targetRect && (
        <div
          className="fixed pointer-events-none rounded-2xl border-2 border-[#FFB900] shadow-[0_0_30px_rgba(255,185,0,0.7)] transition-all duration-300"
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        >
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#FFB900] animate-ping" />
        </div>
      )}

      {/* Floating SPEX Tour Dialog */}
      <div
        style={popupStyle}
        className="bg-[#0C0E14]/95 backdrop-blur-2xl border border-[#FFB900]/40 rounded-2xl p-4 sm:p-5 shadow-[0_16px_50px_rgba(0,0,0,0.9)] animate-scale-in text-slate-100 space-y-3.5"
      >
        {/* Header: SPEX Mascot Avatar + Step Indicator + Close */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFB900]/20 to-[#00D3F3]/20 border border-[#FFB900]/40 p-1 flex items-center justify-center shrink-0">
              <SpexPortrait mood={currentStep.mood} size={32} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#FFB900] font-bold tracking-wider uppercase">
                <Sparkles className="w-3 h-3" />
                <span>SPEX TOUR · {currentStepIdx + 1} / {steps.length}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 leading-tight">
                {isRtl ? currentStep.titleAr : currentStep.titleEn}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title={isRtl ? 'إغلاق الجولة' : 'Close Tour'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Description */}
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
          {isRtl ? currentStep.descAr : currentStep.descEn}
        </p>

        {/* Controls: Back, Next, Skip */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-mono text-slate-400 hover:text-slate-200 transition cursor-pointer px-2 py-1"
          >
            {isRtl ? 'تخطي الجولة' : 'Skip Tour'}
          </button>

          <div className="flex items-center gap-2">
            {currentStepIdx > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 transition cursor-pointer"
              >
                <ChevronLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                <span>{isRtl ? 'السابق' : 'Back'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FFB900] hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold transition shadow-md cursor-pointer"
            >
              <span>
                {currentStepIdx === steps.length - 1
                  ? isRtl
                    ? 'ابدأ الاستكشاف!'
                    : 'Start Exploring!'
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
