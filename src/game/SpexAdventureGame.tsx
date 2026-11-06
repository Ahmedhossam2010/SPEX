import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Telescope,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Chapter1Scene } from './scenes/Chapter1Scene';
import { Chapter2Scene } from './scenes/Chapter2Scene';
import { Chapter3Scene } from './scenes/Chapter3Scene';
import { EvidenceNotebook, ClueItem } from './evidence/EvidenceNotebook';
import { gameAudio } from './utils/gameAudio';
import { Language, translations } from '../utils/translations';
import { SpherexLogo } from '../components/SpherexLogo';

interface SpexAdventureGameProps {
  language: Language;
  onExitToExplore: (caseId?: string) => void;
  onBackToHome: () => void;
}

const LOCAL_STORAGE_KEY = 'spex_lost_signal_save_v2';

export const SpexAdventureGame: React.FC<SpexAdventureGameProps> = ({
  language,
  onExitToExplore,
  onBackToHome,
}) => {
  const isArabic = language === 'ar';
  const t = translations[language];

  // Game chapter: 1 | 2 | 3
  const [currentChapter, setCurrentChapter] = useState<1 | 2 | 3>(1);
  const [isNotebookOpen, setIsNotebookOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cadetName, setCadetName] = useState<string>('Cadet Detective');

  // Clues collection
  const initialClues: ClueItem[] = [
    {
      id: 'clue_1_obscured_beacon',
      chapter: 1,
      title: 'The Obscured Protostellar Beacon',
      titleAr: 'المنارة النجمية المحجوبة بالغبار',
      timestamp: 'Pending Chapter 1',
      category: 'wavelength',
      observation: 'Target is completely extinguished in optical light (0.55 µm) by interstellar dust clouds (A_V > 18 mag), but shines brightly at 3.6 µm infrared.',
      observationAr: 'الجرم محجوب تماماً بالضوء المرئي بسبب سحب الغبار، لكنه يسطع بقوة عند 3.6 ميكرومتر بالأشعة تحت الحمراء.',
      scientificDeduction: 'Rayleigh scattering is proportional to λ⁻⁴, so infrared photons pierce through interstellar dust grains without attenuation.',
      scientificDeductionAr: 'تشتت رايلي يتناسب مع λ⁻⁴، لذا تنفذ فوتونات الأشعة تحت الحمراء عبر حبيبات الغبار دون امتصاص.',
      unlocked: false,
      confidence: 96,
    },
    {
      id: 'clue_2_ice_mantles',
      chapter: 2,
      title: 'Interstellar Ice Mantle Fingerprint',
      titleAr: 'بصمة أغلفة الجليد الكوني (H2O و CO2)',
      timestamp: 'Pending Chapter 2',
      category: 'spectroscopy',
      observation: 'Deep 3.05 µm water ice absorption trough and 4.27 µm CO2 ice resonance dip captured by Bands 4 & 5.',
      observationAr: 'انخفاض امتصاص عميق لجليد الماء عند 3.05 ميكرومتر وجليد CO2 عند 4.27 ميكرومتر في النطاقين 4 و 5.',
      scientificDeduction: 'Proves the object is embedded in a cryogenic protoplanetary disk or protostellar envelope where volatile species freeze onto grains.',
      scientificDeductionAr: 'يثبت أن الجرم متمركز داخل قرص كوكبي أولي بارد أو غلاف نجمي وليد تتجمد فيه الجزيئات المتطايرة.',
      unlocked: false,
      confidence: 98,
    },
    {
      id: 'clue_3_accretion_burst',
      chapter: 3,
      title: 'Episodic Protostellar Accretion Outburst',
      titleAr: 'ثوران تراكمي نجمي هائل (FU Orionis)',
      timestamp: 'Pending Chapter 3',
      category: 'temporal_difference',
      observation: 'Stationary difference residual D = I2 - I1 shows +14.8σ statistical significance (+730% flux surge).',
      observationAr: 'المتبقي التفاضلي D = I2 - I1 يوضح زيادة سطوع +14.8σ (+730% تدفق إضافي) في موضع ثابت مكانياً.',
      scientificDeduction: 'Consistent with an FU Orionis accretion event where disk instability dumps mass onto the young protostar.',
      scientificDeductionAr: 'يطابق تماماً ثوران FU Orionis التراكمي حيث تؤدي اضطرابات القرص الكوكبي إلى ابتلاع كتلة تدفع النجم للتوهج.',
      unlocked: false,
      confidence: 99,
    },
  ];

  const [clues, setClues] = useState<ClueItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.clues) return parsed.clues;
      }
    } catch {
      // ignore
    }
    return initialClues;
  });

  // Restore chapter and cadet name from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentChapter) setCurrentChapter(parsed.currentChapter);
        if (parsed.cadetName) setCadetName(parsed.cadetName);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save progress
  const saveProgress = (newClues: ClueItem[], newChapter: 1 | 2 | 3, newName: string) => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          clues: newClues,
          currentChapter: newChapter,
          cadetName: newName,
        })
      );
    } catch {
      // ignore
    }
  };

  const handleUnlockClue = (unlockedClue: ClueItem) => {
    setClues((prev) => {
      const updated = prev.map((c) => (c.id === unlockedClue.id ? { ...unlockedClue, unlocked: true } : c));
      saveProgress(updated, currentChapter, cadetName);
      return updated;
    });
  };

  const handleCompleteChapter1 = () => {
    gameAudio.playSuccess();
    setCurrentChapter(2);
    saveProgress(clues, 2, cadetName);
  };

  const handleCompleteChapter2 = () => {
    gameAudio.playSuccess();
    setCurrentChapter(3);
    saveProgress(clues, 3, cadetName);
  };

  const handleResetGame = () => {
    if (window.confirm(isArabic ? 'هل تريد إعادة تشغيل المغامرة من البداية؟' : 'Restart the Cosmic Detective adventure from Chapter 1?')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setClues(initialClues);
      setCurrentChapter(1);
    }
  };

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    gameAudio.enabled = nextState;
  };

  const unlockedCount = clues.filter((c) => c.unlocked).length;

  return (
    <div
      className="min-h-screen bg-[#050811] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-[#09101d]/90 backdrop-blur-md border-b border-cyan-500/20 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Adventure Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-white transition"
              title={isArabic ? 'العودة للرئيسية' : 'Back to Home'}
            >
              <ArrowLeft className={`w-4 h-4 ${isArabic ? 'rotate-180' : ''}`} />
            </button>

            <div className="flex items-center gap-2.5">
              <SpherexLogo size={32} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-sm sm:text-base text-white tracking-wide">
                    SPEX: THE LOST SIGNAL
                  </h1>
                  <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                    {isArabic ? 'مغامرة المحقق الكوني' : 'A Cosmic Detective Adventure'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {isArabic ? 'مهمة ناسا الفضائية SPHEREx • مغامرة علمية تفاعلية' : 'NASA SPHEREx Space Mission • Interactive Story Experience'}
                </div>
              </div>
            </div>
          </div>

          {/* Chapter Progress Tabs */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setCurrentChapter(1)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                currentChapter === 1
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : clues[0]?.unlocked
                  ? 'text-emerald-400 hover:text-emerald-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {clues[0]?.unlocked && <CheckCircle2 className="w-3 h-3" />}
              <span>{isArabic ? 'الفصل 1: الإشارة' : 'Ch 1: The Signal'}</span>
            </button>

            <ChevronRight className={`w-3.5 h-3.5 text-slate-600 ${isArabic ? 'rotate-180' : ''}`} />

            <button
              onClick={() => setCurrentChapter(2)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                currentChapter === 2
                  ? 'bg-purple-600 text-white shadow-sm'
                  : clues[1]?.unlocked
                  ? 'text-emerald-400 hover:text-emerald-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {clues[1]?.unlocked && <CheckCircle2 className="w-3 h-3" />}
              <span>{isArabic ? 'الفصل 2: الـ102 نافذة' : 'Ch 2: 102 Windows'}</span>
            </button>

            <ChevronRight className={`w-3.5 h-3.5 text-slate-600 ${isArabic ? 'rotate-180' : ''}`} />

            <button
              onClick={() => setCurrentChapter(3)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                currentChapter === 3
                  ? 'bg-amber-600 text-white shadow-sm'
                  : clues[2]?.unlocked
                  ? 'text-emerald-400 hover:text-emerald-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {clues[2]?.unlocked && <CheckCircle2 className="w-3 h-3" />}
              <span>{isArabic ? 'الفصل 3: ماذا تغير؟' : 'Ch 3: What Changed?'}</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Evidence Notebook Trigger */}
            <button
              onClick={() => setIsNotebookOpen(true)}
              className="relative px-3.5 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-800/60 border border-cyan-500/40 text-cyan-200 text-xs font-semibold flex items-center gap-2 shadow-sm transition"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>{isArabic ? 'سجل الأدلة' : 'Evidence Notebook'}</span>
              <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                {unlockedCount}
              </span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition"
              title={soundEnabled ? 'Mute Game Audio' : 'Unmute Game Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Reset Game */}
            <button
              onClick={handleResetGame}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition"
              title={isArabic ? 'إعادة تشغيل المغامرة' : 'Restart Adventure'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN GAME VIEWPORT CONTAINER */}
      <main className="flex-1 p-4 sm:p-6 flex flex-col justify-center">
        {currentChapter === 1 && (
          <Chapter1Scene
            language={language}
            onUnlockClue={handleUnlockClue}
            onCompleteChapter={handleCompleteChapter1}
            hasClue1={Boolean(clues[0]?.unlocked)}
          />
        )}

        {currentChapter === 2 && (
          <Chapter2Scene
            language={language}
            onUnlockClue={handleUnlockClue}
            onCompleteChapter={handleCompleteChapter2}
            hasClue2={Boolean(clues[1]?.unlocked)}
          />
        )}

        {currentChapter === 3 && (
          <Chapter3Scene
            language={language}
            onUnlockClue={handleUnlockClue}
            onCompleteGame={() => {}}
            hasClue3={Boolean(clues[2]?.unlocked)}
            cadetName={cadetName}
            onUpdateCadetName={(name) => {
              setCadetName(name);
              saveProgress(clues, currentChapter, name);
            }}
            onExitToExplore={() => onExitToExplore('case_nep_01')}
          />
        )}
      </main>

      {/* SLIDE-OUT EVIDENCE NOTEBOOK MODAL */}
      <EvidenceNotebook
        isOpen={isNotebookOpen}
        onClose={() => setIsNotebookOpen(false)}
        language={language}
        clues={clues}
        cadetName={cadetName}
      />
    </div>
  );
};
