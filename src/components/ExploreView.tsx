import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Share2,
  Clock,
  Layers,
  Eye,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  ArrowLeft,
  Sliders,
  CheckCircle2,
  Microscope,
  Info,
  Maximize2,
  Minimize2,
  HelpCircle,
  GripVertical,
  Activity,
  Compass,
} from 'lucide-react';
import {
  CandidateDetection,
  InvestigationResult,
  SPHERExObservation,
  ChallengeTarget,
} from '../science/types';
import { AstronomyRenderer, ColormapMode, DisplayMode, StretchMode } from '../utils/astronomyRender';
import { WCS } from '../science/wcs';
import { SPHEREX_102_CHANNELS, SPHEREX_DETECTOR_ARRAYS } from '../science/spectralBands';
import { Badge } from '../design/components/Badge';
import { Button } from '../design/components/Button';
import { IconButton } from '../design/components/IconButton';
import { GlassPanel } from '../design/components/GlassPanel';
import { LensButton, LensMode } from '../design/components/LensButton';
import { CurtainDivider } from './TimeLens/CurtainDivider';
import { DiscoveryCard } from './TimeLens/DiscoveryCard';
import { PostcardModal } from './TimeLens/PostcardModal';
import { Language, translations } from '../utils/translations';
import { SPEX_HERO_IMAGE } from '../spex/spexAssets';

