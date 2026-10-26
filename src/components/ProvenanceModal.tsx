import React from 'react';
import { X, ExternalLink, ShieldCheck, Database, Cpu, Hash, Clock, CheckCircle2 } from 'lucide-react';
import { ProvenanceRecord } from '../science/types';

interface ProvenanceModalProps {
  provenance: ProvenanceRecord;
  onClose: () => void;
}

export const ProvenanceModal: React.FC<ProvenanceModalProps> = ({ provenance, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-xl border border-[#1e2f57] bg-[#080e1e] shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#142347]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-100 font-['Outfit']">Scientific Provenance & Audit Trail</h3>
              <p className="text-xs text-slate-400">Verifiable chain of custody from official NASA/IPAC archives</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
          {/* Data Source */}
          <div className="p-3.5 rounded-lg bg-[#0b142b] border border-[#17274f]">
            <div className="flex items-center gap-2 text-amber-400 font-medium mb-1">
              <Database className="h-4 w-4" />
              <span>Official Archive Source</span>
            </div>
            <p className="text-slate-300 mb-2">{provenance.irsaArchiveSource}</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
              <div>Type: <span className="text-amber-300 font-bold">{provenance.investigationType || 'Curated Archival Case'}</span></div>
              <div>Data Release: <span className="text-slate-200">{provenance.dataRelease}</span></div>
              <div>Run Timestamp: <span className="text-slate-200">{new Date(provenance.timestamp).toUTCString()}</span></div>
              <div>Case ID: <span className="text-slate-200">{provenance.caseId}</span></div>
            </div>
          </div>

          {/* Observations & FITS Checksums */}
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-amber-400" />
              <span>Cryptographic Integrity (SHA-256 Checksums)</span>
            </div>

            {/* Obs 1 */}
            <div className="p-3 rounded-lg bg-[#0a1124] border border-[#152347]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-200">Epoch 1: {provenance.obsId1}</span>
                <a
                  href={provenance.fitsUrl1}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <span>IRSA FITS</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="font-mono text-[10px] text-slate-400 break-all bg-[#050814] p-1.5 rounded border border-[#121c38]">
                SHA-256: {provenance.fitsChecksum1}
              </div>
            </div>

            {/* Obs 2 */}
            <div className="p-3 rounded-lg bg-[#0a1124] border border-[#152347]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-200">Epoch 2: {provenance.obsId2}</span>
                <a
                  href={provenance.fitsUrl2}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <span>IRSA FITS</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="font-mono text-[10px] text-slate-400 break-all bg-[#050814] p-1.5 rounded border border-[#121c38]">
                SHA-256: {provenance.fitsChecksum2}
              </div>
            </div>
          </div>

          {/* Algorithm Versioning */}
          <div className="p-3.5 rounded-lg bg-[#0b142b] border border-[#17274f]">
            <div className="flex items-center gap-2 text-sky-400 font-medium mb-2">
              <Cpu className="h-4 w-4" />
              <span>Pipeline Algorithms & Standards</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-slate-400">FITS Parser:</span> <span className="text-slate-200">{provenance.algorithms.fitsParser}</span></div>
              <div><span className="text-slate-400">WCS Projection:</span> <span className="text-slate-200">{provenance.algorithms.wcsReprojection}</span></div>
              <div><span className="text-slate-400">Differencing:</span> <span className="text-slate-200">{provenance.algorithms.differenceMethod}</span></div>
              <div><span className="text-slate-400">Noise Estimator:</span> <span className="text-slate-200">{provenance.algorithms.noiseEstimation}</span></div>
              <div><span className="text-slate-400">Photometry:</span> <span className="text-slate-200">{provenance.algorithms.photometry}</span></div>
              <div><span className="text-slate-400">Artifact Filter:</span> <span className="text-slate-200">{provenance.algorithms.artifactFilter}</span></div>
            </div>
          </div>

          {/* Reproducibility statement */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-[11px]">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
            <p>
              This investigation is 100% reproducible. Anyone can download the raw FITS files from the Caltech/IPAC IRSA archive using the URLs above and verify the SHA-256 hashes and calculated values.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-[#142347] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close Provenance
          </button>
        </div>
      </div>
    </div>
  );
};
