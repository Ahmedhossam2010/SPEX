import React from 'react';
import { X, ExternalLink, ShieldCheck, Database, Cpu, Hash, Clock, CheckCircle2, Radio } from 'lucide-react';
import { ProvenanceRecord, EvidenceSummary } from '../science/types';
import { Language, translations } from '../utils/translations';

interface ProvenanceModalProps {
  provenance: ProvenanceRecord;
  compatibility?: {
    isCompatible: boolean;
    reason?: string;
    timeBaselineDays: number;
    wavelengthDiffUm: number;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        className={`relative w-full max-w-2xl rounded-3xl border border-white/15 bg-[#050b18]/95 shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-6 overflow-hidden backdrop-blur-2xl ${
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
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                <Database className="h-4 w-4" />
                <span>Official Archive Source</span>
              </div>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  provenance.sourceMode === 'live'
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                }`}
              >
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                <span>{provenance.sourceMode === 'live' ? 'Live IRSA Query' : 'Saved Benchmark'}</span>
              </div>
            </div>
            <p className="text-slate-300 mb-3 text-[11px] leading-relaxed">{provenance.irsaArchiveSource}</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div>Type: <span className="text-amber-300 font-bold">{provenance.investigationType || 'Curated Archival Case'}</span></div>
              <div>Release: <span className="text-slate-200">{provenance.dataRelease}</span></div>
              <div>Timestamp: <span className="text-slate-200">{new Date(provenance.timestamp).toUTCString()}</span></div>
              <div>Case ID: <span className="text-slate-200">{provenance.caseId}</span></div>
            </div>
          </div>

          {/* Observations & FITS Checksums */}
          <div className="space-y-2.5">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-amber-400" />
              <span>Cryptographic Integrity (SHA-256 Checksums)</span>
            </div>

            {/* Obs 1 */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-200">Epoch 1: {provenance.obsId1}</span>
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
                <span className="font-bold text-slate-200">Epoch 2: {provenance.obsId2}</span>
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

          {/* Reproducibility statement */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-[11px] leading-relaxed">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
            <p>
              This investigation is 100% reproducible. The raw FITS files can be directly retrieved from the Caltech/IPAC IRSA archive using the URLs above and checked against the SHA-256 cryptographic hashes.
            </p>
          </div>
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
