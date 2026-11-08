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
  Printer,
  Copy,
  Check,
  Info,
  Trophy,
  Volume2,
  VolumeX,
  BookOpen,
  ArrowLeft,
  Filter,
} from 'lucide-react';
import {
  EDUCATIONAL_DISCLAIMER,
  EDUCATIONAL_SPECTRUM_BANDS,
  EDUCATIONAL_DETECTOR_ARRAYS,
  EDUCATIONAL_SCENARIOS,
  generateSyntheticScenarioImages,
} from './educationalData';
import { SpherexLogo } from '../components/SpherexLogo';
import { SpexPortrait, SpexExpression } from '../spex/SpexPortrait';
import { Language, translations } from '../utils/translations';
import { gameAudio } from './utils/gameAudio';
import { LeaderboardModal } from './leaderboard/LeaderboardModal';
import { EvidenceNotebook, ClueItem } from './evidence/EvidenceNotebook';

export type GameDifficulty = 'rookie' | 'investigator' | 'expert';

interface CosmicDetectiveGameProps {
  language: Language;
  onExitToExplore: (caseId?: string) => void;
  onBackToHome: () => void;
}

export const CosmicDetectiveGame: React.FC<CosmicDetectiveGameProps> = ({
  language,
  onExitToExplore,
  onBackToHome,
}) => {
  const isArabic = language === 'ar';
  const t = translations[language];

  // Game Progress & State
  const [currentMission, setCurrentMission] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('investigator');
  const [score, setScore] = useState<number>(100);
  const [cadetAlias, setCadetAlias] = useState<string>('Cadet Detective');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState<boolean>(false);

  // MISSION 1: The Invisible Sky
  const [m1WipePos, setM1WipePos] = useState<number>(50); // 0 (visible) to 100 (infrared)
  const [m1Wavelength, setM1Wavelength] = useState<number>(3.05);
  const [m1Inspected, setM1Inspected] = useState<boolean>(false);
  const m1CanvasRef = useRef<HTMLCanvasElement | null>(null);

  // MISSION 2: The 102 Signals (Hyperspectral Lab)
  const [m2ActiveBand, setM2ActiveBand] = useState<number>(4);
  const [m2FoundH2O, setM2FoundH2O] = useState<boolean>(false);
  const [m2FoundCO2, setM2FoundCO2] = useState<boolean>(false);
  const m2CanvasRef = useRef<HTMLCanvasElement | null>(null);

  // MISSION 3: The Time Machine
  const [m3CompareMode, setM3CompareMode] = useState<'slider' | 'blink'>('slider');
  const [m3SliderPos, setM3SliderPos] = useState<number>(0.5);
  const [m3BlinkEpoch, setM3BlinkEpoch] = useState<1 | 2>(1);
  const [m3BlinkSpeedHz, setM3BlinkSpeedHz] = useState<number>(2);
  const [m3IsBlinking, setM3IsBlinking] = useState<boolean>(true);
  const [m3IdentifiedChange, setM3IdentifiedChange] = useState<boolean>(false);
  const m3CanvasRef = useRef<HTMLCanvasElement | null>(null);

  // MISSION 4: The Cosmic Detective (4 Investigation Scenarios)
  const [m4ScenarioIdx, setM4ScenarioIdx] = useState<number>(0);
  const [m4UserChoice, setM4UserChoice] = useState<string | null>(null);
  const [m4ShowExplanation, setM4ShowExplanation] = useState<boolean>(false);
  const [m4CompletedScenarios, setM4CompletedScenarios] = useState<number[]>([]);
  const m4CanvasRef = useRef<HTMLCanvasElement | null>(null);

  // MISSION 5: The Final Case
  const [m5ViewMode, setM5ViewMode] = useState<'diff' | 'split' | 'blink'>('diff');
  const [m5Probe, setM5Probe] = useState<{ x: number; y: number; val1: number; val2: number; diff: number; snr: number } | null>(null);
  const [m5TargetFound, setM5TargetFound] = useState<boolean>(false);
  const [m5Verdict, setM5Verdict] = useState<string | null>(null);
  const [m5ShowCertificate, setM5ShowCertificate] = useState<boolean>(false);
  const [m5Copied, setM5Copied] = useState<boolean>(false);
  const m5CanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Clues collected for Evidence Notebook
  const [clues, setClues] = useState<ClueItem[]>([
    {
      id: 'm1_clue_infrared',
      chapter: 1,
      title: 'Infrared Transparency & Dust Extinction',
      titleAr: 'النفاذية تحت الحمراء وتلاشي تشتت الغبار',
      timestamp: 'Mission 01',
      category: 'wavelength',
      observation: 'Cosmic dust scatters short optical light (Rayleigh scattering ∝ λ⁻⁴). Infrared light (0.75–5.0 µm) pierces right through.',
      observationAr: 'الغبار الكوني يشتت الضوء المرئي القصير (تشتت رايلي يتناسب مع λ⁻⁴)، بينما تعبر الأشعة تحت الحمراء بسهولة.',
      scientificDeduction: 'Dense dark nebulae are not empty space; they hide forming stars and protoplanetary systems.',
      scientificDeductionAr: 'السحب المظلمة ليست فراغاً، بل تحجب نجوماً وليدة وأقراصاً كوكبية نشطة.',
      unlocked: false,
      confidence: 95,
    },
    {
      id: 'm2_clue_ices',
      chapter: 2,
      title: 'Cosmic Water & Carbon Dioxide Ices',
      titleAr: 'بصمة جليد الماء وثاني أكسيد الكربون الكوني',
      timestamp: 'Mission 02',
      category: 'spectroscopy',
      observation: 'Deep absorption troughs at 3.05 µm (H2O ice) and 4.27 µm (CO2 ice) captured across 102 spectral bands.',
      observationAr: 'انخفاض امتصاص عميق لجليد الماء عند 3.05 µm وجليد CO2 عند 4.27 µm تم التقاطها عبر 102 قناة طيفية.',
      scientificDeduction: 'Proves the target has a cold circumstellar disk or interstellar envelope where volatile ices condense.',
      scientificDeductionAr: 'يثبت وجود قرص كوكبي أولي بارد تتكثف فيه المركبات المتطايرة على حبيبات الغبار.',
      unlocked: false,
      confidence: 98,
    },
    {
      id: 'm3_clue_temporal',
      chapter: 3,
      title: 'Multi-Epoch Temporal Baseline',
      titleAr: 'خط الأساس الزمني متعدد الدورات',
      timestamp: 'Mission 03',
      category: 'temporal_difference',
      observation: 'Comparing observations separated by 6 months exposes sudden flux and coordinate variations.',
      observationAr: 'مقارنة رصدتين بفاصل 6 أشهر تكشف التغيرات المفاجئة في السطوع أو الموقع.',
      scientificDeduction: 'The universe is dynamic; multi-epoch subtraction isolates transients from stationary background stars.',
      scientificDeductionAr: 'السماء ديناميكية؛ وطرح الصور يعزل الأجرام المتغيرة عن مليارات النجوم الثابتة.',
      unlocked: false,
      confidence: 96,
    },
    {
      id: 'm4_clue_artifacts',
      chapter: 4,
      title: 'Astronomical Signal Discrimination',
      titleAr: 'التمييز العلمي بين الإشارات الفلكية والعيوب',
      timestamp: 'Mission 04',
      category: 'astrophysics',
      observation: 'Real astrophysical transients follow telescope Point Spread Functions (PSF); cosmic rays and hot pixels do not.',
      observationAr: 'الأجرام الفلكية تتبع دالة انتشار النقطة (PSF) للكاميرا، بينما عيوب الحساس تكون بكسلات شاذة منفردة.',
      scientificDeduction: 'Strict variance propagation and PSF checks prevent false alarms.',
      scientificDeductionAr: 'نشر التباين وفحص شكل الإشارة يمنعان الإنذارات الكاذبة.',
      unlocked: false,
      confidence: 99,
    },
    {
      id: 'm5_clue_fu_orionis',
      chapter: 5,
      title: 'FU Orionis Protostellar Accretion Outburst',
      titleAr: 'ثوران تراكمي نجمي هائل (FU Orionis)',
      timestamp: 'Mission 05',
      category: 'temporal_difference',
      observation: 'Stationary difference residual D = I2 - I1 shows +14.8σ significance (+730% flux surge).',
      observationAr: 'فارق سطوع تفاضلي ثابت بمستوى دلالة +14.8σ (+730% زيادة تدفق).',
      scientificDeduction: 'Episodic mass accretion outburst feeding the infant protostar from its icy circumstellar disk.',
      scientificDeductionAr: 'ثوران كتلوي هائل يغذي النجم الوليد من قرصه الكوكبي المتجمد.',
      unlocked: false,
      confidence: 99,
    },
  ]);

  // Blink interval timer for Mission 3
  useEffect(() => {
    if (currentMission !== 3 || m3CompareMode !== 'blink' || !m3IsBlinking) return;
    const intervalMs = 1000 / m3BlinkSpeedHz;
    const t = setInterval(() => {
      setM3BlinkEpoch((prev) => (prev === 1 ? 2 : 1));
    }, intervalMs);
    return () => clearInterval(t);
  }, [currentMission, m3CompareMode, m3IsBlinking, m3BlinkSpeedHz]);

  // Sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    gameAudio.enabled = next;
  };

  // Helper to unlock clues
  const unlockClue = (clueId: string) => {
    setClues((prev) =>
      prev.map((c) => (c.id === clueId ? { ...c, unlocked: true } : c))
    );
  };

  // -------------------------------------------------------------
  // RENDER MISSION 1: THE INVISIBLE SKY CANVAS
  // -------------------------------------------------------------
  useEffect(() => {
    if (currentMission !== 1) return;
    const canvas = m1CanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Deep space background
    const bg = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, width);
    bg.addColorStop(0, '#060a17');
    bg.addColorStop(1, '#02040a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Static background stars
    const seedStars = [
      { x: 0.15, y: 0.25, r: 1.5, b: 0.8 },
      { x: 0.85, y: 0.2, r: 2.0, b: 0.9 },
      { x: 0.2, y: 0.78, r: 1.2, b: 0.6 },
      { x: 0.75, y: 0.75, r: 1.8, b: 0.7 },
      { x: 0.35, y: 0.15, r: 1.4, b: 0.5 },
      { x: 0.65, y: 0.3, r: 1.6, b: 0.8 },
    ];
    seedStars.forEach((star) => {
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 240, 255, ${star.b})`;
      ctx.fill();
    });

    const irProgress = m1WipePos / 100;
    const cx = width / 2;
    const cy = height / 2;

    // Glowing hidden protostar emerging in infrared
    if (irProgress > 0.15) {
      const alpha = Math.min(1, (irProgress - 0.15) / 0.65);
      const glowGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 70 * irProgress);
      glowGrad.addColorStop(0, `rgba(255, 200, 100, ${alpha * 0.95})`);
      glowGrad.addColorStop(0.4, `rgba(255, 120, 40, ${alpha * 0.65})`);
      glowGrad.addColorStop(0.8, `rgba(180, 40, 120, ${alpha * 0.3})`);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 70 * irProgress, 0, Math.PI * 2);
      ctx.fill();

      // Protoplanetary water ice ring
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 45 * irProgress, 20 * irProgress, Math.PI / 6, 0, Math.PI * 2);
      ctx.stroke();

      // Core star point
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 7 + irProgress * 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dark interstellar dust cloud (thick at 0, vanishes at 100)
    const dustOpacity = Math.max(0.04, 0.92 - irProgress * 0.88);
    const dustClumps = [
      { x: cx - 25, y: cy - 10, r: 90 },
      { x: cx + 30, y: cy + 15, r: 75 },
      { x: cx - 10, y: cy + 40, r: 65 },
      { x: cx + 15, y: cy - 35, r: 80 },
    ];
    dustClumps.forEach((clump) => {
      const dustGrad = ctx.createRadialGradient(clump.x, clump.y, clump.r * 0.2, clump.x, clump.y, clump.r);
      dustGrad.addColorStop(0, `rgba(8, 12, 24, ${dustOpacity * 0.95})`);
      dustGrad.addColorStop(0.6, `rgba(14, 20, 36, ${dustOpacity * 0.8})`);
      dustGrad.addColorStop(1, 'rgba(10, 15, 30, 0)');
      ctx.fillStyle = dustGrad;
      ctx.beginPath();
      ctx.arc(clump.x, clump.y, clump.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Reticle
    if (irProgress > 0.6) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#22d3ee';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TARGET: HIDDEN PROTOSTAR', cx, cy - 38);
    }
  }, [currentMission, m1WipePos]);

  // -------------------------------------------------------------
  // RENDER MISSION 2: THE 102 SIGNALS SPECTRUM CANVAS
  // -------------------------------------------------------------
  useEffect(() => {
    if (currentMission !== 2) return;
    const canvas = m2CanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 40; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 20; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, height - 25);
    ctx.lineTo(width - 15, height - 25);
    ctx.moveTo(40, height - 25);
    ctx.lineTo(40, 15);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('Flux (mJy)', 10, 20);
    ctx.fillText('Wavelength λ (µm)', width - 110, height - 8);

    // Ticks
    [1.0, 2.0, 3.0, 4.0, 5.0].forEach((wl) => {
      const x = 40 + ((wl - 0.75) / (5.0 - 0.75)) * (width - 60);
      ctx.strokeStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(x, height - 25);
      ctx.lineTo(x, height - 20);
      ctx.stroke();
      ctx.fillText(`${wl.toFixed(1)}`, x - 8, height - 10);
    });

    // Active band highlight
    const bandRanges = [
      { start: 0.75, end: 1.11, color: 'rgba(56, 189, 248, 0.15)' },
      { start: 1.11, end: 1.64, color: 'rgba(59, 130, 246, 0.15)' },
      { start: 1.64, end: 2.42, color: 'rgba(99, 102, 241, 0.15)' },
      { start: 2.42, end: 3.82, color: 'rgba(168, 85, 247, 0.18)' },
      { start: 3.82, end: 4.42, color: 'rgba(236, 72, 153, 0.18)' },
      { start: 4.42, end: 5.00, color: 'rgba(244, 63, 94, 0.18)' },
    ];
    const curBand = bandRanges[m2ActiveBand - 1];
    if (curBand) {
      const x1 = 40 + ((curBand.start - 0.75) / (5.0 - 0.75)) * (width - 60);
      const x2 = 40 + ((curBand.end - 0.75) / (5.0 - 0.75)) * (width - 60);
      ctx.fillStyle = curBand.color;
      ctx.fillRect(x1, 15, x2 - x1, height - 40);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(x1, 15, x2 - x1, height - 40);
    }

    // Spectrum curve function with H2O at 3.05 µm and CO2 at 4.27 µm
    const getFlux = (wl: number) => {
      const base = 42 * Math.pow(wl, -1.8) * Math.exp(-0.8 / wl);
      const h2oDip = 13.5 * Math.exp(-Math.pow((wl - 3.05) / 0.22, 2));
      const co2Dip = 10.5 * Math.exp(-Math.pow((wl - 4.27) / 0.08, 2));
      return Math.max(2, base - h2oDip - co2Dip);
    };

    // Draw spectrum line
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    for (let px = 40; px < width - 15; px += 2) {
      const wl = 0.75 + ((px - 40) / (width - 60)) * (5.0 - 0.75);
      const flux = getFlux(wl);
      const py = height - 30 - (flux / 26) * (height - 60);
      if (px === 40) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Callout markers
    const drawMarker = (wl: number, label: string, color: string) => {
      const px = 40 + ((wl - 0.75) / (5.0 - 0.75)) * (width - 60);
      const flux = getFlux(wl);
      const py = height - 30 - (flux / 26) * (height - 60);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py - 6);
      ctx.lineTo(px, py - 24);
      ctx.stroke();

      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(label, px - 25, py - 28);
    };

    if (m2FoundH2O || m2ActiveBand === 4) drawMarker(3.05, 'H2O Ice (3.05 µm)', '#38bdf8');
    if (m2FoundCO2 || m2ActiveBand === 5) drawMarker(4.27, 'CO2 Ice (4.27 µm)', '#f43f5e');
  }, [currentMission, m2ActiveBand, m2FoundH2O, m2FoundCO2]);

  // -------------------------------------------------------------
  // RENDER MISSION 3: THE TIME MACHINE CANVAS
  // -------------------------------------------------------------
  useEffect(() => {
    if (currentMission !== 3) return;
    const canvas = m3CanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    const refStars = [
      { x: 80, y: 60, r: 2.2 },
      { x: 380, y: 70, r: 2.8 },
      { x: 120, y: 220, r: 1.8 },
      { x: 390, y: 230, r: 2.5 },
      { x: 230, y: 40, r: 1.5 },
    ];

    const tx = width / 2;
    const ty = height / 2;

    const drawEpoch = (epoch: 1 | 2, clipLeft: number, clipRight: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(clipLeft, 0, clipRight - clipLeft, height);
      ctx.clip();

      refStars.forEach((st) => {
        const rad = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, st.r * 3);
        rad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Target star is faint in Epoch 1 (quiescent) and exploding 8x brighter in Epoch 2!
      const targetGlow = epoch === 1 ? 10 : 45;
      const tGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, targetGlow);
      if (epoch === 1) {
        tGrad.addColorStop(0, 'rgba(255, 220, 180, 0.7)');
        tGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        tGrad.addColorStop(0, 'rgba(255, 255, 240, 1)');
        tGrad.addColorStop(0.3, 'rgba(255, 200, 80, 0.9)');
        tGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.arc(tx, ty, targetGlow, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = epoch === 1 ? '#38bdf8' : '#fbbf24';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(epoch === 1 ? 'VISIT 1: APRIL 2025' : 'VISIT 2: OCTOBER 2025 (+6 MOS)', clipLeft + 12, 24);

      ctx.restore();
    };

    if (m3CompareMode === 'slider') {
      const splitX = width * m3SliderPos;
      drawEpoch(1, 0, splitX);
      drawEpoch(2, splitX, width);

      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, height);
      ctx.stroke();

      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(splitX, height / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawEpoch(m3BlinkEpoch, 0, width);
    }
  }, [currentMission, m3CompareMode, m3SliderPos, m3BlinkEpoch]);

  // -------------------------------------------------------------
  // RENDER MISSION 4: THE COSMIC DETECTIVE SCENARIOS
  // -------------------------------------------------------------
  const currentScenario = EDUCATIONAL_SCENARIOS[m4ScenarioIdx] || EDUCATIONAL_SCENARIOS[0];

  useEffect(() => {
    if (currentMission !== 4) return;
    const canvas = m4CanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, width, height);

    // Difference image simulation for this scenario
    const imgs = generateSyntheticScenarioImages(currentScenario.id);
    const diff = imgs.diff;
    const dW = imgs.width;
    const dH = imgs.height;

    const imgData = ctx.createImageData(width, height);
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const sx = Math.floor((px / width) * dW);
        const sy = Math.floor((py / height) * dH);
        const val = diff[sy * dW + sx] || 0;

        const pIdx = (py * width + px) * 4;
        if (val > 0.05) {
          // Positive surge (red/amber)
          imgData.data[pIdx] = Math.min(255, Math.floor(val * 40));
          imgData.data[pIdx + 1] = Math.min(255, Math.floor(val * 15));
          imgData.data[pIdx + 2] = 20;
          imgData.data[pIdx + 3] = 255;
        } else if (val < -0.05) {
          // Negative deficit (cyan/blue)
          imgData.data[pIdx] = 20;
          imgData.data[pIdx + 1] = Math.min(255, Math.floor(-val * 35));
          imgData.data[pIdx + 2] = Math.min(255, Math.floor(-val * 50));
          imgData.data[pIdx + 3] = 255;
        } else {
          // Noise floor
          const noise = 15 + Math.random() * 10;
          imgData.data[pIdx] = noise;
          imgData.data[pIdx + 1] = noise;
          imgData.data[pIdx + 2] = noise + 10;
          imgData.data[pIdx + 3] = 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Scenario title banner
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`SCENARIO #${m4ScenarioIdx + 1}: ${currentScenario.title.toUpperCase()}`, 12, 22);
  }, [currentMission, m4ScenarioIdx, currentScenario]);

  // -------------------------------------------------------------
  // RENDER MISSION 5: THE FINAL CASE CANVAS
  // -------------------------------------------------------------
  useEffect(() => {
    if (currentMission !== 5) return;
    const canvas = m5CanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    // Coordinates grid
    ctx.strokeStyle = '#0e172a';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const tx = width / 2;
    const ty = height / 2;

    // Difference image mode: D = I2 - I1
    if (m5ViewMode === 'diff') {
      const diffGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, 44);
      diffGrad.addColorStop(0, '#f43f5e');
      diffGrad.addColorStop(0.4, 'rgba(244, 63, 94, 0.6)');
      diffGrad.addColorStop(0.8, 'rgba(236, 72, 153, 0.2)');
      diffGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = diffGrad;
      ctx.beginPath();
      ctx.arc(tx, ty, 44, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(tx, ty, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('DIFFERENCE: D = I2 - I1 (SNR = +14.8σ)', 14, 24);
    } else {
      // Split or blink mode
      const isEp2 = m5ViewMode === 'blink' ? true : false;
      const tGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, isEp2 ? 40 : 12);
      tGrad.addColorStop(0, '#ffffff');
      tGrad.addColorStop(0.5, '#fbbf24');
      tGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.arc(tx, ty, isEp2 ? 40 : 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reticle
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(tx, ty, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [currentMission, m5ViewMode]);

  // Handlers for Mission 1
  const handleM1Inspect = () => {
    if (m1WipePos >= 60 && !m1Inspected) {
      setM1Inspected(true);
      setScore((s) => s + (difficulty === 'expert' ? 300 : difficulty === 'investigator' ? 250 : 200));
      gameAudio.playClueUnlocked();
      unlockClue('m1_clue_infrared');
    }
  };

  // Handlers for Mission 2
  const handleM2BandClick = (band: number) => {
    setM2ActiveBand(band);
    gameAudio.playClick();
    if (band === 4 && !m2FoundH2O) {
      setM2FoundH2O(true);
      setScore((s) => s + 50);
    }
    if (band === 5 && !m2FoundCO2) {
      setM2FoundCO2(true);
      setScore((s) => s + 50);
    }
    if ((band === 4 || m2FoundH2O) && (band === 5 || m2FoundCO2)) {
      unlockClue('m2_clue_ices');
      gameAudio.playClueUnlocked();
    }
  };

  // Handlers for Mission 3
  const handleM3Identify = () => {
    if (!m3IdentifiedChange) {
      setM3IdentifiedChange(true);
      setScore((s) => s + 200);
      gameAudio.playSuccess();
      unlockClue('m3_clue_temporal');
    }
  };

  // Handlers for Mission 4
  const handleM4Answer = (choiceId: string) => {
    setM4UserChoice(choiceId);
    setM4ShowExplanation(true);
    const correct = currentScenario.options.find((c) => c.id === choiceId)?.isCorrect;
    if (correct) {
      gameAudio.playSuccess();
      if (!m4CompletedScenarios.includes(m4ScenarioIdx)) {
        setScore((s) => s + 100);
        setM4CompletedScenarios((prev) => [...prev, m4ScenarioIdx]);
      }
      unlockClue('m4_clue_artifacts');
    } else {
      gameAudio.playClick();
    }
  };

  // Handlers for Mission 5
  const handleM5CanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = m5CanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const tx = canvas.width / 2;
    const ty = canvas.height / 2;
    const dist = Math.hypot(x - tx, y - ty);

    if (dist < 40) {
      gameAudio.playClueUnlocked();
      setM5TargetFound(true);
      setM5Probe({ x: Math.round(x), y: Math.round(y), val1: 18.4, val2: 152.6, diff: 134.2, snr: 14.8 });
      unlockClue('m5_clue_fu_orionis');
      setScore((s) => s + 100);
    } else {
      gameAudio.playClick();
      setM5Probe({ x: Math.round(x), y: Math.round(y), val1: 12.1, val2: 12.3, diff: 0.2, snr: 0.2 });
    }
  };

  const handleM5SelectVerdict = (verdictId: string) => {
    setM5Verdict(verdictId);
    if (verdictId === 'fu_orionis') {
      gameAudio.playSuccess();
      setScore((s) => s + 300);
      setM5ShowCertificate(true);
    } else {
      gameAudio.playClick();
    }
  };

  const copyCertificateDossier = () => {
    const text = `SPHEREx: THE COSMIC DETECTIVE — OFFICIAL INVESTIGATION DOSSIER\nCadet Alias: ${cadetAlias}\nFinal Score: ${score} XP (${difficulty.toUpperCase()} MODE)\nClassified Event: FU Orionis Protostellar Accretion Outburst\nSignificance: +14.8σ Difference Detection\nMolecular Ice Markers: 3.05 µm H2O & 4.27 µm CO2\nCertified by: SPEX Mech Cat Guardian`;
    navigator.clipboard.writeText(text);
    setM5Copied(true);
    setTimeout(() => setM5Copied(false), 2000);
  };

  const unlockedClueCount = clues.filter((c) => c.unlocked).length;

  return (
    <div
      className="min-h-screen bg-[#050811] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* =========================================================
          TOP GAMEBAR HUD
         ========================================================= */}
      <header className="sticky top-0 z-40 bg-[#09101d]/95 backdrop-blur-md border-b border-cyan-500/20 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Back & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-white transition cursor-pointer"
              title={isArabic ? 'العودة للرئيسية' : 'Back to Home'}
            >
              <ArrowLeft className={`w-4 h-4 ${isArabic ? 'rotate-180' : ''}`} />
            </button>

            <div className="flex items-center gap-2.5">
              <SpherexLogo size={32} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-sm sm:text-base text-white tracking-wide">
                    SPEX: THE COSMIC DETECTIVE
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold hidden sm:inline-block">
                    MISSION GAME
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden xs:block">
                  {isArabic ? 'شيء ما يتغير في الكون.. هل يمكنك اكتشاف السبب؟' : 'Something is changing in the universe. Can you find out what?'}
                </p>
              </div>
            </div>
          </div>

          {/* Center: Score & Difficulty Pills */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-white font-bold">{score}</span>
              <span className="text-slate-400 text-[10px]">XP</span>
            </div>

            {/* Difficulty selector */}
            <div className="hidden sm:flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-[11px] font-mono">
              {(['rookie', 'investigator', 'expert'] as GameDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-2 py-0.5 rounded-lg capitalize transition cursor-pointer ${
                    difficulty === d ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Leaderboard button */}
            <button
              onClick={() => setIsLeaderboardOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{isArabic ? 'قائمة الشرف' : 'Leaderboard'}</span>
            </button>

            {/* Evidence Notebook */}
            <button
              onClick={() => setIsNotebookOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-cyan-950/60 hover:bg-cyan-800/60 border border-cyan-500/40 text-cyan-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">{isArabic ? 'سجل الأدلة' : 'Dossier'}</span>
              <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
                {unlockedClueCount}
              </span>
            </button>

            {/* Sound toggle */}
            <button
              onClick={toggleSound}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Toggle Audio"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================
          MANDATORY SIMULATED EDUCATIONAL DATA BANNER
         ========================================================= */}
      <div className="bg-[#0b1424] border-b border-cyan-500/20 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-cyan-200/90 font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-cyan-300">
            SIMULATED EDUCATIONAL DATA
          </span>
          <span className="text-slate-500">·</span>
          <span>{EDUCATIONAL_DISCLAIMER}</span>
        </div>

        <button
          onClick={() => onExitToExplore('case-nep-var-01')}
          className="ml-auto text-amber-400 hover:text-amber-300 font-mono text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
        >
          <span>{isArabic ? 'التبديل إلى بيانات ناسا الحقيقية (QR2)' : 'Switch to Real Data (QR2)'}</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* =========================================================
          5 MISSIONS SELECTOR TABS
         ========================================================= */}
      <div className="bg-[#070b16] border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 1, title: isArabic ? '01. الكون الخفي' : '01. Invisible Sky', desc: 'Infrared & Dust' },
            { id: 2, title: isArabic ? '02. الـ102 إشارة' : '02. 102 Signals', desc: 'Hyperspectral Ices' },
            { id: 3, title: isArabic ? '03. آلة الزمن' : '03. Time Machine', desc: 'Multi-Epoch Compare' },
            { id: 4, title: isArabic ? '04. المحقق الكوني' : '04. Signal Classifier', desc: 'Real vs Artifact' },
            { id: 5, title: isArabic ? '05. القضية الكبرى' : '05. The Final Case', desc: 'Forensic Verdict' },
          ].map((m) => {
            const isActive = currentMission === m.id;
            const isDone = clues[m.id - 1]?.unlocked;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setCurrentMission(m.id as any);
                  gameAudio.playClick();
                }}
                className={`flex-1 min-w-[140px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/15 border-amber-500/60 shadow-md shadow-amber-950/40 text-white'
                    : isDone
                    ? 'bg-slate-900/60 border-emerald-500/30 text-emerald-300 hover:border-emerald-500/60'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-xs">{m.title}</span>
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">{m.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================
          MISSION WORKSPACE
         ========================================================= */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* MISSION 1: THE INVISIBLE SKY */}
        {currentMission === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-5 rounded-2xl bg-[#09101d] border border-cyan-500/30 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                    MISSION 01 • PRIMARY OBJECTIVE
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    {isArabic ? 'الكون الخفي: لماذا نرى بالأشعة تحت الحمراء ما تعجز عنه العيون؟' : 'The Invisible Sky: See Beyond Visible Light'}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setCurrentMission(2);
                    gameAudio.playClick();
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>{isArabic ? 'المهمة التالية' : 'Next Mission'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Viewport canvas */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black flex justify-center items-center shadow-inner">
                <canvas
                  ref={m1CanvasRef}
                  width={600}
                  height={320}
                  className="w-full max-w-[600px] h-auto aspect-[15/8] block cursor-crosshair"
                  onClick={handleM1Inspect}
                />

                {m1WipePos >= 60 && !m1Inspected && (
                  <button
                    onClick={handleM1Inspect}
                    className="absolute bottom-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg animate-bounce flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isArabic ? 'انقر على النجم المتوهج لجمع الدليل (+250 XP)!' : 'Click the glowing protostar to secure clue (+250 XP)!'}</span>
                  </button>
                )}
              </div>

              {/* Slider & Physics explanation */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">◄ Visible Light (Blocked by Dust)</span>
                  <span className="text-cyan-300 font-bold">
                    Wavelength: {(0.55 + (m1WipePos / 100) * 3.45).toFixed(2)} µm
                  </span>
                  <span className="text-amber-400 font-bold">Infrared Penetration ►</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={m1WipePos}
                  onChange={(e) => {
                    setM1WipePos(Number(e.target.value));
                    gameAudio.playClick();
                  }}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />

                <div className="pt-2 border-t border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p>
                    {isArabic
                      ? 'حبيبات الغبار الكوني تشتت الأطوال الموجية المرئية القصيرة (تشتت رايلي يتناسب مع λ⁻⁴). أما فوتونات الأشعة تحت الحمراء الأطول (0.75 - 5.0 ميكرومتر) فتخترق السحب المظلمة بسهولة لتكشف ولادة النجوم وأنظمة الكواكب.'
                      : 'Cosmic dust grains scatter short visible light via Rayleigh scattering (proportional to λ⁻⁴). Longer infrared photons (0.75 – 5.0 µm) glide right through the dust grains without scattering, exposing forming stars and water ice rings!'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MISSION 2: THE 102 SIGNALS */}
        {currentMission === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-5 rounded-2xl bg-[#09101d] border border-purple-500/30 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest">
                    MISSION 02 • HYPERSPECTRAL INVESTIGATION
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    {isArabic ? 'الـ102 إشارة: بصمة جليد الماء وثاني أكسيد الكربون' : 'The 102 Signals: Reconstruct Molecular Ice Bands'}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setCurrentMission(3);
                    gameAudio.playClick();
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>{isArabic ? 'المهمة التالية' : 'Next Mission'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Spectrum canvas */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 shadow-inner">
                <canvas ref={m2CanvasRef} width={620} height={260} className="w-full h-auto aspect-[31/13] block" />
              </div>

              {/* 6 Band Selectors */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Select Linear Variable Filter (LVF) Array:</span>
                  <span className="text-purple-300 font-bold">Active: Band {m2ActiveBand}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {EDUCATIONAL_DETECTOR_ARRAYS.map((arr, idx) => {
                    const bandNum = idx + 1;
                    const isSelected = m2ActiveBand === bandNum;
                    const hasKey = (bandNum === 4 && m2FoundH2O) || (bandNum === 5 && m2FoundCO2);
                    return (
                      <button
                        key={arr.array}
                        onClick={() => handleM2BandClick(bandNum)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-950/80 border-purple-400 text-white ring-1 ring-purple-400'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">Band {bandNum}</span>
                          {hasKey && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{arr.wavelengthRange}</div>
                        <div className="text-[9px] text-purple-300/80 mt-1">{arr.channels} Channels</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
                <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-0.5">
                    {m2ActiveBand === 4
                      ? 'Band 4 (2.42–3.82 µm): H2O Water Ice Signature Detected at 3.05 µm!'
                      : m2ActiveBand === 5
                      ? 'Band 5 (3.82–4.42 µm): CO2 Carbon Dioxide Ice Resonant Dip Confirmed at 4.27 µm!'
                      : `Band ${m2ActiveBand} (${EDUCATIONAL_DETECTOR_ARRAYS[m2ActiveBand - 1]?.wavelengthRange}): Continuum emission. Check Bands 4 & 5!`}
                  </span>
                  <p className="text-slate-400">
                    SPHEREx records 102 continuous spectral channels across all six arrays, allowing investigators to distinguish chemical compositions from pure thermal continuum.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MISSION 3: THE TIME MACHINE */}
        {currentMission === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-5 rounded-2xl bg-[#09101d] border border-cyan-500/30 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                    MISSION 03 • MULTI-EPOCH COMPARISON
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    {isArabic ? 'آلة الزمن: مقارنة الرصدات عبر فاصل 6 أشهر' : 'The Time Machine: Compare Across Time'}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setCurrentMission(4);
                    gameAudio.playClick();
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>{isArabic ? 'المهمة التالية' : 'Next Mission'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mode toggles */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setM3CompareMode('slider')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    m3CompareMode === 'slider' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  Before/After Wipe Slider
                </button>
                <button
                  onClick={() => setM3CompareMode('blink')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    m3CompareMode === 'blink' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  Cadence Blink
                </button>
              </div>

              {/* Canvas */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black flex justify-center shadow-inner">
                <canvas ref={m3CanvasRef} width={560} height={300} className="w-full max-w-[560px] h-auto aspect-[14/7.5] block" />
              </div>

              {/* Slider control */}
              {m3CompareMode === 'slider' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>Visit 1 (Month 0)</span>
                    <span>Visit 2 (Month +6)</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.01"
                    value={m3SliderPos}
                    onChange={(e) => setM3SliderPos(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-2 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
              )}

              {/* Identify change action */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-300">
                  {m3IdentifiedChange
                    ? 'Target identified! The central star surged in brightness while reference stars stayed constant.'
                    : 'Notice how the central star explodes in brightness between April and October?'}
                </span>
                {!m3IdentifiedChange && (
                  <button
                    onClick={handleM3Identify}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    Confirm Change (+200 XP)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MISSION 4: THE COSMIC DETECTIVE (SCENARIOS) */}
        {currentMission === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-5 rounded-2xl bg-[#09101d] border border-amber-500/30 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">
                    MISSION 04 • EVIDENCE CLASSIFICATION
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    {isArabic ? 'المحقق الكوني: التمييز بين التغيرات الحقيقية والعيوب' : 'Signal Classifier: Distinguish Real from Glitch'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">
                    Scenario {m4ScenarioIdx + 1}/5
                  </span>
                  <button
                    onClick={() => {
                      if (m4ScenarioIdx < 4) {
                        setM4ScenarioIdx(m4ScenarioIdx + 1);
                        setM4UserChoice(null);
                        setM4ShowExplanation(false);
                      } else {
                        setCurrentMission(5);
                      }
                      gameAudio.playClick();
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    {m4ScenarioIdx < 4 ? 'Next Scenario' : 'Proceed to Final Case'}
                  </button>
                </div>
              </div>

              {/* Canvas viewport for scenario */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black flex justify-center shadow-inner">
                <canvas ref={m4CanvasRef} width={520} height={280} className="w-full max-w-[520px] h-auto aspect-[13/7] block" />
              </div>

              {/* Scenario Description */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <h3 className="font-bold text-white text-sm">{isArabic ? currentScenario.titleAr : currentScenario.title}</h3>
                <p className="text-slate-300 leading-relaxed">{isArabic ? currentScenario.descriptionAr : currentScenario.description}</p>
                <div className="flex gap-4 font-mono text-[11px] text-amber-400 pt-1 border-t border-slate-800/80">
                  <span>Baseline: {currentScenario.epoch1Date}</span>
                  <span>Followup: {currentScenario.epoch2Date}</span>
                  <span>SNR: {currentScenario.snr}σ</span>
                </div>
              </div>

              {/* Multiple Choice Options */}
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-mono block">Classify this candidate signal:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentScenario.options.map((choice) => {
                    const isSelected = m4UserChoice === choice.id;
                    const isCorrect = choice.isCorrect;
                    return (
                      <button
                        key={choice.id}
                        disabled={m4ShowExplanation}
                        onClick={() => handleM4Answer(choice.id)}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? isCorrect
                              ? 'bg-emerald-950/70 border-emerald-400 text-white ring-1 ring-emerald-400'
                              : 'bg-rose-950/70 border-rose-400 text-white'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-xs mb-1">
                          <span>{isArabic ? choice.textAr : choice.text}</span>
                          {isSelected && isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400">{isArabic ? choice.explanationAr : choice.explanation}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feedback debrief */}
              {m4ShowExplanation && (
                <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/40 text-xs space-y-2 animate-fade-in">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Scientific Debrief & Explanation:</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">
                    {currentScenario.options.find((o) => o.id === m4UserChoice)?.explanation || currentScenario.options.find((o) => o.isCorrect)?.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MISSION 5: THE FINAL CASE */}
        {currentMission === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-5 rounded-2xl bg-[#09101d] border border-cyan-500/30 shadow-2xl space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                    MISSION 05 • THE FINAL CASE
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    {isArabic ? 'القضية الكبرى: فحص الأدلة وإصدار التقرير النهائي' : 'The Final Case: Full Forensic Investigation'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setM5ViewMode('diff')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      m5ViewMode === 'diff' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    Difference (D = I2 - I1)
                  </button>
                  <button
                    onClick={() => setM5ViewMode('split')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      m5ViewMode === 'split' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    Split View
                  </button>
                </div>
              </div>

              {/* Viewport Canvas */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black flex justify-center shadow-inner cursor-crosshair">
                <canvas
                  ref={m5CanvasRef}
                  width={560}
                  height={300}
                  onClick={handleM5CanvasClick}
                  className="w-full max-w-[560px] h-auto aspect-[14/7.5] block"
                />
              </div>

              {/* Pixel Probe Readout */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-400">Forensic Pixel Probe:</span>
                  {m5Probe ? (
                    <span className="text-cyan-300 font-bold">X: {m5Probe.x}, Y: {m5Probe.y}</span>
                  ) : (
                    <span className="text-slate-500 italic">Click target on image to measure flux</span>
                  )}
                </div>

                {m5Probe && (
                  <div className="flex items-center gap-4 text-slate-300">
                    <div>Epoch 1: <span className="text-white font-bold">{m5Probe.val1} mJy</span></div>
                    <div>Epoch 2: <span className="text-amber-300 font-bold">{m5Probe.val2} mJy</span></div>
                    <div>ΔI: <span className="text-rose-400 font-bold">+{m5Probe.diff} mJy</span></div>
                    <div className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                      SNR: +{m5Probe.snr}σ
                    </div>
                  </div>
                )}
              </div>

              {/* Verdict Choice */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-white text-sm">
                  {isArabic ? 'ما هو التشخيص العلمي النهائي لهذا الجرم؟' : 'Deliver Forensic Diagnosis:'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleM5SelectVerdict('cosmic_ray')}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                      m5Verdict === 'cosmic_ray' ? 'bg-rose-950 border-rose-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-white mb-1">Cosmic Ray Glitch</div>
                    <p className="text-[11px] text-slate-400">Single-pixel ionization without telescope PSF.</p>
                  </button>

                  <button
                    onClick={() => handleM5SelectVerdict('asteroid')}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                      m5Verdict === 'asteroid' ? 'bg-rose-950 border-rose-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-white mb-1">Moving Asteroid</div>
                    <p className="text-[11px] text-slate-400">Leaves positive/negative dipole from orbital motion.</p>
                  </button>

                  <button
                    onClick={() => handleM5SelectVerdict('fu_orionis')}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                      m5Verdict === 'fu_orionis' ? 'bg-emerald-950 border-emerald-400 text-white ring-1 ring-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-white mb-1 flex items-center justify-between">
                      <span>FU Orionis Outburst</span>
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-[11px] text-slate-300">Stationary +14.8σ surge inside icy circumstellar disk.</p>
                  </button>
                </div>
              </div>

              {/* Official Certificate display */}
              {m5ShowCertificate && (
                <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0e1629] via-[#09101d] to-[#060a12] border-2 border-cyan-400/40 shadow-2xl space-y-5 animate-fade-in">
                  <div className="text-center space-y-1.5 border-b border-cyan-500/20 pb-4">
                    <div className="flex justify-center mb-1">
                      <SpherexLogo size={44} />
                    </div>
                    <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400">
                      NASA SPACE APPS CHALLENGE 2026 • SPHEREx MISSION
                    </span>
                    <h3 className="text-2xl font-serif font-bold text-white">
                      {isArabic ? 'شهادة المحقق الفلكي الكوني الرسمية' : 'Official Cosmic Detective Certificate'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Awarded to <span className="font-bold text-cyan-300">{cadetAlias}</span> for forensic mastery in decoding infrared transients across 102 spectral bands.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] font-mono text-cyan-400">FINAL SCORE</div>
                      <div className="text-lg font-bold text-white font-mono">{score} XP</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] font-mono text-purple-400">DETECTED ICES</div>
                      <div className="text-sm font-bold text-white">3.05 µm H2O & 4.27 µm CO2</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] font-mono text-amber-400">SIGNIFICANCE</div>
                      <div className="text-sm font-bold text-white">+14.8σ Stationary PSF</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-amber-500/40 shrink-0 flex items-center justify-center">
                      <SpexPortrait mood="proud" size={56} />
                    </div>
                    <div className="text-xs text-slate-300">
                      <div className="font-bold text-cyan-300 mb-0.5">Endorsed by SPEX Mech Cat Guardian</div>
                      <p className="italic font-serif">
                        "Outstanding scientific diligence! You have proved the sky is never quiet. You are now fully cleared to explore authentic NASA flight data!"
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyCertificateDossier}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {m5Copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{m5Copied ? 'Copied to Clipboard' : 'Copy Dossier'}</span>
                      </button>

                      <button
                        onClick={() => window.print()}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </div>

                    <button
                      onClick={() => onExitToExplore('case-nep-var-01')}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 hover:from-cyan-500 hover:to-blue-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-950/50 flex items-center gap-2 transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Launch Real NASA Archive Explorer</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* =========================================================
          LEADERBOARD & EVIDENCE MODALS
         ========================================================= */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        language={language}
        currentScore={score}
        currentAlias={cadetAlias}
        onUpdateAlias={(alias) => setCadetAlias(alias)}
      />

      <EvidenceNotebook
        isOpen={isNotebookOpen}
        onClose={() => setIsNotebookOpen(false)}
        language={language}
        clues={clues}
        cadetName={cadetAlias}
      />
    </div>
  );
};
