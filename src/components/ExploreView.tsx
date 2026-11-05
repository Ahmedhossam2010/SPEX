import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Search,
  Crosshair,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Info,
  ShieldCheck,
  Move,
  AlertTriangle,
  SlidersHorizontal,
  Layers,
  HelpCircle,
  Eye,
  Globe2,
  Table,
  FileText,
  Activity,
  Sliders,
  X,
} from 'lucide-react';
import {
  CandidateDetection,
  InvestigationResult,
  SPHERExObservation,
  ChallengeTarget,
} from '../science/types';
import { AstronomyRenderer, ColormapMode, DisplayMode, StretchMode } from '../utils/astronomyRender';
import { WCS } from '../science/wcs';
import { ProvenanceModal } from './ProvenanceModal';
import { SpexCompanion } from './SpexCompanion';
import { FindingCard } from './FindingCard';
import { ScienceTerm } from './ScienceTerm';
import { SkyCoverageModal } from './SkyCoverageModal';
import { SpectralExplorerModal } from './SpectralExplorerModal';
import { DiscoveryReportModal } from './DiscoveryReportModal';
import { CandidateComparisonModal } from './CandidateComparisonModal';
import { Language, translations } from '../utils/translations';

interface ExploreViewProps {
  currentResult: InvestigationResult | null;
  isLoading: boolean;
  onSearchTarget: (ra: number, dec: number, sizePix?: number) => void;
  onSelectCase: (caseId: string, options?: { sizePix?: number; epochPair?: string }) => void;
  cases: Array<{ id: string; title: string; category?: string; ra: number; dec: number }>;
  language: Language;
}

export type ViewMode = 'difference' | 'significance' | 'epoch1' | 'epoch2' | 'split' | 'blink' | 'sequence';
export type CandidateFilter = 'all' | 'candidates' | 'known' | 'artifacts';

