import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { AstronomyRenderer, ColormapMode, DisplayMode, StretchMode } from '../../utils/astronomyRender';
import { WCS } from '../../science/wcs';
import { CandidateDetection, WCSParams } from '../../science/types';
import { Language, translations } from '../../utils/translations';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  Layers,
  Crosshair,
  Maximize2,
  Info,
  Sliders,
  GripVertical,
} from 'lucide-react';

export interface AstronomicalSkyViewportProps {
  data: number[] | Float32Array | null;
  width: number;
  height: number;
  isDifference: boolean;
  stretch: StretchMode;
  colormap: ColormapMode;
  displayMode: DisplayMode;
  contrastFactor?: number;
  zoom: number;
  pan: { x: number; y: number };
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  wcs?: WCSParams;
  activeLens: 'time' | 'colors' | 'doubt' | 'neighbors' | null;
  isCurtainActive?: boolean;
  epoch1Data?: number[] | Float32Array | null;
  epoch2Data?: number[] | Float32Array | null;
  epoch1Label?: string;
  epoch2Label?: string;
  dqFlags?: number[] | Int32Array | null;
  selectedFlagPixel?: { x: number; y: number; flag: number } | null;
  onSelectFlagPixel?: (info: { x: number; y: number; flag: number } | null) => void;
  candidates?: CandidateDetection[];
  selectedCandidate?: CandidateDetection | null;
  onSelectCandidate?: (cand: CandidateDetection | null) => void;
  tappedSpot?: { x: number; y: number; ra: number; dec: number } | null;
  onTapSpot?: (spot: { x: number; y: number; ra: number; dec: number } | null) => void;
  language: Language;
  isLoading?: boolean;
  targetName?: string;
  fovArcmin?: number;
  sourceClassification?: 'REAL_SPHEREX_DATA' | 'REFERENCE_DATA' | 'EDUCATIONAL_SIMULATION' | 'DATA_UNAVAILABLE';
  availabilityStatus?: {
    isAvailable: boolean;
    reasonEn: string;
    reasonAr: string;
    scheduledRelease?: string;
    distanceToNEPDeg?: number;
    catalogSource?: string;
    verifiedCoordinates?: { ra: number; dec: number };
  };
  targetCoords?: { ra: number; dec: number };
  onSelectBenchmark?: (caseId: string) => void;
  className?: string;
}

