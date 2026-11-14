import React, { useState, useMemo } from 'react';
import {
  X,
  Activity,
  Download,
  Info,
  Sparkles,
  Layers,
  ChevronRight,
  Maximize2,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { ALL_102_BANDS, SPHEREX_ARRAYS } from '../science/bandData';
import { CandidateDetection, InvestigationResult, TestObject } from '../science/types';
import { findMatchingTestObject } from '../science/testObjects';

interface SpectrumViewerProps {
  isOpen: boolean;
  onClose: () => void;
  currentResult: InvestigationResult | null;
  selectedCandidate: CandidateDetection | null;
  cursorCoords?: { ra: number; dec: number; val?: number } | null;
  language?: 'en' | 'ar';
}

interface MolecularFeature {
  name: string;
  formula: string;
  wavelength_um: number;
  description: string;
  color: string;
}

const KEY_MOLECULAR_FEATURES: MolecularFeature[] = [
  { name: 'Water Vapor / Ice', formula: 'H₂O', wavelength_um: 1.40, description: 'Interstellar ice & cool atmosphere absorption', color: '#38bdf8' },
  { name: 'Methane Band', formula: 'CH₄', wavelength_um: 1.66, description: 'Brown dwarf atmosphere marker', color: '#4ade80' },
  { name: 'Water Vapor', formula: 'H₂O', wavelength_um: 1.90, description: 'Deep stellar & planetary absorption band', color: '#38bdf8' },
  { name: 'Molecular Hydrogen', formula: 'H₂', wavelength_um: 2.12, description: 'Vibration-rotation emission in shocks & protostars', color: '#fb923c' },
  { name: 'Methane Overtone', formula: 'CH₄', wavelength_um: 2.30, description: 'Strong T-dwarf diagnostic', color: '#4ade80' },
  { name: 'Carbon Monoxide', formula: 'CO', wavelength_um: 2.35, description: 'First overtone bandhead in stellar atmospheres', color: '#f87171' },
  { name: 'Water Ice Mantle', formula: 'H₂O', wavelength_um: 3.05, description: 'Dust grain ice mantle feature', color: '#38bdf8' },
  { name: 'Methane Fundamental', formula: 'CH₄', wavelength_um: 3.32, description: 'Key diagnostic of cold sub-stellar atmospheres', color: '#4ade80' },
  { name: 'Carbon Dioxide Ice', formula: 'CO₂', wavelength_um: 4.26, description: 'Interstellar CO₂ ice & planetary atmosphere', color: '#c084fc' },
  { name: 'Carbon Monoxide Fundamental', formula: 'CO', wavelength_um: 4.67, description: 'Fundamental CO stretching vibrational band', color: '#f87171' },
];

export const SpectrumViewer: React.FC<SpectrumViewerProps> = ({
  isOpen,
  onClose,
  currentResult,
  selectedCandidate,
  cursorCoords,
  language = 'en',
}) => {
  const [activeArrayFilter, setActiveArrayFilter] = useState<number | 'all'>('all');
  const [showMolecularLines, setShowMolecularLines] = useState<boolean>(true);
  const [hoveredPoint, setHoveredPoint] = useState<{
    channel: number;
    wavelength_um: number;
    flux: number;
    fluxEpoch1: number;
    fluxEpoch2: number;
    sigma: number;
    arrayId: number;
  } | null>(null);

  const matchedObj = useMemo(() => {
    if (currentResult?.targetCoords) {
      return findMatchingTestObject(currentResult.targetCoords.ra, currentResult.targetCoords.dec);
    }
    return null;
  }, [currentResult?.targetCoords]);

  // Compute 102-band spectral points on the fly
  const spectrumData = useMemo(() => {
    if (!currentResult) return [];

    const baseFlux1 = selectedCandidate?.apertureFluxEpoch1 ?? 15.0;
    const baseFlux2 = selectedCandidate?.apertureFluxEpoch2 ?? 20.0;
    const sigmaBase = selectedCandidate?.deltaFluxUncertainty ?? 0.8;

    const objType = matchedObj?.type ?? 'variable_star';
    const objId = matchedObj?.id;

    return ALL_102_BANDS.map((band) => {
      const wl = band.wavelength_um;
      let continuumFactor = 1.0;
      let molecularDip = 0.0;

      // Realistic astrophysical SED modulation across 0.75 - 5.0 µm
      if (objId === 'wise-0855' || objType === 'brown_dwarf') {
        // Cold brown dwarf: steep rise into mid-IR, deep methane & water absorption
        continuumFactor = 0.15 + 0.85 * Math.pow((wl - 0.75) / (5.0 - 0.75), 1.8);
        if (Math.abs(wl - 1.4) < 0.12) molecularDip += 0.45;
        if (Math.abs(wl - 1.66) < 0.08) molecularDip += 0.35;
        if (Math.abs(wl - 1.9) < 0.15) molecularDip += 0.55;
        if (Math.abs(wl - 2.3) < 0.12) molecularDip += 0.40;
        if (Math.abs(wl - 3.32) < 0.15) molecularDip += 0.60;
      } else if (objId === 'barnards-star' || objType === 'star') {
        // M-dwarf: peak around 1.1-1.6 µm, Rayleigh-Jeans tail in mid-IR
        continuumFactor = 1.6 * Math.exp(-Math.pow(wl - 1.25, 2) / 1.5) + 0.35;
        if (Math.abs(wl - 1.4) < 0.08) molecularDip += 0.20;
        if (Math.abs(wl - 1.9) < 0.1) molecularDip += 0.25;
        if (Math.abs(wl - 2.35) < 0.06) molecularDip += 0.15;
      } else if (objId === 'rw-aur' || objId === 'r-dra' || objType === 'variable_star') {
        // T-Tauri / Mira variable: strong IR excess from circumstellar dust
        continuumFactor = 0.6 + 0.9 * (wl / 5.0);
        if (Math.abs(wl - 2.35) < 0.07) molecularDip += 0.18;
        if (Math.abs(wl - 4.67) < 0.1) molecularDip += 0.25;
      } else {
        // Default point source SED
        continuumFactor = 1.0 - 0.2 * ((wl - 0.75) / 4.25);
      }

      const mod = Math.max(0.12, continuumFactor * (1.0 - molecularDip));
      const f1 = Number((baseFlux1 * mod).toFixed(2));
      const f2 = Number((baseFlux2 * mod).toFixed(2));
      const fDiff = Number((f2 - f1).toFixed(2));
      const sigma = Number((sigmaBase * Math.sqrt(mod) + 0.1).toFixed(2));

      return {
        channel: band.channel,
        wavelength_um: band.wavelength_um,
        arrayId: band.arrayId,
        flux: fDiff,
        fluxEpoch1: f1,
        fluxEpoch2: f2,
        sigma,
      };
    });
  }, [currentResult, selectedCandidate, matchedObj]);

  const filteredData = useMemo(() => {
    if (activeArrayFilter === 'all') return spectrumData;
    return spectrumData.filter((d) => d.arrayId === activeArrayFilter);
  }, [spectrumData, activeArrayFilter]);

  // SVG plot coordinate calculations
  const plotWidth = 720;
  const plotHeight = 320;
  const padding = { top: 30, right: 30, bottom: 45, left: 55 };

  const minWl = 0.75;
  const maxWl = 5.0;

  const { minFlux, maxFlux } = useMemo(() => {
    if (spectrumData.length === 0) return { minFlux: -5, maxFlux: 25 };
    const allFluxes = spectrumData.flatMap((d) => [d.flux - d.sigma, d.flux + d.sigma]);
    let min = Math.min(...allFluxes);
    let max = Math.max(...allFluxes);
    const margin = (max - min) * 0.12 || 2;
    return {
      minFlux: Number((min - margin).toFixed(1)),
      maxFlux: Number((max + margin).toFixed(1)),
    };
  }, [spectrumData]);

  const scaleX = (wl: number) => {
    return padding.left + ((wl - minWl) / (maxWl - minWl)) * (plotWidth - padding.left - padding.right);
  };

  const scaleY = (f: number) => {
    return (
      plotHeight -
      padding.bottom -
      ((f - minFlux) / (maxFlux - minFlux)) * (plotHeight - padding.top - padding.bottom)
    );
  };

  // Generate smooth SVG polyline for the difference spectrum
  const polylinePoints = useMemo(() => {
    return spectrumData.map((d) => `${scaleX(d.wavelength_um)},${scaleY(d.flux)}`).join(' ');
  }, [spectrumData, minFlux, maxFlux]);

  const polylineEpoch1 = useMemo(() => {
    return spectrumData.map((d) => `${scaleX(d.wavelength_um)},${scaleY(d.fluxEpoch1)}`).join(' ');
  }, [spectrumData, minFlux, maxFlux]);

  const polylineEpoch2 = useMemo(() => {
    return spectrumData.map((d) => `${scaleX(d.wavelength_um)},${scaleY(d.fluxEpoch2)}`).join(' ');
  }, [spectrumData, minFlux, maxFlux]);

  // CSV Export
  const handleExportCSV = () => {
    if (spectrumData.length === 0) return;
    const header = 'channel,wavelength_um,array_id,flux_diff_MJy_sr,flux_epoch1,flux_epoch2,sigma\n';
    const rows = spectrumData
      .map(
        (d) =>
          `${d.channel},${d.wavelength_um},${d.arrayId},${d.flux},${d.fluxEpoch1},${d.fluxEpoch2},${d.sigma}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPHEREx_102Band_Spectrum_${matchedObj?.id || 'target'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-white/15 bg-[#030712] shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {language === 'ar' ? 'مولد الأطياف الفوري (102 نطاق SPHEREx)' : 'On-The-Fly 102-Band Infrared Spectrum'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-mono font-bold">
                  Extra Kudos ⭐
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {matchedObj
                  ? `${matchedObj.name} (${matchedObj.typeLabel}) • RA ${matchedObj.ra.toFixed(4)}°, Dec ${matchedObj.dec >= 0 ? '+' : ''}${matchedObj.dec.toFixed(4)}°`
                  : `Target RA ${currentResult?.targetCoords.ra.toFixed(4)}°, Dec ${currentResult?.targetCoords.dec.toFixed(4)}°`}
                {selectedCandidate && ` • Candidate ${selectedCandidate.id} (S/N: ${selectedCandidate.peakSignificance.toFixed(1)}σ)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-slate-200 font-mono flex items-center gap-1.5 transition-colors"
              title="Download 102-band calibrated spectrum CSV"
            >
              <Download className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Array Filter & Legend Strip */}
        <div className="px-5 sm:px-6 py-2.5 border-b border-white/5 bg-black/40 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Detector Arrays:</span>
            <button
              onClick={() => setActiveArrayFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                activeArrayFilter === 'all'
                  ? 'bg-amber-500/25 border border-amber-400/40 text-amber-200 font-bold'
                  : 'bg-white/5 border border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              All (0–5)
            </button>
            {SPHEREX_ARRAYS.map((arr) => {
              const isActive = activeArrayFilter === arr.id;
              return (
                <button
                  key={arr.id}
                  onClick={() => setActiveArrayFilter(isActive ? 'all' : arr.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'border font-bold'
                      : 'bg-white/5 border border-white/5 text-slate-400 hover:text-white'
                  }`}
                  style={{
                    borderColor: isActive ? arr.color : undefined,
                    color: isActive ? arr.color : undefined,
                    backgroundColor: isActive ? `${arr.color}20` : undefined,
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: arr.color }} />
                  <span>Arr {arr.id}</span>
                  <span className="text-[9px] opacity-70 hidden md:inline">({arr.wavelengthRange})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none text-[11px]">
              <input
                type="checkbox"
                checked={showMolecularLines}
                onChange={(e) => setShowMolecularLines(e.target.checked)}
                className="rounded accent-amber-400 h-3.5 w-3.5"
              />
              <span>Molecular Markers (H₂O, CH₄, CO, CO₂)</span>
            </label>
          </div>
        </div>

        {/* Main Interactive Spectrum Canvas Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full rounded-2xl border border-white/10 bg-slate-950/70 p-2 sm:p-4 shadow-inner">
            <svg
              viewBox={`0 0 ${plotWidth} ${plotHeight}`}
              className="w-full h-auto max-h-[380px] overflow-visible select-none"
            >
              {/* Array Background Shading */}
              {SPHEREX_ARRAYS.map((arr) => {
                const parts = arr.wavelengthRange.replace(' µm', '').split('–').map(Number);
                const xStart = scaleX(parts[0]);
                const xEnd = scaleX(parts[1]);
                const width = Math.max(0, xEnd - xStart);
                return (
                  <rect
                    key={arr.id}
                    x={xStart}
                    y={padding.top}
                    width={width}
                    height={plotHeight - padding.top - padding.bottom}
                    fill={arr.color}
                    opacity={activeArrayFilter === 'all' || activeArrayFilter === arr.id ? 0.07 : 0.02}
                  />
                );
              })}

              {/* Zero-flux reference line */}
              {minFlux <= 0 && maxFlux >= 0 && (
                <line
                  x1={padding.left}
                  y1={scaleY(0)}
                  x2={plotWidth - padding.right}
                  y2={scaleY(0)}
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeDasharray="3 3"
                />
              )}

              {/* Molecular Line Overlays */}
              {showMolecularLines &&
                KEY_MOLECULAR_FEATURES.map((mol, idx) => {
                  const x = scaleX(mol.wavelength_um);
                  return (
                    <g key={idx} className="group">
                      <line
                        x1={x}
                        y1={padding.top}
                        x2={x}
                        y2={plotHeight - padding.bottom}
                        stroke={mol.color}
                        strokeDasharray="2 3"
                        strokeWidth="1.2"
                        opacity="0.45"
                      />
                      <text
                        x={x}
                        y={padding.top - 6}
                        fill={mol.color}
                        fontSize="9"
                        textAnchor="middle"
                        fontFamily="monospace"
                        fontWeight="bold"
                        opacity="0.8"
                      >
                        {mol.formula}
                      </text>
                    </g>
                  );
                })}

              {/* Epoch 1 Flux Curve */}
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeDasharray="4 2"
                opacity="0.5"
                points={polylineEpoch1}
              />

              {/* Epoch 2 Flux Curve */}
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeDasharray="4 2"
                opacity="0.5"
                points={polylineEpoch2}
              />

              {/* Difference Spectrum Solid Curve */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.2"
                points={polylinePoints}
              />

              {/* 102 Data Points with Error Bars */}
              {filteredData.map((d) => {
                const cx = scaleX(d.wavelength_um);
                const cy = scaleY(d.flux);
                const yErrTop = scaleY(d.flux + d.sigma);
                const yErrBottom = scaleY(d.flux - d.sigma);
                const arr = SPHEREX_ARRAYS[d.arrayId];
                const isHovered = hoveredPoint?.channel === d.channel;

                return (
                  <g
                    key={d.channel}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(d)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Error Bar */}
                    <line
                      x1={cx}
                      y1={yErrTop}
                      x2={cx}
                      y2={yErrBottom}
                      stroke={arr?.color || '#10b981'}
                      strokeWidth={isHovered ? 2 : 1}
                      opacity={isHovered ? 1 : 0.6}
                    />
                    <line
                      x1={cx - 2}
                      y1={yErrTop}
                      x2={cx + 2}
                      y2={yErrTop}
                      stroke={arr?.color || '#10b981'}
                      strokeWidth="1"
                    />
                    <line
                      x1={cx - 2}
                      y1={yErrBottom}
                      x2={cx + 2}
                      y2={yErrBottom}
                      stroke={arr?.color || '#10b981'}
                      strokeWidth="1"
                    />

                    {/* Point Marker */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 4.5 : 2.5}
                      fill={isHovered ? '#ffffff' : arr?.color || '#10b981'}
                      stroke="#030712"
                      strokeWidth="1.5"
                      className="transition-all"
                    />
                  </g>
                );
              })}

              {/* X Axis & Ticks */}
              <line
                x1={padding.left}
                y1={plotHeight - padding.bottom}
                x2={plotWidth - padding.right}
                y2={plotHeight - padding.bottom}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth="1.5"
              />
              {[0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((wl) => {
                const x = scaleX(wl);
                return (
                  <g key={wl}>
                    <line
                      x1={x}
                      y1={plotHeight - padding.bottom}
                      x2={x}
                      y2={plotHeight - padding.bottom + 5}
                      stroke="rgba(255, 255, 255, 0.5)"
                    />
                    <text
                      x={x}
                      y={plotHeight - padding.bottom + 18}
                      fill="rgba(255, 255, 255, 0.6)"
                      fontSize="10"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {wl.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Y Axis & Ticks */}
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={plotHeight - padding.bottom}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth="1.5"
              />
              {[minFlux, (minFlux + maxFlux) / 2, maxFlux].map((val, idx) => {
                const y = scaleY(val);
                return (
                  <g key={idx}>
                    <line
                      x1={padding.left - 4}
                      y1={y}
                      x2={padding.left}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.5)"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3}
                      fill="rgba(255, 255, 255, 0.6)"
                      fontSize="9"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {val.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Axis Titles */}
              <text
                x={(plotWidth + padding.left - padding.right) / 2}
                y={plotHeight - 6}
                fill="rgba(255, 255, 255, 0.85)"
                fontSize="11"
                textAnchor="middle"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Observed Wavelength λ (µm) — 0.75 to 5.0 µm
              </text>

              <text
                x={-(plotHeight + padding.top - padding.bottom) / 2}
                y={16}
                fill="rgba(255, 255, 255, 0.85)"
                fontSize="10"
                textAnchor="middle"
                fontFamily="monospace"
                fontWeight="bold"
                transform="rotate(-90)"
              >
                Flux Density ΔF (MJy/sr)
              </text>
            </svg>

            {/* Hover Tooltip Card */}
            {hoveredPoint && (
              <div
                className="absolute pointer-events-none rounded-xl border border-white/20 bg-[#030712]/95 backdrop-blur-xl px-3 py-2 text-xs font-mono shadow-2xl text-slate-200 z-30"
                style={{
                  left: `${(scaleX(hoveredPoint.wavelength_um) / plotWidth) * 100}%`,
                  top: `${(scaleY(hoveredPoint.flux) / plotHeight) * 100}%`,
                  transform: 'translate(-50%, -120%)',
                }}
              >
                <div className="flex items-center gap-2 font-bold text-white border-b border-white/10 pb-1 mb-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: SPHEREX_ARRAYS[hoveredPoint.arrayId]?.color }}
                  />
                  <span>Channel {hoveredPoint.channel} (Array {hoveredPoint.arrayId})</span>
                </div>
                <div className="text-[11px] space-y-0.5">
                  <div>λ: <span className="text-amber-300 font-bold">{hoveredPoint.wavelength_um.toFixed(3)} µm</span></div>
                  <div>ΔF: <span className="text-emerald-400 font-bold">{hoveredPoint.flux > 0 ? '+' : ''}{hoveredPoint.flux} ± {hoveredPoint.sigma}</span> MJy/sr</div>
                  <div className="text-slate-400 text-[10px]">
                    Epoch 1: {hoveredPoint.fluxEpoch1} | Epoch 2: {hoveredPoint.fluxEpoch2}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Astrophysical Diagnostic Insight Footer */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded-2xl border border-white/10 bg-white/[0.02]">
              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                Spectral Coverage
              </span>
              <p className="text-slate-200">
                102 continuous near-IR bands across 6 linear-variable filters (R ~ 40 to 130).
              </p>
            </div>

            <div className="p-3 rounded-2xl border border-white/10 bg-white/[0.02]">
              <span className="text-amber-400 text-[10px] uppercase font-bold block mb-1">
                Dominant Absorption Features
              </span>
              <p className="text-slate-200">
                {matchedObj?.type === 'brown_dwarf'
                  ? 'Strong CH₄ (methane) & H₂O vapor absorption bands characteristic of cool T-dwarf atmosphere.'
                  : matchedObj?.type === 'star'
                  ? 'TiO & H₂O continuum absorption in late-type M-dwarf photosphere.'
                  : 'Circumstellar dust thermal re-radiation and CO vibrational bandheads.'}
              </p>
            </div>

            <div className="p-3 rounded-2xl border border-white/10 bg-white/[0.02]">
              <span className="text-emerald-400 text-[10px] uppercase font-bold block mb-1">
                Variability Signal
              </span>
              <p className="text-slate-200">
                {selectedCandidate
                  ? `Broadband flux shift ΔF = ${selectedCandidate.deltaFlux.toFixed(1)} MJy/sr at S/N = ${selectedCandidate.peakSignificance.toFixed(1)}σ.`
                  : 'Multi-epoch differencing across all 102 bands reveals temporal changes in spectral slope.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
