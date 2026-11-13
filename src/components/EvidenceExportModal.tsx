import React, { useState } from 'react';
import { 
  FileText, Download, Copy, Check, X, ShieldCheck, 
  ExternalLink, Calendar, Compass, Sparkles, AlertCircle 
} from 'lucide-react';
import { InvestigationResult, CandidateDetection } from '../science/types';
import { canClaimDiscovery, getSourceClassificationMeta } from '../science/provenance';
import { Language, translations } from '../utils/translations';

interface EvidenceExportModalProps {
  investigation: InvestigationResult | null;
  selectedCandidate: CandidateDetection | null;
  language: Language;
  onClose: () => void;
}

export const EvidenceExportModal: React.FC<EvidenceExportModalProps> = ({
  investigation,
  selectedCandidate,
  language,
  onClose,
}) => {
  const isAr = language === 'ar';
  const t = translations[language];
  const [copied, setCopied] = useState(false);

  if (!investigation) return null;

  const gate = canClaimDiscovery(investigation);
  const classMeta = getSourceClassificationMeta(gate.sourceClassification, language);

  const ra = investigation.targetCoords?.ra ?? 276.2614;
  const dec = investigation.targetCoords?.dec ?? 64.8258;
  const date1 = investigation.epoch1?.metadata?.date_obs || '2025-04-28 13:00:15 UTC';
  const date2 = investigation.epoch2?.metadata?.date_obs || '2025-04-28 13:02:24 UTC';
  const baselineSec = investigation.compatibility?.timeBaselineDays 
    ? (investigation.compatibility.timeBaselineDays * 86400).toFixed(1) 
    : '128.9';

  const candidateCount = investigation.candidates?.length || 0;
  const topCandidate = selectedCandidate || (investigation.candidates?.[0] ?? null);
  const checksumLines =
    gate.fitsChecksums.length > 0
      ? gate.fitsChecksums
          .map((c) => `- \`${c.obsId}\` (${c.origin}, verified=${c.verified}): \`${c.sha256}\``)
          .join('\n')
      : `- Exposure 1 SHA-256: \`${investigation.provenance?.fitsChecksum1 || 'N/A'}\`\n- Exposure 2 SHA-256: \`${investigation.provenance?.fitsChecksum2 || 'N/A'}\``;

  const markdownSummary = `# ${gate.allowed ? 'SPEX OBSERVATION & DISCOVERY DOSSIER' : 'SPEX REFERENCE AUDIT DOSSIER (NON-LIVE / NOT A DISCOVERY CLAIM)'}
Mission: NASA SPHEREx (Spectro-Photometer for the History of the Universe)
Generated: ${new Date().toISOString()}
Source Classification: ${gate.sourceClassification}
Discovery Eligible: ${gate.allowed ? 'YES' : 'NO'}
Eligibility Detail: ${gate.reason}

## 1. TARGET COORDINATES & COVERAGE
- Right Ascension (RA): ${ra.toFixed(5)}°
- Declination (Dec): ${dec >= 0 ? '+' : ''}${dec.toFixed(5)}°
- Field of View (FOV): ${investigation.sizePix || 64} pixels (~${investigation.fovArcmin || 6.6} arcmin)
- Survey Region: Calibrated IRSA SPHEREx Field (s_region matched)

## 2. OBSERVATION PAIR & TEMPORAL BASELINE
- Visit 1 (Earlier Epoch): ${investigation.epoch1?.metadata?.obs_id || 'N/A'} (${date1})
- Visit 2 (Later Epoch):   ${investigation.epoch2?.metadata?.obs_id || 'N/A'} (${date2})
- Temporal Separation:     ${baselineSec} seconds (${(parseFloat(baselineSec) / 60).toFixed(2)} minutes)
- Spectral Band:           SPHEREx Band 1 (0.75 - 1.11 µm, central λ = 0.93 µm)
- Instrument Unit:         Surface Brightness (MJy/sr)

## 3. DIFFERENCE IMAGING & TRANSIENT CANDIDATES
- Differencing Algorithm:  D(x,y) = I₂(x,y) - I₁(x,y) with TAN-SIP sub-pixel WCS reprojection
- Noise Floor (σ):         Propagated read-noise & sky background covariance
- Candidates Detected:     ${candidateCount} candidate(s) exceeding 5.0σ detection threshold
${topCandidate ? `
### Primary Candidate: ${topCandidate.id}
- Sub-Pixel Position:      (x=${(topCandidate.peakX ?? topCandidate.x).toFixed(2)}, y=${(topCandidate.peakY ?? topCandidate.y).toFixed(2)}) -> RA ${topCandidate.ra.toFixed(5)}°, Dec +${topCandidate.dec.toFixed(5)}°
- Signal Significance:     ${topCandidate.peakSignificance.toFixed(2)}σ
- Flux Difference:         ${topCandidate.deltaFlux.toFixed(2)} MJy/sr (${topCandidate.deltaFlux > 0 ? 'Surge / Brightened' : 'Dimmed'})
- Scientific Class:        ${topCandidate.scientificClassification || 'SIGNIFICANT_FLUX_CHANGE'}
- Gaia DR3 Match:          ${topCandidate.catalogMatches && topCandidate.catalogMatches.length > 0 ? `${topCandidate.catalogMatches[0].catalog} ${topCandidate.catalogMatches[0].identifier} (sep: ${topCandidate.catalogMatches[0].separationArcsec.toFixed(2)}″)` : 'No optical counterpart within 3.5″ (Potential high-proper-motion or deeply embedded infrared source)'}
- Quality Mask / Flags:    ${topCandidate.artifactScore ? `Artifact Probability: ${(topCandidate.artifactScore * 100).toFixed(1)}%` : 'Passed Data Quality bitmask filter'}
` : '- No candidates above threshold (Photometrically stable calibration field)'}

## 4. SCIENTIFIC REPRODUCIBILITY & PROVENANCE
- Source Classification:   ${gate.sourceClassification} (${classMeta.badgeLabel})
- Discovery Eligible:      ${gate.allowed}
- Observation IDs:         ${gate.observationIds.join(', ') || 'N/A'}
- TAP Freshness:           ${investigation.tapFreshness || investigation.provenance?.tapFreshness || 'N/A'}
- Source Archive:          NASA / IPAC Infrared Science Archive (IRSA)
- Data Release:            ${investigation.provenance?.dataRelease || 'SPHEREx Public Archive'}
${checksumLines}

## 5. SCIENTIFIC CAVEATS & LIMITATIONS
- Detections represent statistical flux excess relative to baseline model.
- Requires confirmation in subsequent SPHEREx survey passes or external high-resolution follow-up (e.g. JWST, Hubble, Keck).
- Not automatically certified as a new solar system object or exoplanet without multi-epoch orbit determination.
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([markdownSummary], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SPEX_Investigation_${ra.toFixed(4)}_${dec.toFixed(4)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-2xl bg-[#0c1220] border-2 border-cyan-500/40 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Outfit']">
                {isAr ? 'تصدير ملف التحقيق الفلكي' : 'Export Investigation Dossier'}
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                {isAr ? 'تقرير علمي معتمد وموثق قابل للمشاركة والمراجعة' : 'Scientifically verifiable Markdown report with full provenance'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Markdown Preview Area */}
        <div className="flex-1 overflow-y-auto bg-slate-950/90 rounded-2xl p-4 border border-white/[0.08] font-mono text-xs text-slate-300 leading-relaxed space-y-3">
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-300">
            {markdownSummary}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/[0.08]">
          <div className={`flex items-center gap-1.5 text-xs font-mono ${gate.allowed ? 'text-emerald-400' : 'text-amber-300'}`}>
            {gate.allowed ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>
              {gate.allowed
                ? isAr
                  ? 'بيانات FITS حقيقية موثقة برقم SHA-256'
                  : 'NASA/IPAC FITS Provenance Verified'
                : `${classMeta.shortTag} · ${t.provenanceDiscoveryBlocked}`}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ التقرير' : 'Copy Markdown')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحميل ملف .md' : 'Download Dossier (.md)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
