import React, { useEffect, useState } from 'react';
import {
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Clock,
  Award,
  BookOpen,
  Gamepad2,
  Compass,
  HelpCircle,
  Lock,
  Unlock,
  Lightbulb,
  RotateCcw,
  Check,
  Map,
} from 'lucide-react';
import { Language, translations } from '../utils/translations';
import { SpexPortrait } from '../spex/SpexPortrait';
import { ACADEMY_LEVELS, AcademyQuestion } from '../academy/academyData';
import { AcademyDiagram } from '../academy/AcademyDiagram';
import { useProgress } from '../progress/progressStore';
import { gameAudio } from '../game/utils/gameAudio';
import { ScienceTerm } from './ScienceTerm';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from '../design';

interface AcademyViewProps {
  language: Language;
  onOpenTargetInViewer: (caseId: string) => void;
  onGoToPlay: () => void;
}

type AcademyMode = 'map' | 'lesson' | 'exam' | 'results';

export const ACADEMY_SESSION_KEY = 'spex_academy_session_v1';

interface AcademySessionSnapshot {
  mode: AcademyMode;
  selectedLevelId: number;
  lessonStep: number;
  previewAllLevels: boolean;
  answers: Record<string, number>;
}

function loadAcademySession(completedLevels: number[]): AcademySessionSnapshot {
  const firstIncomplete = ACADEMY_LEVELS.find((l) => !completedLevels.includes(l.levelId));
  const fallbackLevelId = firstIncomplete ? firstIncomplete.levelId : 0;
  const fallback: AcademySessionSnapshot = {
    mode: 'map',
    selectedLevelId: fallbackLevelId,
    lessonStep: 0,
    previewAllLevels: false,
    answers: {},
  };
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return fallback;
    const raw = window.sessionStorage.getItem(ACADEMY_SESSION_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AcademySessionSnapshot> | null;
    if (!parsed || typeof parsed !== 'object') return fallback;

    const validModes: AcademyMode[] = ['map', 'lesson', 'exam', 'results'];
    const mode: AcademyMode =
      typeof parsed.mode === 'string' && validModes.includes(parsed.mode as AcademyMode)
        ? (parsed.mode as AcademyMode)
        : 'map';

    const lvlExists = ACADEMY_LEVELS.some((l) => l.levelId === parsed.selectedLevelId);
    const selectedLevelId = lvlExists ? (parsed.selectedLevelId as number) : fallbackLevelId;
    const lvl = ACADEMY_LEVELS.find((l) => l.levelId === selectedLevelId) || ACADEMY_LEVELS[0];
    const maxSteps = Math.max(0, lvl.sections.length);
    const lessonStep =
      typeof parsed.lessonStep === 'number' && Number.isInteger(parsed.lessonStep)
        ? Math.max(0, Math.min(parsed.lessonStep, maxSteps))
        : 0;

    const cleanAnswers: Record<string, number> = {};
    if (parsed.answers && typeof parsed.answers === 'object') {
      for (const [k, v] of Object.entries(parsed.answers)) {
        if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 10) {
          cleanAnswers[k] = v;
        }
      }
    }

    return {
      mode,
      selectedLevelId,
      lessonStep,
      previewAllLevels: Boolean(parsed.previewAllLevels),
      answers: cleanAnswers,
    };
  } catch {
    return fallback;
  }
}

