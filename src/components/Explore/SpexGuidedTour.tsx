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
      id: 'step_targets',
      targetId: 'explore_targets',
      titleEn: 'Target Search & 5 Benchmark Presets',
      titleAr: 'البحث بالإحداثيات والأهداف الخمسة المرجعية',
      descEn:
        'Pick one of the 5 challenge presets (Barnard’s Star, Epsilon Indi, WISE 0855, RW Aurigae, R Draconis) or enter any RA/Dec in decimal or sexagesimal.',
      descAr:
        'اختر أحد الأهداف الخمسة المرجعية أو أدخل أي إحداثيات RA/Dec لاستعراض السلسلة الزمنية الحقيقية من أرشيف IRSA.',
      mood: 'greeting',
    },
    {
      id: 'step_viewport',
      targetId: 'viewport_canvas',
      titleEn: 'SPHEREx Multi-Epoch Flipbook Viewer',
      titleAr: 'عارض التسلسل الزمني SPHEREx',
      descEn:
        'Watch real calibrated infrared exposures play across epochs. Switch Detector (Auto / D1–D6) or toggle Normal / Show changes (Epoch 1 difference).',
      descAr:
        'شاهد لقطات الأشعة تحت الحمراء الحقيقية عبر الزمن. اختر الكاشف (Auto أو D1–D6) أو بدّل بين «عادي» و«إظهار التغيرات» لطرح اللقطة الأولى.',
      mood: 'explaining',
    },
    {
      id: 'step_wiseview_bar',
      targetId: 'wiseview_bar',
      titleEn: 'WiseView Control Bar & Shortcuts',
      titleAr: 'شريط التحكم السريع والاختصارات',
      descEn:
        'Use Step/Play (Space), Speed slider, Loop (L), Blink 1↔Last (B), Contrast & Stretch, Zoom +/-, and icon toggles for Crosshair, Trail, Catalogs, DQ flags, and Grid.',
      descAr:
        'استخدم التشغيل (Space)، والتخطي (←/→)، والتكرار (L)، والوميض 1↔الأخير (B)، ومنزلق التباين والتكبير، وأيقونات الطبقات والشبكة.',
      mood: 'thinking',
    },
    {
      id: 'step_advanced',
      targetId: 'advanced_drawer',
      titleEn: 'Advanced Drawer (Display, Overlays, Analysis, Export)',
      titleAr: 'قائمة الإعدادات المتقدمة',
      descEn:
        'Expand Advanced anytime for Display percentiles, Overlays, Diff vs Median / Co-add Stack / Wavelength Window / Frame Count (10/20/40) / FOV, and PNG Export.',
      descAr:
        'افتح «إعدادات متقدمة» للتحكم في Display و Overlays و Analysis (مثل Co-add والنافذة الطيفية وعدد الإطارات 10/20/40 ومجال الرؤية) والتصدير.',
      mood: 'eureka',
    },
    {
      id: 'step_slots',
      targetId: 'collapsible_slots',
      titleEn: 'Metadata, Centroid, Spectrum & Aladin Slots',
      titleAr: 'الأقسام القابلة للطي: البيانات والمركز والطيف وعلاء الدين',
      descEn:
        'Expand the collapsible slots below and beside the viewer for Frame Metadata, Subpixel Centroid vs Time, Measured Spectrum, and Aladin Sky Context.',
      descAr:
        'افتح أو اطوِ أقسام شريط البيانات، ومنحنى إزاحة المركز مع الزمن، والطيف المقاس، وخريطة علاء الدين السماوية.',
      mood: 'discovery',
    },
    {
      id: 'step_spex_companion',
      targetId: 'spex_companion',
      titleEn: 'SPEX Cat Companion',
      titleAr: 'مرافقك الفلكي سبيكس',
      descEn:
        'I am always right here with you—and collapsible anytime! Click me to ask questions or get clear explanations in plain language.',
      descAr:
        'أنا هنا دائماً معك ويمكن طيي في أي وقت! اضغط عليا لتطرح سؤالك أو تطلب شرحاً مبسطاً لأي عنصر في الشاشة.',
      mood: 'greeting',
    },
    {
      id: 'step_postcard',
      targetId: 'postcard_button',
      titleEn: 'Discovery Postcard',
      titleAr: 'بطاقة الاكتشاف والمشاركة',
      descEn:
        'Ready to share? Export a high-resolution PNG or generate an authentic Discovery Postcard with verified coordinates and provenance!',
      descAr:
        'جاهز للمشاركة؟ صدّر صورة PNG أو اصنع بطاقة اكتشاف موثقة بالإحداثيات ومصدر البيانات الحقيقي!',
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
    if (isOpen) {
      setCurrentStepIdx(0);
    }
  }, [isOpen]);

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

  const handleFinish = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('spex_tour_completed', 'true');
    }
    onClose();
  };

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
            onClick={handleFinish}
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
            onClick={handleFinish}
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
