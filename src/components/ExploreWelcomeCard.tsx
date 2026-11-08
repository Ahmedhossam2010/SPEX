import React, { useState, useEffect } from 'react';
import { Sparkles, HelpCircle, ArrowRight, X, Compass, Telescope, Eye } from 'lucide-react';
import { SPEX_ASSETS } from '../spex/spexAssets';
import { Language } from '../utils/translations';

interface ExploreWelcomeCardProps {
  language: Language;
  onStartExploring: () => void;
  onOpenExplainer: () => void;
  onOpenChallengeTargets?: () => void;
}

export const ExploreWelcomeCard: React.FC<ExploreWelcomeCardProps> = ({
  language,
  onStartExploring,
  onOpenExplainer,
  onOpenChallengeTargets,
}) => {
  const isAr = language === 'ar';
  const [isVisible, setIsVisible] = useState<boolean>(true);

  // Check localStorage if previously dismissed
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('spex_welcome_dismissed');
      if (dismissed === 'true') {
        setIsVisible(false);
      }
    } catch {
      // localStorage may fail in private mode
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem('spex_welcome_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  const handleReopen = () => {
    setIsVisible(true);
    try {
      localStorage.removeItem('spex_welcome_dismissed');
    } catch {
      // ignore
    }
  };

  if (!isVisible) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/60 dark:bg-slate-950/80 border border-slate-800 text-xs text-slate-300 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <img
            src={SPEX_ASSETS.greeting.imagePath}
            alt="SPEX"
            className="w-6 h-6 object-contain"
          />
          <span className="font-mono text-[11px] text-amber-400 font-semibold">
            {isAr ? 'مرشد SPEX متاح لمساعدتك في أي لحظة' : 'SPEX Guide is ready to help at any moment'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenExplainer}
            className="px-2.5 py-1 rounded-lg text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition cursor-pointer"
          >
            {isAr ? 'ما الذي نبحث عنه؟' : 'What are we looking for?'}
          </button>
          <button
            type="button"
            onClick={handleReopen}
            className="px-2.5 py-1 rounded-lg text-xs font-mono text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition cursor-pointer"
          >
            {isAr ? 'عرض رسالة الترحيب' : 'Show Welcome Guide'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900/95 via-[#0b1222] to-slate-950/95 p-5 sm:p-6 shadow-xl backdrop-blur-xl"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Background ambient cosmic glow */}
      <div className="pointer-events-none absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 transition cursor-pointer"
        aria-label="Dismiss welcome message"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative flex flex-col md:flex-row items-center gap-5 sm:gap-6">
        {/* Authentic Original SPEX Cat Avatar */}
        <div className="shrink-0 flex items-center justify-center">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 p-2 border-2 border-amber-500/40 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <img
              src={SPEX_ASSETS.greeting.imagePath}
              alt="SPEX Space Exploration Assistant"
              className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]"
            />
            <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-bold uppercase shadow-sm">
              SPEX Guide
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 font-mono text-[10px] uppercase font-bold tracking-wider border border-cyan-500/30">
              NASA SPHEREx 2026
            </span>
            <span className="text-slate-500 text-xs">·</span>
            <span className="text-xs font-mono text-amber-400 font-semibold">
              {isAr ? 'استكشاف السماء المتغيرة' : 'The Changing Sky'}
            </span>
          </div>

          <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight font-['Outfit']">
            {isAr
              ? 'أهلاً بك! أنا SPEX، مرشدك لاستكشاف الفضاء.'
              : "Hey! Welcome to SPEX. I'm your space exploration assistant."}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            {isAr
              ? 'هنا، يمكنك استكشاف رصدات تلسكوب SPHEREx الحقيقية بالأشعة تحت الحمراء، واكتشاف كيف تتغير الأجرام في السماء عبر الزمن. يلا نحقق سوا في اللي اتغير!'
              : 'Here, you can explore real NASA SPHEREx infrared observations and discover how objects in the sky change over time. Let’s investigate something together!'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
            <button
              type="button"
              onClick={onStartExploring}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 transition cursor-pointer active:scale-95"
            >
              <Telescope className="w-4 h-4 text-slate-950" />
              <span>{isAr ? 'ابدأ الاستكشاف الآن' : 'Start Exploring'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onOpenExplainer}
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 hover:text-white font-medium text-xs flex items-center gap-2 transition cursor-pointer active:scale-95"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isAr ? 'ما الذي نبحث عنه؟ (شرح مرئي)' : 'What are we looking for? (Visual Demo)'}</span>
            </button>

            {onOpenChallengeTargets && (
              <button
                type="button"
                onClick={onOpenChallengeTargets}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition cursor-pointer active:scale-95"
              >
                <span>{isAr ? 'أهداف ناسا الخمسة' : '5 Challenge Targets'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
