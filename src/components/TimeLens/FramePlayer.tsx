import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  Layers,
  ZoomIn,
  ZoomOut,
  Grid,
  Crosshair,
  ShieldAlert,
  Download,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Share2,
  HelpCircle,
  Check,
  Sliders,
  X,
  Telescope,
  RotateCcw,
  Flag,
  Code2,
  Globe,
  ArrowLeft,
  Search,
  Eye,
  EyeOff,
  Compass,
  Activity,
} from 'lucide-react';
import { Button } from '../../design/components/Button';
import { Modal } from '../../design/components/Modal';
import { SkeletonSky } from '../../design/components/SkeletonSky';
import { ErrorState } from '../../design/components/ErrorState';
import { Language, translations } from '../../utils/translations';
import { gameAudio } from '../../game/utils/gameAudio';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { bicubicUpsampleRgba, drawPsfStar, getCanvasDpr } from '../../utils/smoothCanvas';
import {
  TimeSeriesFrame,
  TemporalPairInfo,
  AvailableDetectorSummary,
  CatalogOverlayItem,
  SpectrumPoint,
  DetectorStack,
  LightCurvePoint,
} from '../../science/timeSeriesPipeline';
import { groupFramesBySurveyPass } from '../../science/surveyPasses';
import {
  AlignedTimeSeriesFrame,
  alignFramesToDisplayWcs,
  inspectSpotOnRawFrame,
} from '../../science/frameAlignment';
import { parseCoordinateInput } from '../../science/coordinates';
import { addBadDataReport, recordViewerAction } from '../../progress/progressStore';
import { AladinLitePanel } from '../Explore/AladinLitePanel';
import { WCSParams } from '../../science/types';
import {
  SourceClassification,
  TapFreshness,
  FitsOrigin,
  FitsChecksumRecord,
  normalizeSourceClassification,
  getSourceClassificationMeta,
} from '../../science/provenance';
import {
  SpexExplainContext,
  SpexHighlight,
  SpexNearbySource,
  SpexSpotSelection,
  decodeFlagsPlainWords,
} from '../../science/spexExplain';
import {
  useSkyGestures,
  DEFAULT_SPHEREX_DETECTOR_RANGES,
  detectorToCenterUm,
} from '../../hooks/useSkyGestures';
import { WCS } from '../../science/wcs';

export type PlayerRenderMode = 'raw' | 'diff_ref' | 'diff_median' | 'coadd';
export type PlayerStretchMode = 'asinh' | 'linear' | 'sqrt' | 'log';

export interface PresetTargetOption {
  caseId: string;
  label: string;
  labelAr: string;
  sub: string;
  ra: number;
  dec: number;
}

export interface FramePlayerProps {
  ra: number;
  dec: number;
  caseId?: string;
  sizePix?: number;
  initialDetector?: string;
  language: Language;
  explorerMode?: boolean;
  targetLabel?: string;
  presetTargets?: readonly PresetTargetOption[];
  onBackToSky?: () => void;
  onSelectPresetCase?: (caseId: string) => void;
  onSearchCoordinates?: (ra: number, dec: number) => void;
  onOpenFindings?: () => void;
  onOpenHelp?: () => void;
  onOpenCurtainLab?: () => void;
  onStartGuidedDemo?: () => void;
  onTelescopeUsed?: () => void;
  onShareUsed?: () => void;
  onSpotSelect?: (spot: SpexSpotSelection, context: SpexExplainContext) => void;
  onExplainContextChange?: (context: SpexExplainContext) => void;
  spexHighlights?: SpexHighlight[];
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
  isEmbed?: boolean;
  autoPlay?: boolean;
  onAutoPlayConsumed?: () => void;
  preferSnapshot?: boolean;
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
  sourceLabel?: string;
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

const SNAPSHOT_TARGET_PRESETS: Array<{ caseId: string; slugs: string[]; ra: number; dec: number }> = [
  { caseId: 'case-wise-0855', slugs: ['wise-0855', '0855'], ra: 133.81890825, dec: -7.247048 },
  { caseId: 'case-barnards-star', slugs: ['barnard', 'gj699', 'gj-699'], ra: 269.45207695, dec: 4.69336497 },
  { caseId: 'case-epsilon-indi', slugs: ['epsilon-indi', 'eps-indi', 'indi'], ra: 331.04414659, dec: -56.7828442 },
  { caseId: 'case-rw-aur', slugs: ['rw-aur'], ra: 76.95652603, dec: 30.40143817 },
  { caseId: 'case-r-dra', slugs: ['r-dra'], ra: 248.16761083, dec: 66.75497942 },
];

function matchSnapshotCaseId(caseId: string | undefined, ra: number, dec: number): string | null {
  const idLower = (caseId || '').toLowerCase();
  for (const item of SNAPSHOT_TARGET_PRESETS) {
    if (item.slugs.some((slug) => idLower.includes(slug))) return item.caseId;
  }
  if (Number.isFinite(ra) && Number.isFinite(dec)) {
    for (const item of SNAPSHOT_TARGET_PRESETS) {
      if (Math.abs(ra - item.ra) < 0.15 && Math.abs(dec - item.dec) < 0.15) {
        return item.caseId;
      }
    }
  }
  return null;
}

export const FramePlayer: React.FC<FramePlayerProps> = ({
  ra,
  dec,
  caseId,
  sizePix = 64,
  initialDetector,
  language,
  targetLabel,
  presetTargets,
  onBackToSky,
  onSelectPresetCase,
  onSearchCoordinates,
  onOpenFindings,
  onOpenHelp,
  onOpenCurtainLab,
  onStartGuidedDemo,
  onTelescopeUsed,
  onShareUsed,
  onSpotSelect,
  onExplainContextChange,
  spexHighlights = [],
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
  isEmbed = false,
  autoPlay = false,
  onAutoPlayConsumed,
  preferSnapshot = false,
  guidedStepAction,
  className = '',
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  const [data, setData] = useState<TimeSeriesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<{ loaded: number; total: number; phase?: string } | null>(null);
  const [loadingElapsedSec, setLoadingElapsedSec] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<'OK' | 'ARCHIVE_ZERO_ROWS' | 'NETWORK_ERROR' | 'HTTP_ERROR'>('OK');
  const [serverDataMode, setServerDataMode] = useState<'live' | 'snapshot' | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    fetch('/api/health', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((health) => {
        if (health?.dataSourceMode === 'live' || health?.dataSourceMode === 'snapshot') {
          setServerDataMode(health.dataSourceMode);
        } else if (health?.status === 'offline_mode' || health?.irsaTapReachable === false) {
          setServerDataMode('snapshot');
        } else if (health?.irsaTapReachable === true) {
          setServerDataMode('live');
        }
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  // Playback & detector controls
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedDetector, setSelectedDetector] = useState<string>(initialDetector || '');
  const [frameCount, setFrameCount] = useState<10 | 16 | 20 | 40>(16);

  // Display & stretch controls
  const [globalScaleEnabled, setGlobalScaleEnabled] = useState<boolean>(true);
  const [stretchMode, setStretchMode] = useState<PlayerStretchMode>('asinh');
  const [invertColors, setInvertColors] = useState<boolean>(false);
  const [blinkFirstLast, setBlinkFirstLast] = useState<boolean>(false);
  const [renderMode, setRenderMode] = useState<PlayerRenderMode>('raw');
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pixelSharp, setPixelSharp] = useState<boolean>(false);

  // Survey-pass grouping ON by default
  const [surveyPassMode, setSurveyPassMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('pass');
      if (p === '0') return false;
    }
    return true;
  });

  // Telescopes & Layers
  const [showGaiaOverlay, setShowGaiaOverlay] = useState<boolean>(true);
  const [showAllWiseOverlay, setShowAllWiseOverlay] = useState<boolean>(true);
  const [showAladinOverlay, setShowAladinOverlay] = useState<boolean>(false);
  const [showMotionTrail, setShowMotionTrail] = useState<boolean>(true);
  const [showDqOverlay, setShowDqOverlay] = useState<boolean>(true);
  const [showPixelGrid, setShowPixelGrid] = useState<boolean>(false);
  const [showEpoch1Crosshair, setShowEpoch1Crosshair] = useState<boolean>(true);
  const [showWhyMarked, setShowWhyMarked] = useState<boolean>(false);

  // Panels: collapsed by default on mobile (<768px) so sky image fills screen unobstructed
  const [leftRailOpen, setLeftRailOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [rightRailOpen, setRightRailOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);
  const [immersiveMode, setImmersiveMode] = useState<boolean>(false);
  const [idleHidden, setIdleHidden] = useState<boolean>(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Coordinate search state in top floating bar
  const [coordInput, setCoordInput] = useState<string>('');
  const [coordError, setCoordError] = useState<string | null>(null);

  // Modals & toasts
  const [badDataToast, setBadDataToast] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedEmbed, setCopiedEmbed] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [tappedPix, setTappedPix] = useState<{ x: number; y: number } | null>(null);
  const [knownDetectors, setKnownDetectors] = useState<AvailableDetectorSummary[]>([]);
  const [wavelengthPreview, setWavelengthPreview] = useState<{ um: number; snappedDetector: string } | null>(null);
  const [fadeOpacity, setFadeOpacity] = useState<number>(0);

  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fadeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backdropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevRenderedFrameRef = useRef<number | null>(null);
  const timeSeriesCacheRef = useRef<Map<string, TimeSeriesResponse>>(new Map());
  const activeFetchAbortRef = useRef<AbortController | null>(null);

  useModalBehavior(showShortcutsModal, () => setShowShortcutsModal(false));

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setTappedPix(null);
  }, [ra, dec, caseId, selectedDetector]);

  useEffect(() => {
    if (initialDetector && initialDetector !== selectedDetector) {
      setSelectedDetector(initialDetector);
    }
  }, [initialDetector]);

  useEffect(() => {
    const cid = (caseId || '').toLowerCase();
    if (cid.includes('wise-0855') || cid.includes('0855')) {
      recordViewerAction('visitedWise0855');
    } else if (cid.includes('barnard')) {
      recordViewerAction('visitedBarnard');
    }
  }, [caseId]);

  useEffect(() => {
    if (!autoPlay || loading || !data?.frames?.length) return;
    setIsPlaying(true);
    setBlinkFirstLast(data.frames.length >= 2);
    setShowMotionTrail(true);
    recordViewerAction('playedBlink');
    onExplorerPlay?.();
    onAutoPlayConsumed?.();
  }, [autoPlay, loading, data?.frames?.length, onExplorerPlay, onAutoPlayConsumed]);

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