export interface ExploreViewProps {
  currentResult: InvestigationResult | null;
  isLoading: boolean;
  onSearchTarget: (ra: number, dec: number, sizePix?: number) => void;
  onSelectCase: (caseId: string, options?: { sizePix?: number; epochPair?: string }) => void;
  cases: Array<{ id: string; title: string; category?: string; ra: number; dec: number }>;
  language: Language;
  fallbackQuery?: { ra: number; dec: number } | null;
  onClearFallback?: () => void;
  onBackToSky?: () => void;
  onToggleScientistMode?: () => void;
  selectedTarget?: ChallengeTarget | null;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  currentResult,
  isLoading,
  onSearchTarget,
  onSelectCase,
  cases,
  language,
  fallbackQuery,
  onClearFallback,
  onBackToSky,
  onToggleScientistMode,
  selectedTarget,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  // --- View & Mode State ---
  const [activeLens, setActiveLens] = useState<LensMode | null>('time');
  const [isCurtainMode, setIsCurtainMode] = useState<boolean>(false);
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0); // 0: Epoch 1, 1: Epoch 2, 2: Difference
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5, 1, 2
  const [hasPlayedOnce, setHasPlayedOnce] = useState<boolean>(false);
  const [showMoreTools, setShowMoreTools] = useState<boolean>(false);

  // Hidden Colors: Active Spectral Band
  const [activeBandIdx, setActiveBandIdx] = useState<number>(0);

  // Canvas Geometry & Controls
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Tapped Spot & Candidate
  const [tappedSpot, setTappedSpot] = useState<{ x: number; y: number; ra: number; dec: number } | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetection | null>(null);
  const [quietSpotMessage, setQuietSpotMessage] = useState<string | null>(null);

  // Modals
  const [showPostcard, setShowPostcard] = useState<boolean>(false);

  // Guided Coach Marks (3 steps: 1 = play, 2 = tap mover, 3 = ask spex)
  const [coachStep, setCoachStep] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    const seen = localStorage.getItem('spex_coach_seen_v2');
    return seen ? 0 : 1;
  });

  const advanceCoach = (skip = false) => {
    if (skip || coachStep >= 3) {
      setCoachStep(0);
      localStorage.setItem('spex_coach_seen_v2', 'true');
    } else {
      setCoachStep((prev) => prev + 1);
    }
  };

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const epoch1CanvasRef = useRef<HTMLCanvasElement | null>(null);
  const epoch2CanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Available observations
  const obs1 = currentResult?.epoch1;
  const obs2 = currentResult?.epoch2;
  const diffObs = currentResult?.difference;

  // Frame count: 3 frames (Epoch 1, Epoch 2, Difference)
  const totalFrames = 3;

  // Auto-play interval
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }

    setHasPlayedOnce(true);
    const intervalMs = Math.round(900 / playbackSpeed);
    playTimerRef.current = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % totalFrames);
    }, intervalMs);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, totalFrames]);

  // Sync offscreen canvases for CurtainDivider
  useEffect(() => {
    if (!obs1 || !obs2) return;

    if (!epoch1CanvasRef.current) {
      epoch1CanvasRef.current = document.createElement('canvas');
    }
    if (!epoch2CanvasRef.current) {
      epoch2CanvasRef.current = document.createElement('canvas');
    }

    AstronomyRenderer.renderToCanvas(
      epoch1CanvasRef.current,
      obs1.flux,
      obs1.width,
      obs1.height,
      {
        stretch: 'asinh',
        colormap: 'diff_diverging',
        displayMode: 'presentation',
        renderSize: 512,
        asinhBeta: 0.1,
      }
    );

    AstronomyRenderer.renderToCanvas(
      epoch2CanvasRef.current,
      obs2.flux,
      obs2.width,
      obs2.height,
      {
        stretch: 'asinh',
        colormap: 'diff_diverging',
        displayMode: 'presentation',
        renderSize: 512,
        asinhBeta: 0.1,
      }
    );
  }, [obs1, obs2]);

  // Main canvas render pass
  const renderSkyFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentResult) return;

    let targetData: number[] | Float32Array | null = null;
    let width = 64;
    let height = 64;
    let isSignedDiff = false;

    if (currentFrameIdx === 0 && obs1) {
      targetData = obs1.flux;
      width = obs1.width;
      height = obs1.height;
    } else if (currentFrameIdx === 1 && obs2) {
      targetData = obs2.flux;
      width = obs2.width;
      height = obs2.height;
    } else if (diffObs) {
      targetData = diffObs.diff;
      width = diffObs.width;
      height = diffObs.height;
      isSignedDiff = true;
    }

    if (!targetData) return;

    // Colormap selection based on active lens
    let colormap: ColormapMode = isSignedDiff ? 'diff_diverging' : 'infrared_warm';
    if (activeLens === 'colors') {
      colormap = activeBandIdx % 2 === 0 ? 'inferno' : 'viridis';
    } else if (activeLens === 'doubt') {
      colormap = 'grayscale';
    }

    AstronomyRenderer.renderToCanvas(canvas, targetData, width, height, {
      stretch: 'asinh',
      colormap,
      displayMode: 'presentation',
      isDifference: isSignedDiff,
      renderSize: 640,
      asinhBeta: isSignedDiff ? 0.05 : 0.1,
    });

    // Layer 2: Draw Lens Overlays & Markers on top of astronomical image
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displaySize = canvas.width;
    const scaleX = displaySize / width;
    const scaleY = displaySize / height;

    // Overlay 1: DOUBT LENS (Highlight detector glitches & artifact pixels in Rose #FF637E)
    const dq = obs1?.flags || obs2?.flags;
    if (activeLens === 'doubt' && dq) {
      ctx.save();
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const flag = dq[y * width + x] || 0;
          if (flag > 0) {
            const px = x * scaleX;
            const py = y * scaleY;
            ctx.fillStyle = 'rgba(255, 99, 126, 0.35)';
            ctx.fillRect(px, py, scaleX, scaleY);
            ctx.strokeStyle = '#FF637E';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, scaleX, scaleY);
          }
        }
      }
      ctx.restore();
    }

    // Overlay 2: NEIGHBORS LENS (Gaia DR3 & AllWISE catalog star markers in Cyan #00D3F3)
    if (activeLens === 'neighbors' && currentResult.candidates) {
      ctx.save();
      for (const cand of currentResult.candidates) {
        if (cand.catalogMatches && cand.catalogMatches.length > 0) {
          const cx = cand.x * scaleX;
          const cy = cand.y * scaleY;

          // Reticle ring
          ctx.strokeStyle = '#00D3F3';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 14, 0, Math.PI * 2);
          ctx.stroke();

          // Label
          ctx.fillStyle = '#00D3F3';
          ctx.font = '10px monospace';
          const match = cand.catalogMatches[0];
          ctx.fillText(`${match.catalog} (${match.separationArcsec.toFixed(1)}″)`, cx + 18, cy + 3);
        }
      }
      ctx.restore();
    }

    // Overlay 3: Selected candidate or tapped spot ring
    if (tappedSpot) {
      const sx = (tappedSpot.x / width) * displaySize;
      const sy = (tappedSpot.y / height) * displaySize;

      ctx.save();
      // Amber highlight reticle
      ctx.strokeStyle = '#FFB900';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 20, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair tick marks
      ctx.beginPath();
      ctx.moveTo(sx - 26, sy);
      ctx.lineTo(sx - 12, sy);
      ctx.moveTo(sx + 12, sy);
      ctx.lineTo(sx + 26, sy);
      ctx.moveTo(sx, sy - 26);
      ctx.lineTo(sx, sy - 12);
      ctx.moveTo(sx, sy + 12);
      ctx.lineTo(sx, sy + 26);
      ctx.stroke();
      ctx.restore();
    }
  }, [currentResult, currentFrameIdx, activeLens, activeBandIdx, tappedSpot, obs1, obs2, diffObs]);

  useEffect(() => {
    renderSkyFrame();
  }, [renderSkyFrame]);

  // Handle Canvas Tap / Spot Selection
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentResult) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const normX = Math.max(0, Math.min(1, clickX / rect.width));
    const normY = Math.max(0, Math.min(1, clickY / rect.height));

    const imgWidth = obs1?.width || 64;
    const imgHeight = obs1?.height || 64;
    const pixX = normX * imgWidth;
    const pixY = normY * imgHeight;

    // Convert pixel to celestial RA/Dec using WCS if available
    let ra = currentResult.targetCoords?.ra || 269.452;
    let dec = currentResult.targetCoords?.dec || 4.693;
    if (obs1?.wcs) {
      const sky = WCS.pixToSky(pixX, pixY, obs1.wcs);
      if (sky) {
        ra = sky.ra;
        dec = sky.dec;
      }
    }

    setTappedSpot({ x: pixX, y: pixY, ra, dec });

    // Find nearest candidate within 6 pixels
    const candidates = currentResult.candidates || [];
    let nearest: CandidateDetection | null = null;
    let minDistance = 6.0;

    for (const cand of candidates) {
      const dist = Math.hypot(cand.x - pixX, cand.y - pixY);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = cand;
      }
    }

    if (nearest) {
      setSelectedCandidate(nearest);
      setQuietSpotMessage(null);
    } else {
      setSelectedCandidate(null);
      setQuietSpotMessage(
        isRtl
          ? 'ضوء هادئ من أعماق الفضاء هنا — لم يُرصد تحرك أو وميض في هذا البكسل.'
          : 'Quiet starlight background here — no significant motion or flare recorded at this spot.'
      );
    }

    // Advance coach marks if on step 2
    if (coachStep === 2) {
      advanceCoach();
    }
  };

  // Zoom & Pan Handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(3.0, prev + 0.25));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.75, prev - 0.25));
  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => setIsDragging(false);

  // Target Description Resolution
  const targetInfo = useMemo(() => {
    const defaultName = currentResult?.caseId
      ? cases.find((c) => c.id === currentResult.caseId)?.title || "Barnard's Star (GJ 699)"
      : "Barnard's Star (GJ 699)";

    const title = selectedTarget?.name || defaultName;

    let sentence = t.targetDefaultDesc;
    if (title.includes('Barnard') || currentResult?.caseId === 'case-barnards-star') {
      sentence = t.targetBarnardDesc;
    } else if (title.includes('WISE') || currentResult?.caseId === 'case-wise-0855') {
      sentence = t.targetWiseDesc;
    } else if (title.includes('Indi')) {
      sentence = t.targetEpsIndiDesc;
    } else if (title.includes('RW Aur')) {
      sentence = t.targetRwAurDesc;
    } else if (title.includes('Draconis')) {
      sentence = t.targetRDraconisDesc;
    }

    return { title, sentence };
  }, [selectedTarget, currentResult, cases, t]);

  // Frame title for current view
  const currentFrameLabel = (() => {
    if (currentFrameIdx === 0) {
      return isRtl ? 'الرصدة الأولى (قبل)' : 'Visit 1 (Before)';
    }
    if (currentFrameIdx === 1) {
      return isRtl ? 'الرصدة الثانية (بعد)' : 'Visit 2 (After)';
    }
    return isRtl ? 'صورة الفارق (طرح اللقطتين)' : 'Difference Map (Visit 2 - Visit 1)';
  })();

  // Plain-language cadence text (Authentic intra-visit interval is ~2.1 minutes)
  const cadenceText = isRtl
    ? 'التُقطت هاتان الصورتان بفارق دقيقتين فقط خلال نفس دورة المسح (مسار الحركة مكبر للتوضيح).'
    : 'These pictures were taken 2.1 minutes apart during the same survey pass (motion trail enlarged for illustration).';

  return (
    <div
      className="relative w-full min-h-[calc(100vh-64px)] bg-[#02040A] text-[#F1F5F9] flex flex-col justify-between overflow-hidden select-none"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* =========================================================================
          TOP SLIM BAR: Back to Sky · Target Name & Sentence · Authenticity Badge
         ========================================================================= */}
      <header className="relative z-30 shrink-0 w-full px-3 sm:px-6 py-2.5 bg-[#0C0E14]/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-3">
        {/* Left: Back button & Target identification */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={onBackToSky}
            className="flex items-center justify-center min-w-[48px] min-h-[48px] rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 shrink-0"
            title={t.backToSky}
            aria-label={t.backToSky}
          >
            <ArrowLeft className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-serif text-sm sm:text-base font-bold text-white tracking-wide truncate">
                {targetInfo.title}
              </h2>
              <Badge variant="REAL" size="sm" />
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-sans truncate max-w-md sm:max-w-xl">
              {targetInfo.sentence}
            </p>
          </div>
        </div>

        {/* Right: Coordinates & Actions (Postcard, Scientist Mode) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Coordinate Readout */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 font-mono text-[11px] text-cyan-400">
            <span>RA {currentResult?.targetCoords?.ra?.toFixed(4) ?? '269.4521'}°</span>
            <span className="text-slate-600">·</span>
            <span>
              Dec {currentResult?.targetCoords?.dec != null && currentResult.targetCoords.dec >= 0 ? '+' : ''}
              {currentResult?.targetCoords?.dec?.toFixed(4) ?? '+04.6934'}°
            </span>
          </div>

          {/* Share Discovery Postcard Button */}
          <button
            type="button"
            onClick={() => setShowPostcard(true)}
            className="flex items-center gap-1.5 min-h-[48px] px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-[#FFB900]/40 text-[#FFB900] transition-all cursor-pointer active:scale-95 text-xs font-semibold"
            title={t.btnExportPostcard}
          >
            <Sparkles className="w-4 h-4 text-[#FFB900]" />
            <span className="hidden sm:inline">{t.btnExportPostcard}</span>
          </button>

          {/* Scientist Mode Switch */}
          {onToggleScientistMode && (
            <button
              type="button"
              onClick={onToggleScientistMode}
              className="flex items-center gap-1.5 min-h-[48px] px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 text-xs font-mono"
              title={t.scientistModeToggle}
            >
              <Microscope className="w-4 h-4 text-cyan-400" />
              <span className="hidden md:inline">{t.scientistModeToggle}</span>
            </button>
          )}
        </div>
      </header>

      {/* =========================================================================
          CENTER SKY VIEWPORT: Astronomical Canvas (>= 70% Viewport Height)
         ========================================================================= */}
      <main
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative flex-1 w-full min-h-[60vh] lg:min-h-[70vh] bg-black flex items-center justify-center overflow-hidden cursor-crosshair touch-none"
      >
        {/* Background Faint Detector Grid */}
        <div className="absolute inset-0 detector-grid opacity-25 pointer-events-none" />

        {/* Viewport Corner Crop Marks */}
        <div className="crop-mark-tl pointer-events-none" />
        <div className="crop-mark-tr pointer-events-none" />
        <div className="crop-mark-bl pointer-events-none" />
        <div className="crop-mark-br pointer-events-none" />

        {/* Top-Left Floating HUD: Exposure Info & Active Lens status */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-1.5">
          <div className="bg-[#0C0E14]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 font-mono text-[11px] text-[#00D3F3] flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#00D3F3] animate-pulse" />
            <span>{currentFrameLabel}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-300">6.2″/pix</span>
          </div>

          {activeLens === 'doubt' && (
            <div className="bg-rose-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-rose-500/40 font-mono text-[10px] text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{isRtl ? 'قناع الكواشف: تمييز البكسلات المشبوهة بالوردي' : 'Doubt Lens: Flagged detector artifacts in Rose'}</span>
            </div>
          )}

          {activeLens === 'neighbors' && (
            <div className="bg-cyan-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-cyan-500/40 font-mono text-[10px] text-cyan-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isRtl ? 'كتالوجات غايا DR3 ووايز نشطة' : 'Neighbors Lens: Gaia DR3 & AllWISE markers active'}</span>
            </div>
          )}

          {activeLens === 'colors' && (
            <div className="bg-amber-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-amber-500/40 font-mono text-[10px] text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isRtl ? 'نطاق تحت أحمر:' : 'Infrared Band:'} {SPHEREX_DETECTOR_ARRAYS[activeBandIdx]?.name || 'D1 (0.75-1.11 µm)'}
              </span>
            </div>
          )}
        </div>

        {/* Floating Zoom & Reset Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-[#0C0E14]/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-xl">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer font-mono text-[10px]"
            title="Reset View"
            aria-label="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Main Interactive Stage: Single Canvas OR Draggable Curtain Mode */}
        <div
          className="relative transition-transform duration-75 flex items-center justify-center max-w-full max-h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {isCurtainMode ? (
            <div className="w-[85vw] max-w-[560px] aspect-square">
              <CurtainDivider
                epoch1Canvas={epoch1CanvasRef.current}
                epoch2Canvas={epoch2CanvasRef.current}
                epoch1Label={isRtl ? 'الرصدة 1 (قبل)' : 'Visit 1 (Before)'}
                epoch2Label={isRtl ? 'الرصدة 2 (بعد)' : 'Visit 2 (After)'}
                width={560}
                height={560}
              />
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="w-[85vw] max-w-[560px] aspect-square object-contain rounded-2xl shadow-2xl border border-white/15 image-rendering-pixelated cursor-crosshair bg-black"
            />
          )}
        </div>

        {/* Guided Coach Marks (Step 1, 2, 3) */}
        {coachStep > 0 && (
          <div className="absolute inset-x-4 bottom-28 z-40 flex justify-center pointer-events-none">
            <div className="pointer-events-auto bg-[#0C0E14]/95 backdrop-blur-xl border border-amber-500/50 p-4 rounded-2xl max-w-md w-full shadow-[0_0_30px_rgba(255,185,0,0.25)] flex items-start gap-3.5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-300">
                <Compass className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] text-amber-400 uppercase tracking-wider font-semibold">
                    STEP {coachStep} OF 3
                  </span>
                  <button
                    type="button"
                    onClick={() => advanceCoach(true)}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    {t.coachSkip}
                  </button>
                </div>

                <p className="text-sm font-sans font-medium text-white mb-3">
                  {coachStep === 1 && t.coachStep1}
                  {coachStep === 2 && t.coachStep2}
                  {coachStep === 3 && t.coachStep3}
                </p>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => advanceCoach()}
                    className="min-h-[40px] px-4 rounded-xl bg-[#FFB900] hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    {coachStep === 3 ? t.coachSkip : t.coachNext}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SPEX Slide-up Discovery Card (Triggered on Tap) */}
        {selectedCandidate && (
          <div className="absolute inset-x-4 bottom-4 z-40 flex justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-6 duration-300">
            <div className="pointer-events-auto w-full max-w-md relative">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="absolute -top-3 -right-3 z-50 w-8 h-8 rounded-full bg-slate-900 border border-white/20 text-white flex items-center justify-center hover:bg-slate-800 transition shadow-lg cursor-pointer"
                title="Dismiss Card"
                aria-label="Dismiss Card"
              >
                <X className="w-4 h-4" />
              </button>

              <DiscoveryCard
                candidate={selectedCandidate}
                viewMode="explorer"
                language={language}
                onClose={() => setSelectedCandidate(null)}
              />
            </div>
          </div>
        )}

        {/* Quiet Background Starlight Card (If tapped an unflagged pixel) */}
        {!selectedCandidate && quietSpotMessage && (
          <div className="absolute inset-x-4 bottom-4 z-40 flex justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="pointer-events-auto bg-[#0C0E14]/90 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl max-w-md w-full flex items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-300">
                  <Eye className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {quietSpotMessage}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuietSpotMessage(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          BOTTOM DOCK: Big Amber Play Button · Time Scrubber · 4 Scientific Lenses
         ========================================================================= */}
      <footer className="relative z-30 shrink-0 w-full bg-[#0C0E14]/90 backdrop-blur-xl border-t border-white/10 px-3 sm:px-6 py-3 flex flex-col gap-3">
        {/* Core Timeline Bar: Play Button + Scrubber + Curtain Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Left: ONE Big Amber Play Button (min 48px touch target) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsPlaying(!isPlaying);
                setHasPlayedOnce(true);
                if (coachStep === 1) advanceCoach();
              }}
              className="min-w-[48px] min-h-[48px] px-5 rounded-2xl bg-[#FFB900] hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-[0_0_20px_rgba(255,185,0,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
              title={isPlaying ? t.framePlayerPause : t.framePlayerPlay}
              aria-label={isPlaying ? t.framePlayerPause : t.framePlayerPlay}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              <span className="text-sm font-sans tracking-wide">
                {isPlaying ? t.framePlayerPause : t.framePlayerPlay}
              </span>
            </button>

            {/* Stepper buttons */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setCurrentFrameIdx((prev) => (prev - 1 + totalFrames) % totalFrames)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                title="Previous Frame"
                aria-label="Previous Frame"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentFrameIdx((prev) => (prev + 1) % totalFrames)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                title="Next Frame"
                aria-label="Next Frame"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center: Observation Scrubber Slider */}
          <div className="flex-1 flex flex-col gap-1 px-1 sm:px-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="text-[#00D3F3] font-semibold">{currentFrameLabel}</span>
              <span>
                {currentFrameIdx + 1} / {totalFrames}
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={totalFrames - 1}
              value={currentFrameIdx}
              onChange={(e) => setCurrentFrameIdx(parseInt(e.target.value, 10))}
              className="w-full accent-[#FFB900] cursor-pointer h-2 bg-slate-800 rounded-lg"
              aria-label="Observation timeline scrubber"
            />
          </div>

          {/* Right: Curtain Comparison Mode Switch & More Tools Toggle */}
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsCurtainMode(!isCurtainMode)}
              className={`min-h-[48px] px-3.5 rounded-xl border font-mono text-xs transition cursor-pointer flex items-center gap-2 ${
                isCurtainMode
                  ? 'bg-amber-500/20 text-[#FFB900] border-[#FFB900]'
                  : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]'
              }`}
              title={isCurtainMode ? t.singleFrameMode : t.curtainMode}
            >
              <GripVertical className="w-4 h-4" />
              <span>{isCurtainMode ? t.singleFrameMode : t.curtainMode}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMoreTools(!showMoreTools)}
              className="min-h-[48px] px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">{t.moreTools}</span>
              {showMoreTools ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Honest Cadence Explanation Line */}
        <div className="px-1 text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">{cadenceText}</span>
        </div>

        {/* The 4 Scientific Lenses Dock (Always accessible or expanded via More Tools) */}
        <div
          className={`grid grid-cols-2 lg:grid-cols-4 gap-2 pt-1 transition-all ${
            showMoreTools ? 'block' : 'hidden sm:grid'
          }`}
        >
          {/* LENS 1: TIME */}
          <LensButton
            id="time"
            label={t.lensTime}
            sublabel={t.lensTimeSub}
            icon={<Clock className="w-4 h-4 text-[#FFB900]" />}
            isActive={activeLens === 'time'}
            onClick={() => setActiveLens(activeLens === 'time' ? null : 'time')}
            color="amber"
          />

          {/* LENS 2: HIDDEN COLORS */}
          <LensButton
            id="colors"
            label={t.lensColors}
            sublabel={t.lensColorsSub}
            icon={<Sparkles className="w-4 h-4 text-[#00D3F3]" />}
            isActive={activeLens === 'colors'}
            onClick={() => setActiveLens(activeLens === 'colors' ? null : 'colors')}
            color="cyan"
          />

          {/* LENS 3: DOUBT (Instrument Glitches & Quality Bitmasks) */}
          <LensButton
            id="doubt"
            label={t.lensDoubt}
            sublabel={t.lensDoubtSub}
            icon={<AlertTriangle className="w-4 h-4 text-[#FF637E]" />}
            isActive={activeLens === 'doubt'}
            onClick={() => setActiveLens(activeLens === 'doubt' ? null : 'doubt')}
            color="rose"
          />

          {/* LENS 4: NEIGHBORS (Catalog Overlays) */}
          <LensButton
            id="neighbors"
            label={t.lensNeighbors}
            sublabel={t.lensNeighborsSub}
            icon={<Eye className="w-4 h-4 text-emerald-400" />}
            isActive={activeLens === 'neighbors'}
            onClick={() => setActiveLens(activeLens === 'neighbors' ? null : 'neighbors')}
            color="emerald"
          />
        </div>

        {/* Sub-Panel: Hidden Colors Channel Switcher (When Colors lens is active) */}
        {activeLens === 'colors' && (
          <div className="p-3 rounded-2xl bg-black/60 border border-cyan-500/30 flex flex-col gap-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
              <span>{t.colorsTitle}</span>
              <span className="text-[11px] text-slate-400 font-sans">
                {isRtl
                  ? 'العين البشرية لا ترى تحت الأحمر. نترجم درجات الحرارة إلى ألوان مرئية.'
                  : 'Infrared light translated to visible color: warm dust glows red, stars shine cyan.'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SPHEREX_DETECTOR_ARRAYS.map((band, idx) => (
                <button
                  key={band.detectorNumber}
                  type="button"
                  onClick={() => setActiveBandIdx(idx)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer flex items-center gap-1.5 ${
                    activeBandIdx === idx
                      ? 'bg-[#00D3F3] text-slate-950 font-bold shadow-[0_0_15px_rgba(0,211,243,0.4)]'
                      : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  <span>{band.name}</span>
                  <span className="text-[10px] opacity-75">{band.wavelengthRangeUm[0]}-{band.wavelengthRangeUm[1]}µm</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </footer>

      {/* Postcard Export Modal */}
      {showPostcard && currentResult && (
        <PostcardModal
          isOpen={showPostcard}
          onClose={() => setShowPostcard(false)}
          result={currentResult}
          candidate={selectedCandidate}
          language={language}
        />
      )}
    </div>
  );
};

export default ExploreView;
