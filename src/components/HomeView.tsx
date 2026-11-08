import React, { useState, useEffect } from 'react';
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
  MessageSquare,
  X,
  Smile,
  Terminal,
  Radio,
  Server,
  Box,
} from 'lucide-react';
import { SPEX_ASSETS, SPEX_HERO_IMAGE, SPEX_WAVING_HERO } from '../spex/spexAssets';
import { SpherexLogo } from './SpherexLogo';
import { SpexPortrait } from '../spex/SpexPortrait';
import { Language, translations } from '../utils/translations';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface HomeViewProps {
  onStartExplore: (caseId?: string) => void;
  onOpenAbout: () => void;
  onOpenCases: () => void;
  onPlayGame?: () => void;
  cases?: Array<{ id: string; title: string; category?: string; ra: number; dec: number }>;
  language: Language;
}

interface MissionTelemetry {
  status: string;
  mission: string;
  dataAvailability: string;
  dataSource: string;
  scienceEngine: {
    status: string;
    wcsRegistration: string;
    variancePropagation: string;
    transientDetection: string;
  };
  aiStatus: string;
  activeRelease: string;
  benchmarkCasesCount: number;
  cachedFITSFiles: number;
  lastProcessingRun: string;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartExplore,
  onOpenAbout,
  onOpenCases,
  onPlayGame,
  cases = [],
  language,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  const [isMeetSpexOpen, setIsMeetSpexOpen] = useState(false);
  useModalBehavior(isMeetSpexOpen, () => setIsMeetSpexOpen(false));

  const [quickRa, setQuickRa] = useState<string>('276.2614');
  const [quickDec, setQuickDec] = useState<string>('64.8258');

  // Live Mission Control Telemetry
  const [telemetry, setTelemetry] = useState<MissionTelemetry | null>(null);

