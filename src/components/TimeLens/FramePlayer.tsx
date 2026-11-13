import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Gauge,
  Clock,
  Layers,
  ZoomIn,
  ZoomOut,
  Grid,
  Crosshair,
  ShieldAlert,
  Users,
  Download,
  Repeat,
  AlertTriangle,
  Activity,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  GitCommit,
  Zap,
  Share2,
} from 'lucide-react';
import { Badge } from '../../design/components/Badge';
import { Button } from '../../design/components/Button';
import { IconButton } from '../../design/components/IconButton';
import { SkeletonSky } from '../../design/components/SkeletonSky';
import { ErrorState } from '../../design/components/ErrorState';
import { EmptyState } from '../../design/components/EmptyState';
import { Language, translations } from '../../utils/translations';
import {
  TimeSeriesFrame,
  TemporalPairInfo,
  AvailableDetectorSummary,
  CatalogOverlayItem,
  SpectrumPoint,
  DetectorStack,
  LightCurvePoint,
} from '../../science/timeSeriesPipeline';
import { computeExpectedProperMotionOffset } from '../../science/properMotion';
import { WCSParams } from '../../science/types';
import { WCS } from '../../science/wcs';
import {
  SourceClassification,
  TapFreshness,
  FitsOrigin,
  FitsChecksumRecord,
  normalizeSourceClassification,
  getSourceClassificationMeta,
} from '../../science/provenance';

export type PlayerRenderMode = 'raw' | 'diff_ref' | 'diff_median' | 'coadd';
export type PlayerStretchMode = 'asinh' | 'linear' | 'sqrt' | 'log';

import { ScienceTerm } from '../ScienceTerm';
import {
  SpexExplainContext,
  SpexHighlight,
  SpexNearbySource,
  SpexSpotSelection,
  decodeFlagsPlainWords,
} from '../../science/spexExplain';

export interface FramePlayerProps {
  ra: number;
  dec: number;
  caseId?: string;
  sizePix?: number;
  initialDetector?: string;
  language: Language;
  explorerMode?: boolean;
  targetLabel?: string;
  onAskSpex?: () => void;
  onSpotSelect?: (spot: SpexSpotSelection, context: SpexExplainContext) => void;
  onExplainContextChange?: (context: SpexExplainContext) => void;
  spexHighlights?: SpexHighlight[];
  onOpenDictionary?: (termId?: string) => void;
  onSwitchToScientist?: () => void;
  onExplorerPlay?: () => void;
  onExplorerToggleDiff?: (diffActive: boolean) => void;
  onSelectFrame?: (frameIndex: number) => void;
  onDetectorChange?: (detector: string) => void;
  onSelectFovSize?: (sizePix: number) => void;
  onDataLoaded?: (data: TimeSeriesResponse) => void;
  onOpenSpectrum?: () => void;
  onOpenPostcard?: () => void;
  onOpenProvenance?: () => void;
  onOpenDetectorStacking?: () => void;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  guidedStepAction?: {
    play?: boolean;
    blinkFirstLast?: boolean;
    renderMode?: PlayerRenderMode;
    detector?: string;
    zoom?: number;
    showGrid?: boolean;
    showMotionTrail?: boolean;
  } | null;
  className?: string;
}

export interface TimeSeriesResponse {
  status: string;
  state?: string;
  sourceMode?: 'live' | 'saved_benchmark';
  sourceClassification?: SourceClassification;
  discoveryEligible?: boolean;
  discoveryEligibilityReason?: string;
  tapFreshness?: TapFreshness;
  tapCachedAt?: string;
  fitsOrigin?: FitsOrigin;
  cacheIntegrityVerified?: boolean;
  cachedFrameCount?: number;
  liveFrameCount?: number;
  observationIds?: string[];
  fitsChecksums?: FitsChecksumRecord[];
  sourceLabel?:
    | 'REAL SPHEREx DATA'
    | 'REAL DATA, SAVED COPY (NOT LIVE)'
    | 'DEMO COPY (DIFFERENT FIELD)'
    | 'TRAINING DATA'
    | string;
  cachedAt?: string;
  isDemoCopy?: boolean;
  demoNotice?: string;
  trueCenter?: { ra: number; dec: number };
  targetCoords: { ra: number; dec: number };
  selectedDetector?: string;
  recommendedDetector?: string;
  availableDetectors?: AvailableDetectorSummary[];
  fovArcmin: number;
  sizePix: number;
  totalExposuresFound?: number;
  framesCount: number;
  framesReturned?: number;
  frames: TimeSeriesFrame[];
  temporalPairs: TemporalPairInfo[];
  cadenceSummary?: {
    totalFrames: number;
    totalPairs: number;
    intraVisitPairs: number;
    independentVisitPairs: number;
    surveyEpochPairs: number;
  };
  dateRange?: { start: string; end: string; spanDays: number };
  detectorStacks?: Record<string, DetectorStack>;
  spectrumAtCenter?: SpectrumPoint[];
  referenceWcs?: WCSParams;
  catalogOverlays?: CatalogOverlayItem[];
  properMotion?: {
    targetId?: string;
    pmRaMasYr: number;
    pmDecMasYr: number;
    fromEpochYear: number;
    toEpochYear: number;
    separationArcsec: number;
  };
  frameMode: 'sky' | 'target';
  releaseId?: string;
  releaseBreakdown?: string[] | Record<string, number>;
  releaseGroupCounts?: Record<string, number>;
  exposuresPerRelease?: Record<string, number>;
  mixedReleasesDetected?: boolean;
  activeRelease?: string;
  activeVersion?: string;
  largestDiffGroupKey?: string;
  isSnapshot?: boolean;
  snapshotTakenAt?: string;
  centroidStacked?: boolean;
  astrometrySummary?: {
    method: string;
    chosenOption?: 'a' | 'b';
    errorBudgetLabel?: string;
    annualMotion?: {
      pmRaArcsecYr: number;
      pmDecArcsecYr: number;
      totalArcsecYr: number;
      errorArcsecYr: number;
      reducedChi2: number;
    };
    medianRefStarsUsed: number;
    lowConfidence: boolean;
    lowConfidenceReason?: string;
    astrometricFloorArcsec: number;
    detectorLooFloorArcsec?: number | null;
    controlFloorInDetectorArcsec?: number | null;
    floorByBrightnessClass?: Record<string, number>;
    brightnessClassUsed?: string;
    looSampleCount?: number;
    controlsUsed: string[];
    perControlScatterArcsec?: Record<string, number | null>;
    measuredNetDxArcsec: number;
    measuredNetDyArcsec: number;
    measuredDisplacementArcsec: number;
    measuredDisplacementErrorArcsec: number;
    targetSigmaArcsec?: number;
    sigma?: number;
    expectedOffset?: {
      dxArcsec: number;
      dyArcsec: number;
      totalArcsec: number;
      baselineDays: number;
    };
    diffFromExpectedArcsec?: number;
    diffFromExpectedSigma?: number;
    significanceRatio: number;
    motionSignificant: boolean;
    motionVerdict: string;
    targetDetectedInDetector: boolean;
    unsaturatedCoreCount?: number;
    wingFitCount?: number;
    saturatedAllDetectors?: boolean;
    detectorDetectionNote?: string;
    nearbyNeighbors15Arcsec?: Array<{
      identifier: string;
      catalog: string;
      distToPredictedArcsec: number;
      distToCentroidArcsec?: number;
      magLabel?: string;
    }>;
  };
  lightCurve?: LightCurvePoint[];
  partialFailures?: {
    failedCount: number;
    attemptedCount: number;
    notice: string;
  };
  message?: string;
  error?: string;
}

const DQ_ARTIFACT_MASK = 0x01 | 0x02 | 0x04 | 0x10 | 0x20 | 0x80000;

function computePercentileBounds(values: number[]): { p02: number; p98: number; med: number } {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return { p02: 0, p98: 1, med: 0 };
  finite.sort((a, b) => a - b);
  const p02 = finite[Math.floor(finite.length * 0.02)] ?? finite[0];
  const p98 = finite[Math.floor(finite.length * 0.98)] ?? finite[finite.length - 1];
  const med = finite[Math.floor(finite.length * 0.5)] ?? 0;
  return { p02, p98: p98 > p02 ? p98 : p02 + 1e-6, med };
}

