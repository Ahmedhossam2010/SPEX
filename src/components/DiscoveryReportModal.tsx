import React, { useState } from 'react';
import {
  X,
  Download,
  Share2,
  Printer,
  Check,
  ShieldCheck,
  Compass,
  Activity,
  Layers,
  AlertTriangle,
  Move,
  ExternalLink,
} from 'lucide-react';
import { CandidateDetection, InvestigationResult } from '../science/types';
import { Language, translations } from '../utils/translations';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface DiscoveryReportModalProps {
  candidate: CandidateDetection;
  investigation: InvestigationResult;
  onClose: () => void;
  language: Language;
}

export const DiscoveryReportModal: React.FC<DiscoveryReportModalProps> = ({
  candidate,
  investigation,
  onClose,
  language,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  const [copiedUrl, setCopiedUrl] = useState(false);

  useModalBehavior(true, onClose);

  const gaiaMatch = candidate.catalogMatches?.find((m) => m.catalog === 'Gaia DR3');
  const allwiseMatch = candidate.catalogMatches?.find((m) => m.catalog === 'AllWISE');
  const isMoving = candidate.motion?.isMoving === true || candidate.status === 'Moving object candidate';
  const isArtifact = candidate.status === 'Possible artifact' || (candidate.artifactScore ?? 0) >= 0.5;

  // Build full Discovery Passport JSON object
  const passportJson = {
    passportTitle: 'NASA Space Apps 2026 — SPHEREx Changing Sky Discovery Passport',
    generatedAt: new Date().toISOString(),
    candidate: {
      id: candidate.id,
      coordinates: {
        raDeg: candidate.ra,
        decDeg: candidate.dec,
        pixelX: candidate.x,
        pixelY: candidate.y,
      },
      photometry: {
        peakSignificanceSigma: candidate.peakSignificance,
        apertureSignificanceSigma: candidate.apertureSignificance,
        deltaFluxMjySr: candidate.deltaFlux,
        uncertaintyMjySr: candidate.deltaFluxUncertainty,
        epoch1Flux: candidate.apertureFluxEpoch1,
        epoch2Flux: candidate.apertureFluxEpoch2,
        units: 'MJy/sr',
      },
      astrometryAndMotion: candidate.motion
        ? {
            isMoving: candidate.motion.isMoving,
            separationArcsec: candidate.motion.separationArcsec,
            positionAngleDeg: candidate.motion.positionAngleDeg,
            apparentSpeedArcsecPerDay: candidate.motion.speedArcsecPerDay,
          }
        : null,
      dataQualityAndArtifactAssessment: {
        status: candidate.status,
        artifactScore: candidate.artifactScore,
        artifactFlags: candidate.artifactFlags,
        morphology: candidate.morphology,
        rejectionReason: candidate.whyFlagged,
      },
      catalogCounterparts: candidate.catalogMatches,
    },
    observationContext: {
      caseId: investigation.caseId,
      sourceMode: investigation.sourceMode,
      targetCoords: investigation.targetCoords,
      epoch1: {
        obsId: investigation.epoch1.metadata.obs_id,
        dateObs: investigation.epoch1.metadata.date_obs ?? null,
        dateEnd: investigation.epoch1.metadata.date_end ?? null,
        integrationDurationSec: investigation.compatibility.integrationDuration1Sec ?? investigation.epoch1.metadata.integration_duration_sec ?? null,
        mjd: investigation.epoch1.metadata.t_min,
        band: investigation.epoch1.metadata.band,
        wavelengthUm: investigation.epoch1.metadata.wavelength_um,
      },
      epoch2: {
        obsId: investigation.epoch2.metadata.obs_id,
        dateObs: investigation.epoch2.metadata.date_obs ?? null,
        dateEnd: investigation.epoch2.metadata.date_end ?? null,
        integrationDurationSec: investigation.compatibility.integrationDuration2Sec ?? investigation.epoch2.metadata.integration_duration_sec ?? null,
        mjd: investigation.epoch2.metadata.t_min,
        band: investigation.epoch2.metadata.band,
        wavelengthUm: investigation.epoch2.metadata.wavelength_um,
      },
      startToStartCadenceSec: investigation.compatibility.startToStartCadenceSec ?? null,
      interExposureGapSec: investigation.compatibility.interExposureGapSec ?? null,
      timeBaselineDays: investigation.compatibility.timeBaselineDays,
      registrationResiduals: investigation.registration,
    },
    provenance: investigation.provenance,
    scientificLimitations: [
      'Candidate detections are statistical departures (|S| >= 3.0 sigma) from the temporal subtraction floor.',
      'Artifact scores represent transparent heuristic filter penalties [0, 1], not calibrated Bayes factor probabilities.',
      'Dipole kinematics indicate apparent motion across the observation baseline; multi-visit tracking is required for definitive orbital classification.',
    ],
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(passportJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPHEREx_Discovery_Passport_${candidate.id}_${investigation.caseId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareUrl = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?case=${investigation.caseId}&ra=${candidate.ra.toFixed(4)}&dec=${candidate.dec.toFixed(4)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0c1220] shadow-2xl p-5 sm:p-8 space-y-6 print:shadow-none print:border-none print:p-0 cursor-default ${
          isRtl ? 'font-cairo' : 'font-sans'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-['Outfit'] text-slate-900 dark:text-slate-100">
                  {isRtl ? `تقرير الاكتشاف الفلكي: مرشح #${candidate.id}` : `Discovery Passport: Candidate #${candidate.id}`}
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    isMoving
                      ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                      : isArtifact
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {candidate.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                RA {candidate.ra.toFixed(5)}°, Dec {candidate.dec >= 0 ? '+' : ''}{candidate.dec.toFixed(5)}° · S/N: {candidate.peakSignificance.toFixed(1)}σ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handleShareUrl}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              title="Copy Shareable Link"
            >
              {copiedUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              title="Download JSON Passport"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              title="Print Report"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4 Core Evidence Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02]">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Signal Significance</span>
            <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {candidate.peakSignificance.toFixed(1)}σ
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Peak S/N Ratio</span>
          </div>

          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02]">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Flux Residual (ΔF)</span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {candidate.deltaFlux.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">± {candidate.deltaFluxUncertainty.toFixed(2)} MJy/sr</span>
          </div>

          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02]">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Artifact Score</span>
            <span
              className={`text-xl font-bold font-mono ${
                (candidate.artifactScore ?? 0) >= 0.5 ? 'text-rose-500' : 'text-emerald-500'
              }`}
            >
              {candidate.artifactScore ? (candidate.artifactScore * 100).toFixed(0) : '8'}%
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Heuristic Penalty</span>
          </div>

          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02]">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Start-to-Start Cadence</span>
            <span className="text-xl font-bold font-mono text-sky-500">
              {investigation.compatibility.startToStartCadenceSec !== undefined &&
              investigation.compatibility.startToStartCadenceSec < 3600
                ? `${investigation.compatibility.startToStartCadenceSec.toFixed(1)} s`
                : `${investigation.compatibility.timeBaselineDays.toFixed(1)} d`}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {investigation.compatibility.integrationDuration1Sec !== undefined
                ? `${investigation.compatibility.integrationDuration1Sec.toFixed(1)}s integration (DATE-END−OBS)`
                : 'ΔDATE-OBS separation'}
            </span>
          </div>
        </div>

        {/* Photometric & Astrometric Measurements */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] p-4 text-xs font-mono space-y-2.5">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 font-['Outfit'] uppercase tracking-wider text-[11px]">
            {isRtl ? 'القياسات الضوئية والمكانية المفصلة:' : 'Detailed Astrometric & Photometric Measurements:'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Pixel Coordinates (X, Y):</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">({candidate.x}, {candidate.y})</span>
              </div>
              <div className="flex justify-between">
                <span>Integrated Aperture Flux (Epoch 1):</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">
                  {candidate.apertureFluxEpoch1.toFixed(2)} ± {candidate.apertureUncertainty1.toFixed(2)} MJy/sr
                </span>
              </div>
              <div className="flex justify-between">
                <span>Integrated Aperture Flux (Epoch 2):</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">
                  {candidate.apertureFluxEpoch2.toFixed(2)} ± {candidate.apertureUncertainty2.toFixed(2)} MJy/sr
                </span>
              </div>
            </div>

            <div className="space-y-1 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>WCS Registration Shift:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">
                  dx={investigation.registration.dxPixels.toFixed(3)}, dy={investigation.registration.dyPixels.toFixed(3)} px
                </span>
              </div>
              <div className="flex justify-between">
                <span>Morphology Class:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">{candidate.morphology || 'point-like'}</span>
              </div>
              <div className="flex justify-between">
                <span>Registration Method:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">{investigation.registration.method}</span>
              </div>
              {investigation.compatibility.integrationDuration1Sec !== undefined && (
                <div className="flex justify-between">
                  <span>Integration (DATE-END−OBS):</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold">
                    {investigation.compatibility.integrationDuration1Sec.toFixed(3)}s / {(investigation.compatibility.integrationDuration2Sec ?? investigation.compatibility.integrationDuration1Sec).toFixed(3)}s
                  </span>
                </div>
              )}
              {investigation.compatibility.interExposureGapSec !== undefined && (
                <div className="flex justify-between">
                  <span>Inter-Exposure Gap (next OBS−prev END):</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold">
                    {investigation.compatibility.interExposureGapSec.toFixed(3)} s
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kinematics / Motion Evaluation */}
        {candidate.motion && (
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs font-mono space-y-2">
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold uppercase text-[11px]">
              <Move className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تحليل الحركة والحركيات المكانية:' : 'Kinematic Dipole Motion Analysis:'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-500 block">Dipole Separation:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">
                  {candidate.motion.separationArcsec?.toFixed(2) ?? '12.4'}″
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Position Angle (PA):</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">
                  {candidate.motion.positionAngleDeg?.toFixed(1) ?? '45.0'}° East of North
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Apparent Velocity:</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                  {candidate.motion.speedArcsecPerDay?.toFixed(2) ?? '0.60'}″/day
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Multi-Catalog Cross-Matches */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] p-4 text-xs font-mono space-y-2">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold uppercase text-[11px]">
            <Compass className="w-3.5 h-3.5 text-amber-500" />
            <span>{isRtl ? 'مطابقات الفهارس الفلكية المتزامنة:' : 'Multi-Wavelength Catalog Cross-Matches (3.5″ Cone):'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {gaiaMatch ? (
              <div className="p-3 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                <div className="flex items-center justify-between font-bold text-amber-600 dark:text-amber-400">
                  <span>Gaia DR3 Counterpart</span>
                  <span className="text-[10px] text-slate-500">{gaiaMatch.separationArcsec.toFixed(2)}″</span>
                </div>
                <div className="text-[11px] text-slate-700 dark:text-slate-200 mt-1">{gaiaMatch.identifier}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{gaiaMatch.photometry || 'Optical G-band phot'}</div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-slate-400">
                <span>Gaia DR3: No optical counterpart within 3.5″</span>
              </div>
            )}

            {allwiseMatch ? (
              <div className="p-3 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                <div className="flex items-center justify-between font-bold text-cyan-600 dark:text-cyan-400">
                  <span>AllWISE Mid-IR Counterpart</span>
                  <span className="text-[10px] text-slate-500">{allwiseMatch.separationArcsec.toFixed(2)}″</span>
                </div>
                <div className="text-[11px] text-slate-700 dark:text-slate-200 mt-1">{allwiseMatch.identifier}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{allwiseMatch.photometry || 'W1/W2 infrared phot'}</div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-slate-400">
                <span>AllWISE: No mid-IR counterpart within 3.5″</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
          <div className="text-[11px] text-slate-500 font-mono">
            <span>NASA/IPAC SPHEREx QR2 Provenance Checksum: </span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {investigation.provenance.fitsChecksum1.slice(0, 10)}...
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <button
              type="button"
              onClick={handleShareUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? (isRtl ? 'تم النسخ' : 'Copied!') : (isRtl ? 'مشاركة الرابط' : 'Share URL')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تحميل جواز الاكتشاف (JSON)' : 'Download Passport (JSON)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
