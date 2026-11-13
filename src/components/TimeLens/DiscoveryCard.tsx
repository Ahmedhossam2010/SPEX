import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Layers, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { GlassPanel } from '../../design/components/GlassPanel';
import { Badge } from '../../design/components/Badge';
import { Meter } from '../../design/components/Meter';
import { Button } from '../../design/components/Button';
import { ScienceTooltip } from '../../design/components/ScienceTooltip';
import { CandidateDetection } from '../../science/types';
import {
  SourceClassification,
  normalizeSourceClassification,
  getSourceClassificationMeta,
} from '../../science/provenance';
import { Language, translations } from '../../utils/translations';
import { SPEX_HERO_IMAGE } from '../../spex/spexAssets';

export interface DiscoveryCardProps {
  candidate: CandidateDetection;
  viewMode: 'beginner' | 'explorer' | 'scientist';
  language: Language;
  sourceClassification?: SourceClassification | string;
  discoveryEligible?: boolean;
  onClose?: () => void;
  className?: string;
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
  candidate,
  viewMode,
  language,
  sourceClassification,
  discoveryEligible,
  onClose,
  className = '',
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  const [showScientistDetails, setShowScientistDetails] = useState<boolean>(viewMode === 'scientist');
  const resolvedClass = normalizeSourceClassification(sourceClassification, {
    sourceMode: sourceClassification ? undefined : 'live',
  });
  const classMeta = getSourceClassificationMeta(resolvedClass, language);
  const isDiscoveryAllowed =
    typeof discoveryEligible === 'boolean' ? discoveryEligible : classMeta.discoveryEligible;

  // Convert significance sigma into 1-5 confidence level
  const sig = candidate.peakSignificance || 0;
  const confidenceLevel = Math.max(
    1,
    Math.min(5, Math.round((Math.abs(sig) / 10) * 5))
  );

  // Spoken verdict in natural plain words
  const verdictText = (() => {
    if (candidate.scientificClassification === 'POSSIBLE_MOVING_OBJECT' || candidate.motion?.isMoving) {
      return isRtl ? 'هذه النقطة تحركت وتغير موقعها في الفضاء!' : 'This dot moved across space!';
    }
    if (candidate.scientificClassification === 'SIGNIFICANT_FLUX_CHANGE' || candidate.status === 'Significant flux change') {
      return isRtl ? 'هذا الجرم ومض وازداد سطوعه بشكل ملحوظ!' : 'This celestial source flared and changed brightness!';
    }
    if (candidate.scientificClassification === 'REGISTRATION_OR_PSF_ARTIFACT' || candidate.status === 'Possible artifact') {
      return isRtl ? 'احذر: هذا بكسل مشوش أو خلل في الكاشف، وليس جرماً حقيقياً.' : "Warning: Instrument glitch detected in quality mask. Don't trust this one.";
    }
    return isRtl ? 'رصدنا تغيراً ضوئياً حقيقياً هنا!' : 'A genuine photometric change detected here!';
  })();

  const whatItCouldBe = candidate.catalogMatches && candidate.catalogMatches.length > 0
    ? `${candidate.catalogMatches[0].catalog}: ${candidate.catalogMatches[0].identifier} (${candidate.catalogMatches[0].objectType || 'Known source'})`
    : candidate.status === 'Likely known source'
    ? 'Known stellar reference'
    : candidate.status === 'Possible artifact'
    ? 'Instrumental detector artifact (flagged)'
    : 'Unknown moving sub-stellar candidate or high proper-motion dwarf';

  return (
    <GlassPanel hasCropMarks glow className={`p-4 sm:p-5 max-w-md w-full ${className}`}>
      {/* Header: Cat avatar + Verdict */}
      <div className="flex items-start gap-3.5 mb-3.5">
        <div className="relative shrink-0 w-12 h-12 rounded-xl bg-amber-500/10 border border-[#FFB900]/30 overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(255,185,0,0.25)]">
          <img
            src={SPEX_HERO_IMAGE}
            alt="SPEX Cat Guide"
            className="w-full h-full object-contain p-1"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-mono text-[10px] text-[#FFB900] uppercase tracking-wider font-semibold">
              {isDiscoveryAllowed ? 'SPEX VERDICT' : 'SPEX REFERENCE AUDIT'}
            </span>
            <Badge
              variant={resolvedClass}
              customText={classMeta.shortTag}
              size="sm"
            />
          </div>

          <h4 className="text-sm sm:text-base font-serif font-bold text-[#F1F5F9] leading-snug mt-0.5">
            {verdictText}
          </h4>
        </div>
      </div>

      {!isDiscoveryAllowed && (
        <div className="mb-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-[11px] font-mono flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>{t.provenanceDiscoveryBlocked} ({classMeta.badgeLabel})</span>
        </div>
      )}

      {/* 1. What it could be */}
      <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 mb-3">
        <span className="text-[10px] font-mono uppercase text-[#00D3F3] tracking-wider block mb-1">
          {isRtl ? 'ماذا يمكن أن يكون هذا الجرم؟' : 'What could this be?'}
        </span>
        <p className="text-xs sm:text-sm text-[#F1F5F9] font-sans font-medium leading-relaxed">
          {whatItCouldBe}
        </p>
      </div>

      {/* 2. 5-Level Confidence Meter */}
      <div className="mb-4">
        <Meter
          level={confidenceLevel}
          significanceSigma={sig}
        />
      </div>

      {/* 3. Collapsed Scientist Details Button */}
      <button
        type="button"
        onClick={() => setShowScientistDetails(!showScientistDetails)}
        className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/10 text-xs text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.05] transition-all cursor-pointer font-mono"
      >
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#00D3F3]" />
          <span>{showScientistDetails ? (isRtl ? 'إخفاء البيانات التقنية' : 'Hide Technical Data') : (isRtl ? 'تفاصيل العالم (FITS)' : 'Learn More (Scientist View)')}</span>
        </span>
        {showScientistDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Scientist Technical Details */}
      {showScientistDetails && (
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2 font-mono text-[11px] text-[#94A3B8] animate-in fade-in duration-200">
          <div className="flex justify-between">
            <span>RA / DEC:</span>
            <span className="text-[#F1F5F9]">{candidate.ra.toFixed(5)}°, {candidate.dec.toFixed(5)}°</span>
          </div>

          <div className="flex justify-between">
            <span>FLUX DIFFERENCE:</span>
            <span className="text-[#00D3F3]">{candidate.deltaFlux.toFixed(3)} MJy/sr</span>
          </div>

          <div className="flex justify-between">
            <span>PEAK SIGNIFICANCE:</span>
            <span className="text-[#FFB900]">{sig.toFixed(2)}σ</span>
          </div>

          {candidate.artifactFlags && candidate.artifactFlags.length > 0 && (
            <div className="flex justify-between">
              <span>FLAGS:</span>
              <span className="text-rose-400">
                {candidate.artifactFlags.join(', ')}
              </span>
            </div>
          )}

          {candidate.catalogMatches && candidate.catalogMatches.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/[0.06]">
              <span className="text-[10px] text-slate-500 uppercase block mb-1">Catalog Cross-Match:</span>
              {candidate.catalogMatches.slice(0, 2).map((m, i) => (
                <div key={i} className="flex justify-between text-[#F1F5F9]">
                  <span>{m.catalog} {m.identifier}</span>
                  <span className="text-slate-400">{m.separationArcsec.toFixed(2)}″ sep</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </GlassPanel>
  );
};
