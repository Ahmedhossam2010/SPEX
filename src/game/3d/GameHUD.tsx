import React from 'react';
import { 
   Volume2, VolumeX, Globe, Shield, BookOpen, 
   HelpCircle, Terminal, Maximize2, Minimize2, Pause, LogOut, Sparkles
} from 'lucide-react';
import { InteractiveTerminal } from './StationBuilder';
import { SpexPortrait } from '../../spex/SpexPortrait';
import { gameAudio } from '../utils/gameAudio';

interface GameHUDProps {
  cadetName: string;
  score: number;
  completedMissions: number[];
  currentMissionNumber: number;
  nearestTerminal: InteractiveTerminal | null;
  targetDistance: number;
  onInteract: () => void;
  onOpenNotebook: () => void;
  onOpenHelp: () => void;
  onOpenPause: () => void;
  onResetGame: () => void;
  onExitToExplore?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  language: 'en' | 'ar';
  onToggleLanguage: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  spexDialogue: { text: string; mood: string } | null;
  isTouchDevice?: boolean;
  showTutorial?: boolean;
  tutorialStep?: number;
  tutorialDistance?: number;
  tutorialRotation?: number;
  targetBearing?: number;
  onTutorialNext?: () => void;
  onTutorialSkip?: () => void;
  isPointerLocked?: boolean;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  cadetName,
  score,
  completedMissions,
  currentMissionNumber,
  nearestTerminal,
  targetDistance,
  targetBearing = 0,
  onInteract,
  onOpenNotebook,
  onOpenHelp,
  onOpenPause,
  onExitToExplore,
  onToggleFullscreen,
  isFullscreen = false,
  language,
  onToggleLanguage,
  isMuted,
  onToggleMute,
  spexDialogue,
  isTouchDevice = false,
  showTutorial = false,
  tutorialStep = 1,
  tutorialDistance = 0,
  tutorialRotation = 0,
  onTutorialNext,
  onTutorialSkip,
  isPointerLocked = false,
}) => {
  const isAr = language === 'ar';

  const missionsMeta = [
    {
      num: 1,
      title: 'A New Explorer Arrives',
      titleAr: 'وصول المستكشف للمحطة',
      room: 'Main Control Hub (Center)',
      roomAr: 'قاعة التحكم الرئيسية (المركز)',
    },
    {
      num: 2,
      title: 'The Journey of SPHEREx',
      titleAr: 'تاريخ ورحلة مرصد SPHEREx',
      room: 'Mission History Gallery (North)',
      roomAr: 'معرض تاريخ المهمة (شمالاً)',
    },
    {
      num: 3,
      title: 'The Invisible Universe',
      titleAr: 'الكون غير المرئي بالأشعة تحت الحمراء',
      room: 'Infrared Science Lab (East)',
      roomAr: 'مختبر الأشعة تحت الحمراء (شرقاً)',
    },
    {
      num: 4,
      title: 'The Moving Sky Mystery',
      titleAr: 'لغز السماء المتحركة',
      room: 'Observation Analysis Center (West)',
      roomAr: 'مركز تحليل الرصدات (غرباً)',
    },
    {
      num: 5,
      title: 'The 102-Band Secret',
      titleAr: 'سر النطاقات الطيفية الـ 102',
      room: 'Spectral Analysis Lab',
      roomAr: 'مختبر التحليل الطيفي وجليد الكون',
    },
    {
      num: 6,
      title: 'The Investigation Report',
      titleAr: 'تقرير التحقيق النهائي والاعتماد',
      room: 'Main Mission Control Deck',
      roomAr: 'منصة قيادة المهمة واعتماد ناسا',
    },
  ];

  const currentMeta = missionsMeta.find(m => m.num === currentMissionNumber) || missionsMeta[0];

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 sm:p-5 select-none" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. TOP BAR: Cadet Info & Mission Control Status & Quick Utilities */}
      <div className="flex items-center justify-between gap-2">
        {/* Top-Left: Cadet Info & Callsign */}
        <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3 bg-slate-950/85 backdrop-blur-md px-3 py-2 rounded-2xl border border-cyan-500/30 shadow-lg">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500/30 to-cyan-500/30 p-0.5 border border-cyan-500/40 flex items-center justify-center overflow-hidden">
            <SpexPortrait mood="investigator" size={36} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono tracking-wider text-cyan-300 font-bold uppercase">
                {cadetName || 'CADET ORION'}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-semibold">
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

        {/* Center: Subtle Simulation Disclaimer Badge (desktop only) */}
        <div className="hidden md:flex bg-amber-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/40 text-[10px] font-mono text-amber-300 font-bold tracking-wider items-center gap-1.5 shadow-md">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>{isAr ? 'محاكاة تعليمية ثلاثية الأبعاد — وليست بيانات FITS الفعلية' : '3D EDUCATIONAL SIMULATION — FITS LAB IN EXPLORE'}</span>
        </div>

        {/* Top-Right: Quick Utilities (Pause, Fullscreen, Mute, Logbook, Exit) */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {/* Pause Button */}
          <button
            type="button"
            onClick={() => {
              gameAudio.playClick();
              onOpenPause();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-cyan-500/40 text-cyan-300 hover:text-white transition shadow cursor-pointer text-xs font-mono font-bold"
            title="Pause Menu [ESC]"
          >
            <Pause className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">{isAr ? 'إيقاف مؤقت' : 'Pause'}</span>
          </button>

          {/* Audio toggle */}
          <button
            type="button"
            onClick={() => {
              gameAudio.playClick();
              onToggleMute();
            }}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition shadow cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Fullscreen toggle */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick();
                onToggleFullscreen();
              }}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition shadow cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4 text-slate-300" />}
            </button>
          )}

          {/* Language toggle */}
          <button
            type="button"
            onClick={() => {
              gameAudio.playClick();
              onToggleLanguage();
            }}
            className="hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition shadow cursor-pointer"
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-cyan-950/85 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 text-xs font-semibold transition shadow cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{isAr ? 'سجل الأدلة' : 'Logbook'}</span>
          </button>

          {/* Exit to Lab button */}
          {onExitToExplore && (
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick();
                onExitToExplore();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-bold transition shadow cursor-pointer"
              title="Exit to SPHEREx Science Lab"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>{isAr ? 'الخروج للمرصد' : 'Exit to Lab'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 1.5. ACTIVE IN-GAME TUTORIAL FLOATING BANNER (Non-blocking, live interactive tracking) */}
      {showTutorial && (
        <div className="pointer-events-auto self-center mt-2 w-full max-w-xl bg-slate-950/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-cyan-400/60 shadow-[0_0_35px_rgba(6,182,212,0.35)] animate-in slide-in-from-top-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center p-0.5">
                <SpexPortrait mood="investigator" size={28} />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                  {isAr ? `أكاديمية طيران SPEX • الخطوة ${tutorialStep} من 5` : `SPEX FLIGHT ACADEMY • STEP ${tutorialStep} OF 5`}
                </span>
                <span className="text-xs font-bold text-white">
                  {tutorialStep === 1 && (isAr ? 'تهيئة بدلة واستشعار الفضاء' : 'Flight Suit & Sensor Calibration')}
                  {tutorialStep === 2 && (isAr ? 'معايرة الحركة والتنقل' : 'Locomotion Calibration (WASD / Arrows)')}
                  {tutorialStep === 3 && (isAr ? 'معايرة الكاميرا والمراقبة 360°' : 'Camera Orbit & Look (Mouse / Drag)')}
                  {tutorialStep === 4 && (isAr ? 'الاقتراب والتفاعل مع المنصة' : 'Approach Briefing Console & Press [E]')}
                  {tutorialStep === 5 && (isAr ? 'جاهز للمهمات الفلكية!' : 'All Systems Calibrated & Ready!')}
                </span>
              </div>
            </div>

            {onTutorialSkip && (
              <button
                type="button"
                onClick={onTutorialSkip}
                className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer"
              >
                {isAr ? 'تخطي الدليل' : 'Skip'}
              </button>
            )}
          </div>

          {/* Tutorial Step Body */}
          <div className="pt-2 text-xs text-slate-300">
            {tutorialStep === 1 && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] leading-relaxed">
                  {isAr
                    ? 'أهلاً بك على متن محطة SPHEREx! دعنا نتأكد من عمل أدوات التحكم والكاميرا قبل بدء المهام.'
                    : 'Welcome aboard the SPHEREx Research Station! Let\'s verify your movement and camera controls before starting missions.'}
                </p>
                {onTutorialNext && (
                  <button
                    type="button"
                    onClick={onTutorialNext}
                    className="flex-shrink-0 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  >
                    {isAr ? 'بدء المعايرة' : 'Start Calibration'}
                  </button>
                )}
              </div>
            )}

            {tutorialStep === 2 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span>
                    {isTouchDevice
                      ? (isAr ? 'حرك عصا التحكم الافتراضية في أسفل اليسار:' : 'Use the virtual analog thumbstick to move:')
                      : (isAr ? 'تحرك في أي اتجاه باستخدام مفاتيح WASD أو الأسهم:' : 'Walk in any direction using [W, A, S, D] or Arrow keys:')}
                  </span>
                  <span className="font-mono font-bold text-cyan-300">
                    {Math.min(2.5, tutorialDistance).toFixed(1)}m / 2.5m
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-150"
                    style={{ width: `${Math.min(100, (tutorialDistance / 2.5) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {tutorialStep === 3 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span>
                    {isTouchDevice
                      ? (isAr ? 'اسحب على الشاشة لتدوير الكاميرا 360 درجة:' : 'Drag on screen to orbit camera 360 degrees:')
                      : (isAr ? 'انقر وحرك الفأرة لتدوير الكاميرا واستكشاف المحطة:' : 'Click screen to lock camera (or drag mouse) to look around:')}
                  </span>
                  <span className="font-mono font-bold text-cyan-300">
                    {Math.min(60, Math.round(tutorialRotation))}° / 60°
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-cyan-400 rounded-full transition-all duration-150"
                    style={{ width: `${Math.min(100, (tutorialRotation / 60) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {tutorialStep === 4 && (
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <p>
                  {isAr
                    ? 'تقدم نحو منصة الإحاطة المضيئة (Terminal 1) ذات الشعاع السماوي واضغط [E]:'
                    : 'Walk forward to the glowing cyan Briefing Console (Terminal 1) and press [E]:'}
                </p>
                <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 whitespace-nowrap">
                  {targetDistance > 0 ? `${targetDistance.toFixed(1)}m away` : 'IN RANGE'}
                </span>
              </div>
            )}

            {tutorialStep === 5 && (
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <p>
                  {isAr
                    ? 'اكتملت المعايرة بنجاح! اتبع الشعاع السماوي إلى محطات المهام الخمس لحل الألغاز الفلكية.'
                    : 'Calibration complete! Follow the vertical cyan beacon to each mission console to crack the cosmic cases.'}
                </p>
                {onTutorialNext && (
                  <button
                    type="button"
                    onClick={onTutorialNext}
                    className="flex-shrink-0 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                  >
                    {isAr ? 'ابدأ المهمة 01' : 'Start Mission 01'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. ACTIVE OBJECTIVE CARD (Top Left below Cadet Info) */}
      <div className="pointer-events-auto self-start mt-2 max-w-xs sm:max-w-sm bg-slate-950/85 backdrop-blur-md p-3 rounded-2xl border border-cyan-500/30 shadow-xl">
        <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
            {isAr ? `المهمة 0${currentMeta.num} من 05` : `MISSION 0${currentMeta.num} OF 05`}
          </span>
          <span className="text-amber-400 font-semibold">
            {targetDistance > 0 ? `${targetDistance.toFixed(1)}m` : '0m'} · {isAr ? currentMeta.roomAr : currentMeta.room}
          </span>
        </div>
        <div className="text-sm font-bold text-white mb-0.5">
          {isAr ? currentMeta.titleAr : currentMeta.title}
        </div>
        <div className="text-[11px] text-slate-300 leading-snug">
          {isAr
            ? 'اتبع الشعاع الليزري السماوي إلى المنصة واضغط للتفاعل والبدء.'
            : 'Follow the vertical cyan light beacon to the console and press [E] to engage.'}
        </div>

        {/* Live Directional Waypoint Tracker */}
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[11px] font-mono font-bold">
          {Math.abs(targetBearing) <= 25 ? (
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30 animate-pulse">
              <span>▲</span>
              <span>{isAr ? 'في مجال رؤيتك مباشرة' : 'Directly Ahead'}</span>
            </span>
          ) : targetBearing > 25 && targetBearing < 155 ? (
            <span className="flex items-center gap-1.5 text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/30">
              <span>▶</span>
              <span>{isAr ? `انعطف يميناً ${Math.round(targetBearing)}°` : `Turn Right ${Math.round(targetBearing)}°`}</span>
            </span>
          ) : targetBearing < -25 && targetBearing > -155 ? (
            <span className="flex items-center gap-1.5 text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/30">
              <span>◀</span>
              <span>{isAr ? `انعطف يساراً ${Math.round(-targetBearing)}°` : `Turn Left ${Math.round(-targetBearing)}°`}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
              <span>▼</span>
              <span>{isAr ? 'خلفك (استدر 180°)' : 'Behind You (Turn 180°)'}</span>
            </span>
          )}

          <span className="text-[10px] text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
            {targetDistance > 0 ? `${targetDistance.toFixed(1)}m` : '0m'}
          </span>
        </div>
      </div>

      {/* 3. CENTER PROXIMITY INTERACTION PROMPT */}
      {nearestTerminal && (
        <div className="self-center my-auto transition-transform duration-200">
          <button
            type="button"
            onClick={() => {
              gameAudio.playTerminalInteract();
              onInteract();
            }}
            className="pointer-events-auto flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-bold text-sm tracking-wide shadow-[0_0_35px_rgba(6,182,212,0.6)] transition border border-cyan-200 cursor-pointer active:scale-95"
          >
            <Terminal className="w-5 h-5 text-slate-950 animate-pulse" />
            <span>
              {isAr
                ? `[E] تفاعل مع محطة التحليل: ${nearestTerminal.titleAr}`
                : `[E] ACCESS MISSION CONSOLE: ${nearestTerminal.title}`}
            </span>
          </button>
        </div>
      )}

      {/* 4. DIALOGUE / SPEX COMPANION TOAST (Bottom Right) */}
      {spexDialogue && (
        <div className="pointer-events-auto self-end max-w-sm sm:max-w-md bg-slate-950/90 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-cyan-500/40 shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-amber-400/40 p-1 flex-shrink-0 flex items-center justify-center overflow-hidden">
            <SpexPortrait mood={spexDialogue.mood || 'greeting'} size={44} />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block mb-0.5">
              SPEX Companion AI
            </span>
            <p className="text-xs text-slate-200 leading-relaxed">
              {spexDialogue.text}
            </p>
          </div>
        </div>
      )}

      {/* 5. DESKTOP KEYBOARD HINT FOOTER (Hidden on mobile) */}
      {!isTouchDevice && (
        <div className="hidden sm:flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/80 backdrop-blur-sm px-4 py-1.5 rounded-xl border border-slate-800 self-center shadow">
          <span>WASD / Arrows: Walk</span>
          <span className="mx-2 text-slate-700">•</span>
          <span>Click: {isPointerLocked ? 'Mouse Locked (ESC to release)' : 'Look around'}</span>
          <span className="mx-2 text-slate-700">•</span>
          <span>Shift: Thrusters</span>
          <span className="mx-2 text-slate-700">•</span>
          <span>Space: Jump</span>
          <span className="mx-2 text-slate-700">•</span>
          <span className="text-cyan-400 font-bold">E: Interact</span>
          <span className="mx-2 text-slate-700">•</span>
          <span className="text-amber-400 font-bold">ESC: Pause</span>
        </div>
      )}
    </div>
  );
};
