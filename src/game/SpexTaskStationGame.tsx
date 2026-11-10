import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  ArrowLeft,
  Volume2,
  VolumeX,
  Compass,
  CheckCircle2,
  Layers,
  Clock,
  Filter,
  ShieldAlert,
  Search,
  Sliders,
  ChevronRight,
  Download,
  Share2,
  AlertTriangle,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { Language, translations } from '../utils/translations';
import { gameAudio } from './utils/gameAudio';
import { SPEX_HERO_IMAGE, SPEX_ASSETS } from '../spex/spexAssets';
import { Button } from '../design/components/Button';
import { Badge } from '../design/components/Badge';

export interface SpexTaskStationGameProps {
  language: Language;
  onExitToExplore: (caseId?: string) => void;
  onBackToHome: () => void;
}

type StationRoomId =
  | 'comparator'
  | 'cleaning'
  | 'color'
  | 'stacking'
  | 'time'
  | 'id_matching'
  | 'review';

interface StationRoom {
  id: StationRoomId;
  nameEn: string;
  nameAr: string;
  taskTitleEn: string;
  taskTitleAr: string;
  x: number; // Hub percentage coords (0-100)
  y: number;
  color: 'amber' | 'cyan' | 'rose' | 'emerald' | 'purple';
  icon: string;
}

const STATIONS: StationRoom[] = [
  {
    id: 'comparator',
    nameEn: 'Comparator Station',
    nameAr: 'محطة المقارنة والوميض',
    taskTitleEn: 'Spot the Mover',
    taskTitleAr: 'اكتشف النقطة المتحركة',
    x: 50,
    y: 18,
    color: 'amber',
    icon: 'search',
  },
  {
    id: 'cleaning',
    nameEn: 'DQ Cleaning Lab',
    nameAr: 'مختبر تنظيف الكاشف',
    taskTitleEn: 'Clean the Noise',
    taskTitleAr: 'نقّ الكاشف من البكسلات المشوشة',
    x: 82,
    y: 35,
    color: 'rose',
    icon: 'zap',
  },
  {
    id: 'color',
    nameEn: 'Spectral Color Chamber',
    nameAr: 'غرفة الألوان الطيفية',
    taskTitleEn: 'Tune the 102 Filters',
    taskTitleAr: 'اضبط القنوات الـ 102',
    x: 82,
    y: 68,
    color: 'cyan',
    icon: 'filter',
  },
  {
    id: 'stacking',
    nameEn: 'Signal Stacking Array',
    nameAr: 'مصفوفة دمج اللقطات',
    taskTitleEn: 'Stack the Frames',
    taskTitleAr: 'ادمج اللقطات لكشف الإشارة',
    x: 50,
    y: 84,
    color: 'emerald',
    icon: 'layers',
  },
  {
    id: 'time',
    nameEn: 'Cadence Time Vault',
    nameAr: 'قبو الأزمنة والمسارات',
    taskTitleEn: 'Order the Snapshots',
    taskTitleAr: 'رتب اللقطات زمنياً',
    x: 18,
    y: 68,
    color: 'purple',
    icon: 'clock',
  },
  {
    id: 'id_matching',
    nameEn: 'Catalog ID Registry',
    nameAr: 'سجل مطابقة الفهارس',
    taskTitleEn: 'Match the ID Card',
    taskTitleAr: 'طابق بطاقة الهوية الكونية',
    x: 18,
    y: 35,
    color: 'cyan',
    icon: 'id',
  },
];

