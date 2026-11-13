import React, { useState } from 'react';
import {
  Sparkles,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crosshair,
  ShieldCheck,
  Move,
  FileText,
} from 'lucide-react';
import { CandidateDetection } from '../science/types';
import {
  SourceClassification,
  normalizeSourceClassification,
  getSourceClassificationMeta,
} from '../science/provenance';
import { ScienceTerm } from './ScienceTerm';
import { Language, translations } from '../utils/translations';

interface FindingCardProps {
  candidate: CandidateDetection;
  isSelected: boolean;
  onSelect: (candidate: CandidateDetection) => void;
  onLocate: (candidate: CandidateDetection) => void;
  onAskSpex: (prompt: string) => void;
  onOpenPassport?: (candidate: CandidateDetection) => void;
  language: Language;
  sourceClassification?: SourceClassification | string;
  discoveryEligible?: boolean;
}

export const FindingCard: React.FC<FindingCardProps> = ({
  candidate,
  isSelected,
  onSelect,
  onLocate,
  onAskSpex,
  onOpenPassport,
  language,
  sourceClassification,
  discoveryEligible,
}) => {
  const [showTechnical, setShowTechnical] = useState(false);
  const isRtl = language === 'ar';
  const t = translations[language];
  const resolvedClass = normalizeSourceClassification(sourceClassification, {
    sourceMode: sourceClassification ? undefined : 'live',
  });
  const classMeta = getSourceClassificationMeta(resolvedClass, language);
  const isDiscoveryAllowed =
    typeof discoveryEligible === 'boolean' ? discoveryEligible : classMeta.discoveryEligible;

  const isMoving = candidate.motion?.isMoving === true || candidate.status === 'Moving object candidate';
  const isArtifact = candidate.status === 'Possible artifact' || (candidate.artifactScore ?? 0) >= 0.5;
  const gaiaMatch = candidate.catalogMatches?.find((m) => m.catalog === 'Gaia DR3');
  const allwiseMatch = candidate.catalogMatches?.find((m) => m.catalog === 'AllWISE');
  const isKnownStar = Boolean(gaiaMatch || allwiseMatch);

  // Generate plain-English headline
  const getHeadline = () => {
    if (candidate.scientificClassification === 'POSSIBLE_MOVING_OBJECT' || isMoving) {
      return isRtl ? 'جرم متحرك مرصود' : 'Moving Object Candidate';
    }
    if (candidate.scientificClassification === 'REGISTRATION_OR_PSF_ARTIFACT' || isArtifact) {
      return isRtl ? 'عيب محاذاة / أثر نقطي (مستبعد)' : 'Registration / PSF Artifact (Filtered)';
    }
    if (candidate.scientificClassification === 'STATIONARY_SOURCE_RESIDUAL') {
      return isRtl ? 'أثر متبقٍ لمصدر ثابت' : 'Stationary Source Residual';
    }
    if (candidate.scientificClassification === 'INSUFFICIENT_EVIDENCE') {
      return isRtl ? 'أدلة غير كافية' : 'Insufficient Evidence';
    }
    if (isKnownStar) {
      return isRtl ? 'نجم متغير مسجل' : 'Cataloged Variable Star';
    }
    return isRtl ? 'تغير ضوئي ذو دلالة' : 'Significant Flux Change';
  };

  // Generate plain-English explanation
  const getPlainSummary = () => {
    if (isMoving) {
      const sep = candidate.motion?.separationArcsec ? `${candidate.motion.separationArcsec.toFixed(1)}″` : '12″';
      const pa = candidate.motion?.positionAngleDeg != null ? `${candidate.motion.positionAngleDeg.toFixed(0)}°` : '0°';
      return isRtl
        ? `بصمة حركة واضحة بين الصورتين (ثنائي قطب) بانزياح ${sep} وزاوية ${pa}. من المحتمل أن يكون كويكباً في المجموعة الشمسية أو نجماً قريباً سريعاً.`
        : `Paired light-and-dark signature detected with ${sep} shift at ${pa} position angle, characteristic of an asteroid or fast-moving star.`;
    }
    if (isArtifact) {
      return isRtl
        ? `تأثر هذا الموضع بتشبع بكسلات الكاميرا أو ضربة أشعة كونية (${candidate.whyFlagged || 'عيب جودة بيانات'}). تم استبعاده لضمان دقة الاكتشافات.`
        : `Pixel affected by detector saturation or cosmic-ray strike (${candidate.whyFlagged || 'data quality mask'}). Filtered to keep science clean.`;
    }
    if (gaiaMatch) {
      return isRtl
        ? `يطابق نجماً مسجلاً في فهرس جايا (${gaiaMatch.identifier}) على بعد ${gaiaMatch.separationArcsec.toFixed(2)}″. التغير ناتج عن سطوع نجمي حقيقي.`
        : `Matches cataloged star ${gaiaMatch.identifier} within ${gaiaMatch.separationArcsec.toFixed(2)}″. Likely genuine stellar variability.`;
    }
    return isRtl
      ? `رصد تغير ضوئي واضح في هذا الموقع بقوة ${candidate.peakSignificance.toFixed(1)} ضعف مستوى الضوضاء المحيطة.`
      : `Clear infrared brightness variation detected at ${candidate.peakSignificance.toFixed(1)} times the local background noise level.`;
  };

  return (
    <div
      onClick={() => onSelect(candidate)}
      className={`rounded-2xl p-4 transition-all duration-150 cursor-pointer border ${
        isSelected
          ? 'bg-amber-500/[0.08] dark:bg-amber-500/[0.12] border-amber-500/60 shadow-md ring-1 ring-amber-500/40'
          : 'bg-white dark:bg-[#0c1220] hover:bg-slate-50 dark:hover:bg-white/[0.03] border-slate-200 dark:border-white/[0.08] shadow-xs'
      }`}
    >
      {/* Top Header: Title & Significance */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
              #{candidate.id}
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
              {getHeadline()}
            </h4>
          </div>

          {/* Clean quiet classification line (Zero-pill discipline) */}
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {isMoving && (
              <span className="text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1">
                <Move className="w-3 h-3" />
                <span>{isRtl ? 'حركة ثنائي القطب' : 'Dipole Motion'}</span>
              </span>
            )}
            {isArtifact && (
              <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>{isRtl ? 'عيب حساس' : 'Detector Glitch'}</span>
              </span>
            )}
            {isKnownStar && (
              <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>{isRtl ? 'مطابق للفهرس' : 'Catalog Match'}</span>
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span>RA {candidate.ra.toFixed(4)}°</span>
            <span aria-hidden="true">·</span>
            <span>Dec {candidate.dec.toFixed(4)}°</span>
          </div>
        </div>

        {/* Confidence metric indicator */}
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <ScienceTerm termKey="sigma" language={language} showSimpleLabel={true} />
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {candidate.peakSignificance.toFixed(1)}σ
          </div>
        </div>
      </div>

      {!isDiscoveryAllowed && (
        <div className="mt-2.5 p-2 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-200 text-[10px] font-mono flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{t.provenanceDiscoveryBlocked} · {classMeta.badgeLabel}</span>
        </div>
      )}

      {/* Plain Language Summary */}
      <p className="mt-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
        {getPlainSummary()}
      </p>

      {/* Key metrics row */}
      <div className="mt-3 grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] text-xs">
        <div>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">
            <ScienceTerm termKey="flux" language={language} showSimpleLabel={true} />
          </span>
          <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
            {candidate.deltaFlux > 0 ? '+' : ''}
            {candidate.deltaFlux.toFixed(2)}{' '}
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
              <ScienceTerm termKey="mjy_sr" language={language} showSimpleLabel={false} overrideLabel="MJy/sr" />
            </span>
          </span>
        </div>

        <div>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">
            {isMoving ? (
              <ScienceTerm termKey="proper_motion" language={language} showSimpleLabel={true} />
            ) : (
              <ScienceTerm termKey="cross_match" language={language} showSimpleLabel={true} />
            )}
          </span>
          <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
            {isMoving && candidate.motion?.separationArcsec
              ? `${candidate.motion.separationArcsec.toFixed(1)}″ (${candidate.motion.positionAngleDeg?.toFixed(0) || 0}°)`
              : gaiaMatch
              ? `Gaia ${gaiaMatch.identifier.slice(0, 10)}...`
              : isRtl ? 'غير مفهرس' : 'Uncataloged'}
          </span>
        </div>
      </div>

      {/* 4 Core Scientific Questions (NASA Challenge Requirement) */}
      <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] text-[11px] space-y-2">
        <div className="font-mono font-bold text-[10px] tracking-wider text-amber-600 dark:text-amber-400 uppercase flex items-center justify-between">
          <span>{isRtl ? 'الأسئلة العلمية الأربعة' : '4 Core Scientific Questions'}</span>
          <span className="text-slate-500 font-normal">NASA SPHEREx Standard</span>
        </div>

        <div className="space-y-1.5 leading-relaxed text-slate-700 dark:text-slate-300">
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100 mr-1 font-sans">
              1. {isRtl ? 'ماذا رصدنا؟' : 'What did we observe?'}
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              {isRtl
                ? `جرم تحت أحمر عند RA ${candidate.ra.toFixed(4)}°، Dec ${candidate.dec.toFixed(4)}° عبر كاشف SPHEREx.`
                : `Infrared point source at RA ${candidate.ra.toFixed(4)}°, Dec ${candidate.dec.toFixed(4)}° captured by SPHEREx.`}
            </span>
          </div>

          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100 mr-1 font-sans">
              2. {isRtl ? 'ما الذي تغير؟' : 'What changed?'}
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              {candidate.deltaFlux > 0
                ? (isRtl ? `ارتفع السطوع بمقدار +${candidate.deltaFlux.toFixed(2)} MJy/sr (توهج / زيادة تدفق).` : `Flux surged by +${candidate.deltaFlux.toFixed(2)} MJy/sr between visits (brightness flare).`)
                : (isRtl ? `انخفض السطوع بمقدار ${candidate.deltaFlux.toFixed(2)} MJy/sr (خفوت / كسوف).` : `Flux dropped by ${candidate.deltaFlux.toFixed(2)} MJy/sr between visits (dimming/eclipse).`)}
            </span>
          </div>

          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100 mr-1 font-sans">
              3. {isRtl ? 'ما مدى قوة الأدلة؟' : 'How strong is the evidence?'}
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              {isRtl
                ? `دلالة إحصائية ${candidate.peakSignificance.toFixed(1)}σ أعلى من التباين المحلي (${candidate.peakSignificance >= 5 ? 'مؤكدة إحصائياً >5σ' : 'إشارة متوسطة'}).`
                : `${candidate.peakSignificance.toFixed(1)}σ significance above propagated noise variance (${candidate.peakSignificance >= 5 ? 'Statistically robust >5σ' : 'Moderate confidence'}).`}
            </span>
          </div>

          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100 mr-1 font-sans">
              4. {isRtl ? 'ما الذي يفسر هذا التغير؟' : 'What could explain this change?'}
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              {isMoving
                ? (isRtl ? 'حركة كويكب في المجموعة الشمسية أو جرم سريع، أنتجت بصمة ثنائي القطب.' : 'Orbital motion of an asteroid or proper-motion star producing dipole signature.')
                : isArtifact
                ? (isRtl ? 'أثر نقطي أو تشبع حساس (تم عزله لضمان دقة البحث العلمي).' : 'Detector glitch or cosmic-ray hit (flagged and isolated for scientific rigor).')
                : gaiaMatch
                ? (isRtl ? `تغير لمعان حقيقي لنجم مسجل في فهرس جايا (${gaiaMatch.identifier}).` : `Genuine stellar variability in catalog star ${gaiaMatch.identifier}.`)
                : isDiscoveryAllowed
                ? (isRtl ? 'تغير ضوئي في جرم تحت أحمر غير مفهرس، مؤهل كمرشح اكتشاف جديد.' : 'Uncataloged infrared transient candidate worthy of archival followup.')
                : (isRtl ? 'مصدر مرجعي محفوظ أو قديم — يحتاج استعلاماً حياً من IRSA قبل اعتباره اكتشافاً جديداً.' : 'From non-live / reference source — live IRSA verification required before archival claim.')}
            </span>
          </div>
        </div>
      </div>

      {/* Actions Row */}
      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLocate(candidate);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Crosshair className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{isRtl ? 'تحديد على الخريطة' : 'Locate on Canvas'}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const prompt = isRtl
                ? `اشرح لي بالتفصيل المرشح رقم #${candidate.id} بأهمية ${candidate.peakSignificance.toFixed(1)}σ وهل هو كويكب أو نجم حقيقي؟`
                : `Explain candidate #${candidate.id} (${candidate.peakSignificance.toFixed(1)}σ) in detail. What is the evidence?`;
              onAskSpex(prompt);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isRtl ? 'اسأل SPEX' : 'Ask SPEX'}</span>
          </button>

          {onOpenPassport && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPassport(candidate);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title={
                isDiscoveryAllowed
                  ? 'Open full discovery report passport'
                  : 'Inspect non-live audit report (Passport export blocked)'
              }
            >
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {isDiscoveryAllowed
                  ? isRtl
                    ? 'الجواز'
                    : 'Passport'
                  : isRtl
                  ? 'تدقيق'
                  : 'Audit'}
              </span>
            </button>
          )}
        </div>

        {/* Technical Drawer Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowTechnical(!showTechnical);
          }}
          className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors p-1"
        >
          <span>{isRtl ? 'القياسات' : 'Data'}</span>
          {showTechnical ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Collapsible Scientific Measurements Drawer */}
      {showTechnical && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50 dark:bg-black/40 rounded-xl p-3 text-xs font-mono space-y-2 animate-in fade-in duration-150"
        >
          {candidate.scientificClassification && (
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Scientific Class:</span>
              <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                {candidate.scientificClassification}
              </span>
            </div>
          )}

          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Peak Pixel (X, Y):</span>
            <span className="text-slate-800 dark:text-slate-200">
              ({candidate.peakX ?? candidate.x}, {candidate.peakY ?? candidate.y})
            </span>
          </div>

          {candidate.centroidX != null && candidate.centroidY != null && (
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Subpixel Centroid:</span>
              <span className="text-cyan-700 dark:text-cyan-300">
                ({candidate.centroidX.toFixed(2)}, {candidate.centroidY.toFixed(2)})
                {candidate.centroidUncertaintyPix != null && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">
                    ±{candidate.centroidUncertaintyPix.toFixed(2)}px
                  </span>
                )}
              </span>
            </div>
          )}

          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Celestial (RA, Dec):</span>
            <span className="text-slate-800 dark:text-slate-200">
              {candidate.ra.toFixed(5)}°, {candidate.dec.toFixed(5)}°
            </span>
          </div>

          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Flux Uncertainty:</span>
            <span className="text-slate-800 dark:text-slate-200">
              ±{candidate.deltaFluxUncertainty.toFixed(4)} MJy/sr
            </span>
          </div>

          {candidate.apertureSignificance && (
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Aperture Photometry:</span>
              <span className="text-slate-800 dark:text-slate-200">
                {candidate.apertureSignificance.toFixed(2)}σ
              </span>
            </div>
          )}

          {gaiaMatch && (
            <div className="pt-2 border-t border-slate-200 dark:border-white/[0.06] text-indigo-600 dark:text-indigo-300">
              <div className="flex items-center justify-between">
                <span>Gaia DR3 Match:</span>
                <span className="font-semibold">{gaiaMatch.identifier}</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Separation: {gaiaMatch.separationArcsec.toFixed(3)}″ · {gaiaMatch.photometry || 'Optical source'}
              </div>
              {gaiaMatch.matchProvenance === 'BENCHMARK_FIXTURE_CACHE' && (
                <div className="mt-1 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                  {translations[language].catalogStaticBadge}
                </div>
              )}
            </div>
          )}

          {allwiseMatch && (
            <div className="pt-2 border-t border-slate-200 dark:border-white/[0.06] text-cyan-600 dark:text-cyan-300">
              <div className="flex items-center justify-between">
                <span>AllWISE Match:</span>
                <span className="font-semibold">{allwiseMatch.identifier}</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Separation: {allwiseMatch.separationArcsec.toFixed(3)}″ · {allwiseMatch.photometry || 'Mid-IR source'}
              </div>
              {allwiseMatch.matchProvenance === 'BENCHMARK_FIXTURE_CACHE' && (
                <div className="mt-1 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                  {translations[language].catalogStaticBadge}
                </div>
              )}
            </div>
          )}

          {candidate.artifactFlags && candidate.artifactFlags.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-white/[0.06] text-rose-600 dark:text-rose-300 text-[11px]">
              <div>DQ Flags:</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {candidate.artifactFlags.join(', ')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
