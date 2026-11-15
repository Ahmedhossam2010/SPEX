import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Share2,
  Compass,
  Layers,
  Activity,
  Globe,
  Search,
  Film,
  Play,
  ChevronRight,
  ChevronDown,
  X,
  BookOpen,
  Award,
  HelpCircle,
} from 'lucide-react';
import { Modal } from '../design/components/Modal';
import { gameAudio } from '../game/utils/gameAudio';
import {
  CandidateDetection,
  InvestigationResult,
  ChallengeTarget,
} from '../science/types';
import {
  normalizeSourceClassification,
  getSourceClassificationMeta,
} from '../science/provenance';
import { ColormapMode, DisplayMode, StretchMode } from '../utils/astronomyRender';
import { AstronomicalSkyViewport } from './Explore/AstronomicalSkyViewport';
import { FourLensesDock } from './Explore/FourLensesDock';
import { ScientistInvestigationPanel } from './Explore/ScientistInvestigationPanel';
import { SpexCompanion } from './Explore/SpexCompanion';
import { SpexGuidePanel } from './Explore/SpexGuidePanel';
import { SpexGuidedTour } from './Explore/SpexGuidedTour';
import { SpexUiHighlight } from './Explore/SpexUiHighlight';
import { SpexPortrait } from '../spex/SpexPortrait';
import { SpexExplainContext, SpexHighlight, SpexSpotSelection } from '../science/spexExplain';
import { FramePlayer, PlayerRenderMode, TimeSeriesResponse } from './TimeLens/FramePlayer';
import { AladinLitePanel } from './Explore/AladinLitePanel';
import { PostcardModal } from './TimeLens/PostcardModal';
import { ProvenanceModal } from './ProvenanceModal';
import { DataReleaseModal } from './DataReleaseModal';
import { SpexSpaceDictionaryModal } from './SpexSpaceDictionaryModal';
import { SpaceExplorerLogModal } from './Explore/SpaceExplorerLogModal';
import { ExplorerMissions, TargetActionProgress } from './Explore/ExplorerMissions';
import { DetectorStackingModal } from './Explore/DetectorStackingModal';
import { SpectralExplorerModal } from './SpectralExplorerModal';
import { ObservationItem, ImageMathMode } from './Explore/ObservationTimelineSelector';
import { LensMode } from '../design/components/LensButton';
import { Language, translations } from '../utils/translations';
import { FlyToSearch, FlyTargetSelection } from '../ui/FlyToSearch';

const BENCHMARK_PRESETS = [
  { caseId: 'case-wise-0855', targetParam: 'wise-0855', label: 'WISE 0855', labelAr: 'WISE 0855', sub: '8″/yr Y-Dwarf', ra: 133.81890825, dec: -7.247048, stars: 2, kind: 'brown_dwarf' as const },
  { caseId: 'case-barnards-star', targetParam: 'barnards-star', label: "Barnard's Star", labelAr: 'نجم برنارد', sub: '10.4″/yr M4V', ra: 269.45207695, dec: 4.69336497, stars: 1, kind: 'fast_star' as const },
  { caseId: 'case-epsilon-indi', targetParam: 'epsilon-indi', label: 'Epsilon Indi', labelAr: 'إبسيلون إندي', sub: '4.7″/yr T1+T6', ra: 331.04414659, dec: -56.7828442, stars: 2, kind: 'twins' as const },
  { caseId: 'case-rw-aur', targetParam: 'rw-aurigae', label: 'RW Aurigae', labelAr: 'RW Aurigae', sub: 'YSO Accretion', ra: 76.95652603, dec: 30.40143817, stars: 3, kind: 'young_star' as const },
  { caseId: 'case-r-dra', targetParam: 'r-draconis', label: 'R Draconis', labelAr: 'R Draconis', sub: 'Mira Giant', ra: 248.16761083, dec: 66.75497942, stars: 3, kind: 'giant' as const },
] as const;

const FOV_PRESETS = [
  { label: "3.3'", sizePix: 32 },
  { label: "6.6'", sizePix: 64 },
  { label: "11.6'", sizePix: 112 },
  { label: "16.5'", sizePix: 160 },
] as const;

const GUIDED_DEMO_STEPS: Array<{
  title: string;
  caption: string;
  action: {
    play?: boolean;
    blinkFirstLast?: boolean;
    renderMode?: PlayerRenderMode;
    detector?: string;
    zoom?: number;
    showGrid?: boolean;
    showMotionTrail?: boolean;
  };
}> = [
  {
    title: '1. Multi-Epoch Flipbook',
    caption: 'Streaming real NASA IRSA SPHEREx exposures spanning multiple months for WISE 0855 (Y-dwarf brown dwarf, 8.15″/yr).',
    action: { play: true, blinkFirstLast: false, renderMode: 'raw', zoom: 2, showMotionTrail: true, showGrid: false },
  },
  {
    title: '2. Blink Ep 1 ↔ Last + Crosshair',
    caption: 'Blinking between Epoch 1 and the latest pass at 4× zoom highlights sub-arcsec shift relative to the fixed Epoch-1 amber crosshair.',
    action: { play: true, blinkFirstLast: true, renderMode: 'raw', zoom: 4, showMotionTrail: true },
  },
  {
    title: '3. Subpixel Centroid & Trail',
    caption: 'SPHEREx pixels are 6.2″ wide (~1.3 px/yr shift). WISE 0855 is tracked at the predicted position with measured vs predicted shown alongside the Spitzer/HST curve (6.11″ ± 4.41″, 1.39σ).',
    action: { play: false, blinkFirstLast: false, renderMode: 'raw', zoom: 4, showGrid: true, showMotionTrail: true },
  },
  {
    title: '4. Difference Image (Diff vs Ep 1)',
    caption: 'Subtracting Epoch 1 cancels stationary field stars and exposes subtle proper-motion dipoles and infrared brightness variations.',
    action: { play: false, blinkFirstLast: false, renderMode: 'diff_ref', zoom: 2, showGrid: false },
  },
  {
    title: '5. Detector Bands D1–D6 & SED',
    caption: 'Switch across SPHEREx 0.75–5.0 µm detector arrays or open the 102-band Spectrum Explorer to inspect cold CH4/H2O absorption.',
    action: { play: false, blinkFirstLast: false, renderMode: 'raw', detector: 'D3', zoom: 2 },
  },
];