export const AcademyView: React.FC<AcademyViewProps> = ({
  language,
  onOpenTargetInViewer,
  onGoToPlay,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  const { progress, rank, rankInfo, completeAcademyLevel } = useProgress();

  const [initialSession] = useState<AcademySessionSnapshot>(() =>
    loadAcademySession(progress.completedLevels)
  );
  const [mode, setMode] = useState<AcademyMode>(initialSession.mode);
  const [previewAllLevels, setPreviewAllLevels] = useState<boolean>(
    initialSession.previewAllLevels
  );
  const [lessonStep, setLessonStep] = useState<number>(initialSession.lessonStep);
  const [selectedLevelId, setSelectedLevelId] = useState<number>(initialSession.selectedLevelId);

  // Practice micro-check state inside lesson
  const [practiceChoice, setPracticeChoice] = useState<Record<number, number>>({});
  const [practiceChecked, setPracticeChecked] = useState<Record<number, boolean>>({});
  const [showPracticeHint, setShowPracticeHint] = useState<Record<number, boolean>>({});

  // Exam state
  const [answers, setAnswers] = useState<Record<string, number>>(initialSession.answers);
  const [lastEarnedXp, setLastEarnedXp] = useState<number>(0);
  const [examPassedLastRun, setExamPassedLastRun] = useState<boolean>(false);

  // Safely debounce Academy UI session state persistence so "Try it in Explore" never resets exam/lesson progress
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const payload: AcademySessionSnapshot = {
            mode,
            selectedLevelId,
            lessonStep,
            previewAllLevels,
            answers,
          };
          window.sessionStorage.setItem(ACADEMY_SESSION_KEY, JSON.stringify(payload));
        }
      } catch {
        // ignore storage restrictions
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [mode, selectedLevelId, lessonStep, previewAllLevels, answers]);

  const activeLevel =
    ACADEMY_LEVELS.find((l) => l.levelId === selectedLevelId) || ACADEMY_LEVELS[0];
  const levelCompleted = progress.completedLevels.includes(activeLevel.levelId);
  const completedCount = ACADEMY_LEVELS.filter((l) =>
    progress.completedLevels.includes(l.levelId)
  ).length;
  const courseRatio = ACADEMY_LEVELS.length > 0 ? completedCount / ACADEMY_LEVELS.length : 0;

  const isLevelUnlocked = (levelId: number): boolean => {
    if (previewAllLevels || levelId === 0) return true;
    if (progress.completedLevels.includes(levelId)) return true;
    return progress.completedLevels.includes(levelId - 1);
  };

  const isQuestionSolved = (q: AcademyQuestion): boolean => {
    if (q.type === 'viewer_action') {
      return Boolean(progress.viewerActions[q.actionKey]);
    }
    return answers[q.id] === q.correctIndex;
  };

  const solvedCount = activeLevel.questions.filter(isQuestionSolved).length;
  const allSolved = solvedCount === activeLevel.questions.length;

  const handleOpenLevel = (levelId: number, targetMode: 'lesson' | 'exam' = 'lesson') => {
    if (!isLevelUnlocked(levelId)) return;
    gameAudio.playClick();
    setSelectedLevelId(levelId);
    setLessonStep(0);
    setMode(targetMode);
    setLastEarnedXp(0);
  };

  const handleFinishExam = () => {
    if (allSolved) {
      const res = completeAcademyLevel(activeLevel.levelId, activeLevel.xpReward);
      gameAudio.playSuccess();
      setLastEarnedXp(res.newlyCompleted ? activeLevel.xpReward : 0);
      setExamPassedLastRun(true);
    } else {
      gameAudio.playClick();
      setLastEarnedXp(0);
      setExamPassedLastRun(false);
    }
    setMode('results');
  };

  const handleRetryExam = () => {
    gameAudio.playClick();
    // Clear MCQ answers for the current level so learner can retry cleanly
    setAnswers((prev) => {
      const next = { ...prev };
      for (const q of activeLevel.questions) {
        if (q.type === 'mcq') delete next[q.id];
      }
      return next;
    });
    setMode('exam');
  };

  const nextLevel = ACADEMY_LEVELS.find((l) => l.levelId === activeLevel.levelId + 1) ?? null;

  const BackArrow = isRtl ? ArrowRight : ArrowLeft;
  const ForwardArrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <ErrorBoundary
      title={t.academyBoundaryTitle}
      description={t.academyBoundaryHint}
      retryLabel={t.academyBackToMapBtn}
      resetKey={`${mode}-${selectedLevelId}-${lessonStep}`}
      onRetry={() => {
        try {
          window.sessionStorage?.removeItem(ACADEMY_SESSION_KEY);
        } catch {}
        setLessonStep(0);
        setSelectedLevelId(ACADEMY_LEVELS[0].levelId);
        setMode('map');
      }}
    >
    <div
      className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Top Academy Header & Rank/Course Progress */}
      <section className="rounded-2xl bg-[#090F1E]/95 border border-white/10 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <SpexPortrait
              mood={
                mode === 'results' && examPassedLastRun
                  ? 'eureka'
                  : mode === 'map'
                  ? 'explaining'
                  : activeLevel.spexMood
              }
              size={72}
              interactive
              alt="Mr. SPEX Teacher"
              className="shrink-0 rounded-xl bg-amber-500/10 border border-amber-400/25 p-1"
            />
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-semibold">
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>{t.academyTitle}</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
                {mode === 'map'
                  ? t.academyCourseMapTitle
                  : isRtl
                  ? activeLevel.titleAr
                  : activeLevel.title}
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                {mode === 'map'
                  ? t.academySubtitle
                  : isRtl
                  ? activeLevel.spexIntroAr
                  : activeLevel.spexIntro}
              </p>
            </div>
          </div>

          {/* Clean Unboxed Rank + Course Progress Summary */}
          <div className="shrink-0 rounded-xl bg-[#050811] border border-white/10 p-4 min-w-[240px] space-y-2.5">
            <div className="flex items-center justify-between gap-3 text-xs font-mono tabular-nums">
              <span className="text-amber-300 font-bold flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 shrink-0" />
                {rank}
              </span>
              <span className="text-slate-400" aria-hidden="true">
                ·
              </span>
              <span className="text-sky-300 font-bold">{progress.xp} XP</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                <span>{t.academyLevelsCompleted}</span>
                <span className="text-white font-semibold">
                  {completedCount}/{ACADEMY_LEVELS.length}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all duration-300"
                  style={{ width: `${Math.round(courseRatio * 100)}%` }}
                />
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              {rankInfo.nextRank
                ? isRtl
                  ? `متبقي ${rankInfo.xpNeededForNext} XP لرتبة ${rankInfo.nextRank}`
                  : `${rankInfo.xpNeededForNext} XP to ${rankInfo.nextRank}`
                : isRtl
                ? 'أعلى رتبة مكتملة'
                : 'Max rank reached'}
            </div>
          </div>
        </div>
      </section>

      {/* VIEW 1: COURSE PATH */}
      {mode === 'map' && (() => {
        const continueLevel =
          ACADEMY_LEVELS.find(
            (l) => isLevelUnlocked(l.levelId) && !progress.completedLevels.includes(l.levelId)
          ) || activeLevel;
        return (
        <section className="space-y-4">
          <div className="rounded-2xl bg-[#0B1426] border border-amber-400/35 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono text-amber-300 font-semibold">
                {isRtl ? `المستوى ${continueLevel.levelId}` : `Level ${continueLevel.levelId}`} · +{continueLevel.xpReward} XP
              </div>
              <div className="font-display text-lg sm:text-xl font-bold text-white">
                {isRtl ? continueLevel.titleAr : continueLevel.title}
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                {isRtl ? continueLevel.subtitleAr : continueLevel.subtitle}
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="lg"
              data-testid="academy-continue-btn"
              icon={<ForwardArrow className="w-4 h-4" />}
              iconPosition="end"
              onClick={() => handleOpenLevel(continueLevel.levelId, 'lesson')}
            >
              {t.academyContinueBtn}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Map className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="font-semibold text-white">{t.academyCourseMapTitle}</span>
              <span className="text-slate-500" aria-hidden="true">
                ·
              </span>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {completedCount}/{ACADEMY_LEVELS.length} {t.academyLevelsCompleted}
              </span>
            </div>

            <button
              type="button"
              data-testid="academy-preview-toggle"
              onClick={() => {
                gameAudio.playClick();
                setPreviewAllLevels((v) => !v);
              }}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition ${
                previewAllLevels
                  ? 'bg-amber-400/15 border-amber-400/50 text-amber-200'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
              }`}
            >
              {previewAllLevels ? (
                <Unlock className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{t.academyPreviewModeToggle}</span>
            </button>
          </div>

          {/* Connected Vertical Course Path */}
          <div className="relative space-y-3">
            {ACADEMY_LEVELS.map((lvl, idx) => {
              const done = progress.completedLevels.includes(lvl.levelId);
              const unlocked = isLevelUnlocked(lvl.levelId);
              const isNextUp =
                unlocked &&
                !done &&
                ACADEMY_LEVELS.slice(0, idx).every((prev) =>
                  progress.completedLevels.includes(prev.levelId)
                );

              return (
                <div
                  key={lvl.levelId}
                  data-testid={`academy-level-card-${lvl.levelId}`}
                  className={`relative rounded-2xl border p-4 sm:p-5 transition ${
                    done
                      ? 'bg-emerald-950/20 border-emerald-500/35'
                      : isNextUp
                      ? 'bg-[#0C1428] border-sky-400/60'
                      : unlocked
                      ? 'bg-[#090F1E]/95 border-white/12 hover:border-white/25'
                      : 'bg-[#060913]/85 border-white/8 opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      {/* Step Node Indicator */}
                      <div
                        className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-mono text-sm font-bold border tabular-nums ${
                          done
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            : unlocked
                            ? 'bg-sky-500/15 border-sky-400 text-sky-300'
                            : 'bg-white/5 border-white/10 text-slate-500'
                        }`}
                      >
                        {done ? <CheckCircle2 className="w-5 h-5" /> : lvl.levelId}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <h2 className="font-display text-base sm:text-lg font-bold text-white leading-snug">
                          {isRtl ? lvl.titleAr : lvl.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          {isRtl ? lvl.subtitleAr : lvl.subtitle}
                        </p>
                        {/* Clean Unboxed Metadata */}
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 tabular-nums pt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            {lvl.durationMinutes} {t.academyMinutesRead}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-300">+{lvl.xpReward} XP</span>
                          <span aria-hidden="true">·</span>
                          <span className={done ? 'text-emerald-300' : unlocked ? 'text-sky-300' : 'text-slate-500'}>
                            {done
                              ? t.academyPassedBadge
                              : unlocked
                              ? isRtl
                                ? 'متاح الآن'
                                : 'Unlocked'
                              : isRtl
                              ? `أكمل المستوى ${lvl.levelId - 1} أولاً`
                              : `Complete Level ${lvl.levelId - 1} first`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant={done ? 'secondary' : isNextUp ? 'primary' : 'cyan'}
                        size="md"
                        disabled={!unlocked}
                        onClick={() => handleOpenLevel(lvl.levelId, 'lesson')}
                        icon={unlocked ? <BookOpen className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      >
                        {done
                          ? isRtl
                            ? 'مراجعة الدرس'
                            : 'Review Lesson'
                          : t.academyStartLesson}
                      </Button>

                      {unlocked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          onClick={() => handleOpenLevel(lvl.levelId, 'exam')}
                        >
                          {t.academyTakeExam}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        );
      })()}

      {/* VIEW 2: LESSON VIEW (Short sections, big readable text, progress bar, Next/Back) */}
      {mode === 'lesson' && (() => {
        const totalSteps = activeLevel.sections.length + 1;
        const safeStep = Math.max(0, Math.min(lessonStep, totalSteps - 1));
        const isLastStep = safeStep === totalSteps - 1;
        const activeSection = activeLevel.sections[safeStep];
        const stepPct = Math.round(((safeStep + 1) / totalSteps) * 100);

        return (
        <section className="rounded-2xl bg-[#070B16]/95 border border-white/10 p-5 sm:p-6 space-y-6">
          {/* Top Lesson Bar + Progress Bar */}
          <div className="space-y-3 border-b border-white/10 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick();
                  setMode('map');
                }}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition"
              >
                <BackArrow className="w-4 h-4" />
                <span>{t.academyBackToMap}</span>
              </button>

              <div className="flex items-center gap-3 text-xs font-mono text-slate-300 tabular-nums">
                <span>
                  {isRtl ? `خطوة ${safeStep + 1} / ${totalSteps}` : `Step ${safeStep + 1} / ${totalSteps}`}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300 font-semibold">+{activeLevel.xpReward} XP</span>
              </div>
            </div>

            <div className="h-2 rounded-full bg-white/10 overflow-hidden" aria-label="Lesson progress">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all duration-300"
                style={{ width: `${stepPct}%` }}
              />
            </div>
          </div>

          {/* Step Content: Short Section or Practice + Takeaways */}
          {!isLastStep && activeSection ? (
            <div className="space-y-5">
              {safeStep === 0 && (
                <AcademyDiagram type={activeLevel.diagramType} isRtl={isRtl} />
              )}

              <article className="rounded-2xl bg-[#0C1224] border border-white/10 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2 text-xs sm:text-sm font-mono text-sky-400 font-semibold">
                  <span>
                    0{safeStep + 1}. {isRtl ? activeSection.titleAr : activeSection.title}
                  </span>
                  {activeSection.termKey && (
                    <ScienceTerm termKey={activeSection.termKey} language={language} />
                  )}
                </div>
                <p className="text-base sm:text-lg text-slate-100 leading-relaxed">
                  {isRtl ? activeSection.bodyAr : activeSection.body}
                </p>
                <div className="rounded-xl bg-amber-500/10 border border-amber-400/25 px-4 py-3 text-sm font-mono text-amber-200">
                  {isRtl ? activeSection.keyFactAr : activeSection.keyFact}
                </div>
              </article>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Interactive Practice Check + Hint */}
              <div className="rounded-2xl bg-[#0B1222] border border-sky-400/25 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold text-sky-300">
                    <HelpCircle className="w-4 h-4 shrink-0" />
                    <span>{t.academyPracticeTitle}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setShowPracticeHint((prev) => ({
                        ...prev,
                        [activeLevel.levelId]: !prev[activeLevel.levelId],
                      }))
                    }
                    className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-amber-300 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'تلميح' : 'Hint'}</span>
                  </button>
                </div>

                <p className="text-base sm:text-lg font-semibold text-white leading-relaxed">
                  {isRtl ? activeLevel.practice.promptAr : activeLevel.practice.prompt}
                </p>

                {showPracticeHint[activeLevel.levelId] && (
                  <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-400/20 rounded-xl px-3.5 py-2.5">
                    {isRtl ? activeLevel.practice.hintAr : activeLevel.practice.hint}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-2">
                  {(isRtl ? activeLevel.practice.optionsAr : activeLevel.practice.options).map(
                    (opt, optIdx) => {
                      const chosen = practiceChoice[activeLevel.levelId] === optIdx;
                      const checked = Boolean(practiceChecked[activeLevel.levelId]);
                      const isCorrect = optIdx === activeLevel.practice.correctIndex;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => {
                            gameAudio.playClick();
                            setPracticeChoice((prev) => ({
                              ...prev,
                              [activeLevel.levelId]: optIdx,
                            }));
                            setPracticeChecked((prev) => ({
                              ...prev,
                              [activeLevel.levelId]: false,
                            }));
                          }}
                          className={`text-start min-h-[46px] px-4 py-3 rounded-xl border text-base cursor-pointer transition ${
                            checked && chosen
                              ? isCorrect
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-semibold'
                                : 'bg-rose-500/15 border-rose-400 text-rose-200'
                              : chosen
                              ? 'bg-sky-500/20 border-sky-400 text-white font-medium'
                              : 'bg-white/[0.03] border-white/10 text-slate-200 hover:bg-white/[0.08]'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <Button
                    type="button"
                    variant="cyan"
                    size="sm"
                    disabled={practiceChoice[activeLevel.levelId] === undefined}
                    onClick={() => {
                      const chosen = practiceChoice[activeLevel.levelId];
                      if (chosen === activeLevel.practice.correctIndex) {
                        gameAudio.playSuccess();
                      } else {
                        gameAudio.playClick();
                      }
                      setPracticeChecked((prev) => ({
                        ...prev,
                        [activeLevel.levelId]: true,
                      }));
                    }}
                  >
                    {t.academyPracticeCheckBtn}
                  </Button>

                  {practiceChecked[activeLevel.levelId] && (
                    <span
                      className={`text-sm font-semibold ${
                        practiceChoice[activeLevel.levelId] === activeLevel.practice.correctIndex
                          ? 'text-emerald-300'
                          : 'text-amber-300'
                      }`}
                    >
                      {practiceChoice[activeLevel.levelId] === activeLevel.practice.correctIndex
                        ? t.academyPracticeCorrect
                        : t.academyPracticeTryAgain}
                    </span>
                  )}
                </div>
              </div>

              {/* Key Takeaways */}
              <div className="rounded-xl bg-[#050811] border border-white/10 p-4 sm:p-5 space-y-2.5">
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-amber-300">
                  {t.academyKeyTakeaways}
                </h3>
                <ul className="space-y-1.5 text-sm sm:text-base text-slate-200">
                  {(isRtl ? activeLevel.takeawaysAr : activeLevel.takeaways).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Clean Lesson Footer: Back / Next / Try in Explore / Take Quiz */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={safeStep === 0}
                icon={<BackArrow className="w-4 h-4" />}
                onClick={() => {
                  gameAudio.playClick();
                  setLessonStep((s) => Math.max(0, s - 1));
                }}
              >
                {isRtl ? 'السابق' : 'Back'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                icon={<Compass className="w-4 h-4 text-sky-400" />}
                onClick={() => {
                  gameAudio.playClick();
                  onOpenTargetInViewer(activeLevel.exploreCaseId);
                }}
              >
                {t.academyTryInExplore}
              </Button>
            </div>

            {!isLastStep ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                icon={<ForwardArrow className="w-4 h-4" />}
                iconPosition="end"
                onClick={() => {
                  gameAudio.playClick();
                  setLessonStep((s) => Math.min(totalSteps - 1, s + 1));
                }}
              >
                {isRtl ? 'التالي' : 'Next'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                data-testid="academy-tab-exam"
                icon={<ForwardArrow className="w-4 h-4" />}
                iconPosition="end"
                onClick={() => {
                  gameAudio.playClick();
                  setMode('exam');
                }}
              >
                {t.academyTakeExam}
              </Button>
            )}
          </div>
        </section>
        );
      })()}

      {/* VIEW 3: EXAM VIEW */}
      {mode === 'exam' && (
        <section className="rounded-2xl bg-[#070B16]/95 border border-white/10 p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick();
                  setMode('lesson');
                }}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition"
              >
                <BackArrow className="w-4 h-4" />
                <span>{t.academyStartLesson}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick();
                  setMode('map');
                }}
                className="min-h-[40px] px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white whitespace-nowrap shrink-0 cursor-pointer transition"
              >
                {t.academyBackToMap}
              </button>
            </div>

            <div className="text-xs font-mono text-amber-300 font-semibold tabular-nums">
              {t.academyExamTitle} · {solvedCount}/{activeLevel.questions.length}
            </div>
          </div>

          <div className="space-y-4">
            {activeLevel.questions.map((q, qIdx) => {
              const solved = isQuestionSolved(q);
              return (
                <div
                  key={q.id}
                  data-testid={`academy-question-${q.id}`}
                  className={`rounded-xl p-4 sm:p-5 border transition ${
                    solved
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-[#0C1224] border-white/10'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 text-xs font-mono text-slate-400 tabular-nums">
                    <span>
                      Q{qIdx + 1}/{activeLevel.questions.length} · {q.difficulty}
                    </span>
                    {solved && (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-300">
                        <CheckCircle2 className="w-4 h-4" />
                        {isRtl ? 'صحيح' : 'Verified'}
                      </span>
                    )}
                  </div>

                  <p className="text-sm sm:text-base font-semibold text-white mb-3">
                    {isRtl ? q.promptAr : q.prompt}
                  </p>

                  {q.type === 'mcq' ? (
                    <div className="grid grid-cols-1 gap-2">
                      {(isRtl ? q.optionsAr : q.options).map((opt, optIdx) => {
                        const chosen = answers[q.id] === optIdx;
                        const isCorrect = optIdx === q.correctIndex;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => {
                              if (isCorrect) {
                                gameAudio.playSuccess();
                              } else {
                                gameAudio.playClick();
                              }
                              setAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                            }}
                            className={`text-start min-h-[42px] px-3.5 py-2.5 rounded-xl border text-sm cursor-pointer transition ${
                              chosen
                                ? isCorrect
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-semibold'
                                  : 'bg-rose-500/15 border-rose-400 text-rose-200'
                                : 'bg-white/[0.03] border-white/10 text-slate-200 hover:bg-white/[0.08]'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                      {answers[q.id] !== undefined && (
                        <p className="mt-2 text-xs text-slate-300 bg-black/30 rounded-xl px-3 py-2 border border-white/10">
                          {isRtl ? q.explanationAr : q.explanation}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs font-mono text-sky-300">
                        {isRtl ? q.actionInstructionAr : q.actionInstruction}
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                          type="button"
                          variant="cyan"
                          size="sm"
                          icon={<Compass className="w-4 h-4" />}
                          onClick={() => {
                            gameAudio.playClick();
                            onOpenTargetInViewer(q.suggestedTargetCaseId);
                          }}
                        >
                          {t.academyTryInExplore}
                        </Button>
                        {solved && (
                          <span className="text-xs text-emerald-300">
                            {isRtl ? q.explanationAr : q.explanation}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
            <span className="text-xs text-slate-300 tabular-nums">
              {allSolved
                ? isRtl
                  ? 'جميع الأسئلة صحيحة! اضغط لعرض النتيجة واستلام النقاط.'
                  : 'All items verified! Submit to record XP and view results.'
                : levelCompleted
                ? isRtl
                  ? 'هذا المستوى مكتمل مسبقاً.'
                  : 'This level is already completed in your log.'
                : isRtl
                ? `متبقي ${activeLevel.questions.length - solvedCount} سؤال/فحص لاجتياز المستوى.`
                : `${activeLevel.questions.length - solvedCount} more item(s) needed to pass.`}
            </span>

            <Button
              type="button"
              variant="primary"
              size="md"
              data-testid="academy-claim-xp-btn"
              onClick={handleFinishExam}
              icon={<ForwardArrow className="w-4 h-4" />}
              iconPosition="end"
            >
              {isRtl
                ? `إنهاء وعرض النتيجة (+${activeLevel.xpReward} XP)`
                : `Finish & See Results (+${activeLevel.xpReward} XP)`}
            </Button>
          </div>
        </section>
      )}

      {/* VIEW 4: RESULTS VIEW */}
      {mode === 'results' && (
        <section className="rounded-2xl bg-[#070B16]/95 border border-white/10 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-amber-400 font-semibold">
                {t.academyResultsTitle}
              </div>
              <h2 className="font-display text-2xl font-bold text-white">
                {examPassedLastRun || levelCompleted
                  ? t.academyResultsPassed
                  : t.academyResultsTryAgain}
              </h2>
              <p className="text-sm text-slate-300">
                {isRtl ? activeLevel.titleAr : activeLevel.title}
              </p>
            </div>

            <div className="flex items-center gap-6 shrink-0 font-mono tabular-nums">
              <div>
                <div className="text-[11px] text-slate-400">{t.academyResultsScoreLabel}</div>
                <div className="text-2xl font-bold text-white">
                  {solvedCount}/{activeLevel.questions.length}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">{t.academyResultsXpEarned}</div>
                <div className="text-2xl font-bold text-amber-300">+{lastEarnedXp} XP</div>
              </div>
            </div>
          </div>

          {/* Updated Rank Bar */}
          <div className="rounded-xl bg-[#050811] border border-white/10 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
              <span className="text-amber-300 font-bold">
                {t.rankLabel}: {rank}
              </span>
              <span className="text-sky-300 font-bold">{progress.xp} XP</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all duration-300"
                style={{ width: `${Math.round(rankInfo.progressRatio * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  gameAudio.playClick();
                  setMode('map');
                }}
              >
                {t.academyBackToMap}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={handleRetryExam}
              >
                {t.academyRetryExamBtn}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {nextLevel && (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  icon={<ForwardArrow className="w-4 h-4" />}
                  iconPosition="end"
                  onClick={() => {
                    gameAudio.playClick();
                    setSelectedLevelId(nextLevel.levelId);
                    setLessonStep(0);
                    setMode('lesson');
                  }}
                >
                  {t.academyNextLevelBtn}
                </Button>
              )}
              <Button
                type="button"
                variant="cyan"
                size="md"
                icon={<Gamepad2 className="w-4 h-4" />}
                onClick={() => {
                  gameAudio.playClick();
                  onGoToPlay();
                }}
              >
                {isRtl ? 'افتح فصول اللعبة' : 'Open Game Chapters'}
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
    </ErrorBoundary>
  );
};
