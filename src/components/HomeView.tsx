import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Layers,
  Search,
  ShieldCheck,
  Telescope,
  Compass,
  Gamepad2,
  HelpCircle,
  Eye,
  Activity,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { SPEX_ASSETS, SPEX_HERO_IMAGE } from '../spex/spexAssets';
import { SpherexLogo } from './SpherexLogo';
import { Language, translations } from '../utils/translations';

interface HomeViewProps {
  onStartExplore: (caseId?: string) => void;
  onOpenAbout: () => void;
  onOpenCases: () => void;
  onPlayGame?: () => void;
  language: Language;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartExplore,
  onOpenAbout,
  onOpenCases,
  onPlayGame,
  language,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  const [quickRa, setQuickRa] = useState<string>('276.2614');
  const [quickDec, setQuickDec] = useState<string>('64.8258');

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ra = parseFloat(quickRa);
    const dec = parseFloat(quickDec);
    if (!Number.isNaN(ra) && !Number.isNaN(dec)) {
      onStartExplore('case-nep-var-01');
    }
  };

  return (
    <div
      className={`relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden px-4 sm:px-6 lg:px-8 py-8 sm:py-12 ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/6 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-tr from-amber-500/10 via-cyan-500/8 to-indigo-900/15 dark:from-amber-600/15 dark:via-cyan-600/10 dark:to-indigo-950/25 blur-[160px] rounded-full" />
      </div>

      <div className="mx-auto max-w-6xl w-full my-auto space-y-12">
        {/* Main Hero Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Mission branding, 10-second rule explanation & direct action */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Top Mission Pill */}
            <div className="flex items-center gap-2.5 text-xs font-mono tracking-wider text-cyan-600 dark:text-cyan-400 uppercase mb-4 font-semibold bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
              <Telescope className="w-3.5 h-3.5" />
              <span>{t.homeMissionBadge}</span>
              <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">·</span>
              <span className="font-bold text-amber-500">QR2 NEP ARCHIVE</span>
            </div>

            {/* Hero Title */}
            <h1 className="font-['Outfit'] text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-[1.08] mb-4">
              {t.homeHeroTitlePrefix}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-400">
                {t.homeHeroTitleHighlight}
              </span>
            </h1>

            {/* Core Mantra */}
            <p className="text-base sm:text-lg font-semibold text-cyan-700 dark:text-cyan-300 mb-2">
              {isRtl ? '«لا تكتفِ بالنظر إلى السماء.. تحقق مما تغيّر فيها!»' : '“Don’t just look at the sky. Investigate what changed.”'}
            </p>

            {/* 10-Second Explainer */}
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal max-w-xl mb-6 leading-relaxed">
              {t.homeHeroSubtitle}
            </p>

            {/* Three-step visual discovery workflow */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0b1021]/80 shadow-xs">
                <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold mb-1">
                  01. {t.homeStep1Title}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                  {t.homeStep1Desc}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0b1021]/80 shadow-xs">
                <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-bold mb-1">
                  02. {t.homeStep2Title}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                  {t.homeStep2Desc}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0b1021]/80 shadow-xs">
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                  03. {t.homeStep3Title}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                  {t.homeStep3Desc}
                </p>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 mb-8">
              <button
                type="button"
                onClick={() => onStartExplore()}
                className="group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-slate-950" />
                <span>{t.homeBtnStartExplore}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              {onPlayGame && (
                <button
                  type="button"
                  onClick={onPlayGame}
                  className="group inline-flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-400/40 text-cyan-800 dark:text-cyan-200 font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Gamepad2 className="h-4 w-4 text-cyan-600 dark:text-cyan-300 animate-pulse" />
                  <span>{t.homeBtnPlayGame}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-mono">
                    {isRtl ? 'ممتع' : 'NEW'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenCases}
                className="inline-flex items-center gap-2 px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.1] hover:border-amber-400/50 bg-white dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.08] text-slate-800 dark:text-slate-200 font-medium text-sm transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Layers className="h-4 w-4 text-amber-500" />
                <span>{t.homeBtnBrowseCases}</span>
              </button>

              <button
                type="button"
                onClick={onOpenAbout}
                className="inline-flex items-center gap-2 px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.1] hover:border-slate-300 dark:hover:border-white/[0.2] bg-white dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 font-medium text-sm transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <BookOpen className="h-4 w-4 text-slate-400" />
                <span>{t.homeBtnScientificAudit}</span>
              </button>
            </div>

            {/* Direct Coordinate Search Entry */}
            <form
              onSubmit={handleQuickSubmit}
              className="w-full max-w-xl p-3 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0b1021]/60 shadow-xs flex flex-wrap items-center gap-2.5"
            >
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 flex-shrink-0">
                <Compass className="w-3.5 h-3.5 text-amber-500" />
                <span>RA:</span>
                <input
                  type="text"
                  value={quickRa}
                  onChange={(e) => setQuickRa(e.target.value)}
                  className="w-20 px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 flex-shrink-0">
                <span>Dec:</span>
                <input
                  type="text"
                  value={quickDec}
                  onChange={(e) => setQuickDec(e.target.value)}
                  className="w-20 px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{t.btnSearchCoordinates}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Celestial Eye Emblem & SPEX Character Showcase */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-sm flex flex-col items-center">
              {/* Celestial Eye Emblem glowing behind SPEX */}
              <div className="absolute -top-10 -right-4 opacity-40 dark:opacity-30 pointer-events-none">
                <SpherexLogo size={140} />
              </div>

              {/* SPEX Egyptian Guardian */}
              <div className="relative group">
                <div className="absolute -inset-6 bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-purple-600/20 blur-3xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                <img
                  src={SPEX_HERO_IMAGE}
                  alt="SPEX Space-Cat AI Guide"
                  className="relative z-10 w-64 sm:w-72 h-auto drop-shadow-2xl transition-transform hover:scale-102"
                />
              </div>

              {/* Witty Speech Card */}
              <div className="relative z-20 mt-4 w-full p-4 rounded-3xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0c1220] shadow-xl">
                <div className="flex items-center gap-2.5 mb-2">
                  <img
                    src={SPEX_ASSETS.greeting.imagePath}
                    alt="SPEX Mini"
                    className="w-7 h-7 rounded-full border border-amber-400/40 object-cover"
                  />
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-300 tracking-wide">
                    {t.homeSpexSpeechGreeting}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono ml-auto">NASA ASTRONOMY GUIDE</span>
                </div>
                <p
                  className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-sans"
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  {t.homeSpexSpeechText}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Core Questions Section (What is SPEX? What is SPHEREx? What can I do? Where to start?) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-cyan-500/20 bg-slate-50 dark:bg-[#0b1021] shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-cyan-600 dark:text-cyan-400 font-bold text-xs uppercase font-mono">
              <Eye className="w-4 h-4" />
              <span>{isRtl ? 'ما هو SPEX؟' : '1. What is SPEX?'}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isRtl
                ? 'منصة تحقيق زمني للأشعة تحت الحمراء مدعومة بالذكاء الاصطناعي ومرشدك الفلكي سبيكس لكشف ما تغيّر في السماء.'
                : 'A temporal infrared astronomical investigation platform with SPEX, your astrophysicist companion, uncovering what changed in the cosmos.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-amber-500/20 bg-slate-50 dark:bg-[#0b1021] shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase font-mono">
              <Telescope className="w-4 h-4" />
              <span>{isRtl ? 'ما هو SPHEREx؟' : '2. What is SPHEREx?'}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isRtl
                ? 'مرصد وكالة ناسا للمسح الطيفي الشامل في 102 حزمة للأشعة تحت الحمراء بين 0.75 و 5.0 ميكرومتر بدقة رصد غير مسبوقة.'
                : "NASA's all-sky spectral surveyor mapping the universe across 102 infrared bands (0.75–5.0 µm) with uncooled wide-field optics."}
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-emerald-500/20 bg-slate-50 dark:bg-[#0b1021] shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase font-mono">
              <Activity className="w-4 h-4" />
              <span>{isRtl ? 'ماذا أفعل هنا؟' : '3. What can I do?'}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isRtl
                ? 'طرح الصور زمنياً D = I₂ - I₁، قياس الشدّة والدلالة، تمييز الكويكبات والنجوم المتغيرة، واستبعاد تشوهات التوجيه.'
                : 'Compute difference maps D = I₂ - I₁, extract subpixel centroids, identify real asteroids or flare stars, and filter PSF artifacts.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-purple-500/20 bg-slate-50 dark:bg-[#0b1021] shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase font-mono">
              <Gamepad2 className="w-4 h-4" />
              <span>{isRtl ? 'من أين أبدأ؟' : '4. Where to start?'}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isRtl
                ? 'ابدأ بلعبة المحقق الكوني لتعلم أسرار الأشعة تحت الحمراء، أو تصفح حالات NEP النموذجية للاستكشاف المباشر.'
                : 'Play the Cosmic Detective game to master multi-band science, or launch verified NEP benchmark investigations directly.'}
            </p>
          </div>
        </div>

        {/* Real Data Provenance & NEP Coverage Guarantee Section */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
                  {t.homeProvenanceNoteTitle}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-3xl">
                  {t.homeProvenanceNoteText}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => onStartExplore('case-nep-var-01')}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                {t.homeBenchmark1}
              </button>
              <button
                type="button"
                onClick={() => onStartExplore('case-cal-stable-02')}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                {t.homeBenchmark2}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
