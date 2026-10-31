import React from 'react';
import { Sparkles, ArrowRight, BookOpen, Layers, Telescope, CheckCircle2, ShieldAlert } from 'lucide-react';
import { SPEX_ASSETS, SPEX_HERO_IMAGE } from '../spex/spexAssets';
import { Language, translations } from '../utils/translations';

interface HomeViewProps {
  onStartExplore: (caseId?: string) => void;
  onOpenAbout: () => void;
  onOpenCases: () => void;
  language: Language;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartExplore,
  onOpenAbout,
  onOpenCases,
  language,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  return (
    <div
      className={`relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden px-4 sm:px-6 lg:px-8 py-8 sm:py-12 ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
    >
      {/* Background spatial ambient gradients */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[550px] bg-gradient-to-tr from-amber-600/10 via-sky-600/8 to-indigo-900/12 blur-[140px] rounded-full" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      {/* Main Hero Section */}
      <div className="mx-auto max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
        {/* Left Column: Headlines & Actions */}
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-amber-400 uppercase mb-3">
            <span>NASA SPHEREx Mission</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>All-Sky Infrared Survey QR2</span>
          </div>

          <h1 className="font-['Outfit'] text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-100 leading-[1.08] mb-4">
            {language === 'ar' ? (
              <>
                السماء <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-sky-300">تتغير.</span>
              </>
            ) : (
              <>
                THE SKY <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-sky-300">CHANGES.</span>
              </>
            )}
          </h1>

          <p className="text-base sm:text-lg text-slate-300 font-light max-w-xl mb-6 leading-relaxed">
            {language === 'ar' ? (
              <>
                هل حدث تغير حقيقي في هذا الجزء من السماء؟ قارن بين لقطتين زمنيتين من مرصد SPHEREx الفضائي التابع لناسا، واحسب خريطة الفروق الضوئية، ودقق في الأدلة الفلكية مع{' '}
                <span className="text-amber-400 font-medium">سبيكس (SPEX)</span>، قط الفضاء الذكي.
              </>
            ) : (
              <>
                Did something actually change in this part of the sky? Compare multi-epoch infrared snapshots from NASA’s SPHEREx space observatory, compute difference maps, and investigate the evidence with{' '}
                <span className="text-amber-400 font-medium">SPEX</span>, your astrophysicist companion.
              </>
            )}
          </p>

          {/* Three-step visual orientation for first-time visitors */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md">
              <div className="text-[11px] font-mono text-amber-400 font-bold mb-1">01. Two Looks</div>
              <p className="text-xs text-slate-300 leading-snug">
                {language === 'ar'
                  ? 'رصد لنفس الحقل السماوي في أوقات مختلفة (أبريل ومايو 2025).'
                  : 'SPHEREx observes the same sky months apart in the infrared.'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md">
              <div className="text-[11px] font-mono text-sky-400 font-bold mb-1">02. Subtract Sky</div>
              <p className="text-xs text-slate-300 leading-snug">
                {language === 'ar'
                  ? 'طرح الصورتين يلغي الخلفية الثابتة ويظهر فقط ما ازداد أو قل بريقه.'
                  : 'Subtracting leaves only objects that brightened, dimmed, or moved.'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md">
              <div className="text-[11px] font-mono text-emerald-400 font-bold mb-1">03. Verify Facts</div>
              <p className="text-xs text-slate-300 leading-snug">
                {language === 'ar'
                  ? 'فحص نسبة الإشارة وتصفية التشويش ومطابقة كتالوج غايا الفلكي.'
                  : 'Check signal significance, eliminate artifacts, and cross-match Gaia.'}
              </p>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3.5 mb-8">
            <button
              onClick={() => onStartExplore()}
              className="group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm transition-all shadow-[0_0_25px_rgba(245,158,11,0.3)] active:scale-95"
            >
              <Sparkles className="h-4 w-4 text-slate-950" />
              <span>{t.navExplore}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={onOpenCases}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl border border-white/[0.1] hover:border-amber-400/40 bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md text-slate-200 font-medium text-sm transition-all shadow-sm active:scale-95"
            >
              <Layers className="h-4 w-4 text-amber-400" />
              <span>{t.navCases}</span>
            </button>

            <button
              onClick={onOpenAbout}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl border border-white/[0.1] hover:border-white/[0.2] bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md text-slate-300 font-medium text-sm transition-all shadow-sm active:scale-95"
            >
              <BookOpen className="h-4 w-4 text-slate-400" />
              <span>{t.navAbout}</span>
            </button>
          </div>

          {/* Curated Case Presets */}
          <div className="w-full pt-6 border-t border-white/[0.08]">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-mono mb-3">
              {language === 'ar'
                ? 'حالات فلكية نموذجية من أرشيف SPHEREx QR2:'
                : 'Verified Astronomical Benchmarks in SPHEREx QR2:'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onStartExplore('case-nep-var-01')}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-slate-200 transition-all text-left flex items-center gap-2 hover:border-amber-400/40"
              >
                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
                <span>NEP Deep Variable (7.8σ Change)</span>
              </button>
              <button
                onClick={() => onStartExplore('case-cal-stable-02')}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-slate-200 transition-all text-left flex items-center gap-2 hover:border-cyan-400/40"
              >
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                <span>Stability Standard (Zero Change)</span>
              </button>
              <button
                onClick={() => onStartExplore('case-artifact-flag-03')}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-slate-200 transition-all text-left flex items-center gap-2 hover:border-rose-400/40"
              >
                <span className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_6px_#f43f5e]" />
                <span>DQ Mask (Rejects Saturation & Artifacts)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: SPEX Character Showcase & Speech */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="relative w-full max-w-sm flex flex-col items-center">
            {/* SPEX Egyptian Avatar */}
            <div className="relative group">
              <div className="absolute -inset-6 bg-gradient-to-r from-amber-500/20 via-sky-500/20 to-purple-600/20 blur-3xl rounded-full opacity-70 group-hover:opacity-100 transition-opacity" />
              <img
                src={SPEX_HERO_IMAGE}
                alt="SPEX Space-Cat AI Guide"
                className="relative z-10 w-64 sm:w-72 h-auto drop-shadow-[0_20px_45px_rgba(0,0,0,0.85)] transition-transform hover:scale-102"
              />
            </div>

            {/* Witty Speech Card */}
            <div className="relative z-20 mt-4 w-full p-4 rounded-3xl border border-white/[0.1] bg-black/85 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center gap-2.5 mb-2">
                <img
                  src={SPEX_ASSETS.greeting.imagePath}
                  alt="SPEX Mini"
                  className="w-7 h-7 rounded-full border border-amber-400/40 object-cover"
                />
                <span className="text-xs font-bold text-amber-300 tracking-wide">
                  {language === 'ar' ? 'سبيكس يرحب بك' : 'SPEX says hello!'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono ml-auto">NASA ASTRONOMY GUIDE</span>
              </div>
              <p
                className="text-xs text-slate-200 leading-relaxed font-mono"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                {language === 'ar'
                  ? '«أنا سبيكس، حارس سماء SPHEREx والرفيق الفلكي! بساعدك تطرح صور الأشعة تحت الحمراء، ونعرف سوا لو النجم ومض بجد ولا مجرد بكسل مشوش. ادخل المعمل ويلا نبدأ!»'
                  : '"I am SPEX, guardian of the SPHEREx infrared sky! I help you subtract observations to see whether a star genuinely fluctuated or if it is just detector noise. Step into the workspace and let’s explore!"'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
