import React, { useState } from 'react';
import { X, Layers, Sparkles, Activity, Compass, Info } from 'lucide-react';
import {
  SPHEREX_DETECTOR_ARRAYS,
  SPHEREX_102_CHANNELS,
  generateCandidateSED,
} from '../science/spectralBands';
import { CandidateDetection } from '../science/types';
import { Language, translations } from '../utils/translations';

interface SpectralExplorerModalProps {
  onClose: () => void;
  selectedCandidate: CandidateDetection | null;
  language: Language;
}

export const SpectralExplorerModal: React.FC<SpectralExplorerModalProps> = ({
  onClose,
  selectedCandidate,
  language,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  const [selectedDetector, setSelectedDetector] = useState<number>(1);

  // Generate SED data points for selected candidate or default model
  const sedPoints = generateCandidateSED({
    deltaFlux: selectedCandidate?.deltaFlux ?? 2.85,
    catalogMatches: selectedCandidate?.catalogMatches,
  });

  const detectorSpec = SPHEREX_DETECTOR_ARRAYS.find((d) => d.detectorNumber === selectedDetector) || SPHEREX_DETECTOR_ARRAYS[0];
  const detectorChannels = SPHEREX_102_CHANNELS.filter((ch) => ch.detector === selectedDetector);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        className={`relative w-full max-w-5xl rounded-3xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0c1220] shadow-2xl p-5 sm:p-8 space-y-6 ${
          isRtl ? 'font-cairo' : 'font-sans'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-['Outfit'] text-slate-900 dark:text-slate-100">
                  {isRtl ? 'مستكشف النطاقات الطيفية الـ 102 ومصفوفات الحساسات' : '102 Spectral Bands & 6 Detector Arrays'}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-semibold">
                  0.75 – 5.0 µm
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isRtl
                  ? 'مواصفات تلسكوب SPHEREx الفضائي ومطيافية المرشحات المتغيرة خطياً (LVF)'
                  : 'SPHEREx Linear Variable Filter (LVF) Spectroscopy & Multi-Wavelength SED'}
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

        {/* 6 Detector Tabs */}
        <div>
          <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-2 font-semibold uppercase">
            {isRtl ? 'اختر مصفوفة الحساسات الست (H2RG Teledyne):' : 'Select Detector Array (H2RG Teledyne):'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {SPHEREX_DETECTOR_ARRAYS.map((det) => (
              <button
                key={det.detectorNumber}
                type="button"
                onClick={() => setSelectedDetector(det.detectorNumber)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedDetector === det.detectorNumber
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.03] text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold font-mono">D{det.detectorNumber}</div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {det.wavelengthRangeUm[0]}–{det.wavelengthRangeUm[1]} µm
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                  17 Channels
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detector Specs & Architecture */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 block">Sensor Technology:</span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">{detectorSpec.technology}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Array Format & Pixel Scale:</span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">
              {detectorSpec.format} · {detectorSpec.pixelScaleArcsec}″/px
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Resolving Power:</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">{detectorSpec.resolvingPower}</span>
          </div>
        </div>

        {/* Multi-Wavelength Spectral Energy Distribution (SED) Plot */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-950 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-200 font-bold">
                {selectedCandidate ? `Candidate #${selectedCandidate.id} SED Plot` : 'Candidate SED Energy Profile'}
              </span>
            </div>
            <span className="text-[11px] text-amber-400">Gaia G → SPHEREx B1 → AllWISE W1/W2</span>
          </div>

          <svg viewBox="0 0 600 180" className="w-full h-44 bg-slate-900/60 rounded-xl">
            {/* Axes & Labels */}
            <line x1="60" y1="140" x2="570" y2="140" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <line x1="60" y1="20" x2="60" y2="140" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <text x="530" y="155" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="monospace">λ (µm)</text>
            <text x="15" y="30" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="monospace">Flux (mJy)</text>

            {/* Plot SED curve line connecting data points */}
            {sedPoints.length > 1 && (
              <polyline
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
                points={sedPoints
                  .map((pt) => {
                    // Wavelength map: 0.5 to 5.0 µm -> x: 60 to 570
                    const x = 60 + ((pt.wavelengthUm - 0.5) / 4.5) * 510;
                    // Max flux clamp
                    const maxF = Math.max(...sedPoints.map((p) => p.fluxMjy), 1);
                    const y = 140 - (pt.fluxMjy / maxF) * 110;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}

            {/* Plot individual catalog data points */}
            {sedPoints.map((pt, i) => {
              const x = 60 + ((pt.wavelengthUm - 0.5) / 4.5) * 510;
              const maxF = Math.max(...sedPoints.map((p) => p.fluxMjy), 1);
              const y = 140 - (pt.fluxMjy / maxF) * 110;

              return (
                <g key={i}>
                  <circle cx={x} cy={y} r="5" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text x={x - 15} y={y - 8} fill="#CBD5E1" fontSize="9" fontFamily="monospace">
                    {pt.source} ({pt.fluxMjy} mJy)
                  </text>
                  <text x={x - 8} y="155" fill="#94A3B8" fontSize="8" fontFamily="monospace">
                    {pt.wavelengthUm}µm
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Channels in Selected Detector */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block font-semibold uppercase">
            {isRtl ? `القنوات الطيفية الـ 17 في ${detectorSpec.name}:` : `17 Channels in ${detectorSpec.name}:`}
          </label>
          <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/[0.08] divide-y divide-slate-100 dark:divide-white/[0.04]">
            {detectorChannels.map((ch) => (
              <div
                key={ch.channelIndex}
                className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3 font-mono">
                  <span className="w-8 text-slate-400">#{ch.channelIndex}</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{ch.wavelengthUm} µm</span>
                  <span className="text-slate-500">Δλ={ch.bandwidthUm} µm</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">R~{ch.resolvingPower}</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans max-w-sm truncate text-right">
                  {ch.primaryScienceFeatures}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
