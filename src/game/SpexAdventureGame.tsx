import React, { Suspense, useEffect, useState } from 'react';
import { SpexTaskStationGame } from './SpexTaskStationGame';
import { CosmicDetectiveGame } from './CosmicDetectiveGame';
import { ConstellationDotsGame } from './minigames/ConstellationDotsGame';
import { SpectrumMatchGame } from './minigames/SpectrumMatchGame';
import { SpotDifferenceBlinkGame } from './minigames/SpotDifferenceBlinkGame';
import { SlidingSkyPuzzleGame } from './minigames/SlidingSkyPuzzleGame';
import { STORY_CHAPTERS, StoryChapter } from './storyChapters';
import { useProgress } from '../progress/progressStore';
import { SpexPortrait } from '../spex/SpexPortrait';
import { Language, translations } from '../utils/translations';
import {
  Gamepad2,
  Box,
  BookOpen,
  Compass,
  ArrowLeft,
  ArrowRight,
  Lock,
  CheckCircle2,
  Sparkles,
  Play,
  Map,
  Award,
  Settings,
  Volume2,
  VolumeX,
  Pause,
  HelpCircle,
  Heart,
  Clock,
  Star,
  RotateCcw,
} from 'lucide-react';
import { gameAudio } from './utils/gameAudio';
import { Button, Modal } from '../design';

const LazySpex3DGame = React.lazy(() =>
  import('./3d/Spex3DGame').then((mod) => ({ default: mod.Spex3DGame }))
);

interface SpexAdventureGameProps {
  language: Language;
  onExitToExplore: (caseId?: string) => void;
  onBackToHome: () => void;
}

type GameScreenMode = 'menu' | 'map' | 'playing' | 'minigames' | '3d' | '2d' | 'cases';
type MiniGameId = 'constellation' | 'spectrum_match' | 'sliding_puzzle' | 'spot_difference';

const TUTORIAL_STORAGE_KEY = 'spex_game_tutorial_seen_v1';

function readTutorialSeen(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem(TUTORIAL_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeTutorialSeen(seen: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (seen) {
        window.localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
      } else {
        window.localStorage.removeItem(TUTORIAL_STORAGE_KEY);
      }
    }
  } catch {
    // ignore storage failure
  }
}

