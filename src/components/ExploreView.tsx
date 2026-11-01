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
} from 'lucide-react';
import {
  CandidateDetection,
  InvestigationResult,
  SPHERExObservation,
} from '../science/types';
import { AstronomyRenderer, ColormapMode, DisplayMode, StretchMode } from '../utils/astronomyRender';
import { WCS } from '../science/wcs';
import { ProvenanceModal } from './ProvenanceModal';
import { SpexCompanion } from './SpexCompanion';
import { FindingCard } from './FindingCard';
import { ScienceTerm } from './ScienceTerm';
import { Language, translations } from '../utils/translations';

interface ExploreViewProps {
  currentResult: InvestigationResult | null;
  isLoading: boolean;
  onSearchTarget: (ra: number, dec: number) => void;
  onSelectCase: (caseId: string) => void;
  cases: Array<{ id: string; title: string; category?: string; ra: number; dec: number }>;
  language: Language;
}

export type ViewMode = 'difference' | 'significance' | 'epoch1' | 'epoch2' | 'split' | 'blink';
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

  // Primary 4-Stage Observation Perspective
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

  // Render scientific FITS data onto the canvas
  useEffect(() => {
    if (!currentResult || !canvasRef.current) return;

    const isDiff = viewMode === 'difference' || viewMode === 'significance';
    let dataToRender: number[] = [];
    let cm = colormap;

    if (viewMode === 'epoch1' || (viewMode === 'blink' && blinkEpoch === 'epoch1')) {
      dataToRender = currentResult.epoch1.flux;
      // For unipolar single visits, if diverging is selected, map to high-contrast grayscale
      if (cm === 'diff_diverging') cm = 'grayscale';
    } else if (viewMode === 'epoch2' || (viewMode === 'blink' && blinkEpoch === 'epoch2')) {
      dataToRender = currentResult.epoch2.flux;
      if (cm === 'diff_diverging') cm = 'grayscale';
    } else if (viewMode === 'difference') {
      dataToRender = currentResult.difference.diff;
      // In difference mode, use user-selected colormap (diff_diverging, grayscale, or heat)
    } else if (viewMode === 'significance') {
      dataToRender = currentResult.difference.significance;
      // In significance mode, use user-selected colormap
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
  }, [currentResult, viewMode, blinkEpoch, stretch, colormap, sliderPos]);

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
      if (viewMode === 'epoch1') val = currentResult.epoch1.flux[idx];
      else if (viewMode === 'epoch2') val = currentResult.epoch2.flux[idx];
      else if (viewMode === 'significance') val = currentResult.difference.significance[idx];

      const sky = WCS.pixToSky(pixelX, pixelY, currentResult.epoch2.wcs);
      setCursorPos({
        x: pixelX,
        y: pixelY,
        ra: sky.ra,
        dec: sky.dec,
        val,
      });
    } else {
      setCursorPos(null);
    }

    if (isDragging) {
      setPan({
        x: pan.x + (e.clientX - dragStart.x),
        y: pan.y + (e.clientY - dragStart.y),
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
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
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* 1. The 10-Second Explainer Banner (Clean, Minimal, Informative) */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 sm:p-5 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-['Outfit'] text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {isRtl ? 'مقارنة رصدات SPHEREx عبر الزمن' : 'Comparing SPHEREx Observations Over Time'}
              </h1>
              <span className="text-xs font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-semibold">
                {currentResult?.caseId ? `#${currentResult.caseId}` : 'Real NASA FITS'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              {isRtl ? (
                <>
                  نأخذ صورتين حقيقيتين لنفس البقعة في السماء التقطهما تلسكوب ناسا في وقتين مختلفين، ثم{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">نطرحهما من بعضهما</span>. أي نقطة
                  مضيئة أو مظلمة متبقية تكشف عن أجرام تحركت (كويكبات)، أو نجوم تغير سطوعها، أو عيوب في الكاميرا تم
                  استبعادها.
                </>
              ) : (
                <>
                  We take two real NASA observations of the same sky patch taken at different times and{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">subtract them</span>. Residual
                  bright or dark spots instantly reveal moving objects (asteroids), variable stars, or detector issues.
                </>
              )}
            </p>
          </div>

          {/* Quick Target Switcher / Search Trigger */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <select
              value={currentResult?.caseId || ''}
              onChange={(e) => onSelectCase(e.target.value)}
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 transition-colors active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isRtl ? 'بحث بإحداثيات' : 'Search Coordinates'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Primary 4-Stage Observation Perspective Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* The 4 Core Stages */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleSelectViewMode('epoch1')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
              viewMode === 'epoch1'
                ? 'bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <span>{isRtl ? '1. الرصدة الأولى' : '1. First Observation'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectViewMode('epoch2')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
              viewMode === 'epoch2'
                ? 'bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <span>{isRtl ? '2. الرصدة الثانية' : '2. Second Observation'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectViewMode('difference')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
              viewMode === 'difference'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{isRtl ? '3. ما الذي تغير؟' : '3. What Changed?'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectViewMode('significance')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
              viewMode === 'significance'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <span>{isRtl ? '4. ما مدى قوة التغير؟ (σ)' : '4. How Strong? (σ)'}</span>
          </button>
        </div>

        {/* Secondary Comparison Tools: Split Slider & Fast Blink */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => handleSelectViewMode('split')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
              viewMode === 'split'
                ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 font-semibold'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Split swipe slider between observation 1 and 2"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isRtl ? 'شريحة مقارنة' : 'Split Swipe'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectViewMode('blink')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
              viewMode === 'blink'
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-semibold'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Rapid alternating blink between observation 1 and 2"
          >
            {isBlinking && viewMode === 'blink' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRtl ? 'وميض متكرر' : 'Fast Blink'}</span>
          </button>
        </div>
      </div>

      {/* 3. Main Workspace Layout: The Canvas & Companion Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: The Scientific Canvas (Undisputed focal anchor) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3">
          {/* Canvas Viewport Container */}
          <div className="relative rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-slate-950 shadow-lg overflow-hidden select-none">
            {/* Split view slider overlay */}
            {viewMode === 'split' && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-300">Obs 1</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={sliderPos}
                  onChange={(e) => setSliderPos(parseFloat(e.target.value))}
                  className="w-28 accent-amber-400"
                />
                <span className="text-[10px] font-mono text-slate-300">Obs 2</span>
              </div>
            )}

            {/* Canvas Stage */}
            <div
              onMouseMove={handleCanvasMouseMove}
              onMouseDown={(e) => {
                if (e.button === 0) {
                  setIsDragging(true);
                  setDragStart({ x: e.clientX, y: e.clientY });
                }
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => {
                setIsDragging(false);
                setCursorPos(null);
              }}
              className="relative w-full aspect-square sm:aspect-[4/3] flex items-center justify-center cursor-crosshair overflow-hidden"
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
                  width={512}
                  height={512}
                  className="w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] object-contain image-rendering-pixelated shadow-2xl rounded-lg"
                />

                {/* Candidate Target Overlay Markers */}
                {showMarkers &&
                  currentResult?.candidates.map((cand) => {
                    const isSelected = selectedCandidate?.id === cand.id;
                    const isMoving = cand.motion?.isMoving === true || cand.status === 'Moving object candidate';
                    const isArtifact = cand.status === 'Possible artifact' || (cand.artifactScore ?? 0) >= 0.5;

                    // Convert (x, y) relative to canvas size
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

              {/* Viewport Floating HUD Readout (Tabular numbers) */}
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
                    {isRtl ? 'حرك المؤشر فوق الصورة للفحص' : 'Hover over image for coordinates & flux'}
                  </span>
                )}
              </div>

              {/* Viewport Zoom & Reset Controls */}
              <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 4.0))}
                  title="Zoom In"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.75))}
                  title="Zoom Out"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1.1);
                    setPan({ x: 0, y: 0 });
                  }}
                  title="Reset Viewport"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Bar on Canvas: Perspective status & Provenance button */}
            <div className="px-4 py-2.5 bg-black/90 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>
                  {viewMode === 'epoch1' && (isRtl ? 'الرصدة 1 (FITS أصلي)' : 'Visit 1 (Original Calibrated FITS)')}
                  {viewMode === 'epoch2' && (isRtl ? 'الرصدة 2 (FITS أصلي)' : 'Visit 2 (Original Calibrated FITS)')}
                  {viewMode === 'difference' && (isRtl ? 'صورة الفرق (طرح التدفق)' : 'Difference Image (Flux Residuals)')}
                  {viewMode === 'significance' && (isRtl ? 'خريطة الأهمية الإحصائية (سيجما)' : 'Significance Map (Signal-to-Noise σ)')}
                  {viewMode === 'split' && (isRtl ? 'شريحة مقارنة متجاورة' : 'Interactive Split Slider')}
                  {viewMode === 'blink' && (isRtl ? 'وميض سريع بين الصورتين' : 'Rapid Cadence Blink')}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowMarkers(!showMarkers)}
                  className={`text-[11px] hover:text-slate-200 transition-colors ${
                    showMarkers ? 'text-amber-400' : 'text-slate-500'
                  }`}
                >
                  {showMarkers ? (isRtl ? 'إخفاء العلامات' : 'Hide Markers') : (isRtl ? 'إظهار العلامات' : 'Show Markers')}
                </button>

                <button
                  type="button"
                  onClick={() => setShowProvenance(true)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'توثيق البيانات' : 'Provenance'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Color & Rendering Fine-Tuning (Quiet, collapsed accordion) */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {isRtl ? 'إعدادات العرض الفلكي' : 'Astronomical Contrast & Stretch'}
              </span>
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="text-amber-600 dark:text-amber-400 hover:underline text-xs"
              >
                {showAdvancedSettings ? (isRtl ? 'إخفاء' : 'Hide') : (isRtl ? 'تعديل التباين' : 'Adjust')}
              </button>
            </div>

            {showAdvancedSettings && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                    {isRtl ? 'التمدد الرياضي (Stretch):' : 'Mathematical Stretch:'}
                  </label>
                  <div className="flex gap-1">
                    {(['asinh', 'linear', 'sqrt', 'log'] as StretchMode[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStretch(st)}
                        className={`px-2 py-1 rounded-lg text-xs font-mono uppercase ${
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
                    {isRtl ? 'التلوين الطيفي (Colormap):' : 'Colormap:'}
                  </label>
                  <div className="flex gap-1">
                    {(['diff_diverging', 'grayscale', 'heat'] as ColormapMode[]).map((cm) => (
                      <button
                        key={cm}
                        type="button"
                        onClick={() => setColormap(cm)}
                        className={`px-2 py-1 rounded-lg text-xs font-mono ${
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
          {/* Active, Intelligent SPEX Companion */}
          <SpexCompanion
            currentResult={currentResult}
            selectedCandidate={selectedCandidate}
            viewMode={viewMode}
            language={language}
            externalPrompt={externalSpexPrompt}
            onClearExternalPrompt={() => setExternalSpexPrompt(null)}
          />

          {/* Detected Candidates / Findings Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-slate-100">
                  {isRtl ? 'المرشحون المكتشفون' : 'Detected Signals'}
                </h3>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  ({filteredCandidates.length})
                </span>
              </div>

              {/* Clean Filter Tabs */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCandidateFilter('all');
                    setCandidatePage(1);
                  }}
                  className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                    candidateFilter === 'all'
                      ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {isRtl ? 'الكل' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCandidateFilter('candidates');
                    setCandidatePage(1);
                  }}
                  className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                    candidateFilter === 'candidates'
                      ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {isRtl ? 'حقيقي' : 'Real'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCandidateFilter('artifacts');
                    setCandidatePage(1);
                  }}
                  className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                    candidateFilter === 'artifacts'
                      ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {isRtl ? 'عيوب' : 'Glitches'}
                </button>
              </div>
            </div>

            {/* Findings List */}
            {paginatedCandidates.length > 0 ? (
              <div className="space-y-3">
                {paginatedCandidates.map((cand) => (
                  <FindingCard
                    key={cand.id}
                    candidate={cand}
                    isSelected={selectedCandidate?.id === cand.id}
                    onSelect={(c) => setSelectedCandidate(c)}
                    onLocate={(c) => centerOnCandidate(c)}
                    onAskSpex={(prompt) => setExternalSpexPrompt(prompt)}
                    language={language}
                  />
                ))}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 text-xs font-mono text-slate-500">
                    <span>
                      Page {candidatePage} of {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={candidatePage <= 1}
                        onClick={() => setCandidatePage((p) => Math.max(p - 1, 1))}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={candidatePage >= totalPages}
                        onClick={() => setCandidatePage((p) => Math.min(p + 1, totalPages))}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08] disabled:opacity-30"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] text-center text-xs text-slate-500">
                {isRtl ? 'لا توجد إشارات مطابقة للتصفية المحددة' : 'No signals match the selected filter'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coordinate Search Dialog */}
      {isSearchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#0c1220] rounded-3xl border border-slate-200 dark:border-white/[0.1] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-slate-100">
                {isRtl ? 'بحث في سماء SPHEREx' : 'Investigate Sky Coordinates'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
              <div className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>{isRtl ? 'نطاق تغطية SPHEREx QR2 الحالي:' : 'Available SPHEREx QR2 Coverage:'}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                {isRtl
                  ? 'يغطي إصدار QR2 المنشور حالياً من ناسا منطقة القطب الشمالي لمسار الشمس (NEP) بين RA 275.5°–276.8° و Dec +64.5°–65.2°. ستتوسع التغطية لتشمل كامل السماء في الإصدارات القادمة.'
                  : 'The currently published NASA/IPAC SPHEREx QR2 release covers the North Ecliptic Pole (NEP) deep field (RA 275.5°–276.8°, Dec +64.5°–65.2°). Full all-sky coverage expands in future releases.'}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">
                  Right Ascension (RA in degrees, ~275.5°–276.8°):
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
                  Declination (Dec in degrees, ~+64.5°–65.2°):
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
                {isRtl ? 'أهداف سريعة موثقة في نطاق SPHEREx QR2:' : 'Verified Targets within SPHEREx QR2 Footprint:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'NEP Deep Variable', ra: 276.2614, dec: 64.8258 },
                  { name: 'NEP Calibration Standard', ra: 275.9265, dec: 64.9585 },
                  { name: 'NEP Proper Motion Star', ra: 276.1389, dec: 64.8361 },
                  { name: 'NEP Field Counterpart', ra: 275.8512, dec: 65.0998 },
                ].map((tgt) => (
                  <button
                    key={tgt.name}
                    type="button"
                    onClick={() => {
                      setCustomRa(tgt.ra.toString());
                      setCustomDec(tgt.dec.toString());
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-white/[0.05] hover:bg-amber-500/15 border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
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
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const raNum = parseFloat(customRa);
                  const decNum = parseFloat(customDec);
                  if (!Number.isNaN(raNum) && !Number.isNaN(decNum)) {
                    setIsSearchOpen(false);
                    onSearchTarget(raNum, decNum);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all"
              >
                {isRtl ? 'بدء التحليل الفلكي' : 'Query & Compare'}
              </button>
            </div>
          </div>
        </div>
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
