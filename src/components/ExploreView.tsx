import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  HelpCircle,
  Compass,
  Layers,
} from 'lucide-react';
import { Modal } from '../design/components/Modal';
import { gameAudio } from '../game/utils/gameAudio';
import {
  CandidateDetection,
  InvestigationResult,
  ChallengeTarget,
} from '../science/types';
import { ColormapMode, DisplayMode, StretchMode } from '../utils/astronomyRender';
import { AstronomicalSkyViewport } from './Explore/AstronomicalSkyViewport';
import { FourLensesDock } from './Explore/FourLensesDock';
import { ScientistInvestigationPanel } from './Explore/ScientistInvestigationPanel';
import { SpexCompanion, ExploreStoryState } from './Explore/SpexCompanion';
import { SpexGuidePanel } from './Explore/SpexGuidePanel';
import { SpexGuidedTour } from './Explore/SpexGuidedTour';
import { SpexUiHighlight } from './Explore/SpexUiHighlight';
import { FindingsModal } from './Explore/FindingsModal';
import { SpexExplainContext, SpexHighlight, SpexSpotSelection } from '../science/spexExplain';
import {
  FramePlayer,
  PlayerRenderMode,
  PresetTargetOption,
  TimeSeriesResponse,
} from './TimeLens/FramePlayer';
import { PostcardModal } from './TimeLens/PostcardModal';
import { ProvenanceModal } from './ProvenanceModal';
import { DataReleaseModal } from './DataReleaseModal';
import { SpexSpaceDictionaryModal } from './SpexSpaceDictionaryModal';
import { DetectorStackingModal } from './Explore/DetectorStackingModal';
import { SpectralExplorerModal } from './SpectralExplorerModal';
import { ObservationItem, ImageMathMode } from './Explore/ObservationTimelineSelector';
import { LensMode } from '../design/components/LensButton';
import { Language, translations } from '../utils/translations';
import { FlyTargetSelection } from '../ui/FlyToSearch';

