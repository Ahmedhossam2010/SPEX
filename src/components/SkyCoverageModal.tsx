import React, { useState } from 'react';
import { X, Globe2, Compass, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { OFFICIAL_CHALLENGE_TARGETS, SPHEREX_QR2_FOOTPRINT } from '../science/challengeTargets';
import { ChallengeTarget } from '../science/types';
import { Language, translations } from '../utils/translations';

interface SkyCoverageModalProps {
  onClose: () => void;
  onSelectTarget: (target: ChallengeTarget) => void;
  onSelectBenchmark: (caseId: string) => void;
  currentCoords?: { ra: number; dec: number };
  language: Language;
}

export const SkyCoverageModal: React.FC<SkyCoverageModalProps> = ({
  onClose,
  onSelectTarget,
  onSelectBenchmark,
  currentCoords,
  language,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  const [selectedTarget, setSelectedTarget] = useState<ChallengeTarget>(OFFICIAL_CHALLENGE_TARGETS[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        className={`relative w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0c1220] shadow-2xl p-5 sm:p-8 space-y-6 ${
          isRtl ? 'font-cairo' : 'font-sans'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-['Outfit'] text-slate-900 dark:text-slate-100">
                  {isRtl ? 'مستكشف التغطية السماوية وأهداف التحدي' : 'Sky Coverage & Official Challenge Targets'}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
                  SPHEREx QR2
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isRtl
                  ? 'رسم بياني يوضح موقع حقل القطب الشمالي لمسار الشمس والأجرام الخمسة الرسمية'
                  : 'Interactive map of SPHEREx QR2 North Ecliptic Pole footprint & 5 challenge targets'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Footprint Reality Banner */}
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs text-slate-800 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-700 dark:text-amber-300">
              {isRtl ? 'حقيقة التغطية الفلكية للإصدار QR2:' : 'Astronomical Survey Footprint Reality:'}
            </span>
            <p className="leading-relaxed">
              {isRtl
                ? 'يغطي إصدار QR2 المنشور حالياً من ناسا منطقة القطب الشمالي لمسار الشمس (NEP) بين RA 275.5°–276.8° و Dec +64.5°–65.2°. الأجرام الخمسة المذكورة في نص التحدي (مثل نجم برنارد) تقع خارج هذا النطاق، وسيوفر التطبيق بديلاً موثقاً داخل التغطية بدلاً من اختلاق بيانات وهمية.'
                : 'The currently published NASA/IPAC SPHEREx QR2 release is restricted to the North Ecliptic Pole (NEP) deep verification strip (RA 275.5°–276.8°, Dec +64.5°–65.2°). The 5 challenge targets lie outside this narrow footprint. To ensure scientific integrity, we explain their celestial separation and offer verified benchmarks instead of fabricated synthetic data.'}
            </p>
          </div>
        </div>

        {/* Visual Celestial Sky Map (SVG) */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-950 p-4 relative overflow-hidden">
          <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>CELESTIAL SPHERE (Equatorial RA: 0°–360°, Dec: -90° to +90°)</span>
            </div>
            <span className="text-amber-400 font-bold">NEP Strip: RA 276.1°, Dec +64.8°</span>
          </div>

          <svg viewBox="0 0 720 280" className="w-full h-48 sm:h-56 bg-slate-900/60 rounded-xl">
            {/* Grid Lines */}
            <defs>
              <pattern id="celestialGrid" width="60" height="40" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="720" height="280" fill="url(#celestialGrid)" />

            {/* Celestial Equator (Dec = 0) */}
            <line x1="0" y1="140" x2="720" y2="140" stroke="rgba(255,255,255,0.18)" strokeDasharray="4 4" strokeWidth="1" />
            <text x="10" y="136" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="monospace">Equator Dec=0°</text>

            {/* Ecliptic Plane rough sine curve */}
            <path
              d="M 0 176 Q 180 80, 360 140 T 720 104"
              fill="none"
              stroke="rgba(56,189,248,0.25)"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
            <text x="630" y="100" fill="rgba(56,189,248,0.6)" fontSize="9" fontFamily="monospace">Ecliptic Plane</text>

            {/* QR2 NEP Deep Footprint Highlight */}
            {/* RA 276.1 -> x = (276.1 / 360) * 720 = 552.2; Dec +64.8 -> y = 140 - (64.8 / 90) * 120 = 53.6 */}
            <circle cx="552" cy="54" r="16" fill="rgba(245,158,11,0.2)" stroke="#F59E0B" strokeWidth="1.8" />
            <circle cx="552" cy="54" r="4" fill="#F59E0B" />
            <text x="565" y="52" fill="#FBBF24" fontSize="10" fontWeight="bold" fontFamily="monospace">
              SPHEREx QR2 NEP
            </text>

            {/* Plot the 5 official challenge targets */}
            {OFFICIAL_CHALLENGE_TARGETS.map((tgt) => {
              // Map RA [0, 360] -> [0, 720]; Dec [-90, +90] -> [260, 20] (y = 140 - (dec / 90) * 120)
              const posX = (tgt.ra / 360) * 720;
              const posY = 140 - (tgt.dec / 90) * 120;
              const isSelected = selectedTarget.id === tgt.id;

              return (
                <g
                  key={tgt.id}
                  onClick={() => setSelectedTarget(tgt)}
                  className="cursor-pointer group"
                >
                  <circle
                    cx={posX}
                    cy={posY}
                    r={isSelected ? 7 : 4.5}
                    fill={isSelected ? '#38BDF8' : '#EC4899'}
                    stroke={isSelected ? '#FFFFFF' : '#9D174D'}
                    strokeWidth="1.5"
                  />
                  <line
                    x1={posX}
                    y1={posY}
                    x2={552}
                    y2={54}
                    stroke="rgba(236,72,153,0.25)"
                    strokeDasharray="2 2"
                    strokeWidth="1"
                  />
                  <text
                    x={posX + 7}
                    y={posY + 4}
                    fill={isSelected ? '#38BDF8' : '#CBD5E1'}
                    fontSize="9"
                    fontFamily="monospace"
                    className="select-none"
                  >
                    {tgt.name.split(' ')[0]} ({tgt.angularDistanceDegToNEP.toFixed(0)}°)
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Target Details Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Target List Selector */}
          <div className="md:col-span-5 space-y-2">
            <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block font-semibold uppercase">
              {isRtl ? 'الأجرام الخمسة المذكورة في التحدي:' : 'Select Challenge Target:'}
            </label>
            <div className="space-y-1.5">
              {OFFICIAL_CHALLENGE_TARGETS.map((tgt) => (
                <button
                  key={tgt.id}
                  type="button"
                  onClick={() => setSelectedTarget(tgt)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between text-xs cursor-pointer ${
                    selectedTarget.id === tgt.id
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.03] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{tgt.name}</div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {tgt.constellation} · {tgt.scienceType.split('(')[0]}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                    +{tgt.angularDistanceDegToNEP.toFixed(0)}°
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Target Deep Dive */}
          <div className="md:col-span-7 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] p-5 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base font-['Outfit'] text-slate-900 dark:text-slate-100">
                  {selectedTarget.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  {selectedTarget.constellation}
                </span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                {selectedTarget.scienceType}
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedTarget.description}
            </p>

            <div className="p-3 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Celestial RA:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">{selectedTarget.ra.toFixed(5)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Celestial Dec:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">
                  {selectedTarget.dec >= 0 ? '+' : ''}{selectedTarget.dec.toFixed(5)}°
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Angular Offset to SPHEREx NEP:</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  {selectedTarget.angularDistanceDegToNEP.toFixed(1)}°
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectBenchmark(selectedTarget.recommendedBenchmarkId);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-xs cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {isRtl ? 'فحص الحالة النموذجية الموثقة في QR2' : 'Inspect Verified NEP Analogue Benchmark'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
