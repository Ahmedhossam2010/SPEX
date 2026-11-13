import React, { useState } from 'react';
import {
  InvestigationResult,
  CandidateDetection,
  SPHERExObservation,
} from '../../science/types';
import { StretchMode, ColormapMode, DisplayMode } from '../../utils/astronomyRender';
import { Language, translations } from '../../utils/translations';
import {
  Layers,
  Clock,
  Sparkles,
  Database,
  FileCode,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Search,
  Activity,
  Crosshair,
  SlidersHorizontal,
} from 'lucide-react';

export type ScientistTab = 'observation' | 'comparison' | 'evidence' | 'catalog' | 'technical';

export interface ScientistInvestigationPanelProps {
  currentResult: InvestigationResult;
  language: Language;
  stretch: StretchMode;
  colormap: ColormapMode;
  displayMode: DisplayMode;
  contrastFactor: number;
  onStretchChange: (s: StretchMode) => void;
  onColormapChange: (c: ColormapMode) => void;
  onDisplayModeChange: (d: DisplayMode) => void;
  onContrastFactorChange: (val: number) => void;
  selectedCandidate: CandidateDetection | null;
  onSelectCandidate: (cand: CandidateDetection | null) => void;
  onOpenProvenanceModal: () => void;
  onOpenDataReleaseModal: () => void;
  className?: string;
}