const BENCHMARK_PRESETS: ReadonlyArray<PresetTargetOption & { targetParam: string }> = [
  { caseId: 'case-wise-0855', targetParam: 'wise-0855', label: 'WISE 0855', labelAr: 'WISE 0855', sub: '8″/yr Y-Dwarf', ra: 133.81890825, dec: -7.247048 },
  { caseId: 'case-barnards-star', targetParam: 'barnards-star', label: "Barnard's Star", labelAr: 'نجم برنارد', sub: '10.4″/yr M4V', ra: 269.45207695, dec: 4.69336497 },
  { caseId: 'case-epsilon-indi', targetParam: 'epsilon-indi', label: 'Epsilon Indi', labelAr: 'إبسيلون إندي', sub: '4.7″/yr T1+T6', ra: 331.04414659, dec: -56.7828442 },
  { caseId: 'case-rw-aur', targetParam: 'rw-aurigae', label: 'RW Aurigae', labelAr: 'RW Aurigae', sub: 'YSO Accretion', ra: 76.95652603, dec: 30.40143817 },
  { caseId: 'case-r-dra', targetParam: 'r-draconis', label: 'R Draconis', labelAr: 'R Draconis', sub: 'Mira Giant', ra: 248.16761083, dec: 66.75497942 },
];

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
    caption: 'SPHEREx pixels are 6.2″ wide (~1.3 px/yr shift). Compare measured centroid drift with expected motion.',
    action: { play: false, blinkFirstLast: false, renderMode: 'raw', zoom: 4, showGrid: true, showMotionTrail: true },
  },
  {
    title: '4. Difference Image (Diff vs Ep 1)',
    caption: 'Subtracting Epoch 1 cancels stationary field stars and exposes subtle proper-motion dipoles and infrared variations.',
    action: { play: false, blinkFirstLast: false, renderMode: 'diff_ref', zoom: 2, showGrid: false },
  },
  {
    title: '5. Detector Bands D1–D6 & SED',
    caption: 'Switch across SPHEREx 0.75–5.0 µm detector arrays or open the 102-band Spectrum Explorer.',
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
  preferSnapshot?: boolean;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  currentResult,
  isLoading,
  onSearchTarget,
  onSelectCase,
  cases,
  language,
  onBackToSky,
  isScientistMode = false,
  selectedTarget,
  initialDetector,
  onDetectorChange,
  activeSizePix,
  activeCaseId,
  autoPlay = false,
  onAutoPlayConsumed,
  isEmbed = false,
  preferSnapshot = false,
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];

  const [viewMode, setViewMode] = useState<'flipbook' | 'curtain'>('flipbook');
  const [guidedDemoStep, setGuidedDemoStep] = useState<number | null>(null);
  const [spexGuideOpen, setSpexGuideOpen] = useState<boolean>(false);
  const [spexSpotSelection, setSpexSpotSelection] = useState<SpexSpotSelection | null>(null);
  const [spexExplainContext, setSpexExplainContext] = useState<SpexExplainContext | null>(null);
  const [spexHighlights, setSpexHighlights] = useState<SpexHighlight[]>([]);
  const [spexAutoAskToken, setSpexAutoAskToken] = useState<number>(0);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showFindingsModal, setShowFindingsModal] = useState<boolean>(false);
  const [latestTimeSeriesMeta, setLatestTimeSeriesMeta] = useState<TimeSeriesResponse | null>(null);
  const [loadedByKey, setLoadedByKey] = useState<Record<string, TimeSeriesResponse>>({});

  // Story progression checklist for Mr. SPEX guide
  const [exploreStory, setExploreStory] = useState<ExploreStoryState>({
    pickedStar: true,
    watchedBlink: false,
    spottedMover: false,
    checkedTelescopes: false,
    sharedResult: false,
  });

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

  useEffect(() => {
    setSpexHighlights([]);
    setSpexSpotSelection(null);
  }, [activeCaseId, currentResult?.targetCoords?.ra, currentResult?.targetCoords?.dec]);

  // Curtain Lab Viewport state (only used when user opens Curtain Lab from Advanced)
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isCurtainActive, setIsCurtainActive] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [stretch, setStretch] = useState<StretchMode>('asinh');
  const [customColormap, setCustomColormap] = useState<ColormapMode | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('presentation');
  const [showRawPixels, setShowRawPixels] = useState<boolean>(false);
  const [contrastFactor, setContrastFactor] = useState<number>(1.0);
  const [activeLens, setActiveLens] = useState<LensMode | null>('time');
  const [activeBandIdx, setActiveBandIdx] = useState<number>(0);
  const [isDoubtOverlayActive, setIsDoubtOverlayActive] = useState<boolean>(true);
  const [selectedFlagPixel, setSelectedFlagPixel] = useState<{ x: number; y: number; flag: number } | null>(null);
  const [isNeighborsOverlayActive, setIsNeighborsOverlayActive] = useState<boolean>(true);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetection | null>(null);
  const [tappedSpot, setTappedSpot] = useState<{ x: number; y: number; ra: number; dec: number } | null>(null);

  const [canvasInstance, setCanvasInstance] = useState<HTMLCanvasElement | null>(null);

  // Guided Tour state: auto-run once on first Explore 'hunt' visit (non-embed) after first frames arrive
  const [showTour, setShowTour] = useState<boolean>(false);
  const tourAutoCheckedRef = useRef<boolean>(false);
  const [highlightedTargetId, setHighlightedTargetId] = useState<string | null>(null);

  // Modals
  const [showPostcard, setShowPostcard] = useState<boolean>(false);
  const [showProvenance, setShowProvenance] = useState<boolean>(false);
  const [showDataRelease, setShowDataRelease] = useState<boolean>(false);
  const [showDictionary, setShowDictionary] = useState<boolean>(false);
  const [dictionaryTermId, setDictionaryTermId] = useState<string | null>(null);
  const [showDetectorStacking, setShowDetectorStacking] = useState<boolean>(false);
  const [showSpectralExplorer, setShowSpectralExplorer] = useState<boolean>(false);

  const [epochAIdx, setEpochAIdx] = useState<number>(0);
  const [epochBIdx, setEpochBIdx] = useState<number>(1);
  const [mathMode, setMathMode] = useState<ImageMathMode>('subtraction');
  const [timeseriesFrames, setTimeseriesFrames] = useState<any[]>([]);
  const [detectorStacks, setDetectorStacks] = useState<any[]>([]);
  const [extractedSpectrum, setExtractedSpectrum] = useState<any[] | null>(null);

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

  const currentSizePix = activeSizePix || currentResult?.epoch1?.width || 64;
  const activePresetId =
    pendingTarget?.caseId ??
    activeCaseId ??
    currentResult?.provenance?.caseId ??
    (pendingTarget ? undefined : 'case-wise-0855');

  const activePresetCoords = activePresetId
    ? BENCHMARK_PRESETS.find((p) => p.caseId === activePresetId)
    : undefined;

  const queryRa =
    pendingTarget?.ra ??
    (activeCaseId && activeCaseId !== currentResult?.provenance?.caseId ? activePresetCoords?.ra : undefined) ??
    currentResult?.targetCoordsCatalog?.ra ??
    currentResult?.targetCoords?.ra ??
    selectedTarget?.ra ??
    activePresetCoords?.ra ??
    133.81890825;

  const queryDec =
    pendingTarget?.dec ??
    (activeCaseId && activeCaseId !== currentResult?.provenance?.caseId ? activePresetCoords?.dec : undefined) ??
    currentResult?.targetCoordsCatalog?.dec ??
    currentResult?.targetCoords?.dec ??
    selectedTarget?.dec ??
    activePresetCoords?.dec ??
    -7.247048;

  const handlePlayerDataLoaded = useCallback(
    (tsData: TimeSeriesResponse) => {
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

      // Cache dataset for Findings Drawer (by caseId or custom coords key)
      const matchedPreset = BENCHMARK_PRESETS.find((p) => p.caseId === activePresetId);
      const key =
        matchedPreset?.caseId ||
        `custom:${tsData.targetCoords.ra.toFixed(4)},${tsData.targetCoords.dec.toFixed(4)}`;
      setLoadedByKey((prev) => ({ ...prev, [key]: tsData }));

      if (tsData.astrometrySummary?.motionSignificant) {
        setExploreStory((prev) => (prev.spottedMover ? prev : { ...prev, spottedMover: true }));
      }
    },
    [activePresetId]
  );

  // Auto-open guided tour ONCE on first Explore 'hunt' visit after initial frames load
  useEffect(() => {
    if (isEmbed || tourAutoCheckedRef.current) return;
    if (!latestTimeSeriesMeta?.frames?.length) return;
    try {
      if (localStorage.getItem('spex_tour_completed') === 'true') {
        tourAutoCheckedRef.current = true;
        return;
      }
      const timer = setTimeout(() => {
        tourAutoCheckedRef.current = true;
        setShowTour(true);
      }, 450);
      return () => clearTimeout(timer);
    } catch {
      // Ignore private browsing localStorage restrictions
    }
  }, [isEmbed, latestTimeSeriesMeta]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % 3);
    }, 900);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const obs1 = currentResult?.epoch1;
  const obs2 = currentResult?.epoch2;
  const diffObs = currentResult?.difference;

  const timelineObservations: ObservationItem[] = useMemo(() => {
    if (timeseriesFrames && timeseriesFrames.length > 0) {
      return timeseriesFrames.map((f, idx) => ({
        index: idx,
        obsId: f.obsId || `SPX-EXP-${idx + 1}`,
        date: f.dateObs || f.date || '2025-04-28T13:00:15.755Z',
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

  const currentPixelData = useMemo(() => {
    if (!currentResult) return null;
    const itemA = timelineObservations[epochAIdx];
    const itemB = timelineObservations[epochBIdx];

    if (currentFrameIdx === 0) return itemA?.reprojectedFlux || itemA?.flux || obs1?.flux || null;
    if (currentFrameIdx === 1) return itemB?.reprojectedFlux || itemB?.flux || obs2?.flux || null;
    if (currentFrameIdx === 2) {
      const fA = itemA?.reprojectedFlux || itemA?.flux || obs1?.flux;
      const fB = itemB?.reprojectedFlux || itemB?.flux || obs2?.flux;
      if (fA && fB && fA.length === fB.length) {
        if (mathMode === 'addition') {
          return fA.map((val, i) => (val + fB[i]) * 0.5);
        }
        return fB.map((val, i) => val - fA[i]);
      }
      return diffObs?.diff || null;
    }
    return obs1?.flux || null;
  }, [currentResult, currentFrameIdx, timelineObservations, epochAIdx, epochBIdx, mathMode, obs1, obs2, diffObs]);

  const isCurrentDifference = currentFrameIdx === 2;

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

  const targetDisplayName = useMemo(() => {
    if (selectedTarget) return selectedTarget.name;
    if (activePresetCoords) return isRtl ? activePresetCoords.labelAr : activePresetCoords.label;
    if (currentResult?.title) return currentResult.title;
    if (pendingTarget) return `${pendingTarget.ra.toFixed(2)}°, ${pendingTarget.dec.toFixed(2)}°`;
    return cases[0]?.title || "Barnard's Star";
  }, [selectedTarget, activePresetCoords, isRtl, currentResult, pendingTarget, cases]);

  const availableBands = useMemo(
    () => [
      { id: 1, name: 'Band 1', range: '0.75 – 1.11 µm', wavelength: 0.93 },
      { id: 2, name: 'Band 2', range: '1.11 – 1.65 µm', wavelength: 1.48 },
      { id: 4, name: 'Band 4', range: '2.40 – 3.84 µm', wavelength: 2.76 },
    ],
    []
  );

  const handleSelectPresetCase = useCallback(
    (nextCaseId: string) => {
      const preset = BENCHMARK_PRESETS.find((p) => p.caseId === nextCaseId);
      if (!preset) return;
      gameAudio.playClick();
      setGuidedDemoStep(null);
      setPendingTarget({ ra: preset.ra, dec: preset.dec, caseId: preset.caseId });
      setExploreStory((prev) => ({ ...prev, pickedStar: true }));
      onSelectCase(preset.caseId, { sizePix: currentSizePix });
    },
    [onSelectCase, currentSizePix]
  );

  const handleSearchCoordinates = useCallback(
    (ra: number, dec: number) => {
      gameAudio.playClick();
      setGuidedDemoStep(null);
      setPendingTarget({ ra, dec });
      setExploreStory((prev) => ({ ...prev, pickedStar: true }));
      onSearchTarget(ra, dec, currentSizePix);
    },
    [onSearchTarget, currentSizePix]
  );

  const handleSelectFovSize = useCallback(
    (sizePix: number) => {
      const matchedPreset = BENCHMARK_PRESETS.find((p) => p.caseId === activePresetId);
      if (matchedPreset) {
        onSelectCase(matchedPreset.caseId, { sizePix });
      } else {
        onSearchTarget(queryRa, queryDec, sizePix);
      }
    },
    [activePresetId, onSelectCase, onSearchTarget, queryRa, queryDec]
  );

  const handleStartGuidedDemo = useCallback(() => {
    setViewMode('flipbook');
    setGuidedDemoStep(0);
    if (activePresetId !== 'case-wise-0855') {
      const wise = BENCHMARK_PRESETS[0];
      setPendingTarget({ ra: wise.ra, dec: wise.dec, caseId: wise.caseId });
      onSelectCase('case-wise-0855', { sizePix: 64 });
    }
  }, [activePresetId, onSelectCase]);

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
      caseId: activePresetId || 'custom',
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
        caseId: activePresetId || 'custom',
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
      className={`relative w-full ${isEmbed ? 'h-screen' : 'h-[calc(100vh-4rem)] min-h-[580px]'} overflow-hidden bg-[#02040A] text-slate-100 select-none ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Optional Compact Guided Demo Stepper (only when launched from Advanced -> 60s Demo) */}
      {guidedDemoStep !== null && viewMode === 'flipbook' && (
        <div className="absolute top-16 inset-x-3 sm:inset-x-auto sm:start-1/2 sm:-translate-x-1/2 z-30 max-w-2xl rounded-2xl bg-emerald-950/92 backdrop-blur-xl border border-emerald-400/40 px-3.5 py-2 shadow-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-start sm:items-center gap-2 max-w-md">
            <span className="px-2 py-0.5 rounded-md bg-emerald-400 text-slate-950 font-mono font-bold shrink-0">
              {guidedDemoStep + 1}/{GUIDED_DEMO_STEPS.length}
            </span>
            <div>
              <span className="font-bold text-emerald-200 me-1.5">
                {GUIDED_DEMO_STEPS[guidedDemoStep].title}:
              </span>
              <span className="text-slate-100">{GUIDED_DEMO_STEPS[guidedDemoStep].caption}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-mono shrink-0">
            <button
              type="button"
              onClick={() => setGuidedDemoStep((s) => (s !== null ? Math.max(0, s - 1) : 0))}
              disabled={guidedDemoStep === 0}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-slate-100 cursor-pointer"
            >
              Prev
            </button>
            {guidedDemoStep < GUIDED_DEMO_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setGuidedDemoStep((s) => (s !== null ? s + 1 : 0))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSpectralExplorer(true)}
                className="px-2.5 py-1 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold cursor-pointer"
              >
                102-Band SED
              </button>
            )}
            <button
              type="button"
              onClick={() => setGuidedDemoStep(null)}
              className="px-2 py-1 rounded-lg text-slate-300 hover:text-white underline cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {viewMode === 'flipbook' ? (
        <main className="relative w-full h-full">
          <FramePlayer
            ra={queryRa}
            dec={queryDec}
            caseId={activePresetId || undefined}
            sizePix={currentSizePix}
            initialDetector={initialDetector}
            language={language}
            isEmbed={isEmbed}
            targetLabel={targetDisplayName}
            presetTargets={BENCHMARK_PRESETS}
            onBackToSky={onBackToSky}
            onSelectPresetCase={handleSelectPresetCase}
            onSearchCoordinates={handleSearchCoordinates}
            onOpenFindings={() => setShowFindingsModal(true)}
            onOpenHelp={() => setShowHelpModal(true)}
            onOpenCurtainLab={() => setViewMode('curtain')}
            onStartGuidedDemo={handleStartGuidedDemo}
            onTelescopeUsed={() =>
              setExploreStory((prev) =>
                prev.checkedTelescopes ? prev : { ...prev, checkedTelescopes: true }
              )
            }
            onShareUsed={() =>
              setExploreStory((prev) => (prev.sharedResult ? prev : { ...prev, sharedResult: true }))
            }
            spexHighlights={spexHighlights}
            onExplainContextChange={setSpexExplainContext}
            onSpotSelect={(spot, ctx) => {
              setSpexSpotSelection(spot);
              setSpexExplainContext(ctx);
              setSpexHighlights([]);
              setSpexGuideOpen(true);
              setSpexAutoAskToken((n) => n + 1);
              setExploreStory((prev) => (prev.spottedMover ? prev : { ...prev, spottedMover: true }));
            }}
            onExplorerPlay={() =>
              setExploreStory((prev) => (prev.watchedBlink ? prev : { ...prev, watchedBlink: true }))
            }
            onExplorerToggleDiff={(diffActive) => {
              if (diffActive) gameAudio.playSuccess();
            }}
            onCanvasReady={setCanvasInstance}
            onDetectorChange={onDetectorChange}
            onSelectFovSize={handleSelectFovSize}
            onDataLoaded={handlePlayerDataLoaded}
            onOpenSpectrum={() => setShowSpectralExplorer(true)}
            onOpenPostcard={() => setShowPostcard(true)}
            onOpenProvenance={effectivePostcardResult?.provenance ? () => setShowProvenance(true) : undefined}
            onOpenDetectorStacking={() => setShowDetectorStacking(true)}
            autoPlay={autoPlay}
            onAutoPlayConsumed={onAutoPlayConsumed}
            preferSnapshot={preferSnapshot}
            guidedStepAction={guidedDemoStep !== null ? GUIDED_DEMO_STEPS[guidedDemoStep].action : null}
            className="w-full h-full"
          />
        </main>
      ) : (
        /* Curtain & 4-Lens Inspection Lab (with single Back to Flipbook overlay bar) */
        <main className="relative w-full h-full flex flex-col lg:flex-row overflow-hidden bg-black">
          <div className="relative flex-1 min-w-0 h-full overflow-hidden">
            <div className="absolute top-3 start-3 end-3 z-30 flex items-center justify-between gap-2 pointer-events-none">
              <button
                type="button"
                onClick={() => setViewMode('flipbook')}
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#070B16]/88 backdrop-blur-xl border border-white/20 text-slate-100 hover:bg-[#0D152B] text-xs font-semibold shadow-xl cursor-pointer"
              >
                <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                <span>{isRtl ? 'العودة للعارض' : 'Back to Flipbook'}</span>
              </button>
              <div className="pointer-events-auto px-3 py-1.5 rounded-xl bg-[#070B16]/85 backdrop-blur-xl border border-white/15 text-xs font-mono text-amber-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>{targetDisplayName} · Curtain Lab</span>
              </div>
            </div>

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

          {currentResult && (
            <aside className="relative z-20 w-full lg:w-[400px] shrink-0 h-full p-2 sm:p-3 overflow-hidden border-s border-white/10 bg-[#0C0E14]/95 backdrop-blur-xl">
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
        </main>
      )}

      {/* Grounded Pixel/Spot Explanation Sheet */}
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
        autoAskToken={spexAutoAskToken}
      />

      {/* Always-available minimizable floating Mr. SPEX guide (non-embed) */}
      {!isEmbed && (
        <SpexCompanion
          currentResult={currentResult}
          timeSeriesMeta={latestTimeSeriesMeta}
          targetName={targetDisplayName}
          storyState={exploreStory}
          activeLens={activeLens}
          currentFrameIdx={currentFrameIdx}
          isCurtainActive={isCurtainActive}
          selectedCandidate={selectedCandidate}
          selectedFlagPixel={selectedFlagPixel}
          language={language}
          onOpenTour={() => setShowTour(true)}
          onHighlightElement={(targetId) => setHighlightedTargetId(targetId)}
          onOpenDictionary={(termId) => {
            if (termId) setDictionaryTermId(termId);
            setShowDictionary(true);
          }}
        />
      )}

      {/* Visual Highlight Beacon */}
      <SpexUiHighlight
        highlightId={highlightedTargetId}
        onClear={() => setHighlightedTargetId(null)}
        language={language}
      />

      {/* First-Visit Spotlight + SVG Arrow Guided Tour */}
      <SpexGuidedTour
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        language={language}
      />

      {/* Findings Summary Modal (Saved Targets + Custom Searched Fields) */}
      <FindingsModal
        isOpen={showFindingsModal}
        onClose={() => setShowFindingsModal(false)}
        language={language}
        activeCaseId={activePresetId}
        loadedByKey={loadedByKey}
        onSelectTarget={(tgt) => {
          if (tgt.caseId) {
            handleSelectPresetCase(tgt.caseId);
          } else {
            handleSearchCoordinates(tgt.ra, tgt.dec);
          }
        }}
      />

      {/* Discovery Card / Postcard Modal */}
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

      {/* Provenance Modal */}
      {effectivePostcardResult?.provenance && showProvenance && (
        <ProvenanceModal
          provenance={effectivePostcardResult.provenance}
          onClose={() => setShowProvenance(false)}
          language={language}
        />
      )}

      {/* Data Release Modal */}
      <DataReleaseModal
        isOpen={showDataRelease}
        onClose={() => setShowDataRelease(false)}
        language={language}
      />

      {/* Space Dictionary Modal */}
      <SpexSpaceDictionaryModal
        isOpen={showDictionary}
        onClose={() => setShowDictionary(false)}
        language={language}
        initialTermId={dictionaryTermId}
        onSelectTerm={(termId) => setDictionaryTermId(termId)}
      />

      {/* Detector Array Stacks Modal */}
      <DetectorStackingModal
        isOpen={showDetectorStacking}
        onClose={() => setShowDetectorStacking(false)}
        language={language}
        stacks={detectorStacks as any}
      />

      {/* 102-Band SED Modal */}
      {showSpectralExplorer && (
        <SpectralExplorerModal
          onClose={() => setShowSpectralExplorer(false)}
          selectedCandidate={selectedCandidate}
          extractedSpectrum={extractedSpectrum}
          targetCoords={effectivePostcardResult?.targetCoords}
          language={language}
        />
      )}

      {/* Explore 4-Step Help Modal + Replay Tour */}
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
          <div className="pt-2 border-t border-white/10 flex justify-end">
            <button
              type="button"
              data-testid="replay-tour-btn"
              onClick={() => {
                setShowHelpModal(false);
                setShowTour(true);
              }}
              className="px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{t.tourReplayBtn}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
