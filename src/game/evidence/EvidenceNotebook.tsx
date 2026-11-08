import React from 'react';
import { BookOpen, X, ShieldAlert, Sparkles, CheckCircle2, Lock, Eye, Waves, Layers } from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { Language } from '../../utils/translations';
import { SpexPortrait } from '../../spex/SpexPortrait';

export interface ClueItem {
  id: string;
  chapter: 1 | 2 | 3 | 4 | 5;
  title: string;
  titleAr: string;
  timestamp: string;
  category: 'wavelength' | 'spectroscopy' | 'temporal_difference' | 'astrophysics';
  observation: string;
  observationAr: string;
  scientificDeduction: string;
  scientificDeductionAr: string;
  unlocked: boolean;
  confidence: number; // 0 to 100%
}

interface EvidenceNotebookProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  clues: ClueItem[];
  cadetName: string;
}

export const EvidenceNotebook: React.FC<EvidenceNotebookProps> = ({
  isOpen,
  onClose,
  language,
  clues,
  cadetName,
}) => {
  useModalBehavior(isOpen, onClose);
  const isArabic = language === 'ar';

  if (!isOpen) return null;

  const unlockedCount = clues.filter((c) => c.unlocked).length;
  const totalCount = clues.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notebook-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#0c1222] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Header banner */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-[#0d1829] via-[#10223d] to-[#0d1829] border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="notebook-title" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  {isArabic ? 'سجل الأدلة الكونية' : 'Cosmic Evidence Notebook'}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono">
                  {unlockedCount}/{totalCount} {isArabic ? 'أدلة مجمعة' : 'Clues Found'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isArabic
                  ? `المحقق: ${cadetName} • بروتوكول SPHEREx التوثيقي`
                  : `Investigator: ${cadetName} • SPHEREx Forensic Scientific Dossier`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl border border-transparent hover:border-slate-700 transition"
            aria-label={isArabic ? 'إغلاق السجل' : 'Close Evidence Notebook'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clue body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-xs text-cyan-200/90 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>
              {isArabic
                ? 'تنبيه علمي: تسجل هذه المذكرة الأدلة المادية المستخلصة من رصد تلسكوب SPHEREx الفضائي. استخدم هذه الأدلة في الفصل الثالث للوصول إلى النتيجة النهائية وتحديد هوية الجرم المتغير.'
                : 'Scientific Notice: This dossier records verified astronomical evidence extracted during the SPHEREx mission. Synthesize these observations in Chapter 3 to determine the astrophysical nature of the changing sky event.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clues.map((clue, idx) => (
              <div
                key={clue.id}
                className={`relative rounded-xl border p-4 transition-all duration-300 flex flex-col justify-between ${
                  clue.unlocked
                    ? 'bg-slate-900/70 border-cyan-500/30 hover:border-cyan-400/50 shadow-lg'
                    : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {isArabic ? `الفصل ${clue.chapter}` : `Chapter ${clue.chapter}`}
                    </span>
                    {clue.unlocked ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {clue.confidence}% {isArabic ? 'يقين' : 'Confidence'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                        <Lock className="w-3.5 h-3.5" />
                        {isArabic ? 'مغلق' : 'Undiscovered'}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-sm text-white mb-1.5 flex items-center gap-1.5">
                    {clue.category === 'wavelength' && <Eye className="w-4 h-4 text-cyan-400" />}
                    {clue.category === 'spectroscopy' && <Waves className="w-4 h-4 text-purple-400" />}
                    {clue.category === 'temporal_difference' && <Layers className="w-4 h-4 text-amber-400" />}
                    {clue.category === 'astrophysics' && <Sparkles className="w-4 h-4 text-pink-400" />}
                    {isArabic ? clue.titleAr : clue.title}
                  </h3>

                  {clue.unlocked ? (
                    <div className="space-y-2 mt-2 text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-cyan-400/80 uppercase block">
                          {isArabic ? 'الملاحظة الرصدية:' : 'Observation:'}
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          {isArabic ? clue.observationAr : clue.observation}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-800">
                        <span className="text-[10px] font-mono text-amber-400/80 uppercase block">
                          {isArabic ? 'الاستنتاج الفيزيائي:' : 'Deduction:'}
                        </span>
                        <p className="text-slate-300 font-serif italic leading-relaxed">
                          "{isArabic ? clue.scientificDeductionAr : clue.scientificDeduction}"
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic mt-3">
                      {isArabic
                        ? 'أكمل مهام وتجارب هذا الفصل لفك تشفير هذا الدليل.'
                        : 'Explore this chapter and complete its scientific puzzle to unlock this critical evidence.'}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>ID: #{idx + 1}</span>
                  <span>{clue.unlocked ? clue.timestamp : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0a0f1d] border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 border border-amber-500/30 flex items-center justify-center">
              <SpexPortrait expression={unlockedCount >= 2 ? 'eureka' : 'thinking'} size={32} />
            </div>
            <p className="text-xs text-slate-300">
              {unlockedCount === 0 && (isArabic ? 'ابدأ الاستكشاف لجمع أول دليل!' : 'Begin Chapter 1 to uncover your first clue!')}
              {unlockedCount === 1 && (isArabic ? 'دليل ممتاز! الغبار لا يحجب الأشعة تحت الحمراء.' : 'Great find! Dust cannot block infrared light.')}
              {unlockedCount === 2 && (isArabic ? 'بصمات جليد الماء وCO2 مؤكدة تماماً.' : 'Spectra confirm interstellar ices in the circumstellar disk!')}
              {unlockedCount >= 3 && (isArabic ? 'جميع الأدلة مكتملة! حان وقت إصدار التقرير النهائي.' : 'All clues collected! Ready for the final forensic diagnosis.')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md transition"
          >
            {isArabic ? 'متابعة المهمة' : 'Return to Investigation'}
          </button>
        </div>
      </div>
    </div>
  );
};
