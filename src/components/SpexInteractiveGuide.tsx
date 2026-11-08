import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, ChevronRight, ChevronLeft, X, ArrowRight, 
  HelpCircle, CheckCircle2, RotateCcw, Compass, Eye, ShieldCheck 
} from 'lucide-react';
import { SpexPortrait } from '../spex/SpexPortrait';
import { SPEXMood } from '../spex/spexAssets';
import { Language } from '../utils/translations';

export interface TourStep {
  id: string;
  targetId: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  mood: SPEXMood;
  positionPreference?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'search',
    targetId: 'explore-search-step',
    titleEn: 'Step 1 — Choose Where to Look',
    titleAr: 'الخطوة 1 — اختر موقع التحقيق في السماء',
    descEn: 'Here you choose which part of the sky you want to explore. These numbers (RA & Dec) work like cosmic GPS coordinates to point the telescope.',
    descAr: 'هنا تختار الجزء الذي تريد استكشافه من قبة السماء. تعمل هذه الأرقام (المطلع المستقيم والميل) كإحداثيات GPS كونية لتوجيه التلسكوب.',
    mood: 'explaining',
    positionPreference: 'bottom',
  },
  {
    id: 'dates',
    targetId: 'explore-timeline-step',
    titleEn: 'Step 2 — Select Observation Dates',
    titleAr: 'الخطوة 2 — اختر مواعيد الرصدات الفلكية',
    descEn: 'These are pictures taken at different times. By comparing snapshots from different visits, we can catch objects that moved or changed in brightness.',
    descAr: 'هذه صور التقطها التلسكوب في أوقات مختلفة. بمقارنة اللقطات الملتقطة في زيارات زمنية متباعدة، يمكننا رصد ما تحرك أو تغير سطوعه.',
    mood: 'thinking',
    positionPreference: 'bottom',
  },
  {
    id: 'viewer',
    targetId: 'explore-viewer-step',
    titleEn: 'Step 3 — The Sky Viewer',
    titleAr: 'الخطوة 3 — نافذة الرصد الفلكي',
    descEn: 'This is our window into space! You can zoom in, pan around, inspect pixel brightness, and toggle between smooth astronomical view and raw detector pixels.',
    descAr: 'هذه نافذتنا إلى أعماق الكون! يمكنك التكبير، والتحريك، وقراءة السطوع، والتبديل بين العرض الفلكي الناعم وبكسلات الحساس الحقيقية.',
    mood: 'curious',
    positionPreference: 'bottom',
  },
  {
    id: 'compare',
    targetId: 'explore-compare-step',
    titleEn: 'Step 4 — Compare What Changed',
    titleAr: 'الخطوة 4 — قارن بين الصورتين لمعرفة ما تغير',
    descEn: 'Click "What Changed" to perform astronomical subtraction (D = I₂ - I₁). Steady background stars vanish into darkness, and changing sources shine brightly!',
    descAr: 'انقر على "ما الذي تغير؟" لإجراء الطرح الفلكي (D = I₂ - I₁). النجوم الثابتة تتلاشى في الظلام، بينما تبرز الأجرام المتغيرة كنقاط ساطعة!',
    mood: 'eureka',
    positionPreference: 'top',
  },
  {
    id: 'results',
    targetId: 'explore-results-step',
    titleEn: 'Step 5 — Investigate Possible Changes',
    titleAr: 'الخطوة 5 — افحص التغيرات المحتملة',
    descEn: 'These are interesting targets spotted by the pipeline. They are possible changes worth investigating, not automatically confirmed discoveries!',
    descAr: 'هذه أهداف مثيرة رصدتها خوارزمياتنا. هي تغيرات محتملة تستحق الفحص والتحقيق العلمي، وليست اكتشافات نهائية مؤكدة مسبقاً!',
    mood: 'investigator',
    positionPreference: 'left',
  },
  {
    id: 'science',
    targetId: 'explore-science-step',
    titleEn: 'Step 6 — Raw Science & FITS Details',
    titleAr: 'الخطوة 6 — البيانات العلمية وملفات FITS الخام',
    descEn: 'Whenever you want to verify the exact physics, expand this section to inspect calibrated FITS headers, TAN-SIP distortion matrices, and Gaia cross-matches.',
    descAr: 'كلما رغبت في التحقق من الفيزياء الدقيقة، افتح هذا القسم لمعاينة ترويسات FITS المعايرة، ومصفوفات تشوه WCS، ومطابقات كتالوج Gaia.',
    mood: 'explaining',
    positionPreference: 'top',
  },
  {
    id: 'spex',
    targetId: 'explore-spex-step',
    titleEn: 'Step 7 — Ask SPEX Anytime!',
    titleAr: 'الخطوة 7 — اسأل SPEX في أي وقت!',
    descEn: 'If anything looks unfamiliar or confusing, just click a question or ask me! I am here to make infrared astronomy simple and exciting for everyone.',
    descAr: 'إذا بدا أي شيء غير مألوف أو غامضاً، انقر على أي سؤال أو اسألني مباشرة! أنا هنا لأجعل علم فلك الأشعة تحت الحمراء ممتعاً وبسيطاً للجميع.',
    mood: 'happy',
    positionPreference: 'left',
  },
];