export const ExploreView: React.FC<ExploreViewProps> = ({
  currentResult,
  isLoading,
  onSearchTarget,
  onSelectCase,
  cases,
  language,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  // Primary 4-Stage Observation Perspective & Sequencer
  const [viewMode, setViewMode] = useState<ViewMode>('difference');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('science');
  const [stretch, setStretch] = useState<StretchMode>('asinh');
  const [colormap, setColormap] = useState<ColormapMode>('diff_diverging');

  // Canvas Viewport Geometry
  const [zoom, setZoom] = useState<number>(1.1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Interactive Comparison Tools
  const [sliderPos, setSliderPos] = useState<number>(0.5);
  const [blinkEpoch, setBlinkEpoch] = useState<'epoch1' | 'epoch2'>('epoch1');
  const [isBlinking, setIsBlinking] = useState<boolean>(true);

  // Multi-Epoch Sequencer
  const [activeEpochIdx, setActiveEpochIdx] = useState<number>(0);
  const [isSequencePlaying, setIsSequencePlaying] = useState<boolean>(false);
  const [sequenceSpeed, setSequenceSpeed] = useState<number>(1); // 1x, 2x, 4x fps
  const [selectedEpochPair, setSelectedEpochPair] = useState<string>('1-3');
  const [selectedFovSize, setSelectedFovSize] = useState<number>(64); // 32, 64, 112, 160

  // Inspector Cursor Readout
  const [cursorPos, setCursorPos] = useState<{
    x: number;
    y: number;
    ra?: number;
    dec?: number;
    val?: number;
  } | null>(null);

  // Candidate Selection
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetection | null>(null);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [candidateFilter, setCandidateFilter] = useState<CandidateFilter>('all');
  const [candidatePage, setCandidatePage] = useState<number>(1);
  const CANDIDATES_PER_PAGE = 4;

  // External prompt passed from candidate cards to SPEX
  const [externalSpexPrompt, setExternalSpexPrompt] = useState<string | null>(null);

  // Modals & Panels
  const [showProvenance, setShowProvenance] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [showSkyCoverage, setShowSkyCoverage] = useState<boolean>(false);
  const [showSpectralExplorer, setShowSpectralExplorer] = useState<boolean>(false);
  const [showDiscoveryReport, setShowDiscoveryReport] = useState<boolean>(false);
  const [showCandidateComparison, setShowCandidateComparison] = useState<boolean>(false);

  // Custom Coordinate Inputs
  const [customRa, setCustomRa] = useState<string>('276.2614');
  const [customDec, setCustomDec] = useState<string>('64.8258');

  // Mobile View Tab
  const [mobileTab, setMobileTab] = useState<'canvas' | 'findings' | 'spex'>('canvas');

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Adapt colormap dynamically when switching perspectives
  const handleSelectViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'difference' || mode === 'significance') {
      setColormap('diff_diverging');
    } else if (colormap === 'diff_diverging') {
      setColormap('grayscale');
    }
  };

  // Sync candidate selection when case changes
  useEffect(() => {
    if (currentResult) {
      if (currentResult.candidates.length > 0) {
        setSelectedCandidate(currentResult.candidates[0]);
      } else {
        setSelectedCandidate(null);
      }
      setPan({ x: 0, y: 0 });
      setZoom(1.1);
      setCandidatePage(1);
      setActiveEpochIdx(0);
    }
  }, [currentResult?.caseId]);

  // Fast blink cadence timer
  useEffect(() => {
    if (viewMode !== 'blink' || !isBlinking) return;
    const interval = setInterval(() => {
      setBlinkEpoch((prev) => (prev === 'epoch1' ? 'epoch2' : 'epoch1'));
    }, 450);
    return () => clearInterval(interval);
  }, [viewMode, isBlinking]);

  // Multi-epoch automatic sequence player
  useEffect(() => {
    if (viewMode !== 'sequence' || !isSequencePlaying || !currentResult?.epochs || currentResult.epochs.length === 0) {
      return;
    }
    const msPerStep = Math.max(250, 1000 / sequenceSpeed);
    const interval = setInterval(() => {
      setActiveEpochIdx((prev) => (prev + 1) % currentResult.epochs!.length);
    }, msPerStep);
    return () => clearInterval(interval);
  }, [viewMode, isSequencePlaying, sequenceSpeed, currentResult?.epochs]);

  // Render scientific FITS data onto the canvas
  useEffect(() => {
    if (!currentResult || !canvasRef.current) return;

    const isDiff = viewMode === 'difference' || viewMode === 'significance';
    let dataToRender: number[] = [];
    let cm = colormap;

    if (viewMode === 'epoch1') {
      dataToRender = currentResult.epoch1.flux;
      if (cm === 'diff_diverging') cm = 'grayscale';
    } else if (viewMode === 'epoch2') {
      dataToRender = currentResult.epoch2.flux;
      if (cm === 'diff_diverging') cm = 'grayscale';
    } else if (viewMode === 'sequence') {
      if (currentResult.epochs && currentResult.epochs[activeEpochIdx]) {
        dataToRender = currentResult.epochs[activeEpochIdx].flux;
      } else {
        dataToRender = currentResult.epoch1.flux;
      }
      if (cm === 'diff_diverging') cm = 'grayscale';
    } else if (viewMode === 'blink') {
      dataToRender = blinkEpoch === 'epoch1' ? currentResult.epoch1.flux : currentResult.epoch2.flux;
      if (cm === 'diff_diverging') cm = 'grayscale';
    } else if (viewMode === 'difference') {
      dataToRender = currentResult.difference.diff;
    } else if (viewMode === 'significance') {
      dataToRender = currentResult.difference.significance;
    } else if (viewMode === 'split') {
      const w = currentResult.epoch1.width;
      const h = currentResult.epoch1.height;
      const composite = new Float32Array(w * h);
      const splitCol = Math.floor(w * sliderPos);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          composite[idx] = x < splitCol ? currentResult.epoch1.flux[idx] : currentResult.epoch2.flux[idx];
        }
      }
      dataToRender = Array.from(composite);
      if (cm === 'diff_diverging') cm = 'grayscale';
    }

    AstronomyRenderer.renderToCanvas(
      canvasRef.current,
      dataToRender,
      currentResult.epoch1.width,
      currentResult.epoch1.height,
      {
        stretch,
        colormap: cm,
        mode: isDiff ? 'signed_difference' : 'unipolar',
        renderSize: 512,
      }
    );
  }, [currentResult, viewMode, blinkEpoch, activeEpochIdx, stretch, colormap, sliderPos]);

  // Canvas Mouse Tracking
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentResult || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const w = currentResult.epoch1.width;
    const h = currentResult.epoch1.height;

    const pixelX = Math.floor((clientX / rect.width) * w);
    const pixelY = Math.floor((clientY / rect.height) * h);

    if (pixelX >= 0 && pixelX < w && pixelY >= 0 && pixelY < h) {
      const idx = pixelY * w + pixelX;
      let val = currentResult.difference.diff[idx];
      if (viewMode === 'significance') {
        val = currentResult.difference.significance[idx];
      } else if (viewMode === 'epoch1') {
        val = currentResult.epoch1.flux[idx];
      } else if (viewMode === 'epoch2') {
        val = currentResult.epoch2.flux[idx];
      } else if (viewMode === 'sequence' && currentResult.epochs && currentResult.epochs[activeEpochIdx]) {
        val = currentResult.epochs[activeEpochIdx].flux[idx];
      }

      const sky = WCS.pixToSky(pixelX, pixelY, currentResult.epoch1.wcs);
      setCursorPos({ x: pixelX, y: pixelY, ra: sky.ra, dec: sky.dec, val });
    }
  };

  const handleCanvasMouseLeave = () => {
    setCursorPos(null);
  };

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMovePan = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const centerOnCandidate = (cand: CandidateDetection) => {
    setSelectedCandidate(cand);
    if (!currentResult) return;
    const w = currentResult.epoch1.width;
    const h = currentResult.epoch1.height;
    const offsetX = (w / 2 - cand.x) * (zoom * 7);
    const offsetY = (h / 2 - cand.y) * (zoom * 7);
    setPan({ x: offsetX, y: offsetY });
    if (window.innerWidth < 1024) {
      setMobileTab('canvas');
    }
  };

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    if (!currentResult?.candidates) return [];
    let list = [...currentResult.candidates];

    if (candidateFilter === 'candidates') {
      list = list.filter((c) => c.status !== 'Possible artifact' && (c.artifactScore ?? 0) < 0.5);
    } else if (candidateFilter === 'known') {
      list = list.filter((c) => (c.catalogMatches?.length ?? 0) > 0);
    } else if (candidateFilter === 'artifacts') {
      list = list.filter((c) => c.status === 'Possible artifact' || (c.artifactScore ?? 0) >= 0.5);
    }

    return list.sort((a, b) => b.peakSignificance - a.peakSignificance);
  }, [currentResult?.candidates, candidateFilter]);

  const totalPages = Math.ceil(filteredCandidates.length / CANDIDATES_PER_PAGE) || 1;
  const paginatedCandidates = filteredCandidates.slice(
    (candidatePage - 1) * CANDIDATES_PER_PAGE,
    candidatePage * CANDIDATES_PER_PAGE
  );

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* 1. Explainer Banner & Top Toolbar */}
      <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 sm:p-5 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-['Outfit'] text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t.explainerTitle}
              </h1>
              <span className="text-xs font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-semibold">
                {currentResult?.caseId ? `#${currentResult.caseId}` : 'Real NASA FITS'}
              </span>
              {currentResult?.fovArcmin && (
                <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md font-semibold">
                  FOV: {currentResult.fovArcmin}′ ({currentResult.sizePix}px)
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              {t.explainerText}
            </p>
          </div>

          {/* Quick Target Switcher / Search Trigger */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <select
              value={currentResult?.caseId || ''}
              onChange={(e) => onSelectCase(e.target.value, { sizePix: selectedFovSize, epochPair: selectedEpochPair })}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-200 hover:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 transition-colors active:scale-95 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t.btnSearchCoordinates}</span>
            </button>
          </div>
        </div>

        {/* Action Capabilities Row: Sky Coverage, 102 Spectral Bands, Discovery Passport, Compare Table */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowSkyCoverage(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] hover:border-amber-400/50 bg-slate-50 dark:bg-white/[0.03] text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <Globe2 className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.btnSkyCoverage}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSpectralExplorer(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] hover:border-cyan-400/50 bg-slate-50 dark:bg-white/[0.03] text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-500" />
              <span>{t.btnSpectralBands}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCandidateComparison(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] hover:border-indigo-400/50 bg-slate-50 dark:bg-white/[0.03] text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <Table className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t.btnCompareCandidates}</span>
            </button>

            {selectedCandidate && currentResult && (
              <button
                type="button"
                onClick={() => setShowDiscoveryReport(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{t.btnDiscoveryPassport}</span>
              </button>
            )}
          </div>

          {/* Field of View (FOV) Selector */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-500 dark:text-slate-400">{t.labelFov}</span>
            {[
              { label: "1.0′", size: 32 },
              { label: "2.0′", size: 64 },
              { label: "3.5′", size: 112 },
              { label: "5.0′", size: 160 },
            ].map((f) => (
              <button
                key={f.size}
                type="button"
                onClick={() => {
                  setSelectedFovSize(f.size);
                  if (currentResult) {
                    onSelectCase(currentResult.caseId, { sizePix: f.size, epochPair: selectedEpochPair });
                  }
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                  selectedFovSize === f.size
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Primary Observation Perspective Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Core Stage Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleSelectViewMode('epoch1')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              viewMode === 'epoch1'
                ? 'bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <span>{t.step1FirstObs}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectViewMode('epoch2')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              viewMode === 'epoch2'
                ? 'bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <span>{t.step2SecondObs}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectViewMode('difference')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              viewMode === 'difference'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{t.step3WhatChanged}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectViewMode('significance')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              viewMode === 'significance'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <span>{t.step4HowStrong}</span>
          </button>

          {/* Sequential playback mode if multi-epoch available */}
          {currentResult?.epochs && currentResult.epochs.length >= 3 && (
            <button
              type="button"
              onClick={() => {
                handleSelectViewMode('sequence');
                setIsSequencePlaying(true);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'sequence'
                  ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-500" />
              <span>{isRtl ? 'تسلسل زمني (3 رصدات)' : '3-Epoch Sequence'}</span>
            </button>
          )}
        </div>

        {/* Secondary Comparison Tools: Split Slider & Fast Blink */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => handleSelectViewMode('split')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
              viewMode === 'split'
                ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 font-semibold'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Split swipe slider between observation 1 and 2"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{t.btnSplitSwipe}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectViewMode('blink')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
              viewMode === 'blink'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-semibold'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Fast automatic blink cadence between epochs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t.btnFastBlink}</span>
          </button>
        </div>
      </div>

      {/* 3. Multi-Epoch Sequence Controller (When Sequence mode or 3 epochs active) */}
      {currentResult?.epochs && currentResult.epochs.length >= 3 && (
        <div className="p-3.5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-cyan-600 dark:text-cyan-400">{t.labelMultiEpochTimeline}</span>
            <div className="flex gap-1.5">
              {currentResult.epochs.map((ep, idx) => (
                <button
                  key={ep.obsId}
                  type="button"
                  onClick={() => {
                    setActiveEpochIdx(idx);
                    if (viewMode !== 'sequence') setViewMode('sequence');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    activeEpochIdx === idx && (viewMode === 'sequence' || viewMode === 'epoch1')
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Exposure {idx + 1} ({ep.date.split(/[T ]/)[0]})
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (viewMode !== 'sequence') setViewMode('sequence');
                setIsSequencePlaying(!isSequencePlaying);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
            >
              {isSequencePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSequencePlaying ? t.btnTimelinePause : t.btnTimelinePlay}</span>
            </button>

            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-500">Speed:</span>
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSequenceSpeed(s)}
                  className={`px-1.5 py-0.5 rounded ${
                    sequenceSpeed === s ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Difference Pair Selector */}
            <div className="flex items-center gap-1 text-[11px] border-l border-slate-200 dark:border-white/10 pl-2">
              <span className="text-slate-500">{t.labelEpochPair}</span>
              {['1-3', '1-2', '2-3'].map((pair) => {
                const [i1, i2] = pair.split('-').map((n) => parseInt(n, 10) - 1);
                const eA = currentResult.epochs?.[i1];
                const eB = currentResult.epochs?.[i2];
                let deltaLabel = '';
                if (eA && eB && Number.isFinite(eA.mjd) && Number.isFinite(eB.mjd)) {
                  const dtSec = Math.abs(eB.mjd - eA.mjd) * 86400;
                  if (dtSec < 3600) {
                    deltaLabel = ` (${dtSec.toFixed(1)}s)`;
                  } else if (dtSec < 86400) {
                    deltaLabel = ` (${(dtSec / 60).toFixed(1)}m)`;
                  } else {
                    deltaLabel = ` (${(dtSec / 86400).toFixed(1)}d)`;
                  }
                }
                return (
                  <button
                    key={pair}
                    type="button"
                    onClick={() => {
                      setSelectedEpochPair(pair);
                      onSelectCase(currentResult.caseId, { sizePix: selectedFovSize, epochPair: pair });
                    }}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      selectedEpochPair === pair
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pair.replace('-', ' vs ')}
                    {deltaLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Split Slider Bar (when in Split mode) */}
      {viewMode === 'split' && (
        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center gap-4 text-xs">
          <span className="font-mono text-indigo-700 dark:text-indigo-300 font-semibold whitespace-nowrap">
            Epoch 1 (Left)
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={sliderPos}
            onChange={(e) => setSliderPos(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-ew-resize"
          />
          <span className="font-mono text-indigo-700 dark:text-indigo-300 font-semibold whitespace-nowrap">
            Epoch 2 (Right)
          </span>
        </div>
      )}

      {/* 5. Mobile Tab Switcher */}
      <div className="lg:hidden flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
        <button
          type="button"
          onClick={() => setMobileTab('canvas')}
          className={`flex-1 py-2 text-xs font-medium rounded-xl text-center transition-all ${
            mobileTab === 'canvas'
              ? 'bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {isRtl ? 'الصورة الفلكية' : 'Canvas Viewport'}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('findings')}
          className={`flex-1 py-2 text-xs font-medium rounded-xl text-center transition-all ${
            mobileTab === 'findings'
              ? 'bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {isRtl ? `المرشحون (${filteredCandidates.length})` : `Findings (${filteredCandidates.length})`}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('spex')}
          className={`flex-1 py-2 text-xs font-medium rounded-xl text-center transition-all ${
            mobileTab === 'spex'
              ? 'bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {isRtl ? 'مرشد SPEX' : 'SPEX Guide'}
        </button>
      </div>

      {/* 6. Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Canvas Viewport */}
        <div
          className={`lg:col-span-7 xl:col-span-8 space-y-3 ${
            mobileTab !== 'canvas' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="relative rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-slate-950 overflow-hidden shadow-xl aspect-square sm:aspect-[4/3] flex items-center justify-center select-none group">
            {isLoading && (
              <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-slate-300">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                <span className="text-xs font-mono tracking-wider">
                  {isRtl ? 'جارٍ تحميل مقطع FITS الحقيقي وتحليله...' : 'Querying & Processing Real NASA FITS...'}
                </span>
              </div>
            )}

            {/* Panning & Zooming Viewport Container */}
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={(e) => {
                handleMouseMovePan(e);
                handleCanvasMouseMove(e);
              }}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                handleMouseUp();
                handleCanvasMouseLeave();
              }}
              className={`w-full h-full flex items-center justify-center overflow-hidden ${
                isDragging ? 'cursor-grabbing' : 'cursor-crosshair'
              }`}
            >
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                }}
                className="relative flex items-center justify-center"
              >
                <canvas
                  ref={canvasRef}
                  className="w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] rounded-xl shadow-2xl block image-rendering-pixelated"
                />

                {/* Candidate Highlight Markers */}
                {showMarkers &&
                  currentResult &&
                  filteredCandidates.map((cand) => {
                    const isSelected = selectedCandidate?.id === cand.id;
                    const isMoving = cand.motion?.isMoving === true || cand.status === 'Moving object candidate';
                    const isArtifact = cand.status === 'Possible artifact' || (cand.artifactScore ?? 0) >= 0.5;

                    const canvasSize = 480;
                    const origW = currentResult.epoch1.width || 64;
                    const origH = currentResult.epoch1.height || 64;
                    const posX = (cand.x / origW) * canvasSize - canvasSize / 2;
                    const posY = (cand.y / origH) * canvasSize - canvasSize / 2;

                    return (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCandidate(cand);
                        }}
                        style={{
                          transform: `translate(${posX}px, ${posY}px)`,
                        }}
                        className={`absolute z-20 w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? 'ring-2 ring-amber-400 bg-amber-500/25 scale-125'
                            : 'hover:scale-110'
                        }`}
                        title={`Candidate #${cand.id} (${cand.peakSignificance.toFixed(1)}σ)`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-mono font-bold ${
                            isMoving
                              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/80'
                              : isArtifact
                              ? 'border-rose-400 text-rose-300 bg-rose-950/80'
                              : 'border-amber-400 text-amber-300 bg-amber-950/80'
                          }`}
                        >
                          {cand.id}
                        </span>
                      </button>
                    );
                  })}
              </div>

              {/* Viewport Floating HUD Readout */}
              <div className="absolute bottom-3 left-3 z-30 pointer-events-none bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-3">
                {cursorPos ? (
                  <>
                    <span>
                      X:{cursorPos.x} Y:{cursorPos.y}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-amber-300">
                      RA {cursorPos.ra?.toFixed(4)}° Dec {cursorPos.dec?.toFixed(4)}°
                    </span>
                    {cursorPos.val != null && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="tabular-nums font-semibold text-emerald-400">
                          {cursorPos.val.toFixed(2)}{' '}
                          {viewMode === 'significance' ? 'σ' : 'MJy/sr'}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500">
                    {t.hudHoverPrompt}
                  </span>
                )}
              </div>

              {/* Viewport Zoom & Reset Controls */}
              <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 4.0))}
                  title={t.btnZoomIn}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.75))}
                  title={t.btnZoomOut}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1.1);
                    setPan({ x: 0, y: 0 });
                  }}
                  title={t.btnResetView}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Observation Status Watermark Badge */}
              <div className="absolute top-3 left-3 z-30 pointer-events-none">
                <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-mono text-amber-400 font-semibold">
                  {viewMode === 'epoch1' && `${t.statusVisit1}: ${currentResult?.epoch1.metadata.date_obs || '2025-04-28T13:00:15.755'}`}
                  {viewMode === 'epoch2' && `${t.statusVisit2}: ${currentResult?.epoch2.metadata.date_obs || '2025-04-28T13:02:24.686'}`}
                  {viewMode === 'sequence' && `Exposure ${activeEpochIdx + 1}/${currentResult?.epochs?.length || 3}: ${currentResult?.epochs?.[activeEpochIdx]?.date || '2025-04-28'}`}
                  {viewMode === 'difference' && t.statusDifference}
                  {viewMode === 'significance' && t.statusSignificance}
                  {viewMode === 'split' && t.statusSplit}
                  {viewMode === 'blink' && t.statusBlink}
                </span>
              </div>

              {/* Toggle Markers & Provenance triggers */}
              <div className="absolute bottom-3 right-3 z-30 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMarkers(!showMarkers)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono bg-black/80 backdrop-blur-md border border-white/10 transition-colors cursor-pointer ${
                    showMarkers ? 'text-amber-400' : 'text-slate-500'
                  }`}
                >
                  {showMarkers ? t.btnHideMarkers : t.btnShowMarkers}
                </button>

                <button
                  type="button"
                  onClick={() => setShowProvenance(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-black/80 backdrop-blur-md border border-white/10 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.btnProvenance}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Astronomical Contrast & Mathematical Stretch Fine-Tuning */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {t.settingsTitle}
              </span>
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="text-amber-600 dark:text-amber-400 hover:underline text-xs cursor-pointer"
              >
                {showAdvancedSettings ? t.btnHideContrast : t.btnAdjustContrast}
              </button>
            </div>

            {showAdvancedSettings && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                    {t.labelStretch}
                  </label>
                  <div className="flex gap-1">
                    {(['asinh', 'linear', 'sqrt', 'log'] as StretchMode[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStretch(st)}
                        className={`px-2 py-1 rounded-lg text-xs font-mono uppercase cursor-pointer ${
                          stretch === st
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                    {t.labelColormap}
                  </label>
                  <div className="flex gap-1">
                    {(['diff_diverging', 'grayscale', 'heat'] as ColormapMode[]).map((cm) => (
                      <button
                        key={cm}
                        type="button"
                        onClick={() => setColormap(cm)}
                        className={`px-2 py-1 rounded-lg text-xs font-mono cursor-pointer ${
                          colormap === cm
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {cm === 'diff_diverging' ? 'Diverging' : cm}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: SPEX Companion & Findings List */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5">
          {/* Active, Grounded SPEX Companion */}
          <div className={mobileTab === 'findings' ? 'hidden lg:block' : 'block'}>
            <SpexCompanion
              currentResult={currentResult}
              selectedCandidate={selectedCandidate}
              externalPrompt={externalSpexPrompt}
              onClearExternalPrompt={() => setExternalSpexPrompt(null)}
              language={language}
            />
          </div>

          {/* Findings & Candidate Evidence Cards */}
          <div
            className={`space-y-3 ${
              mobileTab === 'spex' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold font-['Outfit'] text-slate-900 dark:text-slate-100">
                  {t.findingsTitle}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400">
                  {filteredCandidates.length}
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 text-[11px] font-mono">
                {(['all', 'candidates', 'known', 'artifacts'] as CandidateFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setCandidateFilter(f);
                      setCandidatePage(1);
                    }}
                    className={`px-2 py-0.5 rounded-md capitalize transition-colors cursor-pointer ${
                      candidateFilter === f
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidate Cards List */}
            <div className="space-y-3">
              {paginatedCandidates.length > 0 ? (
                paginatedCandidates.map((cand) => (
                  <FindingCard
                    key={cand.id}
                    candidate={cand}
                    isSelected={selectedCandidate?.id === cand.id}
                    onSelect={(c) => setSelectedCandidate(c)}
                    onLocate={(c) => centerOnCandidate(c)}
                    onAskSpex={(prompt) => setExternalSpexPrompt(prompt)}
                    onOpenPassport={(c) => {
                      setSelectedCandidate(c);
                      setShowDiscoveryReport(true);
                    }}
                    language={language}
                  />
                ))
              ) : (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] text-xs text-slate-500 font-mono">
                  {t.noFindings}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                <span>
                  {t.pageOf} {candidatePage} / {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={candidatePage <= 1}
                    onClick={() => setCandidatePage((p) => Math.max(p - 1, 1))}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={candidatePage >= totalPages}
                    onClick={() => setCandidatePage((p) => Math.min(p + 1, totalPages))}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coordinate Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0c1220] shadow-2xl p-6 space-y-4 ${
              isRtl ? 'font-cairo' : 'font-sans'
            }`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base font-['Outfit'] text-slate-900 dark:text-slate-100">
                {t.searchModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Coverage Explanation Notice */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-700 dark:text-amber-200 space-y-1">
              <div className="font-bold text-amber-700 dark:text-amber-300">
                {t.searchCoverageNoticeTitle}
              </div>
              <p className="leading-relaxed">
                {t.searchCoverageNoticeText}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">
                  {t.searchLabelRa}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={customRa}
                  onChange={(e) => setCustomRa(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">
                  {t.searchLabelDec}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={customDec}
                  onChange={(e) => setCustomDec(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Verified SPHEREx QR2 Targets */}
            <div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1.5 font-medium">
                {t.searchVerifiedTargetsTitle}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: t.searchTargetNepVar, ra: 276.2614, dec: 64.8258 },
                  { name: t.searchTargetNepCal, ra: 275.9265, dec: 64.9585 },
                  { name: t.searchTargetNepMotion, ra: 276.1389, dec: 64.8361 },
                  { name: t.searchTargetNepField, ra: 275.8512, dec: 65.0998 },
                ].map((tgt) => (
                  <button
                    key={tgt.name}
                    type="button"
                    onClick={() => {
                      setCustomRa(tgt.ra.toString());
                      setCustomDec(tgt.dec.toString());
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-white/[0.05] hover:bg-amber-500/15 border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    {tgt.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                {t.searchBtnCancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  const raNum = parseFloat(customRa);
                  const decNum = parseFloat(customDec);
                  if (!Number.isNaN(raNum) && !Number.isNaN(decNum)) {
                    setIsSearchOpen(false);
                    onSearchTarget(raNum, decNum, selectedFovSize);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all cursor-pointer"
              >
                {t.searchBtnSubmit}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sky Coverage Explorer Modal */}
      {showSkyCoverage && (
        <SkyCoverageModal
          onClose={() => setShowSkyCoverage(false)}
          onSelectTarget={(tgt: ChallengeTarget) => {
            setCustomRa(tgt.ra.toString());
            setCustomDec(tgt.dec.toString());
          }}
          onSelectBenchmark={(benchId: string) => {
            onSelectCase(benchId, { sizePix: selectedFovSize, epochPair: selectedEpochPair });
          }}
          currentCoords={currentResult?.targetCoords}
          language={language}
        />
      )}

      {/* 102 Spectral Channels & SED Modal */}
      {showSpectralExplorer && (
        <SpectralExplorerModal
          onClose={() => setShowSpectralExplorer(false)}
          selectedCandidate={selectedCandidate}
          language={language}
        />
      )}

      {/* Discovery Passport Report Modal */}
      {showDiscoveryReport && selectedCandidate && currentResult && (
        <DiscoveryReportModal
          candidate={selectedCandidate}
          investigation={currentResult}
          onClose={() => setShowDiscoveryReport(false)}
          language={language}
        />
      )}

      {/* Candidate Comparison Modal */}
      {showCandidateComparison && currentResult && (
        <CandidateComparisonModal
          candidates={currentResult.candidates}
          investigation={currentResult}
          selectedCandidate={selectedCandidate}
          onSelectCandidate={(c) => {
            setSelectedCandidate(c);
            centerOnCandidate(c);
          }}
          onClose={() => setShowCandidateComparison(false)}
          language={language}
        />
      )}

      {/* Provenance Record Modal */}
      {showProvenance && currentResult?.provenance && (
        <ProvenanceModal
          provenance={currentResult.provenance}
          compatibility={currentResult.compatibility}
          evidence={currentResult.evidence}
          onClose={() => setShowProvenance(false)}
          language={language}
        />
      )}
    </div>
  );
};