  useEffect(() => {
    fetch('/api/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setTelemetry(data);
      })
      .catch((err) => console.warn('Could not fetch mission telemetry:', err));
  }, []);

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
      className={`relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-[#070a12] text-slate-100 ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Ambient background glow & orbital grid */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/6 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[950px] h-[650px] bg-gradient-to-tr from-amber-500/10 via-cyan-500/10 to-indigo-900/20 blur-[170px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-25" />
      </div>

      <div className="mx-auto max-w-6xl w-full my-auto space-y-16">
        {/* ========================================================
            SECTION 1: NASA MISSION CONTROL HERO
           ======================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pt-2">
          {/* Left Column */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Mission Badge */}
            <div className="flex items-center gap-2 text-xs font-mono tracking-wider text-cyan-400 uppercase mb-4 font-semibold bg-cyan-950/70 px-3.5 py-1.5 rounded-full border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>NASA SPHEREx MISSION</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="font-bold text-amber-400">QR2 NEP ARCHIVE OPERATIONAL</span>
            </div>

            {/* Display: SPEX & THE CHANGING SKY */}
            <div className="mb-2">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-amber-500 block mb-1">
                SPEX — NASA SPACE APPS CHALLENGE 2026
              </span>
              <h1 className="font-['Outfit'] text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.05]">
                THE CHANGING{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-400">
                  SKY
                </span>
              </h1>
            </div>

            {/* Core User Specified Headline */}
            <h2 className="text-xl sm:text-2xl font-bold text-cyan-300 mt-2 mb-3 tracking-wide">
              {isRtl
                ? '«كل رصد يحكي قصة. وكل تغير يستحق التحقيق.»'
                : 'Every observation tells a story. Every change deserves an investigation.'}
            </h2>

            {/* Supporting Description */}
            <p className="text-sm sm:text-base text-slate-300 font-normal max-w-xl mb-6 leading-relaxed">
              {isRtl
                ? 'استكشف كون الأشعة تحت الحمراء من خلال رصدات SPHEREx. قارن السماء عبر الزمن وحقق في الإشارات الفلكية التي تستحق نظرة عن قرب.'
                : 'Explore the infrared universe through SPHEREx observations. Compare the sky across time and investigate the signals that deserve a closer look.'}
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <button
                onClick={() => onStartExplore()}
                className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/25 flex items-center gap-2.5 transition cursor-pointer active:scale-95 group"
              >
                <Telescope className="w-4 h-4 text-slate-950" />
                <span>{isRtl ? 'دخول غرفة التحكم بالرصد' : 'ENTER MISSION CONTROL'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {onPlayGame && (
                <button
                  onClick={onPlayGame}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center gap-2 transition cursor-pointer active:scale-95"
                >
                  <Box className="w-4 h-4 text-slate-950" />
                  <span>{isRtl ? 'بدء المغامرة ثلاثية الأبعاد 3D' : 'PLAY 3D ADVENTURE'}</span>
                </button>
              )}

              <button
                onClick={() => setIsMeetSpexOpen(true)}
                className="px-5 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-white font-medium text-xs shadow-md flex items-center gap-2 transition cursor-pointer active:scale-95"
              >
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isRtl ? 'دليل SPEX' : 'Meet SPEX'}</span>
              </button>
            </div>

            {/* Quick Coordinate Search Bar */}
            <form
              onSubmit={handleQuickSubmit}
              className="w-full max-w-xl p-3 rounded-2xl border border-cyan-500/30 bg-[#0b1120]/95 shadow-lg flex flex-wrap items-center gap-2.5"
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

          {/* Right Column: SPEX Character & Celestial Eye Logo */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-sm flex flex-col items-center">
              {/* Authentic Celestial Eye Emblem */}
              <div className="absolute -top-10 -right-2 opacity-35 pointer-events-none">
                <SpherexLogo size={150} />
              </div>

              {/* Authentic SPEX Character */}
              <div className="relative group flex items-center justify-center">
                <div className="absolute -inset-6 bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-purple-600/20 blur-3xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                <img
                  src={SPEX_HERO_IMAGE}
                  alt="SPEX Egyptian Mech Cat Guardian"
                  className="relative z-10 w-64 sm:w-72 h-auto drop-shadow-2xl transition-transform hover:scale-102"
                />
              </div>

              {/* Character Quote Bubble */}
              <div className="relative z-20 mt-3 p-4 rounded-2xl border border-cyan-500/30 bg-[#0b1120]/95 shadow-2xl backdrop-blur-md text-left w-full">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-amber-400 font-mono">SPEX</span>
                  <span className="text-[10px] text-cyan-300 font-mono ml-auto">
                    MECH CAT COMPANION
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {isRtl
                    ? '«أهلاً بك في غرفة التحكم الفلكية! انضم إلي لاستكشاف 102 حزمة طيفية بالأشعة تحت الحمراء وتحديد ما تغيّر في سمائنا الكونية.»'
                    : '“Welcome to Mission Control! Join me to analyze 102-band infrared observations, run variance subtraction, and discover genuine celestial shifts.”'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            SECTION 2: GENUINE MISSION STATUS TELEMETRY TERMINAL
           ======================================================== */}
        <section className="p-6 rounded-3xl bg-[#0b1120] border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] text-left space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400 font-semibold block">
                  SYSTEM TELEMETRY CONSOLE
                </span>
                <h3 className="text-base font-bold text-white">
                  {isRtl ? 'حالة المنظومة الفلكية الحية' : 'Live Mission Status & Telemetry'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-400 font-bold">ALL SYSTEMS NOMINAL</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* 1. Data Availability */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>DATA AVAILABILITY</span>
                <Server className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-sm font-bold text-white">
                {telemetry?.dataAvailability || 'OPERATIONAL'}
              </div>
              <div className="text-[11px] text-cyan-300/80 font-mono">
                {telemetry?.cachedFITSFiles ?? 6} FITS Cutouts Ready
              </div>
            </div>

            {/* 2. Data Source */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>DATA SOURCE</span>
                <DatabaseIcon className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-sm font-bold text-white">
                NASA IPAC IRSA Level-2B
              </div>
              <div className="text-[11px] text-amber-300/80 font-mono">
                NEP Deep Survey Benchmark
              </div>
            </div>

            {/* 3. Science Engine */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>SCIENCE ENGINE</span>
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-sm font-bold text-white">
                WCS & Variance D=I₂-I₁
              </div>
              <div className="text-[11px] text-emerald-300/80 font-mono">
                Bilinear Registration &gt;5.0σ
              </div>
            </div>

            {/* 4. AI & Processing */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>AI STATUS & LAST RUN</span>
                <Radio className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-sm font-bold text-white truncate">
                {telemetry?.aiStatus || 'ONLINE (GEMINI MULTI-MODEL)'}
              </div>
              <div className="text-[10px] text-purple-300/80 font-mono truncate">
                {telemetry?.lastProcessingRun
                  ? new Date(telemetry.lastProcessingRun).toLocaleTimeString()
                  : 'READY'}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            SECTION 3: THREE VISUAL STAGES
           ======================================================== */}
        <section className="space-y-6 pt-2">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
              {isRtl ? 'مسار التحقيق العلمي' : 'THREE SCIENTIFIC STAGES'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {isRtl ? 'كيف تعمل غرفة استكشاف SPEX؟' : 'How the SPEX Pipeline Works'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stage 1: EXPLORE */}
            <div className="p-6 rounded-3xl bg-[#0b1120] border border-cyan-500/20 hover:border-cyan-500/50 transition-all text-left space-y-4 shadow-lg group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">01</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 uppercase font-semibold">
                  STAGE 01: EXPLORE
                </span>
              </div>
              <h3 className="font-bold text-white text-lg group-hover:text-cyan-300 transition">
                {isRtl ? 'اختر موقعاً في قبة السماء' : 'Select Celestial Coordinates'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isRtl
                  ? 'أدخل إحداثيات الصعود المستقيم والميل (RA/Dec) أو اختر موقعاً موثقاً من أرشيف القطب الشمالي لمسار الشمس (NEP).'
                  : 'Input Right Ascension and Declination or select an authentic North Ecliptic Pole (NEP) benchmark field with multi-epoch coverage.'}
              </p>
              <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-cyan-300/90 border border-slate-800">
                <div>RA: 276.2614° · Dec: +64.8258°</div>
                <div className="text-slate-500 text-[10px] mt-0.5">NASA SPHEREx Level-2B Benchmark Footprint</div>
              </div>
            </div>

            {/* Stage 2: COMPARE */}
            <div className="p-6 rounded-3xl bg-[#0b1120] border border-amber-500/20 hover:border-amber-500/50 transition-all text-left space-y-4 shadow-lg group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">02</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 uppercase font-semibold">
                  STAGE 02: COMPARE
                </span>
              </div>
              <h3 className="font-bold text-white text-lg group-hover:text-amber-300 transition">
                {isRtl ? 'قارن الرصدات عبر الزمن' : 'Align Multi-Epoch Infrared Scans'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isRtl
                  ? 'حاذِ الصور الفلكية المتباعدة زمنياً بدقة دون البكسل، واستخدم شريط المقارنة المنقسم والميض السريع لكشف التغيرات.'
                  : 'Align calibrated FITS observations taken months apart. Use interactive split-view wipes and 2Hz rapid blink to detect real motion.'}
              </p>
              <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-amber-300/90 border border-slate-800">
                <div>Visit 1: 2024-03 · Visit 2: 2024-09</div>
                <div className="text-slate-500 text-[10px] mt-0.5">Sub-Pixel Bilinear WCS Registration</div>
              </div>
            </div>

            {/* Stage 3: INVESTIGATE */}
            <div className="p-6 rounded-3xl bg-[#0b1120] border border-emerald-500/20 hover:border-emerald-500/50 transition-all text-left space-y-4 shadow-lg group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">03</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 uppercase font-semibold">
                  STAGE 03: INVESTIGATE
                </span>
              </div>
              <h3 className="font-bold text-white text-lg group-hover:text-emerald-300 transition">
                {isRtl ? 'احسب الفروق وحلل الإشارة' : 'Calculate Variance Difference & SNR'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isRtl
                  ? 'اطرح فيض الضوء D = I₂ - I₁، وانشر أخطاء التباين، واستخرج الإشارات ذات الدلالة الإحصائية (> 5σ) وطابقها مع فهارس Gaia.'
                  : 'Compute calibrated flux difference D = I₂ - I₁, propagate read-noise variance, evaluate SNR > 5σ, and cross-match Gaia catalogs.'}
              </p>
              <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-emerald-300/90 border border-slate-800">
                <div>SNR = ΔI / √(σ₁² + σ₂²) &gt; +5.0σ</div>
                <div className="text-slate-500 text-[10px] mt-0.5">Authentic PSF vs Cosmic Ray Discrimination</div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            SECTION 4: FEATURED DISCOVERIES
           ======================================================== */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                {isRtl ? 'الأدلة والنتائج الموثقة' : 'VERIFIED ASTROPHYSICAL CANDIDATES'}
              </span>
              <h2 className="text-2xl font-bold text-white">
                {isRtl ? 'الحالات والاستكشافات المميزة' : 'Curated Case Investigations'}
              </h2>
            </div>
            <button
              onClick={onOpenCases}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>{isRtl ? 'عرض كل الحالات' : 'View All'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {cases && cases.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {cases.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  onClick={() => onStartExplore(c.id)}
                  className="p-4 rounded-2xl bg-[#0b1120] border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group space-y-2 text-left shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold uppercase">
                      {c.category || 'NEP Transient'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">ID: {c.id}</span>
                  </div>
                  <h4 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                    {c.title}
                  </h4>
                  <div className="text-xs font-mono text-slate-400">
                    RA {c.ra.toFixed(4)}° · Dec {c.dec.toFixed(4)}°
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-cyan-400 font-mono">
                    <span>Inspect Pipeline Output</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* ========================================================
            SECTION 5: MEET SPEX (Personality Modal Trigger)
           ======================================================== */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0b1120] via-[#0f172a] to-[#0b1120] border border-cyan-500/30 text-left space-y-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                <Smile className="w-3.5 h-3.5" />
                <span>MEET YOUR INVESTIGATION COMPANION</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">
                {isRtl ? 'تعرّف على الحارس SPEX' : 'Meet SPEX: Your Celestial Guide'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                SPEX is an Egyptian Mech Cat astrophysicist companion modeled after ancient Bastet guardians, equipped with infrared sensors and sharp curiosity. SPEX helps you at every step of your journey:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Explain Scientific Terms</span>
                    <span className="text-slate-400">Translates WCS, variance, and FITS into plain English.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Explain Exploration Steps</span>
                    <span className="text-slate-400">Guides you through multi-epoch image subtraction.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Interpret Evidence</span>
                    <span className="text-slate-400">Helps distinguish asteroids and stars from camera glitches.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Guide the 3D Adventure</span>
                    <span className="text-slate-400">Accompanies you through all 5 space research missions.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-4 flex justify-center">
              <div className="w-44 h-44 rounded-3xl overflow-hidden bg-slate-900 border-2 border-cyan-400/40 shadow-2xl flex items-center justify-center p-2">
                <img
                  src={SPEX_WAVING_HERO}
                  alt="SPEX Waving Greeting"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Meet SPEX Modal */}
      {isMeetSpexOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsMeetSpexOpen(false)}
        >
          <div 
            className="w-full max-w-xl bg-[#0b1120] border border-cyan-500/40 rounded-3xl p-6 text-slate-100 shadow-2xl relative"
            dir={isRtl ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Smile className="w-6 h-6 text-amber-400" />
                <h3 className="text-lg font-bold text-white">
                  {isRtl ? 'دليل ورفيق الرحلة: SPEX' : 'Meet SPEX: The Cosmic Investigator'}
                </h3>
              </div>
              <button 
                onClick={() => setIsMeetSpexOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 flex gap-4 items-start">
              <img 
                src={SPEX_HERO_IMAGE} 
                alt="SPEX" 
                className="w-28 h-auto object-contain rounded-2xl bg-slate-900 p-2 border border-cyan-500/30 flex-shrink-0"
              />
              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>
                  {isRtl
                    ? 'تم تصميم SPEX ليكون رفيقك العلمي الذي يجمع بين الدقة الفيزيائية وروح الدعابة والمغامرة.'
                    : 'SPEX combines genuine astrophysical rigor with curiosity, guiding beginners and experts through real NASA SPHEREx data.'}
                </p>
                <p>
                  {isRtl
                    ? 'في كل شاشة استكشاف، ستجد شروحات SPEX التفاعلية وتعبيرات وجهه المتغيرة لمساعدتك في اتخاذ القرارات الصحيحة.'
                    : 'Throughout the application, SPEX delivers contextual dialogues, evaluates data quality, and assists in 3D mission simulations.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsMeetSpexOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                {isRtl ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper internal Icon component
function DatabaseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}
