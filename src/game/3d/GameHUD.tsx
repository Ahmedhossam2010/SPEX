import React from 'react';
import { 
  Volume2, VolumeX, Globe, Shield, Sparkles, 
  Compass, Award, BookOpen, RotateCcw, HelpCircle, Terminal 
} from 'lucide-react';
import { InteractiveTerminal } from './StationBuilder';
import { SPEX_IMAGES } from '../utils/spexAssets';
import { gameAudio } from '../utils/gameAudio';

interface GameHUDProps {
  cadetName: string;
  score: number;
  completedMissions: number[];
  currentMissionNumber: number;
  nearestTerminal: InteractiveTerminal | null;
  onInteract: () => void;
  onOpenNotebook: () => void;
  onOpenHelp: () => void;
  onResetGame: () => void;
  language: 'en' | 'ar';
  onToggleLanguage: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  spexDialogue: { text: string; mood: keyof typeof SPEX_IMAGES } | null;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  cadetName,
  score,
  completedMissions,
  currentMissionNumber,
  nearestTerminal,
  onInteract,
  onOpenNotebook,
  onOpenHelp,
  onResetGame,
  language,
  onToggleLanguage,
  isMuted,
  onToggleMute,
  spexDialogue,
}) => {
  const isAr = language === 'ar';

  const missionsMeta = [
    {
      num: 1,
      title: 'Subsystem Calibration',
      titleAr: 'معايرة الأنظمة الفرعية',
      room: 'Main Control Hub',
      roomAr: 'قاعة التحكم الرئيسية',
    },
    {
      num: 2,
      title: '102-Band Spectral Lab',
      titleAr: 'مختبر الأطياف وحزم الجليد',
      room: 'Observation Chamber',
      roomAr: 'غرفة الرصد الطيفي',
    },
    {
      num: 3,
      title: 'Temporal Alignment',
      titleAr: 'المحاذاة الزمنية والطرح الفلكي',
      room: 'East Observation Deck',
      roomAr: 'منصة الرصد الشرقية',
    },
    {
      num: 4,
      title: 'False Signal Diagnostic',
      titleAr: 'تشخيص الإشارات الزائفة',
      room: 'Exterior Sky Platform',
      roomAr: 'منصة الرصد الخارجية',
    },
    {
      num: 5,
      title: 'Deep Cosmic Investigation',
      titleAr: 'التحقيق الكوني النهائي',
      room: 'Central Science Terminal',
      roomAr: 'محطة التحليل المركزية',
    },
  ];

  const currentMeta = missionsMeta.find(m => m.num === currentMissionNumber) || missionsMeta[0];

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 sm:p-5 select-none" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. TOP BAR: Simulation Banner & Mission Control Status */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Top-Left: Cadet Info & Callsign */}
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-950/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-cyan-500/30 shadow-lg">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-cyan-500 p-0.5">
            <img 
              src={SPEX_IMAGES.proudSuccess} 
              alt="Avatar" 
              className="w-full h-full object-cover rounded-[7px] bg-slate-900" 
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase">
                {cadetName || 'CADET ORION'}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                RANK {completedMissions.length + 1}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="text-xs font-mono font-bold text-white">
                {score} <span className="text-[10px] text-slate-400 font-normal">XP</span>
              </div>
              <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, (completedMissions.length / 5) * 100)}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center: Explicit Simulation Disclaimer Badge */}
        <div className="bg-amber-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/40 text-[10px] font-mono text-amber-300 font-bold tracking-wider flex items-center gap-1.5 shadow-md">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>{isAr ? 'محاكاة تعليمية ثلاثية الأبعاد — ليست بيانات SPHEREx الفعلية' : 'EDUCATIONAL SIMULATION — NOT REAL SPHEREx DATA'}</span>
        </div>

        {/* Top-Right: Quick Utilities */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Audio toggle */}
          <button
            type="button"
            onClick={() => {
              gameAudio.playClick();
              onToggleMute();
            }}
            className="p-2 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition shadow"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Language toggle */}
          <button
            type="button"
            onClick={() => {
              gameAudio.playClick();
              onToggleLanguage();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition shadow"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {/* Notebook button */}
          <button
            type="button"
            onClick={() => {
              gameAudio.playClick();
              onOpenNotebook();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/90 border border-cyan-500/40 text-cyan-200 text-xs font-semibold transition shadow"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAr ? 'سجل الأدلة' : 'Logbook'}</span>
          </button>

          {/* Help button */}
          <button
            type="button"
            onClick={() => {
              gameAudio.playClick();
              onOpenHelp();
            }}
            className="p-2 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition shadow"
            title="Controls & Instructions"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* 2. ACTIVE OBJECTIVE CARD (Top Left below Cadet Info) */}
      <div className="pointer-events-auto self-start mt-3 max-w-sm bg-slate-950/85 backdrop-blur-md p-3 rounded-xl border border-cyan-500/30 shadow-xl">
        <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1">
          <span>{isAr ? `المهمة الحالية 0${currentMeta.num} / 05` : `ACTIVE MISSION 0${currentMeta.num} / 05`}</span>
          <span className="text-amber-400 font-semibold">{isAr ? currentMeta.roomAr : currentMeta.room}</span>
        </div>
        <div className="text-sm font-bold text-white mb-1">
          {isAr ? currentMeta.titleAr : currentMeta.title}
        </div>
        <div className="text-[11px] text-slate-300 leading-snug">
          {isAr
            ? 'اتجه نحو المنصة المضيئة بشعاع ليزري وتفاعل مع محطة البيانات لإنجاز التحليل.'
            : 'Approach the illuminated console with the vertical light beacon and press [E] to begin.'}
        </div>
      </div>

      {/* 3. CENTER PROXIMITY INTERACTION PROMPT */}
      {nearestTerminal && (
        <div className="self-center mb-6 animate-bounce">
          <button
            type="button"
            onClick={() => {
              gameAudio.playTerminalInteract();
              onInteract();
            }}
            className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 font-bold text-sm tracking-wide shadow-[0_0_30px_rgba(6,182,212,0.6)] transition border border-cyan-200"
          >
            <Terminal className="w-5 h-5 text-slate-950" />
            <span>
              {isAr
                ? `[E] افتح محطة البيانات: ${nearestTerminal.titleAr}`
                : `[E] ACCESS TERMINAL: ${nearestTerminal.title}`}
            </span>
          </button>
        </div>
      )}

      {/* 4. DIALOGUE / SPEX COMPANION TOAST (Bottom Right) */}
      {spexDialogue && (
        <div className="pointer-events-auto self-end max-w-md bg-slate-950/90 backdrop-blur-md p-4 rounded-2xl border border-cyan-500/40 shadow-2xl flex items-start gap-3.5 animate-in slide-in-from-bottom-4">
          <img 
            src={SPEX_IMAGES[spexDialogue.mood] || SPEX_IMAGES.normal}
            alt="SPEX"
            className="w-14 h-14 rounded-xl object-contain bg-slate-900 p-1 border border-amber-400/30 flex-shrink-0"
          />
          <div className="flex-1">
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block mb-1">
              SPEX Companion AI
            </span>
            <p className="text-xs text-slate-200 leading-relaxed">
              {spexDialogue.text}
            </p>
          </div>
        </div>
      )}

      {/* 5. DESKTOP KEYBOARD HINT FOOTER (Hidden on mobile) */}
      <div className="hidden sm:flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/70 backdrop-blur-sm px-4 py-1.5 rounded-lg border border-slate-800 self-center">
        <span>WASD / Arrows: Move</span>
        <span className="mx-2">•</span>
        <span>Mouse Drag: Camera Orbit</span>
        <span className="mx-2">•</span>
        <span>Shift: Sprint Thrusters</span>
        <span className="mx-2">•</span>
        <span>Space: Jump</span>
        <span className="mx-2">•</span>
        <span className="text-cyan-400 font-bold">E: Interact</span>
      </div>
    </div>
  );
};
