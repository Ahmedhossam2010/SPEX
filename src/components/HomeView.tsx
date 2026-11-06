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
  Zap,
  Award,
  ExternalLink,
  Waves,
  Cpu,
  BarChart2,
  Binary,
} from 'lucide-react';
import { SPEX_ASSETS, SPEX_HERO_IMAGE } from '../spex/spexAssets';
import { SpherexLogo } from './SpherexLogo';
import { SpexPortrait } from '../spex/SpexPortrait';
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
      className={`relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-[#050811] text-slate-100 ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/6 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-tr from-amber-500/10 via-cyan-500/8 to-indigo-900/15 blur-[160px] rounded-full" />
      </div>

      <div className="mx-auto max-w-6xl w-full my-auto space-y-16">
        {/* ========================================================
            SECTION 2: HERO (Left Copy + Right Original SPEX Cat Art)
           ======================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pt-2">
          {/* Left Column: Mission Pill, Headline, Subtitle, Quick Search, Gateways */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Top Mission Pill */}
            <div className="flex items-center gap-2.5 text-xs font-mono tracking-wider text-cyan-400 uppercase mb-4 font-semibold bg-cyan-500/10 px-3.5 py-1 rounded-full border border-cyan-500/30">
              <Telescope className="w-3.5 h-3.5" />
              <span>NASA SPACE APPS 2026</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="font-bold text-amber-400">SPHEREx MISSION</span>
            </div>

            {/* Hero Title */}
            <h1 className="font-['Outfit'] text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08] mb-3">
              {t.homeHeroTitlePrefix}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-400">
                {t.homeHeroTitleHighlight}
              </span>
            </h1>

            {/* Core Mission Mantra */}
            <p className="text-base sm:text-lg font-semibold text-cyan-300 mb-3">
              {isRtl ? '«لا تكتفِ بالنظر إلى السماء.. تحقق مما تغيّر فيها!»' : '“Don’t just look at the sky. Investigate what changed.”'}
            </p>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-300 font-normal max-w-xl mb-6 leading-relaxed">
              {isRtl
                ? 'استكشف السماء بالأشعة تحت الحمراء عبر بيانات تلسكوب SPHEREx الحقيقية. قارن بين رصدتين بفارق زمني، واطرح الصور لكشف الكويكبات المتحركة، النجوم المتغيرة، والثورات الكونية العنيفة.'
                : 'Explore the infrared sky using authentic NASA SPHEREx flight data. Subtract multi-epoch visits to isolate moving asteroids, pulsating variable stars, and eruptive protostellar outbursts.'}
            </p>

            {/* Dual Primary Gateways */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Gateway 1: Educational Game Adventure */}
              {onPlayGame && (
                <div
                  onClick={onPlayGame}
                  className="p-5 rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-b from-cyan-950/40 to-[#070b16] hover:border-cyan-400 transition-all cursor-pointer group shadow-xl relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 uppercase">
                      {isRtl ? 'مغامرة قصصية تفاعلية' : 'STORY ADVENTURE'}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> +1000 XP
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                    SPEX: The Lost Signal
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-snug">
                    {isRtl
                      ? 'مغامرة تحرٍ كوني من 3 فصول: اخترق سحب الغبار، فكك 102 لوناً طيفياً، وشخص الثوران الكوني.'
                      : 'A 3-chapter cosmic detective mystery: pierce dark dust, decode 102 infrared colors, and diagnose the changing sky.'}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
                    <span>{isRtl ? 'ابدأ التحقيق الآن' : 'Launch Adventure'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}

              {/* Gateway 2: Real-Data Science Workstation */}
              <div
                onClick={() => onStartExplore()}
                className="p-5 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-950/30 to-[#070b16] hover:border-amber-400 transition-all cursor-pointer group shadow-xl relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 uppercase">
                    {isRtl ? 'محطة الرصد العلمي' : 'SCIENCE WORKSTATION'}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    NASA QR2 FITS
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                  {isRtl ? 'منصة استكشاف الأرشيف' : 'Real-Data Explorer'}
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-snug">
                  {isRtl
                    ? 'افحص بيانات FITS الحقيقية من NASA/IPAC، واطرح الصور وحقق في مطابقة Gaia وSIMBAD.'
                    : 'Analyze authentic NASA/IPAC FITS, run WCS registration, and cross-match Gaia catalogs.'}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                  <span>{isRtl ? 'فتح محطة العمل' : 'Launch Workstation'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Quick Coordinate Search Bar */}
            <form
              onSubmit={handleQuickSubmit}
              className="w-full max-w-xl p-3 rounded-2xl border border-cyan-500/20 bg-[#091122]/90 shadow-lg flex flex-wrap items-center gap-2.5"
            >
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 flex-shrink-0">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>RA:</span>
                <input
                  type="text"
                  value={quickRa}
                  onChange={(e) => setQuickRa(e.target.value)}
                  className="w-20 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 flex-shrink-0">
                <span>Dec:</span>
                <input
                  type="text"
                  value={quickDec}
                  onChange={(e) => setQuickDec(e.target.value)}
                  className="w-20 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <button
                type="submit"
                className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono transition-all shadow-md cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{t.btnSearchCoordinates}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Original SPEX Egyptian Mech Cat Character Showcase */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-sm flex flex-col items-center">
              {/* Celestial Eye Logo Glowing Watermark behind SPEX */}
              <div className="absolute -top-8 -right-2 opacity-30 pointer-events-none">
                <SpherexLogo size={140} />
              </div>

              {/* SPEX Mech Cat Art */}
              <div className="relative group flex items-center justify-center">
                <div className="absolute -inset-6 bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-purple-600/20 blur-3xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                <img
                  src={SPEX_HERO_IMAGE}
                  alt="SPEX Egyptian Mech Cat Guardian"
                  className="relative z-10 w-64 sm:w-72 h-auto drop-shadow-2xl transition-transform hover:scale-102"
                  onError={(e) => {
                    // Fallback to high-res transparent cat asset
                    (e.target as HTMLImageElement).src = '/assets/aistudio/character_transparent_fa4756c1.png';
                  }}
                />
              </div>

              {/* SPEX Interactive Quote Bubble */}
              <div className="relative z-20 mt-4 p-4 rounded-2xl border border-cyan-500/30 bg-[#091122]/95 shadow-2xl backdrop-blur-md text-left w-full">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-amber-400 font-mono">SPEX</span>
                  <span className="text-[10px] text-cyan-300 font-mono ml-auto">
                    MECH CAT GUARDIAN
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {isRtl
                    ? '«أهلاً بك في منصة SPEX! سواء كنت هنا لتلعب دور المحقق الكوني في فك شفرة "الإشارة المفقودة" أو لتحليل ملفات FITS الحقيقية من قطب مسار الشمس الشمالي، كل فوتون يحمل سراً يستحق الاكتشاف!»'
                    : '“Welcome to SPEX! Whether investigating \'The Lost Signal\' in our detective adventure or analyzing genuine NASA FITS observations from the North Ecliptic Pole, every photon tells a story!”'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            SECTION 3: SCIENTIFIC CAPABILITIES (3 Core Pillars)
           ======================================================== */}
        <section className="space-y-4 pt-6">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
              {isRtl ? 'المحركات العلمية المتكاملة' : 'Mission Architecture & Science Engine'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {isRtl ? 'قدرات المنصة العلمية' : 'Scientific Capabilities'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Capability 1: Real FITS Ingestion */}
            <div className="p-5 rounded-2xl bg-[#091122]/80 border border-slate-800 hover:border-cyan-500/40 transition-all text-left space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Binary className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">
                {isRtl ? 'استيعاب بيانات FITS الحقيقية' : 'Authentic FITS Ingestion'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isRtl
                  ? 'قراءة مباشرة لملفات FITS متعددة الملحقات (HDU) من أرشيف NASA/IPAC IRSA، واستخراج بيانات الصورة والتباين (VARIANCE) وأعلام الجودة (FLAGS).'
                  : 'Direct parsing of multi-extension FITS from the NASA/IPAC IRSA archive, extracting calibrated intensity, variance, and bitmask flag arrays.'}
              </p>
            </div>

            {/* Capability 2: Difference Imaging */}
            <div className="p-5 rounded-2xl bg-[#091122]/80 border border-slate-800 hover:border-amber-500/40 transition-all text-left space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">
                {isRtl ? 'التصوير التفاضلي ونشر التباين' : 'Temporal Difference Imaging'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isRtl
                  ? 'طرح صورتين متطابقتين مكانياً D = I₂ - I₁ ونشر التباين رياضياً σ_D = √(σ₁² + σ₂²) لحساب الدلالة الإحصائية واستخراج الأجرام المتغيرة.'
                  : 'Sub-pixel WCS registration, flux subtraction D = I₂ - I₁, and variance propagation σ_D = √(σ₁² + σ₂²) to detect transients with statistical significance.'}
              </p>
            </div>

            {/* Capability 3: Hyperspectral 102 Bands */}
            <div className="p-5 rounded-2xl bg-[#091122]/80 border border-slate-800 hover:border-purple-500/40 transition-all text-left space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Waves className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">
                {isRtl ? '102 لوناً تحت أحمر (LVF)' : '102-Band Hyperspectral LVF'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isRtl
                  ? 'تغطية طيفية متصلة من 0.75 إلى 5.0 ميكرومتر عبر 6 كواشف H2RG لرصد جليد الماء وثاني أكسيد الكربون، وتحديد الانزياحات الكونية نحو الأحمر.'
                  : 'Continuous spectroscopic coverage across 0.75 to 5.0 µm via 6 Linear Variable Filter arrays to detect cosmic ices, dust, and galaxy red-shifts.'}
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================
            SECTION 4: HOW IT WORKS (4-Step Scientific Journey)
           ======================================================== */}
        <section className="p-6 sm:p-8 rounded-3xl bg-[#070d1a] border border-cyan-500/20 space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
              {isRtl ? 'منهجية العمل العلمي' : 'Operational Pipeline'}
            </span>
            <h2 className="text-2xl font-bold text-white">
              {isRtl ? 'كيف تعمل منصة SPEX؟' : 'How the Discovery Pipeline Works'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
              <div className="text-cyan-400 font-mono font-bold text-xs mb-1">01. INGEST & SELECT</div>
              <h4 className="font-semibold text-sm text-white mb-1">Pair Multi-Epoch Scans</h4>
              <p className="text-xs text-slate-400">
                Retrieve two independent SPHEREx observations of the identical celestial coordinates separated in time.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
              <div className="text-purple-400 font-mono font-bold text-xs mb-1">02. REGISTER (WCS)</div>
              <h4 className="font-semibold text-sm text-white mb-1">Sub-Pixel Alignment</h4>
              <p className="text-xs text-slate-400">
                Transform astronomical coordinates via TAN projection matrices and re-sample onto a common reference grid.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
              <div className="text-rose-400 font-mono font-bold text-xs mb-1">03. SUBTRACT (DIFF)</div>
              <h4 className="font-semibold text-sm text-white mb-1">Variance Propagation</h4>
              <p className="text-xs text-slate-400">
                Compute difference flux and per-pixel signal-to-noise ratio: SNR = ΔI / √(σ₁² + σ₂²).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
              <div className="text-emerald-400 font-mono font-bold text-xs mb-1">04. CROSS-MATCH</div>
              <h4 className="font-semibold text-sm text-white mb-1">Gaia & SIMBAD Verification</h4>
              <p className="text-xs text-slate-400">
                Cross-reference candidates against known catalog stars to separate real transients from optical artifacts.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================
            SECTION 5: EDUCATIONAL ADVENTURE FEATURE BANNER
           ======================================================== */}
        <section className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0c1629] via-[#0f1d38] to-[#0c1629] border-2 border-cyan-500/40 shadow-2xl overflow-hidden text-left">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>SPEX: THE LOST SIGNAL • A COSMIC DETECTIVE ADVENTURE</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">
                {isRtl ? 'عش تجربة المحقق الكوني مع الحارس سبيكس' : 'Experience the Cosmic Detective Story Adventure'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                {isRtl
                  ? 'انضم إلى الحارس الميكانيكي سبيكس في مهمة لكشف إشارة طيفية غامضة في القطب الشمالي لمسار الشمس. اجمع الأدلة في مذكرتك الكونية، فكك بصمات جليد الماء وCO2، واطرح الصور لتشخيص الثوران الكوني.'
                  : 'Join SPEX the Mech Cat Guardian on an investigative journey to decode a hidden transient signal in the North Ecliptic Pole. Collect physical clues in your Evidence Notebook, analyze cryogenic ice mantles, and deliver the final forensic verdict.'}
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={onPlayGame}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 hover:from-cyan-500 hover:to-blue-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-950/50 flex items-center gap-2 transition group"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                  <span>{isRtl ? 'تشغيل المغامرة الآن' : 'Play Adventure Game'}</span>
                </button>
                <button
                  onClick={onOpenCases}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  {isRtl ? 'عرض الحالات الموثقة' : 'Explore Curated Benchmarks'}
                </button>
              </div>
            </div>

            <div className="md:col-span-4 flex justify-center">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl overflow-hidden bg-slate-900 border-2 border-cyan-400/40 shadow-2xl flex items-center justify-center">
                <SpexPortrait expression="proud" size={160} />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            SECTION 6: SCIENTIFIC TRANSPARENCY (Real vs Simulation)
           ======================================================== */}
        <section className="p-5 rounded-2xl bg-[#091122]/60 border border-slate-800 text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isRtl ? 'بيان الشفافية والنزاهة العلمية' : 'Scientific Provenance & Transparency Statement'}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isRtl
              ? 'تستخدم محطة الرصد العلمي (Science Workstation) ملفات FITS أصلية غير معدلة مأخوذة من مسح SPHEREx Quick Release 2 (QR2) عبر أرشيف NASA/IPAC IRSA. بينما توظف المغامرة التعليمية نماذج تركيبية (Synthetic Benchmark Simulation) محكمة لتدريب الطلاب على التصوير التفاضلي دون خلطها بالسجلات الفلكية الرسمية.'
              : 'The Science Workstation operates directly on authentic, unaltered FITS files from the SPHEREx Quick Release 2 (QR2) archive hosted at NASA/IPAC IRSA. Meanwhile, the educational story adventure utilizes strictly labeled Synthetic Benchmark Simulations for interactive learning without contaminating genuine mission data.'}
          </p>
        </section>

        {/* ========================================================
            SECTION 7: COMPACT FOOTER
           ======================================================== */}
        <footer className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <SpherexLogo size={20} />
            <span>SPEX: THE CHANGING SKY • NASA SPACE APPS CHALLENGE 2026</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenAbout}
              className="hover:text-cyan-400 transition"
            >
              Scientific Audit & Architecture
            </button>
            <span>·</span>
            <a
              href="https://irsa.ipac.caltech.edu/Missions/spherex.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-400 transition flex items-center gap-1"
            >
              NASA/IPAC Archive <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};
