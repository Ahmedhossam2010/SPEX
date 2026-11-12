import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Share2,
  Clock,
  Palette,
  ShieldCheck,
  ShieldAlert,
  Users,
  Compass,
  Maximize2,
  Layers,
  Activity,
  Globe,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  CandidateDetection,
  InvestigationResult,
  SPHERExObservation,
  ChallengeTarget,
} from '../science/types';
import { ColormapMode, DisplayMode, StretchMode } from '../utils/astronomyRender';
import { AstronomicalSkyViewport } from './Explore/AstronomicalSkyViewport';
import { FourLensesDock } from './Explore/FourLensesDock';
import { ScientistInvestigationPanel } from './Explore/ScientistInvestigationPanel';
import { SpexCompanion } from './Explore/SpexCompanion';
import { SpexGuidedTour } from './Explore/SpexGuidedTour';
import { SpexUiHighlight } from './Explore/SpexUiHighlight';
import { PostcardModal } from './TimeLens/PostcardModal';
import { ProvenanceModal } from './ProvenanceModal';
import { DataReleaseModal } from './DataReleaseModal';
import { SpexSpaceDictionaryModal } from './SpexSpaceDictionaryModal';
import { SpaceExplorerLogModal } from './Explore/SpaceExplorerLogModal';
import { DetectorStackingModal } from './Explore/DetectorStackingModal';
import { SpectralExplorerModal } from './SpectralExplorerModal';
import { ObservationItem, ImageMathMode } from './Explore/ObservationTimelineSelector';
import { LensMode } from '../design/components/LensButton';
import { Language, translations } from '../utils/translations';
import { BookOpen, Award } from 'lucide-react';

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
  isScientistMode?: boolean;
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
  isScientistMode = false,
  onToggleScientistMode,
  selectedTarget,
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];

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

  // Guided Onboarding Tour & UI Pointing Beacon State
  const [showTour, setShowTour] = useState<boolean>(false);
  const [highlightedTargetId, setHighlightedTargetId] = useState<string | null>(null);

  // Auto-launch guided tour for first-time visitors (Phase 6)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tourDone = localStorage.getItem('spex_tour_completed');
    if (!tourDone) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

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

  // Fetch real timeseries observations for intelligent baseline comparison
  useEffect(() => {
    if (!currentResult?.targetCoords) return;
    const { ra, dec } = currentResult.targetCoords;
    const caseId = currentResult.provenance?.caseId || '';
    const sizePix = currentResult.epoch1?.width || 64;

    fetch(`/api/spherex/timeseries?ra=${ra}&dec=${dec}&sizePix=${sizePix}&caseId=${caseId}`)
      .then((r) => (r.ok && r.headers.get('content-type')?.includes('application/json') ? r.json() : null))
      .then((data) => {
        if (data?.frames && Array.isArray(data.frames) && data.frames.length > 0) {
          setTimeseriesFrames(data.frames);
          setEpochAIdx(0);
          setEpochBIdx(Math.min(1, data.frames.length - 1));
        }
        if (data?.detectorStacks && typeof data.detectorStacks === 'object') {
          setDetectorStacks(data.detectorStacks);
        }
        if (data?.spectrum && Array.isArray(data.spectrum)) {
          setExtractedSpectrum(data.spectrum);
        }
      })
      .catch((err) => {
        console.warn('Timeseries fetch notice:', err);
      });
  }, [currentResult?.targetCoords?.ra, currentResult?.targetCoords?.dec, currentResult?.provenance?.caseId]);

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

  return (
    <div
      className={`relative w-full h-[calc(100vh-64px)] flex flex-col bg-[#02040A] text-slate-100 overflow-hidden select-none ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* ==================================================================== */}
      {/* PART 3.A: SMALL ELEGANT FLOATING TOP BAR */}
      {/* ==================================================================== */}
      <header className="relative z-30 shrink-0 h-13 sm:h-14 bg-[#0C0E14]/90 backdrop-blur-xl border-b border-white/10 px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-3 shadow-md">
        {/* Left: Back to Sky & Target Name */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBackToSky && (
            <button
              type="button"
              onClick={onBackToSky}
              className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer text-xs font-mono"
              title={isRtl ? 'العودة إلى القبة السماوية' : 'Return to Sky'}
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
                ({currentResult.targetCoords.ra.toFixed(4)}°, {currentResult.targetCoords.dec >= 0 ? '+' : ''}{currentResult.targetCoords.dec.toFixed(4)}°)
              </span>
            )}
          </div>

          {/* FOV Presets selector (Phase 1 & 4) */}
          {currentResult?.targetCoords && (
            <div className="hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono ml-1">
              <span className="text-[10px] text-slate-400 px-1 font-semibold uppercase">FOV</span>
              {[
                { label: "3.3'", sizePix: 32 },
                { label: "6.6'", sizePix: 64 },
                { label: "11.6'", sizePix: 112 },
                { label: "16.5'", sizePix: 160 },
              ].map((fov) => (
                <button
                  key={fov.sizePix}
                  type="button"
                  onClick={() => {
                    if (currentResult?.targetCoords) {
                      onSearchTarget(currentResult.targetCoords.ra, currentResult.targetCoords.dec, fov.sizePix);
                    }
                  }}
                  className={`px-2 py-0.5 rounded-lg transition cursor-pointer text-xs ${
                    (obs1?.width || 64) === fov.sizePix
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {fov.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Dictionary, Explorer Log, Tour button, Authenticity indicator, Explorer/Scientist switch, Share Card */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* SPEX Space Dictionary Trigger */}
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

          {/* Space Explorer's Log Trigger */}
          <button
            type="button"
            onClick={() => setShowExplorerLog(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition cursor-pointer text-xs font-mono font-semibold shadow-xs"
            title={isRtl ? 'سجل مستكشف الفضاء' : "Space Explorer's Log"}
          >
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">{isRtl ? 'سجل المستكشف' : "Explorer's Log"}</span>
          </button>

          {/* Guided Tour Trigger Button */}
          <button
            type="button"
            onClick={() => setShowTour(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#00D3F3]/40 bg-[#00D3F3]/10 hover:bg-[#00D3F3]/20 text-[#00D3F3] transition cursor-pointer text-xs font-mono font-semibold"
            title={isRtl ? 'بدء جولة سبيكس التوضيحية' : 'Start SPEX Tour'}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isRtl ? 'الجولة' : 'Tour'}</span>
          </button>

          {/* Data Authenticity Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">{isRtl ? 'بيانات SPHEREx حقيقية' : 'Authentic QR2'}</span>
          </div>

          {/* Mode Switch: Explorer vs Scientist */}
          {onToggleScientistMode && (
            <div data-tour="scientist_toggle" className="flex items-center p-0.5 rounded-xl bg-black/60 border border-white/15">
              <button
                type="button"
                onClick={() => isScientistMode && onToggleScientistMode()}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer select-none ${
                  !isScientistMode
                    ? 'bg-[#FFB900] text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isRtl ? 'المستكشف' : 'Explorer'}
              </button>
              <button
                type="button"
                onClick={() => !isScientistMode && onToggleScientistMode()}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer select-none ${
                  isScientistMode
                    ? 'bg-[#00D3F3] text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isRtl ? 'العلماء' : 'Scientist'}
              </button>
            </div>
          )}

          {/* Discovery Postcard Share Action */}
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
      </header>

      {/* ==================================================================== */}
      {/* PART 3.B: MAIN SKY VIEWPORT AS TRUE FULL HERO & FLOATING CONTROLS */}
      {/* ==================================================================== */}
      <div className="relative flex-1 w-full min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Sky Telescope Viewport (Maximized to occupy full area) */}
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

            {/* FLOATING 4-LENS DOCK & CONTEXTUAL DRAWER (Overlaid at bottom of telescope viewport) */}
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

        {/* ================================================================== */}
        {/* PART 6: STRUCTURED SCIENTIST INVESTIGATION WORKSPACE PANEL */}
        {/* ================================================================== */}
        {isScientistMode && currentResult && (
          <aside className="relative z-20 w-full lg:w-[420px] xl:w-[460px] shrink-0 h-full p-2 sm:p-3 overflow-hidden animate-slide-left border-l border-white/10 bg-[#0C0E14]/95 backdrop-blur-xl">
            <ScientistInvestigationPanel
              currentResult={currentResult}
              language={language}
              stretch={stretch}
              colormap={effectiveColormap}
              displayMode={displayMode}
              contrastFactor={contrastFactor}
              onStretchChange={setStretch}
              onColormapChange={setCustomColormap}
              onDisplayModeChange={setDisplayMode}
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
      {/* SPEX INTELLIGENT COMPANION & GUIDED TOUR SYSTEM */}
      {/* ==================================================================== */}
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
          // If action targets a specific lens, also activate that lens!
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
      {currentResult && (
        <PostcardModal
          isOpen={showPostcard}
          onClose={() => setShowPostcard(false)}
          result={currentResult}
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
    </div>
  );
};