export const FramePlayer: React.FC<FramePlayerProps> = ({
  ra,
  dec,
  caseId,
  sizePix = 64,
  initialDetector,
  language,
  explorerMode = false,
  targetLabel,
  onAskSpex,
  onSpotSelect,
  onExplainContextChange,
  spexHighlights = [],
  onOpenDictionary,
  onSwitchToScientist,
  onExplorerPlay,
  onExplorerToggleDiff,
  onSelectFrame,
  onDetectorChange,
  onSelectFovSize,
  onDataLoaded,
  onOpenSpectrum,
  onOpenPostcard,
  onOpenProvenance,
  onOpenDetectorStacking,
  onCanvasReady,
  guidedStepAction,
  className = '',
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  const [data, setData] = useState<TimeSeriesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<{ loaded: number; total: number; phase?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<'OK' | 'ARCHIVE_ZERO_ROWS' | 'NETWORK_ERROR' | 'HTTP_ERROR'>('OK');

  // Playback & band controls
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [frameMode, setFrameMode] = useState<'sky' | 'target'>('sky');
  const [selectedDetector, setSelectedDetector] = useState<string>(initialDetector || '');
  const [frameCount, setFrameCount] = useState<10 | 16 | 20 | 40>(16);
  const [wavelengthWindow, setWavelengthWindow] = useState<string>('all');

  // Display & stretch controls
  const [globalScaleEnabled, setGlobalScaleEnabled] = useState<boolean>(true);
  const [stretchMode, setStretchMode] = useState<PlayerStretchMode>('asinh');
  const [contrastFactor, setContrastFactor] = useState<number>(1.0);
  const [blinkFirstLast, setBlinkFirstLast] = useState<boolean>(false);
  const [renderMode, setRenderMode] = useState<PlayerRenderMode>('raw');
  const [zoom, setZoom] = useState<number>(2);
  const [pixelSharp, setPixelSharp] = useState<boolean>(true);
  const [showPixelGrid, setShowPixelGrid] = useState<boolean>(false);
  const [showMotionTrail, setShowMotionTrail] = useState<boolean>(true);
  const [showEpoch1Crosshair, setShowEpoch1Crosshair] = useState<boolean>(true);
  const [showDqOverlay, setShowDqOverlay] = useState<boolean>(false);
  const [showCatalogOverlay, setShowCatalogOverlay] = useState<boolean>(true);
  const [selectedReleaseKey, setSelectedReleaseKey] = useState<string | null>(null);
  const [sameReleaseOnly, setSameReleaseOnly] = useState<boolean>(false);

  // Progressive disclosure Advanced drawer (collapsed by default, persisted in localStorage)
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('spex_advanced_drawer') === 'true';
    } catch {
      return false;
    }
  });
  const toggleAdvanced = useCallback(() => {
    setAdvancedOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('spex_advanced_drawer', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setSameReleaseOnly(false);
    setSelectedReleaseKey(null);
  }, [ra, dec, caseId, selectedDetector]);

  // Collapsible A4 reserved slots
  const [metaSlotOpen, setMetaSlotOpen] = useState<boolean>(true);
  const [centroidSlotOpen, setCentroidSlotOpen] = useState<boolean>(true);
  const [lightCurveSlotOpen, setLightCurveSlotOpen] = useState<boolean>(true);
  const [lcBandFilter, setLcBandFilter] = useState<'all' | 'lower' | 'middle' | 'upper'>('all');
  const [spectrumSlotOpen, setSpectrumSlotOpen] = useState<boolean>(true);
  const [tappedPix, setTappedPix] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setTappedPix(null);
  }, [ra, dec, caseId, selectedDetector]);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync external initialDetector prop if changed (e.g. from URL deep link)
  useEffect(() => {
    if (initialDetector && initialDetector !== selectedDetector) {
      setSelectedDetector(initialDetector);
    }
  }, [initialDetector]);

  // Apply guided tour step actions when driven externally (P2 60s guided demo)
  useEffect(() => {
    if (!guidedStepAction) return;
    if (guidedStepAction.play !== undefined && !prefersReducedMotion) setIsPlaying(guidedStepAction.play);
    if (guidedStepAction.blinkFirstLast !== undefined) setBlinkFirstLast(guidedStepAction.blinkFirstLast);
    if (guidedStepAction.renderMode !== undefined) setRenderMode(guidedStepAction.renderMode);
    if (guidedStepAction.detector !== undefined) setSelectedDetector(guidedStepAction.detector);
    if (guidedStepAction.zoom !== undefined) setZoom(guidedStepAction.zoom);
    if (guidedStepAction.showGrid !== undefined) setShowPixelGrid(guidedStepAction.showGrid);
    if (guidedStepAction.showMotionTrail !== undefined) setShowMotionTrail(guidedStepAction.showMotionTrail);
  }, [guidedStepAction, prefersReducedMotion]);

  const fetchTimeSeries = useCallback(async () => {
    setLoading(true);
    setLoadingProgress(null);
    setError(null);
    try {
      const params = new URLSearchParams({
        ra: ra.toFixed(6),
        dec: dec.toFixed(6),
        sizePix: String(sizePix),
        frame: frameMode,
        maxFrames: String(frameCount),
        stream: 'ndjson',
      });
      if (caseId) params.set('caseId', caseId);
      if (selectedDetector) params.set('detector', selectedDetector);
      if (wavelengthWindow !== 'all') params.set('wlWindow', wavelengthWindow);
      if (sameReleaseOnly) params.set('sameReleaseOnly', '1');

      const res = await fetch(`/api/spherex/timeseries?${params.toString()}`);
      const contentType = res.headers.get('content-type') || '';

      let json: TimeSeriesResponse | null = null;
      let streamStatus: number | undefined;

      if (contentType.includes('application/x-ndjson') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const evt = JSON.parse(trimmed);
              if (evt.type === 'progress') {
                setLoadingProgress({
                  loaded: Number(evt.loaded || 0),
                  total: Number(evt.total || 0),
                  phase: evt.phase,
                });
              } else if (evt.type === 'result') {
                json = evt.data as TimeSeriesResponse;
              } else if (evt.type === 'error') {
                streamStatus = evt.status;
                json = evt as TimeSeriesResponse;
              }
            } catch {
              // ignore malformed partial chunk
            }
          }
        }
        if (buffer.trim()) {
          try {
            const evt = JSON.parse(buffer.trim());
            if (evt.type === 'result') json = evt.data as TimeSeriesResponse;
            else if (evt.type === 'error') {
              streamStatus = evt.status;
              json = evt as TimeSeriesResponse;
            }
          } catch {
            // ignore trailing chunk
          }
        }
      } else {
        json = contentType.includes('application/json')
          ? await res.json()
          : ({ error: `HTTP ${res.status}` } as any);
      }

      if (!res.ok || streamStatus === 404 || (streamStatus && streamStatus >= 400)) {
        if (res.status === 404 || streamStatus === 404) {
          setData(json);
          setState('ARCHIVE_ZERO_ROWS');
          setLoading(false);
          setLoadingProgress(null);
          return;
        }
        throw new Error(json?.error || `IRSA Archive returned HTTP ${streamStatus || res.status}`);
      }

      if (!json) {
        throw new Error('Empty response from SPHEREx time-series server');
      }

      if (json.state === 'ARCHIVE_ZERO_ROWS' || !json.frames || json.frames.length === 0) {
        setState('ARCHIVE_ZERO_ROWS');
        setData(json);
      } else {
        setState('OK');
        setData(json);
        setSelectedReleaseKey(null);
        setCurrentFrameIdx(0);
        onDataLoaded?.(json);
      }
    } catch (err: any) {
      setState('NETWORK_ERROR');
      setError(err?.message || 'Could not load time-series frames from NASA IRSA');
    } finally {
      setLoading(false);
    }
  }, [ra, dec, caseId, sizePix, frameMode, selectedDetector, frameCount, wavelengthWindow, sameReleaseOnly]);

  useEffect(() => {
    fetchTimeSeries();
  }, [fetchTimeSeries]);

  // Playback interval (handles both full sequence and Epoch 1 <-> Last Blink mode)
  useEffect(() => {
    if (!isPlaying || !data?.frames?.length) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }

    const total = data.frames.length;
    const intervalMs = Math.round(750 / playbackSpeed);
    playTimerRef.current = setInterval(() => {
      setCurrentFrameIdx((prev) => {
        let next: number;
        if (blinkFirstLast && total >= 2) {
          next = prev === 0 ? total - 1 : 0;
        } else {
          if (prev + 1 >= total) {
            if (!isLooping) {
              setIsPlaying(false);
              return prev;
            }
            next = 0;
          } else {
            next = prev + 1;
          }
        }
        onSelectFrame?.(next);
        return next;
      });
    }, intervalMs);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, blinkFirstLast, isLooping, data?.frames?.length, onSelectFrame]);

  // Keyboard shortcuts (Space: Play/Pause, Left/Right: Step, L: Loop, B: Blink 1<->Last)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!data?.frames?.length) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentFrameIdx((prev) => {
          const next = blinkFirstLast && data.frames.length >= 2
            ? (prev === 0 ? data.frames.length - 1 : 0)
            : (prev + 1) % data.frames.length;
          onSelectFrame?.(next);
          return next;
        });
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentFrameIdx((prev) => {
          const prevIdx = blinkFirstLast && data.frames.length >= 2
            ? (prev === 0 ? data.frames.length - 1 : 0)
            : (prev - 1 + data.frames.length) % data.frames.length;
          onSelectFrame?.(prevIdx);
          return prevIdx;
        });
      } else if (e.key === 'l' || e.key === 'L') {
        setIsLooping((lp) => !lp);
      } else if (e.key === 'b' || e.key === 'B') {
        if (data.frames.length >= 2) {
          setBlinkFirstLast((b) => !b);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [data?.frames?.length, blinkFirstLast, onSelectFrame]);

  // P1-2: Enforce same release and processing VERSION for differences and stacks
  const frameReleaseGroups = useMemo(() => {
    const groups = new Map<string, TimeSeriesFrame[]>();
    for (const fr of data?.frames || []) {
      const key = `${(fr.release || data?.activeRelease || 'public').toLowerCase()}::${fr.version || data?.activeVersion || 'unknown'}`;
      const list = groups.get(key) || [];
      list.push(fr);
      groups.set(key, list);
    }
    return groups;
  }, [data?.frames, data?.activeRelease, data?.activeVersion]);

  const primaryReleaseKey = useMemo(() => {
    const first = Array.from(frameReleaseGroups.entries()).sort((a, b) => b[1].length - a[1].length)[0];
    return first ? first[0] : null;
  }, [frameReleaseGroups]);

  const displayFrames = useMemo(() => {
    const all = data?.frames || [];
    if (!selectedReleaseKey) return all;
    const subset = frameReleaseGroups.get(selectedReleaseKey);
    return subset && subset.length > 0 ? subset : all;
  }, [data?.frames, selectedReleaseKey, frameReleaseGroups]);

  // Precompute stack median and inverse-variance co-add on common WCS grid (strictly largest same release & VERSION group)
  const diffGroupKey = primaryReleaseKey || data?.largestDiffGroupKey || null;
  const { stackMedian, coaddStack, diffRefFrame } = useMemo(() => {
    if (displayFrames.length === 0) {
      return {
        stackMedian: null as number[] | null,
        coaddStack: null as number[] | null,
        diffRefFrame: null as TimeSeriesFrame | null,
      };
    }
    const targetKey =
      diffGroupKey ||
      `${(displayFrames[0].release || data?.activeRelease || 'public').toLowerCase()}::${displayFrames[0].version || data?.activeVersion || 'unknown'}`;
    const sameReleaseFrames = displayFrames.filter(
      (f) => `${(f.release || data?.activeRelease || 'public').toLowerCase()}::${f.version || data?.activeVersion || 'unknown'}` === targetKey
    );
    const groupFrames = sameReleaseFrames.length > 0 ? sameReleaseFrames : displayFrames;
    const nPix = (groupFrames[0].width || 64) * (groupFrames[0].height || 64);
    const medianArr = new Array<number>(nPix);
    const coaddArr = new Array<number>(nPix);

    for (let p = 0; p < nPix; p++) {
      const vals: number[] = [];
      let wSum = 0;
      let wfSum = 0;
      for (let fIdx = 0; fIdx < groupFrames.length; fIdx++) {
        const fr = groupFrames[fIdx];
        const arr = fr.reprojectedFlux?.length === nPix ? fr.reprojectedFlux : fr.flux;
        const v = arr[p];
        const flag = fr.flags?.[p] ?? 0;
        const isFlagged = (flag & DQ_ARTIFACT_MASK) !== 0;
        if (Number.isFinite(v) && !isFlagged) {
          vals.push(v);
          const vari = fr.variance?.[p];
          const w = vari && Number.isFinite(vari) && vari > 0 ? 1 / vari : 1;
          wSum += w;
          wfSum += w * v;
        }
      }
      if (vals.length === 0) {
        const fallback = (groupFrames[0].reprojectedFlux ?? groupFrames[0].flux)[p] ?? 0;
        medianArr[p] = Number.isFinite(fallback) ? fallback : 0;
        coaddArr[p] = medianArr[p];
      } else {
        vals.sort((a, b) => a - b);
        medianArr[p] = vals[Math.floor(vals.length / 2)];
        coaddArr[p] = wSum > 0 ? wfSum / wSum : medianArr[p];
      }
    }
    return { stackMedian: medianArr, coaddStack: coaddArr, diffRefFrame: groupFrames[0] || null };
  }, [displayFrames, diffGroupKey, data?.activeRelease, data?.activeVersion]);

  // Compute displayed pixel buffer for any given frame under current renderMode
  const getDisplayArray = useCallback(
    (frameIdx: number): number[] => {
      const frames = displayFrames;
      const fr = frames[frameIdx];
      if (!fr) return [];
      const base = fr.reprojectedFlux?.length === fr.flux.length ? fr.reprojectedFlux : fr.flux;
      const frKey = `${(fr.release || data?.activeRelease || 'public').toLowerCase()}::${fr.version || data?.activeVersion || 'unknown'}`;
      const refGroupKey =
        diffGroupKey ||
        (frames[0]
          ? `${(frames[0].release || data?.activeRelease || 'public').toLowerCase()}::${frames[0].version || data?.activeVersion || 'unknown'}`
          : frKey);

      if (renderMode === 'coadd' && coaddStack) {
        return coaddStack;
      }
      if (renderMode === 'diff_ref' && diffRefFrame) {
        if (frKey !== refGroupKey) return base; // Never subtract across mismatched releases/versions
        const ref = diffRefFrame.reprojectedFlux?.length === diffRefFrame.flux.length
          ? diffRefFrame.reprojectedFlux
          : diffRefFrame.flux;
        return base.map((v, i) => (Number.isFinite(v) && Number.isFinite(ref[i]) ? v - ref[i] : 0));
      }
      if (renderMode === 'diff_median' && stackMedian) {
        if (frKey !== refGroupKey) return base; // Never subtract across mismatched releases/versions
        return base.map((v, i) => (Number.isFinite(v) && Number.isFinite(stackMedian[i]) ? v - stackMedian[i] : 0));
      }
      return base;
    },
    [displayFrames, diffGroupKey, diffRefFrame, data?.activeRelease, data?.activeVersion, renderMode, coaddStack, stackMedian]
  );

  // Global per-band intensity scale (P0.2: prevents frame-to-frame flicker)
  const globalScale = useMemo(() => {
    const frames = data?.frames || [];
    if (frames.length === 0) return { p02: 0, p98: 1, absMaxDiff: 1 };

    const sampleValues: number[] = [];
    const stride = frames.length > 4 ? 2 : 1;
    for (let fIdx = 0; fIdx < frames.length; fIdx++) {
      const arr = getDisplayArray(fIdx);
      for (let i = 0; i < arr.length; i += stride) {
        if (Number.isFinite(arr[i])) sampleValues.push(arr[i]);
      }
    }
    const { p02, p98 } = computePercentileBounds(sampleValues);
    const absSorted = sampleValues.map((v) => Math.abs(v)).sort((a, b) => a - b);
    const absMaxDiff = Math.max(1e-5, absSorted[Math.floor(absSorted.length * 0.985)] ?? 1);
    return { p02, p98, absMaxDiff };
  }, [data?.frames, getDisplayArray]);

  // Render active frame onto canvas (using globalScale or per-frame auto + DQ overlay)
  useEffect(() => {
    if (!data?.frames?.length) return;
    const frame = data.frames[currentFrameIdx];
    if (!frame) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = frame.width || 64;
    const height = frame.height || 64;
    canvas.width = width;
    canvas.height = height;

    const pixels = getDisplayArray(currentFrameIdx);
    if (!pixels || pixels.length === 0) return;

    const isDiff = renderMode === 'diff_ref' || renderMode === 'diff_median';
    let p02 = globalScale.p02;
    let p98 = globalScale.p98;
    let diffScale = globalScale.absMaxDiff;

    if (!globalScaleEnabled) {
      const localBounds = computePercentileBounds(pixels);
      p02 = localBounds.p02;
      p98 = localBounds.p98;
      const absLocal = pixels.filter(Number.isFinite).map(Math.abs).sort((a, b) => a - b);
      diffScale = Math.max(1e-5, absLocal[Math.floor(absLocal.length * 0.985)] ?? 1);
    }

    const range = Math.max(1e-6, p98 - p02);
    const imgData = ctx.createImageData(width, height);

    for (let i = 0; i < width * height; i++) {
      const val = pixels[i] ?? 0;
      let r = 0;
      let g = 0;
      let b = 0;

      if (isDiff) {
        // Diverging colormap: positive excess = bright amber/white, negative deficit = cyan/blue
        const scaled = (val / diffScale) * contrastFactor;
        const signed =
          stretchMode === 'linear'
            ? Math.max(-1, Math.min(1, scaled))
            : Math.max(-1, Math.min(1, Math.asinh(scaled * 3) / Math.asinh(3)));
        if (signed >= 0) {
          r = Math.round(24 + signed * 231);
          g = Math.round(26 + signed * 165);
          b = Math.round(34 + signed * 35);
        } else {
          const mag = -signed;
          r = Math.round(24 - mag * 18);
          g = Math.round(26 + mag * 185);
          b = Math.round(34 + mag * 215);
        }
      } else {
        const rawNorm = Math.max(0, Math.min(1, ((val - p02) / range) * contrastFactor));
        let norm = rawNorm;
        if (stretchMode === 'asinh') {
          norm = Math.max(0, Math.min(1, Math.asinh(rawNorm * 5) / Math.asinh(5)));
        } else if (stretchMode === 'sqrt') {
          norm = Math.sqrt(rawNorm);
        } else if (stretchMode === 'log') {
          norm = Math.log10(1 + rawNorm * 9) / Math.log10(10);
        }
        const byteVal = Math.round(norm * 255);
        // Warm infrared astronomical ramp
        r = Math.min(255, Math.round(byteVal * 1.05));
        g = Math.min(255, Math.round(byteVal * 0.86));
        b = Math.min(255, Math.round(byteVal * 0.58));
      }

      // Optional DQ-flag pixel highlight overlay
      if (showDqOverlay && frame.flags && (frame.flags[i] & DQ_ARTIFACT_MASK) !== 0) {
        r = Math.min(255, Math.round(r * 0.45 + 244 * 0.55));
        g = Math.min(255, Math.round(g * 0.45 + 63 * 0.55));
        b = Math.min(255, Math.round(b * 0.45 + 94 * 0.55));
      }

      imgData.data[i * 4] = r;
      imgData.data[i * 4 + 1] = g;
      imgData.data[i * 4 + 2] = b;
      imgData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
    onCanvasReady?.(canvas);
  }, [data, currentFrameIdx, renderMode, globalScale, globalScaleEnabled, showDqOverlay, stretchMode, contrastFactor, getDisplayArray, onCanvasReady]);

  // Grounded context & WCS pixel-to-sky builder for SPEX AI Guide (Step 2)
  const buildExplainContext = useCallback((): SpexExplainContext | null => {
    if (!data?.frames?.length) return null;
    const frames = displayFrames.length > 0 ? displayFrames : data.frames;
    const idx = Math.min(currentFrameIdx, Math.max(0, frames.length - 1));
    const fr = frames[idx] || frames[0];
    if (!fr) return null;

    const predictedPix = fr.targetRefPixel || fr.targetPixel || null;
    const aSum = data.astrometrySummary;
    const canonicalClass = normalizeSourceClassification(data.sourceClassification, {
      sourceMode: data.sourceMode,
      isSnapshot: Boolean(data.isSnapshot),
      isDemoCopy: Boolean(data.isDemoCopy),
      tapFreshness: data.tapFreshness,
      cacheIntegrityVerified: data.cacheIntegrityVerified,
      someCached: Boolean(data.cachedFrameCount && data.cachedFrameCount > 0) || Boolean(fr.isCached),
      status: data.status,
      state: data.state,
    });
    const isDiscoveryEligible =
      typeof data.discoveryEligible === 'boolean'
        ? data.discoveryEligible
        : canonicalClass === 'LIVE_ARCHIVE_DATA' || canonicalClass === 'VERIFIED_FITS_CACHE';
    const dataSourceType: 'live' | 'snapshot' | 'cached' | 'demo' | 'stale_tap' | 'unavailable' =
      canonicalClass === 'SYNTHETIC_DEMO'
        ? 'demo'
        : canonicalClass === 'STALE_TAP_CACHE'
        ? 'stale_tap'
        : canonicalClass === 'SAVED_BENCHMARK'
        ? 'snapshot'
        : canonicalClass === 'VERIFIED_FITS_CACHE'
        ? 'cached'
        : canonicalClass === 'UNAVAILABLE'
        ? 'unavailable'
        : 'live';

    const nearestCatalogSources: SpexNearbySource[] = (data.catalogOverlays || [])
      .slice(0, 6)
      .map((cat) => {
        let distArcsec = 999;
        const catRa = cat.raPropagated ?? cat.raRaw;
        const catDec = cat.decPropagated ?? cat.decRaw;
        if (Number.isFinite(catRa) && Number.isFinite(catDec)) {
          let dRa = catRa - data.targetCoords.ra;
          if (dRa > 180) dRa -= 360;
          if (dRa < -180) dRa += 360;
          distArcsec =
            Math.hypot(
              dRa * Math.cos((data.targetCoords.dec * Math.PI) / 180),
              catDec - data.targetCoords.dec
            ) * 3600;
        } else if (predictedPix) {
          distArcsec = Math.hypot(cat.x - predictedPix.x, cat.y - predictedPix.y) * 6.2;
        }
        return {
          id: cat.identifier,
          catalog: cat.catalog,
          magnitude: cat.magLabel || (cat.mag != null ? Number(cat.mag).toFixed(2) : null),
          distanceArcsec: Number(distArcsec.toFixed(2)),
          x: Number(cat.x.toFixed(2)),
          y: Number(cat.y.toFixed(2)),
        };
      })
      .sort((a, b) => a.distanceArcsec - b.distanceArcsec);

    return {
      targetName: targetLabel || caseId || 'SPHEREx Sky Patch',
      caseId: caseId || data.properMotion?.targetId,
      frameWidth: fr.width || 64,
      frameHeight: fr.height || 64,
      frameIndex: idx + 1,
      totalFrames: frames.length,
      dateObs: fr.dateObs,
      detector: fr.detector,
      wavelengthUm: fr.wavelengthUm,
      release: (fr.release || data.activeRelease || 'public').toUpperCase(),
      dataSourceType,
      sourceClassification: canonicalClass,
      discoveryEligible: isDiscoveryEligible,
      tapFreshness: data.tapFreshness,
      snapshotDate: data.snapshotTakenAt || data.cachedAt || fr.dateObs?.slice(0, 10),
      renderMode,
      targetPixel: fr.targetPixel || null,
      predictedPixel: predictedPix,
      measuredCentroidPixel: fr.measuredCentroid?.valid
        ? { x: fr.measuredCentroid.x, y: fr.measuredCentroid.y }
        : null,
      motionSummary: aSum
        ? {
            measuredDxArcsec: aSum.measuredNetDxArcsec,
            measuredDyArcsec: aSum.measuredNetDyArcsec,
            measuredTotalArcsec: aSum.measuredDisplacementArcsec,
            measuredErrorArcsec: aSum.measuredDisplacementErrorArcsec,
            expectedTotalArcsec: aSum.expectedOffset?.totalArcsec,
            sigma:
              aSum.sigma ??
              (aSum.measuredDisplacementErrorArcsec > 0
                ? aSum.measuredDisplacementArcsec / aSum.measuredDisplacementErrorArcsec
                : 0),
            motionSignificant: aSum.motionSignificant,
            motionVerdict: aSum.motionVerdict,
            targetDetectedInDetector: aSum.targetDetectedInDetector,
            wingFitUsed:
              aSum.errorBudgetLabel === 'includes wing-fit frames, low confidence' ||
              (aSum.wingFitCount ?? 0) > 0,
            saturatedAllDetectors: aSum.saturatedAllDetectors,
            errorBudgetLabel: aSum.errorBudgetLabel,
          }
        : null,
      nearestCatalogSources,
    };
  }, [data, displayFrames, currentFrameIdx, targetLabel, caseId, renderMode]);

  useEffect(() => {
    const ctx = buildExplainContext();
    if (ctx) onExplainContextChange?.(ctx);
  }, [buildExplainContext, onExplainContextChange]);

  const inspectSpotAtPixel = useCallback(
    (px: number, py: number) => {
      if (!data?.frames?.length) return;
      const frames = displayFrames.length > 0 ? displayFrames : data.frames;
      const idx = Math.min(currentFrameIdx, Math.max(0, frames.length - 1));
      const fr = frames[idx] || frames[0];
      if (!fr) return;
      const w = fr.width || 64;
      const h = fr.height || 64;
      const clampedX = Math.max(0, Math.min(w - 1, px));
      const clampedY = Math.max(0, Math.min(h - 1, py));
      setTappedPix({ x: clampedX, y: clampedY });

      const pixIdx = Math.round(clampedY) * w + Math.round(clampedX);
      const disp = getDisplayArray(idx);
      const fluxMjySr = Number.isFinite(disp[pixIdx])
        ? disp[pixIdx]
        : Number.isFinite(fr.flux[pixIdx])
        ? fr.flux[pixIdx]
        : null;
      const variance = fr.variance?.[pixIdx];
      const snr =
        fluxMjySr != null && variance != null && Number.isFinite(variance) && variance > 0
          ? fluxMjySr / Math.sqrt(variance)
          : null;
      const flagsBitmask = fr.flags?.[pixIdx] ?? 0;
      const flagsPlain = decodeFlagsPlainWords(flagsBitmask, language);

      const activeWcs = data.referenceWcs || fr.wcs;
      const sky = activeWcs ? WCS.pixToSky(clampedX, clampedY, activeWcs) : null;

      const nearbySources: SpexNearbySource[] = (data.catalogOverlays || [])
        .map((cat) => {
          let distArcsec = 999;
          const catRa = cat.raPropagated ?? cat.raRaw;
          const catDec = cat.decPropagated ?? cat.decRaw;
          if (sky && Number.isFinite(catRa) && Number.isFinite(catDec)) {
            let dRa = catRa - sky.ra;
            if (dRa > 180) dRa -= 360;
            if (dRa < -180) dRa += 360;
            distArcsec =
              Math.hypot(dRa * Math.cos((sky.dec * Math.PI) / 180), catDec - sky.dec) * 3600;
          } else {
            distArcsec = Math.hypot(cat.x - clampedX, cat.y - clampedY) * 6.2;
          }
          return {
            id: cat.identifier,
            catalog: cat.catalog,
            magnitude: cat.magLabel || (cat.mag != null ? Number(cat.mag).toFixed(2) : null),
            distanceArcsec: Number(distArcsec.toFixed(2)),
            x: Number(cat.x.toFixed(2)),
            y: Number(cat.y.toFixed(2)),
          };
        })
        .filter((item) => item.distanceArcsec <= 22)
        .sort((a, b) => a.distanceArcsec - b.distanceArcsec)
        .slice(0, 5);

      const predPix = fr.targetRefPixel || fr.targetPixel;
      const measPix = fr.measuredCentroid?.valid ? fr.measuredCentroid : null;
      const isNearTarget = Boolean(
        measPix && Math.hypot(clampedX - measPix.x, clampedY - measPix.y) <= 2.8
      );
      const isNearPredicted = Boolean(
        predPix && Math.hypot(clampedX - predPix.x, clampedY - predPix.y) <= 2.8
      );

      const spot: SpexSpotSelection = {
        x: Number(clampedX.toFixed(2)),
        y: Number(clampedY.toFixed(2)),
        ra: sky ? Number(sky.ra.toFixed(6)) : null,
        dec: sky ? Number(sky.dec.toFixed(6)) : null,
        fluxMjySr: fluxMjySr != null ? Number(fluxMjySr.toFixed(4)) : null,
        snr: snr != null ? Number(snr.toFixed(2)) : null,
        flagsBitmask,
        flagsPlain,
        isNearTarget,
        isNearPredicted,
        nearbySources,
      };

      const ctx = buildExplainContext();
      if (ctx) onSpotSelect?.(spot, ctx);
    },
    [data, displayFrames, currentFrameIdx, getDisplayArray, language, buildExplainContext, onSpotSelect]
  );

  // PNG Snapshot Export (P0.3)
  const handleExportPng = () => {
    const srcCanvas = canvasRef.current;
    const currentFrame = data?.frames?.[currentFrameIdx];
    if (!srcCanvas || !currentFrame || !data) return;

    const outSize = 512;
    const out = document.createElement('canvas');
    out.width = outSize;
    out.height = outSize + 64;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#05070e';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.imageSmoothingEnabled = !pixelSharp;
    ctx.drawImage(srcCanvas, 0, 0, outSize, outSize);

    const w = currentFrame.width || 64;
    const h = currentFrame.height || 64;
    const sx = outSize / w;
    const sy = outSize / h;

    // Draw Epoch-1 crosshair + trail
    const ep1Pix = data.frames[0]?.targetRefPixel || data.frames[0]?.targetPixel;
    if (showEpoch1Crosshair && ep1Pix) {
      ctx.strokeStyle = 'rgba(255, 185, 0, 0.85)';
      ctx.lineWidth = 1.5;
      const cx = ep1Pix.x * sx;
      const cy = ep1Pix.y * sy;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy);
      ctx.lineTo(cx - 4, cy);
      ctx.moveTo(cx + 4, cy);
      ctx.lineTo(cx + 12, cy);
      ctx.moveTo(cx, cy - 12);
      ctx.lineTo(cx, cy - 4);
      ctx.moveTo(cx, cy + 4);
      ctx.lineTo(cx, cy + 12);
      ctx.stroke();
    }

    if (showMotionTrail) {
      const trailPts = data.frames
        .slice(0, currentFrameIdx + 1)
        .map((f) => f.targetRefPixel || f.targetPixel)
        .filter((p): p is { x: number; y: number } => Boolean(p));
      if (trailPts.length > 1) {
        ctx.strokeStyle = '#00D3F3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        trailPts.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x * sx, p.y * sy);
          else ctx.lineTo(p.x * sx, p.y * sy);
        });
        ctx.stroke();
      }
      const curPix = currentFrame.targetRefPixel || currentFrame.targetPixel;
      if (curPix) {
        ctx.strokeStyle = '#00D3F3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(curPix.x * sx, curPix.y * sy, 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Footer provenance strip
    ctx.fillStyle = '#0c1220';
    ctx.fillRect(0, outSize, outSize, 64);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(
      `SPHEREx ${currentFrame.detector} (${currentFrame.wavelengthUm} um) | ${currentFrame.obsId}`,
      14,
      outSize + 24
    );
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(
      `RA ${data.targetCoords.ra.toFixed(4)} Dec ${data.targetCoords.dec.toFixed(4)} | MJD ${currentFrame.mjd.toFixed(4)} | ${currentFrame.dateObs}`,
      14,
      outSize + 45
    );

    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = `spherex_${currentFrame.obsId}_${currentFrame.detector}_f${currentFrameIdx + 1}.png`;
    a.click();
  };

  if (loading) {
    const progressText =
      loadingProgress && loadingProgress.total > 0
        ? `Loading frames: ${loadingProgress.loaded} of ${loadingProgress.total} frames (${loadingProgress.phase || 'cutouts'})...`
        : loadingProgress?.phase === 'tap'
        ? 'Querying IRSA SPHEREx TAP (spherex.artifact + spherex.plane)...'
        : 'Querying IRSA TAP, resolving cutouts, and reprojecting onto common WCS...';
    return (
      <SkeletonSky
        label="SPHEREx MULTI-EPOCH TIME-SERIES"
        sublabel={progressText}
        aspectRatio="video"
        className={className}
      />
    );
  }

  if (state === 'NETWORK_ERROR' || error) {
    return (
      <ErrorState
        title="Time-Series Archive Unreachable"
        error={error || 'Failed to retrieve multi-epoch exposures from NASA/IPAC IRSA.'}
        onRetry={fetchTimeSeries}
        className={className}
      />
    );
  }

  if (state === 'ARCHIVE_ZERO_ROWS' || !data || data.frames.length === 0) {
    return (
      <EmptyState
        title="Zero Time-Series Observations at Requested Coordinates"
        description={
          data?.message ||
          'No SPHEREx exposures covering these celestial coordinates were returned by IRSA SPHEREx TAP.'
        }
        className={className}
      />
    );
  }

  const activeFrameList = displayFrames;
  const safeFrameIdx = Math.min(currentFrameIdx, Math.max(0, activeFrameList.length - 1));
  const currentFrame = activeFrameList[safeFrameIdx] || activeFrameList[0];
  const frameW = currentFrame.width || 64;
  const frameH = currentFrame.height || 64;
  const pairInfo = data.temporalPairs?.[Math.min(safeFrameIdx, Math.max(0, (data.temporalPairs?.length || 1) - 1))];
  const activeReleaseLabel = (currentFrame.release || data.activeRelease || 'public').toUpperCase();
  const activeVersionLabel = currentFrame.version || data.activeVersion || '—';
  const hasMixedReleasesInFrames = frameReleaseGroups.size > 1;
  const hasMixedReleasesServer = Boolean(data.mixedReleasesDetected && !selectedReleaseKey);

  const cadenceDescription = (() => {
    if (!pairInfo) return 'Single observation epoch';
    if (pairInfo.baselineType === 'INTRA_VISIT') {
      return isRtl
        ? 'لقطات متتابعة خلال نفس التمريرة (دقائق معدودة)'
        : 'Minutes apart (intra-visit exposures in same slew pass)';
    }
    if (pairInfo.baselineType === 'INDEPENDENT_VISIT') {
      return isRtl
        ? 'زيارات رصدية مستقلة (ساعات أو أيام مختلفة)'
        : 'Independent observation visits (hours to days apart)';
    }
    return isRtl
      ? 'أشهر متباعدة (مسح شامل للسماء)'
      : 'Months apart (all-sky survey epochs — ideal for proper motion)';
  })();

  const activeClassification = normalizeSourceClassification(data.sourceClassification, {
    sourceMode: data.sourceMode,
    isSnapshot: Boolean(data.isSnapshot),
    isDemoCopy: Boolean(data.isDemoCopy),
    tapFreshness: data.tapFreshness,
    cacheIntegrityVerified: data.cacheIntegrityVerified,
    someCached:
      Boolean(data.cachedFrameCount && data.cachedFrameCount > 0) ||
      Boolean(currentFrame.isCached),
    status: data.status,
    state: data.state,
  });
  const classificationMeta = getSourceClassificationMeta(activeClassification, language);
  const effectiveDiscoveryEligible =
    typeof data.discoveryEligible === 'boolean'
      ? data.discoveryEligible
      : classificationMeta.discoveryEligible;

  // Build Centroid vs Time series values for SVG chart (P0.3 & Task 2 exact PM offset)
  const mjd0 = data.frames[0]?.mjd ?? 0;
  const centroidSeries = data.frames.map((fr, idx) => {
    const dtDays = fr.mjd - mjd0;
    const cent = fr.measuredCentroid;
    const ep0Ref = data.frames[0]?.targetRefPixel;
    const curRef = fr.targetRefPixel;
    let predDxArcsec = 0;
    let predDyArcsec = 0;
    if (data.properMotion) {
      const exp = computeExpectedProperMotionOffset(
        data.properMotion.pmRaMasYr,
        data.properMotion.pmDecMasYr,
        mjd0,
        fr.mjd
      );
      predDxArcsec = exp.dxArcsec;
      predDyArcsec = exp.dyArcsec;
    } else if (ep0Ref && curRef && data.referenceWcs) {
      const sky0 = WCS.pixToSky(ep0Ref.x, ep0Ref.y, data.referenceWcs);
      const skyCur = WCS.pixToSky(curRef.x, curRef.y, data.referenceWcs);
      let dRaDeg = skyCur.ra - sky0.ra;
      if (dRaDeg > 180) dRaDeg -= 360;
      if (dRaDeg < -180) dRaDeg += 360;
      predDxArcsec = dRaDeg * Math.cos((sky0.dec * Math.PI) / 180) * 3600;
      predDyArcsec = (skyCur.dec - sky0.dec) * 3600;
    }
    const totalOffsetArcsec = cent ? Math.hypot(cent.dxArcsec, cent.dyArcsec) : 0;
    return {
      idx,
      dtDays,
      dxArcsec: cent?.dxArcsec ?? 0,
      dyArcsec: cent?.dyArcsec ?? 0,
      errArcsec: cent?.uncertaintyArcsec ?? 0.5,
      snr: cent?.snr,
      stacked: cent?.stacked ?? false,
      predDxArcsec,
      predDyArcsec,
      totalOffsetArcsec,
      valid: cent?.valid ?? false,
      releaseLabel: (fr.release || data.activeRelease || 'public').toUpperCase(),
      versionLabel: fr.version || data.activeVersion || '—',
      refStarsUsed: cent?.refStarsUsed,
      maskedReason: cent?.maskedReason,
    };
  });

  const maxSpanDays = Math.max(0.01, centroidSeries[centroidSeries.length - 1]?.dtDays ?? 1);
  const validCentroids = centroidSeries.filter((c) => c.valid);
  const maxArcsecExtent = Math.max(
    1.5,
    ...centroidSeries.map((c) =>
      Math.max(
        c.valid ? Math.abs(c.dxArcsec) + c.errArcsec : 0,
        c.valid ? Math.abs(c.dyArcsec) + c.errArcsec : 0,
        Math.abs(c.predDxArcsec),
        Math.abs(c.predDyArcsec)
      )
    )
  );

  // Epoch 1 anchor pixel & current trail
  const epoch1Anchor = data.frames[0]?.targetRefPixel || data.frames[0]?.targetPixel;
  const trailPoints = data.frames
    .slice(0, currentFrameIdx + 1)
    .map((f) => f.targetRefPixel || f.targetPixel)
    .filter((p): p is { x: number; y: number } => Boolean(p));
  const currentTargetPix = currentFrame.targetRefPixel || currentFrame.targetPixel;

  return (
    <div
      ref={containerRef}
      className={`obs-glass rounded-2xl p-3 sm:p-4 flex flex-col gap-3 overflow-hidden ${className}`}
    >
      {/* Honest Demo Copy Warning Banner (never pretend demo field is user field) */}
      {data.isDemoCopy && (
        <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-mono flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">{explorerMode ? t.explorerBadgeTrainingCopy : 'DEMO COPY (DIFFERENT FIELD)'}: </span>
            {data.demoNotice ||
              `Showing cached NEP field at RA ${data.trueCenter?.ra.toFixed(4)}°, Dec ${data.trueCenter?.dec.toFixed(4)}° (obs ${currentFrame.trueObsId || currentFrame.obsId}).`}
          </div>
        </div>
      )}

      {/* Honest Partial Cutout Failures Notice (B2) */}
      {!explorerMode && data.partialFailures && data.partialFailures.failedCount > 0 && (
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] font-mono flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{data.partialFailures.notice}</span>
        </div>
      )}

      {/* P1-2 & Task 3: Mixed Release / Processing Version Guard Warning */}
      {!explorerMode && (hasMixedReleasesInFrames || hasMixedReleasesServer || sameReleaseOnly) && (
        <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-[11px] font-mono flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {sameReleaseOnly
                ? `Showing same-release/VERSION subset (${activeReleaseLabel} · ${activeVersionLabel}) for consistent Diff & Stack.`
                : hasMixedReleasesInFrames
                ? `Mixed SPHEREx releases/versions (${Array.from(frameReleaseGroups.keys())
                    .map((k) => k.replace('::', ' '))
                    .join(', ')}): Astrometry & Blink span the full baseline; Diff & Stack use only matching release & VERSION.`
                : `Multiple archive releases/versions found (${
                    Array.isArray(data.releaseBreakdown) ? data.releaseBreakdown.join(', ') : ''
                  }); full baseline shown for Astrometry & Blink.`}
            </span>
          </div>
          {sameReleaseOnly ? (
            <button
              type="button"
              onClick={() => {
                setSameReleaseOnly(false);
                setSelectedReleaseKey(null);
                setCurrentFrameIdx(0);
              }}
              className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] cursor-pointer"
            >
              Restore full baseline (all releases)
            </button>
          ) : (
            (hasMixedReleasesInFrames || hasMixedReleasesServer) &&
            primaryReleaseKey && (
              <button
                type="button"
                onClick={() => {
                  setSameReleaseOnly(true);
                  setSelectedReleaseKey(null);
                  setCurrentFrameIdx(0);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] cursor-pointer"
              >
                Use same-release subset ({primaryReleaseKey.replace('::', ' ').toUpperCase()})
              </button>
            )
          )}
        </div>
      )}

      {/* Honest Provenance Warning Strip for non-live / stale / benchmark views */}
      {!effectiveDiscoveryEligible && !data.isDemoCopy && (
        <div
          data-testid="provenance-nonlive-banner"
          className={`p-2.5 rounded-xl border text-xs font-mono flex items-start gap-2 ${
            activeClassification === 'STALE_TAP_CACHE'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
              : activeClassification === 'SAVED_BENCHMARK'
              ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold">
              {classificationMeta.badgeLabel} · {t.provenanceDiscoveryBlocked}
            </div>
            <div className="text-[11px] opacity-90">
              {data.discoveryEligibilityReason ||
                (activeClassification === 'STALE_TAP_CACHE'
                  ? t.provenanceStaleBanner
                  : activeClassification === 'SAVED_BENCHMARK'
                  ? t.provenanceSnapshotBanner
                  : classificationMeta.description)}
            </div>
          </div>
        </div>
      )}

      {/* Top Row (A3 Default Visible — Scientist Mode only): Source Badge, Detector (D1-D6 Auto), Normal/Show changes toggle, Advanced Drawer toggle */}
      {!explorerMode && (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={activeClassification}
            customText={classificationMeta.badgeLabel}
            size="sm"
          />
          <span className="font-mono text-xs text-[#00D3F3] font-bold">
            EPOCH {safeFrameIdx + 1} / {activeFrameList.length}
          </span>
          <span
            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
              effectiveDiscoveryEligible
                ? activeClassification === 'VERIFIED_FITS_CACHE'
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
            }`}
          >
            {effectiveDiscoveryEligible
              ? isRtl
                ? 'مؤهل للاكتشاف'
                : 'DISCOVERY ELIGIBLE'
              : isRtl
              ? 'مرجع غير مباشر'
              : 'NOT FOR LIVE DISCOVERY'}
          </span>
          <span className="px-2 py-0.5 rounded font-mono text-[10px] border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
            {activeReleaseLabel} · VER {activeVersionLabel}
          </span>
          {data.totalExposuresFound != null && (
            <span className="text-[11px] font-mono text-slate-400">
              ({data.totalExposuresFound} exposures)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Detector Dropdown: Default Auto + D1..D6 */}
          <div className="flex items-center gap-1.5 bg-[#05070E] px-2 py-1 rounded-xl border border-white/10 text-xs font-mono">
            <Layers className="w-3.5 h-3.5 text-[#FFB900]" aria-hidden="true" />
            <select
              value={selectedDetector}
              onChange={(e) => {
                const det = e.target.value;
                setSelectedDetector(det);
                onDetectorChange?.(det);
              }}
              aria-label="Select SPHEREx detector array (D1 to D6 or Auto)"
              title="Choose SPHEREx detector array (Auto picks widest temporal baseline)"
              className="bg-transparent text-slate-100 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB900] rounded cursor-pointer"
            >
              <option value="" className="bg-[#0B101D] text-slate-100">
                Auto ({data.selectedDetector || 'Best D1–D6'})
              </option>
              {['D1', 'D2', 'D3', 'D4', 'D5', 'D6'].map((detId) => {
                const summary = data.availableDetectors?.find((d) => d.detector === detId);
                return (
                  <option key={detId} value={detId} className="bg-[#0B101D] text-slate-100">
                    {detId}
                    {summary
                      ? ` (${summary.wavelengthRangeUm[0]}–${summary.wavelengthRangeUm[1]} µm · ${summary.exposureCount} exp)`
                      : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Single Default View Toggle: Normal vs Show changes (Difference vs Epoch 1) */}
          <div
            role="group"
            aria-label="View mode toggle"
            className="flex items-center gap-1 bg-[#05070E] p-0.5 rounded-xl border border-white/10 text-xs font-mono"
          >
            <button
              type="button"
              onClick={() => setRenderMode('raw')}
              aria-pressed={renderMode === 'raw'}
              title="Show calibrated sky brightness frames"
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900] ${
                renderMode === 'raw'
                  ? 'bg-[#FFB900] text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.viewNormal}
            </button>
            <button
              type="button"
              onClick={() => setRenderMode('diff_ref')}
              aria-pressed={renderMode === 'diff_ref'}
              title="Subtract Epoch 1 to highlight moving sources and brightness changes"
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900] ${
                renderMode === 'diff_ref'
                  ? 'bg-[#00D3F3] text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.viewShowChanges}
            </button>
          </div>

          {/* Collapsed "Advanced" Drawer Toggle (persisted in localStorage) */}
          <button
            type="button"
            onClick={toggleAdvanced}
            aria-expanded={advancedOpen}
            aria-controls="spex-advanced-drawer"
            title="Show or hide Advanced Display, Overlays, Analysis, and Export controls"
            className={`px-2.5 py-1 rounded-xl border font-mono text-xs flex items-center gap-1.5 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900] ${
              advancedOpen
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 font-semibold'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.advancedControls}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
      )}

      {/* Collapsed "Advanced" Drawer (A3: Display, Overlays, Analysis, Export) */}
      {!explorerMode && advancedOpen && (
        <div
          id="spex-advanced-drawer"
          data-tour="advanced_drawer"
          className="p-3 rounded-xl bg-[#050811] border border-white/10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-[11px] font-mono"
        >
          {/* Section 1: Display */}
          <div className="space-y-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] uppercase tracking-wider font-bold text-[#FFB900]">
              {t.sectionDisplay}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400" title="Scaling curve applied to infrared pixel intensities">
                Stretch:
              </span>
              <select
                value={stretchMode}
                onChange={(e) => setStretchMode(e.target.value as PlayerStretchMode)}
                aria-label="Stretch function"
                className="bg-black/60 border border-white/15 rounded-lg px-2 py-0.5 text-slate-100 cursor-pointer"
              >
                <option value="asinh">Asinh</option>
                <option value="linear">Linear</option>
                <option value="sqrt">Sqrt</option>
                <option value="log">Log</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400" title="Intensity contrast multiplier">
                Contrast ({contrastFactor.toFixed(2)}x):
              </span>
              <input
                type="range"
                min={0.5}
                max={3.0}
                step={0.05}
                value={contrastFactor}
                onChange={(e) => setContrastFactor(parseFloat(e.target.value))}
                aria-label="Advanced contrast slider"
                className="w-24 accent-[#FFB900] cursor-pointer"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setGlobalScaleEnabled((v) => !v)}
                aria-pressed={globalScaleEnabled}
                title="Lock 2–98% percentiles across all frames in band vs scale each frame independently"
                className={`px-2 py-1 rounded-lg border transition cursor-pointer ${
                  globalScaleEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                {globalScaleEnabled ? 'Global p02–p98' : 'Per-Frame Auto'}
              </button>
              <button
                type="button"
                onClick={() => setPixelSharp((v) => !v)}
                aria-pressed={pixelSharp}
                title="Toggle nearest-neighbor raw detector pixels vs smooth bilinear interpolation"
                className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white cursor-pointer"
              >
                {pixelSharp ? 'Pixel-Sharp' : 'Smooth'}
              </button>
              <button
                type="button"
                onClick={() => setShowPixelGrid((v) => !v)}
                aria-pressed={showPixelGrid}
                title="Show 6.2 arcsec/pixel detector grid lines"
                className={`px-2 py-1 rounded-lg border cursor-pointer ${
                  showPixelGrid
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                Pixel Grid
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 mr-1">Zoom:</span>
              {[1, 2, 4, 8].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoom(z)}
                  aria-pressed={zoom === z}
                  className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                    zoom === z
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {z}x
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Overlays */}
          <div className="space-y-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] uppercase tracking-wider font-bold text-[#00D3F3]">
              {t.sectionOverlays}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setShowEpoch1Crosshair((v) => !v)}
                aria-pressed={showEpoch1Crosshair}
                title="Pin fixed amber crosshair at Epoch-1 coordinates"
                className={`px-2 py-1 rounded-lg border cursor-pointer ${
                  showEpoch1Crosshair
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                Epoch-1 Crosshair
              </button>
              <button
                type="button"
                onClick={() => setShowMotionTrail((v) => !v)}
                aria-pressed={showMotionTrail}
                title="Overlay predicted proper-motion track and measured centroid reticle"
                className={`px-2 py-1 rounded-lg border cursor-pointer ${
                  showMotionTrail
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                PM Marker &amp; Trail
              </button>
              <button
                type="button"
                onClick={() => setShowCatalogOverlay((v) => !v)}
                aria-pressed={showCatalogOverlay}
                title="Overlay Gaia DR3 (circles) and AllWISE (diamonds) catalog stars"
                className={`px-2 py-1 rounded-lg border cursor-pointer ${
                  showCatalogOverlay
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                Gaia/AllWISE ({data.catalogOverlays?.length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setShowDqOverlay((v) => !v)}
                aria-pressed={showDqOverlay}
                title="Highlight SPHEREx Level-2 FLAGS pixels (cosmic rays, saturation, outliers)"
                className={`px-2 py-1 rounded-lg border cursor-pointer ${
                  showDqOverlay
                    ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                DQ Flags ({currentFrame.dqDecoded?.totalMaskedPixels ?? 0})
              </button>
            </div>
          </div>

          {/* Section 3: Analysis */}
          <div className="space-y-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-400">
              {t.sectionAnalysis}
            </div>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: 'raw', label: 'Raw' },
                  { id: 'diff_ref', label: 'Diff vs Ep1' },
                  { id: 'diff_median', label: 'Diff vs Median' },
                  { id: 'coadd', label: 'Co-add Stack' },
                ] as Array<{ id: PlayerRenderMode; label: string }>
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setRenderMode(m.id)}
                  aria-pressed={renderMode === m.id}
                  title={`Render mode: ${m.label}`}
                  className={`px-2 py-0.5 rounded-lg border cursor-pointer ${
                    renderMode === m.id
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                      : 'border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFrameMode(frameMode === 'sky' ? 'target' : 'sky')}
                title="Switch between fixed sky WCS grid (target moves) and target-centered grid (background stars drift)"
                className="px-2 py-0.5 rounded-lg border border-white/15 bg-black/50 text-slate-200 hover:border-amber-400/50 cursor-pointer"
              >
                {frameMode === 'sky' ? 'Grid: Sky-Fixed' : 'Grid: Target-Centered'}
              </button>
              <button
                type="button"
                onClick={() => setBlinkFirstLast((b) => !b)}
                disabled={data.frames.length < 2}
                aria-pressed={blinkFirstLast}
                title="Blink between Epoch 1 and the last epoch (Shortcut: B)"
                className={`px-2 py-0.5 rounded-lg border cursor-pointer disabled:opacity-40 ${
                  blinkFirstLast
                    ? 'bg-[#FFB900] text-slate-950 border-[#FFB900] font-bold'
                    : 'border-white/15 text-slate-300'
                }`}
              >
                Blink 1↔Last
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-slate-400 flex items-center gap-1" title="Filter exposures by wavelength window">
                <span>λ:</span>
                <select
                  value={wavelengthWindow}
                  onChange={(e) => setWavelengthWindow(e.target.value)}
                  aria-label="Wavelength window filter"
                  className="bg-black/60 border border-white/15 rounded px-1.5 py-0.5 text-slate-100 cursor-pointer"
                >
                  <option value="all">All (0.75–5.0 µm)</option>
                  <option value="0.75-1.65">0.75–1.65 µm</option>
                  <option value="1.65-3.84">1.65–3.84 µm</option>
                  <option value="3.84-5.00">3.84–5.00 µm</option>
                </select>
              </label>
              <div className="flex items-center gap-1" title="Maximum frames to load in time series">
                <span className="text-slate-400">N:</span>
                {([10, 20, 40] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setFrameCount(cnt)}
                    aria-pressed={frameCount === cnt}
                    className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                      frameCount === cnt
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                        : 'border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>
            {onSelectFovSize && (
              <div className="flex items-center gap-1 pt-0.5" title="Cutout Field of View">
                <span className="text-slate-400">FOV:</span>
                {[
                  { label: "3.3'", sizePix: 32 },
                  { label: "6.6'", sizePix: 64 },
                  { label: "11.6'", sizePix: 112 },
                  { label: "16.5'", sizePix: 160 },
                ].map((fov) => (
                  <button
                    key={fov.sizePix}
                    type="button"
                    onClick={() => onSelectFovSize(fov.sizePix)}
                    aria-pressed={sizePix === fov.sizePix}
                    className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                      sizePix === fov.sizePix
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                        : 'border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {fov.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Export */}
          <div className="space-y-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] uppercase tracking-wider font-bold text-rose-300">
              {t.sectionExport}
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={handleExportPng}
                title="Download current frame with overlays and provenance stamp as PNG"
                className="px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download PNG Snapshot</span>
              </button>
              {onOpenPostcard && (
                <button
                  type="button"
                  onClick={onOpenPostcard}
                  title="Generate a shareable Discovery Postcard"
                  className="px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#00D3F3]" aria-hidden="true" />
                  <span>Discovery Postcard</span>
                </button>
              )}
              <div className="flex flex-wrap gap-1.5">
                {onOpenDetectorStacking && (
                  <button
                    type="button"
                    onClick={onOpenDetectorStacking}
                    title="Inspect per-detector inverse-variance co-add stacks"
                    className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white cursor-pointer"
                  >
                    Co-add Stacks
                  </button>
                )}
                {onOpenProvenance && (
                  <button
                    type="button"
                    onClick={onOpenProvenance}
                    title="View FITS provenance & release metadata"
                    className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white cursor-pointer"
                  >
                    Provenance
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Sky Viewport + Synchronized SVG Overlay */}
      <div
        data-tour="viewport_canvas"
        className={`relative w-full ${
          explorerMode ? 'h-72 sm:h-[400px]' : 'h-72 sm:h-96'
        } rounded-xl bg-black border border-white/10 overflow-auto flex items-center justify-center`}
      >
        <div
          className="relative shrink-0"
          style={
            explorerMode
              ? {
                  width: 'min(100%, 360px)',
                  height: 'min(100%, 360px)',
                  aspectRatio: '1 / 1',
                }
              : {
                  width: `${Math.round(288 * zoom)}px`,
                  height: `${Math.round(288 * zoom)}px`,
                }
          }
        >
          <canvas
            ref={canvasRef}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (!rect.width || !rect.height) return;
              const px = ((e.clientX - rect.left) / rect.width) * frameW;
              const py = ((e.clientY - rect.top) / rect.height) * frameH;
              inspectSpotAtPixel(px, py);
            }}
            className="w-full h-full block cursor-crosshair"
            style={{ imageRendering: pixelSharp ? 'pixelated' : 'auto' }}
            aria-label={`SPHEREx infrared cutout canvas for frame ${currentFrameIdx + 1}`}
          />

          {/* Synchronized SVG Astrometric Overlay */}
          <svg
            viewBox={`0 0 ${frameW} ${frameH}`}
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
          >
            {/* Optional 6.2"/px Pixel Grid */}
            {showPixelGrid && (
              <g stroke="rgba(255,255,255,0.14)" strokeWidth={0.12}>
                {Array.from({ length: Math.floor(frameW / 4) }, (_, idx) => {
                  const pos = (idx + 1) * 4;
                  return (
                    <React.Fragment key={pos}>
                      <line x1={pos} y1={0} x2={pos} y2={frameH} />
                      <line x1={0} y1={pos} x2={frameW} y2={pos} />
                    </React.Fragment>
                  );
                })}
              </g>
            )}

            {/* Gaia DR3 & AllWISE Catalog Overlays */}
            {showCatalogOverlay &&
              data.catalogOverlays?.map((cat, idx) => {
                if (cat.x < 0 || cat.x > frameW || cat.y < 0 || cat.y > frameH) return null;
                const isGaia = cat.catalog === 'Gaia DR3';
                return (
                  <g key={`${cat.identifier}-${idx}`}>
                    {isGaia ? (
                      <circle
                        cx={cat.x}
                        cy={cat.y}
                        r={1.4}
                        fill="none"
                        stroke="#38BDF8"
                        strokeWidth={0.28}
                        opacity={0.8}
                      />
                    ) : (
                      <rect
                        x={cat.x - 1.2}
                        y={cat.y - 1.2}
                        width={2.4}
                        height={2.4}
                        fill="none"
                        stroke="#34D399"
                        strokeWidth={0.26}
                        transform={`rotate(45 ${cat.x} ${cat.y})`}
                        opacity={0.8}
                      />
                    )}
                  </g>
                );
              })}

            {/* Fixed Epoch-1 Crosshair */}
            {showEpoch1Crosshair && epoch1Anchor && (
              <g stroke="#FFB900" strokeWidth={0.32} opacity={0.9}>
                <line x1={epoch1Anchor.x - 3} y1={epoch1Anchor.y} x2={epoch1Anchor.x - 0.8} y2={epoch1Anchor.y} />
                <line x1={epoch1Anchor.x + 0.8} y1={epoch1Anchor.y} x2={epoch1Anchor.x + 3} y2={epoch1Anchor.y} />
                <line x1={epoch1Anchor.x} y1={epoch1Anchor.y - 3} x2={epoch1Anchor.x} y2={epoch1Anchor.y - 0.8} />
                <line x1={epoch1Anchor.x} y1={epoch1Anchor.y + 0.8} x2={epoch1Anchor.x} y2={epoch1Anchor.y + 3} />
              </g>
            )}

            {/* Accumulating Proper-Motion Trail + Active Frame Reticle */}
            {showMotionTrail && trailPoints.length > 0 && (
              <g>
                {trailPoints.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#00D3F3"
                    strokeWidth={0.35}
                    strokeDasharray="0.8 0.5"
                    points={trailPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  />
                )}
                {trailPoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={0.45} fill="#00D3F3" opacity={0.75} />
                ))}
                {currentTargetPix && (
                  <circle
                    cx={currentTargetPix.x}
                    cy={currentTargetPix.y}
                    r={2.1}
                    fill="none"
                    stroke="#00D3F3"
                    strokeWidth={0.35}
                  />
                )}
              </g>
            )}

            {/* Measured Centroid Marker for current frame */}
            {currentFrame.measuredCentroid?.valid && (
              <circle
                cx={currentFrame.measuredCentroid.x}
                cy={currentFrame.measuredCentroid.y}
                r={0.85}
                fill="none"
                stroke="#F43F5E"
                strokeWidth={0.3}
              />
            )}

            {/* Tapped Spot Reticle */}
            {tappedPix && (
              <g stroke="#FACC15" strokeWidth={0.35}>
                <circle cx={tappedPix.x} cy={tappedPix.y} r={1.8} fill="none" />
                <circle cx={tappedPix.x} cy={tappedPix.y} r={0.3} fill="#FACC15" />
              </g>
            )}

            {/* SPEX Animated Highlight Rings */}
            {spexHighlights.map((h, i) => (
              <g key={`spex-ring-${i}`}>
                <circle
                  cx={h.x}
                  cy={h.y}
                  r={h.r || 3.2}
                  fill="none"
                  stroke="#FFB900"
                  strokeWidth={0.45}
                >
                  <animate attributeName="r" values={`${(h.r || 3) * 0.85};${(h.r || 3) * 1.35};${(h.r || 3) * 0.85}`} dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
                </circle>
                <line
                  x1={h.x + (h.r || 3.2)}
                  y1={Math.max(0, h.y - (h.r || 3.2))}
                  x2={h.x + 1.2}
                  y2={h.y - 1.2}
                  stroke="#FFB900"
                  strokeWidth={0.35}
                />
              </g>
            ))}
          </svg>

          {/* Crisp HTML Labels for SPEX Highlights ("SPEX points here") */}
          {spexHighlights.map((h, i) => (
            <div
              key={`spex-lbl-${i}`}
              data-testid="spex-canvas-highlight"
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-full px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-bold text-[10px] shadow-md whitespace-nowrap"
              style={{
                left: `${(h.x / frameW) * 100}%`,
                top: `${Math.max(8, ((h.y - (h.r || 3)) / frameH) * 100)}%`,
              }}
            >
              {h.label || (isRtl ? 'سبيكس يشير هنا' : 'SPEX points here')}
            </div>
          ))}
        </div>

        {/* Fixed HUD: Coordinates, Detector, Wavelength */}
        {!explorerMode ? (
          <div className="absolute top-2 left-2 pointer-events-none bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 font-mono text-[10px] text-[#00D3F3]">
            RA {data.targetCoords.ra.toFixed(4)}° · DEC {data.targetCoords.dec >= 0 ? '+' : ''}
            {data.targetCoords.dec.toFixed(4)}° · {currentFrame.detector} · λ {currentFrame.wavelengthUm.toFixed(2)} µm
          </div>
        ) : (
          <div className="absolute top-2 left-2 pointer-events-none bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 font-mono text-[11px] text-[#00D3F3]">
            {currentFrame.dateObs?.slice(0, 10)} · {safeFrameIdx + 1}/{activeFrameList.length}
          </div>
        )}

        {/* Top-Right Viewport Action: "Explain this spot" */}
        {onSpotSelect && (
          <button
            type="button"
            data-testid="explain-this-spot-btn"
            onClick={() => {
              const target = tappedPix || currentTargetPix || { x: Math.floor(frameW / 2), y: Math.floor(frameH / 2) };
              inspectSpotAtPixel(target.x, target.y);
            }}
            className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 hover:bg-amber-400 hover:text-slate-950 border border-amber-400/50 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer backdrop-blur-md"
          >
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>{t.explainThisSpotBtn}</span>
          </button>
        )}

        {/* Fixed HUD: Obs ID & MJD (Scientist) */}
        {!explorerMode && (
          <div className="absolute bottom-2 left-2 pointer-events-none bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 font-mono text-[10px] text-[#F1F5F9]">
            {currentFrame.obsId} · MJD {currentFrame.mjd.toFixed(5)} · {currentFrame.dateObs}
          </div>
        )}

        {/* Explorer subtle tap hint */}
        {explorerMode && (
          <div className="absolute bottom-2 left-2 pointer-events-none bg-black/70 px-2 py-0.5 rounded-md border border-white/10 text-[10px] text-slate-300">
            {t.explorerTapHint}
          </div>
        )}

        {/* Angular Scale Bar (5 px = 31") */}
        {!explorerMode && (
          <div className="absolute bottom-2 right-2 pointer-events-none bg-black/75 px-2 py-1 rounded-lg border border-white/10 font-mono text-[10px] text-slate-300 flex items-center gap-1.5">
            <span className="inline-block w-8 h-0.5 bg-amber-400" />
            <span>31″ (5 px · 6.2″/px)</span>
          </div>
        )}
      </div>

      {/* EXPLORER MODE: Exactly 3 Big Buttons + Plain Sentence + Friendly Badge + Plain Honesty Labels + Learn/More links */}
      {explorerMode ? (
        <div className="flex flex-col gap-3">
          {/* (c) Exactly three big buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              data-testid="explorer-play-btn"
              onClick={() => {
                setIsPlaying((p) => {
                  const next = !p;
                  if (next) onExplorerPlay?.();
                  return next;
                });
              }}
              aria-pressed={isPlaying}
              className={`min-h-[48px] px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm ${
                isPlaying
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-[#FFB900] hover:bg-amber-400 text-slate-950'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 shrink-0" /> : <Play className="w-4 h-4 shrink-0 fill-current" />}
              <span>{isPlaying ? t.explorerBtnPauseSky : t.explorerBtnPlaySky}</span>
            </button>

            <button
              type="button"
              data-testid="explorer-diff-btn"
              onClick={() => {
                setRenderMode((prev) => {
                  const next = prev === 'diff_ref' ? 'raw' : 'diff_ref';
                  onExplorerToggleDiff?.(next === 'diff_ref');
                  return next;
                });
              }}
              aria-pressed={renderMode === 'diff_ref'}
              className={`min-h-[48px] px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition cursor-pointer ${
                renderMode === 'diff_ref'
                  ? 'bg-[#00D3F3] border-[#00D3F3] text-slate-950 shadow-sm'
                  : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/40 text-cyan-200'
              }`}
            >
              <Zap className="w-4 h-4 shrink-0" />
              <span>{renderMode === 'diff_ref' ? t.explorerBtnShowingChanges : t.explorerBtnShowChanged}</span>
            </button>

            <button
              type="button"
              data-testid="explorer-ask-spex-btn"
              onClick={() => onAskSpex?.()}
              className="min-h-[48px] px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-amber-400/40 bg-white/5 hover:bg-white/10 text-amber-300 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{t.explorerBtnAskSpex}</span>
            </button>
          </div>

          {/* (d) One plain sentence under the image + friendly data badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] border border-white/10 px-3.5 py-2.5 text-sm">
            <p className="text-slate-200 leading-relaxed">
              {t.explorerSentencePrefix}{' '}
              <span className="font-bold text-white">{targetLabel || caseId || 'this sky patch'}</span>.{' '}
              {t.explorerSentenceSuffix}
            </p>
            <span
              data-testid="explorer-data-badge"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0 ${
                activeClassification === 'SYNTHETIC_DEMO'
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-200'
                  : activeClassification === 'STALE_TAP_CACHE'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                  : activeClassification === 'SAVED_BENCHMARK'
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
                  : activeClassification === 'VERIFIED_FITS_CACHE'
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                  : activeClassification === 'UNAVAILABLE'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  activeClassification === 'SYNTHETIC_DEMO'
                    ? 'bg-orange-400'
                    : activeClassification === 'STALE_TAP_CACHE'
                    ? 'bg-amber-400'
                    : activeClassification === 'SAVED_BENCHMARK'
                    ? 'bg-indigo-400'
                    : activeClassification === 'VERIFIED_FITS_CACHE'
                    ? 'bg-cyan-400'
                    : activeClassification === 'UNAVAILABLE'
                    ? 'bg-rose-400'
                    : 'bg-emerald-400'
                }`}
              />
              {activeClassification === 'SYNTHETIC_DEMO'
                ? t.explorerBadgeTrainingCopy
                : activeClassification === 'SAVED_BENCHMARK'
                ? `${t.explorerBadgeSavedCopy} ${(data.snapshotTakenAt || data.cachedAt || currentFrame.dateObs || '').slice(0, 10)}`
                : activeClassification === 'STALE_TAP_CACHE'
                ? t.provenanceStaleTap
                : activeClassification === 'VERIFIED_FITS_CACHE'
                ? t.provenanceVerifiedCache
                : activeClassification === 'UNAVAILABLE'
                ? t.provenanceUnavailable
                : t.explorerBadgeLiveNasa}
            </span>
          </div>

          {/* Plain-word Honesty Labels (keep scientific honesty in beginner language) */}
          {data.astrometrySummary && (
            <div className="flex flex-col gap-1.5 rounded-xl bg-black/40 border border-white/10 px-3.5 py-2.5 text-xs text-slate-300">
              {data.astrometrySummary.saturatedAllDetectors ? (
                <div className="flex flex-wrap items-center gap-1.5 text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.explorerHonestySaturated}</span>
                  <ScienceTerm termKey="saturated" language={language} onOpenDictionary={onOpenDictionary} />
                </div>
              ) : !data.astrometrySummary.targetDetectedInDetector ? (
                <div className="flex flex-wrap items-center gap-1.5 text-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.explorerHonestyNotDetected}</span>
                  <ScienceTerm termKey="centroid" language={language} onOpenDictionary={onOpenDictionary} />
                </div>
              ) : data.astrometrySummary.motionSignificant ? (
                <div className="flex flex-wrap items-center gap-1.5 text-emerald-300">
                  <span>{t.explorerHonestySignificant}</span>
                  <ScienceTerm termKey="proper_motion" language={language} onOpenDictionary={onOpenDictionary} />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 text-amber-200">
                  <span>{t.explorerHonestyNotSignificant}</span>
                  <ScienceTerm termKey="sigma" language={language} onOpenDictionary={onOpenDictionary} />
                </div>
              )}
              {(data.astrometrySummary.errorBudgetLabel === 'includes wing-fit frames, low confidence' ||
                (data.astrometrySummary.wingFitCount ?? 0) > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 text-amber-300/90">
                  <span>{t.explorerHonestyWingFit}</span>
                  <ScienceTerm termKey="wing_fit" language={language} onOpenDictionary={onOpenDictionary} />
                </div>
              )}
            </div>
          )}

          {/* (e) Learn the words + More tools links */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
            <button
              type="button"
              onClick={() => onOpenDictionary?.()}
              className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 underline underline-offset-4 font-medium cursor-pointer"
            >
              <span>{t.explorerLearnWords}</span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchToScientist?.()}
              className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 underline underline-offset-4 font-medium cursor-pointer"
            >
              <span>{t.explorerMoreTools}</span>
            </button>
          </div>
        </div>
      ) : (
      <>
      {/* A4: WiseView-Style Compact Control Bar Directly Under Viewer (Scientist Mode) */}
      <div
        data-tour="wiseview_bar"
        className="flex flex-col gap-2 p-2.5 rounded-xl bg-[#050811] border border-white/10"
      >
        {/* Observation-date-labeled Frame Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>{data.frames[0]?.dateObs?.slice(0, 10) || 'Start'}</span>
            <span className="text-[#FFB900] font-semibold">
              {currentFrame.dateObs?.replace('T', ' ').slice(0, 19) || `Frame ${currentFrameIdx + 1}`}
            </span>
            <span>{data.frames[data.frames.length - 1]?.dateObs?.slice(0, 10) || 'End'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <input
              type="range"
              min={0}
              max={Math.max(0, data.frames.length - 1)}
              value={currentFrameIdx}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                setIsPlaying(false);
                setCurrentFrameIdx(idx);
                onSelectFrame?.(idx);
              }}
              className="flex-1 accent-[#FFB900] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900]"
              aria-label={`Observation frame slider: frame ${currentFrameIdx + 1} of ${data.frames.length}, ${currentFrame.dateObs || ''}`}
            />
            <span className="font-mono text-xs text-[#94A3B8] shrink-0 tabular-nums">
              {currentFrameIdx + 1} / {data.frames.length}
            </span>
          </div>
        </div>

        {/* Transport, Speed Slider, Loop, Contrast+Stretch, Zoom +/-, and Icon Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Transport + Speed + Loop */}
          <div className="flex flex-wrap items-center gap-1.5">
            <IconButton
              label="Step backward (ArrowLeft)"
              size="sm"
              variant="secondary"
              onClick={() => {
                setIsPlaying(false);
                const prev = blinkFirstLast && data.frames.length >= 2
                  ? (currentFrameIdx === 0 ? data.frames.length - 1 : 0)
                  : (currentFrameIdx - 1 + data.frames.length) % data.frames.length;
                setCurrentFrameIdx(prev);
                onSelectFrame?.(prev);
              }}
            >
              <SkipBack className="w-3.5 h-3.5" aria-hidden="true" />
            </IconButton>

            <Button
              variant="primary"
              size="sm"
              aria-label={isPlaying ? 'Pause playback (Space)' : 'Play playback (Space)'}
              aria-pressed={isPlaying}
              icon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              onClick={() => setIsPlaying((p) => !p)}
            >
              {isPlaying ? t.framePlayerPause : t.framePlayerPlay}
            </Button>

            <IconButton
              label="Step forward (ArrowRight)"
              size="sm"
              variant="secondary"
              onClick={() => {
                setIsPlaying(false);
                const next = blinkFirstLast && data.frames.length >= 2
                  ? (currentFrameIdx === 0 ? data.frames.length - 1 : 0)
                  : (currentFrameIdx + 1) % data.frames.length;
                setCurrentFrameIdx(next);
                onSelectFrame?.(next);
              }}
            >
              <SkipForward className="w-3.5 h-3.5" aria-hidden="true" />
            </IconButton>

            <label
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 border border-white/10 font-mono text-[11px] text-slate-300"
              title="Playback speed multiplier"
            >
              <Gauge className="w-3.5 h-3.5 text-[#00D3F3]" aria-hidden="true" />
              <input
                type="range"
                min={0.25}
                max={4}
                step={0.25}
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                aria-label="Playback speed"
                className="w-16 accent-[#00D3F3] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900]"
              />
              <span className="tabular-nums w-8 text-right">{playbackSpeed}x</span>
            </label>

            <button
              type="button"
              onClick={() => setIsLooping((l) => !l)}
              aria-label="Toggle loop playback (Shortcut: L)"
              aria-pressed={isLooping}
              title="Loop playback (L)"
              className={`px-2 py-1 rounded-lg border font-mono text-xs flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900] ${
                isLooping
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Repeat className="w-3 h-3" aria-hidden="true" />
              <span className="hidden sm:inline">Loop</span>
            </button>
          </div>

          {/* Contrast Slider + Stretch Selector + Zoom +/- */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <label
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-slate-300"
              title="Adjust image contrast"
            >
              <span>C</span>
              <input
                type="range"
                min={0.5}
                max={3.0}
                step={0.05}
                value={contrastFactor}
                onChange={(e) => setContrastFactor(parseFloat(e.target.value))}
                aria-label="Image contrast"
                className="w-14 accent-[#FFB900] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900]"
              />
            </label>

            <select
              value={stretchMode}
              onChange={(e) => setStretchMode(e.target.value as PlayerStretchMode)}
              aria-label="Image intensity stretch"
              title="Intensity stretch function"
              className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900]"
            >
              <option value="asinh">Asinh</option>
              <option value="linear">Linear</option>
              <option value="sqrt">Sqrt</option>
              <option value="log">Log</option>
            </select>

            <div className="flex items-center gap-0.5 bg-black/40 border border-white/10 rounded-lg px-1 py-0.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, Number((z / 1.5).toFixed(1))))}
                aria-label="Zoom out"
                title="Zoom out"
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900]"
              >
                <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <span className="px-1 text-slate-200 tabular-nums">{zoom}x</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(8, Number((z * 1.5).toFixed(1))))}
                aria-label="Zoom in"
                title="Zoom in"
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900]"
              >
                <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Compact Icon Toggles: Crosshair, Trail, Catalog, DQ Flags, Grid, Blink (B) */}
          <div className="flex items-center gap-1" role="toolbar" aria-label="Viewer overlay toggles">
            <button
              type="button"
              onClick={() => setShowEpoch1Crosshair((v) => !v)}
              aria-label="Toggle Epoch-1 fixed crosshair"
              aria-pressed={showEpoch1Crosshair}
              title="Epoch-1 Crosshair"
              className={`p-1.5 rounded-lg border transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900] ${
                showEpoch1Crosshair
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setShowMotionTrail((v) => !v)}
              aria-label="Toggle proper-motion trail"
              aria-pressed={showMotionTrail}
              title="Proper-Motion Trail"
              className={`p-1.5 rounded-lg border transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900] ${
                showMotionTrail
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setShowCatalogOverlay((v) => !v)}
              aria-label="Toggle Gaia DR3 and AllWISE catalog overlays"
              aria-pressed={showCatalogOverlay}
              title={`Catalog Overlays (${data.catalogOverlays?.length ?? 0})`}
              className={`p-1.5 rounded-lg border transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900] ${
                showCatalogOverlay
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setShowDqOverlay((v) => !v)}
              aria-label="Toggle Data Quality pixel flags"
              aria-pressed={showDqOverlay}
              title={`DQ Flags (${currentFrame.dqDecoded?.totalMaskedPixels ?? 0} masked px)`}
              className={`p-1.5 rounded-lg border transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900] ${
                showDqOverlay
                  ? 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setShowPixelGrid((v) => !v)}
              aria-label="Toggle 6.2 arcsec pixel grid"
              aria-pressed={showPixelGrid}
              title="6.2″/px Pixel Grid"
              className={`p-1.5 rounded-lg border transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900] ${
                showPixelGrid
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setBlinkFirstLast((b) => !b)}
              disabled={data.frames.length < 2}
              aria-label="Toggle Blink 1 to Last epoch (Shortcut: B)"
              aria-pressed={blinkFirstLast}
              title="Blink Epoch 1 ↔ Last (B)"
              className={`px-2 py-1 rounded-lg border font-mono text-[11px] flex items-center gap-1 transition cursor-pointer disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[#FFB900] ${
                blinkFirstLast
                  ? 'bg-[#FFB900] text-slate-950 border-[#FFB900] font-bold'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3" aria-hidden="true" />
              <span>Blink</span>
            </button>
          </div>
        </div>
      </div>

      {/* A4 Reserved Collapsible Slots: Frame Metadata Strip, Centroid-vs-Time Plot, Spectrum */}
      <div data-tour="collapsible_slots" className="flex flex-col gap-2.5">
        {/* Reserved Slot 1: Frame Metadata Strip */}
        <div className="rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setMetaSlotOpen((v) => !v)}
            aria-expanded={metaSlotOpen}
            className="w-full px-3 py-2 flex items-center justify-between gap-2 text-[11px] font-mono font-bold text-slate-200 hover:bg-white/5 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900]"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#FFB900]" aria-hidden="true" />
              <span>{t.slotMetadata}</span>
              <span className="font-normal text-slate-400 hidden sm:inline">· {currentFrame.obsId}</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${metaSlotOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {metaSlotOpen && (
            <div className="px-3 pb-2.5 pt-1 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-300">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{cadenceDescription}</span>
                {pairInfo?.humanBaseline && <span className="text-slate-400">({pairInfo.humanBaseline})</span>}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-slate-400">
                <span>
                  Centroid:{' '}
                  {data.astrometrySummary && !data.astrometrySummary.targetDetectedInDetector ? (
                    <span className="text-amber-300 font-semibold">
                      not detected in {data.selectedDetector || 'this detector'}
                    </span>
                  ) : currentFrame.measuredCentroid?.valid ? (
                    <>
                      ΔRA·cosδ {currentFrame.measuredCentroid.dxArcsec.toFixed(2)}″ ±{' '}
                      {currentFrame.measuredCentroid.uncertaintyArcsec.toFixed(2)}″, ΔDec{' '}
                      {currentFrame.measuredCentroid.dyArcsec.toFixed(2)}″
                    </>
                  ) : (
                    <span>
                      not detected in {data.selectedDetector || 'frame'}
                      {currentFrame.measuredCentroid?.maskedReason
                        ? ` (${currentFrame.measuredCentroid.maskedReason.replace(/_/g, ' ')})`
                        : ''}
                    </span>
                  )}
                  {currentFrame.measuredCentroid?.snr != null
                    ? ` (S/N ${currentFrame.measuredCentroid.snr.toFixed(1)})`
                    : ''}
                  {currentFrame.measuredCentroid?.stacked ? ' [stacked]' : ''}
                </span>
                {currentFrame.measuredCentroid?.refStarsUsed != null && (
                  <span>
                    Ref stars: {currentFrame.measuredCentroid.refStarsUsed}
                    {currentFrame.measuredCentroid.lowConfidence ? ' (low confidence)' : ''}
                  </span>
                )}
                <span>
                  Release: {activeReleaseLabel} · VERSION: {activeVersionLabel}
                </span>
                <span>
                  λ: {currentFrame.wavelengthUm.toFixed(2)} µm
                </span>
                <span>
                  Exp: {currentFrame.integrationDurationSec != null ? `${currentFrame.integrationDurationSec}s` : '—'}
                </span>
                <span>Shortcuts: Space · ←/→ · L · B</span>
              </div>
            </div>
          )}
        </div>

        {/* Reserved Slot 2: Centroid-vs-Time Plot */}
        <div className="rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setCentroidSlotOpen((v) => !v)}
            aria-expanded={centroidSlotOpen}
            className="w-full px-3 py-2 flex items-center justify-between gap-2 text-[11px] font-mono font-bold text-slate-200 hover:bg-white/5 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900]"
          >
            <span className="flex items-center gap-2 flex-wrap">
              <Activity className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
              <span>{t.slotCentroid}</span>
              {data.dateRange && (
                <span className="font-normal text-slate-400">· Span {data.dateRange.spanDays}d</span>
              )}
              {data.astrometrySummary && (
                <span
                  className="font-normal text-slate-300"
                  title={
                    data.astrometrySummary.detectorLooFloorArcsec != null
                      ? `Per-detector LOO floor (${data.selectedDetector || 'det'}, ${data.astrometrySummary.brightnessClassUsed || 'medium'}): ${data.astrometrySummary.detectorLooFloorArcsec.toFixed(2)}″ | Own 1σ error: ${(data.astrometrySummary.targetSigmaArcsec ?? data.astrometrySummary.measuredDisplacementErrorArcsec).toFixed(2)}″`
                      : undefined
                  }
                >
                  · Floor ({data.selectedDetector || 'det'}/{data.astrometrySummary.brightnessClassUsed || 'med'}):{' '}
                  {data.astrometrySummary.astrometricFloorArcsec.toFixed(2)}″
                </span>
              )}
              {data.astrometrySummary && (() => {
                const aSum = data.astrometrySummary;
                const sigmaVal =
                  aSum.sigma ??
                  (aSum.measuredDisplacementErrorArcsec > 0
                    ? aSum.measuredDisplacementArcsec / aSum.measuredDisplacementErrorArcsec
                    : 0);
                const floorTooltip = `Own 1σ err = ${(aSum.targetSigmaArcsec ?? aSum.measuredDisplacementErrorArcsec).toFixed(2)}″ | σ = ${sigmaVal.toFixed(2)}${aSum.diffFromExpectedSigma != null ? ` | |meas − exp| = ${aSum.diffFromExpectedSigma.toFixed(2)}σ` : ''}${aSum.annualMotion ? ` | Rate: ${aSum.annualMotion.totalArcsecYr.toFixed(2)} ± ${aSum.annualMotion.errorArcsecYr.toFixed(2)}″/yr` : ''}${aSum.errorBudgetLabel ? ` (${aSum.errorBudgetLabel})` : ''}`;
                return (
                  <span
                    title={floorTooltip}
                    className={`px-1.5 py-0.5 rounded border text-[10px] ${
                      aSum.saturatedAllDetectors
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                        : !aSum.targetDetectedInDetector
                        ? 'bg-slate-800 border-slate-600 text-slate-300'
                        : aSum.motionSignificant
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {aSum.saturatedAllDetectors
                      ? 'saturated in all frames of all detectors: predicted track only'
                      : !aSum.targetDetectedInDetector
                      ? aSum.detectorDetectionNote || `not detected in ${data.selectedDetector || 'detector'}`
                      : aSum.motionSignificant
                      ? `significant (${sigmaVal.toFixed(1)}σ)`
                      : `motion not significant (${sigmaVal.toFixed(1)}σ)`}
                  </span>
                );
              })()}
              {(data.astrometrySummary?.errorBudgetLabel === 'includes wing-fit frames, low confidence' ||
                (!data.astrometrySummary?.errorBudgetLabel && (data.astrometrySummary?.wingFitCount ?? 0) > 0)) && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px]">
                  includes wing-fit frames, low confidence
                </span>
              )}
              {data.astrometrySummary?.lowConfidence &&
                data.astrometrySummary?.errorBudgetLabel !== 'includes wing-fit frames, low confidence' &&
                (data.astrometrySummary?.wingFitCount ?? 0) === 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px]">
                  low confidence ({data.astrometrySummary.medianRefStarsUsed} ref stars)
                </span>
              )}
              {data.centroidStacked && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px]">
                  stacked
                </span>
              )}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${centroidSlotOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {centroidSlotOpen && (
            <div className="px-2.5 pb-2.5 pt-1 border-t border-white/10">
              {centroidSeries.length >= 2 ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
                    <span>
                      {validCentroids.length}/{centroidSeries.length} frames detected
                      {data.astrometrySummary
                        ? ` · ${data.astrometrySummary.medianRefStarsUsed} Gaia ref stars · Meas Δ (${data.astrometrySummary.measuredNetDxArcsec.toFixed(2)}″, ${data.astrometrySummary.measuredNetDyArcsec.toFixed(2)}″) ± ${data.astrometrySummary.measuredDisplacementErrorArcsec.toFixed(2)}″ (${(data.astrometrySummary.sigma ?? 0).toFixed(1)}σ)`
                        : ''}
                      {data.astrometrySummary?.annualMotion
                        ? ` · Rate ${data.astrometrySummary.annualMotion.totalArcsecYr.toFixed(2)} ± ${data.astrometrySummary.annualMotion.errorArcsecYr.toFixed(2)}″/yr`
                        : ''}
                      {data.astrometrySummary?.expectedOffset && (data.astrometrySummary.expectedOffset.totalArcsec > 0 || data.properMotion)
                        ? ` · Exp (${data.astrometrySummary.expectedOffset.dxArcsec.toFixed(2)}″, ${data.astrometrySummary.expectedOffset.dyArcsec.toFixed(2)}″)`
                        : ''}
                      {data.astrometrySummary?.errorBudgetLabel ? ` · ${data.astrometrySummary.errorBudgetLabel}` : ''}
                      {data.astrometrySummary?.nearbyNeighbors15Arcsec &&
                      data.astrometrySummary.nearbyNeighbors15Arcsec.length > 0
                        ? ` · Nearest catalog neighbor: ${data.astrometrySummary.nearbyNeighbors15Arcsec[0].distToPredictedArcsec.toFixed(1)}″ (${data.astrometrySummary.nearbyNeighbors15Arcsec[0].identifier})`
                        : ''}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-cyan-400">● ΔRA·cosδ</span>
                      <span className="text-amber-400">● ΔDec</span>
                      <span className="text-slate-500">--- Predicted PM</span>
                    </div>
                  </div>
                  <svg viewBox="0 0 560 96" className="w-full h-24 bg-[#070b16] rounded-lg" role="img" aria-label="Measured centroid offset versus time plot">
                    <line x1={42} y1={48} x2={545} y2={48} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                    <text x={6} y={16} fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      +{maxArcsecExtent.toFixed(1)}″
                    </text>
                    <text x={14} y={51} fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      0″
                    </text>
                    <text x={6} y={88} fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      -{maxArcsecExtent.toFixed(1)}″
                    </text>

                    <polyline
                      fill="none"
                      stroke="rgba(0,211,243,0.4)"
                      strokeWidth="1.2"
                      strokeDasharray="4 3"
                      points={centroidSeries
                        .map((c) => {
                          const px = 44 + (c.dtDays / maxSpanDays) * 496;
                          const py = 48 - (c.predDxArcsec / maxArcsecExtent) * 36;
                          return `${px},${py}`;
                        })
                        .join(' ')}
                    />
                    <polyline
                      fill="none"
                      stroke="rgba(255,185,0,0.4)"
                      strokeWidth="1.2"
                      strokeDasharray="4 3"
                      points={centroidSeries
                        .map((c) => {
                          const px = 44 + (c.dtDays / maxSpanDays) * 496;
                          const py = 48 - (c.predDyArcsec / maxArcsecExtent) * 36;
                          return `${px},${py}`;
                        })
                        .join(' ')}
                    />

                    {centroidSeries[currentFrameIdx] && (
                      <line
                        x1={44 + (centroidSeries[currentFrameIdx].dtDays / maxSpanDays) * 496}
                        y1={6}
                        x2={44 + (centroidSeries[currentFrameIdx].dtDays / maxSpanDays) * 496}
                        y2={90}
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="1.2"
                      />
                    )}

                    {centroidSeries.map((c) => {
                      const px = 44 + (c.dtDays / maxSpanDays) * 496;
                      const isCurrent = c.idx === currentFrameIdx;
                      if (!c.valid) {
                        return (
                          <g key={c.idx}>
                            <title>
                              {`Epoch ${c.idx + 1} (${c.releaseLabel} ${c.versionLabel}, t+${c.dtDays.toFixed(1)}d): not detected${c.maskedReason ? ` [${c.maskedReason}]` : ''}${c.snr != null ? ` (S/N ${c.snr.toFixed(1)})` : ''}`}
                            </title>
                            <circle cx={px} cy={48} r={isCurrent ? 3.5 : 2} fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="1.5 1.5" />
                          </g>
                        );
                      }
                      const pyRa = 48 - (c.dxArcsec / maxArcsecExtent) * 36;
                      const pyDec = 48 - (c.dyArcsec / maxArcsecExtent) * 36;
                      const errPx = Math.min(18, (c.errArcsec / maxArcsecExtent) * 36);
                      return (
                        <g key={c.idx}>
                          <title>
                            {`Epoch ${c.idx + 1} (${c.releaseLabel} ${c.versionLabel}, t+${c.dtDays.toFixed(1)}d): ΔRA·cosδ ${c.dxArcsec.toFixed(2)}″, ΔDec ${c.dyArcsec.toFixed(2)}″ ± ${c.errArcsec.toFixed(2)}″${c.refStarsUsed != null ? ` | ${c.refStarsUsed} ref stars` : ''}${c.snr != null ? ` | S/N ${c.snr.toFixed(1)}` : ''}${c.stacked ? ' [stacked]' : ''}`}
                          </title>
                          <line x1={px} y1={pyRa - errPx} x2={px} y2={pyRa + errPx} stroke="#00D3F3" strokeWidth="1" opacity={0.6} />
                          <circle cx={px} cy={pyRa} r={isCurrent ? 4 : 2.5} fill="#00D3F3" />
                          <line x1={px} y1={pyDec - errPx} x2={px} y2={pyDec + errPx} stroke="#FFB900" strokeWidth="1" opacity={0.6} />
                          <circle cx={px} cy={pyDec} r={isCurrent ? 4 : 2.5} fill="#FFB900" />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              ) : (
                <p className="text-xs font-mono text-slate-400 py-2">{t.emptyCentroid}</p>
              )}
            </div>
          )}
        </div>

        {/* Reserved Slot 3: Measured Spectrum */}
        <div className="rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setSpectrumSlotOpen((v) => !v)}
            aria-expanded={spectrumSlotOpen}
            className="w-full px-3 py-2 flex items-center justify-between gap-2 text-[11px] font-mono font-bold text-slate-200 hover:bg-white/5 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900]"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB900]" aria-hidden="true" />
              <span>{t.slotSpectrum}</span>
              {data.spectrumAtCenter && data.spectrumAtCenter.length > 0 && (
                <span className="font-normal text-slate-400">· {data.spectrumAtCenter.length} points</span>
              )}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${spectrumSlotOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {spectrumSlotOpen && (
            <div className="px-3 pb-2.5 pt-1 border-t border-white/10">
              {data.spectrumAtCenter && data.spectrumAtCenter.length > 0 ? (() => {
                const minWl = Math.min(...data.spectrumAtCenter!.map((p) => p.wavelengthUm));
                const maxWl = Math.max(...data.spectrumAtCenter!.map((p) => p.wavelengthUm));
                const detCount = new Set(data.spectrumAtCenter!.map((p) => p.detector)).size;
                const wideSpan = maxWl - minWl > 0.3 || detCount > 1;
                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[11px] font-mono text-slate-300 space-y-0.5">
                        <div>
                          Wavelength span:{' '}
                          <span className="text-[#00D3F3] font-semibold">
                            {minWl.toFixed(2)}–{maxWl.toFixed(2)} µm
                          </span>
                        </div>
                        <div className="text-slate-400">
                          {data.spectrumAtCenter!.length} measured exposure point(s) at target aperture.
                        </div>
                      </div>
                      {onOpenSpectrum && (
                        <button
                          type="button"
                          onClick={onOpenSpectrum}
                          className="px-2.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-mono text-xs flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900]"
                        >
                          <Sparkles className="w-3 h-3" aria-hidden="true" />
                          <span>Open Full Spectrum</span>
                        </button>
                      )}
                    </div>
                    {wideSpan && (
                      <div className="text-[10px] font-mono text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2 py-1">
                        Wide wavelength span ({(maxWl - minWl).toFixed(2)} µm across LVF channels) — spectral slope affects continuum comparisons; filter by wavelength window in Advanced.
                      </div>
                    )}
                  </div>
                );
              })() : (
                <p className="text-xs font-mono text-slate-400 py-1.5">{t.emptySpectrum}</p>
              )}
            </div>
          )}
        </div>

        {/* Reserved Slot 4: Brightness vs Time Light Curve (Task 4) */}
        <div className="rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setLightCurveSlotOpen((v) => !v)}
            aria-expanded={lightCurveSlotOpen}
            className="w-full px-3 py-2 flex items-center justify-between gap-2 text-[11px] font-mono font-bold text-slate-200 hover:bg-white/5 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FFB900]"
          >
            <span className="flex items-center gap-2 flex-wrap">
              <Zap className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>{t.slotLightCurve}</span>
              {data.lightCurve && data.lightCurve.length > 0 && (
                <span className="font-normal text-slate-400">
                  · {data.lightCurve.filter((p) => p.valid).length}/{data.lightCurve.length} valid ({data.selectedDetector || 'det'})
                </span>
              )}
              {data.lightCurve?.some((p) => p.valid && p.isWingAnnulus) && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px]">
                  wing annulus (2–5 px)
                </span>
              )}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${lightCurveSlotOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {lightCurveSlotOpen && (
            <div className="px-2.5 pb-2.5 pt-1 border-t border-white/10">
              {(() => {
                const rawLc = data.lightCurve || [];
                const validAll = rawLc.filter((p) => p.valid);
                if (rawLc.length === 0 || validAll.length === 0) {
                  return (
                    <p className="text-xs font-mono text-amber-300/90 py-1.5">
                      Photometry unavailable: target core saturated with insufficient unmasked wing-annulus pixels in {data.selectedDetector || 'this detector'}.
                    </p>
                  );
                }
                const wls = validAll.map((p) => p.wavelengthUm).sort((a, b) => a - b);
                const wlMin = wls[0];
                const wlMax = wls[wls.length - 1];
                const wlSpan = Math.max(0.01, wlMax - wlMin);
                const wlLowCut = wlMin + wlSpan / 3;
                const wlHighCut = wlMin + (2 * wlSpan) / 3;
                const filteredLc = rawLc.filter((p) => {
                  if (lcBandFilter === 'lower') return p.wavelengthUm <= wlLowCut;
                  if (lcBandFilter === 'middle') return p.wavelengthUm > wlLowCut && p.wavelengthUm <= wlHighCut;
                  if (lcBandFilter === 'upper') return p.wavelengthUm > wlHighCut;
                  return true;
                });
                const validFiltered = filteredLc.filter((p) => p.valid);
                const minMjdLc = rawLc[0]?.mjd ?? 0;
                const spanMjdLc = Math.max(0.01, (rawLc[rawLc.length - 1]?.mjd ?? minMjdLc) - minMjdLc);
                const fluxVals = validFiltered.map((p) => p.fluxMjySr);
                const minF = fluxVals.length > 0 ? Math.min(...fluxVals.map((f, i) => f - validFiltered[i].uncertaintyMjySr)) : 0;
                const maxF = fluxVals.length > 0 ? Math.max(...fluxVals.map((f, i) => f + validFiltered[i].uncertaintyMjySr)) : 1;
                const rangeF = Math.max(1e-3, maxF - minF);

                return (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
                      <span>
                        Native aperture flux (MJy/sr) vs MJD · λ {wlMin.toFixed(2)}–{wlMax.toFixed(2)} µm
                      </span>
                      <label className="flex items-center gap-1.5 text-slate-300">
                        <span>λ window:</span>
                        <select
                          value={lcBandFilter}
                          onChange={(e) => setLcBandFilter(e.target.value as 'all' | 'lower' | 'middle' | 'upper')}
                          aria-label="Light curve wavelength window filter"
                          className="bg-black/60 border border-white/15 rounded px-1.5 py-0.5 text-[10px] text-slate-200 cursor-pointer"
                        >
                          <option value="all">All ({wlMin.toFixed(2)}–{wlMax.toFixed(2)} µm)</option>
                          <option value="lower">{wlMin.toFixed(2)}–{wlLowCut.toFixed(2)} µm</option>
                          <option value="middle">{wlLowCut.toFixed(2)}–{wlHighCut.toFixed(2)} µm</option>
                          <option value="upper">{wlHighCut.toFixed(2)}–{wlMax.toFixed(2)} µm</option>
                        </select>
                      </label>
                    </div>
                    <svg viewBox="0 0 560 88" className="w-full h-22 bg-[#070b16] rounded-lg" role="img" aria-label="Brightness versus time light curve">
                      <text x={6} y={14} fill="#94a3b8" fontSize="9" fontFamily="monospace">
                        {maxF >= 100 ? maxF.toFixed(0) : maxF.toFixed(2)}
                      </text>
                      <text x={6} y={80} fill="#94a3b8" fontSize="9" fontFamily="monospace">
                        {minF >= 100 ? minF.toFixed(0) : minF.toFixed(2)}
                      </text>
                      <line x1={48} y1={10} x2={545} y2={10} stroke="rgba(255,255,255,0.06)" />
                      <line x1={48} y1={78} x2={545} y2={78} stroke="rgba(255,255,255,0.12)" />
                      {filteredLc.map((p, idx) => {
                        const px = 50 + ((p.mjd - minMjdLc) / spanMjdLc) * 490;
                        if (!p.valid) {
                          return (
                            <g key={p.obsId + idx}>
                              <title>{`MJD ${p.mjd.toFixed(3)} | λ=${p.wavelengthUm.toFixed(2)} µm | masked (${p.maskedReason || 'flagged'})`}</title>
                              <circle cx={px} cy={78} r={2} fill="none" stroke="#64748b" strokeWidth="1" />
                            </g>
                          );
                        }
                        const py = 74 - ((p.fluxMjySr - minF) / rangeF) * 60;
                        const errPx = Math.min(20, (p.uncertaintyMjySr / rangeF) * 60);
                        return (
                          <g key={p.obsId + idx}>
                            <title>
                              {`MJD ${p.mjd.toFixed(4)} (${p.dateObs.slice(0, 10)}) | λ=${p.wavelengthUm.toFixed(2)} µm | Flux ${p.fluxMjySr.toFixed(2)} ± ${p.uncertaintyMjySr.toFixed(2)} MJy/sr | S/N ${p.snr.toFixed(1)}${p.isWingAnnulus ? ' [wing annulus]' : ''}`}
                            </title>
                            <line x1={px} y1={py - errPx} x2={px} y2={py + errPx} stroke={p.isWingAnnulus ? '#F59E0B' : '#10B981'} strokeWidth="1" opacity={0.65} />
                            <circle cx={px} cy={py} r={p.frameIndex - 1 === currentFrameIdx ? 4 : 2.5} fill={p.isWingAnnulus ? '#F59E0B' : '#10B981'} />
                          </g>
                        );
                      })}
                    </svg>
                    <div className="text-[10px] font-mono text-slate-400">
                      Note: Effective LVF target wavelength varies across exposures ({wlMin.toFixed(2)}–{wlMax.toFixed(2)} µm); part of photometric scatter can be spectral.
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
};