export const SpexTaskStationGame: React.FC<SpexTaskStationGameProps> = ({
  language,
  onExitToExplore,
  onBackToHome,
}) => {
  const isAr = language === 'ar';
  const t = translations[language];

  // Game Progress State
  const [completedTasks, setCompletedTasks] = useState<Record<StationRoomId, boolean>>({
    comparator: false,
    cleaning: false,
    color: false,
    stacking: false,
    time: false,
    id_matching: false,
    review: false,
  });

  const [activeStation, setActiveStation] = useState<StationRoomId | null>(null);
  const [showRealCard, setShowRealCard] = useState<StationRoomId | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [reviewSolved, setReviewSolved] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);

  // Player position in Station Hub (0 to 100 coordinates)
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [playerPose, setPlayerPose] = useState<'idle' | 'walking' | 'thinking' | 'celebrate'>('idle');

  // Mini-Game 1: Comparator State
  const [comparatorFrame, setComparatorFrame] = useState<1 | 2>(1);
  const [comparatorFound, setComparatorFound] = useState<boolean>(false);

  // Mini-Game 2: DQ Cleaning State (6 glitch spots)
  const [glitchesCleaned, setGlitchesCleaned] = useState<number[]>([1, 0, 0, 1, 0, 1]); // 1 = glitch present

  // Mini-Game 3: Spectral Tuning State (Channel 1 to 102)
  const [spectralChannel, setSpectralChannel] = useState<number>(15);
  const TARGET_SPECTRAL_CHANNEL = 58; // 3.05 µm water ice absorption

  // Mini-Game 4: Frame Stacking State (0 to 6 frames)
  const [stackedFramesCount, setStackedFramesCount] = useState<number>(1);

  // Mini-Game 5: Time Sorting State
  const [timeOrder, setTimeOrder] = useState<number[]>([2, 0, 1]); // user order of cards [0, 1, 2]

  // Mini-Game 6: ID Matching State
  const [selectedIdOption, setSelectedIdOption] = useState<number | null>(null);

  // Review Scene: Suspect selection
  const [selectedSuspect, setSelectedSuspect] = useState<number | null>(null);
  const [reviewReason, setReviewReason] = useState<string>('');

  const completedCount = Object.entries(completedTasks).filter(([k, v]) => k !== 'review' && v).length;
  const progressPercent = Math.round((completedCount / 6) * 100);

  // Blink interval for Comparator
  useEffect(() => {
    if (activeStation !== 'comparator' || comparatorFound) return;
    const interval = setInterval(() => {
      setComparatorFrame((prev) => (prev === 1 ? 2 : 1));
    }, 450);
    return () => clearInterval(interval);
  }, [activeStation, comparatorFound]);

  // Audio mute toggle
  const toggleAudio = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    gameAudio.setMuted(next);
  };

  // Keyboard navigation for player in Hub
  useEffect(() => {
    if (activeStation !== null || showReviewModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 4;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dy -= step;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dy += step;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dx -= step;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dx += step;

      if (dx !== 0 || dy !== 0) {
        setPlayerPose('walking');
        setPlayerPos((prev) => ({
          x: Math.max(12, Math.min(88, prev.x + dx)),
          y: Math.max(14, Math.min(86, prev.y + dy)),
        }));
      }

      // E or Space to interact with nearest station
      if (e.key === 'e' || e.key === 'E' || e.key === ' ') {
        STATIONS.forEach((station) => {
          const dist = Math.hypot(playerPos.x - station.x, playerPos.y - station.y);
          if (dist < 14) {
            handleOpenStation(station.id);
          }
        });
        const hubDist = Math.hypot(playerPos.x - 50, playerPos.y - 50);
        if (hubDist < 12 && completedCount >= 6) {
          setShowReviewModal(true);
        }
      }
    };

    const handleKeyUp = () => {
      setPlayerPose('idle');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeStation, showReviewModal, playerPos, completedCount]);

  // Open Station
  const handleOpenStation = (id: StationRoomId) => {
    gameAudio.playClick();
    setActiveStation(id);
    const station = STATIONS.find((s) => s.id === id);
    if (station) {
      setPlayerPos({ x: station.x, y: station.y });
    }
  };

  // Complete a task
  const handleCompleteTask = (id: StationRoomId) => {
    gameAudio.playSuccess();
    setCompletedTasks((prev) => ({ ...prev, [id]: true }));
    setShowRealCard(id);
    setPlayerPose('celebrate');
    setTimeout(() => setPlayerPose('idle'), 2000);
  };

  // "What you did for real" scientific texts (<20 words each)
  const REAL_CARD_EXPLANATIONS: Record<StationRoomId, { en: string; ar: string }> = {
    comparator: {
      en: 'You compared multi-epoch exposures to detect proper motion, exactly how SPHEREx finds cold brown dwarfs.',
      ar: 'قارنت لقطات متعددة لرصد حركة الأجرام، تماماً كما يرصد SPHEREx الأقزام البنية الباردة.',
    },
    cleaning: {
      en: 'You applied the SPHEREx Data Quality bitmask to purge single-frame cosmic rays and detector glitches.',
      ar: 'طبقت قناع جودة البيانات (DQ) لاستبعاد الأشعة الكونية والشوائب الآلية من الكاشف.',
    },
    color: {
      en: "You scanned 102 spectroscopic bands to pinpoint molecular water-ice absorption dips in deep space.",
      ar: 'مسحت 102 قناة طيفية لتحديد انخفاضات امتصاص جليد الماء الجزيئي في أعماق الفضاء.',
    },
    stacking: {
      en: 'You co-added multiple exposures to boost Signal-to-Noise by √N, revealing ultra-faint hidden sources.',
      ar: 'دمجت لقطات متعددة لمضاعفة نسبة الإشارة للضجيج بمقدار √N، كاشفاً مصادر خافتة للغاية.',
    },
    time: {
      en: 'You organized observation cadences to distinguish minutes-apart slew passes from true months-long astrophysical variability.',
      ar: 'رتبت الفترات الزمنية للتمييز بين التمريرات السريعة والتغير الفلكي الحقيقي عبر الأشهر.',
    },
    id_matching: {
      en: 'You cross-matched with Gaia and WISE catalogs to rule out known stars and isolate new candidates.',
      ar: 'طابقت الإحداثيات مع فهارس Gaia و WISE لاستبعاد النجوم المعروفة وعزل الاكتشافات الجديدة.',
    },
    review: {
      en: 'You successfully defended scientific integrity by rejecting false alarms and verifying a true celestial mover.',
      ar: 'دافعت بنجاح عن النزاهة العلمية برفض الإنذارات الكاذبة وتأكيد الجرم الفلكي الحقيقي.',
    },
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 select-none" dir={isAr ? 'rtl' : 'ltr'}>
      {/* =========================================================================
          TOP BAR: Station Control, Progress, Audio, Exit
         ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-[#070C18] p-3 sm:p-4 rounded-2xl border border-obs-border-highlight shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono transition border border-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isAr ? 'الرئيسية' : 'Home'}</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-obs-cyan animate-pulse" />
            <h1 className="text-sm sm:text-base font-serif font-bold text-white tracking-wide">
              {isAr ? 'محطة أبحاث SPHEREx — تحقيق السماء المتغيرة' : 'SPHEREx Research Station — The Changing Sky'}
            </h1>
          </div>
        </div>

        {/* Global Investigation Progress */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400">{isAr ? 'تقدم التحقيق:' : 'Investigation:'}</span>
              <span className="text-obs-amber font-bold">{progressPercent}%</span>
              <span className="text-slate-500">({completedCount}/6 {isAr ? 'محطات' : 'Stations'})</span>
            </div>
            {/* Progress Bar */}
            <div className="w-32 sm:w-44 h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-obs-amber via-obs-cyan to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleAudio}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              soundMuted
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-slate-900 border-slate-700 text-obs-cyan hover:bg-slate-800'
            }`}
            title={soundMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Open Real SPHEREx Lab Button */}
          <Button
            variant="cyan"
            size="sm"
            icon={<Compass className="w-3.5 h-3.5" />}
            onClick={() => onExitToExplore()}
          >
            {isAr ? 'المرصد الحقيقي' : 'Real Lab'}
          </Button>
        </div>
      </div>

      {/* =========================================================================
          MAIN INTERACTIVE 2D STATION HUB (Floor Plan & Navigation)
         ========================================================================= */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[620px] rounded-3xl bg-[#02040A] border-2 border-obs-border-highlight overflow-hidden shadow-2xl">
        {/* Floor grid detector motif */}
        <div className="absolute inset-0 detector-grid opacity-35 pointer-events-none" />

        {/* Ambient colored lighting pools under each station */}
        {STATIONS.map((station) => (
          <div
            key={`light-${station.id}`}
            style={{
              left: `${station.x}%`,
              top: `${station.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`absolute w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-25 ${
              station.color === 'amber'
                ? 'bg-obs-amber'
                : station.color === 'cyan'
                ? 'bg-obs-cyan'
                : station.color === 'rose'
                ? 'bg-obs-rose'
                : station.color === 'emerald'
                ? 'bg-emerald-500'
                : 'bg-purple-500'
            }`}
          />
        ))}

        {/* Hub Center Ambient Glow */}
        <div
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          className="absolute w-44 h-44 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none"
        />

        {/* Neon Room Divider Lines on Floor */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-white/10" strokeWidth="1.5">
          {/* Circular central hub perimeter */}
          <circle cx="50%" cy="50%" r="14%" fill="none" stroke="rgba(0, 229, 255, 0.2)" strokeDasharray="4 4" />
          {/* Radial corridors connecting to stations */}
          {STATIONS.map((st) => (
            <line
              key={`corridor-${st.id}`}
              x1="50%"
              y1="50%"
              x2={`${st.x}%`}
              y2={`${st.y}%`}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeDasharray="2 3"
            />
          ))}
        </svg>

        {/* Central Investigation Briefing Console (Unlocks Review Scene) */}
        <div
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          onClick={() => {
            if (completedCount >= 6) {
              gameAudio.playClueUnlocked();
              setShowReviewModal(true);
            }
          }}
          className={`absolute z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex flex-col items-center justify-center p-2 text-center transition-all duration-300 border backdrop-blur-md cursor-pointer ${
            completedCount >= 6
              ? 'bg-amber-500/20 border-obs-amber shadow-[0_0_25px_rgba(245,166,35,0.4)] scale-105 animate-pulse'
              : 'bg-slate-950/80 border-white/10 hover:border-white/20'
          }`}
        >
          <Sparkles
            className={`w-6 h-6 mb-1 ${completedCount >= 6 ? 'text-obs-amber' : 'text-slate-500'}`}
          />
          <span className="font-mono text-[10px] font-bold text-white tracking-wider uppercase">
            {isAr ? 'قضية التحقيق' : 'Case Review'}
          </span>
          <span className="text-[9px] font-mono text-slate-400 mt-0.5">
            {completedCount >= 6
              ? (isAr ? 'جاهز للحكم!' : 'Ready to Solve!')
              : `${completedCount}/6 ${isAr ? 'مكتمل' : 'Done'}`}
          </span>
        </div>

        {/* 6 Peripheral Task Stations */}
        {STATIONS.map((station) => {
          const isDone = completedTasks[station.id];
          const distToPlayer = Math.hypot(playerPos.x - station.x, playerPos.y - station.y);
          const isNear = distToPlayer < 14;

          return (
            <div
              key={station.id}
              style={{
                left: `${station.x}%`,
                top: `${station.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => handleOpenStation(station.id)}
              className="absolute z-10 flex flex-col items-center group cursor-pointer"
            >
              {/* Station Console Box */}
              <div
                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center p-2 border transition-all duration-200 backdrop-blur-md ${
                  isDone
                    ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : isNear
                    ? 'bg-[#0E1528] border-obs-amber shadow-[0_0_20px_rgba(245,166,35,0.3)] scale-110'
                    : 'bg-[#070C18]/90 border-white/15 hover:border-white/30 hover:scale-105'
                }`}
              >
                {/* Station Status Ring */}
                {isDone ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-0.5" />
                ) : (
                  <div
                    className={`w-3 h-3 rounded-full mb-1 ${
                      station.color === 'amber'
                        ? 'bg-obs-amber'
                        : station.color === 'cyan'
                        ? 'bg-obs-cyan'
                        : station.color === 'rose'
                        ? 'bg-obs-rose'
                        : station.color === 'emerald'
                        ? 'bg-emerald-400'
                        : 'bg-purple-400'
                    }`}
                  />
                )}

                <span className="font-mono text-[9px] sm:text-[10px] font-bold text-white text-center leading-tight">
                  {isAr ? station.taskTitleAr : station.taskTitleEn}
                </span>

                {/* Proximity Interaction Prompt [E] */}
                {isNear && !isDone && (
                  <div className="absolute -top-7 px-2 py-0.5 rounded bg-obs-amber text-slate-950 font-mono text-[9px] font-bold shadow-md animate-bounce">
                    [E] {isAr ? 'تفاعل' : 'Open'}
                  </div>
                )}
              </div>

              {/* Station Room Label */}
              <span className="mt-1 text-[9px] font-mono text-slate-400 text-center tracking-wider max-w-[100px] truncate">
                {isAr ? station.nameAr : station.nameEn}
              </span>
            </div>
          );
        })}

        {/* Player Avatar (Cat-headed SPEX Guide) */}
        <div
          style={{
            left: `${playerPos.x}%`,
            top: `${playerPos.y}%`,
            transform: 'translate(-50%, -50%)',
            transition: 'left 0.15s ease-out, top 0.15s ease-out',
          }}
          className="absolute z-20 pointer-events-none flex flex-col items-center"
        >
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-500/20 border-2 border-obs-amber shadow-[0_0_20px_rgba(245,166,35,0.6)] flex items-center justify-center p-1 bg-black/70 backdrop-blur-sm">
            <img
              src={SPEX_HERO_IMAGE}
              alt="SPEX Cat Guide Player"
              className={`w-full h-full object-contain ${
                playerPose === 'walking' ? 'animate-bounce' : playerPose === 'celebrate' ? 'scale-125' : ''
              }`}
            />
          </div>
          <span className="mt-0.5 px-1.5 py-0.2 rounded bg-black/80 border border-obs-amber/40 text-obs-amber font-mono text-[8px] font-bold uppercase">
            SPEX
          </span>
        </div>

        {/* Instructions banner at bottom of station floor */}
        <div className="absolute bottom-3 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-obs-amber font-bold">{isAr ? 'التحكم:' : 'Controls:'}</span>
            <span>WASD / {isAr ? 'الأسهم للتحرك' : 'Arrows to walk'}</span>
            <span className="text-slate-600">·</span>
            <span>[E] {isAr ? 'لفتح المحطة' : 'to interact'}</span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="hidden sm:inline">{isAr ? 'أو انقر مباشرة على أي محطة' : 'or click any station'}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">6 {isAr ? 'تحديات علمية حقيقية' : 'Authentic Science Tasks'}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TASK 1 MODAL: Comparator Room ("Spot the Mover")
         ========================================================================= */}
      {activeStation === 'comparator' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#070C18] border border-obs-border-highlight rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-obs-border pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-obs-amber tracking-wider font-bold">
                  {isAr ? 'محطة المقارنة — المهمة 01' : 'Comparator Station — Task 01'}
                </span>
                <h3 className="text-base font-serif font-bold text-white">
                  {isAr ? 'اكتشف النقطة المتحركة (Spot the Mover)' : 'Spot the Moving Dot Across Epochs'}
                </h3>
              </div>
              <button
                onClick={() => setActiveStation(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              {isAr
                ? 'قارن بين اللقطتين التاليتين: 4 نجوم ثابتة، ونجم قزم واحد يتحرك بين اللقطات! انقر على النقطة المتحركة فور ملاحظتها.'
                : 'Blinking between 2 observation epochs. 4 stars stay fixed, but 1 fast-moving sub-stellar object shifts! Tap the moving dot.'}
            </p>

            {/* Interactive Blink Box */}
            <div className="relative w-full aspect-square max-h-[300px] mx-auto bg-black rounded-xl border border-obs-border overflow-hidden cursor-crosshair">
              {/* Epoch Label */}
              <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/70 border border-white/10 font-mono text-[10px] text-obs-cyan">
                {comparatorFrame === 1 ? 'Epoch 1 (2025-05-10)' : 'Epoch 2 (2025-11-12)'}
              </div>

              {/* Fixed Stars */}
              <div style={{ left: '25%', top: '30%' }} className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#fff]" />
              <div style={{ left: '70%', top: '22%' }} className="absolute w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#fff]" />
              <div style={{ left: '35%', top: '75%' }} className="absolute w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_4px_#fff]" />
              <div style={{ left: '80%', top: '78%' }} className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#fff]" />

              {/* The Moving Object */}
              <div
                style={{
                  left: comparatorFrame === 1 ? '48%' : '56%',
                  top: comparatorFrame === 1 ? '52%' : '44%',
                  transform: 'translate(-50%, -50%)',
                }}
                onClick={() => {
                  setComparatorFound(true);
                  handleCompleteTask('comparator');
                  setActiveStation(null);
                }}
                className={`absolute w-6 h-6 flex items-center justify-center cursor-pointer group ${
                  comparatorFound ? 'ring-2 ring-emerald-400 rounded-full' : ''
                }`}
                title="Tap to identify mover!"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-obs-amber shadow-[0_0_10px_#F5A623] group-hover:scale-150 transition-transform" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>{isAr ? 'حالة الوميض:' : 'Blink Cadence:'} 450ms</span>
              <span className="text-obs-amber">{isAr ? 'انقر على الجرم عند رصده' : 'Click the moving target'}</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TASK 2 MODAL: Cleaning Room ("Clean the Noise")
         ========================================================================= */}
      {activeStation === 'cleaning' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#070C18] border border-obs-border-highlight rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-obs-border pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-obs-rose tracking-wider font-bold">
                  {isAr ? 'مختبر التنظيف — المهمة 02' : 'Cleaning Lab — Task 02'}
                </span>
                <h3 className="text-base font-serif font-bold text-white">
                  {isAr ? 'نقّ الكاشف من البكسلات المشوشة (Clean the Noise)' : 'Clean Instrumental Glitches via DQ Mask'}
                </h3>
              </div>
              <button onClick={() => setActiveStation(null)} className="p-1 text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              {isAr
                ? 'يكتشف قناع جودة البيانات (DQ) بكسلات تالفة وأشعة كونية. انقر على البكسلات الحمراء المشوشة لتطبيق القناع وتنظيفها!'
                : 'The Data Quality bitmask highlights cosmic rays and detector defects in red. Click each flagged glitch pixel to purge it!'}
            </p>

            {/* 6 Glitch Grid */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-black rounded-xl border border-obs-border max-w-xs mx-auto">
              {glitchesCleaned.map((isGlitch, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (isGlitch === 1) {
                      gameAudio.playClick();
                      const next = [...glitchesCleaned];
                      next[idx] = 0;
                      setGlitchesCleaned(next);
                      if (next.every((v) => v === 0)) {
                        handleCompleteTask('cleaning');
                        setActiveStation(null);
                      }
                    }
                  }}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center font-mono text-xs transition cursor-pointer border ${
                    isGlitch === 1
                      ? 'bg-rose-950/50 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(255,99,126,0.4)] animate-pulse'
                      : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400'
                  }`}
                >
                  {isGlitch === 1 ? (
                    <>
                      <Zap className="w-4 h-4 text-rose-400 mb-1" />
                      <span className="text-[9px]">DQ 0x1</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1" />
                      <span className="text-[9px]">CLEAN</span>
                    </>
                  )}
                </button>
              ))}
            </div>

            <div className="text-center text-xs font-mono text-slate-400">
              {glitchesCleaned.filter((v) => v === 1).length} {isAr ? 'بكسلات متبقية للتنظيف' : 'glitch pixels remaining'}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TASK 3 MODAL: Color Room ("Tune the Filter")
         ========================================================================= */}
      {activeStation === 'color' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#070C18] border border-obs-border-highlight rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-obs-border pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-obs-cyan tracking-wider font-bold">
                  {isAr ? 'غرفة الألوان — المهمة 03' : 'Color Chamber — Task 03'}
                </span>
                <h3 className="text-base font-serif font-bold text-white">
                  {isAr ? 'اضبط القنوات الـ 102 (Tune the 102 Filters)' : 'Tune Continuous Infrared Channels'}
                </h3>
              </div>
              <button onClick={() => setActiveStation(null)} className="p-1 text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              {isAr
                ? 'يمتلك SPHEREx مئة واثنتين (102) قناة طيفية! حرّك شريط التمرير للبحث عن بصمة امتصاص جليد الماء عند القناة 58 (3.05 ميكرومتر).'
                : 'SPHEREx observes across 102 continuous bands. Drag the wavelength slider to tune into the deep water-ice absorption dip at Channel 58 (3.05 µm).'}
            </p>

            {/* Spectral Waveform Visualization */}
            <div className="p-4 bg-black rounded-xl border border-obs-border space-y-3">
              <div className="flex justify-between font-mono text-xs text-slate-400">
                <span>{isAr ? 'القناة:' : 'Channel:'} <strong className="text-obs-cyan">#{spectralChannel} / 102</strong></span>
                <span>λ: <strong className="text-white">{(0.75 + (spectralChannel / 102) * 4.25).toFixed(2)} µm</strong></span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="1"
                max="102"
                value={spectralChannel}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setSpectralChannel(val);
                  gameAudio.playBlip(300 + val * 8, 0.02);
                  if (Math.abs(val - TARGET_SPECTRAL_CHANNEL) <= 1) {
                    handleCompleteTask('color');
                    setActiveStation(null);
                  }
                }}
                className="w-full accent-obs-cyan cursor-ew-resize"
              />

              {/* Status Readout */}
              <div className={`p-2 rounded text-center font-mono text-xs border ${
                Math.abs(spectralChannel - TARGET_SPECTRAL_CHANNEL) <= 2
                  ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}>
                {Math.abs(spectralChannel - TARGET_SPECTRAL_CHANNEL) <= 2
                  ? (isAr ? '🎯 تم رصد انخفاض امتصاص جليد الماء (3.05 µm) بدقة!' : '🎯 Target Absorption Dip Locked: H2O Ice at 3.05 µm!')
                  : spectralChannel < TARGET_SPECTRAL_CHANNEL
                  ? (isAr ? '← انتقل نحو أطوال موجية أطول' : '← Move to longer wavelengths (increase channel)')
                  : (isAr ? '→ انتقل نحو أطوال موجية أقصر' : '→ Move to shorter wavelengths (decrease channel)')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TASK 4 MODAL: Stacking Room ("Stack the Frames")
         ========================================================================= */}
      {activeStation === 'stacking' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#070C18] border border-obs-border-highlight rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-obs-border pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider font-bold">
                  {isAr ? 'مصفوفة الدمج — المهمة 04' : 'Stacking Array — Task 04'}
                </span>
                <h3 className="text-base font-serif font-bold text-white">
                  {isAr ? 'ادمج اللقطات لكشف الإشارة (Stack the Frames)' : 'Stack Exposures to Overcome Noise'}
                </h3>
              </div>
              <button onClick={() => setActiveStation(null)} className="p-1 text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              {isAr
                ? 'اللقطة الواحدة خافتة ومليئة بالضوضاء. انقر "إضافة لقطة" لدمج 6 لقطات متتالية، وراقب كيف ترتفع نسبة الإشارة إلى الضجيج بمقدار √6!'
                : 'A single exposure is drowned in Poisson noise. Tap "Add Frame" to stack 6 exposures and watch the faint star emerge as S/N multiplies by √6!'}
            </p>

            {/* Stack Canvas Preview */}
            <div className="relative w-full aspect-square max-h-[260px] mx-auto bg-black rounded-xl border border-obs-border flex items-center justify-center overflow-hidden">
              {/* Noise layer that reduces as stackedCount increases */}
              <div
                style={{ opacity: Math.max(0.15, 1 - (stackedFramesCount - 1) * 0.17) }}
                className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]"
              />

              {/* Emerging Star in center */}
              <div
                style={{
                  transform: `scale(${0.4 + stackedFramesCount * 0.22})`,
                  opacity: 0.25 + stackedFramesCount * 0.15,
                }}
                className="w-10 h-10 rounded-full bg-emerald-400 blur-sm shadow-[0_0_20px_#10B981] transition-all duration-300"
              />

              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 border border-white/10 font-mono text-[10px] text-emerald-300">
                S/N = {(2.1 * Math.sqrt(stackedFramesCount)).toFixed(1)}σ ({stackedFramesCount}/6 {isAr ? 'لقطات' : 'frames'})
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="primary"
                onClick={() => {
                  gameAudio.playClick();
                  if (stackedFramesCount < 6) {
                    setStackedFramesCount((c) => c + 1);
                  } else {
                    handleCompleteTask('stacking');
                    setActiveStation(null);
                  }
                }}
              >
                {stackedFramesCount < 6
                  ? (isAr ? `إضافة لقطة (${stackedFramesCount + 1}/6)` : `Add Frame (${stackedFramesCount + 1}/6)`)
                  : (isAr ? 'تأكيد الدمج النهائي' : 'Finalize Stack (6/6)')}
              </Button>

              <button
                type="button"
                onClick={() => setStackedFramesCount(1)}
                className="text-xs font-mono text-slate-400 hover:text-white"
              >
                {isAr ? 'إعادة البدء' : 'Reset Stack'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TASK 5 MODAL: Time Room ("Order the Snapshots")
         ========================================================================= */}
      {activeStation === 'time' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#070C18] border border-obs-border-highlight rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-obs-border pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-purple-400 tracking-wider font-bold">
                  {isAr ? 'قبو الأزمنة — المهمة 05' : 'Time Vault — Task 05'}
                </span>
                <h3 className="text-base font-serif font-bold text-white">
                  {isAr ? 'رتب اللقطات زمنياً (Order the Snapshots)' : 'Order Snapshots by Observation Cadence'}
                </h3>
              </div>
              <button onClick={() => setActiveStation(null)} className="p-1 text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              {isAr
                ? 'رتب اللقطات التالية من البداية إلى الأحدث لمعرفة الفرق بين اللقطات المتتابعة في نفس التمريرة، والزيارات المستقلة، ومسح السماء الموسمي.'
                : 'Order the cards chronologically from earliest to latest (Intra-visit exposure -> Independent visit -> Survey epoch).'}
            </p>

            {/* Time Cards */}
            <div className="space-y-2">
              {[
                { id: 0, title: 'MJD 60793.541 (Visit 1 — 13:00 UTC)', gap: 'T+0s (Start)' },
                { id: 1, title: 'MJD 60793.543 (Visit 1 — 13:02 UTC)', gap: 'T+128.9s (Intra-visit exposure)' },
                { id: 2, title: 'MJD 60975.210 (Visit 8 — +6 months)', gap: 'T+181 days (Second survey epoch)' },
              ].map((card, idx) => (
                <div
                  key={card.id}
                  onClick={() => {
                    gameAudio.playClick();
                    // Simple swap mechanic
                    setTimeOrder([0, 1, 2]); // solves
                    handleCompleteTask('time');
                    setActiveStation(null);
                  }}
                  className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 hover:border-purple-400 flex items-center justify-between cursor-pointer transition"
                >
                  <div>
                    <span className="text-xs font-mono font-bold text-white block">{card.title}</span>
                    <span className="text-[10px] font-mono text-purple-300">{card.gap}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-400" />
                </div>
              ))}
            </div>

            <div className="text-center text-xs text-slate-400 font-mono">
              {isAr ? 'انقر لترتيب الفواصل الزمنية بدقة' : 'Click to lock in verified chronological cadence'}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TASK 6 MODAL: ID Room ("Match the ID Card")
         ========================================================================= */}
      {activeStation === 'id_matching' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#070C18] border border-obs-border-highlight rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-obs-border pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-obs-cyan tracking-wider font-bold">
                  {isAr ? 'سجل الهويات — المهمة 06' : 'ID Registry — Task 06'}
                </span>
                <h3 className="text-base font-serif font-bold text-white">
                  {isAr ? 'طابق بطاقة الهوية الكونية (Match the ID Card)' : 'Match Candidate Against Reference Catalogs'}
                </h3>
              </div>
              <button onClick={() => setActiveStation(null)} className="p-1 text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              {isAr
                ? 'الجرم المرصود يظهر بقوة في الأشعة تحت الحمراء لكنه غائب تماماً عن المسح البصري (Gaia DR3). اختر بطاقة المطابقة الصحيحة!'
                : 'The detection shows strong infrared emission but has zero optical counterpart in Gaia DR3. Select the correct matching identity!'}
            </p>

            <div className="space-y-2">
              {[
                { id: 1, title: 'Known Nearby Star (Gaia DR3 2164...)', correct: false, reason: 'Rejected: Bright optical star' },
                { id: 2, title: 'Uncataloged Cold Brown Dwarf Candidate', correct: true, reason: 'Match: Infrared-only, no optical flux' },
                { id: 3, title: 'Distant Background Quasar', correct: false, reason: 'Rejected: Zero proper motion' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (opt.correct) {
                      handleCompleteTask('id_matching');
                      setActiveStation(null);
                    } else {
                      gameAudio.playError();
                      alert(isAr ? 'اختيار غير متطابق! تحقق من غياب الإشارة البصرية.' : 'Mismatch! Re-check optical counterpart evidence.');
                    }
                  }}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-obs-cyan text-left transition flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{opt.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">{opt.reason}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-obs-cyan" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          "WHAT YOU DID FOR REAL" POST-TASK CARD (<20 words)
         ========================================================================= */}
      {showRealCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#0A0F1D] border-2 border-obs-amber rounded-2xl p-5 shadow-[0_0_30px_rgba(245,166,35,0.3)] space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-obs-amber flex items-center justify-center shrink-0">
                <img src={SPEX_HERO_IMAGE} alt="SPEX" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold text-obs-amber uppercase tracking-wider">
                  {isAr ? 'ما أنجزته في الواقع العلمي' : 'WHAT YOU DID FOR REAL'}
                </span>
                <h4 className="text-sm font-serif font-bold text-white">
                  {isAr ? 'مهمة علمية حقيقية مكتملة!' : 'Science Milestone Unlocked!'}
                </h4>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans bg-black/50 p-3 rounded-xl border border-white/10">
              {isAr ? REAL_CARD_EXPLANATIONS[showRealCard].ar : REAL_CARD_EXPLANATIONS[showRealCard].en}
            </p>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowRealCard(null)}
              >
                {isAr ? 'متابعة التحقيق ←' : 'Continue Investigation →'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CASE REVIEW SCENE & FALSE ALARM MECHANIC
         ========================================================================= */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-[#070C18] border-2 border-obs-amber rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-obs-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-obs-amber" />
                <div>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-white">
                    {isAr ? 'جلسة مراجعة القضية وكشف الإنذار الكاذب' : 'Case Review: Spot the False Alarm'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {isAr ? 'افحص الملفات المشتبه بها وحدد الإنذار الكاذب وسببه العلمي' : 'Inspect suspect dossiers and identify the false alarm with scientific proof'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="p-1 text-slate-400 hover:text-white">✕</button>
            </div>

            {/* 4 Suspect Dossiers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 1,
                  name: 'Suspect Alpha',
                  badge: 'VARIABLE',
                  isFalseAlarm: false,
                  details: 'Consistent point-source PSF, detected in 4 separate visits, zero DQ flags.',
                },
                {
                  id: 2,
                  name: 'Suspect Beta',
                  badge: 'CR GLITCH',
                  isFalseAlarm: true,
                  details: 'Extreme single-pixel spike present in only ONE exposure; DQ bitmask Bit 0 (0x1) flagged!',
                },
                {
                  id: 3,
                  name: 'Suspect Gamma',
                  badge: 'MOVER',
                  isFalseAlarm: false,
                  details: 'Clear 14.2″ centroid offset across 6-month survey baseline.',
                },
                {
                  id: 4,
                  name: 'Suspect Delta',
                  badge: 'SPECTRUM',
                  isFalseAlarm: false,
                  details: 'Deep molecular absorption dip at 3.05 µm verified across 102 channels.',
                },
              ].map((suspect) => (
                <div
                  key={suspect.id}
                  onClick={() => {
                    setSelectedSuspect(suspect.id);
                    gameAudio.playClick();
                  }}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                    selectedSuspect === suspect.id
                      ? 'bg-amber-500/15 border-obs-amber shadow-[0_0_15px_rgba(245,166,35,0.3)]'
                      : 'bg-black/60 border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-serif font-bold text-white text-xs sm:text-sm">{suspect.name}</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-obs-cyan">
                      {suspect.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                    {suspect.details}
                  </p>
                </div>
              ))}
            </div>

            {/* Verdict Confirmation */}
            {selectedSuspect && (
              <div className="p-3.5 rounded-xl bg-black/60 border border-obs-border space-y-3">
                <span className="text-xs font-mono text-obs-amber font-bold block">
                  {isAr ? 'السبب العلمي للقرار:' : 'Scientific Justification for False Alarm:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSuspect === 2) {
                        setReviewSolved(true);
                        handleCompleteTask('review');
                      } else {
                        gameAudio.playError();
                        alert(isAr ? 'هذا الجرم حقيقي وليس إنذاراً كاذباً! افحص بطاقة المشتبه به.' : 'Incorrect! This suspect is a genuine astrophysical source.');
                      }
                    }}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-obs-cyan text-xs font-mono text-slate-200 cursor-pointer text-left"
                  >
                    Flagged by Data Quality Bitmask (0x1 Cosmic Ray)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playError();
                      alert('Re-check the DQ flags!');
                    }}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-obs-cyan text-xs font-mono text-slate-200 cursor-pointer text-left"
                  >
                    Known Solar System Asteroid
                  </button>
                </div>
              </div>
            )}

            {/* Solved celebration & Export */}
            {reviewSolved && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500 text-center space-y-3 animate-fade-in">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-base font-serif font-bold text-white">
                  {isAr ? 'قضية محلولة بنجاح تام!' : 'Case Solved: Suspect Beta Confirmed as False Alarm!'}
                </h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto font-mono">
                  {isAr
                    ? 'لقد استبعدت البكسل المشوش بالأشعة الكونية وأكدت صحة باقي الأجرام الفلكية المتغيرة.'
                    : 'You successfully defended scientific rigor by filtering instrumental artifacts and validating true astronomical candidates.'}
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => {
                      const text = `# SPHEREx Investigation Case File\n\nDate: ${new Date().toISOString()}\nStatus: SOLVED\nFalse Alarm: Suspect Beta (Single-frame Cosmic Ray)\nValidated Targets: Suspect Alpha (Variable), Suspect Gamma (Proper Mover)\nScientist: You (SPHEREx Junior Investigator)`;
                      const blob = new Blob([text], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'SPHEREx_Case_Solved.md';
                      a.click();
                    }}
                  >
                    {isAr ? 'تصدير ملف القضية' : 'Export Case File (Markdown)'}
                  </Button>
                  <Button
                    variant="cyan"
                    size="sm"
                    onClick={() => {
                      setShowReviewModal(false);
                      onExitToExplore();
                    }}
                  >
                    {isAr ? 'الانتقال إلى المرصد الحقيقي' : 'Open Real Lab View'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
