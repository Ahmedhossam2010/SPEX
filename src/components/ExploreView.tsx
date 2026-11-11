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
import { LensMode } from '../design/components/LensButton';
import { Language, translations } from '../utils/translations';

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

  // Modals
  const [showPostcard, setShowPostcard] = useState<boolean>(false);
  const [showProvenance, setShowProvenance] = useState<boolean>(false);
  const [showDataRelease, setShowDataRelease] = useState<boolean>(false);

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

  // Determine current active pixel array to render
  const currentPixelData = useMemo(() => {
    if (!currentResult) return null;
    if (currentFrameIdx === 0 && obs1) return obs1.flux;
    if (currentFrameIdx === 1 && obs2) return obs2.flux;
    if (currentFrameIdx === 2 && diffObs) return diffObs.diff;
    return obs1?.flux || null;
  }, [currentResult, currentFrameIdx, obs1, obs2, diffObs]);

  const isCurrentDifference = currentFrameIdx === 2;

  // Canonical Colormap Resolution
  const effectiveColormap: ColormapMode = useMemo(() => {
    if (customColormap) return customColormap;
    if (isCurrentDifference) return 'diff_diverging';
    if (activeLens === 'colors') {
      return activeBandIdx === 0 ? 'infrared_warm' : activeBandIdx === 1 ? 'inferno' : 'viridis';
    }
    if (activeLens === 'doubt') return 'grayscale';
    return 'infrared_warm';
  }, [customColormap, isCurrentDifference, activeLens, activeBandIdx]);

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
        </div>

        {/* Right: Tour button, Authenticity indicator, Explorer/Scientist switch, Share Card */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
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
                activeBandIdx={activeBandIdx}
                onSelectBandIdx={setActiveBandIdx}
                availableBands={availableBands}
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
    </div>
  );
};