interface SpexInteractiveGuideProps {
  language: Language;
  onOpenExplainerModal?: () => void;
  onTourFinished?: () => void;
}

export const SpexInteractiveGuide: React.FC<SpexInteractiveGuideProps> = ({
  language,
  onOpenExplainerModal,
  onTourFinished,
}) => {
  const isAr = language === 'ar';

  // Check if user has already seen the welcome overlay
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('spex_welcome_seen') === 'true';
  });

  // Tour active state
  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const activeStep = TOUR_STEPS[currentStepIdx];

  // Measure target DOM element whenever step changes
  useEffect(() => {
    if (!isTourActive) return;

    const updateRect = () => {
      const el = document.getElementById(activeStep.targetId);
      if (el) {
        // Scroll element smoothly into view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Slight timeout to let scroll complete before measuring
        setTimeout(() => {
          const r = el.getBoundingClientRect();
          setTargetRect(r);
        }, 300);
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, { passive: true });

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [isTourActive, currentStepIdx, activeStep.targetId]);

  // Keyboard navigation (Escape to close, arrows to step)
  useEffect(() => {
    if (!isTourActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        endTour();
      } else if (e.key === 'ArrowRight') {
        if (isAr) handlePrev();
        else handleNext();
      } else if (e.key === 'ArrowLeft') {
        if (isAr) handleNext();
        else handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourActive, currentStepIdx, isAr]);

  const startTour = () => {
    setHasSeenWelcome(true);
    localStorage.setItem('spex_welcome_seen', 'true');
    setCurrentStepIdx(0);
    setIsTourActive(true);
  };

  const skipWelcome = () => {
    setHasSeenWelcome(true);
    localStorage.setItem('spex_welcome_seen', 'true');
    localStorage.setItem('spex_tour_completed', 'true');
  };

  const endTour = () => {
    setIsTourActive(false);
    localStorage.setItem('spex_tour_completed', 'true');
    onTourFinished?.();
  };

  const handleNext = () => {
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      endTour();
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  // Replay tour trigger exposed via window dispatch or parent
  useEffect(() => {
    const handleReplay = () => {
      setCurrentStepIdx(0);
      setIsTourActive(true);
    };
    window.addEventListener('spex:replay-tour', handleReplay);
    return () => window.removeEventListener('spex:replay-tour', handleReplay);
  }, []);

  // 1. FIRST-VISIT WELCOME OVERLAY MODAL
  if (!hasSeenWelcome && !isTourActive) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-300"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="relative w-full max-w-lg bg-[#0c1220] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-slate-100 space-y-6">
          {/* Close / Skip button */}
          <button
            type="button"
            onClick={skipWelcome}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>

          {/* SPEX Cat Greeting Portrait */}
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
              <SpexPortrait
                mood="greeting"
                size={120}
                className="relative z-10 drop-shadow-xl"
                alt="SPEX Space Guardian Cat"
              />
            </div>

            <div className="text-center sm:text-left space-y-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono text-[11px] font-bold tracking-wider uppercase">
                {isAr ? 'مساعدك الفلكي الذكي' : 'YOUR SPACE GUIDE'}
              </span>
              <h2 className="text-2xl font-bold font-['Outfit'] text-white">
                {isAr ? 'مرحباً! أنا SPEX 🐾' : "Hey! I'm SPEX 🐾"}
              </h2>
              <p className="text-xs font-mono text-cyan-400">
                {isAr ? 'حارس السماء الكونية المتغيرة' : 'Guardian of the Changing Sky'}
              </p>
            </div>
          </div>

          {/* Warm Introduction Text */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-300 leading-relaxed space-y-2">
            <p className="font-medium text-slate-200">
              {isAr
                ? 'معاً، سنستكشف قبة السماء، ونقارن رصدات حقيقية التقطها تلسكوب SPHEREx الفضائي في أوقات مختلفة، ونحقق في كل ما يتحرك أو يغير سطوعه عبر الكون.'
                : "Together, we'll explore the sky, compare real observations from NASA's SPHEREx space telescope across different times, and investigate objects that move or change in brightness."}
            </p>
            <p className="text-[11px] text-amber-300/90 font-mono">
              {isAr
                ? 'لا تقلق إذا لم تكن متخصصاً في الفلك — سأشرح لك كل خطوة بلغة واضحة وبسيطة!'
                : "Don't worry if you don't know astronomy. I'll explain everything along the way!"}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={startTour}
              className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm transition shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAr ? 'ابدأ الجولة التفاعلية (دقيقة واحدة)' : 'Start Guided Tour (1 min)'}</span>
            </button>

            <button
              type="button"
              onClick={skipWelcome}
              className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-medium text-xs transition cursor-pointer"
            >
              {isAr ? 'تخطي والاستكشاف مباشرة' : 'Skip & Explore Directly'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. SPOTLIGHT GUIDED TOUR OVERLAY
  if (isTourActive) {
    const pad = 10;
    const highlightBox = targetRect ? {
      left: Math.max(0, targetRect.left - pad),
      top: Math.max(0, targetRect.top - pad),
      width: targetRect.width + pad * 2,
      height: targetRect.height + pad * 2,
    } : null;

    // Tooltip position calculation
    let tooltipStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 60,
    };

    if (highlightBox) {
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

      // Vertical placement
      const spaceBelow = windowHeight - (highlightBox.top + highlightBox.height);
      const placeBelow = spaceBelow > 260 || highlightBox.top < 260;

      if (placeBelow) {
        tooltipStyle.top = Math.min(windowHeight - 280, highlightBox.top + highlightBox.height + 16);
      } else {
        tooltipStyle.bottom = Math.min(windowHeight - 50, windowHeight - highlightBox.top + 16);
      }

      // Horizontal placement (center aligned with clamp)
      const centerX = highlightBox.left + highlightBox.width / 2;
      const cardWidth = Math.min(420, windowWidth - 32);
      const idealLeft = centerX - cardWidth / 2;
      tooltipStyle.left = Math.max(16, Math.min(windowWidth - cardWidth - 16, idealLeft));
      tooltipStyle.width = `${cardWidth}px`;
    } else {
      // Fallback center
      tooltipStyle = {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 60,
        width: '90%',
        maxWidth: '440px',
      };
    }

    return (
      <div className="fixed inset-0 z-50 pointer-events-auto" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Dimmed backdrop with cutout for highlighted target */}
        <div 
          onClick={endTour}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] transition-all duration-300 cursor-pointer"
        />

        {/* Glowing Spotlight Cutout Ring */}
        {highlightBox && (
          <div
            style={{
              position: 'fixed',
              left: `${highlightBox.left}px`,
              top: `${highlightBox.top}px`,
              width: `${highlightBox.width}px`,
              height: `${highlightBox.height}px`,
              borderRadius: '24px',
              boxShadow: '0 0 0 9999px rgba(5, 9, 20, 0.75), 0 0 30px rgba(245, 158, 11, 0.6), inset 0 0 20px rgba(245, 158, 11, 0.25)',
              border: '2px solid rgba(245, 158, 11, 0.9)',
              pointerEvents: 'none',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              zIndex: 55,
            }}
          />
        )}

        {/* Interactive Tour Card */}
        <div 
          style={tooltipStyle}
          className="bg-[#0c1220] border-2 border-amber-500/50 rounded-3xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(245,158,11,0.3)] text-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header row: Step count & Close */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
                {isAr ? `خطوة ${currentStepIdx + 1} من ${TOUR_STEPS.length}` : `STEP ${currentStepIdx + 1} OF ${TOUR_STEPS.length}`}
              </span>
              <span className="text-[11px] text-cyan-400 font-mono">
                {activeStep.id.toUpperCase()}
              </span>
            </div>

            <button
              type="button"
              onClick={endTour}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title={isAr ? 'إنهاء الجولة' : 'Exit Tour'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Character + Description */}
          <div className="flex items-start gap-3.5">
            <div className="shrink-0 pt-0.5">
              <SpexPortrait
                mood={activeStep.mood}
                size={70}
                className="drop-shadow-md"
                alt="SPEX Cat Guide"
              />
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white font-['Outfit']">
                {isAr ? activeStep.titleAr : activeStep.titleEn}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isAr ? activeStep.descAr : activeStep.descEn}
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={endTour}
              className="text-xs font-mono text-slate-400 hover:text-slate-200 cursor-pointer transition underline decoration-slate-600"
            >
              {isAr ? 'تخطي الجولة' : 'Skip Tour'}
            </button>

            <div className="flex items-center gap-2">
              {currentStepIdx > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>{isAr ? 'السابق' : 'Back'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <span>{currentStepIdx === TOUR_STEPS.length - 1 ? (isAr ? 'إنهاء والبدء!' : 'Finish & Explore!') : (isAr ? 'التالي' : 'Next')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
