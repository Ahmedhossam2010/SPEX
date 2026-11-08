import React, { useEffect, useRef, useState } from 'react';
import { GameEngine3D } from './GameEngine3D';
import { InteractiveTerminal } from './StationBuilder';
import { GameHUD } from './GameHUD';
import { PuzzleModal } from './PuzzleModal';
import { MobileControls } from './MobileControls';
import { SPEX_IMAGES } from '../utils/spexAssets';
import { gameAudio } from '../utils/gameAudio';
import { 
  X, HelpCircle, BookOpen, RotateCcw, Award, CheckCircle, 
  Sparkles, Compass, Shield, User 
} from 'lucide-react';

interface Spex3DGameProps {
  onBackToExplore?: () => void;
  language?: 'en' | 'ar';
}

export const Spex3DGame: React.FC<Spex3DGameProps> = ({
  onBackToExplore,
  language: initialLang = 'en',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine3D | null>(null);

  const [language, setLanguage] = useState<'en' | 'ar'>(initialLang);
  const isAr = language === 'ar';

  // Game Persistence
  const [cadetName, setCadetName] = useState<string>(() => {
    return localStorage.getItem('spex_cadet_name') || 'Cadet Orion';
  });
  const [score, setScore] = useState<number>(() => {
    const saved = localStorage.getItem('spex_game_score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [completedMissions, setCompletedMissions] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('spex_completed_missions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Current Mission logic
  const currentMissionNumber = Math.min(
    5,
    [1, 2, 3, 4, 5].find((m) => !completedMissions.includes(m)) || 5
  );

  // Active Terminal & Modal
  const [nearestTerminal, setNearestTerminal] = useState<InteractiveTerminal | null>(null);
  const [activeModalMission, setActiveModalMission] = useState<number | null>(null);

  // Dialogues & Toasts
  const [spexDialogue, setSpexDialogue] = useState<{
    text: string;
    mood: keyof typeof SPEX_IMAGES;
  } | null>({
    text: isAr
      ? 'أهلاً بك في محطة SPHEREx الفضائية! استخدم مفاتيح WASD للتحرك واستكشف المحطة للوصول إلى محطات التحليل.'
      : 'Welcome aboard the SPHEREx Research Station! Use WASD to navigate and access the illuminated mission consoles.',
    mood: 'friendlyGreeting',
  });

  // UI Overlays
  const [notebookOpen, setNotebookOpen] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [nameEditorOpen, setNameEditorOpen] = useState<boolean>(false);
  const [tempCadetName, setTempCadetName] = useState<string>(cadetName);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Mobile device detection
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('spex_cadet_name', cadetName);
  }, [cadetName]);

  useEffect(() => {
    localStorage.setItem('spex_game_score', score.toString());
  }, [score]);

  useEffect(() => {
    localStorage.setItem('spex_completed_missions', JSON.stringify(completedMissions));
  }, [completedMissions]);

  // Audio mute sync
  useEffect(() => {
    gameAudio.setMuted(isMuted);
  }, [isMuted]);

  // Initialize Three.js Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine3D(containerRef.current, {
      onTerminalNear: (term) => {
        setNearestTerminal(term);
      },
      onTerminalInteract: (term) => {
        setActiveModalMission(term.missionNumber);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Pause engine when modal is open
  useEffect(() => {
    const isAnyModalOpen = activeModalMission !== null || notebookOpen || helpOpen || nameEditorOpen;
    if (engineRef.current) {
      engineRef.current.setPaused(isAnyModalOpen);
    }
  }, [activeModalMission, notebookOpen, helpOpen, nameEditorOpen]);

  // Handle Mission Completion
  const handleCompleteMission = (missionNum: number, scoreAward: number) => {
    if (!completedMissions.includes(missionNum)) {
      const updated = [...completedMissions, missionNum];
      setCompletedMissions(updated);
      setScore((prev) => prev + scoreAward);
    }

    setSpexDialogue({
      text: isAr
        ? `ممتاز يا ${cadetName}! تم إنجاز المهمة 0${missionNum} وتسجيل نقاط الخبرة بنجاح.`
        : `Outstanding work, ${cadetName}! Mission 0${missionNum} telemetry successfully validated.`,
      mood: 'proudSuccess',
    });

    setTimeout(() => {
      setSpexDialogue(null);
    }, 6000);
  };

  const handleResetGame = () => {
    setCompletedMissions([]);
    setScore(0);
    localStorage.removeItem('spex_completed_missions');
    localStorage.removeItem('spex_game_score');
    gameAudio.playClick();
  };

  return (
    <div className="relative w-full h-[88vh] min-h-[600px] bg-[#070a12] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl select-none">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Heads Up Display */}
      <GameHUD
        cadetName={cadetName}
        score={score}
        completedMissions={completedMissions}
        currentMissionNumber={currentMissionNumber}
        nearestTerminal={nearestTerminal}
        onInteract={() => {
          if (nearestTerminal) {
            setActiveModalMission(nearestTerminal.missionNumber);
          }
        }}
        onOpenNotebook={() => setNotebookOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onResetGame={handleResetGame}
        language={language}
        onToggleLanguage={() => setLanguage(language === 'en' ? 'ar' : 'en')}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        spexDialogue={spexDialogue}
      />

      {/* Mobile Virtual Touch Controls */}
      {isTouchDevice && (
        <MobileControls
          onMove={(x, y, sprint) => {
            if (engineRef.current) {
              engineRef.current.setMobileInput(x, y, sprint);
            }
          }}
          onJump={() => {
            if (engineRef.current) {
              engineRef.current.triggerMobileJump();
            }
          }}
          onInteract={() => {
            if (nearestTerminal) {
              setActiveModalMission(nearestTerminal.missionNumber);
            }
          }}
          canInteract={nearestTerminal !== null}
          language={language}
        />
      )}

      {/* Interactive Puzzle Modal for active terminal */}
      {activeModalMission !== null && (
        <PuzzleModal
          missionNumber={activeModalMission}
          isOpen={true}
          onClose={() => setActiveModalMission(null)}
          onCompleteMission={handleCompleteMission}
          language={language}
          cadetName={cadetName}
        />
      )}

      {/* Logbook / Evidence Modal */}
      {notebookOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setNotebookOpen(false)}
        >
          <div 
            className="w-full max-w-2xl bg-[#0b1120] border border-cyan-500/40 rounded-2xl p-6 text-slate-100 shadow-2xl relative"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">
                  {isAr ? 'سجل الأدلة والمهمات المنجزة' : 'Cosmic Investigation Logbook'}
                </h3>
              </div>
              <button 
                onClick={() => setNotebookOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
              {[1, 2, 3, 4, 5].map((mNum) => {
                const done = completedMissions.includes(mNum);
                return (
                  <div
                    key={mNum}
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      done 
                        ? 'bg-slate-900/80 border-emerald-500/40 text-emerald-200' 
                        : 'bg-slate-950/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {done ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center text-[10px] font-mono">
                          {mNum}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-sm text-slate-200">
                          {mNum === 1 && (isAr ? 'المهمة 01: تنشيط أجهزة الاستشعار' : 'Mission 01: Subsystems Online')}
                          {mNum === 2 && (isAr ? 'المهمة 02: استكشاف أطياف الجليد' : 'Mission 02: 102-Band Spectral Lab')}
                          {mNum === 3 && (isAr ? 'المهمة 03: المحاذاة الزمنية والطرح الفلكي' : 'Mission 03: Temporal Alignment')}
                          {mNum === 4 && (isAr ? 'المهمة 04: فحص الإشارات الزائفة' : 'Mission 04: Signal Discrimination')}
                          {mNum === 5 && (isAr ? 'المهمة 05: التحقيق الكوني النهائي' : 'Mission 05: FU Orionis Discovery')}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {done ? (isAr ? 'مكتملة ومسجلة في الأرشيف' : 'Verified & Registered in Archive') : (isAr ? 'قيد الانتظار' : 'Pending Investigation')}
                        </div>
                      </div>
                    </div>

                    {done && (
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                        +{mNum * 50 + 50} XP
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetGame}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-mono"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isAr ? 'إعادة ضبط التقدم' : 'Reset Mission Progress'}</span>
              </button>

              <button
                type="button"
                onClick={() => setNotebookOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                {isAr ? 'إغلاق' : 'Close Logbook'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help / Controls Guide Modal */}
      {helpOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setHelpOpen(false)}
        >
          <div 
            className="w-full max-w-xl bg-[#0b1120] border border-cyan-500/40 rounded-2xl p-6 text-slate-100 shadow-2xl relative"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-amber-400" />
                <h3 className="text-lg font-bold text-white">
                  {isAr ? 'إرشادات الاستكشاف ثلاثي الأبعاد' : 'Station Flight Guide & Controls'}
                </h3>
              </div>
              <button 
                onClick={() => setHelpOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-300">
              <div>
                <h4 className="font-semibold text-white mb-1">
                  {isAr ? 'التحكم على أجهزة الكمبيوتر:' : 'Desktop Controls:'}
                </h4>
                <ul className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <li>• WASD / الأسهم: التحرك</li>
                  <li>• سحب الفأرة: تحريك الكاميرا</li>
                  <li>• مفتاح Shift: محركات السرعة</li>
                  <li>• مفتاح Space: القفز / النفاث</li>
                  <li>• مفتاح E: التفاعل مع المنصات</li>
                  <li>• عجلة الفأرة: التكبير والتصغير</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-1">
                  {isAr ? 'التحكم على الأجهزة اللمسية:' : 'Touch & Mobile Controls:'}
                </h4>
                <p className="text-xs text-slate-400">
                  {isAr
                    ? 'استخدم عصا التحكم التناظرية الافتراضية في أسفل اليسار، وأزرار القفز والتفاعل في أسفل اليمين.'
                    : 'Use the analog virtual thumbstick on the bottom-left and the jump/action buttons on the bottom-right.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200">
                {isAr
                  ? 'ملاحظة: هذا النمط ثلاثي الأبعاد صُمم لمحاكاة تجربة علمية غامرة، مع الحفاظ على فصل تام عن أدوات الاستكشاف الفلكية الحقيقية المبنية على ملفات FITS.'
                  : 'Notice: This 3D adventure is an interactive educational simulation designed for NASA Space Apps Challenge, distinct from the real Level-2B FITS pipeline in the Explore lab.'}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                {isAr ? 'فهمت' : 'Understood'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
