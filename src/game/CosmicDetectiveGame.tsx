import React, { useState, useEffect, useRef } from 'react';
import {
  Telescope,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  ChevronRight,
  Compass,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Eye,
  Radio,
  ExternalLink,
  Play,
  Pause,
  Maximize2,
  Crosshair,
  Move,
  Flame,
  FileText,
  BadgeCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  EDUCATIONAL_DISCLAIMER,
  EDUCATIONAL_SPECTRUM_BANDS,
  EDUCATIONAL_DETECTOR_ARRAYS,
  EDUCATIONAL_PIPELINE_STEPS,
  EDUCATIONAL_SCENARIOS,
  generateSyntheticScenarioImages,
  SyntheticImageData,
} from './educationalData';
import { SpherexLogo } from '../components/SpherexLogo';
import { Language, translations } from '../utils/translations';
import { SPEX_ASSETS } from '../spex/spexAssets';

interface CosmicDetectiveGameProps {
  language: Language;
  onExitToExplore: (caseId?: string) => void;
  onBackToHome: () => void;
  theme?: 'dark' | 'light';
}

export const CosmicDetectiveGame: React.FC<CosmicDetectiveGameProps> = ({
  language,
  onExitToExplore,
  onBackToHome,
}) => {
  const isArabic = language === 'ar';
  const t = translations[language];

  // Game state flow: 'intro' | 'playing' | 'level1_complete' | 'level2_complete'
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'level1_complete' | 'level2_complete'>('intro');
  const [level, setLevel] = useState<1 | 2>(1);
  const [missionIndex, setMissionIndex] = useState<number>(0);
  const [xp, setXp] = useState<number>(100);
  const [badges, setBadges] = useState<string[]>([]);

  // Level 1 Challenge 1: See Beyond Visible Light (Interactive Wipe / Crossfade)
  const [l1WipePos, setL1WipePos] = useState<number>(50); // 0 (100% visible) to 100 (100% IR)
  const [l1InspectedSpot, setL1InspectedSpot] = useState<'dust' | 'protostar' | null>(null);

  // Level 1 Challenge 2: The 102 Colors (Fluid Wavelength Scrubber)
  const [l1Wavelength, setL1Wavelength] = useState<number>(3.05); // 0.75 um to 5.0 um

  // Level 1 Challenge 3: Map the Universe (Orbital Cadence)
  const [orbitStep, setOrbitStep] = useState<number>(0); // 0 to 4
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);

  // Level 1 Challenge 4: From Light to Science (Interactive Photon Conveyor)
  const [pipelineActiveStep, setPipelineActiveStep] = useState<number>(0);
  const [isPhotonMoving, setIsPhotonMoving] = useState<boolean>(false);

  // Level 2 Interactive Astronomical Viewport
  const [compareMode, setCompareMode] = useState<'split' | 'blink' | 'side' | 'diff'>('split');
  const [splitPos, setSplitPos] = useState<number>(0.5);
  const [blinkEpoch, setBlinkEpoch] = useState<1 | 2>(1);
  const [blinkSpeedHz, setBlinkSpeedHz] = useState<number>(2); // 1, 2, 4
  const [scenarioIdx, setScenarioIdx] = useState<number>(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [probeCoords, setProbeCoords] = useState<{ x: number; y: number; val1: number; val2: number; diffVal: number } | null>(null);

  // Level 2 Final Mystery Investigation
  const [finalVerdictCategory, setFinalVerdictCategory] = useState<string | null>(null);
  const [finalEvidenceChecked, setFinalEvidenceChecked] = useState<{ [key: string]: boolean }>({});
  const [finalReportGenerated, setFinalReportGenerated] = useState<boolean>(false);

  // Canvas refs for astronomical rendering
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRefE1 = useRef<HTMLCanvasElement | null>(null);
  const canvasRefE2 = useRef<HTMLCanvasElement | null>(null);

  const currentScenario = EDUCATIONAL_SCENARIOS[scenarioIdx] || EDUCATIONAL_SCENARIOS[0];
  const [synthData, setSynthData] = useState<SyntheticImageData>(() =>
    generateSyntheticScenarioImages(currentScenario.syntheticImagePattern)
  );

  // Update synthetic data when scenario changes
  useEffect(() => {
    if (missionIndex === 3) {
      // Final mystery scenario
      setSynthData(generateSyntheticScenarioImages('final_mystery'));
    } else {
      setSynthData(generateSyntheticScenarioImages(currentScenario.syntheticImagePattern));
    }
    setSelectedChoiceId(null);
    setShowExplanation(false);
    setProbeCoords(null);
  }, [scenarioIdx, missionIndex, currentScenario.syntheticImagePattern]);

  // Automated Blink interval
  useEffect(() => {
    if (compareMode !== 'blink') return;
    const intervalMs = 1000 / blinkSpeedHz;
    const timer = setInterval(() => {
      setBlinkEpoch((prev) => (prev === 1 ? 2 : 1));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [compareMode, blinkSpeedHz]);

  // Automated Orbit animation in Level 1 Challenge 3
  useEffect(() => {
    if (!isOrbiting) return;
    const timer = setInterval(() => {
      setOrbitStep((prev) => (prev + 1) % 6);
    }, 1200);
    return () => clearInterval(timer);
  }, [isOrbiting]);

  // Render Synthetic Astronomical Canvas in Level 2
  useEffect(() => {
    if (level !== 2) return;
    const width = synthData.width;
    const height = synthData.height;

    // Helper to map flux to color
    const getFluxColor = (val: number, minVal = 0, maxVal = 60) => {
      const norm = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
      // Scientific Infrared Colormap (Deep Navy -> Violet -> Amber -> White)
      const r = Math.floor(Math.min(255, norm * 2.5 * 255));
      const g = Math.floor(Math.min(255, Math.max(0, (norm - 0.3) * 2.2 * 255)));
      const b = Math.floor(Math.min(255, Math.max(0, (norm - 0.6) * 3 * 255) + (1 - norm) * 40));
      return [r, g, b];
    };

    // Diverging Difference Colormap (Cyan = negative drop, Black = zero, Amber = positive surge)
    const getDiffColor = (val: number, maxAbs = 35) => {
      const norm = Math.max(-1, Math.min(1, val / maxAbs));
      if (norm > 0) {
        // Positive surge (Orange / Amber / Yellow)
        const r = Math.floor(norm * 255);
        const g = Math.floor(norm * 180);
        const b = 0;
        return [r, g, b];
      } else {
        // Negative drop (Cyan / Electric Blue)
        const absN = Math.abs(norm);
        const r = 0;
        const g = Math.floor(absN * 210);
        const b = Math.floor(absN * 255);
        return [r, g, b];
      }
    };

    // Draw main single canvas (split, blink, diff)
    if (canvasRef.current && (compareMode === 'split' || compareMode === 'blink' || compareMode === 'diff')) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = width;
        canvas.height = height;
        const imgData = ctx.createImageData(width, height);
        const splitThresholdX = Math.floor(width * splitPos);

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const pxOffset = idx * 4;

            let rgb = [0, 0, 0];
            if (compareMode === 'diff') {
              rgb = getDiffColor(synthData.diff[idx]);
            } else if (compareMode === 'blink') {
              const val = blinkEpoch === 1 ? synthData.epoch1[idx] : synthData.epoch2[idx];
              rgb = getFluxColor(val);
            } else if (compareMode === 'split') {
              const val = x < splitThresholdX ? synthData.epoch1[idx] : synthData.epoch2[idx];
              rgb = getFluxColor(val);
              // Draw split dividing line
              if (x === splitThresholdX) {
                rgb = [255, 255, 255];
              }
            }

            imgData.data[pxOffset] = rgb[0];
            imgData.data[pxOffset + 1] = rgb[1];
            imgData.data[pxOffset + 2] = rgb[2];
            imgData.data[pxOffset + 3] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }
    }

    // Draw Side-by-Side canvases
    if (canvasRefE1.current && canvasRefE2.current && compareMode === 'side') {
      const c1 = canvasRefE1.current;
      const c2 = canvasRefE2.current;
      const ctx1 = c1.getContext('2d');
      const ctx2 = c2.getContext('2d');

      if (ctx1 && ctx2) {
        c1.width = width;
        c1.height = height;
        c2.width = width;
        c2.height = height;

        const img1 = ctx1.createImageData(width, height);
        const img2 = ctx2.createImageData(width, height);

        for (let i = 0; i < width * height; i++) {
          const off = i * 4;
          const rgb1 = getFluxColor(synthData.epoch1[i]);
          const rgb2 = getFluxColor(synthData.epoch2[i]);

          img1.data[off] = rgb1[0];
          img1.data[off + 1] = rgb1[1];
          img1.data[off + 2] = rgb1[2];
          img1.data[off + 3] = 255;

          img2.data[off] = rgb2[0];
          img2.data[off + 1] = rgb2[1];
          img2.data[off + 2] = rgb2[2];
          img2.data[off + 3] = 255;
        }

        ctx1.putImageData(img1, 0, 0);
        ctx2.putImageData(img2, 0, 0);
      }
    }
  }, [level, compareMode, splitPos, blinkEpoch, synthData]);

  // Handle click on astronomical canvas to probe flux
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const px = Math.floor((clickX / rect.width) * synthData.width);
    const py = Math.floor((clickY / rect.height) * synthData.height);

    if (px >= 0 && px < synthData.width && py >= 0 && py < synthData.height) {
      const idx = py * synthData.width + px;
      setProbeCoords({
        x: px,
        y: py,
        val1: synthData.epoch1[idx],
        val2: synthData.epoch2[idx],
        diffVal: synthData.diff[idx],
      });
    }
  };

  // Rank title computation
  const getRank = () => {
    if (xp >= 800) return isArabic ? 'كبير محققي الكون الفلكيين' : 'Master Cosmic Detective';
    if (xp >= 500) return isArabic ? 'محلل طيفي متقدم' : 'Senior Spectral Analyst';
    if (xp >= 300) return isArabic ? 'راصد الأشعة تحت الحمراء' : 'Infrared Field Scout';
    return isArabic ? 'محقّق متدرب' : 'Cadet Investigator';
  };

  // Level 1: Proceed to next challenge
  const handleNextLevel1Challenge = () => {
    if (missionIndex < 3) {
      setMissionIndex((prev) => prev + 1);
      setXp((prev) => prev + 100);
    } else {
      setXp((prev) => prev + 200);
      setBadges((prev) => [...new Set([...prev, 'mission_observer'])]);
      setGameState('level1_complete');
    }
  };

  // Level 2: Handle scenario choice
  const handleScenarioChoice = (choiceId: string, isCorrect: boolean) => {
    setSelectedChoiceId(choiceId);
    setShowExplanation(true);
    if (isCorrect) {
      setXp((prev) => prev + 100);
    }
  };

  // Level 2: Next scenario
  const handleNextScenario = () => {
    if (scenarioIdx < EDUCATIONAL_SCENARIOS.length - 1) {
      setScenarioIdx((prev) => prev + 1);
    } else {
      // Transition to final mystery mission
      setMissionIndex(3);
    }
  };

  // Complete final report
  const handleGenerateFinalReport = () => {
    setFinalReportGenerated(true);
    setXp((prev) => prev + 300);
    setBadges((prev) => [...new Set([...prev, 'cosmic_detective'])]);
    setGameState('level2_complete');
  };

  return (
    <div
      className={`min-h-[calc(100vh-4rem)] bg-[#060810] text-slate-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200 ${
        isArabic ? 'font-cairo' : 'font-sans'
      }`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Top Educational Isolation Disclaimer Banner */}
      <div className="w-full bg-cyan-950/80 border-b border-cyan-500/30 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono font-bold tracking-wider text-cyan-300 uppercase">
            {isArabic ? 'بيئة المحاكاة التعليمية المستقلة' : 'INTERACTIVE EDUCATIONAL ENVIRONMENT'}
          </span>
          <span className="text-slate-400 hidden sm:inline">·</span>
          <span className="text-cyan-200/80 hidden sm:inline">{EDUCATIONAL_DISCLAIMER}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onExitToExplore('case-nep-var-01')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-colors shadow-xs cursor-pointer"
          >
            <span>{isArabic ? 'الانتقال للرصد الحقيقي (QR2)' : 'Switch to Real Data (QR2)'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Game Shell */}
      <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col justify-between space-y-6">
        {/* Game Navigation Header & HUD */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-[#0b0f19] border border-white/[0.08] shadow-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setGameState('intro')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <SpherexLogo size={36} />
              <div>
                <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold block uppercase">
                  NASA SPHEREx SIMULATION
                </span>
                <h1 className="font-['Outfit'] text-base sm:text-lg font-black tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  SPHEREx: THE COSMIC DETECTIVE
                </h1>
              </div>
            </button>
          </div>

          {/* XP & Detective Rank */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <div className="text-left font-mono">
                <div className="text-[10px] text-slate-400 leading-none">XP POINTS</div>
                <div className="text-xs font-bold text-amber-300 tabular-nums">{xp} XP</div>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-400" />
              <div className="text-left font-mono">
                <div className="text-[10px] text-cyan-300 leading-none">RANK</div>
                <div className="text-xs font-bold text-white">{getRank()}</div>
              </div>
            </div>

            {/* Level Selector Pills */}
            <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  setLevel(1);
                  setMissionIndex(0);
                  setGameState('playing');
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                  level === 1 && gameState === 'playing'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isArabic ? 'المستوى 1: كُن الراصد' : 'Level 1: The Observer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLevel(2);
                  setMissionIndex(0);
                  setGameState('playing');
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                  level === 2 && gameState === 'playing'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isArabic ? 'المستوى 2: حقق فيما تغير' : 'Level 2: What Changed?'}
              </button>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------------------------- */}
        {/* VIEW 1: CINEMATIC INTRODUCTION */}
        {/* --------------------------------------------------------------------------------- */}
        {gameState === 'intro' && (
          <div className="my-auto py-8 space-y-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Briefing Text */}
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold tracking-wider uppercase">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'مهمة تحقيق جديدة' : 'INVESTIGATION BRIEFING'}</span>
                </div>

                <h2 className="font-['Outfit'] text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
                  {isArabic ? 'كل فوتون يروي قصة.' : 'Every photon tells a story.'}
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-400">
                    {isArabic ? 'هل يمكنك اكتشاف ما تغير؟' : 'Can you discover what changed?'}
                  </span>
                </h2>

                <p className="text-base text-slate-300 leading-relaxed font-sans max-w-xl">
                  {isArabic
                    ? 'تم تجنيدك كمحقّق كوني لمهمة SPHEREx التابعة لناسا! مهمتك فحص السماء تحت الحمراء، طرح الصور زمنياً، وفصل الانفجارات النجمية والكويكبات الحقيقية عن تشويش الأجهزة واهتزاز التلسكوب.'
                    : 'You have been recruited as a Cosmic Detective. Your mission is to investigate the infrared universe across 102 spectral bands, compute temporal difference maps, and discover what changed over time.'}
                </p>

                {/* Level 1 & 2 Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => {
                      setLevel(1);
                      setMissionIndex(0);
                      setGameState('playing');
                    }}
                    className="p-4 rounded-2xl border border-cyan-500/30 bg-[#0b1021] hover:border-cyan-400/60 transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-mono text-cyan-400 font-bold mb-1">
                      {isArabic ? 'المستوى 1' : 'LEVEL 1'}
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {isArabic ? 'كُن الراصد الفلكي' : 'Become the Observer'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">
                      {isArabic
                        ? 'تعلم كيف يخترق ضوء الأشعة تحت الحمراء الغبار، واكتشف 102 نطاق طيفي ومسار مسح السماء.'
                        : 'Discover how infrared penetrates cosmic dust, explore 102 colors, and master satellite orbital scanning.'}
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      setLevel(2);
                      setMissionIndex(0);
                      setGameState('playing');
                    }}
                    className="p-4 rounded-2xl border border-amber-500/30 bg-[#0b1021] hover:border-amber-400/60 transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-mono text-amber-400 font-bold mb-1">
                      {isArabic ? 'المستوى 2' : 'LEVEL 2'}
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      {isArabic ? 'حقق فيما تغيّر' : 'Find What Changed'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">
                      {isArabic
                        ? 'استخدم الوميض وطرح الصور D = I2 - I1 للتحقيق في 5 سيناريوهات فلكية وحل اللغز النهائي.'
                        : 'Use blink comparator and subtraction D = I2 - I1 to investigate 5 mysteries and solve the final case.'}
                    </p>
                  </div>
                </div>

                {/* Primary Button */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLevel(1);
                      setMissionIndex(0);
                      setGameState('playing');
                    }}
                    className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm transition-all shadow-xl active:scale-95 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>{isArabic ? 'ابدأ التحقيق الفلكي' : 'START INVESTIGATION'}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onExitToExplore('case-nep-var-01')}
                    className="inline-flex items-center gap-2 px-5 py-4 rounded-2xl border border-white/[0.1] hover:bg-white/[0.05] text-slate-300 text-xs font-mono transition-colors cursor-pointer"
                  >
                    <span>{isArabic ? 'تخطي للرصد الحقيقي' : 'Skip to Real Explore'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: SPEX Guardian Companion */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="relative w-full max-w-sm flex flex-col items-center">
                  <div className="relative group">
                    <div className="absolute -inset-6 bg-gradient-to-r from-cyan-500/20 via-amber-500/20 to-purple-600/20 blur-3xl rounded-full opacity-70 group-hover:opacity-100 transition-opacity" />
                    <img
                      src={SPEX_ASSETS.greeting.imagePath}
                      alt="SPEX Space Guide"
                      className="relative z-10 w-64 h-auto drop-shadow-2xl transition-transform hover:scale-105"
                    />
                  </div>

                  <div className="relative z-20 mt-4 p-4 rounded-2xl border border-white/[0.1] bg-[#0c1220]/90 shadow-xl backdrop-blur-md text-left">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-amber-300 font-mono">SPEX ASTROPHYSICIST</span>
                      <span className="text-[10px] text-cyan-400 font-mono ml-auto">MISSION COMPANION</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {isArabic
                        ? '«أنا سبيكس، رفيقك الفلكي في هذه الرحلة! سأساعدك في فك ألغاز الأشعة تحت الحمراء وطرح الصور خطوة بخطوة. اضغط ابدأ التحقيق ودعنا ننطلق!»'
                        : '“Welcome Detective! Real telescopes don’t just take pretty pictures; they measure changing physical flux. I’ll guide you through spectral bands and subtraction physics!”'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------------------- */}
        {/* VIEW 2: LEVEL 1 — BECOME THE OBSERVER */}
        {/* --------------------------------------------------------------------------------- */}
        {gameState === 'playing' && level === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Mission Progress Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                  {isArabic ? `المستوى 1 · التحدي ${missionIndex + 1} من 4` : `Level 1 · Challenge ${missionIndex + 1} of 4`}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold font-['Outfit'] text-white">
                  {missionIndex === 0 && (isArabic ? '1. الرؤية ما وراء الضوء المرئي' : '1. See Beyond Visible Light')}
                  {missionIndex === 1 && (isArabic ? '2. الـ 102 لوناً طيفياً' : '2. The 102 Colors of SPHEREx')}
                  {missionIndex === 2 && (isArabic ? '3. رسم خريطة السماء والمدار' : '3. Map the Universe & Orbit')}
                  {missionIndex === 3 && (isArabic ? '4. من الفوتون إلى العلم' : '4. From Light to Science')}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleNextLevel1Challenge}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <span>{missionIndex < 3 ? (isArabic ? 'التحدي التالي (+100 XP)' : 'Next Challenge (+100 XP)') : (isArabic ? 'إتمام المستوى 1' : 'Complete Level 1')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Challenge 1: See Beyond Visible Light */}
            {missionIndex === 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-4">
                  {/* Interactive Split-Wipe Astronomical Cloud Viewport */}
                  <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/[0.1] bg-black shadow-2xl select-none">
                    {/* Background Layer: Infrared (Visible when wipe slider moves) */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-950 via-slate-950 to-indigo-950 p-6 flex items-center justify-center">
                      {/* Protostar Glowing through Dust */}
                      <div className="relative flex items-center justify-center">
                        <div className="absolute w-48 h-48 rounded-full bg-amber-500/20 blur-2xl animate-pulse" />
                        <div className="absolute w-24 h-24 rounded-full bg-rose-500/40 blur-xl" />
                        <div className="w-10 h-10 rounded-full bg-amber-200 shadow-[0_0_40px_rgba(245,158,11,1)] flex items-center justify-center">
                          <Flame className="w-5 h-5 text-amber-900" />
                        </div>
                        {/* Protoplanetary Ice Ring */}
                        <div className="absolute w-56 h-20 rounded-full border border-cyan-400/60 rotate-12 shadow-[0_0_15px_rgba(6,182,212,0.4)] pointer-events-none" />
                      </div>

                      <div className="absolute bottom-4 left-4 text-[10px] font-mono text-cyan-300 bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-md">
                        λ = 3.05 µm · INFRARED TRANSPARENCY: 85%
                      </div>
                    </div>

                    {/* Foreground Layer: Optical Visible Light (Clipped by slider) */}
                    <div
                      style={{ clipPath: `inset(0 ${100 - l1WipePos}% 0 0)` }}
                      className="absolute inset-0 bg-[#070912] p-6 flex items-center justify-center transition-all"
                    >
                      {/* Dark Opaque Dust Cloud blocking the star */}
                      <div className="relative w-72 h-44 rounded-full bg-slate-950/95 blur-md border border-white/[0.05] flex items-center justify-center">
                        <span className="text-xs font-mono text-slate-500 text-center px-4">
                          {isArabic ? 'سحابة غبار بينجمي كثيفة تحجب الضوء تماماً' : 'Dense Interstellar Dust Cloud (Blocks Visible Light)'}
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-4 text-[10px] font-mono text-slate-400 bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-md">
                        λ = 0.55 µm · VISIBLE LIGHT (BLOCKED)
                      </div>
                    </div>

                    {/* Vertical Dividing Line */}
                    <div
                      style={{ left: `${l1WipePos}%` }}
                      className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] pointer-events-none"
                    />
                  </div>

                  {/* Interactive Slider Bar */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">{isArabic ? '◄ الضوء المرئي (محجوب)' : '◄ Visible Light (Blocked)'}</span>
                      <span className="text-cyan-300 font-bold">{isArabic ? 'الأشعة تحت الحمراء (نفاذ كامل) ►' : 'Infrared Penetration ►'}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={l1WipePos}
                      onChange={(e) => setL1WipePos(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Right Column: Interactive Lesson */}
                <div className="lg:col-span-5 space-y-4 text-left">
                  <div className="p-5 rounded-2xl bg-[#0b1021] border border-white/[0.08] space-y-3">
                    <h3 className="text-base font-bold text-white font-['Outfit']">
                      {isArabic ? 'لماذا ترى الأشعة تحت الحمراء ما تخفيه العيون؟' : 'Why Infrared Sees What Eyes Cannot'}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isArabic
                        ? 'حبيبات الغبار الكوني في الفضاء أصغر من الطول الموجي للأشعة تحت الحمراء. لذلك، بينما يصطدم الضوء المرئي القصير (0.55 µm) بجزيئات الغبار ويتشتت، تعبر فوتونات الأشعة تحت الحمراء الطويلة (3.05 µm) مباشرة عبر السحابة، كاشفة عن النجم الوليد وأقراص جليد الماء!'
                        : 'Cosmic dust grains scatter short visible light wavelengths (Rayleigh scattering ∝ λ⁻⁴). But long infrared waves (0.75 – 5.0 µm) pass directly through the dust, revealing forming stars and water ice rings!'}
                    </p>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-cyan-300">
                      <span>DUST SCATTERING: λ⁻⁴</span>
                      <span className="text-emerald-400">TRANSPARENT AT 3.05 µm</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Challenge 2: The 102 Colors (Fluid Wavelength Scrubber) */}
            {missionIndex === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-4">
                  {/* Dynamic Spectrum Curve Visualizer */}
                  <div className="p-6 rounded-3xl border border-white/[0.1] bg-[#080c18] shadow-2xl space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">{isArabic ? 'الطيف الترددي الكامل (0.75 – 5.0 µm)' : 'Full Spectral Range (0.75 – 5.0 µm)'}</span>
                      <span className="text-amber-300 font-bold">102 SPHEREx BANDS</span>
                    </div>

                    {/* Interactive Curve SVG */}
                    <div className="relative h-44 w-full bg-black/40 rounded-2xl p-2 border border-white/[0.05] overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                        {/* Wavelength Gradient Glow */}
                        <defs>
                          <linearGradient id="spectrumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="25%" stopColor="#818cf8" />
                            <stop offset="55%" stopColor="#a855f7" />
                            <stop offset="80%" stopColor="#ec4899" />
                            <stop offset="100%" stopColor="#f43f5e" />
                          </linearGradient>
                        </defs>

                        {/* Baseline Spectral Curve with Absorption Dips */}
                        <path
                          d="M 0 60 Q 100 50 150 70 Q 200 45 250 110 Q 280 40 330 50 Q 400 120 450 65 L 500 70"
                          fill="none"
                          stroke="url(#spectrumGrad)"
                          strokeWidth="3.5"
                        />

                        {/* Water Ice Absorption Marker (3.05 um ~ x=250) */}
                        <circle cx="250" cy="110" r="5" fill="#a855f7" />
                        <text x="255" y="130" fill="#a855f7" fontSize="10" fontFamily="monospace">
                          H2O Ice (3.05 µm)
                        </text>

                        {/* CO2 Ice Absorption Marker (4.27 um ~ x=400) */}
                        <circle cx="400" cy="120" r="5" fill="#ec4899" />
                        <text x="405" y="140" fill="#ec4899" fontSize="10" fontFamily="monospace">
                          CO2 Ice (4.27 µm)
                        </text>

                        {/* Active Scrubber Needle */}
                        {(() => {
                          const needleX = ((l1Wavelength - 0.75) / (5.0 - 0.75)) * 500;
                          return (
                            <line
                              x1={needleX}
                              y1={0}
                              x2={needleX}
                              y2={150}
                              stroke="#f59e0b"
                              strokeWidth="2"
                              strokeDasharray="4 2"
                            />
                          );
                        })()}
                      </svg>
                    </div>

                    {/* Continuous Wavelength Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono text-slate-300">
                        <span>0.75 µm</span>
                        <span className="text-amber-300 font-bold text-sm">λ = {l1Wavelength.toFixed(2)} µm</span>
                        <span>5.00 µm</span>
                      </div>
                      <input
                        type="range"
                        min={0.75}
                        max={5.0}
                        step={0.05}
                        value={l1Wavelength}
                        onChange={(e) => setL1Wavelength(parseFloat(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Diagnostic Feature Detection */}
                <div className="lg:col-span-5 space-y-4 text-left">
                  <div className="p-5 rounded-2xl bg-[#0b1021] border border-white/[0.08] space-y-3">
                    <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                      {isArabic ? 'الكشف الكيميائي الفوري' : 'ACTIVE SPECTRAL DIAGNOSTIC'}
                    </div>

                    <h3 className="text-base font-bold text-white font-['Outfit']">
                      {l1Wavelength >= 2.95 && l1Wavelength <= 3.2
                        ? isArabic ? '💧 امتصاص جليد الماء (H2O Ice)' : '💧 Water Ice (H2O) Absorption'
                        : l1Wavelength >= 4.15 && l1Wavelength <= 4.4
                        ? isArabic ? '🧊 جليد ثاني أكسيد الكربون (CO2)' : '🧊 Carbon Dioxide (CO2) Ice'
                        : l1Wavelength >= 3.25 && l1Wavelength <= 3.4
                        ? isArabic ? '✨ انبعاث الهيدروكربونات العطرية (PAH)' : '✨ Polycyclic Hydrocarbons (PAH)'
                        : isArabic ? 'رصد متصل للطاقة النجمية' : 'Stellar Continuum Flux'}
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isArabic
                        ? 'بدلاً من استخدام مرشحات ميكانيكية تدور، يستخدم تلسكوب SPHEREx مرشحات متغيرة خطياً (LVF) فوق المستشعرات الستة. هذا يقسم الضوء لـ 102 لوناً متصلاً ويكشف المركبات الباعثة على الحياة عبر الكون!'
                        : 'Instead of spinning filter wheels, SPHEREx uses Linear Variable Filters (LVF) directly deposited over the detectors. This resolves 102 continuous spectral channels, mapping biogenic ices across galaxies.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Challenge 3: Map the Universe (Orbital Cadence) */}
            {missionIndex === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-4">
                  {/* Interactive Orbital Sphere SVG */}
                  <div className="relative aspect-video rounded-3xl border border-white/[0.1] bg-[#060914] p-6 flex items-center justify-center shadow-2xl">
                    <svg className="w-full h-full" viewBox="0 0 400 240">
                      {/* Earth */}
                      <circle cx="200" cy="120" r="45" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                      <text x="200" y="125" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
                        EARTH
                      </text>

                      {/* North Ecliptic Pole (NEP) Spotlight */}
                      <circle cx="200" cy="35" r="14" fill="#f59e0b" fillOpacity="0.3" stroke="#f59e0b" strokeWidth="2" />
                      <text x="200" y="38" textAnchor="middle" fill="#fde68a" fontSize="8" fontFamily="monospace">
                        NEP POLE
                      </text>

                      {/* Satellite Terminator Orbit Path */}
                      <ellipse
                        cx="200"
                        cy="120"
                        rx="110"
                        ry="80"
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />

                      {/* Spacecraft Position */}
                      {(() => {
                        const angle = (orbitStep * Math.PI) / 3;
                        const satX = 200 + Math.cos(angle) * 110;
                        const satY = 120 + Math.sin(angle) * 80;
                        return (
                          <g transform={`translate(${satX}, ${satY})`}>
                            <circle r="7" fill="#06b6d4" />
                            <line x1="0" y1="0" x2={200 - satX} y2={35 - satY} stroke="#06b6d4" strokeWidth="1" strokeDasharray="2 2" />
                          </g>
                        );
                      })()}
                    </svg>

                    <div className="absolute bottom-4 left-4 text-[10px] font-mono text-amber-300 bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-md">
                      ORBIT: SUN-SYNCHRONOUS TERMINATOR (700 KM)
                    </div>
                  </div>

                  {/* Orbit Control Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setOrbitStep((prev) => (prev + 1) % 6)}
                      className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-mono font-bold text-white transition-colors cursor-pointer"
                    >
                      {isArabic ? 'تقدم مدار واحد (+90 دقيقة)' : 'Advance Orbit (+90 min)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOrbiting(!isOrbiting)}
                      className="px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {isOrbiting ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isOrbiting ? (isArabic ? 'إيقاف الحركة' : 'Pause Orbit') : (isArabic ? 'محاكاة مستمرة' : 'Auto Orbit')}</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Why Repeated Observations Matter */}
                <div className="lg:col-span-5 space-y-4 text-left">
                  <div className="p-5 rounded-2xl bg-[#0b1021] border border-white/[0.08] space-y-3">
                    <h3 className="text-base font-bold text-white font-['Outfit']">
                      {isArabic ? 'سر القطب الشمالي لمسار الشمس (NEP)' : 'The Secret of the North Ecliptic Pole'}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isArabic
                        ? 'يدور مرصد SPHEREx في مدار قطبي متزامن مع الشمس. كل 90 دقيقة، يعبر التلسكوب فوق القطب السماوي (NEP). هذا يعني تراكم مئات الرصدات فوق نفس البقعة، مما يتيح اكتشاف التغيرات الزمنية الخافتة بدقة متناهية!'
                        : 'SPHEREx circles Earth in a polar Sun-synchronous terminator orbit. Every 90 minutes, it crosses the Ecliptic Poles. The North Ecliptic Pole (NEP) accumulates hundreds of repeat visits, enabling deep temporal variability science!'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Challenge 4: From Light to Science (Interactive Conveyor) */}
            {missionIndex === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {EDUCATIONAL_PIPELINE_STEPS.map((s, idx) => {
                    const isStepActive = pipelineActiveStep === idx;
                    return (
                      <div
                        key={s.step}
                        onClick={() => setPipelineActiveStep(idx)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                          isStepActive
                            ? 'border-cyan-400 bg-cyan-500/15 ring-1 ring-cyan-400/40 shadow-lg'
                            : 'border-white/[0.08] bg-[#0b1021] hover:border-white/[0.2]'
                        }`}
                      >
                        <div className="text-[10px] font-mono text-cyan-400 font-bold mb-1">
                          0{s.step}. STEP
                        </div>
                        <h4 className="text-xs font-bold text-white truncate">
                          {isArabic ? s.titleAr : s.title}
                        </h4>
                      </div>
                    );
                  })}
                </div>

                {/* Active Step Details */}
                {(() => {
                  const s = EDUCATIONAL_PIPELINE_STEPS[pipelineActiveStep];
                  return (
                    <div className="p-6 rounded-3xl border border-white/[0.1] bg-[#080d1a] space-y-4 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold font-mono">
                          {s.step}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white font-['Outfit']">
                            {isArabic ? s.titleAr : s.title}
                          </h3>
                          <p className="text-xs text-cyan-300 font-mono">
                            {isArabic ? s.subtitleAr : s.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.05]">
                          <span className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">
                            {isArabic ? 'المدخلات الفيزيائية' : 'Physical Inputs'}
                          </span>
                          <p className="text-xs text-slate-200">
                            {isArabic ? s.inputDescriptionAr : s.inputDescription}
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.05]">
                          <span className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">
                            {isArabic ? 'المخرجات العلمية المعايرة' : 'Calibrated Output'}
                          </span>
                          <p className="text-xs text-slate-200">
                            {isArabic ? s.outputDescriptionAr : s.outputDescription}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* --------------------------------------------------------------------------------- */}
        {/* VIEW 3: LEVEL 1 COMPLETE MODAL */}
        {/* --------------------------------------------------------------------------------- */}
        {gameState === 'level1_complete' && (
          <div className="my-auto py-8 max-w-xl mx-auto p-8 rounded-3xl bg-[#0b1021] border border-cyan-500/40 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 border border-cyan-400/50 mx-auto flex items-center justify-center text-cyan-300">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                {isArabic ? 'إنجاز المستوى 1 مكتمل!' : 'LEVEL 1 COMPLETE!'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-['Outfit'] text-white">
                {isArabic ? 'وسام راصد المهمة المعتمد' : 'Mission Observer Badge Unlocked'}
              </h2>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                {isArabic
                  ? 'تهانينا! لقد أتقنت أسرار الأشعة تحت الحمراء، وفهمت عمل النطاقات الـ 102، ومسار المسح المداري. أنت الآن جاهز للمستوى الثاني للتحقيق فيما تغيّر!'
                  : 'Congratulations! You mastered infrared transmission, multi-band LVF spectroscopy, and orbital cadence. You are now prepared to investigate temporal transients!'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs font-mono text-amber-300">
              <span>INVESTIGATION REWARD:</span>
              <span className="font-bold">+400 XP POINTS</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setLevel(2);
                  setMissionIndex(0);
                  setGameState('playing');
                }}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs font-mono transition-all shadow-xl active:scale-95 cursor-pointer"
              >
                {isArabic ? 'الانتقال للمستوى 2: حقق فيما تغير ◄' : 'PROCEED TO LEVEL 2: FIND WHAT CHANGED ►'}
              </button>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------------------- */}
        {/* VIEW 4: LEVEL 2 — FIND WHAT CHANGED (THE CORE INVESTIGATION) */}
        {/* --------------------------------------------------------------------------------- */}
        {gameState === 'playing' && level === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header / Scenario Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                  {missionIndex === 3
                    ? isArabic ? 'المهمة الختامية: لغز الجرم المجهول' : 'FINAL MISSION: THE MYSTERY TARGET'
                    : isArabic ? `المستوى 2 · سيناريو ${scenarioIdx + 1} من ${EDUCATIONAL_SCENARIOS.length}` : `Level 2 · Scenario ${scenarioIdx + 1} of ${EDUCATIONAL_SCENARIOS.length}`}
                </span>
                <h2 className="text-lg sm:text-2xl font-bold font-['Outfit'] text-white">
                  {missionIndex === 3
                    ? 'SIM-MYSTERY-077'
                    : isArabic ? currentScenario.titleAr : currentScenario.title}
                </h2>
              </div>

              {/* Viewport Comparison Mode Selector */}
              <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setCompareMode('split')}
                  className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                    compareMode === 'split' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isArabic ? 'سحب منصف (Split)' : 'Split Swipe'}
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode('blink')}
                  className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                    compareMode === 'blink' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isArabic ? 'وميض سريع (Blink)' : 'Fast Blink'}
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode('side')}
                  className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                    compareMode === 'side' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isArabic ? 'جنباً لجنب' : 'Side-by-Side'}
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode('diff')}
                  className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                    compareMode === 'diff' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isArabic ? 'طرح السماء (D = I2 - I1)' : 'Difference (D = I2 - I1)'}
                </button>
              </div>
            </div>

            {/* Interactive Viewport & Analysis Workbench */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Interactive Astronomical Canvas (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="relative aspect-square max-w-md mx-auto rounded-3xl overflow-hidden border border-white/[0.1] bg-black shadow-2xl flex items-center justify-center p-2">
                  {/* Single Canvas for Split, Blink, Diff */}
                  {(compareMode === 'split' || compareMode === 'blink' || compareMode === 'diff') && (
                    <canvas
                      ref={canvasRef}
                      onClick={handleCanvasClick}
                      className="w-full h-full rounded-2xl block image-rendering-pixelated cursor-crosshair"
                    />
                  )}

                  {/* Side-by-Side View */}
                  {compareMode === 'side' && (
                    <div className="grid grid-cols-2 gap-2 w-full h-full">
                      <div className="relative">
                        <canvas
                          ref={canvasRefE1}
                          onClick={handleCanvasClick}
                          className="w-full h-full rounded-xl block image-rendering-pixelated cursor-crosshair"
                        />
                        <span className="absolute top-2 left-2 text-[9px] font-mono bg-black/70 px-1.5 py-0.5 rounded text-slate-300">
                          EPOCH 1
                        </span>
                      </div>
                      <div className="relative">
                        <canvas
                          ref={canvasRefE2}
                          onClick={handleCanvasClick}
                          className="w-full h-full rounded-xl block image-rendering-pixelated cursor-crosshair"
                        />
                        <span className="absolute top-2 left-2 text-[9px] font-mono bg-black/70 px-1.5 py-0.5 rounded text-amber-300">
                          EPOCH 2
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Active Probe Marker Indicator */}
                  {probeCoords && (
                    <div
                      style={{
                        left: `${(probeCoords.x / synthData.width) * 100}%`,
                        top: `${(probeCoords.y / synthData.height) * 100}%`,
                      }}
                      className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-amber-400 pointer-events-none animate-ping"
                    />
                  )}

                  {/* Canvas Viewport HUD */}
                  <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-2">
                    <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {probeCoords
                        ? `PIXEL (${probeCoords.x}, ${probeCoords.y}) · E1: ${probeCoords.val1.toFixed(1)} · E2: ${probeCoords.val2.toFixed(1)} · Δ: ${probeCoords.diffVal > 0 ? '+' : ''}${probeCoords.diffVal.toFixed(1)} MJy/sr`
                        : isArabic ? 'انقر على أي نقطة لقياس التدفق الضوئي' : 'Click any spot on canvas to probe flux'}
                    </span>
                  </div>
                </div>

                {/* Sub-tools Bar */}
                {compareMode === 'split' && (
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-400">EPOCH 1</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={splitPos}
                      onChange={(e) => setSplitPos(parseFloat(e.target.value))}
                      className="flex-1 accent-amber-400 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-amber-300">EPOCH 2</span>
                  </div>
                )}

                {compareMode === 'blink' && (
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300">
                      {isArabic ? 'التعريض النشط:' : 'Active Epoch:'}{' '}
                      <strong className={blinkEpoch === 1 ? 'text-cyan-300' : 'text-amber-300'}>
                        {blinkEpoch === 1 ? 'EPOCH 1' : 'EPOCH 2'}
                      </strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{isArabic ? 'السرعة:' : 'Speed:'}</span>
                      {[1, 2, 4].map((hz) => (
                        <button
                          key={hz}
                          type="button"
                          onClick={() => setBlinkSpeedHz(hz)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            blinkSpeedHz === hz ? 'bg-amber-500 text-black font-bold' : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {hz} Hz
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Evidence Inspection & Choices (5 cols) */}
              <div className="lg:col-span-5 space-y-4 text-left">
                {missionIndex < 3 ? (
                  // Regular Scenarios 1 to 5
                  <div className="p-5 rounded-3xl bg-[#0b1021] border border-white/[0.08] space-y-4 shadow-xl">
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                        {isArabic ? 'الأدلة الفلكية المرصودة' : 'OBSERVED ASTRONOMICAL EVIDENCE'}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {isArabic ? currentScenario.descriptionAr : currentScenario.description}
                      </p>
                    </div>

                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.05]">
                        <span className="text-[10px] text-slate-400 block">{isArabic ? 'فارق التدفق (ΔFlux)' : 'Flux Change'}</span>
                        <span className="font-bold text-amber-300">{currentScenario.deltaFlux}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.05]">
                        <span className="text-[10px] text-slate-400 block">{isArabic ? 'الأهمية (S/N)' : 'Significance'}</span>
                        <span className="font-bold text-cyan-300">{currentScenario.snr}σ</span>
                      </div>
                    </div>

                    {/* Multiple-Choice Options */}
                    <div className="space-y-2 pt-2">
                      <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                        {isArabic ? 'ما هو التفسير العلمي الصحيح؟' : 'WHAT IS YOUR SCIENTIFIC VERDICT?'}
                      </div>
                      {currentScenario.options.map((opt) => {
                        const isChosen = selectedChoiceId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleScenarioChoice(opt.id, opt.isCorrect)}
                            className={`w-full p-3 rounded-2xl text-left text-xs font-medium border transition-all cursor-pointer ${
                              isChosen
                                ? opt.isCorrect
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                  : 'bg-rose-500/20 border-rose-400 text-rose-200'
                                : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] text-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {isChosen ? (
                                opt.isCorrect ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                )
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-slate-500 flex-shrink-0 mt-0.5" />
                              )}
                              <span>{isArabic ? opt.textAr : opt.text}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Evidence Feedback Drawer */}
                    {showExplanation && (
                      <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] space-y-3 animate-in fade-in duration-150">
                        <div className="text-[10px] font-mono text-amber-300 uppercase font-bold">
                          {isArabic ? 'التحليل الفيزيائي للأدلة' : 'PHYSICAL EVIDENCE ANALYSIS'}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {isArabic
                            ? currentScenario.options.find((o) => o.id === selectedChoiceId)?.explanationAr
                            : currentScenario.options.find((o) => o.id === selectedChoiceId)?.explanation}
                        </p>

                        <button
                          type="button"
                          onClick={handleNextScenario}
                          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition-colors shadow-md cursor-pointer"
                        >
                          {scenarioIdx < EDUCATIONAL_SCENARIOS.length - 1
                            ? isArabic ? 'الحالة التالية ◄' : 'Next Scenario ►'
                            : isArabic ? 'الانتقال للتحقيق النهائي ◄' : 'Proceed to Final Mystery ►'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Final Mystery Investigation (SIM-MYSTERY-077)
                  <div className="p-5 rounded-3xl bg-[#0b1021] border border-amber-500/30 space-y-4 shadow-xl">
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                        {isArabic ? 'ملف القضية الفلكية المستقلة' : 'INDEPENDENT MYSTERY DOSSIER'}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {isArabic
                          ? 'جرم غامض رُصد في تعريضين يفصل بينهما 24 ساعة. استخدم أدوات السحب، والوميض، وطرح الصور، وقس الإحداثيات والشدة بنفسك لإصدار التقرير النهائي.'
                          : 'An unknown source detected in two epochs 24 hours apart. Use Split, Blink, and Difference tools to verify coordinates and flux before issuing your official report.'}
                      </p>
                    </div>

                    {/* Final Classification Choices */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                        {isArabic ? 'التصنيف النهائي' : 'FINAL CLASSIFICATION'}
                      </span>
                      {[
                        { id: 'asteroid', label: isArabic ? 'كويكب متحرك في النظام الشمسي (ثنائي قطب متكامل)' : 'Solar System Moving Asteroid (Balanced Dipole)' },
                        { id: 'artifact', label: isArabic ? 'عيب تسجيل / اهتزاز التوجيه (أثر نقطي)' : 'Registration / Pointing Jitter Artifact' },
                        { id: 'variable', label: isArabic ? 'نجم متغير ثابت السطوع' : 'Stationary Variable Star' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFinalVerdictCategory(item.id)}
                          className={`w-full p-2.5 rounded-xl text-left text-xs font-mono border transition-all cursor-pointer ${
                            finalVerdictCategory === item.id
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                              : 'bg-white/[0.03] border-white/[0.08] text-slate-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Checkbox Evidence Checklist */}
                    <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                        {isArabic ? 'قائمة الأدلة الإحصائية المؤكدة' : 'SUPPORTING EVIDENCE CHECKLIST'}
                      </span>
                      {[
                        { id: 'dipole', label: isArabic ? 'انعدام الجرم في الموضع المقابل (Absence verified)' : 'Source absent in opposite epoch' },
                        { id: 'speed', label: isArabic ? 'السرعة الظاهرية أقل من 4000"/يوم' : 'Apparent speed < 4,000"/day' },
                        { id: 'psf', label: isArabic ? 'تطابق المورفولوجيا مع دالة انتشار النقطة (PSF)' : 'Morphology matches telescope optical PSF' },
                      ].map((chk) => (
                        <label key={chk.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(finalEvidenceChecked[chk.id])}
                            onChange={(e) =>
                              setFinalEvidenceChecked({ ...finalEvidenceChecked, [chk.id]: e.target.checked })
                            }
                            className="accent-amber-400"
                          />
                          <span>{chk.label}</span>
                        </label>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={!finalVerdictCategory}
                      onClick={handleGenerateFinalReport}
                      className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs font-mono transition-all shadow-xl active:scale-95 cursor-pointer mt-2"
                    >
                      {isArabic ? 'اعتماد التقرير العلمي الرسمي (+300 XP)' : 'ISSUE OFFICIAL DISCOVERY REPORT (+300 XP)'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------------------- */}
        {/* VIEW 5: LEVEL 2 COMPLETE / FINAL DISCOVERY PASSPORT REPORT */}
        {/* --------------------------------------------------------------------------------- */}
        {gameState === 'level2_complete' && (
          <div className="my-auto py-8 max-w-2xl mx-auto p-8 rounded-3xl bg-[#080d1a] border border-amber-500/50 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 text-left">
            {/* Report Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
                  <BadgeCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">
                    OFFICIAL MISSION PASSPORT & DISCOVERY REPORT
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black font-['Outfit'] text-white">
                    {isArabic ? 'تقرير تحقيق المحقق الكوني المعتمد' : 'Cosmic Detective Discovery Certified'}
                  </h2>
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="text-[10px] text-slate-400 block">FINAL SCORE</span>
                <span className="text-base font-bold text-amber-300">{xp} XP</span>
              </div>
            </div>

            {/* Scientific Report Card */}
            <div className="p-5 rounded-2xl bg-black/60 border border-white/[0.06] space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-white/[0.05] pb-2">
                <span className="text-slate-400">Target Identifier:</span>
                <span className="text-white font-bold">SIM-MYSTERY-077</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.05] pb-2">
                <span className="text-slate-400">Scientific Classification:</span>
                <span className="text-cyan-300 font-bold">SOLAR SYSTEM MOVING ASTEROID</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.05] pb-2">
                <span className="text-slate-400">Astrometric Displacement:</span>
                <span className="text-white">12.8 pixels (78.7 arcsec over 24.0 hours)</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.05] pb-2">
                <span className="text-slate-400">Apparent Proper Motion:</span>
                <span className="text-emerald-400">78.7″/day (Consistent with Main Belt orbit)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Forensic Verdict Status:</span>
                <span className="text-amber-400 font-bold">VERIFIED DISCOVERY (EDUCATIONAL SIMULATION)</span>
              </div>
            </div>

            {/* Achievement Badge */}
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-bold font-mono">
                ★
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {isArabic ? 'وسام المحقق الكوني الأكبر' : 'Master Cosmic Detective Achievement Unlocked'}
                </h4>
                <p className="text-xs text-cyan-200/80">
                  {isArabic
                    ? 'أنت الآن مؤهل بالكامل للعمل على بيانات NASA/IPAC SPHEREx الحقيقية!'
                    : 'You have mastered temporal difference imaging and are ready for real NASA observations!'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => setGameState('intro')}
                className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isArabic ? 'إعادة تشغيل اللعبة' : 'Replay Missions'}</span>
              </button>

              <button
                type="button"
                onClick={() => onExitToExplore('case-nep-var-01')}
                className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs font-mono transition-all shadow-xl active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <span>{isArabic ? 'ابدأ تحليلك الفلكي الأول بالبيانات الحقيقية ◄' : 'START YOUR FIRST REAL INVESTIGATION ►'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
