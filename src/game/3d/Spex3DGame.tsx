import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine3D } from './GameEngine3D';
import { InteractiveTerminal } from './StationBuilder';
import { GameHUD } from './GameHUD';
import { PuzzleModal } from './PuzzleModal';
import { MobileControls } from './MobileControls';
import { SpexPortrait } from '../../spex/SpexPortrait';
import { gameAudio } from '../utils/gameAudio';
import { 
  X, HelpCircle, BookOpen, RotateCcw, Award, CheckCircle, 
  Sparkles, Compass, Shield, User, Play, Volume2, VolumeX,
  Maximize2, Minimize2, LogOut, ArrowRight, ArrowLeft
} from 'lucide-react';

interface Spex3DGameProps {
  onBackToExplore?: () => void;
  onBackToHome?: () => void;
  language?: 'en' | 'ar';
}

export const Spex3DGame: React.FC<Spex3DGameProps> = ({
  onBackToExplore,
  onBackToHome,
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

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    return localStorage.getItem('spex_tutorial_seen') !== 'true';
  });
  const [tutorialStep, setTutorialStep] = useState<number>(1);
  const [tutorialDistance, setTutorialDistance] = useState<number>(0);
  const [tutorialRotation, setTutorialRotation] = useState<number>(0);
  const [targetDistance, setTargetDistance] = useState<number>(4.0);
  const [targetBearing, setTargetBearing] = useState<number>(0);
  const [isPointerLocked, setIsPointerLocked] = useState<boolean>(false);

  // Pause Menu state
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [graphicsQuality, setGraphicsQuality] = useState<'high' | 'standard'>('high');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Current Mission logic
  const currentMissionNumber = Math.min(
    5,
    [1, 2, 3, 4, 5].find((m) => !completedMissions.includes(m)) || 5
  );

  // Refs for stable callbacks across engine lifetime
  const currentMissionNumberRef = useRef(currentMissionNumber);
  currentMissionNumberRef.current = currentMissionNumber;

  const showTutorialRef = useRef(showTutorial);
  showTutorialRef.current = showTutorial;

  const tutorialStepRef = useRef(tutorialStep);
  tutorialStepRef.current = tutorialStep;

  // Active Terminal & Modal
  const [nearestTerminal, setNearestTerminal] = useState<InteractiveTerminal | null>(null);
  const [activeModalMission, setActiveModalMission] = useState<number | null>(null);

  // Dialogues & Toasts
  const [spexDialogue, setSpexDialogue] = useState<{
    text: string;
    mood: string;
  } | null>({
    text: isAr
      ? 'أهلاً بك في محطة SPHEREx الفضائية! استخدم مفاتيح WASD أو لوحة اللمس واتبع الشعاع الليزري السماوي للوصول إلى محطات التحليل.'
      : 'Welcome aboard the SPHEREx Research Station! Use WASD to navigate and follow the cyan light beacon to your active mission terminal.',
    mood: 'greeting',
  });

  // UI Overlays
  const [notebookOpen, setNotebookOpen] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
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

  // Sync active beacon with current mission without tearing down the 3D world
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setActiveMission(currentMissionNumber);
      const d = engineRef.current.getDistanceToTerminal(currentMissionNumber);
      const b = engineRef.current.getBearingToTerminal(currentMissionNumber);
      setTargetDistance(d);
      setTargetBearing(b);
    }
  }, [currentMissionNumber]);

  // Handle Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Live tutorial metrics tracker callback
  const handleTutorialMetrics = useCallback((dist: number, rotDeg: number) => {
    if (!showTutorialRef.current) return;

    if (tutorialStepRef.current === 2) {
      setTutorialDistance((prev) => {
        const next = prev + dist;
        if (next >= 2.5 && prev < 2.5) {
          gameAudio.playSuccess();
          setTimeout(() => setTutorialStep(3), 300);
        }
        return next;
      });
    } else if (tutorialStepRef.current === 3) {
      setTutorialRotation((prev) => {
        const next = prev + rotDeg;
        if (next >= 60 && prev < 60) {
          gameAudio.playSuccess();
          setTimeout(() => setTutorialStep(4), 300);
        }
        return next;
      });
    }
  }, []);

  const handleTutorialMetricsRef = useRef(handleTutorialMetrics);
  handleTutorialMetricsRef.current = handleTutorialMetrics;

  // Keyboard Escape and Space listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeModalMission !== null) {
          setActiveModalMission(null);
        } else if (notebookOpen) {
          setNotebookOpen(false);
        } else if (helpOpen) {
          setHelpOpen(false);
        } else {
          setIsPaused((prev) => !prev);
          engineRef.current?.unlockPointer();
        }
      } else if (e.code === 'Space') {
        if (showTutorialRef.current && tutorialStepRef.current === 1) {
          setTutorialStep(2);
          gameAudio.playClick();
        } else if (showTutorialRef.current && tutorialStepRef.current === 5) {
          setShowTutorial(false);
          localStorage.setItem('spex_tutorial_seen', 'true');
          gameAudio.playSuccess();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalMission, notebookOpen, helpOpen]);

  // Initialize Three.js Engine ONCE on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine3D(containerRef.current, {
      onTerminalNear: (term) => {
        setNearestTerminal(term);
      },
      onTerminalInteract: (term) => {
        if (showTutorialRef.current && tutorialStepRef.current === 4) {
          gameAudio.playSuccess();
          setTutorialStep(5);
        }
        setActiveModalMission(term.missionNumber);
      },
      onPlayerPositionChange: () => {
        if (engineRef.current) {
          const d = engineRef.current.getDistanceToTerminal(currentMissionNumberRef.current);
          const b = engineRef.current.getBearingToTerminal(currentMissionNumberRef.current);
          setTargetDistance(d);
          setTargetBearing(b);
        }
      },
      onTutorialMetrics: (dist, rotDeg) => {
        handleTutorialMetricsRef.current(dist, rotDeg);
      },
      onPointerLockChange: (locked) => {
        setIsPointerLocked(locked);
      },
    });

    engineRef.current = engine;
    engine.setActiveMission(currentMissionNumberRef.current);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Pause engine when modal or pause menu is open
  useEffect(() => {
    const isAnyModalOpen = activeModalMission !== null || notebookOpen || helpOpen || isPaused;
    if (engineRef.current) {
      engineRef.current.setPaused(isAnyModalOpen);
      if (isAnyModalOpen) {
        engineRef.current.unlockPointer();
      }
    }
  }, [activeModalMission, notebookOpen, helpOpen, isPaused]);

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
        : `Outstanding work, ${cadetName}! Mission 0${missionNum} telemetry successfully validated. Follow the beacon to your next assignment!`,
      mood: 'proud',
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
    setIsPaused(false);
    if (engineRef.current) {
      engineRef.current.setActiveMission(1);
    }
  };

  const closeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('spex_tutorial_seen', 'true');
    gameAudio.playClick();
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[90vh] min-h-[640px] bg-[#070a12] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl select-none"
    >
      {/* 3D Canvas Container */}
      <div className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Heads Up Display */}
      <GameHUD
        cadetName={cadetName}
        score={score}
        completedMissions={completedMissions}
        currentMissionNumber={currentMissionNumber}
        nearestTerminal={nearestTerminal}
        targetDistance={targetDistance}
        targetBearing={targetBearing}
        onInteract={() => {
          if (nearestTerminal) {
            if (showTutorial && tutorialStep === 4) {
              gameAudio.playSuccess();
              setTutorialStep(5);
            }
            setActiveModalMission(nearestTerminal.missionNumber);
          }
        }}
        onOpenNotebook={() => setNotebookOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenPause={() => setIsPaused(true)}
        onResetGame={handleResetGame}
        onExitToExplore={onBackToExplore}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        language={language}
        onToggleLanguage={() => setLanguage(language === 'en' ? 'ar' : 'en')}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        spexDialogue={spexDialogue}
        isTouchDevice={isTouchDevice}
        showTutorial={showTutorial}
        tutorialStep={tutorialStep}
        tutorialDistance={tutorialDistance}
        tutorialRotation={tutorialRotation}
        onTutorialNext={() => {
          if (tutorialStep === 1) {
            setTutorialStep(2);
            gameAudio.playClick();
          } else if (tutorialStep === 5) {
            setShowTutorial(false);
            localStorage.setItem('spex_tutorial_seen', 'true');
            gameAudio.playSuccess();
          }
        }}
        onTutorialSkip={() => {
          setShowTutorial(false);
          localStorage.setItem('spex_tutorial_seen', 'true');
          gameAudio.playClick();
        }}
        isPointerLocked={isPointerLocked}
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
              if (showTutorial && tutorialStep === 4) {
                gameAudio.playSuccess();
                setTutorialStep(5);
              }
              setActiveModalMission(nearestTerminal.missionNumber);
            }
          }}
          canInteract={nearestTerminal !== null}
          language={language}
          onRotateCamera={(deltaYawRad) => {
            if (engineRef.current) {
              engineRef.current.rotateCamera(deltaYawRad, 0);
            }
          }}
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

      {/* FULL PAUSE MENU MODAL */}
      {isPaused && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsPaused(false)}
        >
          <div 
            className="w-full max-w-md bg-[#0b1120] border border-cyan-500/50 rounded-3xl p-6 text-slate-100 shadow-2xl relative"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold font-mono">
                  II
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isAr ? 'قائمة الإيقاف المؤقت' : 'Mission Paused'}
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {cadetName} · XP {score}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPaused(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                title="Resume [ESC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pause Actions */}
            <div className="py-5 space-y-2.5 text-xs font-mono">
              {/* Resume Button */}
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick();
                  setIsPaused(false);
                }}
                className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                <Play className="w-4 h-4" />
                <span>{isAr ? 'استئناف اللعب' : 'Resume Mission'}</span>
              </button>

              {/* View Tutorial Button */}
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick();
                  setIsPaused(false);
                  setTutorialStep(1);
                  setTutorialDistance(0);
                  setTutorialRotation(0);
                  setShowTutorial(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  <span>{isAr ? 'إعادة مشاهدة الدليل الإرشادي' : 'Replay Flight Tutorial'}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {/* Audio Toggle */}
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick();
                  setIsMuted(!isMuted);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                  <span>{isAr ? 'المؤثرات الصوتية' : 'Sound Effects'}</span>
                </div>
                <span className={isMuted ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {isMuted ? (isAr ? 'معطل' : 'MUTED') : (isAr ? 'مفعل' : 'ENABLED')}
                </span>
              </button>

              {/* Graphics Toggle */}
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick();
                  setGraphicsQuality((prev) => (prev === 'high' ? 'standard' : 'high'));
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{isAr ? 'جودة الرسومات' : 'Visual Quality'}</span>
                </div>
                <span className="text-amber-400 font-bold uppercase">
                  {graphicsQuality}
                </span>
              </button>

              {/* Restart Mission */}
              <button
                type="button"
                onClick={() => {
                  handleResetGame();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-200 flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  <span>{isAr ? 'إعادة ضبط المهمات من البداية' : 'Reset All Missions'}</span>
                </div>
                <span className="text-[10px] text-slate-500">0 / 5</span>
              </button>

              {/* Exit to Observatory Lab */}
              {onBackToExplore && (
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    setIsPaused(false);
                    onBackToExplore();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-200 font-bold flex items-center justify-center gap-2 transition cursor-pointer mt-3"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isAr ? 'الخروج إلى مختبر SPHEREx الفلكي' : 'Exit to SPHEREx Science Lab'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logbook / Evidence Modal */}
      {notebookOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setNotebookOpen(false)}
        >
          <div 
            className="w-full max-w-2xl bg-[#0b1120] border border-cyan-500/40 rounded-3xl p-6 text-slate-100 shadow-2xl relative"
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
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
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
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-mono cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isAr ? 'إعادة ضبط التقدم' : 'Reset Mission Progress'}</span>
              </button>

              <button
                type="button"
                onClick={() => setNotebookOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
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
            className="w-full max-w-xl bg-[#0b1120] border border-cyan-500/40 rounded-3xl p-6 text-slate-100 shadow-2xl relative"
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
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
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
                  <li>• مفتاح ESC: الإيقاف المؤقت</li>
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
                  ? 'ملاحظة: هذا النمط ثلاثي الأبعاد صُمم لمحاكاة تجربة علمية غامرة، مع الحفاظ على فصل تام عن أدوات الاستكشاف الفلكية الحقيقية المبنية على ملفات FITS في صفحة Explore.'
                  : 'Notice: This 3D adventure is an interactive educational simulation designed for NASA Space Apps Challenge, distinct from the real Level-2B FITS pipeline in the Explore lab.'}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
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