  useEffect(() => {
    if (!loading) {
      setLoadingElapsedSec(0);
      return;
    }
    setLoadingElapsedSec(0);
    const id = setInterval(() => setLoadingElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  const handleUseOfflineDemo = useCallback(async () => {
    if (activeFetchAbortRef.current) {
      activeFetchAbortRef.current.abort();
      activeFetchAbortRef.current = null;
    }
    const controller = new AbortController();
    activeFetchAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    setLoading(true);
    setError(null);
    try {
      const targetCase = matchSnapshotCaseId(caseId, ra, dec) || caseId || 'case-wise-0855';
      const url = `/api/spherex/timeseries?caseId=${encodeURIComponent(targetCase)}&ra=${ra.toFixed(6)}&dec=${dec.toFixed(6)}&sizePix=${sizePix}&offline=1`;
      const res = await fetch(url, { signal: controller.signal });
      let json: TimeSeriesResponse | null = res.ok ? await res.json().catch(() => null) : null;
      if (!json || !json.frames || json.frames.length === 0) {
        const fallbackRes = await fetch(
          `/api/spherex/timeseries?caseId=case-wise-0855&ra=133.818908&dec=-7.247048&sizePix=64&offline=1`,
          { signal: controller.signal }
        );
        if (fallbackRes.ok) json = await fallbackRes.json().catch(() => null);
      }
      if (json && json.frames && json.frames.length > 0) {
        setState('OK');
        setData(json);
        setCurrentFrameIdx(0);
        if (json.availableDetectors?.length) setKnownDetectors(json.availableDetectors);
        onDataLoaded?.(json);
      } else {
        setState('NETWORK_ERROR');
        setError('Offline snapshot could not be loaded.');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' && activeFetchAbortRef.current !== controller) return;
      setState('NETWORK_ERROR');
      setError('Offline snapshot could not be loaded.');
    } finally {
      clearTimeout(timeoutId);
      if (activeFetchAbortRef.current === controller) activeFetchAbortRef.current = null;
      setLoading(false);
    }
  }, [caseId, ra, dec, sizePix, onDataLoaded]);

  const fetchTimeSeries = useCallback(async () => {
    if (preferSnapshot) {
      await handleUseOfflineDemo();
      return;
    }
    const cacheKey = `${ra.toFixed(5)}:${dec.toFixed(5)}:${caseId || ''}:${sizePix}:${selectedDetector || 'auto'}:${frameCount}`;
    const cached = timeSeriesCacheRef.current.get(cacheKey);
    if (cached && cached.frames?.length) {
      setState('OK');
      setError(null);
      setLoading(false);
      setLoadingProgress(null);
      setData(cached);
      setCurrentFrameIdx(0);
      if (cached.availableDetectors?.length) setKnownDetectors(cached.availableDetectors);
      onDataLoaded?.(cached);
      return;
    }

    if (activeFetchAbortRef.current) {
      activeFetchAbortRef.current.abort();
      activeFetchAbortRef.current = null;
    }
    const controller = new AbortController();
    activeFetchAbortRef.current = controller;
    let timedOut = false;
    const hardTimeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 12000);

    setLoading(true);
    setLoadingProgress(null);
    setError(null);
    try {
      const params = new URLSearchParams({
        ra: ra.toFixed(6),
        dec: dec.toFixed(6),
        sizePix: String(sizePix),
        frame: 'sky',
        maxFrames: String(frameCount),
        stream: 'ndjson',
      });
      if (caseId) params.set('caseId', caseId);
      if (selectedDetector) params.set('detector', selectedDetector);

      const res = await fetch(`/api/spherex/timeseries?${params.toString()}`, { signal: controller.signal });
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
              // ignore chunk parse errors
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
        json = contentType.includes('application/json') ? await res.json() : ({ error: `HTTP ${res.status}` } as any);
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

      if (!json) throw new Error('Empty response from SPHEREx time-series server');

      if (json.state === 'ARCHIVE_ZERO_ROWS' || !json.frames || json.frames.length === 0) {
        setState('ARCHIVE_ZERO_ROWS');
        setData(json);
      } else {
        timeSeriesCacheRef.current.set(cacheKey, json);
        setState('OK');
        setData(json);
        setCurrentFrameIdx(0);
        if (json.availableDetectors?.length) setKnownDetectors(json.availableDetectors);
        onDataLoaded?.(json);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' && !timedOut) return;
      const matchedSnapshotCase = matchSnapshotCaseId(caseId, ra, dec);
      if (matchedSnapshotCase) {
        clearTimeout(hardTimeoutId);
        if (activeFetchAbortRef.current === controller) activeFetchAbortRef.current = null;
        await handleUseOfflineDemo();
        return;
      }
      setState('NETWORK_ERROR');
      setError(timedOut ? 'NASA IRSA request timed out after 12 seconds.' : err?.message || 'Could not load time-series frames.');
    } finally {
      clearTimeout(hardTimeoutId);
      if (activeFetchAbortRef.current === controller) {
        activeFetchAbortRef.current = null;
        setLoading(false);
      }
    }
  }, [ra, dec, caseId, sizePix, selectedDetector, frameCount, preferSnapshot, handleUseOfflineDemo, onDataLoaded]);

  useEffect(() => {
    fetchTimeSeries();
    return () => {
      if (activeFetchAbortRef.current) {
        activeFetchAbortRef.current.abort();
        activeFetchAbortRef.current = null;
      }
    };
  }, [fetchTimeSeries]);

  // Phase B: Reproject all raw frames onto one canonical North-up, East-left tangent WCS grid BEFORE stacking or display
  const alignedDataset = useMemo(() => {
    if (!data?.frames?.length) {
      return alignFramesToDisplayWcs([], { targetCoords: { ra, dec }, sizePix });
    }
    return alignFramesToDisplayWcs(data.frames, {
      referenceWcs: data.referenceWcs,
      targetCoords: data.targetCoords,
      sizePix: data.sizePix || sizePix,
      catalogOverlays: data.catalogOverlays,
    });
  }, [data, ra, dec, sizePix]);

  const alignedFrames = alignedDataset.frames;

  const surveyPasses = useMemo(() => {
    return groupFramesBySurveyPass(alignedFrames);
  }, [alignedFrames]);

  const displayFrames = useMemo<AlignedTimeSeriesFrame[]>(() => {
    if (!surveyPassMode) return alignedFrames;
    const combined = surveyPasses.map((p) => {
      const cf = p.combinedFrame as AlignedTimeSeriesFrame;
      const rep =
        alignedFrames.find((af) => af.dateObs && cf.dateObs && af.dateObs === cf.dateObs) ||
        alignedFrames.find((af) => Math.abs(af.mjd - cf.mjd) < 30) ||
        alignedFrames[0];
      return {
        ...cf,
        isUnaligned: Boolean(rep?.isUnaligned),
        nativeWidth: rep?.nativeWidth ?? cf.width ?? 64,
        nativeHeight: rep?.nativeHeight ?? cf.height ?? 64,
        nativeFlux: rep?.nativeFlux ?? cf.flux,
        nativeVariance: rep?.nativeVariance ?? cf.variance,
        nativeFlags: rep?.nativeFlags ?? cf.flags,
        nativeWcs: rep?.nativeWcs ?? cf.wcs,
      };
    });
    return combined.length > 0 ? combined : alignedFrames;
  }, [surveyPassMode, surveyPasses, alignedFrames]);

  useEffect(() => {
    if (displayFrames.length > 0 && currentFrameIdx >= displayFrames.length) {
      setCurrentFrameIdx(0);
    }
  }, [displayFrames.length, currentFrameIdx]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || !displayFrames.length) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }
    const total = displayFrames.length;
    const intervalMs = Math.round(750 / playbackSpeed);
    playTimerRef.current = setInterval(() => {
      setCurrentFrameIdx((prev) => {
        let next: number;
        if (blinkFirstLast && total >= 2) {
          next = prev === 0 ? total - 1 : 0;
        } else if (prev + 1 >= total) {
          if (!isLooping) {
            setIsPlaying(false);
            return prev;
          }
          next = 0;
        } else {
          next = prev + 1;
        }
        onSelectFrame?.(next);
        return next;
      });
    }, intervalMs);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, blinkFirstLast, isLooping, displayFrames.length, onSelectFrame]);

  // Keyboard shortcuts
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
      if (!displayFrames.length) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => {
          const next = !p;
          if (next) {
            recordViewerAction('playedBlink');
            onExplorerPlay?.();
          }
          return next;
        });
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentFrameIdx((prev) => {
          const next =
            blinkFirstLast && displayFrames.length >= 2
              ? prev === 0
                ? displayFrames.length - 1
                : 0
              : (prev + 1) % displayFrames.length;
          onSelectFrame?.(next);
          return next;
        });
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentFrameIdx((prev) => {
          const prevIdx =
            blinkFirstLast && displayFrames.length >= 2
              ? prev === 0
                ? displayFrames.length - 1
                : 0
              : (prev - 1 + displayFrames.length) % displayFrames.length;
          onSelectFrame?.(prevIdx);
          return prevIdx;
        });
      } else if (e.key === 'l' || e.key === 'L') {
        setIsLooping((lp) => !lp);
      } else if (e.key === 'b' || e.key === 'B') {
        if (displayFrames.length >= 2) setBlinkFirstLast((b) => !b);
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [displayFrames.length, blinkFirstLast, onSelectFrame, onExplorerPlay]);

  // Precompute stack median and co-add on aligned displayWcs grid
  const { stackMedian, coaddStack, diffRefFrame } = useMemo(() => {
    if (displayFrames.length === 0) {
      return {
        stackMedian: null as number[] | null,
        coaddStack: null as number[] | null,
        diffRefFrame: null as AlignedTimeSeriesFrame | null,
      };
    }
    const targetKey = `${(displayFrames[0].release || data?.activeRelease || 'public').toLowerCase()}::${displayFrames[0].version || data?.activeVersion || 'unknown'}`;
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
        const v = fr.flux[p];
        const flag = fr.flags?.[p] ?? 0;
        if (Number.isFinite(v) && (flag & DQ_ARTIFACT_MASK) === 0) {
          vals.push(v);
          const vari = fr.variance?.[p];
          const w = vari && Number.isFinite(vari) && vari > 0 ? 1 / vari : 1;
          wSum += w;
          wfSum += w * v;
        }
      }
      if (vals.length === 0) {
        const fb = groupFrames[0].flux[p] ?? 0;
        medianArr[p] = Number.isFinite(fb) ? fb : 0;
        coaddArr[p] = medianArr[p];
      } else {
        vals.sort((a, b) => a - b);
        medianArr[p] = vals[Math.floor(vals.length / 2)];
        coaddArr[p] = wSum > 0 ? wfSum / wSum : medianArr[p];
      }
    }
    return { stackMedian: medianArr, coaddStack: coaddArr, diffRefFrame: groupFrames[0] || null };
  }, [displayFrames, data?.activeRelease, data?.activeVersion]);

  const getDisplayArray = useCallback(
    (frameIdx: number): number[] => {
      const fr = displayFrames[frameIdx];
      if (!fr) return [];
      const base = fr.flux;
      if (renderMode === 'coadd' && coaddStack) return coaddStack;
      if (renderMode === 'diff_ref' && diffRefFrame) {
        const ref = diffRefFrame.flux;
        return base.map((v, i) => (Number.isFinite(v) && Number.isFinite(ref[i]) ? v - ref[i] : 0));
      }
      if (renderMode === 'diff_median' && stackMedian) {
        return base.map((v, i) => (Number.isFinite(v) && Number.isFinite(stackMedian[i]) ? v - stackMedian[i] : 0));
      }
      return base;
    },
    [displayFrames, diffRefFrame, renderMode, coaddStack, stackMedian]
  );

  const globalScale = useMemo(() => {
    if (displayFrames.length === 0) return { p02: 0, p98: 1, absMaxDiff: 1 };
    const sampleValues: number[] = [];
    const stride = displayFrames.length > 4 ? 2 : 1;
    for (let fIdx = 0; fIdx < displayFrames.length; fIdx++) {
      const arr = getDisplayArray(fIdx);
      for (let i = 0; i < arr.length; i += stride) {
        if (Number.isFinite(arr[i])) sampleValues.push(arr[i]);
      }
    }
    const { p02, p98 } = computePercentileBounds(sampleValues);
    const absSorted = sampleValues.map((v) => Math.abs(v)).sort((a, b) => a - b);
    const absMaxDiff = Math.max(1e-5, absSorted[Math.floor(absSorted.length * 0.985)] ?? 1);
    return { p02, p98, absMaxDiff };
  }, [displayFrames, getDisplayArray]);

  // Immersive auto-hide on idle
  const bumpActivity = useCallback(() => {
    setIdleHidden(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!immersiveMode) return;
    idleTimerRef.current = setTimeout(() => setIdleHidden(true), 3400);
  }, [immersiveMode]);

  useEffect(() => {
    if (!immersiveMode) {
      setIdleHidden(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }
    bumpActivity();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [immersiveMode, bumpActivity]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('pass', surveyPassMode ? '1' : '0');
    const qs = params.toString();
    window.history.replaceState({ ...window.history.state }, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [surveyPassMode]);

  const hasViewportFrames = Boolean(data && displayFrames.length > 0);

  // High-DPR backdrop starfield
  useEffect(() => {
    const bgCanvas = backdropCanvasRef.current;
    if (!bgCanvas) return;
    const drawBg = () => {
      const rect = bgCanvas.getBoundingClientRect();
      const cssW = Math.max(320, Math.round(rect.width || window.innerWidth || 800));
      const cssH = Math.max(280, Math.round(rect.height || window.innerHeight || 600));
      const dpr = getCanvasDpr();
      bgCanvas.width = Math.round(cssW * dpr);
      bgCanvas.height = Math.round(cssH * dpr);
      const bctx = bgCanvas.getContext('2d');
      if (!bctx) return;
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.imageSmoothingEnabled = true;
      bctx.imageSmoothingQuality = 'high';

      const rad = bctx.createRadialGradient(cssW * 0.5, cssH * 0.5, 20, cssW * 0.5, cssH * 0.5, Math.max(cssW, cssH) * 0.65);
      rad.addColorStop(0, '#091124');
      rad.addColorStop(0.55, '#040814');
      rad.addColorStop(1, '#02040a');
      bctx.fillStyle = rad;
      bctx.fillRect(0, 0, cssW, cssH);

      const seedBase = Math.abs(Math.round((ra + dec) * 137)) || 42;
      for (let i = 0; i < 95; i++) {
        const rx = (((i * 73 + seedBase * 19) % 1000) / 1000) * cssW;
        const ry = (((i * 131 + seedBase * 31) % 1000) / 1000) * cssH;
        const radius = 0.8 + ((i * 17) % 10) * 0.16;
        const alpha = 0.2 + ((i * 23) % 10) * 0.05;
        drawPsfStar(bctx, rx, ry, radius, i % 4 === 0 ? '253, 224, 155' : '226, 232, 240', alpha);
      }
    };
    drawBg();
    window.addEventListener('resize', drawBg);
    return () => window.removeEventListener('resize', drawBg);
  }, [ra, dec, hasViewportFrames]);

  // Render aligned cutout frame onto canvas (DPR-scaled bicubic smooth by default; raw pixels only in Advanced)
  useEffect(() => {
    if (!displayFrames.length) return;
    const safeIdx = Math.min(currentFrameIdx, Math.max(0, displayFrames.length - 1));
    const frame = displayFrames[safeIdx];
    if (!frame) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = frame.width || 64;
    const height = frame.height || 64;

    if (
      !prefersReducedMotion &&
      fadeCanvasRef.current &&
      prevRenderedFrameRef.current !== null &&
      prevRenderedFrameRef.current !== currentFrameIdx &&
      canvas.width > 0 &&
      canvas.height > 0
    ) {
      const fCanvas = fadeCanvasRef.current;
      fCanvas.width = canvas.width;
      fCanvas.height = canvas.height;
      const fCtx = fCanvas.getContext('2d');
      if (fCtx) {
        fCtx.clearRect(0, 0, fCanvas.width, fCanvas.height);
        fCtx.imageSmoothingEnabled = !pixelSharp;
        if (!pixelSharp) fCtx.imageSmoothingQuality = 'high';
        fCtx.drawImage(canvas, 0, 0);
        setFadeOpacity(0.55);
        requestAnimationFrame(() => requestAnimationFrame(() => setFadeOpacity(0)));
      }
    }
    prevRenderedFrameRef.current = currentFrameIdx;

    const pixels = getDisplayArray(safeIdx);
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
    const rgba = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < width * height; i++) {
      const val = pixels[i] ?? 0;
      let r = 0;
      let g = 0;
      let b = 0;

      if (isDiff) {
        const scaled = val / diffScale;
        const signedBase =
          stretchMode === 'linear'
            ? Math.max(-1, Math.min(1, scaled))
            : Math.max(-1, Math.min(1, Math.asinh(scaled * 3) / Math.asinh(3)));
        const signed = invertColors ? -signedBase : signedBase;
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
        const rawNorm = Math.max(0, Math.min(1, (val - p02) / range));
        let norm = rawNorm;
        if (stretchMode === 'asinh') norm = Math.max(0, Math.min(1, Math.asinh(rawNorm * 5) / Math.asinh(5)));
        else if (stretchMode === 'sqrt') norm = Math.sqrt(rawNorm);
        else if (stretchMode === 'log') norm = Math.log10(1 + rawNorm * 9) / Math.log10(10);
        if (invertColors) norm = 1 - norm;
        const byteVal = Math.round(norm * 255);
        r = Math.min(255, Math.round(byteVal * 1.05));
        g = Math.min(255, Math.round(byteVal * 0.86));
        b = Math.min(255, Math.round(byteVal * 0.58));
      }

      if (showDqOverlay && frame.flags && (frame.flags[i] & DQ_ARTIFACT_MASK) !== 0) {
        r = Math.min(255, Math.round(r * 0.45 + 244 * 0.55));
        g = Math.min(255, Math.round(g * 0.45 + 63 * 0.55));
        b = Math.min(255, Math.round(b * 0.45 + 94 * 0.55));
      }

      rgba[i * 4] = r;
      rgba[i * 4 + 1] = g;
      rgba[i * 4 + 2] = b;
      rgba[i * 4 + 3] = 255;
    }

    const dpr = getCanvasDpr();
    if (pixelSharp) {
      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingEnabled = false;
      ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
    } else {
      const targetW = Math.min(512, Math.max(256, width * 5));
      const targetH = Math.min(512, Math.max(256, height * 5));
      const upsampled = bicubicUpsampleRgba(rgba, width, height, targetW, targetH);

      const off = document.createElement('canvas');
      off.width = targetW;
      off.height = targetH;
      const octx = off.getContext('2d');
      if (octx) {
        const clamped = new Uint8ClampedArray(upsampled.length);
        clamped.set(upsampled);
        octx.putImageData(new ImageData(clamped, targetW, targetH), 0, 0);
      }

      const finalW = Math.round(targetW * Math.min(dpr, 1.5));
      const finalH = Math.round(targetH * Math.min(dpr, 1.5));
      canvas.width = finalW;
      canvas.height = finalH;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, finalW, finalH);
      ctx.drawImage(off, 0, 0, finalW, finalH);
    }

    if (fadeCanvasRef.current && (fadeCanvasRef.current.width !== canvas.width || fadeCanvasRef.current.height !== canvas.height)) {
      fadeCanvasRef.current.width = canvas.width;
      fadeCanvasRef.current.height = canvas.height;
    }

    onCanvasReady?.(canvas);
  }, [
    displayFrames,
    currentFrameIdx,
    renderMode,
    globalScale,
    globalScaleEnabled,
    showDqOverlay,
    stretchMode,
    invertColors,
    prefersReducedMotion,
    pixelSharp,
    getDisplayArray,
    onCanvasReady,
  ]);

  const buildShareDeepLink = useCallback(
    (embed = false) => {
      if (typeof window === 'undefined') return '';
      const params = new URLSearchParams(window.location.search);
      params.set('ra', ra.toFixed(5));
      params.set('dec', dec.toFixed(5));
      const fovArcmin = Number(((sizePix * 6.2) / 60).toFixed(1));
      params.set('fov', String(fovArcmin));
      if (selectedDetector || data?.selectedDetector) {
        params.set('band', selectedDetector || data?.selectedDetector || 'D1');
      }
      if (caseId) params.set('target', caseId.replace(/^case-/, ''));
      params.set('pass', surveyPassMode ? '1' : '0');
      if (embed) params.set('embed', '1');
      else params.delete('embed');
      return `${window.location.origin}/explore?${params.toString()}`;
    },
    [ra, dec, sizePix, selectedDetector, data?.selectedDetector, caseId, surveyPassMode]
  );

  const handleCopyDeepLink = useCallback(() => {
    if (typeof window === 'undefined') return;
    gameAudio.playClick();
    const link = buildShareDeepLink(false) || window.location.href;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopiedLink(true);
    onShareUsed?.();
    setTimeout(() => setCopiedLink(false), 2000);
  }, [buildShareDeepLink, onShareUsed]);

  const handleReportBadData = useCallback(
    async (frame: AlignedTimeSeriesFrame) => {
      gameAudio.playClick();
      const targetPos = tappedPix || frame.targetRefPixel || frame.targetPixel || { x: Math.floor((frame.width || 64) / 2), y: Math.floor((frame.height || 64) / 2) };
      addBadDataReport({
        frameId: frame.obsId,
        obsId: frame.obsId,
        detector: frame.detector || 'D1',
        targetName: targetLabel || caseId || 'SPHEREx Patch',
        x: Number(targetPos.x.toFixed(1)),
        y: Number(targetPos.y.toFixed(1)),
        ra,
        dec,
        reason: (frame.dqDecoded?.totalMaskedPixels ?? 0) > 0 ? 'DQ artifact / cosmic-ray spike' : 'Citizen-flagged pixel anomaly',
      });
      setBadDataToast(t.badDataReportedToast);
      setTimeout(() => setBadDataToast(null), 3200);
      try {
        await fetch('/api/community/flags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frameId: frame.obsId,
            obsId: frame.obsId,
            detector: frame.detector || 'D1',
            targetName: targetLabel || caseId || 'SPHEREx Patch',
            ra,
            dec,
            x: Number(targetPos.x.toFixed(1)),
            y: Number(targetPos.y.toFixed(1)),
            reason: (frame.dqDecoded?.totalMaskedPixels ?? 0) > 0 ? 'DQ artifact / cosmic-ray spike' : 'Citizen-flagged pixel anomaly',
          }),
        });
      } catch {
        // Offline graceful fallback already persisted locally
      }
    },
    [tappedPix, targetLabel, caseId, ra, dec, t.badDataReportedToast]
  );

  const buildExplainContext = useCallback((): SpexExplainContext | null => {
    if (!displayFrames.length || !data) return null;
    const idx = Math.min(currentFrameIdx, Math.max(0, displayFrames.length - 1));
    const fr = displayFrames[idx] || displayFrames[0];
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

    const nearestCatalogSources: SpexNearbySource[] = (alignedDataset.catalogOverlays || [])
      .slice(0, 6)
      .map((cat) => {
        const catRa = cat.raPropagated ?? cat.raRaw;
        const catDec = cat.decPropagated ?? cat.decRaw;
        let distArcsec = 999;
        if (Number.isFinite(catRa) && Number.isFinite(catDec)) {
          distArcsec = WCS.angularSeparationArcsec(data.targetCoords.ra, data.targetCoords.dec, catRa, catDec);
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
      totalFrames: displayFrames.length,
      dateObs: fr.dateObs,
      detector: fr.detector,
      wavelengthUm: fr.wavelengthUm,
      release: (fr.release || data.activeRelease || 'public').toUpperCase(),
      dataSourceType: isDiscoveryEligible ? 'live' : 'snapshot',
      sourceClassification: canonicalClass,
      discoveryEligible: isDiscoveryEligible,
      tapFreshness: data.tapFreshness,
      snapshotDate: data.snapshotTakenAt || data.cachedAt || fr.dateObs?.slice(0, 10),
      renderMode,
      targetPixel: fr.targetPixel || null,
      predictedPixel: predictedPix,
      measuredCentroidPixel: fr.measuredCentroid?.valid ? { x: fr.measuredCentroid.x, y: fr.measuredCentroid.y } : null,
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
            wingFitUsed: (aSum.wingFitCount ?? 0) > 0,
            saturatedAllDetectors: aSum.saturatedAllDetectors,
            errorBudgetLabel: aSum.errorBudgetLabel,
          }
        : null,
      nearestCatalogSources,
    };
  }, [data, displayFrames, alignedDataset.catalogOverlays, currentFrameIdx, targetLabel, caseId, renderMode]);

  useEffect(() => {
    const ctx = buildExplainContext();
    if (ctx) onExplainContextChange?.(ctx);
  }, [buildExplainContext, onExplainContextChange]);

  const inspectSpotAtPixel = useCallback(
    (px: number, py: number) => {
      if (!displayFrames.length || !data) return;
      const idx = Math.min(currentFrameIdx, Math.max(0, displayFrames.length - 1));
      const fr = displayFrames[idx] || displayFrames[0];
      if (!fr) return;
      const w = fr.width || 64;
      const h = fr.height || 64;
      const clampedX = Math.max(0, Math.min(w - 1, px));
      const clampedY = Math.max(0, Math.min(h - 1, py));
      setTappedPix({ x: clampedX, y: clampedY });

      const inspected = inspectSpotOnRawFrame(clampedX, clampedY, alignedDataset.displayWcs, fr);
      const snr =
        inspected.fluxMjySr != null && inspected.variance != null && inspected.variance > 0
          ? inspected.fluxMjySr / Math.sqrt(inspected.variance)
          : null;
      const flagsPlain = decodeFlagsPlainWords(inspected.flagsBitmask, language);

      const nearbySources: SpexNearbySource[] = (alignedDataset.catalogOverlays || [])
        .map((cat) => {
          const catRa = cat.raPropagated ?? cat.raRaw;
          const catDec = cat.decPropagated ?? cat.decRaw;
          let distArcsec = 999;
          if (inspected.sky && Number.isFinite(catRa) && Number.isFinite(catDec)) {
            distArcsec = WCS.angularSeparationArcsec(inspected.sky.ra, inspected.sky.dec, catRa, catDec);
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
      const isNearTarget = Boolean(measPix && Math.hypot(clampedX - measPix.x, clampedY - measPix.y) <= 2.8);
      const isNearPredicted = Boolean(predPix && Math.hypot(clampedX - predPix.x, clampedY - predPix.y) <= 2.8);

      const spot: SpexSpotSelection = {
        x: Number(clampedX.toFixed(2)),
        y: Number(clampedY.toFixed(2)),
        ra: inspected.sky ? Number(inspected.sky.ra.toFixed(6)) : null,
        dec: inspected.sky ? Number(inspected.sky.dec.toFixed(6)) : null,
        fluxMjySr: inspected.fluxMjySr != null ? Number(inspected.fluxMjySr.toFixed(4)) : null,
        snr: snr != null ? Number(snr.toFixed(2)) : null,
        flagsBitmask: inspected.flagsBitmask,
        flagsPlain,
        isNearTarget,
        isNearPredicted,
        nearbySources,
      };

      recordViewerAction('inspectedSpot');
      const ctx = buildExplainContext();
      if (ctx) onSpotSelect?.(spot, ctx);
    },
    [displayFrames, data, alignedDataset, currentFrameIdx, language, buildExplainContext, onSpotSelect]
  );

  const detectorRanges = useMemo(() => {
    const src = knownDetectors.length > 0 ? knownDetectors : data?.availableDetectors;
    if (src && src.length > 0) {
      return src.map((d) => ({
        detector: d.detector,
        wavelengthRangeUm: d.wavelengthRangeUm,
        exposureCount: d.exposureCount,
      }));
    }
    return DEFAULT_SPHEREX_DETECTOR_RANGES;
  }, [knownDetectors, data?.availableDetectors]);

  const safeFrameIdx = Math.min(currentFrameIdx, Math.max(0, displayFrames.length - 1));
  const activeFrame = displayFrames[safeFrameIdx] || displayFrames[0];
  const currentDetectorId = selectedDetector || data?.selectedDetector || activeFrame?.detector || 'D1';
  const currentFrameUm = activeFrame?.wavelengthUm ?? detectorToCenterUm(currentDetectorId, detectorRanges);

  const handleResetView = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, []);

  const gestures = useSkyGestures({
    enabled: Boolean(displayFrames.length),
    totalFrames: displayFrames.length,
    currentFrameIdx: safeFrameIdx,
    onScrubFrame: (idx) => {
      setIsPlaying(false);
      setCurrentFrameIdx(idx);
      onSelectFrame?.(idx);
    },
    availableDetectors: detectorRanges,
    currentDetector: currentDetectorId,
    currentWavelengthUm: currentFrameUm,
    onPreviewWavelength: (preview) => setWavelengthPreview(preview),
    onCommitDetector: (det) => {
      if (det !== selectedDetector) {
        setSelectedDetector(det);
        recordViewerAction('changedBand');
        onDetectorChange?.(det);
      }
    },
    zoom,
    onZoomChange: setZoom,
    pan,
    onPanChange: setPan,
    onResetView: handleResetView,
    onTapPoint: (clientX, clientY) => {
      const canvas = canvasRef.current;
      if (!canvas || !activeFrame) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const w = activeFrame.width || 64;
      const h = activeFrame.height || 64;
      const px = ((clientX - rect.left) / rect.width) * w;
      const py = ((clientY - rect.top) / rect.height) * h;
      inspectSpotAtPixel(px, py);
    },
    isRtl,
    reducedMotion: prefersReducedMotion,
  });

  const handleExportPng = () => {
    const srcCanvas = canvasRef.current;
    if (!srcCanvas || !activeFrame || !data) return;

    const dpr = getCanvasDpr();
    const outW = 512;
    const outH = 576;
    const out = document.createElement('canvas');
    out.width = Math.round(outW * dpr);
    out.height = Math.round(outH * dpr);
    const ctx = out.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#05070e';
    ctx.fillRect(0, 0, outW, outH);
    ctx.imageSmoothingEnabled = !pixelSharp;
    if (!pixelSharp) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(srcCanvas, 0, 0, outW, outW);

    const w = activeFrame.width || 64;
    const h = activeFrame.height || 64;
    const sx = outW / w;
    const sy = outW / h;

    const ep1Pix = displayFrames[0]?.targetRefPixel || displayFrames[0]?.targetPixel;
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

    ctx.fillStyle = '#0c1220';
    ctx.fillRect(0, outW, outW, 64);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(
      `SPHEREx ${activeFrame.detector} (${activeFrame.wavelengthUm.toFixed(2)} um) | ${activeFrame.obsId}`,
      14,
      outW + 24
    );
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(
      `RA ${data.targetCoords.ra.toFixed(4)} Dec ${data.targetCoords.dec.toFixed(4)} | ${activeFrame.dateObs}`,
      14,
      outW + 45
    );

    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = `spherex_${activeFrame.obsId}_${activeFrame.detector}.png`;
    a.click();
  };

  const submitCoordSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCoordinateInput(coordInput);
    if (!parsed) {
      setCoordError(t.coordSearchError);
      return;
    }
    setCoordError(null);
    setCoordInput('');
    onSearchCoordinates?.(parsed.ra, parsed.dec);
  };

  if (loading && !data) {
    const progressText =
      loadingProgress && loadingProgress.total > 0
        ? `${t.loadingFramesArriving}: ${loadingProgress.loaded} / ${loadingProgress.total}`
        : t.loadingScanningSky;
    return (
      <SkeletonSky
        label={t.loadingScanningSky}
        sublabel={progressText}
        loaded={loadingProgress?.loaded}
        total={loadingProgress?.total}
        elapsedSec={loadingElapsedSec}
        slowHint={t.loadingScanningSlow}
        hasSavedCopy
        onUseSavedCopy={handleUseOfflineDemo}
        savedCopyLabel={t.exploreOfflineDemoBtn}
        aspectRatio="video"
        className={className}
      />
    );
  }

  if (state === 'NETWORK_ERROR' || error) {
    return (
      <ErrorState
        title={t.exploreErrorTitle}
        error={error || t.exploreErrorHint}
        canRetry
        onRetry={fetchTimeSeries}
        retryLabel={t.exploreRetryBtn}
        hasSavedCopy
        onUseSavedCopy={handleUseOfflineDemo}
        savedCopyLabel={t.exploreOfflineDemoBtn}
        className={className}
      />
    );
  }

  if (state === 'ARCHIVE_ZERO_ROWS' || !data || !activeFrame) {
    return (
      <ErrorState
        title={t.exploreErrorTitle}
        error={data?.message || t.exploreErrorHint}
        canRetry
        onRetry={fetchTimeSeries}
        retryLabel={t.exploreRetryBtn}
        hasSavedCopy
        onUseSavedCopy={handleUseOfflineDemo}
        savedCopyLabel={t.exploreOfflineDemoBtn}
        className={className}
      />
    );
  }

  const frameW = activeFrame.width || 64;
  const frameH = activeFrame.height || 64;
  const activeClassification = normalizeSourceClassification(data.sourceClassification, {
    sourceMode: data.sourceMode,
    isSnapshot: Boolean(data.isSnapshot),
    isDemoCopy: Boolean(data.isDemoCopy),
    tapFreshness: data.tapFreshness,
    cacheIntegrityVerified: data.cacheIntegrityVerified,
    someCached: Boolean(data.cachedFrameCount && data.cachedFrameCount > 0) || Boolean(activeFrame.isCached),
    status: data.status,
    state: data.state,
  });
  const classificationMeta = getSourceClassificationMeta(activeClassification, language);
  const effectiveDiscoveryEligible =
    typeof data.discoveryEligible === 'boolean' ? data.discoveryEligible : classificationMeta.discoveryEligible;

  // Honest provenance badge text (ONLY one badge: live data vs saved snapshot)
  const isSnapshotMode =
    activeClassification === 'SAVED_BENCHMARK' ||
    activeClassification === 'SYNTHETIC_DEMO' ||
    Boolean(data.isSnapshot) ||
    Boolean(data.isDemoCopy) ||
    data.sourceMode === 'saved_benchmark' ||
    (!effectiveDiscoveryEligible && serverDataMode === 'snapshot');
  const provenanceBadgeLabel = isSnapshotMode
    ? t.exploreSnapshotBadge
    : activeClassification === 'LIVE_ARCHIVE_DATA' ||
      activeClassification === 'VERIFIED_FITS_CACHE' ||
      data.sourceMode === 'live'
    ? t.exploreLiveDataBadge
    : classificationMeta.shortTag;

  const formatFrameMonthYear = (fr: AlignedTimeSeriesFrame): string => {
    const iso = fr.dateObs;
    let d: Date | null = null;
    if (iso) {
      const normalizedIso =
        iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
      const parsed = new Date(normalizedIso);
      if (!Number.isNaN(parsed.getTime())) d = parsed;
    }
    if (!d && Number.isFinite(fr.mjd) && fr.mjd > 0) {
      d = new Date((fr.mjd - 40587) * 86400_000);
    }
    if (!d) return `F${fr.index + 1}`;
    return d.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  };

  const formatRealGapLabel = (
    prev: AlignedTimeSeriesFrame | undefined,
    cur: AlignedTimeSeriesFrame
  ): string | null => {
    if (!prev || !Number.isFinite(prev.mjd) || !Number.isFinite(cur.mjd)) return null;
    const gapDays = cur.mjd - prev.mjd;
    if (!Number.isFinite(gapDays) || gapDays <= 0.05) return null;
    if (gapDays >= 45) {
      const months = gapDays / 30.4375;
      return `+${months.toFixed(1)} ${t.surveyPassMonthsUnit}`;
    }
    return `+${Math.round(gapDays)} ${t.surveyPassDaysUnit}`;
  };

  // Motion trail points mapped onto displayWcs
  const epoch1Anchor = displayFrames[0]?.targetRefPixel || displayFrames[0]?.targetPixel;
  const motionIsSignificant = Boolean(data.astrometrySummary?.motionSignificant);
  const measuredTrailPoints = displayFrames
    .slice(0, safeFrameIdx + 1)
    .map((f, idx) =>
      f.measuredCentroid?.valid ? { x: f.measuredCentroid.x, y: f.measuredCentroid.y, idx } : null
    )
    .filter((p): p is { x: number; y: number; idx: number } => Boolean(p));
  const expectedTrailPoints = displayFrames
    .slice(0, safeFrameIdx + 1)
    .map((f, idx) => {
      const p = f.targetRefPixel || f.targetPixel;
      return p ? { x: p.x, y: p.y, idx } : null;
    })
    .filter((p): p is { x: number; y: number; idx: number } => Boolean(p));
  const activeTrailPoints =
    motionIsSignificant && measuredTrailPoints.length > 0
      ? measuredTrailPoints
      : measuredTrailPoints.length >= 2
      ? measuredTrailPoints
      : expectedTrailPoints;
  const currentTargetPix = activeFrame.targetRefPixel || activeFrame.targetPixel;

  const dqSpots = showDqOverlay && activeFrame.flags?.length
    ? activeFrame.flags.reduce<Array<{ x: number; y: number }>>((acc, flag, idx) => {
        if (acc.length < 24 && (flag & DQ_ARTIFACT_MASK) !== 0) {
          acc.push({ x: idx % frameW, y: Math.floor(idx / frameW) });
        }
        return acc;
      }, [])
    : [];

  const panelHiddenClass =
    immersiveMode && idleHidden
      ? 'opacity-0 pointer-events-none transition-opacity duration-300'
      : 'opacity-100 transition-opacity duration-200';

  const aSum = data.astrometrySummary;
  const sigmaVal =
    aSum?.sigma ??
    (aSum && aSum.measuredDisplacementErrorArcsec > 0
      ? aSum.measuredDisplacementArcsec / aSum.measuredDisplacementErrorArcsec
      : 0);

  return (
    <div
      onPointerMove={bumpActivity}
      onPointerDown={bumpActivity}
      onKeyDown={bumpActivity}
      className={`relative w-full ${isEmbed ? 'h-screen' : 'min-h-[calc(100vh-4rem)] h-[calc(100vh-4rem)]'} bg-[#02040A] overflow-hidden select-none ${className}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Full-bleed sky background + Interactive cutout viewport */}
      <div
        ref={gestures.viewportRef}
        data-tour="viewport_canvas"
        {...gestures.handlers}
        className="absolute inset-0 w-full h-full touch-none cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden"
      >
        <canvas
          ref={backdropCanvasRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#040711]/85 backdrop-blur-sm">
            <SkeletonSky
              label={t.loadingScanningSky}
              sublabel={t.loadingFramesArriving}
              elapsedSec={loadingElapsedSec}
              slowHint={t.loadingScanningSlow}
              hasSavedCopy
              onUseSavedCopy={handleUseOfflineDemo}
              savedCopyLabel={t.exploreOfflineDemoBtn}
              aspectRatio="square"
              className="w-80 rounded-2xl border border-white/15"
            />
          </div>
        )}

        <div
          className="relative shrink-0"
          style={{
            width: 'min(92vw, 72vh, 640px)',
            height: 'min(92vw, 72vh, 640px)',
            aspectRatio: '1 / 1',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition:
              gestures.activeGesture === 'pan' ||
              gestures.activeGesture === 'pinch' ||
              prefersReducedMotion
                ? 'none'
                : 'transform 140ms ease-out',
            willChange: 'transform',
          }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full block cursor-crosshair"
            style={{ imageRendering: pixelSharp ? 'pixelated' : 'auto' }}
            aria-label={`SPHEREx cutout canvas for frame ${safeFrameIdx + 1}`}
          />

          <canvas
            ref={fadeCanvasRef}
            aria-hidden="true"
            className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-200"
            style={{
              opacity: fadeOpacity,
              imageRendering: pixelSharp ? 'pixelated' : 'auto',
            }}
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, transparent 62%, rgba(2,4,10,0.6) 86%, #02040A 100%)',
            }}
          />

          <svg
            viewBox={`0 0 ${frameW} ${frameH}`}
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
          >
            {showPixelGrid && (
              <g stroke="rgba(255,255,255,0.16)" strokeWidth={0.14}>
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

            {alignedDataset.catalogOverlays?.map((cat, idx) => {
              if (cat.x < 0 || cat.x > frameW || cat.y < 0 || cat.y > frameH) return null;
              const isGaia = cat.catalog === 'Gaia DR3';
              if (isGaia && !showGaiaOverlay) return null;
              if (!isGaia && !showAllWiseOverlay) return null;
              return isGaia ? (
                <circle
                  key={`${cat.identifier}-${idx}`}
                  cx={cat.x}
                  cy={cat.y}
                  r={1.35}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth={0.28}
                  opacity={0.82}
                />
              ) : (
                <rect
                  key={`${cat.identifier}-${idx}`}
                  x={cat.x - 1.15}
                  y={cat.y - 1.15}
                  width={2.3}
                  height={2.3}
                  fill="none"
                  stroke="#34D399"
                  strokeWidth={0.26}
                  transform={`rotate(45 ${cat.x} ${cat.y})`}
                  opacity={0.82}
                />
              );
            })}

            {showEpoch1Crosshair && epoch1Anchor && (
              <g stroke="#FFB900" strokeWidth={0.34} opacity={0.92}>
                <line x1={epoch1Anchor.x - 3} y1={epoch1Anchor.y} x2={epoch1Anchor.x - 0.8} y2={epoch1Anchor.y} />
                <line x1={epoch1Anchor.x + 0.8} y1={epoch1Anchor.y} x2={epoch1Anchor.x + 3} y2={epoch1Anchor.y} />
                <line x1={epoch1Anchor.x} y1={epoch1Anchor.y - 3} x2={epoch1Anchor.x} y2={epoch1Anchor.y - 0.8} />
                <line x1={epoch1Anchor.x} y1={epoch1Anchor.y + 0.8} x2={epoch1Anchor.x} y2={epoch1Anchor.y + 3} />
              </g>
            )}

            {showMotionTrail && activeTrailPoints.length > 0 && (
              <g>
                {activeTrailPoints.length > 1 && (
                  <>
                    <polyline
                      fill="none"
                      stroke="rgba(2, 4, 10, 0.72)"
                      strokeWidth={1.05}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={activeTrailPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    />
                    <polyline
                      fill="none"
                      stroke={motionIsSignificant ? '#00D3F3' : '#F59E0B'}
                      strokeWidth={0.62}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={motionIsSignificant ? undefined : '1.1 0.7'}
                      points={activeTrailPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    />
                  </>
                )}
                {measuredTrailPoints.map((p, i) => {
                  const prog = measuredTrailPoints.length > 1 ? i / (measuredTrailPoints.length - 1) : 1;
                  return (
                    <circle
                      key={`ghost-${p.idx}-${i}`}
                      cx={p.x}
                      cy={p.y}
                      r={0.5 + prog * 0.45}
                      fill={motionIsSignificant ? '#00D3F3' : '#F59E0B'}
                      stroke="rgba(2, 4, 10, 0.75)"
                      strokeWidth={0.18}
                      opacity={0.35 + prog * 0.65}
                    />
                  );
                })}
                {!motionIsSignificant && activeTrailPoints.length > 1 && (() => {
                  const last = activeTrailPoints[activeTrailPoints.length - 1];
                  return (
                    <text
                      x={Math.min(frameW - 14, last.x + 2.4)}
                      y={Math.max(4, last.y - 2.2)}
                      fill="#FBBF24"
                      fontSize="2.2"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {t.trailExpectedLabel}
                    </text>
                  );
                })()}
                {currentTargetPix && (
                  <circle
                    cx={currentTargetPix.x}
                    cy={currentTargetPix.y}
                    r={2.2}
                    fill="none"
                    stroke="#00D3F3"
                    strokeWidth={0.42}
                  />
                )}
              </g>
            )}

            {showDqOverlay &&
              dqSpots.map((spot, idx) => (
                <rect
                  key={`dq-${idx}`}
                  x={spot.x - 0.55}
                  y={spot.y - 0.55}
                  width={1.1}
                  height={1.1}
                  fill="rgba(244,63,94,0.18)"
                  stroke="#F43F5E"
                  strokeWidth={0.22}
                  rx={0.2}
                />
              ))}

            {tappedPix && (
              <g stroke="#FACC15" strokeWidth={0.35}>
                <circle cx={tappedPix.x} cy={tappedPix.y} r={1.8} fill="none" />
                <circle cx={tappedPix.x} cy={tappedPix.y} r={0.3} fill="#FACC15" />
              </g>
            )}

            {spexHighlights.map((h, i) => (
              <circle
                key={`spex-h-${i}`}
                cx={h.x}
                cy={h.y}
                r={h.r || 3.2}
                fill="none"
                stroke="#FFB900"
                strokeWidth={0.45}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* ================================================================== */}
      {/* FLOATING TOP BAR (Overlaid ON TOP of the sky image)                */}
      {/* ================================================================== */}
      {!isEmbed && (
        <div
          data-gesture-ignore="true"
          className={`absolute top-2.5 inset-x-2.5 sm:inset-x-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none ${panelHiddenClass}`}
        >
          {/* Left: Back to map + Target preset + Coords search */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-[#070B16]/82 backdrop-blur-xl border border-white/15 rounded-2xl px-2.5 py-1.5 shadow-xl max-w-full">
            {onBackToSky && (
              <button
                type="button"
                data-testid="explore-back-to-map-btn"
                onClick={onBackToSky}
                title={t.exploreBackToMap}
                aria-label={t.exploreBackToMap}
                className="min-h-[34px] px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition"
              >
                <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                <span className="hidden sm:inline">{t.exploreBackToMap}</span>
              </button>
            )}

            {presetTargets && presetTargets.length > 0 && (
              <select
                data-testid="explore-target-select"
                aria-label={t.exploreSimpleTargetLabel}
                value={caseId || '__custom__'}
                onChange={(e) => {
                  const nextId = e.target.value;
                  if (nextId !== '__custom__') {
                    gameAudio.playClick();
                    onSelectPresetCase?.(nextId);
                  }
                }}
                className="min-h-[34px] px-2.5 py-1 rounded-xl bg-white/[0.06] border border-white/15 text-slate-100 text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {presetTargets.map((p) => (
                  <option key={p.caseId} value={p.caseId} className="bg-[#080D1B] text-slate-100">
                    {isRtl ? p.labelAr : p.label} — {p.sub}
                  </option>
                ))}
                {!caseId && (
                  <option value="__custom__" className="bg-[#080D1B] text-slate-100">
                    {targetLabel || `${ra.toFixed(2)}°, ${dec.toFixed(2)}°`}
                  </option>
                )}
              </select>
            )}

            {onSearchCoordinates && (
              <form onSubmit={submitCoordSearch} className="hidden md:flex items-center gap-1">
                <input
                  type="text"
                  data-testid="explore-coord-input"
                  value={coordInput}
                  onChange={(e) => {
                    setCoordInput(e.target.value);
                    if (coordError) setCoordError(null);
                  }}
                  placeholder="RA, Dec"
                  aria-label={t.coordSearchPlaceholder}
                  title={t.coordSearchPlaceholder}
                  className="w-36 px-2.5 py-1 min-h-[34px] rounded-xl bg-black/55 border border-white/15 text-xs font-mono text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  aria-label={t.homeCoordSearchBtn}
                  title={t.homeCoordSearchBtn}
                  className="min-h-[34px] min-w-[34px] px-2 py-1 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/40 text-sky-200 flex items-center justify-center cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {coordError && (
              <span className="text-[11px] text-rose-300 font-mono px-1.5">{coordError}</span>
            )}
          </div>

          {/* Right: Provenance badge (1 only) + Findings + Advanced + Immersive + Help */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-[#070B16]/82 backdrop-blur-xl border border-white/15 rounded-2xl px-2.5 py-1.5 shadow-xl">
            <span
              data-testid="explore-snapshot-badge"
              data-source-mode={isSnapshotMode ? 'snapshot' : 'live'}
              title={classificationMeta.description}
              className={`px-2 py-1 rounded-lg border font-mono text-[11px] font-semibold ${
                effectiveDiscoveryEligible && !isSnapshotMode
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                  : 'bg-indigo-500/20 border-indigo-400/40 text-indigo-200'
              }`}
            >
              {provenanceBadgeLabel}
            </span>

            {alignedDataset.hasAnyUnaligned && (
              <span
                data-testid="unaligned-warning-badge"
                className="px-2 py-1 rounded-lg border border-rose-400/45 bg-rose-500/20 text-rose-200 font-mono text-[11px] font-bold"
              >
                {t.alignmentUnalignedBadge}
              </span>
            )}

            {onOpenFindings && (
              <button
                type="button"
                data-testid="open-findings-btn"
                onClick={() => {
                  gameAudio.playClick();
                  onOpenFindings();
                }}
                title={t.findingsTitle}
                aria-label={t.findingsTitle}
                className="min-h-[34px] px-2.5 py-1 rounded-xl border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span>{t.findingsBtn}</span>
              </button>
            )}

            <button
              type="button"
              data-testid="advanced-toggle-btn"
              onClick={() => {
                setAdvancedOpen((prev) => {
                  const next = !prev;
                  if (next) setLeftRailOpen(true);
                  return next;
                });
              }}
              aria-expanded={advancedOpen}
              title={t.exploreAdvancedToggle}
              aria-label={t.exploreAdvancedToggle}
              className={`min-h-[34px] px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
                advancedOpen
                  ? 'bg-sky-400 text-slate-950 border-sky-400 font-bold'
                  : 'bg-white/5 border-white/15 text-slate-200 hover:bg-white/15'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span>{t.exploreAdvancedToggle}</span>
            </button>

            <button
              type="button"
              onClick={() => setImmersiveMode((v) => !v)}
              aria-pressed={immersiveMode}
              title={t.immersiveHint}
              aria-label={t.immersiveToggle}
              className={`min-h-[34px] px-2 py-1 rounded-xl border text-xs flex items-center gap-1 cursor-pointer transition ${
                immersiveMode
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                  : 'bg-white/5 border-white/15 text-slate-300 hover:bg-white/15'
              }`}
            >
              {immersiveMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              data-tour="help"
              data-testid="explore-help-btn"
              onClick={() => {
                gameAudio.playClick();
                if (onOpenHelp) onOpenHelp();
                else setShowShortcutsModal(true);
              }}
              title={t.exploreHelpTitle}
              aria-label={t.exploreHelpTitle}
              className="min-h-[34px] px-2.5 py-1 rounded-xl border border-amber-400/45 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{t.exploreHelpBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* FLOATING LEFT RAIL: View + Collapsible Advanced Tools              */}
      {/* ================================================================== */}
      {!isEmbed && (
        <div
          data-gesture-ignore="true"
          className={`absolute top-32 sm:top-16 start-2.5 sm:start-4 z-20 flex flex-col items-start gap-2 max-h-[calc(100vh-22rem)] sm:max-h-[calc(100vh-14.5rem)] ${panelHiddenClass}`}
        >
          {!leftRailOpen ? (
            <button
              type="button"
              data-testid="expand-left-rail-btn"
              onClick={() => setLeftRailOpen(true)}
              aria-label={`${t.panelView} — ${t.panelExpandAria}`}
              title={t.panelView}
              className="px-3 py-2 rounded-xl bg-[#070B16]/85 backdrop-blur-xl border border-white/20 text-slate-100 text-xs font-semibold flex items-center gap-1.5 shadow-xl cursor-pointer hover:bg-[#0D152B]"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.panelView}</span>
              <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <div className="w-56 sm:w-60 bg-[#070B16]/85 backdrop-blur-xl border border-white/15 rounded-2xl p-3 shadow-2xl space-y-3 overflow-y-auto text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <span className="font-mono font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  {t.panelView}
                </span>
                <button
                  type="button"
                  onClick={() => setLeftRailOpen(false)}
                  aria-label={t.panelCollapseAria}
                  title={t.panelCollapseAria}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <ChevronLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Stretch */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-slate-400">Stretch</span>
                <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
                  {(['asinh', 'sqrt', 'log', 'linear'] as PlayerStretchMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setStretchMode(mode)}
                      aria-pressed={stretchMode === mode}
                      className={`py-1 rounded-lg border cursor-pointer transition ${
                        stretchMode === mode
                          ? 'bg-sky-400 text-slate-950 border-sky-400 font-bold'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zoom + Reset + Invert */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.35).toFixed(2))))}
                    aria-label={t.zoomOutLabel}
                    title={t.zoomOutLabel}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/15 text-slate-200 cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] text-slate-200 min-w-[38px] text-center tabular-nums">
                    {zoom.toFixed(1)}×
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(6, Number((z + 0.35).toFixed(2))))}
                    aria-label={t.zoomInLabel}
                    title={t.zoomInLabel}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/15 text-slate-200 cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResetView}
                  title={t.zoomResetLabel}
                  aria-label={t.zoomResetLabel}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/15 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t.zoomResetLabel}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setInvertColors((v) => !v)}
                aria-pressed={invertColors}
                className={`w-full py-1.5 px-2.5 rounded-lg border text-start font-medium cursor-pointer transition ${
                  invertColors
                    ? 'bg-amber-400/20 border-amber-400/50 text-amber-200'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                {t.sciInvertColors}
              </button>

              {/* Progressive Advanced Disclosure */}
              {advancedOpen && (
                <div className="pt-2 border-t border-white/10 space-y-2.5">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-slate-400">{t.sciGroupArithmetic}</span>
                    <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                      {(
                        [
                          { id: 'raw', label: t.sciDiffRaw },
                          { id: 'diff_ref', label: t.sciDiffEp1 },
                          { id: 'diff_median', label: t.sciDiffMedian },
                          { id: 'coadd', label: t.sciCoadd },
                        ] as Array<{ id: PlayerRenderMode; label: string }>
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setRenderMode(m.id);
                            const isDiff = m.id === 'diff_ref' || m.id === 'diff_median';
                            if (isDiff) recordViewerAction('toggledDiff');
                            onExplorerToggleDiff?.(isDiff);
                          }}
                          aria-pressed={renderMode === m.id}
                          className={`py-1 px-1.5 rounded-lg border cursor-pointer truncate ${
                            renderMode === m.id
                              ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                              : 'bg-white/5 border-white/10 text-slate-300'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Detector D1-D6 */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-slate-400">{t.sciGroupBands}</span>
                    <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
                      {['', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6'].map((det) => (
                        <button
                          key={det || 'auto'}
                          type="button"
                          onClick={() => {
                            setSelectedDetector(det);
                            recordViewerAction('changedBand');
                            onDetectorChange?.(det);
                          }}
                          aria-pressed={selectedDetector === det}
                          className={`py-1 rounded-lg border cursor-pointer ${
                            selectedDetector === det
                              ? 'bg-sky-400 text-slate-950 border-sky-400 font-bold'
                              : 'bg-white/5 border-white/10 text-slate-300'
                          }`}
                        >
                          {det || 'Auto'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FOV */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-slate-400">{t.fovLabelShort}</span>
                    <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
                      {[
                        { pix: 32, label: "3.3'" },
                        { pix: 64, label: "6.6'" },
                        { pix: 112, label: "11.6'" },
                        { pix: 160, label: "16.5'" },
                      ].map((opt) => (
                        <button
                          key={opt.pix}
                          type="button"
                          onClick={() => onSelectFovSize?.(opt.pix)}
                          aria-pressed={sizePix === opt.pix}
                          className={`py-1 rounded-lg border cursor-pointer ${
                            sizePix === opt.pix
                              ? 'bg-sky-400 text-slate-950 border-sky-400 font-bold'
                              : 'bg-white/5 border-white/10 text-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Max frames & Raw pixels & Global Scale */}
                  <div className="space-y-1 font-mono text-[10px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Frames</span>
                      <select
                        value={frameCount}
                        onChange={(e) => setFrameCount(Number(e.target.value) as 10 | 16 | 20 | 40)}
                        aria-label="Max frames"
                        className="bg-black/70 border border-white/15 rounded px-1.5 py-0.5 text-slate-200 cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={16}>16</option>
                        <option value={20}>20</option>
                        <option value={40}>40</option>
                      </select>
                    </div>
                    <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                      <span>{t.showRawPixelsLabel}</span>
                      <input
                        type="checkbox"
                        checked={pixelSharp}
                        onChange={(e) => setPixelSharp(e.target.checked)}
                        className="accent-sky-400 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                      <span>{t.sciScaleGlobal}</span>
                      <input
                        type="checkbox"
                        checked={globalScaleEnabled}
                        onChange={(e) => setGlobalScaleEnabled(e.target.checked)}
                        className="accent-sky-400 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                      <span>{t.showAllVisitsLabel}</span>
                      <input
                        type="checkbox"
                        data-testid="advanced-show-all-visits"
                        checked={!surveyPassMode}
                        onChange={(e) => {
                          const showAll = e.target.checked;
                          setSurveyPassMode(!showAll);
                          if (!showAll) recordViewerAction('toggledSurveyPass');
                          setCurrentFrameIdx(0);
                          setIsPlaying(false);
                        }}
                        className="accent-sky-400 cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Alignment Check Summary */}
                  <div
                    data-testid="alignment-check-panel"
                    className="p-2 rounded-xl bg-white/[0.04] border border-white/10 space-y-1 text-[10px] font-mono"
                  >
                    <div className="font-bold text-cyan-300">{t.alignmentCheckTitle}</div>
                    <div className="text-slate-300 flex justify-between">
                      <span>{t.alignmentAlignedCount}:</span>
                      <span>
                        {alignedDataset.alignedCount}/{alignedFrames.length}
                      </span>
                    </div>
                    {aSum && (
                      <>
                        <div className="text-slate-300 flex justify-between">
                          <span>{t.alignmentFloorLabel}:</span>
                          <span>{aSum.astrometricFloorArcsec.toFixed(2)}″</span>
                        </div>
                        <div className="text-slate-300 flex justify-between">
                          <span>{t.alignmentRefStarsLabel}:</span>
                          <span>{aSum.medianRefStarsUsed}</span>
                        </div>
                      </>
                    )}
                    <div className={alignedDataset.hasAnyUnaligned ? 'text-rose-300' : 'text-emerald-300'}>
                      {alignedDataset.hasAnyUnaligned ? t.alignmentWcsWarning : t.alignmentWcsValid}
                    </div>
                  </div>

                  {/* Secondary Tool Triggers */}
                  <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                    {onStartGuidedDemo && (
                      <button
                        type="button"
                        onClick={onStartGuidedDemo}
                        className="py-1.5 px-2 rounded-lg border border-emerald-400/40 bg-emerald-500/15 text-emerald-200 cursor-pointer truncate"
                      >
                        60s Demo
                      </button>
                    )}
                    {onOpenCurtainLab && (
                      <button
                        type="button"
                        onClick={onOpenCurtainLab}
                        className="py-1.5 px-2 rounded-lg border border-white/15 bg-white/5 text-slate-200 cursor-pointer truncate"
                      >
                        Curtain Lab
                      </button>
                    )}
                    {onOpenSpectrum && (
                      <button
                        type="button"
                        onClick={onOpenSpectrum}
                        className="py-1.5 px-2 rounded-lg border border-white/15 bg-white/5 text-slate-200 cursor-pointer truncate"
                      >
                        102-Band SED
                      </button>
                    )}
                    {onOpenDetectorStacking && (
                      <button
                        type="button"
                        onClick={onOpenDetectorStacking}
                        className="py-1.5 px-2 rounded-lg border border-white/15 bg-white/5 text-slate-200 cursor-pointer truncate"
                      >
                        Stacks
                      </button>
                    )}
                    {onOpenProvenance && (
                      <button
                        type="button"
                        onClick={onOpenProvenance}
                        className="py-1.5 px-2 rounded-lg border border-white/15 bg-white/5 text-slate-200 cursor-pointer truncate"
                      >
                        Provenance
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleExportPng}
                      className="py-1.5 px-2 rounded-lg border border-white/15 bg-white/5 text-slate-200 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>PNG</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* FLOATING RIGHT RAIL: Telescopes (Gaia/WISE/Aladin) & Layers        */}
      {/* ================================================================== */}
      {!isEmbed && (
        <div
          data-gesture-ignore="true"
          className={`absolute top-32 sm:top-16 end-2.5 sm:end-4 z-20 flex flex-col items-end gap-2 max-h-[calc(100vh-22rem)] sm:max-h-[calc(100vh-14.5rem)] ${panelHiddenClass}`}
        >
          {!rightRailOpen ? (
            <button
              type="button"
              data-tour="other_telescopes"
              data-testid="expand-right-rail-btn"
              onClick={() => setRightRailOpen(true)}
              aria-label={`${t.panelTelescopes} & ${t.layerGroupTitle}`}
              title={t.panelTelescopes}
              className="px-3 py-2 rounded-xl bg-[#070B16]/85 backdrop-blur-xl border border-white/20 text-slate-100 text-xs font-semibold flex items-center gap-1.5 shadow-xl cursor-pointer hover:bg-[#0D152B]"
            >
              <Telescope className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.panelTelescopes}</span>
              <ChevronLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <div
              data-tour="other_telescopes"
              className="w-56 sm:w-60 bg-[#070B16]/85 backdrop-blur-xl border border-white/15 rounded-2xl p-3 shadow-2xl space-y-3 overflow-y-auto text-xs"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <span className="font-mono font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Telescope className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.panelTelescopes}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setRightRailOpen(false)}
                  aria-label={t.panelCollapseAria}
                  title={t.panelCollapseAria}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between gap-2 text-slate-200 cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sky-400 font-bold">○</span>
                    <span>{t.otherTelescopesGaia}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showGaiaOverlay}
                    onChange={(e) => {
                      setShowGaiaOverlay(e.target.checked);
                      onTelescopeUsed?.();
                    }}
                    className="accent-sky-400 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-2 text-slate-200 cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold">◇</span>
                    <span>{t.otherTelescopesWise}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showAllWiseOverlay}
                    onChange={(e) => {
                      setShowAllWiseOverlay(e.target.checked);
                      onTelescopeUsed?.();
                    }}
                    className="accent-emerald-400 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-2 text-slate-200 cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.otherTelescopesAladin}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showAladinOverlay}
                    onChange={(e) => {
                      setShowAladinOverlay(e.target.checked);
                      onTelescopeUsed?.();
                    }}
                    className="accent-amber-400 cursor-pointer"
                  />
                </label>
              </div>

              {/* Layers Group */}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <span className="block font-mono font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  {t.layerGroupTitle}
                </span>

                <label className="flex items-center justify-between gap-2 text-slate-200 cursor-pointer">
                  <span>{t.motionTrailToggle}</span>
                  <input
                    type="checkbox"
                    checked={showMotionTrail}
                    onChange={(e) => setShowMotionTrail(e.target.checked)}
                    className="accent-amber-400 cursor-pointer"
                  />
                </label>

                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={showDqOverlay}
                      onChange={(e) => setShowDqOverlay(e.target.checked)}
                      className="accent-rose-400 cursor-pointer"
                    />
                    <span>DQ ({activeFrame.dqDecoded?.totalMaskedPixels ?? 0})</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowWhyMarked((v) => !v)}
                    aria-label={t.badDataWhyTitle}
                    title={t.badDataWhyTitle}
                    className="text-[10px] font-mono text-rose-300 hover:underline cursor-pointer"
                  >
                    ?
                  </button>
                </div>
                {showWhyMarked && (
                  <p className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-400/30 text-[10px] text-rose-200 leading-snug">
                    {t.badDataWhyDesc}
                  </p>
                )}

                <label className="flex items-center justify-between gap-2 text-slate-200 cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t.gridOverlayLabel}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showPixelGrid}
                    onChange={(e) => setShowPixelGrid(e.target.checked)}
                    className="accent-sky-400 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-2 text-slate-200 cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.epoch1CrosshairLabel}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showEpoch1Crosshair}
                    onChange={(e) => setShowEpoch1Crosshair(e.target.checked)}
                    className="accent-amber-400 cursor-pointer"
                  />
                </label>

                <button
                  type="button"
                  data-testid="report-bad-data-btn"
                  onClick={() => handleReportBadData(activeFrame)}
                  className="w-full mt-1 py-1.5 px-2 rounded-lg border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Flag className="w-3 h-3" />
                  <span>{t.badDataReportBtn}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Optional Floating Aladin Multi-Survey Inset */}
      {showAladinOverlay && (
        <div
          data-gesture-ignore="true"
          className="absolute top-32 sm:top-16 end-2.5 sm:end-64 z-25 w-72 sm:w-80 rounded-2xl border border-white/20 bg-[#070B16]/95 backdrop-blur-xl p-2.5 shadow-2xl space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-300">{t.otherTelescopesAladin}</span>
            <button
              type="button"
              onClick={() => setShowAladinOverlay(false)}
              aria-label="Close Aladin"
              className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <AladinLitePanel
            ra={data.targetCoords.ra}
            dec={data.targetCoords.dec}
            fovArcmin={data.fovArcmin}
            targetName={targetLabel || caseId || 'Target'}
          />
        </div>
      )}

      {/* Bad-Data Toast */}
      {badDataToast && (
        <div
          role="status"
          data-testid="bad-data-toast"
          className="fixed top-20 start-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-xs shadow-2xl flex items-center gap-2"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{badDataToast}</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* FLOATING BOTTOM BAR: Play (Primary) + Timeline Dates + Pass + Share */}
      {/* ================================================================== */}
      <div
        data-gesture-ignore="true"
        className={`absolute bottom-2.5 inset-x-2.5 sm:inset-x-4 max-w-4xl mx-auto z-20 ${panelHiddenClass}`}
      >
        <div className="bg-[#070B16]/85 backdrop-blur-xl border border-white/15 rounded-2xl p-2.5 sm:p-3 shadow-2xl space-y-2">
          {/* Primary Play + Speed + Survey-pass + Share */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-tour="play"
              data-testid="explorer-play-btn"
              onClick={() => {
                gameAudio.playClick();
                setIsPlaying((p) => {
                  const next = !p;
                  if (next) {
                    recordViewerAction('playedBlink');
                    onExplorerPlay?.();
                  }
                  return next;
                });
              }}
              aria-pressed={isPlaying}
              className="min-h-[40px] px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {isPlaying ? <Pause className="w-4 h-4 shrink-0" /> : <Play className="w-4 h-4 shrink-0 fill-current" />}
              <span>{isPlaying ? t.framePlayerPause : t.framePlayerPlay}</span>
            </button>

            <div className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 px-2 py-1 text-xs font-mono">
              <span className="text-slate-400">{t.framePlayerSpeed}:</span>
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  aria-pressed={playbackSpeed === spd}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${
                    playbackSpeed === spd ? 'bg-sky-400 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {spd}×
                </button>
              ))}
            </div>

            <button
              type="button"
              data-tour="survey_pass"
              data-testid="survey-pass-toggle"
              aria-pressed={surveyPassMode}
              title={t.surveyPassCombinedHint}
              onClick={() => {
                setSurveyPassMode((prev) => {
                  const next = !prev;
                  if (next) recordViewerAction('toggledSurveyPass');
                  return next;
                });
                setCurrentFrameIdx(0);
                setIsPlaying(false);
              }}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
                surveyPassMode
                  ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                  : 'bg-white/5 border-white/15 text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t.surveyPassToggle}</span>
              <span className="font-mono text-[10px] tabular-nums">({surveyPasses.length})</span>
            </button>

            {!isEmbed && (
              <button
                type="button"
                data-tour="share"
                data-testid="share-open-btn"
                onClick={() => setShowShareModal(true)}
                className="ms-auto min-h-[38px] px-3 py-1.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/15 text-slate-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.panelShare}</span>
              </button>
            )}
          </div>

          {/* Timeline with real observation dates and real inter-pass gaps */}
          <div data-tour="timeline" className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {displayFrames.map((fr, idx) => {
              const active = idx === safeFrameIdx;
              const isFlagged = (fr.dqDecoded?.totalMaskedPixels ?? 0) > 0;
              const prevFr = idx > 0 ? displayFrames[idx - 1] : undefined;
              const gapLabel = formatRealGapLabel(prevFr, fr);
              const exactDate = fr.dateObs?.slice(0, 10) || `F${idx + 1}`;
              const labelText = surveyPassMode
                ? `${t.surveyPassPrefix} ${idx + 1} · ${formatFrameMonthYear(fr)}${gapLabel ? ` · ${gapLabel}` : ''}`
                : `${exactDate}${gapLabel ? ` · ${gapLabel}` : ''}`;
              return (
                <button
                  key={`${fr.obsId}-${idx}`}
                  type="button"
                  title={`${exactDate}${gapLabel ? ` (${gapLabel})` : ''}`}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentFrameIdx(idx);
                    onSelectFrame?.(idx);
                  }}
                  className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] tabular-nums shrink-0 flex items-center gap-1 cursor-pointer transition ${
                    active
                      ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>{labelText}</span>
                  {isFlagged && (
                    <AlertTriangle className={`w-3 h-3 ${active ? 'text-rose-800' : 'text-rose-400'}`} />
                  )}
                </button>
              );
            })}
            <span className="ms-auto font-mono text-[11px] text-sky-300 tabular-nums shrink-0 ps-2">
              {wavelengthPreview?.snappedDetector || activeFrame.detector} ·{' '}
              {(wavelengthPreview?.um ?? activeFrame.wavelengthUm).toFixed(2)} µm
            </span>
          </div>

          {/* Honest fallback notice if fewer than 2 survey passes exist, else plain pass spacing note */}
          <p
            data-testid={surveyPasses.length < 2 ? 'survey-pass-fallback-notice' : 'survey-pass-plain-note'}
            className={`text-[11px] leading-snug ${
              surveyPasses.length < 2 ? 'text-amber-300' : 'text-slate-300'
            }`}
          >
            {surveyPasses.length < 2 ? t.surveyPassFallbackNotice : t.surveyPassPlainNote}
          </p>

          {/* Single short caption (real date + gap) + Trail legend */}
          <div className="pt-1.5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
            <p data-testid="explore-plain-caption" className="text-slate-100 font-medium">
              {(() => {
                const activePrev = safeFrameIdx > 0 ? displayFrames[safeFrameIdx - 1] : undefined;
                const activeGap = formatRealGapLabel(activePrev, activeFrame);
                const activePrefix = `${surveyPassMode ? `${t.surveyPassPrefix} ${safeFrameIdx + 1} · ` : ''}${activeFrame.dateObs?.slice(0, 10) || ''}${activeGap ? ` (${activeGap})` : ''}`;
                const motionText =
                  aSum?.motionSignificant && aSum.measuredDisplacementArcsec > 0.05
                    ? `${t.exploreCaptionMovedPrefix} ${aSum.measuredDisplacementArcsec.toFixed(2)} ${t.exploreCaptionMovedMiddle} ${displayFrames.length} (${sigmaVal.toFixed(1)}σ)`
                    : t.exploreCaptionStill;
                return activePrefix ? `${activePrefix} — ${motionText}` : motionText;
              })()}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-300 shrink-0">
              <span
                aria-hidden="true"
                className={`inline-block w-5 h-0.5 ${
                  motionIsSignificant ? 'bg-[#00D3F3]' : 'border-b-2 border-dashed border-amber-400'
                }`}
              />
              <span>{motionIsSignificant ? t.exploreMotionTrailLegendSolid : t.exploreMotionTrailLegendDashed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowShortcutsModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t.sciShortcutsTitle}
        >
          <div
            className="obs-glass w-full max-w-md rounded-2xl border border-white/15 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>{t.sciShortcutsTitle}</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                aria-label="Close"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { key: 'Space', desc: t.sciShortcutSpace },
                { key: '← / →', desc: t.sciShortcutArrows },
                { key: 'B', desc: t.sciShortcutBlink },
                { key: 'L', desc: t.sciShortcutLock },
                { key: '?', desc: t.sciShortcutQuestion },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                  <span className="text-slate-300">{item.desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/70 border border-white/15 font-mono text-xs text-amber-300">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={t.panelShare}
        icon={<Share2 className="w-4 h-4 text-sky-400" />}
        isRtl={isRtl}
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4 text-sm">
          <p className="text-xs text-slate-300 leading-relaxed">{t.shareModalDesc}</p>
          <div>
            <p className="text-xs font-mono text-slate-400 mb-1.5">{t.btnCopyLink}</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={buildShareDeepLink(false)}
                aria-label={t.btnCopyLink}
                className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-white/15 font-mono text-xs text-slate-200"
              />
              <Button variant="secondary" size="sm" onClick={handleCopyDeepLink}>
                {copiedLink ? t.btnLinkCopied : t.btnCopyLink}
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-mono text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.shareEmbedCodeLabel}</span>
            </p>
            <div className="flex items-start gap-2">
              <textarea
                readOnly
                rows={2}
                value={`<iframe src="${buildShareDeepLink(true)}" width="100%" height="560" style="border:0;border-radius:16px;" allowfullscreen></iframe>`}
                aria-label={t.shareEmbedCodeLabel}
                className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-white/15 font-mono text-[11px] text-slate-300 resize-none"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const code = `<iframe src="${buildShareDeepLink(true)}" width="100%" height="560" style="border:0;border-radius:16px;" allowfullscreen></iframe>`;
                  navigator.clipboard?.writeText(code).catch(() => {});
                  setCopiedEmbed(true);
                  onShareUsed?.();
                  setTimeout(() => setCopiedEmbed(false), 2000);
                }}
              >
                {copiedEmbed ? t.shareEmbedCopied : t.shareCopyEmbedBtn}
              </Button>
            </div>
          </div>

          {onOpenPostcard && (
            <div className="pt-2 border-t border-white/10 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                icon={<Compass className="w-4 h-4" />}
                onClick={() => {
                  onShareUsed?.();
                  setShowShareModal(false);
                  onOpenPostcard();
                }}
              >
                {t.discoveryCardTitle}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