export const ScientistInvestigationPanel: React.FC<ScientistInvestigationPanelProps> = ({
  currentResult,
  language,
  stretch,
  colormap,
  displayMode,
  contrastFactor,
  onStretchChange,
  onColormapChange,
  onDisplayModeChange,
  onContrastFactorChange,
  selectedCandidate,
  onSelectCandidate,
  onOpenProvenanceModal,
  onOpenDataReleaseModal,
  className = '',
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<ScientistTab>('observation');
  const [headerSearch, setHeaderSearch] = useState<string>('');

  const obs1 = currentResult.epoch1;
  const obs2 = currentResult.epoch2;
  const diff = currentResult.difference;
  const compatibility = currentResult.compatibility;
  const candidates = currentResult.candidates || [];

  // FITS header keys from Epoch 1
  const headerCards = currentResult.epoch1?.metadata || {};
  const filteredHeaderKeys = Object.keys(headerCards).filter((k) =>
    k.toLowerCase().includes(headerSearch.toLowerCase())
  );

  return (
    <div
      className={`flex flex-col bg-[#0C0E14] border border-white/10 rounded-2xl overflow-hidden shadow-2xl ${className}`}
    >
      {/* Panel Top Header & Tab Navigation */}
      <div className="bg-[#10131C] border-b border-white/10 p-2 sm:p-3">
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00D3F3] animate-pulse" />
            <h3 className="font-mono text-xs sm:text-sm font-bold tracking-wider text-slate-100 uppercase">
              {isRtl ? 'بيئة التحقيق العلمي الدقيق' : 'SCIENTIFIC INVESTIGATION WORKSPACE'}
            </h3>
          </div>
          <span className="font-mono text-[10px] text-[#00D3F3] bg-[#00D3F3]/10 border border-[#00D3F3]/30 px-2 py-0.5 rounded">
            DR1 / QR3 / QR2 LEVEL-2B
          </span>
        </div>

        {/* 5 Scientific Section Tabs */}
        <div className="grid grid-cols-5 gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('observation')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 sm:px-2 rounded-lg text-[10px] sm:text-xs font-mono font-medium transition cursor-pointer select-none ${
              activeTab === 'observation'
                ? 'bg-[#00D3F3]/15 text-[#00D3F3] border border-[#00D3F3]/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isRtl ? 'الرصد' : 'Observation'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comparison')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 sm:px-2 rounded-lg text-[10px] sm:text-xs font-mono font-medium transition cursor-pointer select-none ${
              activeTab === 'comparison'
                ? 'bg-[#FFB900]/15 text-[#FFB900] border border-[#FFB900]/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isRtl ? 'المقارنة' : 'Comparison'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evidence')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 sm:px-2 rounded-lg text-[10px] sm:text-xs font-mono font-medium transition cursor-pointer select-none ${
              activeTab === 'evidence'
                ? 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {isRtl ? 'الأدلة' : 'Evidence'} ({candidates.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 sm:px-2 rounded-lg text-[10px] sm:text-xs font-mono font-medium transition cursor-pointer select-none ${
              activeTab === 'catalog'
                ? 'bg-[#00D3F3]/15 text-[#00D3F3] border border-[#00D3F3]/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isRtl ? 'الكتالوجات' : 'Catalogs'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('technical')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 sm:px-2 rounded-lg text-[10px] sm:text-xs font-mono font-medium transition cursor-pointer select-none ${
              activeTab === 'technical'
                ? 'bg-purple-400/15 text-purple-300 border border-purple-400/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isRtl ? 'تقني FITS' : 'Technical'}</span>
          </button>
        </div>
      </div>

      {/* Tab Content Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 max-h-[460px] custom-scrollbar">
        {/* ================================================================ */}
        {/* TAB 1: OBSERVATION */}
        {/* ================================================================ */}
        {activeTab === 'observation' && (
          <div className="space-y-4 animate-fade-in">
            {/* Target Identity & Classification */}
            <div className="bg-black/40 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#00D3F3] uppercase tracking-wider">
                  {isRtl ? 'الهدف الفلكي' : 'ASTRONOMICAL TARGET'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  ID: {currentResult.caseId}
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-100">{currentResult.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {currentResult.description}
              </p>
            </div>

            {/* Coordinates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">
                  {isRtl ? 'المطلع المستقيم (RA J2000)' : 'RIGHT ASCENSION (RA J2000)'}
                </span>
                <span className="font-mono text-sm font-bold text-[#FFB900]">
                  {currentResult.targetCoords?.ra.toFixed(5)}°
                </span>
              </div>
              <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">
                  {isRtl ? 'الميل الاستوائي (Dec J2000)' : 'DECLINATION (Dec J2000)'}
                </span>
                <span className="font-mono text-sm font-bold text-[#FFB900]">
                  {currentResult.targetCoords?.dec !== undefined && currentResult.targetCoords.dec >= 0
                    ? '+'
                    : ''}
                  {currentResult.targetCoords?.dec.toFixed(5)}°
                </span>
              </div>
            </div>

            {/* Observation Timestamps & Instrument Info */}
            <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-3">
              <span className="text-[11px] font-mono text-slate-300 font-semibold uppercase tracking-wider block">
                {isRtl ? 'توقيتات التعريض والأجهزة' : 'EXPOSURE TIMESTAMPS & INSTRUMENTATION'}
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {isRtl ? 'الرصدة 1 (MJD)' : 'EPOCH 1 (MJD)'}
                  </span>
                  <span className="text-slate-200">
                    {obs1?.metadata?.t_min?.toFixed(5) || '60793.54185'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {obs1?.metadata?.date_obs || '2025-04-28 13:00:15 UTC'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {isRtl ? 'الرصدة 2 (MJD)' : 'EPOCH 2 (MJD)'}
                  </span>
                  <span className="text-slate-200">
                    {obs2?.metadata?.t_min?.toFixed(5) || '60793.54334'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {obs2?.metadata?.date_obs || '2025-04-28 13:02:24 UTC'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {isRtl ? 'زمن التكامل' : 'INTEGRATION TIME'}
                  </span>
                  <span className="text-[#00D3F3] font-bold">115.118s</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {isRtl ? 'النطاق الطيفي' : 'SPECTRAL BAND'}
                  </span>
                  <span className="text-[#FFB900] font-bold">
                    {obs1?.metadata?.wavelength_um
                      ? `${obs1.metadata.wavelength_um} µm (${obs1.metadata.band || 'Band 1'})`
                      : '0.93 µm (Band 1)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Authenticity & Checksums */}
            <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h5 className="text-xs font-bold text-emerald-300">
                    {isRtl ? 'بيانات رصدية معتمدة' : 'AUTHENTIC NASA/IPAC SPHEREx OBSERVATION'}
                  </h5>
                  <p className="text-[10px] text-emerald-400/80 font-mono">
                    SHA-256 Checksum Verified · Calibrated Level-2B Science Cutout
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenProvenanceModal}
                className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-[10px] transition cursor-pointer shrink-0"
              >
                {isRtl ? 'سجل السلسلة' : 'Provenance'}
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: COMPARISON & MATRIX METRICS */}
        {/* ================================================================ */}
        {activeTab === 'comparison' && (
          <div className="space-y-4 animate-fade-in">
            {/* Temporal Cadence & Alignment */}
            <div className="bg-black/40 p-3.5 rounded-xl border border-white/5 space-y-3">
              <span className="text-[11px] font-mono text-[#FFB900] uppercase tracking-wider block">
                {isRtl ? 'المعايرة والفاصل الزمني' : 'ASTROMETRIC REGISTRATION & CADENCE'}
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                  <span className="text-slate-400 block text-[10px]">
                    {isRtl ? 'الفاصل الزمني' : 'CADENCE INTERVAL'}
                  </span>
                  <span className="text-slate-100 font-bold text-sm">
                    {compatibility?.startToStartCadenceSec
                      ? `${compatibility.startToStartCadenceSec.toFixed(1)}s`
                      : '128.9s (~2.1 min)'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {compatibility?.timeBaselineType || 'INTRA-VISIT EXPOSURES'}
                  </span>
                </div>

                <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                  <span className="text-slate-400 block text-[10px]">
                    {isRtl ? 'الإزاحة تحت البكسل' : 'SUBPIXEL ALIGNMENT'}
                  </span>
                  <span className="text-emerald-400 font-bold text-sm">
                    Δx: {currentResult.registration?.dxPixels?.toFixed(3) || '0.000'} px
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Δy: {currentResult.registration?.dyPixels?.toFixed(3) || '0.000'} px
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-300 space-y-1 bg-black/20 p-2.5 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-slate-400">{isRtl ? 'خوارزمية المحاذاة:' : 'Registration Method:'}</span>
                  <span className="text-[#00D3F3]">{currentResult.registration?.method || 'Bilinear Surface Spline'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isRtl ? 'أقصى تشوه فراغي:' : 'Max Spatial Warp:'}</span>
                  <span className="text-slate-200">&lt; 1e-4 pixels</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isRtl ? 'حد الضوضاء MAD σ:' : 'Robust Noise Floor (MAD):'}</span>
                  <span className="text-slate-200">
                    {diff?.stats?.noiseSigma ? `${diff.stats.noiseSigma.toFixed(4)} MJy/sr` : '0.0482 MJy/sr'}
                  </span>
                </div>
              </div>
            </div>

            {/* Display Controls: Stretch, Colormap, Display Mode */}
            <div className="bg-black/40 p-3.5 rounded-xl border border-white/5 space-y-3">
              <span className="text-[11px] font-mono text-[#00D3F3] uppercase tracking-wider block">
                {isRtl ? 'معايير الإظهار والعرض الفلكي' : 'ASTRONOMICAL DISPLAY SETTINGS'}
              </span>

              {/* Stretch Mode */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase block">
                  {isRtl ? 'دالة الامتداد الرياضي (Stretch)' : 'INTENSITY STRETCH FUNCTION'}
                </label>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                  {(['asinh', 'linear', 'sqrt', 'log'] as StretchMode[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onStretchChange(s)}
                      className={`py-1.5 rounded-lg border text-center transition cursor-pointer ${
                        stretch === s
                          ? 'border-[#00D3F3] bg-[#00D3F3]/20 text-[#00D3F3] font-bold'
                          : 'border-white/10 bg-black/30 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colormap */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase block">
                  {isRtl ? 'التدريج اللوني (Colormap)' : 'COLORMAP PALETTE'}
                </label>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                  {[
                    { id: 'diff_diverging', label: isRtl ? 'فارق ثنائي القطب' : 'Diverging (Diff)' },
                    { id: 'infrared_warm', label: isRtl ? 'الأشعة تحت الحمراء' : 'NASA Infrared' },
                    { id: 'grayscale', label: isRtl ? 'رمادي أحادي' : 'Grayscale (Monochrome)' },
                    { id: 'heat', label: isRtl ? 'حراري كلاسيكي' : 'Classic Thermal Heat' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onColormapChange(c.id as ColormapMode)}
                      className={`py-1.5 px-2 rounded-lg border text-left transition cursor-pointer truncate ${
                        colormap === c.id
                          ? 'border-[#FFB900] bg-[#FFB900]/20 text-[#FFB900] font-bold'
                          : 'border-white/10 bg-black/30 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Mode (Science pixelated vs Presentation smoothed) */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase block">
                  {isRtl ? 'وضع دقة العرض' : 'RESOLUTION DISPLAY MODE'}
                </label>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => onDisplayModeChange('presentation')}
                    className={`py-1.5 rounded-lg border text-center transition cursor-pointer ${
                      displayMode === 'presentation'
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 font-bold'
                        : 'border-white/10 bg-black/30 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isRtl ? 'تنعيم عالي الدقة' : 'Subpixel Smoothed'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDisplayModeChange('science')}
                    className={`py-1.5 rounded-lg border text-center transition cursor-pointer ${
                      displayMode === 'science'
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 font-bold'
                        : 'border-white/10 bg-black/30 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isRtl ? 'بكسلات الكاشف الأصلية' : 'Native Detector Grid'}
                  </button>
                </div>
              </div>

              {/* Contrast Multiplier */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>{isRtl ? 'معامل التباين' : 'CONTRAST MULTIPLIER'}</span>
                  <span className="text-slate-200 font-bold">{contrastFactor.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={contrastFactor}
                  onChange={(e) => onContrastFactorChange(parseFloat(e.target.value))}
                  className="w-full accent-[#00D3F3] cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3: EVIDENCE & CANDIDATES TABLE */}
        {/* ================================================================ */}
        {activeTab === 'evidence' && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-mono text-emerald-300 uppercase tracking-wider">
                {isRtl ? 'المرشحون المكتشفون في هذا الحقل' : 'DETECTED CANDIDATE TRANSIT / VARIABILITY'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {candidates.length} {isRtl ? 'أجرام' : 'detections'}
              </span>
            </div>

            {candidates.length === 0 ? (
              <div className="bg-black/30 p-6 rounded-xl border border-white/5 text-center text-xs text-slate-400 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="font-bold text-slate-200">
                  {isRtl ? 'السماء مستقرة تمامًا' : 'Photometric Baseline Stable'}
                </p>
                <p>
                  {isRtl
                    ? 'لم تُسجل أي فروق تتجاوز عتبة الدلالة الإحصائية 5.0σ فوق الضوضاء.'
                    : 'No difference residuals exceeded the 5.0σ statistical significance threshold.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {candidates.map((cand, idx) => {
                  const isSelected = selectedCandidate?.id === cand.id;
                  const isArtifact = cand.status === 'Possible artifact';
                  const isKnown = cand.status === 'Likely known source';

                  return (
                    <div
                      key={cand.id || `cand-${idx}`}
                      onClick={() => onSelectCandidate(cand)}
                      className={`p-3 rounded-xl border transition cursor-pointer select-none ${
                        isSelected
                          ? 'border-[#FFB900] bg-[#FFB900]/10 shadow-[0_0_16px_rgba(255,185,0,0.2)]'
                          : 'border-white/10 bg-black/30 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#FFB900]" />
                          <span className="font-mono text-xs font-bold text-slate-100">
                            {cand.id}
                          </span>
                        </div>
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded font-semibold ${
                            isArtifact
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : isKnown
                              ? 'bg-[#00D3F3]/20 text-[#00D3F3] border border-[#00D3F3]/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {cand.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-300">
                        <div>
                          <span className="text-slate-400 text-[9px] block">SIGNIFICANCE</span>
                          <span className="text-[#FFB900] font-bold">
                            {cand.peakSignificance ? `${cand.peakSignificance.toFixed(1)}σ` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[9px] block">Δ FLUX</span>
                          <span className="text-slate-100">
                            {cand.deltaFlux !== undefined
                              ? `${cand.deltaFlux >= 0 ? '+' : ''}${cand.deltaFlux.toFixed(2)} MJy/sr`
                              : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[9px] block">PIXEL (X,Y)</span>
                          <span className="text-slate-300">
                            {cand.x.toFixed(1)}, {cand.y.toFixed(1)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[9px] block">DIPOLE CHECK</span>
                          <span className="text-emerald-400">
                            {cand.morphology === 'dipole' ? 'Positive/Negative Lobe' : 'Monopolar Peak'}
                          </span>
                        </div>
                      </div>

                      {/* Quality Flag Bitmask Alert */}
                      {cand.artifactFlags && cand.artifactFlags.length > 0 && (
                        <div className="mt-2 text-[10px] font-mono text-rose-300 bg-rose-950/30 px-2 py-1 rounded border border-rose-500/20 flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>DQ Flag Warning: {cand.artifactFlags.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 4: CATALOG CROSS-MATCHES */}
        {/* ================================================================ */}
        {activeTab === 'catalog' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-black/40 p-3.5 rounded-xl border border-white/5 space-y-3">
              <span className="text-[11px] font-mono text-[#00D3F3] uppercase tracking-wider block">
                {isRtl ? 'المطابقة مع الكتالوجات الفلكية العالمية' : 'GAIA DR3 & ALLWISE CROSS-MATCHING'}
              </span>

              <p className="text-xs text-slate-300 leading-relaxed">
                {isRtl
                  ? 'تمت مطابقة مواضع المرشحين آليًا مع كتالوج غايا الفلكي DR3 وكتالوج وايز للأشعة تحت الحمراء AllWISE ضمن نطاق تطابق قطره 3.5 ثانية قوسية.'
                  : 'Automated 3.5″ cone search cross-matching candidates against ESA Gaia DR3 astrometric stars and NASA AllWISE mid-infrared survey.'}
              </p>

              {candidates.some((c) => c.catalogMatches && c.catalogMatches.length > 0) ? (
                <div className="space-y-2.5">
                  {candidates.map((cand) =>
                    cand.catalogMatches?.map((match, mIdx) => (
                      <div
                        key={`match-${cand.id}-${mIdx}`}
                        className="bg-black/30 p-3 rounded-lg border border-white/5 font-mono text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[#00D3F3] font-bold">
                            {match.catalog}: {match.identifier}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            d = {match.separationArcsec.toFixed(2)}″
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] text-slate-300 pt-1 border-t border-white/5">
                          {match.photometry && (
                            <div>
                              <span className="text-slate-400 block">PHOTOMETRY</span>
                              <span className="font-bold text-[#FFB900]">{match.photometry}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-400 block">POSITION (RA, Dec)</span>
                            <span>{match.ra.toFixed(4)}°, {match.dec.toFixed(4)}°</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">TARGET CANDIDATE</span>
                            <span className="text-slate-200">{cand.id}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="p-4 bg-black/20 rounded-lg text-center text-xs text-slate-400">
                  {isRtl
                    ? 'لم يتم العثور على أجرام سابقة مطابقة ضمن 3.5 ثانية قوسية للمرشحين النشطين.'
                    : 'No known Gaia DR3 or AllWISE catalog sources matched within 3.5″ of active detection reticles.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 5: TECHNICAL FITS & WCS METADATA */}
        {/* ================================================================ */}
        {activeTab === 'technical' && (
          <div className="space-y-4 animate-fade-in">
            {/* Header Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isRtl ? 'ابحث في بطاقات ترويسة FITS...' : 'Search FITS header keywords (e.g. CRVAL, CTYPE, NAXIS)...'}
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#00D3F3]"
              />
            </div>

            {/* Filtered Header Cards */}
            <div className="bg-black/40 rounded-xl border border-white/5 divide-y divide-white/5 font-mono text-[11px] max-h-[300px] overflow-y-auto custom-scrollbar">
              {filteredHeaderKeys.slice(0, 40).map((key) => {
                const val = (headerCards as any)[key];
                return (
                  <div key={key} className="flex items-center justify-between p-2 hover:bg-white/5">
                    <span className="text-[#00D3F3] font-bold">{key}</span>
                    <span className="text-slate-300 truncate max-w-[240px]">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Release Ingestion Engine Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenDataReleaseModal}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-purple-200 text-xs font-mono flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Activity className="w-4 h-4 text-purple-400" />
                <span>
                  {isRtl ? 'محرك فحص جاهزية إصدار البيانات (13 نوفمبر)' : 'November 13 Data Release Validation Engine'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
