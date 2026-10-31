import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Search,
  Crosshair,
  Binary,
  Play,
  Pause,
  Telescope,
  X,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Compass,
  Radio,
  ExternalLink,
  Layers,
  ChevronDown,
  Info,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Grid,
  Database,
  Calendar,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import {
  CandidateDetection,
  InvestigationResult,
  SPHERExObservation,
} from '../science/types';
import { AstronomyRenderer, ColormapMode, DisplayMode, StretchMode } from '../utils/astronomyRender';
import { WCS } from '../science/wcs';
import { ProvenanceModal } from './ProvenanceModal';
import { SpexPopup } from './SpexPopup';
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
export type CandidateSort = 'significance' | 'aperture' | 'flux';

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

  // Viewport states
  const [viewMode, setViewMode] = useState<ViewMode>('difference');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('science');
  const [stretch, setStretch] = useState<StretchMode>('asinh');
  const [colormap, setColormap] = useState<ColormapMode>('diff_diverging');
  const [zoom, setZoom] = useState<number>(1.15);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sliderPos, setSliderPos] = useState<number>(0.5);
  const [blinkEpoch, setBlinkEpoch] = useState<'epoch1' | 'epoch2'>('epoch1');
  const [blinkSpeedMs, setBlinkSpeedMs] = useState<number>(450);
  const [isBlinking, setIsBlinking] = useState<boolean>(true);

  // Inspector cursor readout
  const [cursorPos, setCursorPos] = useState<{
    x: number;
    y: number;
    ra?: number;
    dec?: number;
    val?: number;
  } | null>(null);

  // Secondary popovers & dialogs
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetection | null>(null);
  const [showCandidateDrawer, setShowCandidateDrawer] = useState<boolean>(false);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showProvenance, setShowProvenance] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState<boolean>(false);
  const [showExplanationDeck, setShowExplanationDeck] = useState<boolean>(true);
  const [explanationMode, setExplanationMode] = useState<'simple' | 'scientific'>('simple');
  const [showWhyChecksMatter, setShowWhyChecksMatter] = useState<boolean>(false);

  // Candidate Explorer pagination & filtering
  const [candidateFilter, setCandidateFilter] = useState<CandidateFilter>('all');
  const [candidateSort, setCandidateSort] = useState<CandidateSort>('significance');
  const [candidatePage, setCandidatePage] = useState<number>(1);
  const CANDIDATES_PER_PAGE = 4;

  // Search Sky modal state
  const [customRa, setCustomRa] = useState<string>('276.2614');
  const [customDec, setCustomDec] = useState<string>('64.8258');
  const [customRadius, setCustomRadius] = useState<string>('0.5');
  const [searchModeTab, setSearchModeTab] = useState<'direct' | 'tap'>('direct');
  const [isQueryingTap, setIsQueryingTap] = useState<boolean>(false);
  const [tapObservations, setTapObservations] = useState<SPHERExObservation[]>([]);
  const [tapError, setTapError] = useState<string | null>(null);
  const [tapQueryExecuted, setTapQueryExecuted] = useState<boolean>(false);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Automatically adapt default colormap when switching viewMode
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'difference' || mode === 'significance') {
      setColormap('diff_diverging');
    } else if (colormap === 'diff_diverging') {
      setColormap('grayscale');
    }
  };

  // Synchronize candidate selection and default viewport on case change
  useEffect(() => {
    if (currentResult) {
      if (currentResult.candidates.length > 0) {
        setSelectedCandidate(currentResult.candidates[0]);
      } else {
        setSelectedCandidate(null);
      }
      setPan({ x: 0, y: 0 });
      setZoom(1.15);
      setCandidatePage(1);
    }
  }, [currentResult?.caseId]);

  // Blink cadence timer
  useEffect(() => {
    if (viewMode !== 'blink' || !isBlinking) return;
    const interval = setInterval(() => {
      setBlinkEpoch((prev) => (prev === 'epoch1' ? 'epoch2' : 'epoch1'));
    }, blinkSpeedMs);
    return () => clearInterval(interval);
  }, [viewMode, isBlinking, blinkSpeedMs]);

  // Render to canvas using enhanced AstronomyRenderer
  useEffect(() => {
    if (!currentResult || !canvasRef.current) return;

    let dataToRender: number[] = [];
    let cm = colormap;

    if (viewMode === 'epoch1' || (viewMode === 'blink' && blinkEpoch === 'epoch1')) {
      dataToRender = currentResult.epoch1.flux;
      if (cm === 'diff_diverging') cm = 'grayscale';
    } else if (viewMode === 'epoch2' || (viewMode === 'blink' && blinkEpoch === 'epoch2')) {
      dataToRender = currentResult.epoch2.flux;
      if (cm === 'diff_diverging') cm = 'grayscale';
    } else if (viewMode === 'difference') {
      dataToRender = currentResult.difference.diff;
      cm = 'diff_diverging';
    } else if (viewMode === 'significance') {
      dataToRender = currentResult.difference.significance;
      cm = 'diff_diverging';
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
        displayMode,
        renderSize: 512,
      }
    );
  }, [currentResult, viewMode, blinkEpoch, stretch, colormap, sliderPos, displayMode]);

  // Cursor inspector readout
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch event handlers for mobile panning & dragging
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      setPan((p) => ({
        x: p.x + (e.touches[0].clientX - dragStart.x),
        y: p.y + (e.touches[0].clientY - dragStart.y),
      }));
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const centerOnCandidate = (cand: CandidateDetection) => {
    setSelectedCandidate(cand);
    setShowCandidateDrawer(true);
    if (!currentResult) return;
    const w = currentResult.epoch1.width;
    const h = currentResult.epoch1.height;
    const offsetX = (w / 2 - cand.x) * (zoom * 7);
    const offsetY = (h / 2 - cand.y) * (zoom * 7);
    setPan({ x: offsetX, y: offsetY });
  };

  // Candidate filtering & sorting
  const filteredCandidates = useMemo(() => {
    if (!currentResult?.candidates) return [];
    let list = [...currentResult.candidates];

    if (candidateFilter === 'candidates') {
      list = list.filter((c) => c.status === 'Candidate');
    } else if (candidateFilter === 'known') {
      list = list.filter((c) => c.status === 'Likely known source' || c.catalogMatches.length > 0);
    } else if (candidateFilter === 'artifacts') {
      list = list.filter((c) => c.status === 'Possible artifact' || c.artifactScore >= 0.5);
    }

    if (candidateSort === 'significance') {
      list.sort((a, b) => Math.abs(b.peakSignificance) - Math.abs(a.peakSignificance));
    } else if (candidateSort === 'aperture') {
      list.sort((a, b) => Math.abs(b.apertureSignificance || 0) - Math.abs(a.apertureSignificance || 0));
    } else if (candidateSort === 'flux') {
      list.sort((a, b) => Math.abs(b.deltaFlux) - Math.abs(a.deltaFlux));
    }

    return list;
  }, [currentResult?.candidates, candidateFilter, candidateSort]);

  const totalCandidatePages = Math.max(1, Math.ceil(filteredCandidates.length / CANDIDATES_PER_PAGE));
  const paginatedCandidates = useMemo(() => {
    const start = (candidatePage - 1) * CANDIDATES_PER_PAGE;
    return filteredCandidates.slice(start, start + CANDIDATES_PER_PAGE);
  }, [filteredCandidates, candidatePage]);

  // Execute IRSA TAP archive catalog query
  const executeTapQuery = async () => {
    const ra = parseFloat(customRa);
    const dec = parseFloat(customDec);
    const radius = parseFloat(customRadius) || 0.5;

    if (Number.isNaN(ra) || Number.isNaN(dec)) return;

    setIsQueryingTap(true);
    setTapError(null);
    setTapQueryExecuted(true);

    try {
      const res = await fetch(`/api/spherex/query?ra=${ra}&dec=${dec}&radius=${radius}`);
      if (!res.ok) {
        throw new Error(`IRSA TAP service returned HTTP ${res.status}`);
      }
      const data = await res.json();
      setTapObservations(data.observations || []);
    } catch (err: any) {
      setTapError(err.message || 'Failed to query NASA/IPAC IRSA TAP catalog');
      setTapObservations([]);
    } finally {
      setIsQueryingTap(false);
    }
  };

  const getStatusBadge = (classification: string) => {
    switch (classification) {
      case 'SIGNIFICANT CHANGE DETECTED':
        return {
          label: language === 'ar' ? 'تغير حقيقي مرصود' : 'Significant Change Detected',
          border: 'border-emerald-500/40',
          bg: 'bg-emerald-500/15 text-emerald-200',
          dot: 'bg-emerald-400',
        };
      case 'NO SIGNIFICANT CHANGE DETECTED':
        return {
          label: language === 'ar' ? 'ثبات كوني تام' : 'Stable Photometric Baseline',
          border: 'border-cyan-500/40',
          bg: 'bg-cyan-500/15 text-cyan-200',
          dot: 'bg-cyan-400',
        };
      case 'POSSIBLE ARTIFACT':
        return {
          label: language === 'ar' ? 'تشويش مستشعر مستبعد' : 'Artifact Rejection',
          border: 'border-amber-500/40',
          bg: 'bg-amber-500/15 text-amber-200',
          dot: 'bg-amber-400',
        };
      case 'INSUFFICIENT DATA':
        return {
          label: language === 'ar' ? 'نطاقات غير متطابقة' : 'Cross-Band Comparison',
          border: 'border-purple-500/40',
          bg: 'bg-purple-500/15 text-purple-200',
          dot: 'bg-purple-400',
        };
      default:
        return {
          label: classification,
          border: 'border-slate-500/40',
          bg: 'bg-slate-800/80 text-slate-300',
          dot: 'bg-slate-400',
        };
    }
  };

  if (isLoading || !currentResult) {
    return (
      <div className="relative w-full h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#02040a] text-slate-200 overflow-hidden px-4">
        <div className="relative flex flex-col items-center gap-4 sm:gap-5 p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#030712]/90 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] max-w-sm sm:max-w-md text-center">
          <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-sky-500/20 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Telescope className="h-6 w-6 sm:h-7 sm:w-7 animate-pulse text-amber-300" />
          </div>
          <div>
            <h3 className="font-['Outfit'] text-sm sm:text-base font-bold text-slate-100">
              {language === 'ar' ? 'الاتصال بأرشيف ناسا SPHEREx...' : 'Accessing NASA/IPAC IRSA SPHEREx Data...'}
            </h3>
            <p className="text-[11px] sm:text-xs font-mono text-slate-400 mt-1.5 leading-relaxed">
              {language === 'ar'
                ? 'استرجاع صور FITS الأصلية وحساب خريطة الفروق واستخراج المرشحات...'
                : 'Retrieving calibrated FITS arrays, aligning epochs & computing difference residuals...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(currentResult.evidence.classification);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden bg-[#02040a] select-none ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
    >
      {/* =========================================================================
          1. DOMINANT HERO TELESCOPE CANVAS (TOUCH + MOUSE DRAG/PAN)
          ========================================================================= */}
      <div
        className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden touch-none"
        onMouseMove={handleCanvasMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setCursorPos(null);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative transition-transform duration-75 ease-out rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.95)] border border-white/10"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <canvas
            ref={canvasRef}
            className="block w-[320px] h-[320px] xs:w-[380px] xs:h-[380px] sm:w-[480px] sm:h-[480px] md:w-[512px] md:h-[512px] pointer-events-auto"
            style={{
              imageRendering: displayMode === 'science' ? 'pixelated' : 'auto',
            }}
          />

          {/* Detector Pixel Grid Overlay in Science Mode */}
          {showGrid && displayMode === 'science' && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10 opacity-30"
              viewBox="0 0 64 64"
              preserveAspectRatio="none"
            >
              <defs>
                <pattern id="detector-grid" width="1" height="1" patternUnits="userSpaceOnUse">
                  <path d="M 1 0 L 0 0 0 1" fill="none" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.08" />
                </pattern>
              </defs>
              <rect width="64" height="64" fill="url(#detector-grid)" />
            </svg>
          )}

          {/* Candidate Reticles */}
          {showMarkers &&
            currentResult &&
            currentResult.candidates.map((cand) => {
              const isSelected = selectedCandidate?.id === cand.id;
              const isArtifact = cand.artifactScore >= 0.5;
              const leftPct = (cand.x / currentResult.epoch1.width) * 100;
              const topPct = (cand.y / currentResult.epoch1.height) * 100;

              return (
                <div
                  key={cand.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    centerOnCandidate(cand);
                  }}
                  className="absolute cursor-pointer -translate-x-1/2 -translate-y-1/2 group z-20 pointer-events-auto"
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                >
                  <div
                    className={`relative flex items-center justify-center w-6 h-6 rounded-full border transition-all ${
                      isSelected
                        ? isArtifact
                          ? 'border-amber-400 bg-amber-500/25 shadow-[0_0_12px_#f59e0b]'
                          : 'border-emerald-400 bg-emerald-500/25 shadow-[0_0_12px_#10b981]'
                        : isArtifact
                        ? 'border-amber-500/50 hover:border-amber-400 bg-amber-500/10'
                        : 'border-sky-400/50 hover:border-sky-400 bg-sky-500/10'
                    }`}
                  >
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        isArtifact ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* =========================================================================
          2. TOP CONTROL HUD (CASE SELECTOR, MODE PICKER, ACTIONS)
          ========================================================================= */}
      <div className="absolute top-2 sm:top-3 inset-x-2 sm:inset-x-4 pointer-events-none z-30 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1.5">
          {/* Left: Case Selector */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
            <div className="relative">
              <select
                value={currentResult.caseId}
                onChange={(e) => onSelectCase(e.target.value)}
                className="appearance-none pl-3 pr-7 sm:px-3.5 py-1.5 rounded-full border border-white/15 bg-[#030712]/90 hover:bg-[#030712] backdrop-blur-2xl text-[11px] sm:text-xs font-mono text-slate-200 outline-none cursor-pointer max-w-[140px] xs:max-w-[190px] sm:max-w-xs truncate shadow-lg transition-colors"
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                    {c.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Target Status Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-medium backdrop-blur-2xl ${statusBadge.border} ${statusBadge.bg}`}
            >
              <span className={`h-2 w-2 rounded-full ${statusBadge.dot}`} />
              <span>{statusBadge.label}</span>
            </div>
          </div>

          {/* Desktop Center: Human-Friendly Mode Selector */}
          <div className="pointer-events-auto hidden md:flex items-center p-1 rounded-full border border-white/10 bg-[#030712]/85 backdrop-blur-2xl shadow-xl gap-0.5 font-mono text-xs">
            <button
              onClick={() => handleViewModeChange('difference')}
              className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 ${
                viewMode === 'difference'
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40 font-bold shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="What Changed: difference image (I2 - I1) where unchanged stars cancel out"
            >
              <span>{language === 'ar' ? 'ما الذي تغير؟' : 'What Changed'}</span>
              <span className="text-[10px] text-slate-400">(I₂-I₁)</span>
            </button>
            <button
              onClick={() => handleViewModeChange('significance')}
              className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
                viewMode === 'significance'
                  ? 'bg-white/15 text-amber-300 border border-white/20 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="How Strong: statistical significance in noise standard deviations (S/N in sigma)"
            >
              <span>{language === 'ar' ? 'قوة الإشارة' : 'Significance'}</span>
              <span className="text-[10px] text-slate-400">(σ)</span>
            </button>
            <button
              onClick={() => handleViewModeChange('epoch1')}
              className={`px-2.5 py-1 rounded-full transition-all ${
                viewMode === 'epoch1'
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="First Look: Initial observation (April 2025)"
            >
              {language === 'ar' ? 'اللقطة 1' : 'Epoch 1'}
            </button>
            <button
              onClick={() => handleViewModeChange('epoch2')}
              className={`px-2.5 py-1 rounded-full transition-all ${
                viewMode === 'epoch2'
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Second Look: Subsequent observation (May 2025)"
            >
              {language === 'ar' ? 'اللقطة 2' : 'Epoch 2'}
            </button>
            <button
              onClick={() => handleViewModeChange('blink')}
              className={`px-2 py-1 rounded-full transition-all ${
                viewMode === 'blink'
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Blink: rapid cadence toggle between both epochs"
            >
              {language === 'ar' ? 'وميض' : 'Blink'}
            </button>
            <button
              onClick={() => handleViewModeChange('split')}
              className={`px-2 py-1 rounded-full transition-all ${
                viewMode === 'split'
                  ? 'bg-white/15 text-slate-200 border border-white/20 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Split Wipe: curtain slider"
            >
              {language === 'ar' ? 'ستارة' : 'Split'}
            </button>
          </div>

          {/* Right: Candidates Drawer, Search Sky & Provenance Action Buttons */}
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5">
            {/* Candidates Button */}
            <button
              onClick={() => setShowCandidateDrawer(!showCandidateDrawer)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-full border backdrop-blur-2xl text-[11px] sm:text-xs font-mono transition-all ${
                showCandidateDrawer
                  ? 'border-amber-400/60 bg-amber-500/25 text-amber-200 font-bold shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'border-white/15 bg-[#030712]/85 hover:bg-white/10 text-slate-300'
              }`}
              title="View Candidate Detections"
            >
              <Crosshair className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
              <span className="hidden xs:inline">{language === 'ar' ? 'المرشحات' : 'Candidates'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                {currentResult?.candidates.length || 0}
              </span>
            </button>

            {/* Search Sky Modal Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-full border border-white/15 bg-[#030712]/85 hover:bg-white/10 backdrop-blur-2xl text-slate-300 hover:text-amber-300 text-[11px] sm:text-xs font-mono transition-colors shadow-md"
              title="Query New Astronomical Coordinates"
            >
              <Search className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">{language === 'ar' ? 'إحداثيات' : 'Search Sky'}</span>
            </button>

            {/* Provenance Audit Trigger */}
            <button
              onClick={() => setShowProvenance(true)}
              className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full border border-white/15 bg-[#030712]/85 hover:bg-white/10 backdrop-blur-2xl text-slate-300 hover:text-emerald-400 transition-colors shadow-md"
              title="Inspect FITS Provenance & Data Quality"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* Mobile-Only Mode Selector Scrollable Strip */}
        <div className="pointer-events-auto md:hidden flex items-center p-1 rounded-full border border-white/10 bg-[#030712]/90 backdrop-blur-2xl shadow-xl gap-1 font-mono text-[11px] overflow-x-auto no-scrollbar scrollbar-none w-fit mx-auto max-w-full">
          <button
            onClick={() => handleViewModeChange('difference')}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
              viewMode === 'difference'
                ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {language === 'ar' ? 'ما الذي تغير؟' : 'What Changed'}
          </button>
          <button
            onClick={() => handleViewModeChange('significance')}
            className={`px-2 py-1 rounded-full whitespace-nowrap transition-all ${
              viewMode === 'significance'
                ? 'bg-white/15 text-amber-300 border border-white/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {language === 'ar' ? 'قوة الإشارة' : 'Significance'}
          </button>
          <button
            onClick={() => handleViewModeChange('epoch1')}
            className={`px-2 py-1 rounded-full whitespace-nowrap transition-all ${
              viewMode === 'epoch1'
                ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Epoch 1
          </button>
          <button
            onClick={() => handleViewModeChange('epoch2')}
            className={`px-2 py-1 rounded-full whitespace-nowrap transition-all ${
              viewMode === 'epoch2'
                ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Epoch 2
          </button>
          <button
            onClick={() => handleViewModeChange('blink')}
            className={`px-2 py-1 rounded-full whitespace-nowrap transition-all ${
              viewMode === 'blink'
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Blink
          </button>
          <button
            onClick={() => handleViewModeChange('split')}
            className={`px-2 py-1 rounded-full whitespace-nowrap transition-all ${
              viewMode === 'split'
                ? 'bg-white/15 text-slate-200 border border-white/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Split
          </button>
        </div>
      </div>

      {/* Special Context Slider for Split Wipe */}
      {viewMode === 'split' && (
        <div className="absolute top-20 sm:top-16 inset-x-0 pointer-events-none z-30 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 px-3.5 py-1.5 sm:py-2 rounded-full border border-white/10 bg-[#030712]/90 backdrop-blur-2xl shadow-xl text-xs font-mono text-slate-300">
            <span className="text-sky-300 font-semibold text-[11px] sm:text-xs">Epoch 1</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sliderPos}
              onChange={(e) => setSliderPos(parseFloat(e.target.value))}
              className="w-28 sm:w-36 accent-amber-400 cursor-pointer"
            />
            <span className="text-amber-300 font-semibold text-[11px] sm:text-xs">Epoch 2</span>
          </div>
        </div>
      )}

      {/* Special Context Control for Blink Cadence */}
      {viewMode === 'blink' && (
        <div className="absolute top-20 sm:top-16 inset-x-0 pointer-events-none z-30 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3 px-3.5 py-1.5 sm:py-2 rounded-full border border-white/10 bg-[#030712]/90 backdrop-blur-2xl shadow-xl text-xs font-mono text-slate-300">
            <button
              onClick={() => setIsBlinking(!isBlinking)}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-amber-300"
            >
              {isBlinking ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <span className="px-2 py-0.5 rounded bg-white/10 text-amber-300 font-bold uppercase text-[10px]">
              {blinkEpoch === 'epoch1' ? 'Epoch 1 (Apr 2025)' : 'Epoch 2 (May 2025)'}
            </span>
            <span className="text-slate-400 text-[11px]">{blinkSpeedMs}ms</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. PROGRESSIVE DISCLOSURE EXPLAINER DECK (UNDER/OVER CANVAS)
          ========================================================================= */}
      {showExplanationDeck && (
        <div className="absolute top-20 sm:top-16 left-2 sm:left-4 z-20 pointer-events-auto max-w-[280px] sm:max-w-xs rounded-2xl border border-white/10 bg-[#030712]/90 backdrop-blur-2xl p-3 shadow-xl text-xs font-mono text-slate-300 hidden md:block">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
              <Eye className="h-3.5 w-3.5" />
              <span>{language === 'ar' ? 'ما الذي أراه الآن؟' : 'What am I looking at?'}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExplanationMode(explanationMode === 'simple' ? 'scientific' : 'simple')}
                className="text-[9px] px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-slate-300 hover:text-amber-300 transition-colors"
                title="Toggle Simple Summary / Deep Scientific Telemetry"
              >
                {explanationMode === 'simple' ? 'Simple' : 'Scientific'}
              </button>
              <button
                onClick={() => setShowExplanationDeck(false)}
                className="text-slate-400 hover:text-slate-200 p-0.5"
                title="Hide Explainer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {explanationMode === 'simple' ? (
            <div className="space-y-1.5 text-[11px] text-slate-300 leading-relaxed font-sans">
              {viewMode === 'difference' ? (
                <>
                  <p>
                    <strong className="text-amber-300">خريطة الفروق (Difference Map):</strong> نطرح اللقطة الأولى من الثانية.
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    • <span className="text-emerald-300 font-bold">بقعة ساطعة/بيضاء:</span> النجم ازداد بريقه.<br />
                    • <span className="text-rose-300 font-bold">بقعة داكنة/سوداء:</span> النجم خفت بريقه.<br />
                    • <span className="text-slate-400 font-bold">رمادي محايد:</span> سماء هادئة لم تتغير.
                  </p>
                </>
              ) : viewMode === 'significance' ? (
                <p>
                  <strong className="text-amber-300">مقياس قوة الإشارة (Significance):</strong> يوضح الفارق مقسومًا على ضوضاء الكاشف. أي قيمة فوق <strong className="text-emerald-300">4σ</strong> تعتبر انحرافًا إحصائيًا يستحق التحقيق.
                </p>
              ) : (
                <p>
                  <strong className="text-sky-300">صورة الأشعة تحت الحمراء الأصلية:</strong> مسجلة بواسطة تلسكوب SPHEREx بطول موجي 0.93 ميكرومتر.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1 text-[10px] text-slate-300">
              <div className="flex justify-between"><span className="text-slate-500">BUNIT:</span> <span className="text-slate-200">MJy/sr</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Pixel Scale:</span> <span className="text-slate-200">~6.15"/px</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Noise (MAD σ):</span> <span className="text-amber-300">{currentResult.difference.stats.noiseSigma.toFixed(3)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Time Baseline:</span> <span className="text-slate-200">{currentResult.compatibility.timeBaselineDays.toFixed(1)} days</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Registration:</span> <span className="text-emerald-300">Rigid Translation (WCS)</span></div>
            </div>
          )}
        </div>
      )}

      {/* Button to restore explainer deck if hidden */}
      {!showExplanationDeck && (
        <button
          onClick={() => setShowExplanationDeck(true)}
          className="absolute top-20 sm:top-16 left-2 sm:left-4 z-20 pointer-events-auto hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-[#030712]/80 backdrop-blur-xl text-[10px] font-mono text-slate-400 hover:text-amber-300 shadow-md transition-colors"
        >
          <Info className="h-3 w-3 text-amber-400" />
          <span>{language === 'ar' ? 'دليل الخريطة' : 'Map Guide'}</span>
        </button>
      )}

      {/* =========================================================================
          4. CANDIDATE EXPLORER DRAWER (FILTERABLE & PAGINATED)
          ========================================================================= */}
      {showCandidateDrawer && (
        <div className="absolute top-20 sm:top-16 left-2 sm:left-4 z-40 pointer-events-auto w-[calc(100vw-16px)] sm:w-96 max-h-[82vh] overflow-hidden flex flex-col rounded-3xl border border-white/15 bg-[#030712]/95 backdrop-blur-2xl shadow-[0_16px_50px_rgba(0,0,0,0.85)] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-amber-400" />
              <div>
                <h4 className="font-['Outfit'] text-xs font-bold text-slate-100">
                  {language === 'ar' ? 'المرشحات الفلكية المرصودة' : 'Candidate Detections (Statistical Excursions)'}
                </h4>
                <p className="text-[10px] font-mono text-slate-400">
                  {filteredCandidates.length} of {currentResult.candidates.length} sources · Page {candidatePage} of {totalCandidatePages}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCandidateDrawer(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10"
              title="Close Drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Educational "Why these checks matter" toggle */}
          <div className="px-3.5 py-2 bg-black/40 border-b border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Statistical peaks (|S| ≥ 4.0σ)</span>
            <button
              onClick={() => setShowWhyChecksMatter(!showWhyChecksMatter)}
              className="text-amber-300 hover:underline flex items-center gap-1"
            >
              <Info className="h-3 w-3" />
              <span>{showWhyChecksMatter ? 'Hide Info' : 'Why checks matter'}</span>
            </button>
          </div>

          {showWhyChecksMatter && (
            <div className="p-3 bg-amber-500/[0.04] border-b border-amber-500/20 text-[10px] text-slate-300 font-mono space-y-1 leading-relaxed">
              <p><strong className="text-amber-300">1. Significance (≥4σ):</strong> Distinguishes true astrophysical flux excursions from Gaussian instrumental noise.</p>
              <p><strong className="text-amber-300">2. DQ Bitmask:</strong> Disqualifies saturated cores (0x02) and persistence outliers (0x80000).</p>
              <p><strong className="text-amber-300">3. Gaia DR3 Match:</strong> Confirms alignment with cataloged point source within 3.5" cone.</p>
            </div>
          )}

          {/* Filter & Sort Bar */}
          <div className="p-2 border-b border-white/5 bg-black/30 flex items-center justify-between gap-1 text-[10px] font-mono">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scrollbar-none">
              {(['all', 'candidates', 'known', 'artifacts'] as CandidateFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setCandidateFilter(f);
                    setCandidatePage(1);
                  }}
                  className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors ${
                    candidateFilter === f
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'candidates' ? 'Candidates' : f === 'known' ? 'Gaia' : 'Artifacts'}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <select
              value={candidateSort}
              onChange={(e) => setCandidateSort(e.target.value as CandidateSort)}
              className="bg-transparent text-slate-400 border border-white/10 rounded-lg px-1.5 py-0.5 outline-none cursor-pointer"
            >
              <option value="significance" className="bg-slate-900 text-slate-200">Peak S/N</option>
              <option value="aperture" className="bg-slate-900 text-slate-200">Aperture S/N</option>
              <option value="flux" className="bg-slate-900 text-slate-200">|ΔFlux|</option>
            </select>
          </div>

          {/* Candidate List (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
            {paginatedCandidates.length === 0 ? (
              <div className="text-center py-6 text-xs font-mono text-slate-400">
                No detections matching filter criteria.
              </div>
            ) : (
              paginatedCandidates.map((cand) => {
                const isSelected = selectedCandidate?.id === cand.id;
                const isArtifact = cand.artifactScore >= 0.5;
                const hasGaiaMatch = cand.catalogMatches.length > 0;

                return (
                  <div
                    key={cand.id}
                    onClick={() => centerOnCandidate(cand)}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer font-mono text-xs ${
                      isSelected
                        ? 'border-amber-400/50 bg-amber-500/15 shadow-sm'
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-100">{cand.id}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[9px] uppercase font-bold border ${
                            isArtifact
                              ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                              : hasGaiaMatch
                              ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                              : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          }`}
                        >
                          {cand.status}
                        </span>
                      </div>
                      <span className="text-amber-300 font-bold text-xs">
                        {cand.peakSignificance >= 0 ? '+' : ''}{cand.peakSignificance.toFixed(1)}σ
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 mb-1">
                      <div>Aperture: <span className="text-slate-200">{cand.apertureSignificance ? `${cand.apertureSignificance.toFixed(1)}σ` : '--'}</span></div>
                      <div>ΔF: <span className="text-slate-200">{cand.deltaFlux >= 0 ? '+' : ''}{cand.deltaFlux.toFixed(2)} MJy/sr</span></div>
                    </div>

                    <div className="text-[10px] text-slate-500 truncate">
                      ICRS: {cand.ra.toFixed(4)}°, {cand.dec.toFixed(4)}°
                    </div>

                    {/* Scientific details if selected */}
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-slate-300 leading-relaxed space-y-1">
                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                          <span>Artifact Check Penalty:</span>
                          <span className={isArtifact ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {cand.artifactScore.toFixed(2)} / 1.00
                          </span>
                        </div>
                        {isArtifact ? (
                          <div className="text-amber-300">⚠️ {cand.whyFlagged || 'Flagged by detector bitmask or dipole filter.'}</div>
                        ) : hasGaiaMatch ? (
                          <div className="text-cyan-300">
                            ⭐ Gaia DR3: {cand.catalogMatches[0].identifier} ({cand.catalogMatches[0].separationArcsec}" sep)
                            <span className="block text-[9px] text-slate-400 mt-0.5">Known catalog point source in field.</span>
                          </div>
                        ) : (
                          <div className="text-emerald-300">
                            🌌 Uncataloged candidate anomaly (|S| ≥ 4σ) with clean quality bitmask.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalCandidatePages > 1 && (
            <div className="p-2 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs font-mono">
              <button
                onClick={() => setCandidatePage((p) => Math.max(1, p - 1))}
                disabled={candidatePage === 1}
                className="px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 flex items-center gap-1"
              >
                <ChevronLeft className="h-3 w-3" />
                <span>Prev</span>
              </button>
              <span className="text-[10px] text-slate-400">
                {candidatePage} / {totalCandidatePages}
              </span>
              <button
                onClick={() => setCandidatePage((p) => Math.min(totalCandidatePages, p + 1))}
                disabled={candidatePage === totalCandidatePages}
                className="px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          5. FLOATING BOTTOM GLASS CONTROL DOCK
          ========================================================================= */}
      <div className="absolute bottom-3 sm:bottom-4 inset-x-2 sm:inset-x-4 pointer-events-none z-30 flex items-center justify-between">
        {/* Desktop Left: Live Cursor Inspector Pill */}
        <div className="pointer-events-auto hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-[#030712]/80 backdrop-blur-2xl text-[11px] font-mono text-slate-300 shadow-lg">
          <Crosshair className="h-3.5 w-3.5 text-amber-400" />
          {cursorPos ? (
            <div className="flex items-center gap-2">
              <span>[{cursorPos.x}, {cursorPos.y}]</span>
              <span className="text-slate-600">·</span>
              <span className="text-amber-300 font-semibold">{cursorPos.ra?.toFixed(4)}°, {cursorPos.dec?.toFixed(4)}°</span>
              <span className="text-slate-600">·</span>
              <span className="text-sky-300">{cursorPos.val != null ? cursorPos.val.toFixed(3) : '--'} MJy/sr</span>
            </div>
          ) : (
            <span className="text-slate-500">Hover canvas to inspect celestial coordinates</span>
          )}
        </div>

        {/* Center: Image Controls (Desktop: full dock; Mobile: compact dock + drawer button) */}
        <div className="pointer-events-auto flex items-center p-1 rounded-full border border-white/10 bg-[#030712]/90 backdrop-blur-2xl shadow-xl gap-1 font-mono text-xs mx-auto md:mx-auto">
          {/* Zoom Out */}
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.25))}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] text-slate-400 px-1">{zoom.toFixed(1)}x</span>
          {/* Zoom In */}
          <button
            onClick={() => setZoom((z) => Math.min(6.0, z + 0.25))}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          {/* Reset View */}
          <button
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setZoom(1.15);
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
            title="Reset Pan/Zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <span className="hidden md:inline-block h-3.5 w-[1px] bg-white/10 mx-0.5" />

          {/* Science vs Presentation Toggle (Desktop) */}
          <button
            onClick={() => setDisplayMode(displayMode === 'science' ? 'presentation' : 'science')}
            className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-colors ${
              displayMode === 'science'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-semibold'
                : 'bg-white/10 text-slate-300'
            }`}
            title={displayMode === 'science' ? 'Science Mode: Native 6.15"/px detector sampling' : 'Presentation Mode: Smoothed Visualization'}
          >
            <Binary className="h-3 w-3" />
            <span>{displayMode === 'science' ? 'Science (Native)' : 'Smooth'}</span>
          </button>

          {/* Grid Toggle (Desktop, Science Mode only) */}
          {displayMode === 'science' && (
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-colors ${
                showGrid
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 font-semibold'
                  : 'bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle native SPHEREx 64x64 detector pixel grid"
            >
              <Grid className="h-3 w-3" />
              <span>Grid</span>
            </button>
          )}

          {/* Stretch Select (Desktop) */}
          <select
            value={stretch}
            onChange={(e) => setStretch(e.target.value as StretchMode)}
            className="hidden md:block px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] border border-white/10 outline-none cursor-pointer"
          >
            <option value="asinh" className="bg-slate-900">asinh</option>
            <option value="sqrt" className="bg-slate-900">sqrt</option>
            <option value="log" className="bg-slate-900">log</option>
            <option value="linear" className="bg-slate-900">linear</option>
          </select>

          {/* Colormap Select (Desktop) */}
          <select
            value={colormap}
            onChange={(e) => setColormap(e.target.value as ColormapMode)}
            className="hidden md:block px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] border border-white/10 outline-none cursor-pointer"
          >
            <option value="diff_diverging" className="bg-slate-900">Diff Diverging</option>
            <option value="grayscale" className="bg-slate-900">Grayscale</option>
            <option value="infrared_warm" className="bg-slate-900">Infrared Warm</option>
            <option value="inferno" className="bg-slate-900">Inferno</option>
            <option value="viridis" className="bg-slate-900">Viridis</option>
          </select>

          {/* Mobile Secondary Controls Button (Sliding Bottom Sheet) */}
          <button
            onClick={() => setIsMobileControlsOpen(true)}
            className="md:hidden flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/15 text-amber-300 border border-white/15 text-[11px] transition-all ml-1"
          >
            <Sliders className="h-3.5 w-3.5 text-amber-400" />
            <span>Controls</span>
          </button>
        </div>

        {/* Right Spacer for SPEX Button on Desktop */}
        <div className="hidden md:block w-10 h-10" />
      </div>

      {/* =========================================================================
          6. MOBILE COLLAPSIBLE CONTROLS BOTTOM SHEET
          ========================================================================= */}
      {isMobileControlsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-150">
          <div className="w-full rounded-t-3xl border-t border-white/20 bg-[#030712]/95 backdrop-blur-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto font-mono text-xs text-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-amber-400" />
                <h4 className="font-['Outfit'] text-sm font-bold text-slate-100">
                  Image & Telemetry Controls
                </h4>
              </div>
              <button
                onClick={() => setIsMobileControlsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Target Field Info */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 mb-4 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Target:</span>
                <span className="text-amber-300 font-bold">{currentResult.targetCoords.ra.toFixed(4)}°, {currentResult.targetCoords.dec.toFixed(4)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Classification:</span>
                <span className="text-slate-200 font-semibold">{currentResult.evidence.classification}</span>
              </div>
            </div>

            {/* Display Sampling Toggle */}
            <div className="mb-4">
              <label className="block text-slate-400 mb-1.5 text-[11px]">Display Sampling:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDisplayMode('science')}
                  className={`py-2 px-3 rounded-xl border text-center transition-colors ${
                    displayMode === 'science'
                      ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200 font-bold'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                >
                  Science (Native)
                </button>
                <button
                  onClick={() => setDisplayMode('presentation')}
                  className={`py-2 px-3 rounded-xl border text-center transition-colors ${
                    displayMode === 'presentation'
                      ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200 font-bold'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                >
                  Presentation (Smooth)
                </button>
              </div>

              {displayMode === 'science' && (
                <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[11px] text-slate-400">Detector 64x64 Pixel Grid:</span>
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`px-3 py-1 rounded-lg border text-[10px] font-bold transition-colors ${
                      showGrid
                        ? 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    {showGrid ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              )}
            </div>

            {/* Stretch Selection */}
            <div className="mb-4">
              <label className="block text-slate-400 mb-1.5 text-[11px]">Astronomical Stretch:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['asinh', 'sqrt', 'log', 'linear'] as StretchMode[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStretch(s)}
                    className={`py-2 rounded-xl border text-center transition-colors ${
                      stretch === s
                        ? 'border-amber-400/50 bg-amber-500/20 text-amber-200 font-bold'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Colormap Selection */}
            <div className="mb-5">
              <label className="block text-slate-400 mb-1.5 text-[11px]">Palette / Colormap:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'diff_diverging', label: 'Diff Diverging' },
                    { id: 'grayscale', label: 'Grayscale' },
                    { id: 'infrared_warm', label: 'Infrared Warm' },
                    { id: 'inferno', label: 'Inferno' },
                    { id: 'viridis', label: 'Viridis' },
                  ] as Array<{ id: ColormapMode; label: string }>
                ).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setColormap(c.id)}
                    className={`py-2 px-2.5 rounded-xl border text-left truncate transition-colors ${
                      colormap === c.id
                        ? 'border-amber-400/50 bg-amber-500/20 text-amber-200 font-bold'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reticle Markers Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 mb-4">
              <span className="text-slate-300">Show Candidate Reticles</span>
              <button
                onClick={() => setShowMarkers(!showMarkers)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  showMarkers ? 'bg-amber-500' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    showMarkers ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Done Button */}
            <button
              onClick={() => setIsMobileControlsOpen(false)}
              className="w-full py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. SPEX AI POPUP COMPANION
          ========================================================================= */}
      <SpexPopup
        currentResult={currentResult}
        selectedCandidate={selectedCandidate}
        language={language}
      />

      {/* Provenance Audit Modal */}
      {showProvenance && currentResult?.provenance && (
        <ProvenanceModal
          provenance={currentResult.provenance}
          compatibility={currentResult.compatibility}
          evidence={currentResult.evidence}
          onClose={() => setShowProvenance(false)}
          language={language}
        />
      )}

      {/* =========================================================================
          8. SEARCH SKY / EXPLORE MORE DIALOG
          ========================================================================= */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#030712]/95 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-amber-400" />
                <h3 className="font-['Outfit'] text-sm sm:text-base font-bold text-slate-100">
                  {language === 'ar' ? 'استكشاف سماء جديدة ومسح أرشيف SPHEREx' : 'Explore More / Search SPHEREx Sky'}
                </h3>
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex rounded-xl bg-white/5 p-1 mb-4 border border-white/10 text-xs font-mono">
              <button
                onClick={() => setSearchModeTab('direct')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                  searchModeTab === 'direct'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Direct Difference Cutout
              </button>
              <button
                onClick={() => setSearchModeTab('tap')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                  searchModeTab === 'tap'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Query TAP Catalog
              </button>
            </div>

            {/* Presets Strip */}
            <div className="mb-4">
              <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1.5">
                North Ecliptic Pole Deep Survey Presets:
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setCustomRa('276.2614');
                    setCustomDec('64.8258');
                  }}
                  className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-left text-slate-300 hover:text-amber-300 transition-colors"
                >
                  <div className="font-semibold text-slate-100">NEP Deep Field 1</div>
                  <div className="text-[9px] text-slate-500">276.2614°, +64.8258°</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomRa('275.9265');
                    setCustomDec('64.9585');
                  }}
                  className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-left text-slate-300 hover:text-amber-300 transition-colors"
                >
                  <div className="font-semibold text-slate-100">Photometric Standard</div>
                  <div className="text-[9px] text-slate-500">275.9265°, +64.9585°</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomRa('276.1391');
                    setCustomDec('64.8361');
                  }}
                  className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-left text-slate-300 hover:text-amber-300 transition-colors"
                >
                  <div className="font-semibold text-slate-100">Persistence / DQ Test</div>
                  <div className="text-[9px] text-slate-500">276.1391°, +64.8361°</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomRa('275.8500');
                    setCustomDec('65.1000');
                  }}
                  className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-left text-slate-300 hover:text-amber-300 transition-colors"
                >
                  <div className="font-semibold text-slate-100">NEP Wide Polar Core</div>
                  <div className="text-[9px] text-slate-500">275.8500°, +65.1000°</div>
                </button>
              </div>
            </div>

            {/* Coordinate Inputs */}
            <div className="grid grid-cols-2 gap-3 mb-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Right Ascension (RA, 0-360°):</label>
                <input
                  type="text"
                  value={customRa}
                  onChange={(e) => setCustomRa(e.target.value)}
                  placeholder="276.2614"
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-100 outline-none focus:border-amber-400/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Declination (Dec, ±90°):</label>
                <input
                  type="text"
                  value={customDec}
                  onChange={(e) => setCustomDec(e.target.value)}
                  placeholder="64.8258"
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-100 outline-none focus:border-amber-400/50"
                />
              </div>
            </div>

            {searchModeTab === 'tap' && (
              <div className="mb-3 font-mono text-xs">
                <label className="block text-slate-400 mb-1 font-semibold">Search Radius (deg):</label>
                <input
                  type="text"
                  value={customRadius}
                  onChange={(e) => setCustomRadius(e.target.value)}
                  placeholder="0.5"
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-100 outline-none focus:border-amber-400/50"
                />
              </div>
            )}

            {/* Coverage Advisory Note */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 font-mono mb-4 leading-relaxed">
              <span>Coverage note: Real SPHEREx QR2 public FITS data release is centered on the North Ecliptic Pole deep survey footprint (RA ~275.5°–276.8°, Dec ~64.5°–65.2°).</span>
            </div>

            {/* Tab: Direct Difference Cutout */}
            {searchModeTab === 'direct' && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="px-4 py-2 min-h-[40px] rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ra = parseFloat(customRa);
                    const dec = parseFloat(customDec);
                    if (!Number.isNaN(ra) && !Number.isNaN(dec)) {
                      onSearchTarget(ra, dec);
                      setIsSearchOpen(false);
                    }
                  }}
                  className="px-4 py-2 min-h-[40px] rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs font-mono shadow-md transition-all active:scale-95"
                >
                  Process Multi-Epoch Field
                </button>
              </div>
            )}

            {/* Tab: TAP Catalog Search */}
            {searchModeTab === 'tap' && (
              <div className="space-y-3 font-mono text-xs">
                <button
                  type="button"
                  onClick={executeTapQuery}
                  disabled={isQueryingTap}
                  className="w-full py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
                >
                  {isQueryingTap ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
                      <span>Querying NASA/IPAC IRSA TAP Archive...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="h-4 w-4 text-sky-400" />
                      <span>Execute IRSA TAP Catalog Query</span>
                    </>
                  )}
                </button>

                {tapError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                    ⚠️ {tapError}
                  </div>
                )}

                {tapQueryExecuted && !isQueryingTap && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-white/10 pb-1">
                      <span>Found {tapObservations.length} Observation Products</span>
                      <span>Source: spherex.obscore</span>
                    </div>

                    {tapObservations.length === 0 ? (
                      <div className="text-center py-4 text-slate-500 text-[11px]">
                        No archive products found for these coordinates. Try an NEP survey preset.
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
                        {tapObservations.map((obs, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2 text-[10px]"
                          >
                            <div>
                              <div className="font-bold text-slate-200">{obs.obs_id}</div>
                              <div className="text-slate-400">
                                λ {obs.wavelength_um}µm · RA {obs.s_ra.toFixed(3)}°, Dec {obs.s_dec.toFixed(3)}°
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onSearchTarget(obs.s_ra, obs.s_dec);
                                setIsSearchOpen(false);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-400/30 transition-colors"
                            >
                              Investigate
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