export const AstronomicalSkyViewport: React.FC<AstronomicalSkyViewportProps> = ({
  data,
  width,
  height,
  isDifference,
  stretch,
  colormap,
  displayMode,
  contrastFactor = 1.0,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
  onCanvasReady,
  wcs,
  activeLens,
  isCurtainActive = false,
  epoch1Data,
  epoch2Data,
  epoch1Label = 'Visit 1 (Before)',
  epoch2Label = 'Visit 2 (After)',
  dqFlags,
  selectedFlagPixel,
  onSelectFlagPixel,
  candidates = [],
  selectedCandidate,
  onSelectCandidate,
  tappedSpot,
  onTapSpot,
  language,
  isLoading = false,
  targetName,
  fovArcmin = 6.6,
  sourceClassification,
  availabilityStatus,
  targetCoords,
  onSelectBenchmark,
  className = '',
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];

  const isUnavailable = sourceClassification === 'DATA_UNAVAILABLE' || (availabilityStatus && !availabilityStatus.isAvailable);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Responsive Container Dimensions Observer
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 800, height: 800 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 50) {
          setContainerSize({ width: rect.width, height: rect.height });
        }
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Compute maximum practical canvas display size to make the astronomical image the true hero
  const displaySize = useMemo(() => {
    const minDim = Math.min(containerSize.width, containerSize.height);
    // Expand to fit container with minimal margins (at least 320px, up to 1400px)
    return Math.max(320, Math.min(1400, Math.floor(minDim - 12)));
  }, [containerSize]);

  // Drag / Pan State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Curtain Divider Split Position (0.0 to 1.0, default 0.5)
  const [curtainSplit, setCurtainSplit] = useState<number>(0.5);
  const [isCurtainDragging, setIsCurtainDragging] = useState<boolean>(false);

  // Cursor Hover HUD Readout
  const [hoverCoord, setHoverCoord] = useState<{
    x: number;
    y: number;
    ra?: number;
    dec?: number;
    val?: number;
  } | null>(null);

  // Calculate WCS Orientation Angle (North up)
  const northAngleDeg = useMemo(() => {
    if (!wcs) return 0;
    const cd1_2 = wcs.cd1_2 ?? 0;
    const cd2_2 = wcs.cd2_2 ?? (wcs.cdelt2 || 1);
    const angle = Math.atan2(Number(cd1_2), Number(cd2_2)) * (180 / Math.PI);
    return isFinite(angle) ? angle : 0;
  }, [wcs]);

  // Offscreen canvases for curtain compare
  const offscreen1Ref = useRef<HTMLCanvasElement | null>(null);
  const offscreen2Ref = useRef<HTMLCanvasElement | null>(null);

  // Render the canonical astronomical image
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0 || width === 0 || height === 0) return;

    const renderSize = displaySize;

    if (isCurtainActive && epoch1Data && epoch2Data) {
      // Curtain Mode: Composite Epoch 1 on left, Epoch 2 on right
      if (!offscreen1Ref.current) offscreen1Ref.current = document.createElement('canvas');
      if (!offscreen2Ref.current) offscreen2Ref.current = document.createElement('canvas');

      // Both epochs rendered with the exact same unipolar colormap & stretch
      AstronomyRenderer.renderToCanvas(offscreen1Ref.current, epoch1Data, width, height, {
        stretch,
        colormap: colormap === 'diff_diverging' ? 'infrared_warm' : colormap,
        displayMode,
        contrastFactor,
        renderSize,
      });

      AstronomyRenderer.renderToCanvas(offscreen2Ref.current, epoch2Data, width, height, {
        stretch,
        colormap: colormap === 'diff_diverging' ? 'infrared_warm' : colormap,
        displayMode,
        contrastFactor,
        renderSize,
      });

      const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;
      canvas.width = Math.round(renderSize * dpr);
      canvas.height = Math.round(renderSize * dpr);
      canvas.style.width = `${renderSize}px`;
      canvas.style.height = `${renderSize}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.scale(dpr, dpr);

      const splitPx = curtainSplit * renderSize;

      // Draw Visit 1 (left)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitPx, renderSize);
      ctx.clip();
      ctx.drawImage(offscreen1Ref.current, 0, 0, renderSize, renderSize);
      ctx.restore();

      // Draw Visit 2 (right)
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitPx, 0, renderSize - splitPx, renderSize);
      ctx.clip();
      ctx.drawImage(offscreen2Ref.current, 0, 0, renderSize, renderSize);
      ctx.restore();

      // Draw Divider Line
      ctx.strokeStyle = '#FFB900';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitPx, 0);
      ctx.lineTo(splitPx, renderSize);
      ctx.stroke();

      ctx.restore();
    } else {
      // Standard Single-Frame or Difference View
      AstronomyRenderer.renderToCanvas(canvas, data, width, height, {
        stretch,
        colormap,
        displayMode,
        isDifference,
        mode: isDifference ? 'signed_difference' : 'unipolar',
        contrastFactor,
        renderSize,
        asinhBeta: isDifference ? 0.05 : 0.1,
      });
    }

    if (onCanvasReady) {
      onCanvasReady(canvas);
    }
  }, [
    data,
    width,
    height,
    isDifference,
    stretch,
    colormap,
    displayMode,
    contrastFactor,
    isCurtainActive,
    epoch1Data,
    epoch2Data,
    curtainSplit,
    displaySize,
    onCanvasReady,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Pointer Drag & Pan handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If curtain dragging is active, don't pan
    if (isCurtainDragging) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isCurtainDragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const rawPos = (e.clientX - rect.left) / rect.width;
      let clamped = Math.max(0.02, Math.min(0.98, rawPos));
      if (Math.abs(clamped - 0.5) < 0.03) clamped = 0.5; // Magnetic center snap
      setCurtainSplit(clamped);
      return;
    }

    if (isDragging) {
      onPanChange({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    // Cursor coordinate tracking
    if (canvasRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;

      const pxX = Math.max(0, Math.min(width - 1, Math.floor(relX * width)));
      const pxY = Math.max(0, Math.min(height - 1, Math.floor(relY * height)));
      const idx = pxY * width + pxX;
      const val = data && data[idx] !== undefined ? data[idx] : undefined;

      let ra: number | undefined;
      let dec: number | undefined;
      if (wcs) {
        try {
          const sky = WCS.pixToSky(pxX, pxY, wcs);
          if (sky) {
            ra = sky.ra;
            dec = sky.dec;
          }
        } catch {}
      }

      setHoverCoord({ x: pxX, y: pxY, ra, dec, val });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setIsCurtainDragging(false);
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    const nextZoom = Math.max(0.8, Math.min(4.0, Number((zoom + delta).toFixed(2))));
    onZoomChange(nextZoom);
  };

  // Tap on canvas (detect candidate or suspicious spot)
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCurtainDragging) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    const pxX = clickX * width;
    const pxY = clickY * height;

    // Check if clicked near a candidate (< 6px)
    let matchedCand: CandidateDetection | null = null;
    let minCandDist = 6.0;
    for (const c of candidates) {
      const dist = Math.hypot(c.x - pxX, c.y - pxY);
      if (dist < minCandDist) {
        minCandDist = dist;
        matchedCand = c;
      }
    }

    if (matchedCand) {
      if (onSelectCandidate) onSelectCandidate(matchedCand);
      if (onTapSpot) {
        onTapSpot({
          x: matchedCand.x,
          y: matchedCand.y,
          ra: matchedCand.ra,
          dec: matchedCand.dec,
        });
      }
      return;
    }

    // Check if DOUBT lens is active and clicked near a flagged pixel
    if (activeLens === 'doubt' && dqFlags) {
      const intX = Math.floor(pxX);
      const intY = Math.floor(pxY);
      const flagVal = dqFlags[intY * width + intX] || 0;
      if (flagVal > 0 && onSelectFlagPixel) {
        onSelectFlagPixel({ x: intX, y: intY, flag: flagVal });
        return;
      }
    }

    // Otherwise register tapped spot
    let ra = 0;
    let dec = 0;
    if (wcs) {
      try {
        const sky = WCS.pixToSky(pxX, pxY, wcs);
        if (sky) {
          ra = sky.ra;
          dec = sky.dec;
        }
      } catch {}
    }

    if (onTapSpot) {
      onTapSpot({ x: pxX, y: pxY, ra, dec });
    }
  };

  return (
    <div
      ref={containerRef}
      data-tour="viewport_canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      onClick={handleClick}
      className={`relative w-full h-full min-h-[380px] sm:min-h-[460px] md:min-h-[540px] bg-[#02040A] rounded-2xl overflow-hidden select-none border border-white/10 shadow-[inset_0_0_80px_rgba(0,0,0,0.85)] flex items-center justify-center cursor-grab active:cursor-grabbing ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* Background Starfield & Subtle Detector Grid */}
      <div className="absolute inset-0 detector-grid opacity-30 pointer-events-none" />

      {/* Viewport Corner Crop Marks */}
      <div className="crop-mark-tl" />
      <div className="crop-mark-tr" />
      <div className="crop-mark-bl" />
      <div className="crop-mark-br" />

      {/* Zoom / Pan Astronomical Layer */}
      <div
        className="relative transition-transform duration-75 ease-out origin-center flex items-center justify-center"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
        }}
      >
        <canvas
          ref={canvasRef}
          className="max-w-none block shadow-[0_12px_48px_rgba(0,0,0,0.9)] rounded-lg pointer-events-none"
        />

        {/* OVERLAY: DOUBT LENS (Detector Quality Glitch Mask) */}
        {activeLens === 'doubt' && dqFlags && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
          >
            {Array.from({ length: height }).map((_, y) =>
              Array.from({ length: width }).map((__, x) => {
                const flag = dqFlags[y * width + x] || 0;
                if (!flag) return null;
                const isOverflow = (flag & 0x02) !== 0;
                const isTransient = (flag & 0x01) !== 0;
                const color = isOverflow ? '#FF637E' : isTransient ? '#FB9600' : '#FF637E';

                return (
                  <rect
                    key={`dq-${x}-${y}`}
                    x={x}
                    y={y}
                    width={1}
                    height={1}
                    fill={color}
                    fillOpacity={0.35}
                    stroke={color}
                    strokeWidth={0.08}
                  />
                );
              })
            )}
          </svg>
        )}

        {/* OVERLAY: NEIGHBORS LENS (Gaia DR3 & AllWISE Catalog Circles) */}
        {activeLens === 'neighbors' && candidates.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
          >
            {candidates.map((cand) => {
              const hasMatch = cand.catalogMatches && cand.catalogMatches.length > 0;
              const match = hasMatch ? cand.catalogMatches![0] : null;
              const isGaia = match?.catalog?.includes('Gaia');
              const strokeColor = hasMatch ? (isGaia ? '#00D3F3' : '#FFB900') : '#94A3B8';

              return (
                <g key={`neighbor-${cand.id}`}>
                  {/* Astrometric Reticle Ring */}
                  <circle
                    cx={cand.x}
                    cy={cand.y}
                    r={2.2}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={0.25}
                    strokeDasharray={hasMatch ? undefined : '0.4 0.4'}
                  />
                  {/* Tick Marks */}
                  <line
                    x1={cand.x - 3}
                    y1={cand.y}
                    x2={cand.x - 2.5}
                    y2={cand.y}
                    stroke={strokeColor}
                    strokeWidth={0.25}
                  />
                  <line
                    x1={cand.x + 2.5}
                    y1={cand.y}
                    x2={cand.x + 3}
                    y2={cand.y}
                    stroke={strokeColor}
                    strokeWidth={0.25}
                  />
                  <line
                    x1={cand.x}
                    y1={cand.y - 3}
                    x2={cand.x}
                    y2={cand.y - 2.5}
                    stroke={strokeColor}
                    strokeWidth={0.25}
                  />
                  <line
                    x1={cand.x}
                    y1={cand.y + 2.5}
                    x2={cand.x}
                    y2={cand.y + 3}
                    stroke={strokeColor}
                    strokeWidth={0.25}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* OVERLAY: Selected Candidate Reticle */}
        {(selectedCandidate || tappedSpot) && (
          <div
            className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${((selectedCandidate ? selectedCandidate.x : tappedSpot!.x) / width) * 100}%`,
              top: `${((selectedCandidate ? selectedCandidate.y : tappedSpot!.y) / height) * 100}%`,
            }}
          >
            <div className="relative flex items-center justify-center">
              <span className="w-9 h-9 rounded-full border-2 border-[#FFB900] animate-pulse shadow-[0_0_16px_rgba(255,185,0,0.6)]" />
              <div className="absolute w-12 h-px bg-[#FFB900]/80" />
              <div className="absolute h-12 w-px bg-[#FFB900]/80" />
              <span className="absolute -top-6 text-[10px] font-mono font-bold text-slate-950 bg-[#FFB900] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                {selectedCandidate ? selectedCandidate.id : 'INSPECTED SPOT'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* CURTAIN DIVIDER INTERACTIVE HANDLE (When Compare is active) */}
      {isCurtainActive && (
        <div
          data-tour="curtain_divider"
          onPointerDown={(e) => {
            e.stopPropagation();
            setIsCurtainDragging(true);
          }}
          className="absolute top-0 bottom-0 -translate-x-1/2 w-8 flex items-center justify-center cursor-ew-resize select-none touch-none z-30"
          style={{ left: `${curtainSplit * 100}%` }}
        >
          {/* Subtle Vertical Divider Glow Line */}
          <div className="w-0.5 h-full bg-[#FFB900] shadow-[0_0_12px_rgba(255,185,0,0.8)]" />

          {/* Central Grab Handle */}
          <div className="absolute top-1/2 -translate-y-1/2 w-7 h-11 rounded-lg bg-[#FFB900] text-slate-950 flex items-center justify-center shadow-[0_0_24px_rgba(255,185,0,0.8)] hover:scale-105 active:scale-95 transition-transform cursor-ew-resize">
            <GripVertical className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* CURTAIN LABELS */}
      {isCurtainActive && (
        <>
          <div className="absolute top-4 left-4 z-20 pointer-events-none bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#00D3F3]/40 font-mono text-xs text-[#00D3F3] shadow-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00D3F3] animate-pulse" />
            <span>{epoch1Label}</span>
          </div>
          <div className="absolute top-4 right-4 z-20 pointer-events-none bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#FFB900]/40 font-mono text-xs text-[#FFB900] shadow-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FFB900] animate-pulse" />
            <span>{epoch2Label}</span>
          </div>
        </>
      )}

      {/* FLOATING HUD OVERLAYS (Top-Left: Scale & FOV, Bottom-Left: Coordinates, Top-Right: Zoom & Compass) */}
      {!isCurtainActive && (
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 font-mono text-[11px] text-slate-300 flex items-center gap-2">
            <span className="text-[#00D3F3] font-bold">SPHEREx DR1/QR3/QR2</span>
            <span className="text-white/30">|</span>
            <span>FOV: {fovArcmin}′ (~{(fovArcmin * 60).toFixed(0)}″)</span>
            <span className="text-white/30">|</span>
            <span className="text-slate-400">6.2″/px</span>
          </div>

          {/* Orientation Compass */}
          <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 font-mono text-[10px] text-slate-300 flex items-center gap-2">
            <Compass
              className="w-3.5 h-3.5 text-[#FFB900] transition-transform duration-300"
              style={{ transform: `rotate(${-northAngleDeg}deg)` }}
            />
            <span>N ({(-northAngleDeg).toFixed(0)}°)</span>
            <span className="text-slate-400">E ({(-northAngleDeg + 90).toFixed(0)}°)</span>
          </div>
        </div>
      )}

      {/* FLOATING ZOOM & VIEW CONTROLS (Top-Right) */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-black/75 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onZoomChange(Math.min(4.0, Number((zoom + 0.25).toFixed(2))));
          }}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title={isRtl ? 'تكبير (+)' : 'Zoom In (+)'}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="font-mono text-[10px] text-amber-400 px-1 font-semibold select-none">
          {zoom.toFixed(1)}x
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onZoomChange(Math.max(0.8, Number((zoom - 0.25).toFixed(2))));
          }}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title={isRtl ? 'تصغير (-)' : 'Zoom Out (-)'}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onZoomChange(1.0);
            onPanChange({ x: 0, y: 0 });
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer border-l border-white/10"
          title={isRtl ? 'إعادة ضبط العرض' : 'Reset View'}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* FLOATING INSPECTOR HUD READOUT (Top-Left under FOV indicator) */}
      {hoverCoord && (
        <div className="absolute top-18 sm:top-20 left-3 z-20 pointer-events-none bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 font-mono text-[11px] text-slate-200 flex flex-wrap items-center gap-3 shadow-xl max-w-[calc(100vw-2rem)]">
          <div className="flex items-center gap-1">
            <span className="text-[#00D3F3]">X,Y:</span>
            <span>
              {hoverCoord.x},{hoverCoord.y}
            </span>
          </div>

          {hoverCoord.ra !== undefined && hoverCoord.dec !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-white/30">|</span>
              <span className="text-[#FFB900]">RA:</span>
              <span>{hoverCoord.ra.toFixed(4)}°</span>
              <span className="text-[#FFB900]">Dec:</span>
              <span>
                {hoverCoord.dec >= 0 ? '+' : ''}
                {hoverCoord.dec.toFixed(4)}°
              </span>
            </div>
          )}

          {hoverCoord.val !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-white/30">|</span>
              <span className="text-emerald-400">{isDifference ? 'ΔF:' : 'Flux:'}</span>
              <span className="font-bold">
                {Number.isFinite(hoverCoord.val) ? hoverCoord.val.toFixed(2) : 'NaN'}
              </span>
              <span className="text-slate-400 text-[10px]">MJy/sr</span>
            </div>
          )}
        </div>
      )}

      {/* UNAVAILABLE TARGET IN CURRENT RELEASE (Truthful scientific disclosure) */}
      {isUnavailable && (
        <div className="absolute inset-0 z-30 pointer-events-auto bg-[#030712]/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center select-text">
          {/* Central Target Reticle */}
          <div className="relative w-28 h-28 mb-4 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 rounded-full border border-dashed border-[#00D3F3]/40 animate-spin" style={{ animationDuration: '30s' }} />
            <div className="absolute inset-4 rounded-full border border-amber-500/30" />
            <div className="absolute inset-8 rounded-full border border-[#00D3F3]/60" />
            <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D3F3]/70 to-transparent" />
            <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-[#00D3F3]/70 to-transparent" />
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          </div>

          {/* Telemetry Card */}
          <div className="max-w-xl w-full bg-[#0C0E14]/90 border border-white/15 rounded-2xl p-4 sm:p-5 shadow-2xl text-left space-y-3 font-sans">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-100 font-mono tracking-tight">
                  {targetName || 'Astronomical Target'} · {isRtl ? 'لم يكتمل الرصد بعد' : 'Awaiting Archive Coverage'}
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {availabilityStatus?.scheduledRelease || 'DR1 / QR3 / QR2 Weekly Updates'}
              </span>
            </div>

            {/* Coordinates & Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs text-slate-300">
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-slate-500 text-[10px] block">RIGHT ASCENSION</span>
                <span className="font-bold text-[#FFB900]">
                  {targetCoords?.ra ? `${targetCoords.ra.toFixed(4)}°` : 'Verified'}
                </span>
              </div>
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-slate-500 text-[10px] block">DECLINATION</span>
                <span className="font-bold text-[#FFB900]">
                  {targetCoords?.dec !== undefined ? `${targetCoords.dec >= 0 ? '+' : ''}${targetCoords.dec.toFixed(4)}°` : 'Verified'}
                </span>
              </div>
              <div className="bg-black/40 p-2 rounded-lg border border-white/5 col-span-2 sm:col-span-1">
                <span className="text-slate-500 text-[10px] block">DISTANCE TO NEP</span>
                <span className="font-bold text-[#00D3F3]">
                  {availabilityStatus?.distanceToNEPDeg ? `~${availabilityStatus.distanceToNEPDeg.toFixed(1)}°` : '> 60°'}
                </span>
              </div>
            </div>

            {/* Scientific Explanation */}
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {isRtl
                ? availabilityStatus?.reasonAr ||
                  'تقرأ المنصة أرشيف SPHEREx العام الحالي (DR1 / QR3 / QR2 مع تحديثات أسبوعية). إذا لم يظهر هذا الموقع في فحص البصمة الحية، جرّب أحد الأجرام الخمسة المرجعية أدناه.'
                : availabilityStatus?.reasonEn ||
                  'This app reads the current SPHEREx public archive (DR1 / QR3 / QR2, weekly updates). If no exposures were matched at this exact pointing yet, inspect one of the live verified presets below.'}
            </p>

            {/* Benchmark Switch Action Buttons */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-slate-400">
                {isRtl ? 'فحص بيانات SPHEREx الحقيقية المتاحة:' : 'Inspect Available SPHEREx Data:'}
              </span>
              <div className="flex items-center gap-2 font-mono text-xs">
                {onSelectBenchmark && (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelectBenchmark('case-barnards-star')}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold transition cursor-pointer"
                    >
                      Barnard&apos;s Star
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectBenchmark('case-nep-var-01')}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold transition cursor-pointer"
                    >
                      NEP Deep Field
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {isLoading && (
        <div className="absolute inset-0 z-40 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
          <div className="relative w-12 h-12">
            <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#FFB900] animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-white/10 border-b-[#00D3F3] animate-spin-reverse" />
          </div>
          <p className="font-mono text-xs text-amber-300 font-semibold tracking-wider">
            {isRtl ? 'جاري جلب وتحليل بيانات SPHEREx...' : 'RETRIEVING & ALIGNING SPHEREx FITS...'}
          </p>
        </div>
      )}
    </div>
  );
};
