import React from 'react';
import { X, Table, Move, Sparkles, AlertTriangle, ShieldCheck, Compass, CheckCircle2 } from 'lucide-react';
import { CandidateDetection, InvestigationResult } from '../science/types';
import { Language, translations } from '../utils/translations';

import { useModalBehavior } from '../hooks/useModalBehavior';

interface CandidateComparisonModalProps {
  candidates: CandidateDetection[];
  investigation: InvestigationResult;
  selectedCandidate: CandidateDetection | null;
  onSelectCandidate: (candidate: CandidateDetection) => void;
  onClose: () => void;
  language: Language;
}

export const CandidateComparisonModal: React.FC<CandidateComparisonModalProps> = ({
  candidates,
  investigation,
  selectedCandidate,
  onSelectCandidate,
  onClose,
  language,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  useModalBehavior(true, onClose);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-5xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0c1220] shadow-2xl p-5 sm:p-8 space-y-6 cursor-default ${
          isRtl ? 'font-cairo' : 'font-sans'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-['Outfit'] text-slate-900 dark:text-slate-100">
                  {isRtl ? 'مقارنة وتحليل المرشحين الفلكيين' : 'Candidate Discovery Comparison Table'}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
                  {candidates.length} Detected Peaks
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isRtl
                  ? 'مقارنة تفصيلية لجميع النقاط المكتشفة في الرقعة السماوية حسب الأهمية الإحصائية ونسبة التشويش'
                  : 'Side-by-side comparative evidence for all statistically significant signals (|S| ≥ 3.0σ)'}
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

        {/* Comparison Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.08]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Candidate ID</th>
                <th className="py-3 px-3">Celestial Position (RA, Dec)</th>
                <th className="py-3 px-3">Peak S/N (σ)</th>
                <th className="py-3 px-3">ΔFlux (MJy/sr)</th>
                <th className="py-3 px-3">Artifact Score</th>
                <th className="py-3 px-3">Kinematics / Motion</th>
                <th className="py-3 px-3">Catalog Matches</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {candidates.map((cand) => {
                const isSelected = selectedCandidate?.id === cand.id;
                const gaiaMatch = cand.catalogMatches?.find((m) => m.catalog === 'Gaia DR3');
                const isMoving = cand.motion?.isMoving === true || cand.status === 'Moving object candidate';
                const isArtifact = cand.status === 'Possible artifact' || (cand.artifactScore ?? 0) >= 0.5;

                return (
                  <tr
                    key={cand.id}
                    className={`hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors ${
                      isSelected ? 'bg-amber-500/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      #{cand.id}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {cand.ra.toFixed(4)}°, {cand.dec.toFixed(4)}°
                    </td>
                    <td className="py-3 px-3 font-bold text-amber-600 dark:text-amber-400">
                      {cand.peakSignificance.toFixed(1)}σ
                    </td>
                    <td className="py-3 px-3 text-slate-800 dark:text-slate-200">
                      {cand.deltaFlux.toFixed(2)} ± {cand.deltaFluxUncertainty.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold ${
                          (cand.artifactScore ?? 0) >= 0.5 ? 'text-rose-500' : 'text-emerald-500'
                        }`}
                      >
                        {cand.artifactScore ? (cand.artifactScore * 100).toFixed(0) : '0'}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {isMoving ? (
                        <span className="text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1">
                          <Move className="w-3 h-3" />
                          <span>{cand.motion?.speedArcsecPerDay?.toFixed(1) || '0.6'}″/d</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Static</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      {gaiaMatch ? (
                        <span className="text-amber-600 dark:text-amber-300">Gaia DR3 ({gaiaMatch.separationArcsec.toFixed(1)}″)</span>
                      ) : (
                        <span className="text-slate-400">None in cone</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isMoving
                            ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30'
                            : isArtifact
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {cand.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCandidate(cand);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        {isRtl ? 'فحص' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