export const SpexAdventureGame: React.FC<SpexAdventureGameProps> = ({
  language,
  onExitToExplore,
  onBackToHome,
}) => {
  const isAr = language === 'ar';
  const t = translations[language];
  const {
    progress,
    rank,
    rankInfo,
    completeMiniGame,
    completeChapter,
  } = useProgress();

  const [viewMode, setViewMode] = useState<GameScreenMode>('menu');
  const [activeMiniGame, setActiveMiniGame] = useState<MiniGameId>('constellation');
  const [activeChapterNum, setActiveChapterNum] = useState<number>(1);
  const [attemptNonce, setAttemptNonce] = useState<number>(0);

  // Gameplay HUD state
  const [lives, setLives] = useState<number>(3);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => gameAudio.isEnabled());

  // Modals: Tutorial, Settings, Rank/Achievements, Level Complete
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [rankModalOpen, setRankModalOpen] = useState<boolean>(false);
  const [completionState, setCompletionState] = useState<{
    chapterNumber: number;
    stars: number;
    xpEarned: number;
  } | null>(null);

  const activeChapter =
    STORY_CHAPTERS.find((c) => c.chapterNumber === activeChapterNum) || STORY_CHAPTERS[0];

  const isChapterUnlocked = (ch: StoryChapter): boolean => {
    if (ch.chapterNumber === 1) return true;
    if (progress.completedChapters.includes(ch.chapterNumber)) return true;
    if (progress.completedChapters.includes(ch.chapterNumber - 1)) return true;
    return progress.xp >= ch.requiredXp;
  };

  const totalStarsEarned = STORY_CHAPTERS.reduce(
    (sum, ch) => sum + (progress.starsByChapter[ch.chapterNumber] || 0),
    0
  );
  const maxTotalStars = STORY_CHAPTERS.length * 3;
  const unlockedChaptersCount = STORY_CHAPTERS.filter(isChapterUnlocked).length;

  // Timer tick during active gameplay
  useEffect(() => {
    if (viewMode !== 'playing' || paused || tutorialOpen || completionState !== null) return;
    const id = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [viewMode, paused, tutorialOpen, completionState]);

  const formatTimer = (secs: number): string => {
    const mm = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const ss = (secs % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const launchChapter = (ch: StoryChapter) => {
    if (!isChapterUnlocked(ch)) return;
    gameAudio.playClick();
    setActiveChapterNum(ch.chapterNumber);
    setLives(3);
    setElapsedSeconds(0);
    setPaused(false);
    setCompletionState(null);
    setAttemptNonce((n) => n + 1);

    if (
      ch.activityType === 'constellation' ||
      ch.activityType === 'spectrum_match' ||
      ch.activityType === 'sliding_puzzle' ||
      ch.activityType === 'spot_difference'
    ) {
      setActiveMiniGame(ch.activityType);
      setViewMode('playing');
      if (!readTutorialSeen()) {
        setTutorialStep(0);
        setTutorialOpen(true);
      }
    } else if (ch.activityType === '3d') {
      setViewMode('3d');
    } else if (ch.activityType === 'explore') {
      completeChapter(ch.chapterNumber, ch.xpReward, 3);
      onExitToExplore(ch.targetCaseId || 'case-wise-0855');
    }
  };

  const handlePlayStory = () => {
    const nextChapter =
      STORY_CHAPTERS.find(
        (ch) => isChapterUnlocked(ch) && !progress.completedChapters.includes(ch.chapterNumber)
      ) || STORY_CHAPTERS[0];
    launchChapter(nextChapter);
  };

  const handleChapterOrMiniGameComplete = (
    gameId: MiniGameId,
    xpReward: number,
    starsEarned = 3
  ) => {
    const lifeAdjustedStars = Math.max(1, Math.min(starsEarned, lives));
    completeMiniGame(gameId, xpReward);

    if (viewMode === 'playing') {
      const res = completeChapter(
        activeChapter.chapterNumber,
        activeChapter.xpReward,
        lifeAdjustedStars
      );
      setCompletionState({
        chapterNumber: activeChapter.chapterNumber,
        stars: lifeAdjustedStars,
        xpEarned: res.newlyCompleted ? activeChapter.xpReward : xpReward,
      });
    } else {
      const matching = STORY_CHAPTERS.find((c) => c.activityType === gameId);
      if (matching && isChapterUnlocked(matching)) {
        completeChapter(matching.chapterNumber, 25, lifeAdjustedStars);
      }
    }
  };

  const handleAttemptWrong = () => {
    setLives((prev) => (prev > 1 ? prev - 1 : 3));
  };

  const dismissTutorial = () => {
    writeTutorialSeen(true);
    setTutorialOpen(false);
  };

  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const ForwardIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <div
      className={`relative w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4 ${
        isAr ? 'font-cairo' : 'font-sans'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top Game Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#070C18] p-2.5 rounded-2xl border border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono transition border border-slate-700 cursor-pointer whitespace-nowrap"
          >
            <BackIcon className="w-3.5 h-3.5" />
            <span>{isAr ? 'الرئيسية' : 'Home'}</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              data-testid="game-tab-menu"
              onClick={() => {
                gameAudio.playClick();
                setViewMode('menu');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                viewMode === 'menu'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isAr ? 'القائمة' : 'Menu'}</span>
            </button>

            <button
              type="button"
              data-testid="game-tab-story"
              onClick={() => {
                gameAudio.playClick();
                setViewMode('map');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                viewMode === 'map' || viewMode === 'playing'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>{t.gameMenuLevels}</span>
            </button>

            <button
              type="button"
              data-testid="game-tab-minigames"
              onClick={() => {
                gameAudio.playClick();
                setViewMode('minigames');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                viewMode === 'minigames'
                  ? 'bg-emerald-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>{t.gameMiniGamesTab}</span>
            </button>

            <button
              type="button"
              data-testid="game-tab-3d"
              onClick={() => {
                gameAudio.playClick();
                setViewMode('3d');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                viewMode === '3d'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>{t.gameStation3dTab}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                gameAudio.playClick();
                setViewMode('cases');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                viewMode === 'cases'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isAr ? 'ملفات القضايا' : 'Cases'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = gameAudio.toggle();
              setSoundEnabled(next);
            }}
            aria-label={t.gameHudSound}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center justify-center cursor-pointer transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={<Compass className="w-3.5 h-3.5" />}
            onClick={() => onExitToExplore()}
          >
            {isAr ? 'العارض الحقيقي' : 'Real Sky Lab'}
          </Button>
        </div>
      </div>

      {/* SCREEN 1: GAME MAIN MENU */}
      {viewMode === 'menu' && (
        <section className="rounded-2xl bg-[#070B16]/95 border border-white/10 p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-3">
                <SpexPortrait
                  mood="curious"
                  size={68}
                  interactive
                  alt="Mr. SPEX"
                  className="shrink-0 rounded-xl bg-amber-500/10 border border-amber-400/30 p-1"
                />
                <div className="space-y-1">
                  <div className="text-xs font-mono text-amber-400 font-semibold">
                    {t.gameStoryBannerTitle}
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
                    {isAr
                      ? 'سبيكس: رحلة البحث عن الإشارة الخافتة'
                      : 'SPEX: Hunt the Faint Signal'}
                  </h1>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                {t.gameStoryBannerDesc}
              </p>

              {/* Clean Unboxed Telemetry Summary */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300 tabular-nums pt-1">
                <span className="text-amber-300 font-semibold">
                  {rank} · {progress.xp} XP
                </span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span>
                  {totalStarsEarned}/{maxTotalStars} ★
                </span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span>
                  {progress.completedChapters.length}/{STORY_CHAPTERS.length}{' '}
                  {isAr ? 'فصول مكتملة' : 'chapters cleared'}
                </span>
              </div>
            </div>

            {/* 4 Primary Menu Actions */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
              <Button
                type="button"
                variant="primary"
                size="lg"
                data-testid="game-menu-play"
                icon={<Play className="w-4 h-4 fill-current" />}
                onClick={handlePlayStory}
              >
                {t.gameMenuPlay}
              </Button>

              <Button
                type="button"
                variant="cyan"
                size="md"
                data-testid="game-menu-levels"
                icon={<Map className="w-4 h-4" />}
                onClick={() => {
                  gameAudio.playClick();
                  setViewMode('map');
                }}
              >
                {t.gameMenuLevels}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                data-testid="game-menu-rank"
                icon={<Award className="w-4 h-4 text-amber-400" />}
                onClick={() => {
                  gameAudio.playClick();
                  setRankModalOpen(true);
                }}
              >
                {t.gameMenuRank}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="md"
                data-testid="game-menu-settings"
                icon={<Settings className="w-4 h-4" />}
                onClick={() => {
                  gameAudio.playClick();
                  setSettingsOpen(true);
                }}
              >
                {t.gameMenuSettings}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* SCREEN 2: LEVEL SELECT MAP (6 CHAPTERS WITH 0-3 STARS) */}
      {viewMode === 'map' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#090F1E]/95 border border-white/10 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold text-white">{t.gameMenuLevels}</h2>
              <p className="text-xs text-slate-300">{t.gameStoryBannerDesc}</p>
            </div>
            <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
              <span className="text-sky-300 font-semibold">
                {unlockedChaptersCount}/{STORY_CHAPTERS.length} {isAr ? 'مفتوح' : 'unlocked'}
              </span>
              <span className="text-amber-300 font-semibold">
                {totalStarsEarned}/{maxTotalStars} ★
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STORY_CHAPTERS.map((ch) => {
              const unlocked = isChapterUnlocked(ch);
              const completed = progress.completedChapters.includes(ch.chapterNumber);
              const stars = progress.starsByChapter[ch.chapterNumber] || (completed ? 3 : 0);

              return (
                <article
                  key={ch.chapterNumber}
                  data-testid={`story-chapter-${ch.chapterNumber}`}
                  className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition ${
                    !unlocked
                      ? 'bg-[#060913]/85 border-white/8 opacity-75'
                      : completed
                      ? 'bg-emerald-950/20 border-emerald-500/35'
                      : 'bg-[#0A1020] border-white/15 hover:border-amber-400/50'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                      <span className="text-amber-300 font-bold">
                        {isAr ? `فصل ${ch.chapterNumber}` : `CH ${ch.chapterNumber}`} · +{ch.xpReward} XP
                      </span>

                      <div className="flex items-center gap-0.5" aria-label={`${stars} / 3 stars`}>
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <h3 className="font-display text-base font-bold text-white">
                      {isAr ? ch.titleAr : ch.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isAr ? ch.briefingAr : ch.briefing}
                    </p>
                    <blockquote className="text-xs italic text-amber-200/90 bg-black/30 rounded-xl px-3 py-2 border border-white/5">
                      {isAr ? ch.spexQuoteAr : ch.spexQuote}
                    </blockquote>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-400">
                      {unlocked
                        ? completed
                          ? isAr
                            ? 'مكتمل'
                            : 'Cleared'
                          : isAr
                          ? 'جاهز للعب'
                          : 'Ready'
                        : `${t.gameLockedByRank}: ${ch.requiredRank}`}
                    </span>

                    <Button
                      type="button"
                      variant={unlocked ? 'primary' : 'ghost'}
                      size="sm"
                      disabled={!unlocked}
                      onClick={() => launchChapter(ch)}
                      icon={unlocked ? <Play className="w-3.5 h-3.5 fill-current" /> : <Lock className="w-3.5 h-3.5" />}
                    >
                      {unlocked
                        ? isAr
                          ? 'ابدأ الفصل'
                          : 'Play Chapter'
                        : isAr
                        ? 'مقفل'
                        : 'Locked'}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* SCREEN 3: ACTIVE CHAPTER GAMEPLAY + UNOBTRUSIVE HUD */}
      {viewMode === 'playing' && (
        <div className="space-y-4">
          {/* Gameplay HUD */}
          <div
            data-testid="game-hud"
            className="rounded-2xl bg-[#090F1E] border border-sky-400/25 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
              <span className="font-bold text-white">
                {isAr ? `فصل ${activeChapter.chapterNumber}` : `CH ${activeChapter.chapterNumber}`}:{' '}
                <span className="text-sky-300">
                  {(isAr ? activeChapter.titleAr : activeChapter.title).replace(/^Chapter \d+:\s*|^الفصل [٠-٩\d]+:\s*/u, '')}
                </span>
              </span>
              <span className="text-amber-300 font-semibold">
                {t.gameHudScore}: {progress.xp} XP
              </span>
              <span className="inline-flex items-center gap-1 text-rose-300" aria-label={t.gameHudLives}>
                <span className="text-slate-400 me-1">{t.gameHudLives}:</span>
                {[1, 2, 3].map((idx) => (
                  <Heart
                    key={idx}
                    className={`w-3.5 h-3.5 ${
                      idx <= lives ? 'text-rose-400 fill-rose-400' : 'text-slate-700'
                    }`}
                  />
                ))}
              </span>
              <span className="inline-flex items-center gap-1 text-slate-200">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                {t.gameHudTimer}: {formatTimer(elapsedSeconds)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="game-hud-help"
                onClick={() => {
                  gameAudio.playClick();
                  setTutorialStep(0);
                  setTutorialOpen(true);
                }}
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
                <span>{t.gameHudHelp}</span>
              </button>

              <button
                type="button"
                data-testid="game-hud-pause"
                onClick={() => {
                  gameAudio.playClick();
                  setPaused(true);
                }}
                className="min-h-[34px] px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>{t.gameHudPause}</span>
              </button>
            </div>
          </div>

          {/* Active Mini-Game Surface */}
          <div key={`${activeChapter.chapterNumber}-${attemptNonce}`}>
            {activeMiniGame === 'constellation' && (
              <ConstellationDotsGame
                language={language}
                onComplete={(xp, stars) =>
                  handleChapterOrMiniGameComplete('constellation', xp, stars)
                }
                onAttemptWrong={handleAttemptWrong}
              />
            )}
            {activeMiniGame === 'spectrum_match' && (
              <SpectrumMatchGame
                language={language}
                onComplete={(xp, stars) =>
                  handleChapterOrMiniGameComplete('spectrum_match', xp, stars)
                }
                onAttemptWrong={handleAttemptWrong}
              />
            )}
            {activeMiniGame === 'sliding_puzzle' && (
              <SlidingSkyPuzzleGame
                language={language}
                onComplete={(xp, stars) =>
                  handleChapterOrMiniGameComplete('sliding_puzzle', xp, stars)
                }
                onAttemptWrong={handleAttemptWrong}
              />
            )}
            {activeMiniGame === 'spot_difference' && (
              <SpotDifferenceBlinkGame
                language={language}
                onComplete={(xp, stars) =>
                  handleChapterOrMiniGameComplete('spot_difference', xp, stars)
                }
                onAttemptWrong={handleAttemptWrong}
              />
            )}
          </div>
        </div>
      )}

      {/* SCREEN 4: QUICK-PLAY MINI-GAMES ARCADE (ALL 4 PUZZLES OPEN) */}
      {viewMode === 'minigames' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {(
              [
                {
                  id: 'constellation' as const,
                  title: isAr ? '١) توصيل نجوم الكوكبة' : '1) Constellation Dots',
                  xp: 75,
                },
                {
                  id: 'spectrum_match' as const,
                  title: isAr ? '٢) مطابقة الطيف والجزيء' : '2) Spectrum Match',
                  xp: 90,
                },
                {
                  id: 'sliding_puzzle' as const,
                  title: isAr ? '٣) ترتيب لوحة السماء' : '3) Sliding Sky Puzzle',
                  xp: 85,
                },
                {
                  id: 'spot_difference' as const,
                  title: isAr ? '٤) اصطياد الحركة بالوميض' : '4) Spot-the-Difference',
                  xp: 100,
                },
              ]
            ).map((mg) => {
              const cleared = progress.completedMiniGames.includes(mg.id);
              const active = activeMiniGame === mg.id;
              return (
                <button
                  key={mg.id}
                  type="button"
                  data-testid={`minigame-select-${mg.id}`}
                  onClick={() => {
                    gameAudio.playClick();
                    setActiveMiniGame(mg.id);
                  }}
                  className={`text-start rounded-2xl p-3.5 border transition cursor-pointer flex items-center justify-between gap-2 ${
                    active
                      ? 'bg-sky-500/15 border-sky-400 text-white'
                      : 'bg-[#090F1E] border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold">{mg.title}</div>
                    <div className="text-xs font-mono text-amber-300 mt-0.5 tabular-nums">
                      +{mg.xp} XP
                    </div>
                  </div>
                  {cleared && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {activeMiniGame === 'constellation' && (
            <ConstellationDotsGame
              language={language}
              onComplete={(xp, stars) => handleChapterOrMiniGameComplete('constellation', xp, stars)}
            />
          )}
          {activeMiniGame === 'spectrum_match' && (
            <SpectrumMatchGame
              language={language}
              onComplete={(xp, stars) => handleChapterOrMiniGameComplete('spectrum_match', xp, stars)}
            />
          )}
          {activeMiniGame === 'sliding_puzzle' && (
            <SlidingSkyPuzzleGame
              language={language}
              onComplete={(xp, stars) => handleChapterOrMiniGameComplete('sliding_puzzle', xp, stars)}
            />
          )}
          {activeMiniGame === 'spot_difference' && (
            <SpotDifferenceBlinkGame
              language={language}
              onComplete={(xp, stars) => handleChapterOrMiniGameComplete('spot_difference', xp, stars)}
            />
          )}
        </div>
      )}

      {/* LAZY 3D SPACE STATION */}
      {viewMode === '3d' && (
        <Suspense
          fallback={
            <div className="rounded-3xl bg-[#070B16] border border-white/10 p-12 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
              <div className="text-sm font-mono text-slate-300">
                {isAr ? 'جاري تحميل محطة الفضاء ثلاثية الأبعاد...' : 'Loading 3D Space Station module...'}
              </div>
            </div>
          }
        >
          <LazySpex3DGame
            language={language}
            onBackToExplore={onExitToExplore}
            onBackToHome={onBackToHome}
          />
        </Suspense>
      )}

      {viewMode === '2d' && (
        <SpexTaskStationGame
          language={language}
          onExitToExplore={onExitToExplore}
          onBackToHome={onBackToHome}
        />
      )}

      {viewMode === 'cases' && (
        <CosmicDetectiveGame
          language={language}
          onExitToExplore={onExitToExplore}
          onBackToHome={onBackToHome}
        />
      )}

      {/* FIRST-TIME 3-STEP SKIPPABLE TUTORIAL MODAL */}
      <Modal
        isOpen={tutorialOpen}
        onClose={dismissTutorial}
        title={
          tutorialStep === 0
            ? t.gameTutorialStep1Title
            : tutorialStep === 1
            ? t.gameTutorialStep2Title
            : t.gameTutorialStep3Title
        }
        maxWidthClass="max-w-md"
        isRtl={isAr}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <SpexPortrait mood="explaining" size={56} className="shrink-0" alt="Mr. SPEX" />
            <p className="text-sm text-slate-200 leading-relaxed">
              {tutorialStep === 0
                ? t.gameTutorialStep1Body
                : tutorialStep === 1
                ? t.gameTutorialStep2Body
                : t.gameTutorialStep3Body}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={dismissTutorial}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              {isAr ? 'تخطي الدليل' : 'Skip Tutorial'}
            </button>
            <div className="flex items-center gap-2">
              {tutorialStep < 2 ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={<ForwardIcon className="w-3.5 h-3.5" />}
                  iconPosition="end"
                  onClick={() => setTutorialStep((s) => s + 1)}
                >
                  {isAr ? 'التالي' : 'Next'}
                </Button>
              ) : (
                <Button type="button" variant="primary" size="sm" onClick={dismissTutorial}>
                  {isAr ? 'ابدأ اللعب!' : 'Start Mission'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* PAUSE OVERLAY MODAL */}
      <Modal
        isOpen={paused}
        onClose={() => setPaused(false)}
        title={t.gamePauseTitle}
        maxWidthClass="max-w-sm"
        isRtl={isAr}
      >
        <div className="flex flex-col gap-2.5">
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<Play className="w-4 h-4 fill-current" />}
            onClick={() => {
              gameAudio.playClick();
              setPaused(false);
            }}
          >
            {t.gamePauseResume}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={() => {
              setPaused(false);
              launchChapter(activeChapter);
            }}
          >
            {t.gamePauseRestart}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            icon={<Map className="w-4 h-4" />}
            onClick={() => {
              gameAudio.playClick();
              setPaused(false);
              setViewMode('map');
            }}
          >
            {t.gamePauseBackMap}
          </Button>
        </div>
      </Modal>

      {/* LEVEL COMPLETE MODAL */}
      <Modal
        isOpen={completionState !== null}
        onClose={() => setCompletionState(null)}
        title={t.gameCompleteTitle}
        maxWidthClass="max-w-sm"
        isRtl={isAr}
      >
        {completionState && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="text-xs font-mono text-slate-400">{t.gameCompleteStarsLabel}</div>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`w-6 h-6 ${
                        s <= completionState.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="text-end font-mono tabular-nums">
                <div className="text-xs text-slate-400">{t.xpSourceGame}</div>
                <div className="text-xl font-bold text-amber-300">+{completionState.xpEarned} XP</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {(() => {
                const nextCh = STORY_CHAPTERS.find(
                  (c) => c.chapterNumber === completionState.chapterNumber + 1
                );
                if (!nextCh) return null;
                return (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    icon={<ForwardIcon className="w-4 h-4" />}
                    iconPosition="end"
                    onClick={() => launchChapter(nextCh)}
                  >
                    {t.gameCompleteNextChapter}
                  </Button>
                );
              })()}
              <Button
                type="button"
                variant="secondary"
                size="md"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={() => launchChapter(activeChapter)}
              >
                {t.gameCompleteReplay}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  setCompletionState(null);
                  setViewMode('map');
                }}
              >
                {t.gamePauseBackMap}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* RANK & ACHIEVEMENTS MODAL */}
      <Modal
        isOpen={rankModalOpen}
        onClose={() => setRankModalOpen(false)}
        title={t.gameMenuRank}
        maxWidthClass="max-w-lg"
        isRtl={isAr}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between font-mono text-xs tabular-nums">
            <span className="text-amber-300 font-bold text-sm">
              {t.rankLabel}: {rank}
            </span>
            <span className="text-sky-300 font-bold">{progress.xp} XP</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-amber-400"
              style={{ width: `${Math.round(rankInfo.progressRatio * 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs tabular-nums pt-1">
            <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
              <div className="text-slate-400">{t.xpSourceLearning}</div>
              <div className="text-sky-300 font-bold text-base mt-0.5">
                {progress.xpBreakdown.learning}
              </div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
              <div className="text-slate-400">{t.xpSourceSolving}</div>
              <div className="text-emerald-300 font-bold text-base mt-0.5">
                {progress.xpBreakdown.solving}
              </div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
              <div className="text-slate-400">{t.xpSourceGame}</div>
              <div className="text-amber-300 font-bold text-base mt-0.5">
                {progress.xpBreakdown.game}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {isAr ? 'الإنجازات المفتوحة:' : 'Unlocked badges:'}{' '}
            <span className="text-white font-semibold tabular-nums">{progress.achievements.length}</span>
          </div>
        </div>
      </Modal>

      {/* SETTINGS MODAL */}
      <Modal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={t.gameSettingsTitle}
        maxWidthClass="max-w-sm"
        isRtl={isAr}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-200">{t.gameSettingsSoundLabel}</span>
            <Button
              type="button"
              variant={soundEnabled ? 'cyan' : 'secondary'}
              size="sm"
              onClick={() => {
                const next = gameAudio.toggle();
                setSoundEnabled(next);
              }}
            >
              {soundEnabled ? (isAr ? 'مُفعّل' : 'On') : isAr ? 'صامت' : 'Off'}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <span className="text-sm text-slate-200">{t.gameSettingsTutorialReset}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                writeTutorialSeen(false);
                setSettingsOpen(false);
              }}
            >
              {isAr ? 'إعادة الضبط' : 'Reset'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SpexAdventureGame;
