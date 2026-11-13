import React from 'react';
import { X, ExternalLink, ShieldCheck, AlertTriangle, Database, Cpu, Hash, CheckCircle2, Radio } from 'lucide-react';
import { ProvenanceRecord, EvidenceSummary } from '../science/types';
import { canClaimDiscovery, getSourceClassificationMeta } from '../science/provenance';
import { Language, translations } from '../utils/translations';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface ProvenanceModalProps {
  provenance: ProvenanceRecord;
  compatibility?: {
    isCompatible: boolean;
    reason?: string;
    timeBaselineDays: number;
    wavelengthDiffUm: number;
    integrationDuration1Sec?: number;
    integrationDuration2Sec?: number;
    startToStartCadenceSec?: number;
    interExposureGapSec?: number;
  };
  evidence?: EvidenceSummary;
  onClose: () => void;
  language?: Language;
}

export const ProvenanceModal: React.FC<ProvenanceModalProps> = ({
  provenance,
  compatibility,
  evidence,
  onClose,
  language = 'en',
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];
  const gate = canClaimDiscovery({ provenance, ...provenance });
  const meta = getSourceClassificationMeta(gate.sourceClassification, language);

  useModalBehavior(true, onClose);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#050b18]/95 shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-6 backdrop-blur-2xl cursor-default ${
          isRtl ? 'font-cairo' : 'font-sans'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Subtle Ambient Space Gradient Glow */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-['Outfit'] tracking-wide">
                {language === 'ar' ? 'سلسلة التوثيق العلمي والمصدر (Provenance)' : 'Scientific Provenance & Audit Trail'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {language === 'ar' ? 'سلسلة بيانات معتمدة من أرشيف NASA/IPAC IRSA الرسمي' : 'Verifiable chain of custody from official NASA/IPAC archives'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs font-mono">
          {/* Data Source & Status */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                <Database className="h-4 w-4" />
                <span>{isRtl ? 'التصنيف والمصدر المرجعي' : 'Canonical Source Classification'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    meta.tone === 'emerald'
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : meta.tone === 'cyan'
                      ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                      : meta.tone === 'amber'
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                      : meta.tone === 'indigo'
                      ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
                      : meta.tone === 'orange'
                      ? 'border-orange-500/40 bg-orange-500/15 text-orange-300'
                      : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                  }`}
                >
                  <Radio className="h-2.5 w-2.5" />
                  <span>{meta.badgeLabel}</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    gate.allowed
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                  }`}
                >
                  {gate.allowed ? t.provenanceDiscoveryEligible : t.provenanceDiscoveryBlocked}
                </span>
              </div>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">{provenance.irsaArchiveSource}</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div>Classification: <span className="text-slate-100 font-bold">{gate.sourceClassification}</span></div>
              <div>Discovery Eligible: <span className={gate.allowed ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold'}>{gate.allowed ? 'YES' : 'NO'}</span></div>
              <div>TAP Freshness: <span className="text-slate-200">{provenance.tapFreshness || (provenance.sourceMode === 'live' ? 'live' : 'snapshot')}</span></div>
              <div>FITS Origin: <span className="text-slate-200">{provenance.fitsOrigin || (provenance.sourceMode === 'live' ? 'live_ibe' : 'saved_snapshot')}</span></div>
              <div>Type: <span className="text-amber-300 font-bold">{provenance.investigationType || 'Curated Archival Case'}</span></div>
              <div>Release: <span className="text-slate-200">{provenance.dataRelease}</span></div>
              <div>Timestamp: <span className="text-slate-200">{new Date(provenance.timestamp).toUTCString()}</span></div>
              <div>Case ID: <span className="text-slate-200">{provenance.caseId}</span></div>
              {compatibility?.integrationDuration1Sec !== undefined && (
                <div>
                  Integration (DATE-END−OBS):{' '}
                  <span className="text-slate-200">
                    {compatibility.integrationDuration1Sec.toFixed(3)}s / {(compatibility.integrationDuration2Sec ?? compatibility.integrationDuration1Sec).toFixed(3)}s
                  </span>
                </div>
              )}
              {compatibility?.startToStartCadenceSec !== undefined && (
                <div>
                  Start-to-Start Cadence (ΔDATE-OBS):{' '}
                  <span className="text-slate-200">{compatibility.startToStartCadenceSec.toFixed(3)}s</span>
                </div>
              )}
              {compatibility?.interExposureGapSec !== undefined && (
                <div>
                  Inter-Exposure Endpoint Gap:{' '}
                  <span className="text-slate-200">{compatibility.interExposureGapSec.toFixed(3)}s</span>
                </div>
              )}
              <div>Cadence Regime: <span className="text-amber-300 font-semibold">Intra-Visit (consecutive exposures, not 6 months)</span></div>
            </div>
          </div>

          {/* Observations & FITS Checksums */}
          <div className="space-y-2.5">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-amber-400" />
              <span>Cryptographic Integrity (SHA-256 Checksums · {gate.observationIds.length} Observation IDs)</span>
            </div>

            {Array.isArray(provenance.fitsChecksums) && provenance.fitsChecksums.length > 0 ? (
              provenance.fitsChecksums.map((rec, idx) => (
                <div key={`${rec.obsId}-${idx}`} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-slate-200">
                      Exposure {idx + 1}: {rec.obsId} {rec.detector ? `(${rec.detector})` : ''}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border ${
                        rec.verified
                          ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                          : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                      }`}
                    >
                      {rec.origin} · {rec.verified ? 'SHA-256 VERIFIED' : 'UNVERIFIED'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 break-all bg-black/60 p-2 rounded-xl border border-white/5 font-mono">
                    SHA-256: {rec.sha256}
                  </div>
                </div>
              ))
            ) : (
              <>
                {/* Obs 1 */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-200">Exposure 1: {provenance.obsId1}</span>
                    <a
                      href={provenance.fitsUrl1}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <span>IRSA FITS Cutout</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="text-[10px] text-slate-400 break-all bg-black/60 p-2 rounded-xl border border-white/5 font-mono">
                    SHA-256: {provenance.fitsChecksum1}
                  </div>
                </div>

                {/* Obs 2 */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-200">Exposure 2: {provenance.obsId2}</span>
                    <a
                      href={provenance.fitsUrl2}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <span>IRSA FITS Cutout</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="text-[10px] text-slate-400 break-all bg-black/60 p-2 rounded-xl border border-white/5 font-mono">
                    SHA-256: {provenance.fitsChecksum2}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Algorithm Versioning */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 text-sky-400 font-semibold mb-2.5">
              <Cpu className="h-4 w-4" />
              <span>Pipeline Algorithms & Physical Standards</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-slate-500">FITS Parser:</span> <span className="text-slate-200">{provenance.algorithms.fitsParser}</span></div>
              <div><span className="text-slate-500">Registration:</span> <span className="text-slate-200">{provenance.algorithms.wcsReprojection}</span></div>
              <div><span className="text-slate-500">Differencing:</span> <span className="text-slate-200">{provenance.algorithms.differenceMethod}</span></div>
              <div><span className="text-slate-500">Noise Estimator:</span> <span className="text-slate-200">{provenance.algorithms.noiseEstimation}</span></div>
              <div><span className="text-slate-500">Photometry:</span> <span className="text-slate-200">{provenance.algorithms.photometry}</span></div>
              <div><span className="text-slate-500">Artifact Filter:</span> <span className="text-slate-200">{provenance.algorithms.artifactFilter}</span></div>
            </div>
          </div>

          {/* Reproducibility & Eligibility statement */}
          {gate.allowed ? (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-[11px] leading-relaxed">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
              <p>
                {gate.reason} Deterministically traceable to Caltech/IPAC IRSA observation IDs and SHA-256 FITS hashes above.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/35 text-amber-200 text-[11px] leading-relaxed">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
              <p>
                <strong>{t.provenanceDiscoveryBlocked}:</strong> {gate.reason}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-mono font-bold rounded-xl bg-white/10 hover:bg-white/15 text-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
