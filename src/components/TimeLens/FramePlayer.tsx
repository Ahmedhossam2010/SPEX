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
  ChevronDown,
  GitCommit,
  Zap,
  Share2,
  HelpCircle,
  Link2,
  Check,
  Lock,
  Unlock,
  Contrast,
  Sliders,
  X,
  Eye,
  EyeOff,
  Telescope,
  RotateCcw,
  Flag,
  Code2,
  Maximize2,
  Minimize2,
  Info,
  Globe,
} from 'lucide-react';
import { Badge } from '../../design/components/Badge';
import { Button } from '../../design/components/Button';
import { IconButton } from '../../design/components/IconButton';
import { Modal } from '../../design/components/Modal';
import { PanelHeading } from '../../design/components/PanelHeading';
import { SkeletonSky } from '../../design/components/SkeletonSky';
import { ErrorState } from '../../design/components/ErrorState';
import { EmptyState } from '../../design/components/EmptyState';
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
import { computeExpectedProperMotionOffset } from '../../science/properMotion';
import { groupFramesBySurveyPass } from '../../science/surveyPasses';
import { addBadDataReport, recordViewerAction } from '../../progress/progressStore';
import { AladinLitePanel } from '../Explore/AladinLitePanel';
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
import {
  useSkyGestures,
  DEFAULT_SPHEREX_DETECTOR_RANGES,
  detectorToCenterUm,
  snapWavelengthToDetector,
} from '../../hooks/useSkyGestures';
import { SpexGestureCoach } from '../../fx/SpexGestureCoach';
import { PolaroidDevelop } from '../../fx/PolaroidDevelop';

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
  isEmbed?: boolean;
  autoPlay?: boolean;
  onAutoPlayConsumed?: () => void;
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
  isEmbed = false,
  autoPlay = false,
  onAutoPlayConsumed,
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
  const [zoom, setZoom] = useState<number>(explorerMode ? 1.15 : 2);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // Survey-pass compare is ON by default (~6-month grouping, never fabricating passes)
  const [surveyPassMode, setSurveyPassMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('pass');
      if (p === '0') return false;
    }
    return true;
  });
  const [otherTelescopesOpen, setOtherTelescopesOpen] = useState<boolean>(false);
  const [showGaiaOverlay, setShowGaiaOverlay] = useState<boolean>(true);
  const [showAllWiseOverlay, setShowAllWiseOverlay] = useState<boolean>(true);
  const [showAladinOverlay, setShowAladinOverlay] = useState<boolean>(false);
  // Raw pixels toggle ONLY in Advanced mode; presentation is always smooth bicubic
  const [pixelSharp, setPixelSharp] = useState<boolean>(false);
  const [showPixelGrid, setShowPixelGrid] = useState<boolean>(false);
  const [showMotionTrail, setShowMotionTrail] = useState<boolean>(true);
  const [showEpoch1Crosshair, setShowEpoch1Crosshair] = useState<boolean>(true);
  const [showDqOverlay, setShowDqOverlay] = useState<boolean>(true);
  const [showWhyMarked, setShowWhyMarked] = useState<boolean>(false);
  const [badDataToast, setBadDataToast] = useState<string | null>(null);
  const [showCatalogOverlay, setShowCatalogOverlay] = useState<boolean>(true);
  const [selectedReleaseKey, setSelectedReleaseKey] = useState<string | null>(null);
  const [sameReleaseOnly, setSameReleaseOnly] = useState<boolean>(false);
  const [invertColors, setInvertColors] = useState<boolean>(false);
  const [smoothCrossfade, setSmoothCrossfade] = useState<boolean>(true);
  const [zoomLocked, setZoomLocked] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedEmbed, setCopiedEmbed] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [mobileToolboxOpen, setMobileToolboxOpen] = useState<boolean>(false);
  const [fadeOpacity, setFadeOpacity] = useState<number>(0);

  // Full-bleed collapsible floating panels & Immersive idle auto-hide
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(true);
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(true);
  const [bottomPanelOpen, setBottomPanelOpen] = useState<boolean>(true);
  const [immersiveMode, setImmersiveMode] = useState<boolean>(false);
  const [idleHidden, setIdleHidden] = useState<boolean>(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backdropCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Phase 1 Explorer gesture & Polaroid states
  const [wavelengthPreview, setWavelengthPreview] = useState<{ um: number; snappedDetector: string } | null>(null);
  const [knownDetectors, setKnownDetectors] = useState<AvailableDetectorSummary[]>([]);
  const [showGestureCoach, setShowGestureCoach] = useState<boolean>(() => {
    if (!explorerMode || typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('spex_gesture_hint_seen') !== 'true';
    } catch {
      return false;
    }
  });
  const [polaroidKey, setPolaroidKey] = useState<string>('initial');

  const dismissGestureCoach = useCallback(() => {
    setShowGestureCoach(false);
    try {
      localStorage.setItem('spex_gesture_hint_seen', 'true');
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (!explorerMode || typeof window === 'undefined') return;
    try {
      if (localStorage.getItem('spex_gesture_hint_seen') !== 'true') {
        setShowGestureCoach(true);
      }
    } catch {
      // ignore storage errors
    }
  }, [explorerMode]);

  // WiseView Left Rail Collapsible Groups
  const [groupViewOpen, setGroupViewOpen] = useState<boolean>(true);
  const [groupArithOpen, setGroupArithOpen] = useState<boolean>(false);
  const [groupBandsOpen, setGroupBandsOpen] = useState<boolean>(true);
  const [groupOverlaysOpen, setGroupOverlaysOpen] = useState<boolean>(false);
  const [groupPlotsOpen, setGroupPlotsOpen] = useState<boolean>(false);

  // Progressive disclosure Advanced drawer (kept synced for telemetry/legacy toggle)
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

  useModalBehavior(showShortcutsModal, () => setShowShortcutsModal(false));

  useEffect(() => {
    setSameReleaseOnly(false);
    setSelectedReleaseKey(null);
    setPan({ x: 0, y: 0 });
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
  const fadeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevRenderedFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timeSeriesCacheRef = useRef<Map<string, TimeSeriesResponse>>(new Map());
  const timelineStripRef = useRef<HTMLDivElement | null>(null);
  const wavelengthStripRef = useRef<HTMLDivElement | null>(null);
  const waveStripLastDetRef = useRef<string | null>(null);

  // Sync external initialDetector prop if changed (e.g. from URL deep link)
  useEffect(() => {
    if (initialDetector && initialDetector !== selectedDetector) {
      setSelectedDetector(initialDetector);
    }
  }, [initialDetector]);

  // Track target visits for Academy & Achievements progress
  useEffect(() => {
    const cid = (caseId || '').toLowerCase();
    if (cid.includes('wise-0855') || cid.includes('0855')) {
      recordViewerAction('visitedWise0855');
    } else if (cid.includes('barnard')) {
      recordViewerAction('visitedBarnard');
    }
  }, [caseId]);

  // Quick Demo auto-play when triggered from Home -> Quick Demo
  useEffect(() => {
    if (!autoPlay || loading || !data?.frames?.length) return;
    setIsPlaying(true);
    setBlinkFirstLast(data.frames.length >= 2);
    setShowMotionTrail(true);
    setZoom((z) => (z < 1.8 ? 2 : z));
    recordViewerAction('playedBlink');
    onExplorerPlay?.();
    onAutoPlayConsumed?.();
  }, [autoPlay, loading, data?.frames?.length, onExplorerPlay, onAutoPlayConsumed]);

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

  const activeFetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!loading) {
      setLoadingElapsedSec(0);
      return;
    }
    setLoadingElapsedSec(0);
    const id = setInterval(() => {
      setLoadingElapsedSec((s) => s + 1);
    }, 1000);
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
        if (fallbackRes.ok) {
          json = await fallbackRes.json().catch(() => null);
        }
      }
      if (json && json.frames && json.frames.length > 0) {
        setState('OK');
        setData(json);
        setSelectedReleaseKey(null);
        setCurrentFrameIdx(0);
        if (json.availableDetectors?.length) {
          setKnownDetectors(json.availableDetectors);
        }
        setPolaroidKey(`offline_${json.selectedDetector || 'auto'}`);
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
      if (activeFetchAbortRef.current === controller) {
        activeFetchAbortRef.current = null;
      }
      setLoading(false);
    }
  }, [caseId, ra, dec, sizePix, onDataLoaded]);

  const fetchTimeSeries = useCallback(async () => {
    const cacheKey = `${ra.toFixed(5)}:${dec.toFixed(5)}:${caseId || ''}:${sizePix}:${frameMode}:${selectedDetector || 'auto'}:${frameCount}:${wavelengthWindow}:${sameReleaseOnly ? 1 : 0}`;
    const cached = timeSeriesCacheRef.current.get(cacheKey);
    if (cached && cached.frames?.length) {
      setState('OK');
      setError(null);
      setLoading(false);
      setLoadingProgress(null);
      setData(cached);
      setSelectedReleaseKey(null);
      setCurrentFrameIdx(0);
      if (cached.availableDetectors?.length) {
        setKnownDetectors(cached.availableDetectors);
      }
      setPolaroidKey(`${ra.toFixed(4)}_${dec.toFixed(4)}_${selectedDetector || 'auto'}`);
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
    }, 20000);

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

      const res = await fetch(`/api/spherex/timeseries?${params.toString()}`, {
        signal: controller.signal,
      });
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
        timeSeriesCacheRef.current.set(cacheKey, json);
        setState('OK');
        setData(json);
        setSelectedReleaseKey(null);
        setCurrentFrameIdx(0);
        if (json.availableDetectors?.length) {
          setKnownDetectors(json.availableDetectors);
        }
        setPolaroidKey(`${ra.toFixed(4)}_${dec.toFixed(4)}_${json.selectedDetector || selectedDetector || 'auto'}`);
        onDataLoaded?.(json);
      }
    } catch (err: any) {
      // Ignore aborts triggered because a newer target/detector fetch superseded this one
      if (err?.name === 'AbortError' && !timedOut) {
        return;
      }
      const matchedSnapshotCase = matchSnapshotCaseId(caseId, ra, dec);
      if (matchedSnapshotCase) {
        clearTimeout(hardTimeoutId);
        if (activeFetchAbortRef.current === controller) {
          activeFetchAbortRef.current = null;
        }
        await handleUseOfflineDemo();
        return;
      }
      setState('NETWORK_ERROR');
      setError(
        timedOut
          ? 'NASA IRSA request timed out after 20 seconds.'
          : err?.message || 'Could not load time-series frames from NASA IRSA'
      );
    } finally {
      clearTimeout(hardTimeoutId);
      if (activeFetchAbortRef.current === controller) {
        activeFetchAbortRef.current = null;
        setLoading(false);
      }
    }
  }, [ra, dec, caseId, sizePix, frameMode, selectedDetector, frameCount, wavelengthWindow, sameReleaseOnly, handleUseOfflineDemo]);

  useEffect(() => {
    fetchTimeSeries();
    return () => {
      if (activeFetchAbortRef.current) {
        activeFetchAbortRef.current.abort();
        activeFetchAbortRef.current = null;
      }
    };
  }, [fetchTimeSeries]);

  // Group frames by normalized release::version for consistent diff/coadd subtraction
  const frameReleaseGroups = useMemo(() => {
    const map = new Map<string, TimeSeriesFrame[]>();
    const all = data?.frames || [];
    for (const f of all) {
      const rel = (f.release || data?.activeRelease || 'public').toLowerCase();
      const ver = f.version || data?.activeVersion || 'unknown';
      const key = `${rel}::${ver}`;
      const bucket = map.get(key) || [];
      bucket.push(f);
      map.set(key, bucket);
    }
    return map;
  }, [data?.frames, data?.activeRelease, data?.activeVersion]);

  const primaryReleaseKey = useMemo(() => {
    let bestKey: string | null = null;
    let bestCount = -1;
    for (const [k, arr] of frameReleaseGroups.entries()) {
      if (arr.length > bestCount) {
        bestCount = arr.length;
        bestKey = k;
      }
    }
    return bestKey;
  }, [frameReleaseGroups]);

  const rawDisplayFrames = useMemo(() => {
    const all = data?.frames || [];
    if (!selectedReleaseKey) return all;
    const subset = frameReleaseGroups.get(selectedReleaseKey);
    return subset && subset.length > 0 ? subset : all;
  }, [data?.frames, selectedReleaseKey, frameReleaseGroups]);

  const surveyPasses = useMemo(() => {
    return groupFramesBySurveyPass(rawDisplayFrames);
  }, [rawDisplayFrames]);

  const displayFrames = useMemo(() => {
    if (!surveyPassMode) return rawDisplayFrames;
    const combined = surveyPasses.map((p) => p.combinedFrame);
    return combined.length > 0 ? combined : rawDisplayFrames;
  }, [surveyPassMode, surveyPasses, rawDisplayFrames]);

  useEffect(() => {
    if (displayFrames.length > 0 && currentFrameIdx >= displayFrames.length) {
      setCurrentFrameIdx(0);
    }
  }, [displayFrames.length, currentFrameIdx]);

  // Playback interval (handles both full sequence and Epoch 1 <-> Last Blink mode)
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
  }, [isPlaying, playbackSpeed, blinkFirstLast, isLooping, displayFrames.length, onSelectFrame]);

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
      if (!displayFrames.length) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => {
          const next = !p;
          if (next) recordViewerAction('playedBlink');
          return next;
        });
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentFrameIdx((prev) => {
          const next = blinkFirstLast && displayFrames.length >= 2
            ? (prev === 0 ? displayFrames.length - 1 : 0)
            : (prev + 1) % displayFrames.length;
          onSelectFrame?.(next);
          return next;
        });
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentFrameIdx((prev) => {
          const prevIdx = blinkFirstLast && displayFrames.length >= 2
            ? (prev === 0 ? displayFrames.length - 1 : 0)
            : (prev - 1 + displayFrames.length) % displayFrames.length;
          onSelectFrame?.(prevIdx);
          return prevIdx;
        });
      } else if (e.key === 'l' || e.key === 'L') {
        setIsLooping((lp) => !lp);
      } else if (e.key === 'b' || e.key === 'B') {
        if (displayFrames.length >= 2) {
          setBlinkFirstLast((b) => !b);
        }
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [displayFrames.length, blinkFirstLast, onSelectFrame]);

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
    const frames = displayFrames;
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
  }, [displayFrames, getDisplayArray]);

  // Immersive auto-hide on idle
  const bumpActivity = useCallback(() => {
    setIdleHidden(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!immersiveMode) return;
    idleTimerRef.current = setTimeout(() => {
      setIdleHidden(true);
    }, 3400);
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

  // Keep URL ?pass= synced when Survey-pass mode changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('pass', surveyPassMode ? '1' : '0');
    const qs = params.toString();
    window.history.replaceState({ ...window.history.state }, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [surveyPassMode]);

  // Smooth high-DPR procedural PSF starfield backdrop behind sky cutouts
  useEffect(() => {
    const bgCanvas = backdropCanvasRef.current;
    if (!bgCanvas) return;
    const drawBg = () => {
      const rect = bgCanvas.getBoundingClientRect();
      const cssW = Math.max(320, Math.round(rect.width || 800));
      const cssH = Math.max(280, Math.round(rect.height || 600));
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
        const alpha = 0.22 + ((i * 23) % 10) * 0.055;
        const warm = i % 4 === 0;
        drawPsfStar(bctx, rx, ry, radius, warm ? '253, 224, 155' : '226, 232, 240', alpha);
      }
    };
    drawBg();
    window.addEventListener('resize', drawBg);
    return () => window.removeEventListener('resize', drawBg);
  }, [ra, dec]);

  // Render active frame onto canvas (Bicubic smooth presentation by default; Raw pixels ONLY in Advanced mode)
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
    const useRawPixels = !explorerMode && pixelSharp;

    // Capture previous canvas for subtle cross-fade on frame transitions
    if (
      smoothCrossfade &&
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
        fCtx.imageSmoothingEnabled = !useRawPixels;
        if (!useRawPixels) fCtx.imageSmoothingQuality = 'high';
        fCtx.drawImage(canvas, 0, 0);
        setFadeOpacity(0.68);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setFadeOpacity(0));
        });
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
        const scaled = (val / diffScale) * contrastFactor;
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
        const rawNorm = Math.max(0, Math.min(1, ((val - p02) / range) * contrastFactor));
        let norm = rawNorm;
        if (stretchMode === 'asinh') {
          norm = Math.max(0, Math.min(1, Math.asinh(rawNorm * 5) / Math.asinh(5)));
        } else if (stretchMode === 'sqrt') {
          norm = Math.sqrt(rawNorm);
        } else if (stretchMode === 'log') {
          norm = Math.log10(1 + rawNorm * 9) / Math.log10(10);
        }
        if (invertColors) {
          norm = 1 - norm;
        }
        const byteVal = Math.round(norm * 255);
        r = Math.min(255, Math.round(byteVal * 1.05));
        g = Math.min(255, Math.round(byteVal * 0.86));
        b = Math.min(255, Math.round(byteVal * 0.58));
      }

      // Highlight DQ-flagged pixels subtly so bad data is immediately clear
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

    if (useRawPixels) {
      canvas.width = width;
      canvas.height = height;
      const imgData = new ImageData(rgba, width, height);
      ctx.imageSmoothingEnabled = false;
      ctx.putImageData(imgData, 0, 0);
    } else {
      const dpr = getCanvasDpr();
      const targetW = Math.min(384, Math.max(256, width * 4));
      const targetH = Math.min(384, Math.max(256, height * 4));
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

    onCanvasReady?.(canvas);
  }, [displayFrames, currentFrameIdx, renderMode, globalScale, globalScaleEnabled, showDqOverlay, stretchMode, contrastFactor, invertColors, smoothCrossfade, prefersReducedMotion, explorerMode, pixelSharp, getDisplayArray, onCanvasReady]);

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
      if (caseId) {
        const slug = caseId.replace(/^case-/, '');
        params.set('target', slug);
      }
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
    setTimeout(() => setCopiedLink(false), 2000);
  }, [buildShareDeepLink]);

  const handleReportBadData = useCallback(
    async (frame: TimeSeriesFrame) => {
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
      // Scientific Honesty: Spot flux measurements strictly come from original raw pixels, never display smoothing/diff buffers.
      const fluxMjySr = Number.isFinite(fr.flux[pixIdx])
        ? fr.flux[pixIdx]
        : Number.isFinite(fr.reprojectedFlux?.[pixIdx])
        ? fr.reprojectedFlux![pixIdx]
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

      recordViewerAction('inspectedSpot');
      const ctx = buildExplainContext();
      if (ctx) onSpotSelect?.(spot, ctx);
    },
    [data, displayFrames, currentFrameIdx, language, buildExplainContext, onSpotSelect]
  );

  // Phase 1 Explorer gestures: drag left/right = time, drag up/down = wavelength (0.75-5 um), pinch/wheel = zoom, double-tap = reset
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

  const activeExplorerFrame =
    (displayFrames.length > 0 ? displayFrames : data?.frames)?.[
      Math.min(currentFrameIdx, Math.max(0, (displayFrames.length || data?.frames?.length || 1) - 1))
    ];
  const currentDetectorId =
    selectedDetector || data?.selectedDetector || activeExplorerFrame?.detector || 'D1';
  const currentFrameUm =
    activeExplorerFrame?.wavelengthUm ?? detectorToCenterUm(currentDetectorId, detectorRanges);

  const defaultZoom = explorerMode ? 1 : 2;
  const handleResetExplorerView = useCallback(() => {
    setZoom(defaultZoom);
    setPan({ x: 0, y: 0 });
  }, [defaultZoom]);

  const gestures = useSkyGestures({
    enabled: Boolean(displayFrames.length),
    totalFrames: displayFrames.length || data?.frames?.length || 0,
    currentFrameIdx,
    onScrubFrame: (idx) => {
      setIsPlaying(false);
      setCurrentFrameIdx(idx);
      onSelectFrame?.(idx);
    },
    onUserInteractStart: () => {
      if (showGestureCoach) dismissGestureCoach();
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
    onZoomChange: (z) => {
      if (!zoomLocked) setZoom(z);
    },
    pan,
    onPanChange: setPan,
    onResetView: handleResetExplorerView,
    onTapPoint: (clientX, clientY) => {
      if (showGestureCoach) dismissGestureCoach();
      const canvas = canvasRef.current;
      const frames = displayFrames.length > 0 ? displayFrames : data?.frames;
      if (!canvas || !frames?.length) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const fr = frames[Math.min(currentFrameIdx, Math.max(0, frames.length - 1))];
      const w = fr?.width || 64;
      const h = fr?.height || 64;
      const px = ((clientX - rect.left) / rect.width) * w;
      const py = ((clientY - rect.top) / rect.height) * h;
      inspectSpotAtPixel(px, py);
    },
    isRtl,
    reducedMotion: prefersReducedMotion,
  });

  // Edge timeline strip scrubbing (display + draggable, not a button)
  const updateTimelineFromPointer = useCallback(
    (clientX: number) => {
      const strip = timelineStripRef.current;
      const total = displayFrames.length || data?.frames?.length || 0;
      if (!strip || total <= 1) return;
      const rect = strip.getBoundingClientRect();
      if (!rect.width) return;
      let ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      if (isRtl) ratio = 1 - ratio;
      const idx = Math.round(ratio * (total - 1));
      setIsPlaying(false);
      setCurrentFrameIdx(idx);
      onSelectFrame?.(idx);
    },
    [displayFrames.length, data?.frames?.length, isRtl, onSelectFrame]
  );

  // Edge wavelength strip scrubbing (display + draggable, 0.75..5.0 um)
  const updateWavelengthFromPointer = useCallback(
    (clientY: number) => {
      const strip = wavelengthStripRef.current;
      if (!strip) return;
      const rect = strip.getBoundingClientRect();
      if (!rect.height) return;
      const ratioFromBottom = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
      const um = 0.75 + ratioFromBottom * (5.0 - 0.75);
      const snapped = snapWavelengthToDetector(um, detectorRanges);
      waveStripLastDetRef.current = snapped.detector;
      setWavelengthPreview({ um: snapped.clampedUm, snappedDetector: snapped.detector });
    },
    [detectorRanges]
  );

  // PNG Snapshot Export (P0.3)
  const handleExportPng = () => {
    const srcCanvas = canvasRef.current;
    const frames = displayFrames.length > 0 ? displayFrames : data?.frames || [];
    const safeIdx = Math.min(currentFrameIdx, Math.max(0, frames.length - 1));
    const currentFrame = frames[safeIdx];
    if (!srcCanvas || !currentFrame || !data) return;

    const outSize = 512;
    const out = document.createElement('canvas');
    out.width = outSize;
    out.height = outSize + 64;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#05070e';
    ctx.fillRect(0, 0, out.width, out.height);
    const exportSmooth = explorerMode || !pixelSharp;
    ctx.imageSmoothingEnabled = exportSmooth;
    if (exportSmooth) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(srcCanvas, 0, 0, outSize, outSize);

    const w = currentFrame.width || 64;
    const h = currentFrame.height || 64;
    const sx = outSize / w;
    const sy = outSize / h;

    // Draw Epoch-1 crosshair + honest measured/expected trail
    const ep1Pix = frames[0]?.targetRefPixel || frames[0]?.targetPixel;
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
      const motionSig = Boolean(data.astrometrySummary?.motionSignificant);
      const measPts = frames
        .slice(0, safeIdx + 1)
        .filter((f) => f.measuredCentroid?.valid)
        .map((f) => ({ x: f.measuredCentroid!.x, y: f.measuredCentroid!.y }));
      const expPts = frames
        .slice(0, safeIdx + 1)
        .map((f) => f.targetRefPixel || f.targetPixel)
        .filter((p): p is { x: number; y: number } => Boolean(p));
      const pts = motionSig && measPts.length >= 2 ? measPts : (measPts.length >= 2 ? measPts : expPts);
      if (pts.length > 1) {
        ctx.save();
        ctx.strokeStyle = motionSig ? '#00D3F3' : '#F59E0B';
        ctx.lineWidth = 2;
        if (!motionSig) ctx.setLineDash([6, 4]);
        ctx.beginPath();
        pts.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x * sx, p.y * sy);
          else ctx.lineTo(p.x * sx, p.y * sy);
        });
        ctx.stroke();
        ctx.restore();
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
      `SPHEREx ${currentFrame.detector} (${currentFrame.wavelengthUm.toFixed(2)} um) | ${currentFrame.obsId}`,
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
    a.download = `spherex_${currentFrame.obsId}_${currentFrame.detector}_f${safeIdx + 1}.png`;
    a.click();
  };

  const activeFrameList = displayFrames;
  const safeFrameIdx = Math.min(currentFrameIdx, Math.max(0, activeFrameList.length - 1));
  const currentFrame = activeFrameList[safeFrameIdx] || activeFrameList[0];
  const frameW = currentFrame?.width || 64;
  const frameH = currentFrame?.height || 64;

  // Compute sample of flagged DQ pixels on active frame to visually highlight affected regions (called unconditionally above early returns)
  const dqHighlightSpots = useMemo(() => {
    if (!showDqOverlay || !currentFrame?.flags?.length) return [] as Array<{ x: number; y: number }>;
    const spots: Array<{ x: number; y: number }> = [];
    const stride = currentFrame.flags.length > 4096 ? 2 : 1;
    for (let i = 0; i < currentFrame.flags.length; i += stride) {
      if ((currentFrame.flags[i] & DQ_ARTIFACT_MASK) !== 0) {
        spots.push({ x: i % frameW, y: Math.floor(i / frameW) });
        if (spots.length >= 24) break;
      }
    }
    return spots;
  }, [showDqOverlay, currentFrame?.flags, frameW]);

  if (loading && !data) {
    const progressText =
      loadingProgress && loadingProgress.total > 0
        ? `${t.loadingFramesArriving}: ${loadingProgress.loaded} / ${loadingProgress.total}`
        : loadingProgress?.phase === 'tap'
        ? (isRtl ? 'جاري البحث في أرشيف ناسا سبيراكس...' : 'Scanning NASA IRSA SPHEREx catalog...')
        : (isRtl ? 'جاري استلام الإطارات ومعايرتها...' : 'Receiving infrared frames & aligning sky grid...');
    return (
      <SkeletonSky
        label={t.loadingScanningSky}
        sublabel={progressText}
        loaded={loadingProgress?.loaded}
        total={loadingProgress?.total}
        phase={progressText}
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

  if (state === 'ARCHIVE_ZERO_ROWS' || !data || data.frames.length === 0 || !currentFrame) {
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

  // Epoch 1 anchor pixel & honest measured-ghost vs dashed expected trail
  const epoch1Anchor = activeFrameList[0]?.targetRefPixel || activeFrameList[0]?.targetPixel;
  const motionIsSignificant = Boolean(data.astrometrySummary?.motionSignificant);
  const measuredTrailPoints = activeFrameList
    .slice(0, safeFrameIdx + 1)
    .map((f, idx) =>
      f.measuredCentroid?.valid
        ? { x: f.measuredCentroid.x, y: f.measuredCentroid.y, idx }
        : null
    )
    .filter((p): p is { x: number; y: number; idx: number } => Boolean(p));
  const expectedTrailPoints = activeFrameList
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
  const currentTargetPix = currentFrame.targetRefPixel || currentFrame.targetPixel;

  const hasTwoOrMorePasses = surveyPasses.length >= 2;
  const explorerPanelVisibilityClass =
    explorerMode && immersiveMode && idleHidden
      ? 'opacity-0 pointer-events-none transition-opacity duration-300'
      : 'opacity-100 transition-opacity duration-200';

  return (
    <div
      ref={containerRef}
      onPointerMove={explorerMode ? bumpActivity : undefined}
      onPointerDown={explorerMode ? bumpActivity : undefined}
      onKeyDown={explorerMode ? bumpActivity : undefined}
      className={`${
        explorerMode
          ? `relative w-full ${
              isEmbed ? 'min-h-screen' : 'min-h-[calc(100vh-11rem)] sm:min-h-[calc(100vh-9.5rem)]'
            } bg-[#02040A] overflow-hidden flex flex-col`
          : 'obs-glass rounded-2xl p-3 sm:p-4 flex flex-col gap-3 overflow-hidden'
      } ${className}`}
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
          className={`px-3 py-2 rounded-xl border text-xs font-mono flex flex-wrap items-center justify-between gap-2 ${
            activeClassification === 'STALE_TAP_CACHE'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
              : activeClassification === 'SAVED_BENCHMARK'
              ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold">
                {activeClassification === 'SAVED_BENCHMARK' ? t.exploreSnapshotBadge : classificationMeta.badgeLabel} ·{' '}
                {t.provenanceDiscoveryBlocked}
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
        </div>
      )}

      {/* Top WiseView Transport & Meta Bar (Scientist Mode) */}
      {!explorerMode && (
      <div className="flex flex-col gap-2.5 border-b border-white/[0.08] pb-3">
        {/* Status & Quick Export Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={activeClassification}
              customText={classificationMeta.badgeLabel}
              size="sm"
            />
            <span className="font-mono text-xs text-sky-400 font-bold tabular-nums">
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
            <span className="px-2 py-0.5 rounded font-mono text-[10px] border border-sky-500/30 bg-sky-500/10 text-sky-200 tabular-nums">
              {activeReleaseLabel} · VER {activeVersionLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMobileToolboxOpen((v) => !v)}
              aria-expanded={mobileToolboxOpen}
              className="lg:hidden min-h-[38px] px-2.5 py-1 rounded-xl border border-sky-400/40 bg-sky-500/15 text-sky-300 font-mono text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.sciToolsDrawer}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyDeepLink}
              title={t.btnCopyLink}
              className="min-h-[38px] px-2.5 py-1 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5 text-sky-400" />}
              <span className="hidden sm:inline">{copiedLink ? t.btnLinkCopied : t.btnCopyLink}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              aria-label={t.sciShortcutsTitle}
              title={`${t.sciShortcutsTitle} (?)`}
              className="min-h-[38px] min-w-[38px] px-2.5 py-1 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 font-mono text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>?</span>
            </button>
          </div>
        </div>

        {/* WiseView Transport & Scrubber Bar */}
        <div
          data-tour="wiseview_bar"
          className="flex flex-col gap-2 p-2.5 rounded-xl bg-[#050811] border border-white/10"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Transport + Speed + Loop + Blink */}
            <div className="flex flex-wrap items-center gap-1.5">
              <IconButton
                label="Step backward (ArrowLeft)"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setIsPlaying(false);
                  const total = activeFrameList.length;
                  if (total === 0) return;
                  const prev = blinkFirstLast && total >= 2
                    ? (safeFrameIdx === 0 ? total - 1 : 0)
                    : (safeFrameIdx - 1 + total) % total;
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
                onClick={() =>
                  setIsPlaying((p) => {
                    const next = !p;
                    if (next) recordViewerAction('playedBlink');
                    return next;
                  })
                }
              >
                {isPlaying ? t.framePlayerPause : t.framePlayerPlay}
              </Button>

              <IconButton
                label="Step forward (ArrowRight)"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setIsPlaying(false);
                  const total = activeFrameList.length;
                  if (total === 0) return;
                  const next = blinkFirstLast && total >= 2
                    ? (safeFrameIdx === 0 ? total - 1 : 0)
                    : (safeFrameIdx + 1) % total;
                  setCurrentFrameIdx(next);
                  onSelectFrame?.(next);
                }}
              >
                <SkipForward className="w-3.5 h-3.5" aria-hidden="true" />
              </IconButton>

              <label
                className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg bg-black/40 border border-white/10 font-mono text-[11px] text-slate-300"
                title="Playback speed multiplier"
              >
                <Gauge className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                <input
                  type="range"
                  min={0.25}
                  max={4}
                  step={0.25}
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  aria-label="Playback speed"
                  className="w-16 accent-sky-400 cursor-pointer"
                />
                <span className="tabular-nums w-8 text-end">{playbackSpeed}x</span>
              </label>

              <button
                type="button"
                onClick={() => setIsLooping((l) => !l)}
                aria-label="Toggle loop playback (Shortcut: L)"
                aria-pressed={isLooping}
                title="Loop playback (L)"
                className={`px-2.5 py-1.5 min-h-[36px] rounded-lg border font-mono text-xs flex items-center gap-1 cursor-pointer ${
                  isLooping
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Loop</span>
              </button>

              <button
                type="button"
                onClick={() => setBlinkFirstLast((b) => !b)}
                disabled={activeFrameList.length < 2}
                aria-label="Toggle Blink 1 to Last epoch (Shortcut: B)"
                aria-pressed={blinkFirstLast}
                title="Blink Epoch 1 ↔ Last (B)"
                className={`px-2.5 py-1.5 min-h-[36px] rounded-lg border font-mono text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-40 ${
                  blinkFirstLast
                    ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Blink 1↔Last</span>
              </button>
            </div>

            {/* Frame Scrubber */}
            <div className="flex-1 min-w-[200px] flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 tabular-nums">
                <span>{activeFrameList[0]?.dateObs?.slice(0, 10) || 'Start'}</span>
                <span className="text-amber-300 font-semibold">
                  {currentFrame.dateObs?.replace('T', ' ').slice(0, 19) || `Frame ${safeFrameIdx + 1}`}
                </span>
                <span>{activeFrameList[activeFrameList.length - 1]?.dateObs?.slice(0, 10) || 'End'}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, activeFrameList.length - 1)}
                  value={safeFrameIdx}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10);
                    setIsPlaying(false);
                    setCurrentFrameIdx(idx);
                    onSelectFrame?.(idx);
                  }}
                  className="flex-1 accent-amber-400 cursor-pointer"
                  aria-label={`Observation frame slider: frame ${safeFrameIdx + 1} of ${activeFrameList.length}, ${currentFrame.dateObs || ''}`}
                />
                <span className="font-mono text-xs text-slate-300 shrink-0 tabular-nums">
                  {safeFrameIdx + 1}/{activeFrameList.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Workspace Container: Optional WiseView Left Toolbox + Main Viewport */}
      <div className={!explorerMode ? 'flex flex-col lg:flex-row gap-4 items-start' : 'relative flex-1 w-full min-h-[560px] flex flex-col'}>
        {/* Scientist WiseView Collapsible Left Panel Rail */}
        {!explorerMode && (
          <aside
            aria-label={t.sciToolsDrawer}
            className={`${
              mobileToolboxOpen ? 'flex' : 'hidden lg:flex'
            } w-full lg:w-[290px] shrink-0 flex-col gap-2 text-xs`}
          >
            {/* Section 1: View */}
            <div className="rounded-xl bg-[#050811] border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setGroupViewOpen((v) => !v)}
                aria-expanded={groupViewOpen}
                className="w-full px-3 py-2.5 flex items-center justify-between gap-2 font-semibold text-slate-200 hover:bg-white/5 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.panelView}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${groupViewOpen ? 'rotate-180' : ''}`} />
              </button>
              {groupViewOpen && (
                <div className="p-3 pt-2 border-t border-white/10 space-y-2.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400" title="Intensity scaling curve">Stretch</span>
                    <select
                      value={stretchMode}
                      onChange={(e) => setStretchMode(e.target.value as PlayerStretchMode)}
                      aria-label="Image intensity stretch"
                      className="bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-slate-100 cursor-pointer"
                    >
                      <option value="asinh">Asinh</option>
                      <option value="linear">Linear</option>
                      <option value="sqrt">Sqrt</option>
                      <option value="log">Log</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between gap-2 text-slate-400">
                    <span className="tabular-nums">Contrast {contrastFactor.toFixed(2)}×</span>
                    <input
                      type="range"
                      min={0.5}
                      max={3.0}
                      step={0.05}
                      value={contrastFactor}
                      onChange={(e) => setContrastFactor(parseFloat(e.target.value))}
                      aria-label="Image contrast"
                      className="w-28 accent-amber-400 cursor-pointer"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGlobalScaleEnabled((v) => !v)}
                      aria-pressed={globalScaleEnabled}
                      title="Compare brightness cleanly across all epochs vs scale each frame"
                      className={`px-2 py-1.5 rounded-lg border transition cursor-pointer ${
                        globalScaleEnabled
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                          : 'bg-white/5 border-white/10 text-slate-300'
                      }`}
                    >
                      {globalScaleEnabled ? t.sciScaleGlobal : t.sciScaleFrame}
                    </button>

                    <button
                      type="button"
                      onClick={() => setInvertColors((v) => !v)}
                      aria-pressed={invertColors}
                      title="Invert image intensity palette"
                      className={`px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1 transition cursor-pointer ${
                        invertColors
                          ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Contrast className="w-3.5 h-3.5" />
                      <span>{t.sciInvertColors}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPixelSharp((v) => !v)}
                      aria-pressed={pixelSharp}
                      className={`px-2 py-1 rounded-lg border cursor-pointer ${
                        pixelSharp
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      {t.showRawPixelsLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmoothCrossfade((v) => !v)}
                      aria-pressed={smoothCrossfade}
                      className={`px-2 py-1 rounded-lg border cursor-pointer ${
                        smoothCrossfade
                          ? 'bg-sky-500/15 border-sky-400/40 text-sky-300'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      {t.sciSmoothCrossfade}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={zoomLocked}
                        onClick={() => setZoom((z) => Math.max(1, Number((z / 1.5).toFixed(1))))}
                        aria-label="Zoom out"
                        title="Zoom out"
                        className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-1.5 text-slate-200 tabular-nums">{zoom}x</span>
                      <button
                        type="button"
                        disabled={zoomLocked}
                        onClick={() => setZoom((z) => Math.min(8, Number((z * 1.5).toFixed(1))))}
                        aria-label="Zoom in"
                        title="Zoom in"
                        className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setZoomLocked((v) => !v)}
                      aria-pressed={zoomLocked}
                      title="Lock current zoom level"
                      className={`px-2 py-1 rounded-lg border flex items-center gap-1 cursor-pointer ${
                        zoomLocked
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {zoomLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      <span>Lock</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Time */}
            <div className="rounded-xl bg-[#050811] border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setGroupArithOpen((v) => !v)}
                aria-expanded={groupArithOpen}
                className="w-full px-3 py-2.5 flex items-center justify-between gap-2 font-semibold text-slate-200 hover:bg-white/5 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.panelTime}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${groupArithOpen ? 'rotate-180' : ''}`} />
              </button>
              {groupArithOpen && (
                <div className="p-3 pt-2 border-t border-white/10 space-y-2.5 font-mono text-[11px]">
                  <div className="grid grid-cols-2 gap-1.5">
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
                          if (m.id === 'diff_ref' || m.id === 'diff_median') {
                            recordViewerAction('toggledDiff');
                          }
                        }}
                        aria-pressed={renderMode === m.id}
                        className={`px-2 py-1.5 rounded-lg border text-center cursor-pointer ${
                          renderMode === m.id
                            ? 'bg-sky-400 text-slate-950 border-sky-400 font-bold'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setFrameMode(frameMode === 'sky' ? 'target' : 'sky')}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-white/15 bg-black/50 text-slate-200 hover:border-amber-400/50 cursor-pointer text-start"
                  >
                    {frameMode === 'sky' ? 'Frame: Sky-Fixed WCS' : 'Frame: Target-Centered'}
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowEpoch1Crosshair((v) => !v)}
                      aria-pressed={showEpoch1Crosshair}
                      className={`px-2 py-1.5 rounded-lg border text-start flex items-center gap-1.5 cursor-pointer ${
                        showEpoch1Crosshair
                          ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5 shrink-0" />
                      <span>Epoch-1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowMotionTrail((v) => !v)}
                      aria-pressed={showMotionTrail}
                      className={`px-2 py-1.5 rounded-lg border text-start flex items-center gap-1.5 cursor-pointer ${
                        showMotionTrail
                          ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <GitCommit className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.motionTrailToggle}</span>
                    </button>
                  </div>

                  <label className="flex items-center justify-between gap-2 text-slate-400">
                    <span>λ window</span>
                    <select
                      value={wavelengthWindow}
                      onChange={(e) => setWavelengthWindow(e.target.value)}
                      aria-label="Wavelength window filter"
                      className="bg-black/60 border border-white/15 rounded px-2 py-1 text-slate-100 cursor-pointer"
                    >
                      <option value="all">All (0.75–5.0 µm)</option>
                      <option value="0.75-1.65">0.75–1.65 µm</option>
                      <option value="1.65-3.84">1.65–3.84 µm</option>
                      <option value="3.84-5.00">3.84–5.00 µm</option>
                    </select>
                  </label>

                  <div className="flex items-center justify-between gap-1">
                    <span className="text-slate-400">Max frames:</span>
                    <div className="flex gap-1">
                      {([10, 16, 20, 40] as const).map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setFrameCount(cnt)}
                          aria-pressed={frameCount === cnt}
                          className={`px-2 py-0.5 rounded border cursor-pointer tabular-nums ${
                            frameCount === cnt
                              ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold'
                              : 'border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Telescopes */}
            <div className="rounded-xl bg-[#050811] border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setGroupBandsOpen((v) => !v)}
                aria-expanded={groupBandsOpen}
                className="w-full px-3 py-2.5 flex items-center justify-between gap-2 font-semibold text-slate-200 hover:bg-white/5 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Telescope className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.panelTelescopes}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${groupBandsOpen ? 'rotate-180' : ''}`} />
              </button>
              {groupBandsOpen && (
                <div className="p-3 pt-2 border-t border-white/10 space-y-2.5 font-mono text-[11px]">
                  <select
                    value={selectedDetector}
                    onChange={(e) => {
                      const det = e.target.value;
                      setSelectedDetector(det);
                      recordViewerAction('changedBand');
                      onDetectorChange?.(det);
                    }}
                    aria-label="Select SPHEREx detector array (D1 to D6 or Auto)"
                    title="Choose SPHEREx detector array (Auto picks widest temporal baseline)"
                    className="w-full bg-black/70 border border-white/15 rounded-lg px-2.5 py-1.5 text-slate-100 font-semibold cursor-pointer"
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

                  <div className="grid grid-cols-3 gap-1">
                    {['D1', 'D2', 'D3', 'D4', 'D5', 'D6'].map((detId) => {
                      const active = selectedDetector === detId;
                      return (
                        <button
                          key={detId}
                          type="button"
                          onClick={() => {
                            const next = active ? '' : detId;
                            setSelectedDetector(next);
                            recordViewerAction('changedBand');
                            onDetectorChange?.(next);
                          }}
                          aria-pressed={active}
                          className={`px-2 py-1 rounded-lg border text-center cursor-pointer transition ${
                            active
                              ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          {detId}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCatalogOverlay((v) => !v)}
                    aria-pressed={showCatalogOverlay}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-start flex items-center gap-2 cursor-pointer ${
                      showCatalogOverlay
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>Gaia / AllWISE ({data.catalogOverlays?.length ?? 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAladinOverlay((v) => !v)}
                    aria-pressed={showAladinOverlay}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-start flex items-center gap-2 cursor-pointer ${
                      showAladinOverlay
                        ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.otherTelescopesAladin}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Section 4: Tools */}
            <div className="rounded-xl bg-[#050811] border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setGroupOverlaysOpen((v) => !v)}
                aria-expanded={groupOverlaysOpen}
                className="w-full px-3 py-2.5 flex items-center justify-between gap-2 font-semibold text-slate-200 hover:bg-white/5 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.panelTools}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${groupOverlaysOpen ? 'rotate-180' : ''}`} />
              </button>
              {groupOverlaysOpen && (
                <div className="p-3 pt-2 border-t border-white/10 space-y-2 font-mono text-[11px]">
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowDqOverlay((v) => !v)}
                      aria-pressed={showDqOverlay}
                      className={`px-2.5 py-1.5 rounded-lg border text-start flex items-center gap-2 cursor-pointer ${
                        showDqOverlay
                          ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>DQ Mask ({currentFrame.dqDecoded?.totalMaskedPixels ?? 0} px)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPixelGrid((v) => !v)}
                      aria-pressed={showPixelGrid}
                      className={`px-2.5 py-1.5 rounded-lg border text-start flex items-center gap-2 cursor-pointer ${
                        showPixelGrid
                          ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <Grid className="w-3.5 h-3.5 shrink-0" />
                      <span>6.2″/px Grid</span>
                    </button>

                    {onOpenSpectrum && (
                      <button
                        type="button"
                        onClick={onOpenSpectrum}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-sky-400/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>102-Band Spectrum</span>
                      </button>
                    )}

                    {onOpenDetectorStacking && (
                      <button
                        type="button"
                        onClick={onOpenDetectorStacking}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Co-add Stacks</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setMetaSlotOpen((v) => !v)}
                      aria-pressed={metaSlotOpen}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-start cursor-pointer ${
                        metaSlotOpen ? 'bg-amber-500/15 border-amber-400/40 text-amber-200' : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      {t.sciMetadataDrawer}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCentroidSlotOpen((v) => !v)}
                      aria-pressed={centroidSlotOpen}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-start cursor-pointer ${
                        centroidSlotOpen ? 'bg-sky-500/15 border-sky-400/40 text-sky-200' : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      {t.slotCentroid}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSpectrumSlotOpen((v) => !v)}
                      aria-pressed={spectrumSlotOpen}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-start cursor-pointer ${
                        spectrumSlotOpen ? 'bg-sky-500/15 border-sky-400/40 text-sky-200' : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      {t.slotSpectrum}
                    </button>

                    <button
                      type="button"
                      onClick={() => setLightCurveSlotOpen((v) => !v)}
                      aria-pressed={lightCurveSlotOpen}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-start cursor-pointer ${
                        lightCurveSlotOpen ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200' : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      {t.slotLightCurve}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Section 5: Share */}
            <div className="rounded-xl bg-[#050811] border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setGroupPlotsOpen((v) => !v)}
                aria-expanded={groupPlotsOpen}
                className="w-full px-3 py-2.5 flex items-center justify-between gap-2 font-semibold text-slate-200 hover:bg-white/5 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Share2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.panelShare}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${groupPlotsOpen ? 'rotate-180' : ''}`} />
              </button>
              {groupPlotsOpen && (
                <div className="p-3 pt-2 border-t border-white/10 space-y-1.5 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(true)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-sky-400/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{t.panelShare}</span>
                  </button>
                  {onOpenPostcard && (
                    <button
                      type="button"
                      onClick={onOpenPostcard}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t.discoveryCardTitle}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleExportPng}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </button>
                  {onOpenProvenance && (
                    <button
                      type="button"
                      onClick={onOpenProvenance}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white cursor-pointer text-start"
                    >
                      Provenance Details
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Primary Sky Viewport Column */}
        <div className={explorerMode ? 'relative flex-1 w-full min-h-[560px] flex flex-col' : 'flex-1 min-w-0 w-full flex flex-col gap-3'}>
          {/* Scientist Compact Strip OR Floating Explorer Left/Right Panels */}
          {!explorerMode && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#050811] border border-white/10 px-2.5 py-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Other Telescopes Menu */}
              <div className="relative">
                <button
                  type="button"
                  data-testid="other-telescopes-btn"
                  aria-expanded={otherTelescopesOpen}
                  onClick={() => setOtherTelescopesOpen((v) => !v)}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 cursor-pointer transition ${
                    showAladinOverlay || (showCatalogOverlay && (showGaiaOverlay || showAllWiseOverlay))
                      ? 'bg-sky-500/15 border-sky-400/40 text-sky-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <Telescope className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  <span>{t.otherTelescopesBtn}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${otherTelescopesOpen ? 'rotate-180' : ''}`} />
                </button>
                {otherTelescopesOpen && (
                  <div className="absolute start-0 mt-1.5 z-30 w-72 rounded-xl bg-[#0B101D] border border-white/15 p-3 shadow-2xl space-y-2.5">
                    <label className="flex items-start justify-between gap-2 text-xs text-slate-200 cursor-pointer">
                      <span className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 mt-1 rounded-full border border-sky-400 inline-block shrink-0" />
                        <span>
                          <span className="block font-medium">{t.otherTelescopesGaia}</span>
                          <span className="block text-[10px] text-slate-400">{t.otherTelescopesGaiaDesc}</span>
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={showCatalogOverlay && showGaiaOverlay}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setShowGaiaOverlay(checked);
                          if (checked) setShowCatalogOverlay(true);
                          else if (!showAllWiseOverlay) setShowCatalogOverlay(false);
                        }}
                        className="accent-sky-400 cursor-pointer mt-1"
                      />
                    </label>
                    <label className="flex items-start justify-between gap-2 text-xs text-slate-200 cursor-pointer">
                      <span className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 mt-1 rotate-45 border border-emerald-400 inline-block shrink-0" />
                        <span>
                          <span className="block font-medium">{t.otherTelescopesWise}</span>
                          <span className="block text-[10px] text-slate-400">{t.otherTelescopesWiseDesc}</span>
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={showCatalogOverlay && showAllWiseOverlay}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setShowAllWiseOverlay(checked);
                          if (checked) setShowCatalogOverlay(true);
                          else if (!showGaiaOverlay) setShowCatalogOverlay(false);
                        }}
                        className="accent-emerald-400 cursor-pointer mt-1"
                      />
                    </label>
                    <label className="flex items-start justify-between gap-2 text-xs text-slate-200 cursor-pointer">
                      <span className="flex items-start gap-2">
                        <Globe className="w-3 h-3 mt-1 text-amber-400 shrink-0" />
                        <span>
                          <span className="block font-medium">{t.otherTelescopesAladin}</span>
                          <span className="block text-[10px] text-slate-400">{t.otherTelescopesAladinDesc}</span>
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={showAladinOverlay}
                        onChange={(e) => setShowAladinOverlay(e.target.checked)}
                        className="accent-amber-400 cursor-pointer mt-1"
                      />
                    </label>
                    <div className="pt-1.5 border-t border-white/10 text-[10px] text-slate-400 flex flex-col gap-0.5">
                      <span><span className="text-sky-400">○</span> {t.telescopesLegendGaia}</span>
                      <span><span className="text-emerald-400">◇</span> {t.telescopesLegendWise}</span>
                      <span><span className="text-amber-400">+</span> {t.telescopesLegendTarget}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Survey-Pass Mode Toggle (~6-month passes, never fake spacing) */}
              <button
                type="button"
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
                className={`min-h-[34px] px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 cursor-pointer transition ${
                  surveyPassMode
                    ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.surveyPassToggle}</span>
                <span className="font-mono text-[10px] opacity-80 tabular-nums">({surveyPasses.length})</span>
              </button>

              {(Math.abs(pan.x) > 4 || Math.abs(pan.y) > 4 || Math.abs(zoom - defaultZoom) > 0.08) && (
                <button
                  type="button"
                  onClick={handleResetExplorerView}
                  className="min-h-[34px] px-2.5 py-1 rounded-lg border border-sky-400/35 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>{t.resetPanBtn}</span>
                </button>
              )}
            </div>

            {/* Clearly Visible FOV Selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] text-slate-400">{t.fovLabelShort}:</span>
              {[
                { pix: 32, arcmin: "3.3'" },
                { pix: 64, arcmin: "6.6'" },
                { pix: 112, arcmin: "11.6'" },
                { pix: 160, arcmin: "16.5'" },
              ].map((opt) => {
                const active = sizePix === opt.pix;
                return (
                  <button
                    key={opt.pix}
                    type="button"
                    data-testid={`fov-option-${opt.pix}`}
                    aria-pressed={active}
                    disabled={!onSelectFovSize}
                    onClick={() => onSelectFovSize?.(opt.pix)}
                    className={`min-h-[30px] px-2 py-0.5 rounded-lg border font-mono text-[11px] tabular-nums cursor-pointer transition ${
                      active
                        ? 'bg-sky-400 text-slate-950 border-sky-400 font-bold'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:text-white disabled:opacity-50'
                    }`}
                  >
                    {opt.arcmin}
                  </button>
                );
              })}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  data-testid="share-open-btn"
                  onClick={() => setShowShareModal(true)}
                  className="min-h-[30px] px-2.5 py-0.5 rounded-lg border border-sky-400/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Share2 className="w-3 h-3" aria-hidden="true" />
                  <span>{t.panelShare}</span>
                </button>
                <button
                  type="button"
                  data-testid="report-bad-data-btn"
                  onClick={() => handleReportBadData(currentFrame)}
                  className="min-h-[30px] px-2 py-0.5 rounded-lg border border-rose-500/35 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Flag className="w-3 h-3" aria-hidden="true" />
                  <span>{t.badDataReportBtn}</span>
                </button>
              </div>
            </div>
          </div>
          )}

          {/* Large FOV Size / Download Time Warning */}
          {!explorerMode && sizePix >= 112 && (
            <div
              data-testid="large-fov-warning"
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/35 text-amber-200 text-[11px] font-mono flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                <span>{t.fovLargeWarning}</span>
              </span>
              <span className="font-bold text-amber-300 tabular-nums shrink-0">
                {sizePix >= 160 ? '~8–16 MB · ~18s' : '~4–8 MB · ~8s'}
              </span>
            </div>
          )}

          {/* Honest Survey-Pass Fallback Notice in Scientist Mode if <2 passes */}
          {!explorerMode && surveyPassMode && !hasTwoOrMorePasses && (
            <div
              data-testid="survey-pass-fallback-notice"
              className="px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-400/30 text-sky-200 text-[11px] flex items-center gap-2"
            >
              <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
              <span>{t.surveyPassFallbackNotice}</span>
            </div>
          )}

          {/* Bad-data Toast */}
          {badDataToast && (
            <div
              role="status"
              data-testid="bad-data-toast"
              className="fixed bottom-24 start-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-xs shadow-2xl flex items-center gap-2"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{badDataToast}</span>
            </div>
          )}

          {/* Main Full-Bleed Sky Viewport + Synchronized SVG Overlay */}
          <div
            ref={gestures.viewportRef}
            data-tour="viewport_canvas"
            {...gestures.handlers}
            className={`relative w-full ${
              explorerMode
                ? `${isEmbed ? 'h-screen' : 'h-[78vh] min-h-[540px] sm:h-[82vh]'} flex-1`
                : 'h-80 sm:h-[430px] rounded-2xl'
            } bg-[#02040A] overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing flex items-center justify-center`}
          >
            {/* High-DPR smooth procedural PSF starfield backdrop (replaces blocky SVG dots) */}
            <canvas
              ref={backdropCanvasRef}
              aria-hidden="true"
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {loading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#040711]/90 backdrop-blur-sm">
                <SkeletonSky
                  label={t.loadingScanningSky}
                  sublabel={
                    loadingProgress && loadingProgress.total > 0
                      ? `${t.loadingFramesArriving}: ${loadingProgress.loaded} / ${loadingProgress.total}`
                      : isRtl
                      ? 'جاري استلام الإطارات ومعايرتها...'
                      : 'Receiving infrared frames & aligning sky grid...'
                  }
                  loaded={loadingProgress?.loaded}
                  total={loadingProgress?.total}
                  elapsedSec={loadingElapsedSec}
                  slowHint={t.loadingScanningSlow}
                  hasSavedCopy
                  onUseSavedCopy={handleUseOfflineDemo}
                  savedCopyLabel={t.exploreOfflineDemoBtn}
                  aspectRatio="square"
                  className="w-full h-full border-0 rounded-none"
                />
              </div>
            )}

            <PolaroidDevelop
              triggerKey={polaroidKey}
              className="flex items-center justify-center w-full h-full"
            >
              <div
                className="relative shrink-0"
                style={{
                  width: explorerMode ? 'min(86vw, 62vh, 520px)' : '288px',
                  height: explorerMode ? 'min(86vw, 62vh, 520px)' : '288px',
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
                  style={{ imageRendering: !explorerMode && pixelSharp ? 'pixelated' : 'auto' }}
                  aria-label={`SPHEREx infrared cutout canvas for frame ${safeFrameIdx + 1}`}
                />

                {/* Cross-fade trailing frame layer (pure visual polish; never alters underlying canvas) */}
                <canvas
                  ref={fadeCanvasRef}
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-200"
                  style={{
                    opacity: fadeOpacity,
                    imageRendering: !explorerMode && pixelSharp ? 'pixelated' : 'auto',
                  }}
                />

                {/* Radial vignette so the cutout's square borders dissolve into deep space */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle at center, transparent 58%, rgba(2,4,10,0.68) 84%, #02040A 99%)',
                  }}
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

                  {/* Gaia DR3 & AllWISE Catalog Overlays (respecting Other Telescopes toggles) */}
                  {showCatalogOverlay &&
                    data.catalogOverlays?.map((cat, idx) => {
                      if (cat.x < 0 || cat.x > frameW || cat.y < 0 || cat.y > frameH) return null;
                      const isGaia = cat.catalog === 'Gaia DR3';
                      if (isGaia && !showGaiaOverlay) return null;
                      if (!isGaia && !showAllWiseOverlay) return null;
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

                  {/* Measured Ghost Trail (solid when significant, dashed + "expected" otherwise) */}
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
                            className={motionIsSignificant && renderMode === 'diff_ref' ? 'spex-trail-path' : ''}
                            strokeDasharray={motionIsSignificant ? undefined : '1.1 0.7'}
                            points={activeTrailPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                          />
                        </>
                      )}
                      {/* Fading ghost circles behind current epoch from real measured positions */}
                      {measuredTrailPoints.map((p, i) => {
                        const progress = measuredTrailPoints.length > 1 ? i / (measuredTrailPoints.length - 1) : 1;
                        return (
                          <circle
                            key={`ghost-${p.idx}-${i}`}
                            cx={p.x}
                            cy={p.y}
                            r={0.52 + progress * 0.45}
                            fill={motionIsSignificant ? '#00D3F3' : '#F59E0B'}
                            stroke="rgba(2, 4, 10, 0.75)"
                            strokeWidth={0.18}
                            opacity={0.3 + progress * 0.65}
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
                            fontSize="2.3"
                            fontFamily="monospace"
                            fontWeight="bold"
                            opacity={0.95}
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

                  {/* Pulsing highlight ring when "Show what changed" is active */}
                  {renderMode === 'diff_ref' && currentTargetPix && (
                    <g className="spex-target-ring">
                      <circle
                        cx={currentTargetPix.x}
                        cy={currentTargetPix.y}
                        r={4.2}
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth={0.45}
                        strokeDasharray="1.2 0.8"
                      />
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

                  {/* DQ Bad-Data Highlight Markers on Affected Regions */}
                  {showDqOverlay && dqHighlightSpots.map((spot, idx) => (
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
            </PolaroidDevelop>

            {/* Fixed HUD: Coordinates, Detector, Wavelength */}
            {!explorerMode ? (
              <div className="absolute top-2 start-2 pointer-events-none bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 font-mono text-[10px] text-sky-400 tabular-nums">
                RA {data.targetCoords.ra.toFixed(4)}° · DEC {data.targetCoords.dec >= 0 ? '+' : ''}
                {data.targetCoords.dec.toFixed(4)}° · {currentFrame.detector} · λ {currentFrame.wavelengthUm.toFixed(2)} µm
              </div>
            ) : (
              <div
                data-testid="explorer-hud-readout"
                className="absolute top-2.5 start-2.5 pointer-events-none bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 font-mono text-[11px] text-sky-300 tabular-nums flex items-center gap-2"
              >
                <span>{currentFrame.dateObs?.slice(0, 10)}</span>
                <span className="text-slate-500">·</span>
                <span>{safeFrameIdx + 1}/{activeFrameList.length}</span>
                <span className="text-slate-500">·</span>
                <span className={wavelengthPreview ? 'text-amber-300 font-bold' : 'text-amber-200'}>
                  {(wavelengthPreview?.snappedDetector || currentFrame.detector)} ·{' '}
                  {(wavelengthPreview?.um ?? currentFrame.wavelengthUm).toFixed(2)} µm
                </span>
              </div>
            )}

            {/* Top-End Viewport Action: Scientist Explain button OR Explorer "?" Gesture Replay + Zoom Reset */}
            {!explorerMode && onSpotSelect && (
              <button
                type="button"
                data-testid="explain-this-spot-btn"
                onClick={() => {
                  const target = tappedPix || currentTargetPix || { x: Math.floor(frameW / 2), y: Math.floor(frameH / 2) };
                  inspectSpotAtPixel(target.x, target.y);
                }}
                className="absolute top-2 end-2 min-h-[34px] px-2.5 py-1 rounded-lg bg-black/80 hover:bg-amber-400 hover:text-slate-950 border border-amber-400/50 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer backdrop-blur-md"
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>{t.explainThisSpotBtn}</span>
              </button>
            )}

            {explorerMode && zoom > 1.05 && (
              <div className="absolute top-2.5 end-2.5 z-20 flex items-center gap-1.5" data-gesture-ignore="true">
                <button
                  type="button"
                  data-testid="explorer-zoom-reset"
                  aria-label={t.gestureResetViewAria}
                  title={t.gestureResetViewAria}
                  onClick={handleResetExplorerView}
                  className="px-2 py-1 rounded-lg bg-black/80 border border-sky-400/40 text-sky-300 font-mono text-[11px] font-semibold cursor-pointer hover:bg-sky-500/20 tabular-nums"
                >
                  {zoom.toFixed(1)}× ↺
                </button>
              </div>
            )}

            {/* Explorer Bottom Edge Date Timeline Strip (draggable display strip) */}
            {explorerMode && (
              <div
                ref={timelineStripRef}
                data-testid="explorer-timeline-strip"
                data-gesture-ignore="true"
                role="slider"
                tabIndex={0}
                aria-label={t.gestureDragTime}
                aria-valuemin={1}
                aria-valuemax={activeFrameList.length}
                aria-valuenow={safeFrameIdx + 1}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {}
                  updateTimelineFromPointer(e.clientX);
                }}
                onPointerMove={(e) => {
                  if (e.buttons === 0 && e.pointerType === 'mouse') return;
                  updateTimelineFromPointer(e.clientX);
                }}
                onPointerUp={(e) => {
                  try {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                  } catch {}
                }}
                className="absolute inset-x-4 bottom-2 z-10 h-7 flex flex-col justify-end gap-1 cursor-ew-resize touch-none select-none"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5 pointer-events-none tabular-nums">
                  <span>{activeFrameList[0]?.dateObs?.slice(0, 10) || ''}</span>
                  <span className="text-amber-300 font-semibold">
                    {currentFrame.dateObs?.slice(0, 10) || ''}
                  </span>
                  <span>{activeFrameList[activeFrameList.length - 1]?.dateObs?.slice(0, 10) || ''}</span>
                </div>
                <div className="relative h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-amber-400 rounded-full transition-all duration-100"
                    style={{
                      width: `${activeFrameList.length > 1 ? ((safeFrameIdx / (activeFrameList.length - 1)) * 100) : 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Fixed HUD: Obs ID & MJD (Scientist) */}
            {!explorerMode && (
              <div className="absolute bottom-2 start-2 pointer-events-none bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 font-mono text-[10px] text-slate-200 tabular-nums">
                {currentFrame.obsId} · MJD {currentFrame.mjd.toFixed(5)} · {currentFrame.dateObs?.slice(0, 10)}
              </div>
            )}

            {/* Angular Scale Bar (5 px = 31") */}
            {!explorerMode && (
              <div className="absolute bottom-2 end-2 pointer-events-none bg-black/75 px-2 py-1 rounded-lg border border-white/10 font-mono text-[10px] text-slate-300 flex items-center gap-1.5">
                <span className="inline-block w-8 h-0.5 bg-amber-400" />
                <span>31″ (5 px · 6.2″/px)</span>
              </div>
            )}
          </div>

          {/* Inline Aladin Multi-Survey Panel (toggled from Other telescopes menu) */}
          {showAladinOverlay && (
            <div className="rounded-xl border border-white/10 bg-[#050811] p-2.5 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono text-cyan-300">
                  {t.otherTelescopesAladin}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAladinOverlay(false)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
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

          {/* SIMPLE MODE BOTTOM BAR: Play/Pause + Timeline + ONLY Other telescopes & Share + Plain Caption + Trail Legend */}
          {explorerMode ? (
            <div className="relative z-25 px-3 sm:px-5 pb-4 pt-2 max-w-5xl mx-auto w-full">
              <div className="obs-glass rounded-2xl border border-white/15 bg-[#090F1E]/92 backdrop-blur-xl p-3 sm:p-4 shadow-2xl space-y-3">
                {/* Simple Mode Buttons: Play/Pause, Other telescopes, Share */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
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
                    className="flex-1 min-w-[160px] min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer shadow-sm"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 shrink-0" /> : <Play className="w-4 h-4 shrink-0 fill-current" />}
                    <span>{isPlaying ? t.framePlayerPause : t.framePlayerPlay}</span>
                  </button>

                  {!isEmbed && (
                    <>
                      <div className="relative">
                        <button
                          type="button"
                          data-testid="other-telescopes-btn"
                          aria-expanded={otherTelescopesOpen}
                          onClick={() => setOtherTelescopesOpen((v) => !v)}
                          className={`min-h-[44px] px-3.5 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border cursor-pointer transition ${
                            showAladinOverlay || (showCatalogOverlay && (showGaiaOverlay || showAllWiseOverlay))
                              ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                              : 'bg-white/5 border-white/15 text-slate-200 hover:bg-white/10'
                          }`}
                        >
                          <Telescope className="w-4 h-4 text-sky-400 shrink-0" />
                          <span>{t.otherTelescopesBtn}</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${otherTelescopesOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {otherTelescopesOpen && (
                          <div className="absolute bottom-full mb-2 start-0 z-40 w-72 rounded-xl bg-[#0B101D] border border-white/15 p-3 shadow-2xl space-y-2.5 text-xs">
                            <label className="flex items-start justify-between gap-2 text-slate-200 cursor-pointer">
                              <span className="flex items-start gap-2">
                                <span className="w-2.5 h-2.5 mt-1 rounded-full border border-sky-400 inline-block shrink-0" />
                                <span>
                                  <span className="block font-medium">{t.otherTelescopesGaia}</span>
                                  <span className="block text-[10px] text-slate-400">{t.otherTelescopesGaiaDesc}</span>
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                checked={showCatalogOverlay && showGaiaOverlay}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setShowGaiaOverlay(checked);
                                  if (checked) setShowCatalogOverlay(true);
                                  else if (!showAllWiseOverlay) setShowCatalogOverlay(false);
                                }}
                                className="accent-sky-400 cursor-pointer mt-1"
                              />
                            </label>
                            <label className="flex items-start justify-between gap-2 text-slate-200 cursor-pointer">
                              <span className="flex items-start gap-2">
                                <span className="w-2.5 h-2.5 mt-1 rotate-45 border border-emerald-400 inline-block shrink-0" />
                                <span>
                                  <span className="block font-medium">{t.otherTelescopesWise}</span>
                                  <span className="block text-[10px] text-slate-400">{t.otherTelescopesWiseDesc}</span>
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                checked={showCatalogOverlay && showAllWiseOverlay}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setShowAllWiseOverlay(checked);
                                  if (checked) setShowCatalogOverlay(true);
                                  else if (!showGaiaOverlay) setShowCatalogOverlay(false);
                                }}
                                className="accent-emerald-400 cursor-pointer mt-1"
                              />
                            </label>
                            <label className="flex items-start justify-between gap-2 text-slate-200 cursor-pointer">
                              <span className="flex items-start gap-2">
                                <Globe className="w-3 h-3 mt-1 text-amber-400 shrink-0" />
                                <span>
                                  <span className="block font-medium">{t.otherTelescopesAladin}</span>
                                  <span className="block text-[10px] text-slate-400">{t.otherTelescopesAladinDesc}</span>
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                checked={showAladinOverlay}
                                onChange={(e) => setShowAladinOverlay(e.target.checked)}
                                className="accent-amber-400 cursor-pointer mt-1"
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        data-testid="share-open-btn"
                        onClick={() => setShowShareModal(true)}
                        className="min-h-[44px] px-3.5 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-sky-400/35 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 cursor-pointer"
                      >
                        <Share2 className="w-4 h-4 shrink-0" />
                        <span>{t.panelShare}</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Survey-Pass Fallback Honest Notice when < 2 passes exist */}
                {surveyPassMode && !hasTwoOrMorePasses && (
                  <div
                    data-testid="survey-pass-fallback-notice"
                    className="p-2 rounded-xl bg-sky-500/10 border border-sky-400/25 text-[11px] text-sky-200 leading-snug flex items-center gap-2"
                  >
                    <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
                    <span>{t.surveyPassFallbackNotice}</span>
                  </div>
                )}

                {/* Actual-Date Frame Timeline */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {activeFrameList.map((fr, idx) => {
                    const active = idx === safeFrameIdx;
                    const maskedCount = fr.dqDecoded?.totalMaskedPixels ?? 0;
                    const isFlagged = maskedCount > 0;
                    return (
                      <button
                        key={`${fr.obsId}-${idx}`}
                        type="button"
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentFrameIdx(idx);
                          onSelectFrame?.(idx);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border font-mono text-[11px] tabular-nums shrink-0 flex items-center gap-1.5 cursor-pointer transition ${
                          active
                            ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span>{fr.dateObs?.slice(0, 10) || `F${idx + 1}`}</span>
                        {isFlagged && (
                          <AlertTriangle
                            className={`w-3 h-3 ${active ? 'text-rose-800' : 'text-rose-400'}`}
                            aria-label={t.flaggedFramesBadge}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Plain-Language 1-Line Caption & Motion Trail Legend */}
                <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <p data-testid="explore-plain-caption" className="text-slate-100 font-medium">
                    {data.astrometrySummary?.motionSignificant && data.astrometrySummary.measuredDisplacementArcsec > 0.05
                      ? `${t.exploreCaptionMovedPrefix} ${data.astrometrySummary.measuredDisplacementArcsec.toFixed(2)} ${t.exploreCaptionMovedMiddle} ${activeFrameList.length}`
                      : t.exploreCaptionStill}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-300 shrink-0">
                    <span
                      aria-hidden="true"
                      className={`inline-block w-5 h-0.5 ${
                        motionIsSignificant
                          ? 'bg-[#00D3F3]'
                          : 'border-b-2 border-dashed border-amber-400'
                      }`}
                    />
                    <span>
                      {motionIsSignificant
                        ? t.exploreMotionTrailLegendSolid
                        : t.exploreMotionTrailLegendDashed}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div data-tour="collapsible_slots" className="flex flex-col gap-2.5">
              <div
                data-testid="display-smoothing-badge"
                className="px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/10 text-[11px] font-mono text-slate-400"
              >
                {t.honestyDisplaySmoothingBadge}
              </div>
              {/* Slot 1: Frame Metadata & Plain-Language Quality Flags Drawer */}
              <div className="rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMetaSlotOpen((v) => !v)}
                  aria-expanded={metaSlotOpen}
                  className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-[11px] font-mono font-bold text-slate-200 hover:bg-white/5 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    <span>{t.sciMetadataDrawer}</span>
                    <span className="font-normal text-slate-400 hidden sm:inline">· {currentFrame.obsId}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${metaSlotOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                {metaSlotOpen && (
                  <div className="px-3 pb-3 pt-2 border-t border-white/10 flex flex-col gap-2 text-[11px] font-mono text-slate-300">
                    {/* Plain-Language Data Quality Summary */}
                    <div
                      className={`px-2.5 py-2 rounded-lg border flex items-start gap-2 text-xs font-sans ${
                        (currentFrame.dqDecoded?.totalMaskedPixels ?? 0) === 0
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div>
                          {(currentFrame.dqDecoded?.totalMaskedPixels ?? 0) === 0
                            ? t.dqCleanFrame
                            : `${currentFrame.dqDecoded?.totalMaskedPixels} masked px · ${t.dqCosmicRayHint}`}
                        </div>
                        {data.astrometrySummary?.saturatedAllDetectors && (
                          <div className="text-rose-300">{t.dqSaturatedHint}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{cadenceDescription}</span>
                        {pairInfo?.humanBaseline && <span className="text-slate-400">({pairInfo.humanBaseline})</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-slate-400 tabular-nums">
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
                          Release: {activeReleaseLabel} · VER: {activeVersionLabel}
                        </span>
                        <span>λ: {currentFrame.wavelengthUm.toFixed(2)} µm</span>
                        <span>Exp: {currentFrame.integrationDurationSec != null ? `${currentFrame.integrationDurationSec}s` : '—'}</span>
                      </div>
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
          {spectrumSlotOpen && (() => {
            const validSpectrum = (data.spectrumAtCenter || []).filter(
              (p) => Number.isFinite(p.wavelengthUm) && p.wavelengthUm > 0 && Number.isFinite(p.fluxMjySr)
            );
            return (
              <div className="px-3 pb-2.5 pt-1 border-t border-white/10">
                {validSpectrum.length > 0 ? (() => {
                  const minWl = Math.min(...validSpectrum.map((p) => p.wavelengthUm));
                  const maxWl = Math.max(...validSpectrum.map((p) => p.wavelengthUm));
                  const detCount = new Set(validSpectrum.map((p) => p.detector)).size;
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
                            {validSpectrum.length} measured exposure point(s) at target aperture.
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
                  <p className="text-xs font-mono text-slate-300 py-1.5" data-testid="spectrum-unavailable-notice">
                    {t.spectrumUnavailableFrame}
                  </p>
                )}
              </div>
            );
          })()}
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
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Cheat-Sheet Modal (?) */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowShortcutsModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t.sciShortcutsTitle}
        >
          <div
            className="obs-glass w-full max-w-md rounded-2xl border border-white/15 p-5 space-y-4 shadow-2xl spex-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <h2 className="font-display text-base font-bold text-white">{t.sciShortcutsTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                aria-label="Close shortcuts"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-sm">
              {[
                { key: 'Space', desc: t.sciShortcutSpace },
                { key: '← / →', desc: t.sciShortcutArrows },
                { key: 'B', desc: t.sciShortcutBlink },
                { key: 'L', desc: t.sciShortcutLock },
                { key: '?', desc: t.sciShortcutQuestion },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 py-1 border-b border-white/5 last:border-0">
                  <span className="text-slate-300">{item.desc}</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-black/70 border border-white/15 font-mono text-xs font-bold text-amber-300 shrink-0">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Unified Share Modal (Deep Link, Native Web Share, Embed Code, Discovery Card) */}
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

          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <Button
              variant="primary"
              size="md"
              className="w-full"
              icon={<Share2 className="w-4 h-4" />}
              onClick={() => {
                navigator.share({
                  title: targetLabel || 'SPEX · NASA SPHEREx',
                  url: buildShareDeepLink(false),
                }).catch(() => {});
              }}
            >
              {t.shareNativeBtn}
            </Button>
          )}

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
                icon={<Download className="w-4 h-4" />}
                onClick={() => {
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
