import React, { useState, useEffect } from 'react';
import { Trophy, Award, X, RotateCcw, User, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { Language } from '../../utils/translations';
import { SpexPortrait } from '../../spex/SpexPortrait';

export interface LeaderboardEntry {
  id: string;
  alias: string;
  score: number;
  difficulty: 'rookie' | 'investigator' | 'expert';
  missionsCompleted: number;
  accuracyPct: number;
  timestamp: string;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currentScore: number;
  currentAlias: string;
  onUpdateAlias: (newAlias: string) => void;
}

const LEADERBOARD_STORAGE_KEY = 'spex_detective_leaderboard_v1';

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  language,
  currentScore,
  currentAlias,
  onUpdateAlias,
}) => {
  useModalBehavior(isOpen, onClose);
  const isArabic = language === 'ar';

  const defaultEntries: LeaderboardEntry[] = [
    {
      id: 'default_1',
      alias: 'AstroCat_99',
      score: 1450,
      difficulty: 'expert',
      missionsCompleted: 5,
      accuracyPct: 98,
      timestamp: '2026-11-06',
    },
    {
      id: 'default_2',
      alias: 'CosmicNova',
      score: 1250,
      difficulty: 'investigator',
      missionsCompleted: 5,
      accuracyPct: 94,
      timestamp: '2026-11-05',
    },
    {
      id: 'default_3',
      alias: 'NEP_Surveyor',
      score: 1100,
      difficulty: 'investigator',
      missionsCompleted: 4,
      accuracyPct: 90,
      timestamp: '2026-11-04',
    },
    {
      id: 'default_4',
      alias: 'StarlightCadet',
      score: 850,
      difficulty: 'rookie',
      missionsCompleted: 3,
      accuracyPct: 88,
      timestamp: '2026-11-03',
    },
  ];

  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => {
    try {
      const stored = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return defaultEntries;
  });

  const [inputAlias, setInputAlias] = useState(currentAlias);

  // Sync alias from prop
  useEffect(() => {
    setInputAlias(currentAlias);
  }, [currentAlias]);

  const handleSaveAlias = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputAlias.trim()) {
      onUpdateAlias(inputAlias.trim());
    }
  };

  const handleResetLeaderboard = () => {
    if (window.confirm(isArabic ? 'هل تريد استعادة قائمة الشرف الافتراضية؟' : 'Reset the detective leaderboard to default ranks?')) {
      setEntries(defaultEntries);
      try {
        localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(defaultEntries));
      } catch {
        // ignore
      }
    }
  };

  if (!isOpen) return null;

  // Include current player in sorted leaderboard view
  const allEntries = [...entries];
  if (!allEntries.some((e) => e.alias.toLowerCase() === currentAlias.toLowerCase())) {
    allEntries.push({
      id: 'current_player',
      alias: `${currentAlias} (You)`,
      score: currentScore,
      difficulty: 'investigator',
      missionsCompleted: Math.min(5, Math.floor(currentScore / 250)),
      accuracyPct: Math.min(100, 85 + Math.floor(currentScore / 100)),
      timestamp: 'Just now',
    });
  }
  allEntries.sort((a, b) => b.score - a.score);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] bg-[#0c1220] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-200"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0d1829] via-[#10223d] to-[#0d1829] border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="leaderboard-modal-title" className="text-lg font-bold text-white tracking-wide">
                  {isArabic ? 'لوحة شرف المحققين الكونيين' : 'Cosmic Detective Hall of Fame'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold uppercase">
                  {isArabic ? 'سجل محلي' : 'Local Registry'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isArabic ? 'ترتيب أعلى المحققين بناءً على دقة الأدلة وسرعة التحقيق' : 'Ranked by forensic evidence accuracy & mission milestones'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alias Customizer */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <form onSubmit={handleSaveAlias} className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-slate-400 font-mono flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              {isArabic ? 'اسم المحقق:' : 'Detective Alias:'}
            </span>
            <input
              type="text"
              value={inputAlias}
              onChange={(e) => setInputAlias(e.target.value)}
              className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 flex-1"
              maxLength={20}
            />
            <button
              type="submit"
              className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
            >
              {isArabic ? 'حفظ' : 'Set'}
            </button>
          </form>

          <button
            onClick={handleResetLeaderboard}
            className="p-1.5 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 transition"
            title="Reset scores"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isArabic ? 'إعادة ضبط' : 'Reset Ranks'}</span>
          </button>
        </div>

        {/* List of ranks */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {allEntries.map((entry, idx) => {
            const isPlayer = entry.alias.includes(currentAlias);
            return (
              <div
                key={entry.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isPlayer
                    ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/40'
                    : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold font-mono text-xs ${
                      idx === 0
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-950'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    #{idx + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${isPlayer ? 'text-amber-300' : 'text-white'}`}>
                        {entry.alias}
                      </span>
                      {isPlayer && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {entry.missionsCompleted}/5 Missions · {entry.accuracyPct}% Accuracy · {entry.difficulty.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-base text-amber-400 font-mono">
                    {entry.score} XP
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {entry.timestamp}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            {isArabic ? 'سجل درجات محلي آمن مخصص لمراجعي ناسا' : 'Local secure registry for Space Apps evaluators'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            {isArabic ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