export interface ExploreViewProps {
  currentResult: InvestigationResult | null;
  isLoading: boolean;
  onSearchTarget: (ra: number, dec: number, sizePix?: number) => void;
  onFlySelection?: (selection: FlyTargetSelection) => void;
  onSelectCase: (caseId: string, options?: { sizePix?: number; epochPair?: string }) => void;
  cases: Array<{ id: string; title: string; category?: string; ra: number; dec: number }>;
  language: Language;
  fallbackQuery?: { ra: number; dec: number } | null;
  onClearFallback?: () => void;
  onBackToSky?: () => void;
  isScientistMode?: boolean;
  onToggleScientistMode?: () => void;
  selectedTarget?: ChallengeTarget | null;
  initialDetector?: string;
  onDetectorChange?: (detector: string) => void;
  activeSizePix?: number;
  activeCaseId?: string | null;
  autoPlay?: boolean;
  onAutoPlayConsumed?: () => void;
  isEmbed?: boolean;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  currentResult,
  isLoading,
  onSearchTarget,
  onFlySelection,
  onSelectCase,
  cases,
  language,
  fallbackQuery: _fallbackQuery,
  onClearFallback: _onClearFallback,
  onBackToSky,
  isScientistMode = false,
  onToggleScientistMode,
  selectedTarget,
  initialDetector,
  onDetectorChange,
  activeSizePix,
  activeCaseId,
  autoPlay = false,
  onAutoPlayConsumed,
  isEmbed = false,
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];

  // Primary view mode: 'flipbook' (default WiseView-style P0 player + Aladin) vs 'curtain' (4-Lens Curtain Lab)
  const [viewMode, setViewMode] = useState<'flipbook' | 'curtain'>('flipbook');
  const [showFlySearchSheet, setShowFlySearchSheet] = useState<boolean>(false);
  const [guidedDemoStep, setGuidedDemoStep] = useState<number | null>(null);
  const [showCompanion, setShowCompanion] = useState<boolean>(isScientistMode);
  const [spexGuideOpen, setSpexGuideOpen] = useState<boolean>(false);
  const [spexSpotSelection, setSpexSpotSelection] = useState<SpexSpotSelection | null>(null);
  const [spexExplainContext, setSpexExplainContext] = useState<SpexExplainContext | null>(null);
  const [spexHighlights, setSpexHighlights] = useState<SpexHighlight[]>([]);
  const [spexAutoAskToken, setSpexAutoAskToken] = useState<number>(0);
  const [aladinSlotOpen, setAladinSlotOpen] = useState<boolean>(true);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [latestTimeSeriesMeta, setLatestTimeSeriesMeta] = useState<TimeSeriesResponse | null>(null);
  const [missionProgressByCase, setMissionProgressByCase] = useState<Record<string, TargetActionProgress>>({});

  const markTargetAction = useCallback((caseKey: string, field: keyof TargetActionProgress) => {
    if (!caseKey) return;
    setMissionProgressByCase((prev) => {
      const cur = prev[caseKey] || { played: false, diffShown: false, spotOrSpex: false };
      if (cur[field]) return prev;
      return {
        ...prev,
        [caseKey]: {
          ...cur,
          [field]: true,
        },
      };
    });
  }, []);

  useEffect(() => {
    if (!isScientistMode && viewMode === 'curtain') {
      setViewMode('flipbook');
    }
  }, [isScientistMode, viewMode]);

  useEffect(() => {
    setSpexHighlights([]);
    setSpexSpotSelection(null);
  }, [activeCaseId, currentResult?.targetCoords?.ra, currentResult?.targetCoords?.dec]);
  const [pendingTarget, setPendingTarget] = useState<{ ra: number; dec: number; caseId?: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    const p = new URLSearchParams(window.location.search);
    const tSlug = (p.get('target') || p.get('case') || '').toLowerCase();
    const matched = BENCHMARK_PRESETS.find(
      (b) => b.caseId === tSlug || b.targetParam === tSlug || (tSlug && b.caseId.includes(tSlug))
    );
    if (matched) return { ra: matched.ra, dec: matched.dec, caseId: matched.caseId };
    const raVal = parseFloat(p.get('ra') || '');
    const decVal = parseFloat(p.get('dec') || '');
    if (Number.isFinite(raVal) && Number.isFinite(decVal)) return { ra: raVal, dec: decVal };
    return null;
  });

  useEffect(() => {
    if (currentResult) {
      setPendingTarget(null);
    }
  }, [currentResult]);

  // --- CANONICAL SHARED ASTRONOMICAL VIEWPORT STATE ---
  // Frame Selection: 0 = Epoch 1 (Visit 1), 1 = Epoch 2 (Visit 2), 2 = Difference Map
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isCurtainActive, setIsCurtainActive] = useState<boolean>(false);

  // Geometric Transform (PERSISTS across Explorer & Scientist mode toggles!)
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Scientific Display Parameters (Controlled by Scientist Mode or auto-tuned by active lens)
  const [stretch, setStretch] = useState<StretchMode>('asinh');
  const [customColormap, setCustomColormap] = useState<ColormapMode | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('presentation');
  const [showRawPixels, setShowRawPixels] = useState<boolean>(false);
  const [contrastFactor, setContrastFactor] = useState<number>(1.0);

  // Active Lens: 'time' | 'colors' | 'doubt' | 'neighbors' | null
  const [activeLens, setActiveLens] = useState<LensMode | null>('time');

  // Hidden Colors: Selected band index
  const [activeBandIdx, setActiveBandIdx] = useState<number>(0);

  // DOUBT Lens: Data Quality overlay toggle & selected flagged pixel
  const [isDoubtOverlayActive, setIsDoubtOverlayActive] = useState<boolean>(true);
  const [selectedFlagPixel, setSelectedFlagPixel] = useState<{ x: number; y: number; flag: number } | null>(null);

  // NEIGHBORS Lens: Catalog overlay toggle & selected candidate
  const [isNeighborsOverlayActive, setIsNeighborsOverlayActive] = useState<boolean>(true);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetection | null>(null);
  const [tappedSpot, setTappedSpot] = useState<{ x: number; y: number; ra: number; dec: number } | null>(null);

  // Canonical HTML5 Canvas Ref (captured for Postcard export and Curtain divider)
  const [canvasInstance, setCanvasInstance] = useState<HTMLCanvasElement | null>(null);

  // Guided Onboarding Tour & UI Pointing Beacon State (launched on demand only)
  const [showTour, setShowTour] = useState<boolean>(false);
  const [highlightedTargetId, setHighlightedTargetId] = useState<string | null>(null);

  // Modals
  const [showPostcard, setShowPostcard] = useState<boolean>(false);
  const [showProvenance, setShowProvenance] = useState<boolean>(false);
  const [showDataRelease, setShowDataRelease] = useState<boolean>(false);
  const [showDictionary, setShowDictionary] = useState<boolean>(false);
  const [dictionaryTermId, setDictionaryTermId] = useState<string | null>(null);
  const [showExplorerLog, setShowExplorerLog] = useState<boolean>(false);
  const [showDetectorStacking, setShowDetectorStacking] = useState<boolean>(false);
  const [showSpectralExplorer, setShowSpectralExplorer] = useState<boolean>(false);

  // Multi-epoch Timeline & Observation Baseline Selection (Phase 2)
  const [epochAIdx, setEpochAIdx] = useState<number>(0);
  const [epochBIdx, setEpochBIdx] = useState<number>(1);
  const [mathMode, setMathMode] = useState<ImageMathMode>('subtraction');
  const [timeseriesFrames, setTimeseriesFrames] = useState<any[]>([]);
  const [detectorStacks, setDetectorStacks] = useState<any[]>([]);
  const [extractedSpectrum, setExtractedSpectrum] = useState<any[] | null>(null);

  // Global listener for contextual ScienceTerm dictionary triggers
  useEffect(() => {
    const handleOpenDictionaryEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ termId?: string }>;
      if (customEvt.detail?.termId) {
        setDictionaryTermId(customEvt.detail.termId);
      }
      setShowDictionary(true);
    };

    window.addEventListener('open-spex-dictionary', handleOpenDictionaryEvent);
    return () => {
      window.removeEventListener('open-spex-dictionary', handleOpenDictionaryEvent);
    };
  }, []);

  const handlePlayerDataLoaded = useCallback((tsData: TimeSeriesResponse) => {
    setLatestTimeSeriesMeta(tsData);
    if (tsData?.frames && Array.isArray(tsData.frames) && tsData.frames.length > 0) {
      setTimeseriesFrames(tsData.frames);
      setEpochAIdx(0);
      setEpochBIdx(Math.min(1, tsData.frames.length - 1));
    }
    if (tsData?.detectorStacks && typeof tsData.detectorStacks === 'object') {
      setDetectorStacks(tsData.detectorStacks as any);
    }
    if (tsData?.spectrumAtCenter && Array.isArray(tsData.spectrumAtCenter)) {
      setExtractedSpectrum(tsData.spectrumAtCenter);
    }
  }, []);

  // Only fetch timeseries from ExploreView when Curtain mode is active and FramePlayer hasn't already loaded it
  useEffect(() => {
    if (viewMode !== 'curtain' || !currentResult?.targetCoords) return;
    const reqRa = currentResult.targetCoordsCatalog?.ra ?? currentResult.targetCoords.ra;
    const reqDec = currentResult.targetCoordsCatalog?.dec ?? currentResult.targetCoords.dec;
    const caseId = currentResult.provenance?.caseId || '';
    const sizePix = activeSizePix || currentResult.epoch1?.width || 64;

    fetch(`/api/spherex/timeseries?ra=${reqRa}&dec=${reqDec}&sizePix=${sizePix}&caseId=${encodeURIComponent(caseId)}`)
      .then((r) => (r.ok && r.headers.get('content-type')?.includes('application/json') ? r.json() : null))
      .then((data) => {
        if (data) handlePlayerDataLoaded(data);
      })
      .catch((err) => {
        console.warn('Timeseries fetch notice:', err);
      });
  }, [
    viewMode,
    currentResult?.targetCoords?.ra,
    currentResult?.targetCoords?.dec,
    currentResult?.targetCoordsCatalog?.ra,
    currentResult?.targetCoordsCatalog?.dec,
    currentResult?.provenance?.caseId,
    activeSizePix,
    handlePlayerDataLoaded,
  ]);

  // Auto-play interval for Time sequence blinker
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % 3);
    }, 900);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Observations references
  const obs1 = currentResult?.epoch1;
  const obs2 = currentResult?.epoch2;
  const diffObs = currentResult?.difference;

  // Build authentic chronological timeline observations
  const timelineObservations: ObservationItem[] = useMemo(() => {
    if (timeseriesFrames && timeseriesFrames.length > 0) {
      return timeseriesFrames.map((f, idx) => ({
        index: idx,
        obsId: f.obsId || `SPX-EXP-${idx + 1}`,
        date: f.date || '2025-04-28T13:00:15.755Z',
        dateEnd: f.dateEnd,
        mjd: f.mjd || 60793.54,
        band: f.band || 'Band 1 (0.75 - 1.11 µm)',
        detector: f.detector || 'D1',
        wavelengthUm: f.wavelengthUm || 0.93,
        durationSec: f.durationSec,
        qualityStatus: 'CLEAN',
        flux: f.flux,
        reprojectedFlux: f.reprojectedFlux,
        flags: f.flags,
        variance: f.variance,
        width: f.width,
        height: f.height,
      }));
    }
    if (obs1 && obs2) {
      return [
        {
          index: 0,
          obsId: obs1.metadata?.obs_id || '2025W18_1B_0001_1',
          date: obs1.metadata?.date_obs || '2025-04-28T13:00:15.755Z',
          dateEnd: obs1.metadata?.date_end,
          mjd: obs1.metadata?.t_min ?? 60793.5418,
          band: obs1.metadata?.band ? `Band ${obs1.metadata.band}` : 'Band 1 (0.75 - 1.11 µm)',
          detector: obs1.metadata?.detector ? `D${obs1.metadata.detector}` : 'D1',
          wavelengthUm: obs1.metadata?.wavelength_um ?? 0.93,
          durationSec: obs1.metadata?.integration_duration_sec ?? 115.1,
          qualityStatus: 'CLEAN',
          flux: obs1.flux,
          flags: obs1.flags,
          variance: obs1.variance,
          width: obs1.width,
          height: obs1.height,
        },
        {
          index: 1,
          obsId: obs2.metadata?.obs_id || '2025W18_1B_0001_2',
          date: obs2.metadata?.date_obs || '2025-04-28T13:02:24.686Z',
          dateEnd: obs2.metadata?.date_end,
          mjd: obs2.metadata?.t_min ?? 60793.5433,
          band: obs2.metadata?.band ? `Band ${obs2.metadata.band}` : 'Band 1 (0.75 - 1.11 µm)',
          detector: obs2.metadata?.detector ? `D${obs2.metadata.detector}` : 'D1',
          wavelengthUm: obs2.metadata?.wavelength_um ?? 0.93,
          durationSec: obs2.metadata?.integration_duration_sec ?? 115.1,
          qualityStatus: 'CLEAN',
          flux: obs2.flux,
          flags: obs2.flags,
          variance: obs2.variance,
          width: obs2.width,
          height: obs2.height,
        },
      ];
    }
    return [];
  }, [timeseriesFrames, obs1, obs2]);

  // Determine current active pixel array to render (with math modes)
  const currentPixelData = useMemo(() => {
    if (!currentResult) return null;
    const itemA = timelineObservations[epochAIdx];
    const itemB = timelineObservations[epochBIdx];

    if (currentFrameIdx === 0) {
      return itemA?.reprojectedFlux || itemA?.flux || obs1?.flux || null;
    }
    if (currentFrameIdx === 1) {
      return itemB?.reprojectedFlux || itemB?.flux || obs2?.flux || null;
    }
    if (currentFrameIdx === 2) {
      const fA = itemA?.reprojectedFlux || itemA?.flux || obs1?.flux;
      const fB = itemB?.reprojectedFlux || itemB?.flux || obs2?.flux;
      if (fA && fB && fA.length === fB.length) {
        if (mathMode === 'addition') {
          const sum = new Float32Array(fA.length);
          for (let i = 0; i < fA.length; i++) {
            sum[i] = (fA[i] + fB[i]) * 0.5;
          }
          return Array.from(sum);
        }
        // Default: subtraction difference
        const diff = new Float32Array(fA.length);
        for (let i = 0; i < fA.length; i++) {
          diff[i] = fB[i] - fA[i];
        }
        return Array.from(diff);
      }
      return diffObs?.diff || null;
    }
    return obs1?.flux || null;
  }, [currentResult, currentFrameIdx, timelineObservations, epochAIdx, epochBIdx, mathMode, obs1, obs2, diffObs]);

  const isCurrentDifference = currentFrameIdx === 2;

  // Canonical Colormap Resolution
  const effectiveColormap: ColormapMode = useMemo(() => {
    if (customColormap) return customColormap;
    if (isCurrentDifference) {
      return mathMode === 'addition' ? 'infrared_warm' : 'diff_diverging';
    }
    if (activeLens === 'colors') {
      return activeBandIdx === 0 ? 'infrared_warm' : activeBandIdx === 1 ? 'inferno' : 'viridis';
    }
    if (activeLens === 'doubt') return 'grayscale';
    return 'infrared_warm';
  }, [customColormap, isCurrentDifference, mathMode, activeLens, activeBandIdx]);

  // Target Display Name
  const targetDisplayName = useMemo(() => {
    if (selectedTarget) return selectedTarget.name;
    if (currentResult?.title) return currentResult.title;
    return cases[0]?.title || "Barnard's Star (GJ 699)";
  }, [selectedTarget, currentResult, cases]);

  // Available SPHEREx Infrared Bands for Lens 2
  const availableBands = useMemo(() => {
    return [
      { id: 1, name: 'Band 1', range: '0.75 – 1.11 µm', wavelength: 0.93 },
      { id: 2, name: 'Band 2', range: '1.11 – 1.65 µm', wavelength: 1.48 },
      { id: 4, name: 'Band 4', range: '2.40 – 3.84 µm', wavelength: 2.76 },
    ];
  }, []);

  const currentSizePix = activeSizePix || obs1?.width || 64;
  const activePresetId = pendingTarget?.caseId ?? activeCaseId ?? currentResult?.provenance?.caseId ?? 'case-wise-0855';
  const activePresetCoords = BENCHMARK_PRESETS.find((p) => p.caseId === activePresetId);
  const queryRa =
    pendingTarget?.ra ??
    (activeCaseId && activeCaseId !== currentResult?.provenance?.caseId ? activePresetCoords?.ra : undefined) ??
    currentResult?.targetCoordsCatalog?.ra ??
    currentResult?.targetCoords?.ra ??
    selectedTarget?.ra ??
    activePresetCoords?.ra ??
    133.795132;
  const queryDec =
    pendingTarget?.dec ??
    (activeCaseId && activeCaseId !== currentResult?.provenance?.caseId ? activePresetCoords?.dec : undefined) ??
    currentResult?.targetCoordsCatalog?.dec ??
    currentResult?.targetCoords?.dec ??
    selectedTarget?.dec ??
    activePresetCoords?.dec ??
    -7.245146;

  const handleFlyFromExplore = useCallback(
    (selection: FlyTargetSelection) => {
      setGuidedDemoStep(null);
      setShowFlySearchSheet(false);
      setPendingTarget({
        ra: selection.ra,
        dec: selection.dec,
        caseId: selection.caseId,
      });
      if (onFlySelection) {
        onFlySelection(selection);
      } else if (selection.caseId) {
        onSelectCase(selection.caseId, { sizePix: selection.sizePix || currentSizePix });
      } else {
        onSearchTarget(selection.ra, selection.dec, selection.sizePix || currentSizePix);
      }
    },
    [onFlySelection, onSelectCase, onSearchTarget, currentSizePix]
  );

  const handleStartGuidedDemo = () => {
    setViewMode('flipbook');
    setGuidedDemoStep(0);
    if (activePresetId !== 'case-wise-0855') {
      const wise = BENCHMARK_PRESETS[0];
      setPendingTarget({ ra: wise.ra, dec: wise.dec, caseId: wise.caseId });
      onSelectCase('case-wise-0855', { sizePix: 64 });
    }
  };

  const handleSelectFovSize = (sizePix: number) => {
    const matchedPreset = BENCHMARK_PRESETS.find((p) => p.caseId === activePresetId);
    if (matchedPreset) {
      onSelectCase(matchedPreset.caseId, { sizePix });
    } else if (currentResult?.targetCoords) {
      onSearchTarget(queryRa, queryDec, sizePix);
    }
  };

  const effectivePostcardResult = useMemo<InvestigationResult | null>(() => {
    if (currentResult) return currentResult;
    if (!latestTimeSeriesMeta || !latestTimeSeriesMeta.frames?.length) return null;
    const f0 = latestTimeSeriesMeta.frames[0];
    const fLast = latestTimeSeriesMeta.frames[latestTimeSeriesMeta.frames.length - 1] || f0;
    const w = f0.width || latestTimeSeriesMeta.sizePix || 64;
    const h = f0.height || latestTimeSeriesMeta.sizePix || 64;
    const baseStats = { min: 0, max: 1, mean: 0.1, median: 0.05, std: 0.1, robustNoise: 0.05 };
    const defaultWcs = latestTimeSeriesMeta.referenceWcs || f0.wcs || {
      crval1: latestTimeSeriesMeta.targetCoords.ra,
      crval2: latestTimeSeriesMeta.targetCoords.dec,
      crpix1: w / 2,
      crpix2: h / 2,
      cdelt1: -6.2 / 3600,
      cdelt2: 6.2 / 3600,
      cd1_1: -6.2 / 3600,
      cd1_2: 0,
      cd2_1: 0,
      cd2_2: 6.2 / 3600,
      ctype1: 'RA---TAN',
      ctype2: 'DEC--TAN',
      equinox: 2000,
      radesys: 'ICRS',
      pixelScaleArcsec: 6.2,
    };
    return {
      caseId: activePresetId,
      sourceMode: latestTimeSeriesMeta.sourceMode,
      title: targetDisplayName,
      description:
        latestTimeSeriesMeta.astrometrySummary?.motionVerdict ||
        'Multi-epoch SPHEREx infrared time-series inspection.',
      targetCoords: latestTimeSeriesMeta.targetCoords,
      fovArcmin: latestTimeSeriesMeta.fovArcmin || 6.6,
      sizePix: w,
      epoch1: {
        metadata: {
          obs_id: f0.obsId,
          s_ra: latestTimeSeriesMeta.targetCoords.ra,
          s_dec: latestTimeSeriesMeta.targetCoords.dec,
          t_min: f0.mjd,
          t_max: f0.mjd,
          date_obs: f0.dateObs,
          wavelength_um: f0.wavelengthUm,
          em_min: (f0.wavelengthUm || 1) * 1e-6,
          em_max: (f0.wavelengthUm || 1) * 1e-6,
          dataproduct_type: 'image',
          access_url: '',
          fits_url: '',
          access_format: 'application/fits',
        },
        width: w,
        height: h,
        flux: f0.flux,
        bunit: 'MJy/sr',
        stats: baseStats,
        wcs: defaultWcs,
      },
      epoch2: {
        metadata: {
          obs_id: fLast.obsId,
          s_ra: latestTimeSeriesMeta.targetCoords.ra,
          s_dec: latestTimeSeriesMeta.targetCoords.dec,
          t_min: fLast.mjd,
          t_max: fLast.mjd,
          date_obs: fLast.dateObs,
          wavelength_um: fLast.wavelengthUm,
          em_min: (fLast.wavelengthUm || 1) * 1e-6,
          em_max: (fLast.wavelengthUm || 1) * 1e-6,
          dataproduct_type: 'image',
          access_url: '',
          fits_url: '',
          access_format: 'application/fits',
        },
        width: w,
        height: h,
        flux: fLast.flux,
        bunit: 'MJy/sr',
        stats: baseStats,
        wcs: defaultWcs,
      },
      difference: {
        width: w,
        height: h,
        diff: [],
        variance: [],
        significance: [],
        stats: { min: 0, max: 0, std: 0, noiseSigma: 1 },
      },
      compatibility: {
        isCompatible: true,
        timeBaselineDays: latestTimeSeriesMeta.dateRange?.spanDays ?? 0,
        wavelengthDiffUm: Math.abs((fLast.wavelengthUm || 0) - (f0.wavelengthUm || 0)),
      },
      registration: {
        dxPixels: 0,
        dyPixels: 0,
        method: 'WCS_REPROJECT',
        quality: 'PASS',
      },
      candidates: [],
      evidence: {
        maxSignificance: latestTimeSeriesMeta.astrometrySummary?.sigma ?? 0,
      } as any,
      provenance: {
        caseId: activePresetId,
        sourceMode: latestTimeSeriesMeta.sourceMode || 'saved_benchmark',
        sourceClassification: latestTimeSeriesMeta.sourceClassification,
        discoveryEligible: latestTimeSeriesMeta.discoveryEligible,
        discoveryEligibilityReason: latestTimeSeriesMeta.discoveryEligibilityReason,
        tapFreshness: latestTimeSeriesMeta.tapFreshness,
        fitsOrigin: latestTimeSeriesMeta.fitsOrigin,
        cacheIntegrityVerified: latestTimeSeriesMeta.cacheIntegrityVerified,
        snapshotTakenAt: latestTimeSeriesMeta.snapshotTakenAt,
        cachedAt: latestTimeSeriesMeta.cachedAt,
        timestamp: new Date().toISOString(),
        irsaArchiveSource: 'NASA/IPAC IRSA SPHEREx',
        obsId1: f0.obsId,
        obsId2: fLast.obsId,
        fitsUrl1: '',
        fitsUrl2: '',
        fitsChecksum1: latestTimeSeriesMeta.fitsChecksums?.[0]?.sha256 || '',
        fitsChecksum2: latestTimeSeriesMeta.fitsChecksums?.[1]?.sha256 || '',
        fitsChecksums: latestTimeSeriesMeta.fitsChecksums,
        dataRelease: latestTimeSeriesMeta.activeRelease || 'public',
        pipelineVersion: latestTimeSeriesMeta.activeVersion || '1.0',
        algorithms: {
          fitsParser: 'SPHEREx FITS',
          wcsReprojection: 'TAN-SIP',
          differenceMethod: 'WCS Diff',
          noiseEstimation: 'Variance + MAD',
          photometry: 'Aperture/PSF',
          artifactFilter: 'BITMASK',
          catalogMatcher: 'Gaia DR3 + AllWISE',
        },
      },
      observationIds: latestTimeSeriesMeta.observationIds,
      sourceClassification: latestTimeSeriesMeta.sourceClassification,
      discoveryEligible: latestTimeSeriesMeta.discoveryEligible,
      discoveryEligibilityReason: latestTimeSeriesMeta.discoveryEligibilityReason,
      tapFreshness: latestTimeSeriesMeta.tapFreshness,
      tapCachedAt: latestTimeSeriesMeta.tapCachedAt,
      fitsOrigin: latestTimeSeriesMeta.fitsOrigin,
      cacheIntegrityVerified: latestTimeSeriesMeta.cacheIntegrityVerified,
      snapshotTakenAt: latestTimeSeriesMeta.snapshotTakenAt,
      cachedAt: latestTimeSeriesMeta.cachedAt,
      isSimulated: latestTimeSeriesMeta.isDemoCopy,
    };
  }, [currentResult, latestTimeSeriesMeta, activePresetId, targetDisplayName]);

  return (
    <div
      className={`relative w-full ${isEmbed ? 'min-h-screen' : 'min-h-[calc(100vh-64px)]'} flex flex-col bg-[#02040A] text-slate-100 select-none ${
        viewMode === 'curtain' ? 'h-[calc(100vh-64px)] overflow-hidden' : ''
      } ${isRtl ? 'font-cairo' : 'font-sans'}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* ==================================================================== */}
      {/* PART 3.A: COMPACT OBSERVATORY HEADER & CONTROLS */}
      {/* ==================================================================== */}
      {!isEmbed && (
      <header className="relative z-30 shrink-0 min-h-13 bg-[#0C0E14]/95 backdrop-blur-xl border-b border-white/10 px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shadow-md">
        {!isScientistMode ? (
          <>
            {/* Simple Mode Left: Clean Target Selector */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <label className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                <span className="hidden sm:inline text-slate-400 font-mono">{t.exploreSimpleTargetLabel}:</span>
                <select
                  data-testid="explore-target-select"
                  value={activePresetId || '__custom__'}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    const preset = BENCHMARK_PRESETS.find((p) => p.caseId === nextId);
                    if (preset) {
                      gameAudio.playClick();
                      setGuidedDemoStep(null);
                      setPendingTarget({ ra: preset.ra, dec: preset.dec, caseId: preset.caseId });
                      onSelectCase(preset.caseId, { sizePix: currentSizePix });
                    }
                  }}
                  aria-label={t.exploreSimpleTargetLabel}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/15 text-slate-100 text-xs sm:text-sm font-bold cursor-pointer hover:border-sky-400/50 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  {BENCHMARK_PRESETS.map((preset) => (
                    <option key={preset.caseId} value={preset.caseId} className="bg-[#0B101D] text-slate-100">
                      {isRtl ? preset.labelAr : preset.label} — {preset.sub}
                    </option>
                  ))}
                  {!activePresetId && (
                    <option value="__custom__" className="bg-[#0B101D] text-slate-100">
                      {targetDisplayName}
                    </option>
                  )}
                </select>
              </label>
            </div>

            {/* Simple Mode Right: ONLY Persistent ? Help + Advanced Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="explore-help-btn"
                onClick={() => {
                  gameAudio.playClick();
                  setShowHelpModal(true);
                }}
                title={t.exploreHelpTitle}
                aria-label={t.exploreHelpTitle}
                className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-400/45 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 transition cursor-pointer text-xs font-bold"
              >
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>? {t.exploreHelpBtn}</span>
              </button>

              {onToggleScientistMode && (
                <button
                  type="button"
                  data-testid="mode-scientist-btn"
                  onClick={() => {
                    gameAudio.playClick();
                    onToggleScientistMode();
                  }}
                  aria-pressed={false}
                  title={t.exploreAdvancedToggle}
                  className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] text-slate-100 transition cursor-pointer text-xs font-semibold"
                >
                  <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{t.exploreAdvancedToggle}</span>
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Advanced / Scientist Header */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {onBackToSky && (
                <button
                  type="button"
                  onClick={onBackToSky}
                  className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer text-xs font-mono"
                  title={isRtl ? 'العودة إلى القبة السماوية' : 'Return to Sky Sphere'}
                >
                  <ArrowLeft className={`w-3.5 h-3.5 transition-transform ${isRtl ? 'rotate-180 group-hover:translate-x-0.5' : 'group-hover:-translate-x-0.5'}`} />
                  <span className="hidden sm:inline font-medium">{isRtl ? 'القبة' : 'Sky'}</span>
                </button>
              )}

              <div className="flex items-baseline gap-2 min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-slate-100 truncate tracking-tight">
                  {targetDisplayName}
                </h1>
                {currentResult?.targetCoords && (
                  <span className="hidden md:inline font-mono text-[11px] text-slate-400">
                    ({queryRa.toFixed(4)}°, {queryDec >= 0 ? '+' : ''}{queryDec.toFixed(4)}°)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 max-w-full flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setDictionaryTermId(null);
                  setShowDictionary(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition cursor-pointer text-xs font-mono font-semibold shadow-xs"
                title={isRtl ? 'قاموس سبيكس الفلكي' : 'SPEX Space Dictionary'}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">{isRtl ? 'القاموس الفلكي' : 'Space Dictionary'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTour(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#00D3F3]/40 bg-[#00D3F3]/10 hover:bg-[#00D3F3]/20 text-[#00D3F3] transition cursor-pointer text-xs font-mono font-semibold"
                title={isRtl ? 'بدء جولة سبيكس التوضيحية' : 'Start SPEX Tour'}
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isRtl ? 'الجولة' : 'Tour'}</span>
              </button>

              {(() => {
                const activePayload: any =
                  viewMode === 'flipbook' && latestTimeSeriesMeta
                    ? latestTimeSeriesMeta
                    : currentResult || latestTimeSeriesMeta;
                const activeClass = normalizeSourceClassification(activePayload?.sourceClassification, {
                  sourceMode: activePayload?.sourceMode,
                  isSnapshot: Boolean(activePayload?.isSnapshot),
                  isDemoCopy: Boolean(activePayload?.isDemoCopy),
                  tapFreshness: activePayload?.tapFreshness,
                  cacheIntegrityVerified: activePayload?.cacheIntegrityVerified,
                  someCached: Boolean(activePayload?.cachedFrameCount && activePayload.cachedFrameCount > 0),
                  status: activePayload?.status,
                  state: activePayload?.state,
                  availabilityStatus: activePayload?.availabilityStatus,
                });
                const meta = getSourceClassificationMeta(activeClass, language);
                const pillStyle =
                  meta.tone === 'emerald'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : meta.tone === 'cyan'
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    : meta.tone === 'amber'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : meta.tone === 'indigo'
                    ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                    : meta.tone === 'orange'
                    ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300';
                return (
                  <div
                    data-testid="header-source-classification"
                    title={meta.description}
                    className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-[11px] ${pillStyle}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span className="font-semibold">{meta.shortTag}</span>
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={() => setShowExplorerLog(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition cursor-pointer text-xs font-mono font-semibold shadow-xs"
                title={isRtl ? 'سجل مستكشف الفضاء' : "Space Explorer's Log"}
              >
                <Award className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden xl:inline">{isRtl ? 'سجل المستكشف' : "Explorer's Log"}</span>
              </button>

              <button
                type="button"
                data-testid="explore-help-btn"
                onClick={() => {
                  gameAudio.playClick();
                  setShowHelpModal(true);
                }}
                title={t.exploreHelpTitle}
                aria-label={t.exploreHelpTitle}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-amber-400/45 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 transition cursor-pointer text-xs font-bold"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>?</span>
              </button>

              {onToggleScientistMode && (
                <div data-tour="scientist_toggle" className="flex items-center p-0.5 rounded-xl bg-black/60 border border-white/15">
                  <button
                    type="button"
                    data-testid="mode-explorer-btn"
                    onClick={() => isScientistMode && onToggleScientistMode()}
                    aria-pressed={!isScientistMode}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer select-none ${
                      !isScientistMode
                        ? 'bg-[#FFB900] text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.exploreSimpleToggle}
                  </button>
                  <button
                    type="button"
                    data-testid="mode-scientist-btn"
                    onClick={() => !isScientistMode && onToggleScientistMode()}
                    aria-pressed={isScientistMode}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer select-none ${
                      isScientistMode
                        ? 'bg-[#00D3F3] text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.exploreAdvancedToggle}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowCompanion((prev) => !prev)}
                aria-expanded={showCompanion}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border transition cursor-pointer text-xs font-mono font-semibold ${
                  showCompanion
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                    : 'border-white/15 bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
                title={isRtl ? 'إظهار/إخفاء مساعد سبيكس' : 'Show/Collapse SPEX Companion'}
              >
                <SpexPortrait mood="greeting" size={18} />
                <span className="hidden lg:inline">SPEX</span>
              </button>

              <button
                type="button"
                data-tour="postcard_button"
                onClick={() => setShowPostcard(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#FFB900]/40 bg-[#FFB900]/10 hover:bg-[#FFB900]/20 text-[#FFB900] transition cursor-pointer text-xs font-mono font-semibold shadow-xs"
                title={isRtl ? 'مشاركة بطاقة الاكتشاف' : 'Discovery Postcard'}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isRtl ? 'بطاقة الاكتشاف' : 'Postcard'}</span>
              </button>
            </div>
          </>
        )}
      </header>
      )}

      {/* ==================================================================== */}
      {/* EXPLORER: ZERO TOOLBAR (Optional On-Demand Fly Drawer Only)          */}
      {/* SCIENTIST: BENCHMARK BAR + UNIFIED FLY-ME-TO SEARCH                  */}
      {/* ==================================================================== */}
      {!isScientistMode ? (
        showFlySearchSheet ? (
          <div className="relative z-25 bg-[#070B14]/95 border-b border-sky-400/25 px-3 sm:px-5 py-3 animate-slide-up">
            <div className="max-w-2xl mx-auto flex items-start gap-2">
              <FlyToSearch
                language={language}
                onFlyToTarget={handleFlyFromExplore}
                compact
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => setShowFlySearchSheet(false)}
                aria-label={t.searchModalClose}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null
      ) : (
      <div
        data-tour="explore_targets"
        className="relative z-20 shrink-0 bg-[#070A12] border-b border-white/10 px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5"
      >
        {/* 5 Official Benchmark Target Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 me-1">
            {isRtl ? 'الأهداف المرجعية:' : 'Targets:'}
          </span>
          {BENCHMARK_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.caseId;
            return (
              <button
                key={preset.caseId}
                type="button"
                onClick={() => {
                  gameAudio.playClick();
                  setGuidedDemoStep(null);
                  setPendingTarget({ ra: preset.ra, dec: preset.dec, caseId: preset.caseId });
                  onSelectCase(preset.caseId, { sizePix: currentSizePix });
                }}
                className={`min-h-[36px] px-2.5 py-1 rounded-xl border text-start transition cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-xs'
                    : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <span className="text-xs font-semibold">{preset.label}</span>
                <span className="hidden xl:inline text-[10px] font-mono text-slate-400">{preset.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Right Controls: Unified Fly-To Search, FOV Selector, Mode Tabs, 60s Guided Demo */}
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <FlyToSearch
            language={language}
            onFlyToTarget={handleFlyFromExplore}
            compact
            className="w-full sm:w-[460px] lg:w-[490px]"
          />

          {/* FOV Selector */}
          <div
            role="group"
            aria-label="Field of View selector"
            className="flex items-center gap-0.5 p-0.5 rounded-xl bg-black/60 border border-white/15 text-[11px] font-mono"
          >
            <span className="px-1.5 text-slate-400 hidden sm:inline">FOV</span>
            {FOV_PRESETS.map((fov) => (
              <button
                key={fov.sizePix}
                type="button"
                onClick={() => handleSelectFovSize(fov.sizePix)}
                aria-pressed={currentSizePix === fov.sizePix}
                className={`min-h-[32px] px-2 py-1 rounded-lg transition cursor-pointer tabular-nums ${
                  currentSizePix === fov.sizePix
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {fov.label}
              </button>
            ))}
          </div>

          {/* View Mode: Flipbook vs Curtain Lab */}
          <div className="flex items-center p-0.5 rounded-xl bg-black/60 border border-white/15 text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewMode('flipbook')}
              className={`min-h-[32px] flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'flipbook'
                  ? 'bg-sky-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-3 h-3" />
              <span>Flipbook</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('curtain')}
              className={`min-h-[32px] flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'curtain'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Curtain Lab</span>
            </button>
          </div>

          {/* 60-Second Guided Demo Button */}
          <button
            type="button"
            onClick={handleStartGuidedDemo}
            className="min-h-[36px] flex items-center gap-1 px-2.5 py-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-mono font-bold transition cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>60s Demo</span>
          </button>
        </div>
      </div>
      )}

      {/* Interactive 60s Guided Demo Stepper Banner */}
      {guidedDemoStep !== null && (
        <div className="px-3 sm:px-5 py-2.5 bg-emerald-950/60 border-b border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-start sm:items-center gap-2.5 max-w-3xl">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-mono font-bold shrink-0">
              {guidedDemoStep + 1}/{GUIDED_DEMO_STEPS.length}
            </span>
            <div>
              <span className="font-bold text-emerald-300 mr-2">
                {GUIDED_DEMO_STEPS[guidedDemoStep].title}:
              </span>
              <span className="text-slate-200">{GUIDED_DEMO_STEPS[guidedDemoStep].caption}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-mono shrink-0">
            <button
              type="button"
              onClick={() => setGuidedDemoStep((s) => (s !== null ? Math.max(0, s - 1) : 0))}
              disabled={guidedDemoStep === 0}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-slate-200 cursor-pointer"
            >
              Prev
            </button>
            {guidedDemoStep < GUIDED_DEMO_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setGuidedDemoStep((s) => (s !== null ? s + 1 : 0))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSpectralExplorer(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold cursor-pointer"
              >
                <span>Open 102-Band SED</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setGuidedDemoStep(null)}
              className="px-2 py-1 rounded-lg text-slate-400 hover:text-white underline cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PART 3.B: PRIMARY WORKSPACE (FLIPBOOK + ALADIN OR CURTAIN LAB) */}
      {/* ==================================================================== */}
      <div className={`relative flex-1 w-full flex flex-col lg:flex-row ${viewMode === 'curtain' ? 'min-h-0 overflow-hidden' : ''}`}>
        {viewMode === 'flipbook' ? (
          <main
            className={`flex-1 w-full ${
              isScientistMode ? 'max-w-[1600px] xl:grid-cols-12 p-3 sm:p-4' : 'max-w-none p-0'
            } mx-auto grid grid-cols-1 gap-4 items-start`}
          >
            {/* Primary Time-Series Flipbook Player */}
            <div className={isScientistMode ? 'xl:col-span-8 min-w-0' : 'w-full min-w-0'}>
              <FramePlayer
                ra={queryRa}
                dec={queryDec}
                caseId={activePresetId || undefined}
                sizePix={currentSizePix}
                initialDetector={initialDetector}
                language={language}
                explorerMode={!isScientistMode}
                isEmbed={isEmbed}
                targetLabel={targetDisplayName}
                spexHighlights={spexHighlights}
                onExplainContextChange={setSpexExplainContext}
                onSpotSelect={(spot, ctx) => {
                  markTargetAction(activePresetId, 'spotOrSpex');
                  setSpexSpotSelection(spot);
                  setSpexExplainContext(ctx);
                  setSpexHighlights([]);
                  setSpexGuideOpen(true);
                  setSpexAutoAskToken((n) => n + 1);
                }}
                onAskSpex={() => {
                  markTargetAction(activePresetId, 'spotOrSpex');
                  setSpexHighlights([]);
                  setSpexGuideOpen(true);
                  setSpexAutoAskToken((n) => n + 1);
                }}
                onExplorerPlay={() => {
                  markTargetAction(activePresetId, 'played');
                }}
                onExplorerToggleDiff={(diffActive) => {
                  if (diffActive) {
                    markTargetAction(activePresetId, 'diffShown');
                    gameAudio.playSuccess();
                  }
                }}
                onCanvasReady={setCanvasInstance}
                onOpenDictionary={(termId) => {
                  setDictionaryTermId(termId || null);
                  setShowDictionary(true);
                }}
                onSwitchToScientist={() => {
                  if (!isScientistMode && onToggleScientistMode) {
                    onToggleScientistMode();
                  }
                }}
                onDetectorChange={onDetectorChange}
                onSelectFovSize={handleSelectFovSize}
                onDataLoaded={handlePlayerDataLoaded}
                onOpenSpectrum={() => setShowSpectralExplorer(true)}
                onOpenPostcard={() => setShowPostcard(true)}
                onOpenProvenance={currentResult?.provenance ? () => setShowProvenance(true) : undefined}
                onOpenDetectorStacking={() => setShowDetectorStacking(true)}
                autoPlay={autoPlay}
                onAutoPlayConsumed={onAutoPlayConsumed}
                guidedStepAction={guidedDemoStep !== null ? GUIDED_DEMO_STEPS[guidedDemoStep].action : null}
              />

              {isScientistMode && !isEmbed && (
                <div className="max-w-[1180px] mx-auto px-3 sm:px-5 pb-6 mt-4">
                  <ExplorerMissions
                    language={language}
                    activeCaseId={activePresetId}
                    progressByCase={missionProgressByCase}
                    onSelectTargetCase={(caseId) => {
                      const preset = BENCHMARK_PRESETS.find((p) => p.caseId === caseId);
                      if (preset) {
                        setGuidedDemoStep(null);
                        setPendingTarget({ ra: preset.ra, dec: preset.dec, caseId: preset.caseId });
                        onSelectCase(preset.caseId, { sizePix: currentSizePix });
                      }
                    }}
                    onOpenPostcard={() => setShowPostcard(true)}
                    canOpenPostcard={Boolean(effectivePostcardResult)}
                    onOpenExplorerLog={() => setShowExplorerLog(true)}
                  />
                </div>
              )}
            </div>

            {/* Secondary Sky Context & Why This Matters Column (Scientist Mode only) */}
            {isScientistMode && (
            <div className="xl:col-span-4 flex flex-col gap-4 min-w-0">
              {/* Reserved Collapsible Slot: Aladin Sky Context */}
              <div className="obs-glass rounded-2xl border border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAladinSlotOpen((v) => !v)}
                  aria-expanded={aladinSlotOpen}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-mono font-bold text-slate-200 hover:bg-white/5 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-[#00D3F3]" />
                    <span>{t.slotAladin}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${aladinSlotOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {aladinSlotOpen && (
                  <div className="border-t border-white/10">
                    {Number.isFinite(queryRa) && Number.isFinite(queryDec) ? (
                      <AladinLitePanel
                        ra={queryRa}
                        dec={queryDec}
                        fovArcmin={latestTimeSeriesMeta?.fovArcmin || currentResult?.fovArcmin || 6.6}
                        targetName={targetDisplayName}
                        className="border-0 rounded-none"
                      />
                    ) : (
                      <div className="p-4 text-xs font-mono text-slate-400">{t.emptyAladin}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Compact "Why This Matters" Citizen-Science & Resolution Context */}
              <div className="obs-glass rounded-2xl p-4 border border-white/10 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-mono font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Why This Matters · SPHEREx Astrometry</span>
                  </div>
                  {currentResult?.provenance && (
                    <button
                      type="button"
                      onClick={() => setShowProvenance(true)}
                      className="text-[11px] font-mono text-cyan-400 hover:underline cursor-pointer"
                    >
                      Provenance
                    </button>
                  )}
                </div>
                <p className="text-slate-300 leading-relaxed">
                  SPHEREx captures the entire infrared sky every 6 months at <span className="font-mono text-cyan-300">6.2″/pixel</span> across 102 spectral channels (0.75–5.0 µm). Extreme solar-neighborhood brown dwarfs like <span className="text-amber-300 font-semibold">WISE 0855</span> (~8.1″/yr) or <span className="text-amber-300 font-semibold">Barnard&apos;s Star</span> (~10.4″/yr) shift only <span className="font-mono">~1.3–1.7 px/yr</span>—sub-pixel between single passes.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Our subpixel centroid tracker, Epoch-1 amber crosshair, blinking comparison, and difference mode reveal proper motion, YSO outbursts (RW Aur), and Mira pulsations (R Dra) directly from live NASA IRSA Level-2B FITS cutouts—bridging citizen science (Backyard Worlds) with spectro-photometric discovery.
                </p>
                <div className="pt-1 flex flex-wrap gap-2 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShowDetectorStacking(true)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 cursor-pointer"
                  >
                    Detector Co-add Stacks
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSpectralExplorer(true)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 cursor-pointer"
                  >
                    102-Band SED
                  </button>
                </div>
              </div>
            </div>
            )}
          </main>
        ) : (
          /* Curtain & 4-Lens Inspection Lab (preserved 100%) */
          <main className="relative flex-1 h-full min-h-0 w-full overflow-hidden flex flex-col bg-black">
            <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden">
              <AstronomicalSkyViewport
                data={currentPixelData}
                width={obs1?.width || 64}
                height={obs1?.height || 64}
                isDifference={isCurrentDifference}
                stretch={stretch}
                colormap={effectiveColormap}
                displayMode={displayMode}
                rawPixels={isScientistMode && showRawPixels}
                contrastFactor={contrastFactor}
                zoom={zoom}
                pan={pan}
                onZoomChange={setZoom}
                onPanChange={setPan}
                onCanvasReady={setCanvasInstance}
                wcs={obs1?.wcs}
                activeLens={activeLens}
                isCurtainActive={isCurtainActive}
                epoch1Data={obs1?.flux}
                epoch2Data={obs2?.flux}
                epoch1Label={isRtl ? 'الرصدة 1 (قبل)' : 'Visit 1 (Before)'}
                epoch2Label={isRtl ? 'الرصدة 2 (بعد)' : 'Visit 2 (After)'}
                dqFlags={obs1?.flags || obs2?.flags}
                selectedFlagPixel={selectedFlagPixel}
                onSelectFlagPixel={setSelectedFlagPixel}
                candidates={currentResult?.candidates}
                selectedCandidate={selectedCandidate}
                onSelectCandidate={setSelectedCandidate}
                tappedSpot={tappedSpot}
                onTapSpot={setTappedSpot}
                language={language}
                isLoading={isLoading}
                targetName={targetDisplayName}
                fovArcmin={currentResult?.fovArcmin || 6.6}
                sourceClassification={currentResult?.sourceClassification}
                availabilityStatus={currentResult?.availabilityStatus}
                targetCoords={currentResult?.targetCoords}
                onSelectBenchmark={(caseId) => onSelectCase(caseId)}
                className="w-full h-full"
              />

              {/* FLOATING 4-LENS DOCK & CONTEXTUAL DRAWER */}
              <div className="absolute bottom-3 sm:bottom-4 inset-x-0 mx-auto z-20 pointer-events-none max-w-3xl px-2 sm:px-4">
                <FourLensesDock
                  activeLens={activeLens}
                  onSelectLens={setActiveLens}
                  currentFrameIdx={currentFrameIdx}
                  totalFrames={3}
                  onSelectFrameIdx={setCurrentFrameIdx}
                  isPlaying={isPlaying}
                  onTogglePlay={() => setIsPlaying(!isPlaying)}
                  isCurtainActive={isCurtainActive}
                  onToggleCurtain={() => setIsCurtainActive(!isCurtainActive)}
                  epoch1Date={obs1?.metadata?.date_obs}
                  epoch2Date={obs2?.metadata?.date_obs}
                  cadenceSeconds={currentResult?.compatibility?.startToStartCadenceSec ?? 128.9}
                  observations={timelineObservations}
                  epochAIdx={epochAIdx}
                  epochBIdx={epochBIdx}
                  onSelectEpochA={(idx) => {
                    setEpochAIdx(idx);
                    setCurrentFrameIdx(0);
                  }}
                  onSelectEpochB={(idx) => {
                    setEpochBIdx(idx);
                    setCurrentFrameIdx(1);
                  }}
                  mathMode={mathMode}
                  onChangeMathMode={setMathMode}
                  targetName={targetDisplayName}
                  activeBandIdx={activeBandIdx}
                  onSelectBandIdx={setActiveBandIdx}
                  availableBands={availableBands}
                  onOpenSpectrumModal={() => setShowSpectralExplorer(true)}
                  onOpenDetectorStackModal={() => setShowDetectorStacking(true)}
                  isDoubtOverlayActive={isDoubtOverlayActive}
                  onToggleDoubtOverlay={() => setIsDoubtOverlayActive(!isDoubtOverlayActive)}
                  selectedFlagPixel={selectedFlagPixel}
                  onClearFlagPixel={() => setSelectedFlagPixel(null)}
                  isNeighborsOverlayActive={isNeighborsOverlayActive}
                  onToggleNeighborsOverlay={() => setIsNeighborsOverlayActive(!isNeighborsOverlayActive)}
                  selectedCandidate={selectedCandidate}
                  language={language}
                  className="pointer-events-auto"
                />
              </div>
            </div>
          </main>
        )}

        {/* ================================================================== */}
        {/* PART 6: STRUCTURED SCIENTIST INVESTIGATION WORKSPACE PANEL */}
        {/* ================================================================== */}
        {isScientistMode && currentResult && (
          <aside className="relative z-20 w-full lg:w-[420px] xl:w-[460px] shrink-0 h-full p-2 sm:p-3 overflow-hidden animate-slide-left border-s border-white/10 bg-[#0C0E14]/95 backdrop-blur-xl">
            <ScientistInvestigationPanel
              currentResult={currentResult}
              language={language}
              stretch={stretch}
              colormap={effectiveColormap}
              displayMode={displayMode}
              rawPixels={showRawPixels}
              contrastFactor={contrastFactor}
              onStretchChange={setStretch}
              onColormapChange={setCustomColormap}
              onDisplayModeChange={(mode) => {
                setDisplayMode(mode);
                setShowRawPixels(mode === 'science');
              }}
              onRawPixelsChange={setShowRawPixels}
              onContrastFactorChange={setContrastFactor}
              selectedCandidate={selectedCandidate}
              onSelectCandidate={setSelectedCandidate}
              onOpenProvenanceModal={() => setShowProvenance(true)}
              onOpenDataReleaseModal={() => setShowDataRelease(true)}
              className="w-full h-full"
            />
          </aside>
        )}
      </div>

      {/* ==================================================================== */}
      {/* SPEX AI GUIDE PANEL (Grounded /api/spex/explain bottom sheet / side panel) */}
      {/* ==================================================================== */}
      <SpexGuidePanel
        isOpen={spexGuideOpen}
        onClose={() => setSpexGuideOpen(false)}
        language={language}
        context={spexExplainContext}
        selectedSpot={spexSpotSelection}
        onClearSpot={() => setSpexSpotSelection(null)}
        onHighlightsChange={setSpexHighlights}
        onOpenDictionary={(termId) => {
          setDictionaryTermId(termId || null);
          setShowDictionary(true);
        }}
        onSpexAsked={() => markTargetAction(activePresetId, 'spotOrSpex')}
        autoAskToken={spexAutoAskToken}
      />

      {/* ==================================================================== */}
      {/* SPEX INTELLIGENT COMPANION (Scientist mode on-demand assistant) */}
      {/* ==================================================================== */}
      {isScientistMode && showCompanion && (
        <SpexCompanion
          currentResult={currentResult}
          activeLens={activeLens}
          currentFrameIdx={currentFrameIdx}
          isCurtainActive={isCurtainActive}
          selectedCandidate={selectedCandidate}
          selectedFlagPixel={selectedFlagPixel}
          language={language}
          onOpenTour={() => setShowTour(true)}
          onHighlightElement={(targetId) => {
            setHighlightedTargetId(targetId);
            if (targetId === 'lens_time') setActiveLens('time');
            else if (targetId === 'lens_colors') setActiveLens('colors');
            else if (targetId === 'lens_doubt') setActiveLens('doubt');
            else if (targetId === 'lens_neighbors') setActiveLens('neighbors');
            else if (targetId === 'curtain_divider') {
              setActiveLens('time');
              setIsCurtainActive(true);
            }
          }}
          onOpenScientistMode={() => {
            if (!isScientistMode && onToggleScientistMode) {
              onToggleScientistMode();
            }
          }}
          onOpenDictionary={(termId) => {
            if (termId) setDictionaryTermId(termId);
            setShowDictionary(true);
          }}
        />
      )}

      {/* Reusable Visual Pointing Beacon */}
      <SpexUiHighlight
        highlightId={highlightedTargetId}
        onClear={() => setHighlightedTargetId(null)}
        language={language}
      />

      {/* 9-Step Guided Onboarding Tour */}
      <SpexGuidedTour
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        language={language}
        onActivateLens={(lens) => setActiveLens(lens)}
        onActivateCurtain={(active) => setIsCurtainActive(active)}
      />

      {/* DISCOVERY POSTCARD MODAL (Renders Actual Canvas Image) */}
      {effectivePostcardResult && (
        <PostcardModal
          isOpen={showPostcard}
          onClose={() => setShowPostcard(false)}
          result={effectivePostcardResult}
          candidate={selectedCandidate}
          language={language}
          sourceCanvas={canvasInstance}
        />
      )}

      {/* PROVENANCE MODAL */}
      {currentResult?.provenance && showProvenance && (
        <ProvenanceModal
          provenance={currentResult.provenance}
          onClose={() => setShowProvenance(false)}
          language={language}
        />
      )}

      {/* DATA RELEASE VALIDATION MODAL */}
      <DataReleaseModal
        isOpen={showDataRelease}
        onClose={() => setShowDataRelease(false)}
        language={language}
      />

      {/* SPEX SPACE DICTIONARY (ASTRONOMY GLOSSARY) MODAL */}
      <SpexSpaceDictionaryModal
        isOpen={showDictionary}
        onClose={() => setShowDictionary(false)}
        language={language}
        initialTermId={dictionaryTermId}
        onSelectTerm={(termId) => setDictionaryTermId(termId)}
      />

      {/* SPACE EXPLORER'S LOG & LEARNING MILESTONES MODAL */}
      <SpaceExplorerLogModal
        isOpen={showExplorerLog}
        onClose={() => setShowExplorerLog(false)}
        language={language}
        onActivateLens={(lens) => setActiveLens(lens)}
        onOpenDictionaryTerm={(termId) => {
          setDictionaryTermId(termId);
          setShowDictionary(true);
        }}
      />

      {/* BONUS A: DETECTOR ARRAY INVERSE-VARIANCE STACKING MODAL */}
      <DetectorStackingModal
        isOpen={showDetectorStacking}
        onClose={() => setShowDetectorStacking(false)}
        language={language}
        stacks={detectorStacks as any}
      />

      {/* BONUS B: 102 SPECTRAL BANDS & EXTRACTED SED MODAL */}
      {showSpectralExplorer && (
        <SpectralExplorerModal
          onClose={() => setShowSpectralExplorer(false)}
          selectedCandidate={selectedCandidate}
          extractedSpectrum={extractedSpectrum}
          targetCoords={currentResult?.targetCoords}
          language={language}
        />
      )}

      {/* EXPLORE 4-STEP HELP MODAL */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title={t.exploreHelpTitle}
        icon={<HelpCircle className="w-4 h-4 text-amber-400" />}
        isRtl={isRtl}
        maxWidthClass="max-w-md"
      >
        <div className="space-y-3 text-sm">
          {[t.exploreHelpStep1, t.exploreHelpStep2, t.exploreHelpStep3, t.exploreHelpStep4].map((step, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-slate-200 leading-relaxed"
            >
              {step}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
