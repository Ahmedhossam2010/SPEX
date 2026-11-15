import React, { useEffect, useState } from 'react';
import { X, Award, Trophy, Sparkles, CheckCircle2, Lock } from 'lucide-react';
import { Language, translations } from '../utils/translations';
import { useProgress } from '../progress/progressStore';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { gameAudio } from '../game/utils/gameAudio';

interface ScoreBoardEntry {
  nickname: string;
  xp: number;
  rank: string;
  updatedAt: string;
}

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onOpenExplore?: () => void;
}

const ACHIEVEMENT_CATALOG: Array<{
  id: string;
  title: string;
  titleAr: string;
  desc: string;
  descAr: string;
}> = [
  {
    id: 'first_blink',
    title: 'Blink Spotter',
    titleAr: 'راصد الوميض',
    desc: 'Played multi-epoch sky blink animation.',
    descAr: 'شغّلت حركة الوميض بين الحقبات الفلكية.',
  },
  {
    id: 'diff_detective',
    title: 'Difference Detective',
    titleAr: 'محقق الفوارق',
    desc: 'Activated "Show what changed" difference imaging.',
    descAr: 'فعّلت وضع التصوير التفاضلي «اعرض ما تغير».',
  },
  {
    id: 'pass_grouper',
    title: 'Pass Organizer',
    titleAr: 'منسق التمريرات',
    desc: 'Toggled Survey-pass mode to group visits by sky pass.',
    descAr: 'فعّلت وضع تمريرة المسح لتجميع الزيارات.',
  },
  {
    id: 'academy_graduate',
    title: 'Academy Graduate',
    titleAr: 'خريج الأكاديمية',
    desc: 'Completed all 5 SPEX Academy levels.',
    descAr: 'أنهيت جميع مستويات أكاديمية سبيكس الخمسة.',
  },
  {
    id: 'arcade_master',
    title: 'Signal Tracker',
    titleAr: 'متتبع الإشارات',
    desc: 'Cleared all 3 Astro mini-games.',
    descAr: 'اجتزت الألعاب الفلكية الثلاث كلها.',
  },
  {
    id: 'shared_card',
    title: 'Cosmic Messenger',
    titleAr: 'رسول الكون',
    desc: 'Shared or copied a SPHEREx Discovery Card.',
    descAr: 'شاركت أو نسخت بطاقة اكتشاف SPHEREx.',
  },
];

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  language,
  onOpenExplore,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  const { progress, rank, rankInfo } = useProgress();

  const [scores, setScores] = useState<ScoreBoardEntry[]>([]);
  const [nickname, setNickname] = useState<string>(() => {
    try {
      return localStorage.getItem('spex_nickname') || '';
    } catch {
      return '';
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedOk, setSubmittedOk] = useState(false);

  useModalBehavior(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/game/scores')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.scores && Array.isArray(d.scores)) setScores(d.scores);
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePostScore = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nickname.trim();
    if (!/^[A-Za-z0-9 _-]{2,20}$/.test(clean)) {
      setSubmitError(
        isRtl
          ? 'استخدم ٢ إلى ٢٠ حرفاً أو رقماً فقط.'
          : 'Use 2–20 letters, numbers, spaces, _ or - only.'
      );
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmittedOk(false);
    try {
      try {
        localStorage.setItem('spex_nickname', clean);
      } catch {}
      const res = await fetch('/api/game/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: clean, xp: progress.xp, rank }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setSubmitError(json?.error || 'Could not post score');
      } else {
        gameAudio.playSuccess();
        if (json?.scores) setScores(json.scores);
        setSubmittedOk(true);
      }
    } catch {
      setSubmitError(isRtl ? 'تعذر الاتصال بالخادم.' : 'Could not reach server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t.achievementsTitle}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#090F1E] border border-sky-400/30 p-5 sm:p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-lg sm:text-xl font-bold text-white">
              {t.achievementsTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close achievements"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rank Summary */}
        <div className="rounded-2xl bg-[#050811] border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono text-slate-400 uppercase">{t.rankLabel}</div>
            <div className="flex items-center gap-2 text-2xl font-display font-extrabold text-amber-300">
              <Award className="w-6 h-6" />
              <span>{rank}</span>
              <span className="text-sm font-mono text-sky-300 tabular-nums">({progress.xp} XP)</span>
            </div>
            <div className="text-xs font-mono text-slate-400">
              {isRtl
                ? `المستويات: ${progress.completedLevels.length}/5 · الألعاب: ${progress.completedMiniGames.length}/4 · الفصول: ${progress.completedChapters.length}/6`
                : `Academy: ${progress.completedLevels.length}/5 · Mini-games: ${progress.completedMiniGames.length}/4 · Chapters: ${progress.completedChapters.length}/6`}
            </div>
            <div className="text-[11px] font-mono text-slate-400 flex flex-wrap gap-3 tabular-nums">
              <span className="text-sky-300">{t.xpSourceLearning}: {progress.xpBreakdown.learning}</span>
              <span className="text-emerald-300">{t.xpSourceSolving}: {progress.xpBreakdown.solving}</span>
              <span className="text-amber-300">{t.xpSourceGame}: {progress.xpBreakdown.game}</span>
            </div>
          </div>

          <div className="w-full sm:w-56 space-y-1.5">
            <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-amber-400"
                style={{ width: `${Math.round(rankInfo.progressRatio * 100)}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-slate-400 text-end">
              {rankInfo.nextRank
                ? isRtl
                  ? `متبقي ${rankInfo.xpNeededForNext} XP إلى ${rankInfo.nextRank}`
                  : `${rankInfo.xpNeededForNext} XP → ${rankInfo.nextRank}`
                : isRtl
                ? 'أعلى رتبة!'
                : 'Top Rank'}
            </div>
          </div>
        </div>

        {/* Local Achievement Shelf */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACHIEVEMENT_CATALOG.map((item) => {
            const unlocked = progress.achievements.includes(item.id);
            return (
              <div
                key={item.id}
                className={`rounded-2xl p-3.5 border transition ${
                  unlocked
                    ? 'bg-emerald-500/10 border-emerald-400/40'
                    : 'bg-white/[0.02] border-white/10 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-bold text-white">
                    {isRtl ? item.titleAr : item.title}
                  </span>
                  {unlocked ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  {isRtl ? item.descAr : item.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Nickname-Only Scoreboard (No comments / moderation risk) */}
        <div className="rounded-2xl bg-[#050811] border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>{t.leaderboardTitle}</span>
            </h3>
            {onOpenExplore && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExplore();
                }}
                className="text-xs font-mono text-amber-300 hover:underline cursor-pointer"
              >
                {isRtl ? 'اصنع بطاقة اكتشاف →' : 'Create Discovery Card →'}
              </button>
            )}
          </div>

          <form onSubmit={handlePostScore} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t.leaderboardJoinPrompt}
              aria-label={t.leaderboardJoinPrompt}
              className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[40px] px-4 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 disabled:opacity-50 text-slate-950 font-bold text-xs cursor-pointer transition"
            >
              {t.leaderboardSubmitBtn}
            </button>
          </form>

          {submitError && <div className="text-xs font-mono text-rose-300">{submitError}</div>}
          {submittedOk && (
            <div className="text-xs font-mono text-emerald-300">
              {isRtl ? 'تم تسجيل نقاطك على اللوحة!' : 'Score posted to board!'}
            </div>
          )}

          {scores.length > 0 && (
            <div className="divide-y divide-white/5 text-xs font-mono max-h-40 overflow-y-auto">
              {scores.slice(0, 8).map((sc, i) => (
                <div key={`${sc.nickname}-${i}`} className="py-1.5 flex items-center justify-between gap-2">
                  <span className="text-slate-200">
                    #{i + 1} {sc.nickname}
                  </span>
                  <span className="text-amber-300 tabular-nums">
                    {sc.rank} · {sc.xp} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
