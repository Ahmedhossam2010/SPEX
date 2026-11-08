import React, { useState } from 'react';
import { Compass, Telescope, AlertCircle, CheckCircle2, ChevronRight, Info, ExternalLink } from 'lucide-react';
import { OFFICIAL_CHALLENGE_TARGETS, SPHEREX_QR2_FOOTPRINT } from '../science/challengeTargets';
import { ChallengeTarget } from '../science/types';
import { Language } from '../utils/translations';

interface ChallengeTargetsBarProps {
  language: Language;
  onSelectTarget: (ra: number, dec: number, targetName: string) => void;
  onLoadBenchmarkAnalogue: (caseId: string) => void;
}

export const ChallengeTargetsBar: React.FC<ChallengeTargetsBarProps> = ({
  language,
  onSelectTarget,
  onLoadBenchmarkAnalogue,
}) => {
  const isAr = language === 'ar';
  const [selectedTarget, setSelectedTarget] = useState<ChallengeTarget | null>(null);

  return (
    <div
      className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 sm:p-5 shadow-sm space-y-4"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/[0.06] pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-bold text-[10px] tracking-wider uppercase">
              NASA CHALLENGE BENCHMARKS
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
              {isAr ? 'أهداف التحدي الرسمية الخمسة (NASA Test Targets)' : 'Official NASA Challenge Targets'}
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            {isAr
              ? 'حددت وكالة ناسا 5 أهداف اختبار رئيسية لتحدي SPHEREx. نتحقق بشفافية علمية من تغطية البيانات المنشورة (حقل القطب الشمالي لمسار الشمس QR2 NEP).'
              : 'NASA highlighted 5 official test targets for SPHEREx. We transparently verify actual coverage against the currently published QR2 North Ecliptic Pole deep survey archive.'}
          </p>
        </div>

        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 self-end sm:self-auto">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-500" />
          <span>Active Archive: SPHEREx QR2 (NEP)</span>
        </div>
      </div>

      {/* 5 Target Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {OFFICIAL_CHALLENGE_TARGETS.map((tgt) => {
          const isSelected = selectedTarget?.id === tgt.id;
          return (
            <button
              key={tgt.id}
              type="button"
              onClick={() => setSelectedTarget(tgt)}
              className={`p-3 rounded-2xl text-left transition-all border cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500 shadow-sm'
                  : 'bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] border-slate-200 dark:border-white/[0.08]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {tgt.name}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold shrink-0">
                    {tgt.constellation}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {tgt.scienceType}
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-white/[0.04] flex items-center justify-between text-[10px] font-mono">
                <span className="text-amber-600 dark:text-amber-400">
                  RA {tgt.ra.toFixed(1)}°
                </span>
                <span className="text-slate-400">
                  Dec {tgt.dec >= 0 ? `+${tgt.dec.toFixed(1)}°` : `${tgt.dec.toFixed(1)}°`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Target Deep Inspection & Honest Scientific Coverage Details */}
      {selectedTarget && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-amber-500/30 text-xs space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white font-['Outfit']">
                {selectedTarget.name} ({selectedTarget.constellation})
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {selectedTarget.scienceType}
              </span>
            </div>

            {/* Coverage Status Badge */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-500">
                {selectedTarget.angularDistanceDegToNEP.toFixed(1)}° from QR2 NEP Strip
              </span>
            </div>
          </div>

          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {selectedTarget.description}
          </p>

          <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <span className="font-bold block mb-0.5">
                {isAr ? 'الشفافية العلمية وتغطية الأرشيف:' : 'Scientific Honesty & Coverage Note:'}
              </span>
              <span>{selectedTarget.expectedBehavior}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSelectTarget(selectedTarget.ra, selectedTarget.dec, selectedTarget.name)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-500" />
              <span>
                {isAr ? `اختبار استعلام الإحداثيات (RA ${selectedTarget.ra.toFixed(2)}°)` : `Test Live IRSA Query (RA ${selectedTarget.ra.toFixed(2)}°)`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onLoadBenchmarkAnalogue(selectedTarget.recommendedBenchmarkId)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Telescope className="w-3.5 h-3.5 text-slate-950" />
              <span>
                {isAr ? 'عرض الحقل المرجعي المعاير (NEP Benchmark)' : 'Load Verified NEP Benchmark Analogue'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
