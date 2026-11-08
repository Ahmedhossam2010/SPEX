import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Search,
  Crosshair,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Info,
  ShieldCheck,
  Move,
  AlertTriangle,
  SlidersHorizontal,
  Layers,
  HelpCircle,
  Eye,
  Globe2,
  Table,
  FileText,
  Activity,
  Sliders,
  X,
  Compass,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import {
  CandidateDetection,
  InvestigationResult,
  SPHERExObservation,
  ChallengeTarget,
} from '../science/types';
import { AstronomyRenderer, ColormapMode, DisplayMode, StretchMode } from '../utils/astronomyRender';
import { WCS } from '../science/wcs';
import { ProvenanceModal } from './ProvenanceModal';
import { SpexCompanion } from './SpexCompanion';
import { FindingCard } from './FindingCard';
import { ScienceTerm } from './ScienceTerm';
import { SkyCoverageModal } from './SkyCoverageModal';
import { SpectralExplorerModal } from './SpectralExplorerModal';
import { DiscoveryReportModal } from './DiscoveryReportModal';
import { CandidateComparisonModal } from './CandidateComparisonModal';
import { VisualScienceExplainer } from './VisualScienceExplainer';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { Language, translations } from '../utils/translations';

interface ExploreViewProps {
  currentResult: InvestigationResult | null;
  isLoading: boolean;
  onSearchTarget: (ra: number, dec: number, sizePix?: number) => void;
  onSelectCase: (caseId: string, options?: { sizePix?: number; epochPair?: string }) => void;
  cases: Array<{ id: string; title: string; category?: string; ra: number; dec: number }>;
  language: Language;
}

export type ViewMode = 'difference' | 'significance' | 'epoch1' | 'epoch2' | 'split' | 'blink' | 'sequence';
export type CandidateFilter = 'all' | 'candidates' | 'known' | 'artifacts';

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

  // Primary 4-Stage Observation Perspective & Sequencer
  const [viewMode, setViewMode] = useState<ViewMode>('difference');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('science');
  const [stretch, setStretch] = useState<StretchMode>('asinh');
  const [colormap, setColormap] = useState<ColormapMode>('diff_diverging');
  const [contrastFactor, setContrastFactor] = useState<number>(1.0);

  // Canvas Viewport Geometry
  const [zoom, setZoom] = useState<number>(1.1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Interactive Comparison Tools
  const [sliderPos, setSliderPos] = useState<number>(0.5);
  const [blinkEpoch, setBlinkEpoch] = useState<'epoch1' | 'epoch2'>('epoch1');
  const [isBlinking, setIsBlinking] = useState<boolean>(true);

  // Multi-Epoch Sequencer
  const [activeEpochIdx, setActiveEpochIdx] = useState<number>(0);
  const [isSequencePlaying, setIsSequencePlaying] = useState<boolean>(false);
  const [sequenceSpeed, setSequenceSpeed] = useState<number>(1); // 1x, 2x, 4x fps
  const [selectedEpochPair, setSelectedEpochPair] = useState<string>('1-3');
  const [selectedFovSize, setSelectedFovSize] = useState<number>(64); // 32, 64, 112, 160

  // Inspector Cursor Readout
  const [cursorPos, setCursorPos] = useState<{
    x: number;
    y: number;
    ra?: number;
    dec?: number;
    val?: number;
  } | null>(null);

  // Candidate Selection & Astronomical Reticles
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetection | null>(null);
  const [hoveredCandidate, setHoveredCandidate] = useState<CandidateDetection | null>(null);
  const [markerVisibility, setMarkerVisibility] = useState<'reticles' | 'labels' | 'hidden'>('reticles');
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [candidateFilter, setCandidateFilter] = useState<CandidateFilter>('all');
  const [candidatePage, setCandidatePage] = useState<number>(1);
  const CANDIDATES_PER_PAGE = 4;

  // External prompt passed from candidate cards to SPEX
  const [externalSpexPrompt, setExternalSpexPrompt] = useState<string | null>(null);

  // Modals & Panels
  const [showProvenance, setShowProvenance] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [showSkyCoverage, setShowSkyCoverage] = useState<boolean>(false);
  const [showSpectralExplorer, setShowSpectralExplorer] = useState<boolean>(false);
  const [showDiscoveryReport, setShowDiscoveryReport] = useState<boolean>(false);
  const [showCandidateComparison, setShowCandidateComparison] = useState<boolean>(false);

  useModalBehavior(isSearchOpen, () => setIsSearchOpen(false));

  // Custom Coordinate Inputs
  const [customRa, setCustomRa] = useState<string>('276.2614');
  const [customDec, setCustomDec] = useState<string>('64.8258');

  // Progressive Disclosure Panels
  const [showInvestigatePanel, setShowInvestigatePanel] = useState<boolean>(false);
  const [showWhatAmILookingAt, setShowWhatAmILookingAt] = useState<boolean>(false);
  const [showScientificEvidenceDrawer, setShowScientificEvidenceDrawer] = useState<boolean>(false);

  // Strongest candidate in active field
  const strongestCandidate = useMemo(() => {
    if (!currentResult?.candidates || currentResult.candidates.length === 0) return null;
    return [...currentResult.candidates].sort((a, b) => b.peakSignificance - a.peakSignificance)[0];
  }, [currentResult?.candidates]);

  // Mobile View Tab
  const [mobileTab, setMobileTab] = useState<'canvas' | 'findings' | 'spex'>('canvas');

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Adapt colormap dynamically when switching perspectives
  const handleSelectViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'difference' || mode === 'significance') {
      setColormap('diff_diverging');
    } else if (colormap === 'diff_diverging') {
      setColormap('grayscale');
    }
  };

  // Sync candidate selection when case changes
  useEffect(() => {
    if (currentResult) {
      if (currentResult.candidates.length > 0) {
        setSelectedCandidate(currentResult.candidates[0]);
      } else {
        setSelectedCandidate(null);
      }
      setPan({ x: 0, y: 0 });
      setZoom(1.1);
      setCandidatePage(1);
      setActiveEpochIdx(0);
    }
  }, [currentResult?.caseId]);

  // Fast blink cadence timer
  useEffect(() => {
    if (viewMode !== 'blink' || !isBlinking) return;
    const interval = setInterval(() => {
      setBlinkEpoch((prev) => (prev === 'epoch1' ? 'epoch2' : 'epoch1'));
    }, 450);
    return () => clearInterval(interval);
  }, [viewMode, isBlinking]);

  // Multi-epoch automatic sequence player
  useEffect(() => {
    if (viewMode !== 'sequence' || !isSequencePlaying || !currentResult?.epochs || currentResult.epochs.length === 0) {
      return;
    }
    const msPerStep = Math.max(250, 1000 / sequenceSpeed);
    const interval = setInterval(() => {
      setActiveEpochIdx((prev) => (prev + 1) % currentResult.epochs!.length);
    }, msPerStep);
    return () => clearInterval(interval);
  }, [viewMode, isSequencePlaying, sequenceSpeed, currentResult?.epochs]);

  // Compute active slice array and robust physical data stats
  const activeDataInfo = useMemo(() => {
    if (!currentResult) {
      return {
        data: [] as number[],
        isDiff: false,
        colormap: 'grayscale' as ColormapMode,
        stats: { min: 0, max: 0, median: 0, robustSigma: 0, absMax: 0 },
      };
    }

    const isDiff = viewMode === 'difference' || viewMode === 'significance';
    let dataToRender: number[] = [];
    let cm = colormap;

    if (viewMode === 'epoch1') {
      dataToRender = currentResult.epoch1.flux;
      if (cm === 'diff_diverging') cm = 'grayscale';
    } else if (viewMode === 'epoch2') {
      dataToRender = currentResult.epoch2.flux;
      if (cm === 'diff_diverging') cm = 'grayscale';
    } else if (viewMode === 'sequence') {
      if (currentResult.epochs && currentResult.epochs[activeEpochIdx]) {
        dataToRender = currentResult.epochs[activeEpochIdx].flux;
      } else {
        dataToRender = currentResult.epoch1.flux;
      }
      if (cm === 'diff_diverging') cm = 'grayscale';
    } else if (viewMode === 'blink') {
      dataToRender = blinkEpoch === 'epoch1' ? currentResult.epoch1.flux : currentResult.epoch2.flux;
      if (cm === 'diff_diverging') cm = 'grayscale';
    } else if (viewMode === 'difference') {
      dataToRender = currentResult.difference.diff;
    } else if (viewMode === 'significance') {
      dataToRender = currentResult.difference.significance;
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

    const stats = AstronomyRenderer.computeDataStats(dataToRender);
    return { data: dataToRender, isDiff, colormap: cm, stats };
  }, [currentResult, viewMode, blinkEpoch, activeEpochIdx, colormap, sliderPos]);

  // Render scientific FITS data onto the canvas with displayMode and contrastFactor
  useEffect(() => {
    if (!currentResult || !canvasRef.current || activeDataInfo.data.length === 0) return;

    AstronomyRenderer.renderToCanvas(
      canvasRef.current,
      activeDataInfo.data,
      currentResult.epoch1.width,
      currentResult.epoch1.height,
      {
        stretch,
        colormap: activeDataInfo.colormap,
        mode: activeDataInfo.isDiff ? 'signed_difference' : 'unipolar',
        displayMode,
        contrastFactor,
        renderSize: 512,
      }
    );
  }, [currentResult, activeDataInfo, stretch, displayMode, contrastFactor]);

  // Canvas Mouse Tracking
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
      let activeWcs = currentResult.epoch1.wcs;

      if (viewMode === 'significance' || viewMode === 'difference' || viewMode === 'epoch2') {
        if (viewMode === 'significance') {
          val = currentResult.difference.significance[idx];
        } else if (viewMode === 'epoch2') {
          val = currentResult.epoch2.flux[idx];
        }
        activeWcs = currentResult.epoch2.wcs;
      } else if (viewMode === 'epoch1') {
        val = currentResult.epoch1.flux[idx];
        activeWcs = currentResult.epoch1.wcs;
      } else if (viewMode === 'split') {
        const isLeftOfSplit = clientX / rect.width < sliderPos;
        val = isLeftOfSplit ? currentResult.epoch1.flux[idx] : currentResult.epoch2.flux[idx];
        activeWcs = isLeftOfSplit ? currentResult.epoch1.wcs : currentResult.epoch2.wcs;
      } else if (viewMode === 'blink') {
        val = blinkEpoch === 'epoch1' ? currentResult.epoch1.flux[idx] : currentResult.epoch2.flux[idx];
        activeWcs = blinkEpoch === 'epoch1' ? currentResult.epoch1.wcs : currentResult.epoch2.wcs;
      } else if (viewMode === 'sequence' && currentResult.epochs && currentResult.epochs[activeEpochIdx]) {
        val = currentResult.epochs[activeEpochIdx].flux[idx];
        activeWcs = currentResult.epochs[activeEpochIdx].wcs || currentResult.epoch1.wcs;
      }

      const sky = WCS.pixToSky(pixelX, pixelY, activeWcs);
      setCursorPos({ x: pixelX, y: pixelY, ra: sky.ra, dec: sky.dec, val });
    }
  };

  const handleCanvasMouseLeave = () => {
    setCursorPos(null);
  };

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMovePan = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const centerOnCandidate = (cand: CandidateDetection) => {
    setSelectedCandidate(cand);
    if (!currentResult) return;
    const w = currentResult.epoch1.width;
    const h = currentResult.epoch1.height;
    const offsetX = (w / 2 - cand.x) * (zoom * 7);
    const offsetY = (h / 2 - cand.y) * (zoom * 7);
    setPan({ x: offsetX, y: offsetY });
    if (window.innerWidth < 1024) {
      setMobileTab('canvas');
    }
  };

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    if (!currentResult?.candidates) return [];
    let list = [...currentResult.candidates];

    if (candidateFilter === 'candidates') {
      list = list.filter((c) => c.status !== 'Possible artifact' && (c.artifactScore ?? 0) < 0.5);
    } else if (candidateFilter === 'known') {
      list = list.filter((c) => (c.catalogMatches?.length ?? 0) > 0);
    } else if (candidateFilter === 'artifacts') {
      list = list.filter((c) => c.status === 'Possible artifact' || (c.artifactScore ?? 0) >= 0.5);
    }

    return list.sort((a, b) => b.peakSignificance - a.peakSignificance);
  }, [currentResult?.candidates, candidateFilter]);

  const totalPages = Math.ceil(filteredCandidates.length / CANDIDATES_PER_PAGE) || 1;
  const paginatedCandidates = filteredCandidates.slice(
    (candidatePage - 1) * CANDIDATES_PER_PAGE,
    candidatePage * CANDIDATES_PER_PAGE
  );

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* 1. Explainer Banner & Top Toolbar */}
      <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 sm:p-5 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-['Outfit'] text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t.explainerTitle}
              </h1>
              <span className="text-xs font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-semibold">
                {currentResult?.caseId ? `#${currentResult.caseId}` : 'Real NASA FITS'}
              </span>
              {currentResult?.fovArcmin && (
                <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md font-semibold">
                  FOV: {currentResult.fovArcmin}′ ({currentResult.sizePix}px)
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              {t.explainerText}
            </p>
          </div>

          {/* Quick Target Switcher / Search Trigger */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <select
              value={currentResult?.caseId || ''}
              onChange={(e) => onSelectCase(e.target.value, { sizePix: selectedFovSize, epochPair: selectedEpochPair })}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-200 hover:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowInvestigatePanel(!showInvestigatePanel)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                showInvestigatePanel
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{isRtl ? 'أين تريد التحقيق؟' : 'Where to Investigate?'}</span>
              {showInvestigatePanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 transition-colors active:scale-95 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t.btnSearchCoordinates}</span>
            </button>
          </div>
        </div>

        {/* Action Capabilities Row: Sky Coverage, 102 Spectral Bands, Discovery Passport, Compare Table */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowSkyCoverage(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] hover:border-amber-400/50 bg-slate-50 dark:bg-white/[0.03] text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <Globe2 className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.btnSkyCoverage}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSpectralExplorer(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] hover:border-cyan-400/50 bg-slate-50 dark:bg-white/[0.03] text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-500" />
              <span>{t.btnSpectralBands}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCandidateComparison(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] hover:border-indigo-400/50 bg-slate-50 dark:bg-white/[0.03] text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <Table className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t.btnCompareCandidates}</span>
            </button>

            {selectedCandidate && currentResult && (
              <button
                type="button"
                onClick={() => setShowDiscoveryReport(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{t.btnDiscoveryPassport}</span>
              </button>
            )}
          </div>

          {/* Field of View (FOV) Selector */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-500 dark:text-slate-400">{t.labelFov}</span>
            {[
              { label: "1.0′", size: 32 },
              { label: "2.0′", size: 64 },
              { label: "3.5′", size: 112 },
              { label: "5.0′", size: 160 },
            ].map((f) => (
              <button
                key={f.size}
                type="button"
                onClick={() => {
                  setSelectedFovSize(f.size);
                  if (currentResult) {
                    onSelectCase(currentResult.caseId, { sizePix: f.size, epochPair: selectedEpochPair });
                  }
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                  selectedFovSize === f.size
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Visual Science Laboratory: Visible vs IR, 102 Bands, Difference Math, SNR, Celestial Coordinates */}
      <VisualScienceExplainer
        language={language}
        onSelectCoordinates={(ra, dec) => onSearchTarget(ra, dec, selectedFovSize)}
      />

      {/* A. Simple First Screen: Where do you want to investigate? */}
      {showInvestigatePanel && (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/[0.04] p-5 sm:p-6 shadow-md space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Outfit'] flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-500" />
                <span>{isRtl ? 'أين تريد أن تبحث في السماء؟' : 'Where do you want to investigate?'}</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {isRtl
                  ? 'المطلع المستقيم (RA) يمثل خط الطول الفلكي (من 0° إلى 360°)، والميل (Dec) يمثل خط العرض الفلكي (من -90° إلى +90°). يتركز إصدار NASA/IPAC SPHEREx QR2 الحالي حول القطب الشمالي لمسار الشمس (+64.5° إلى +65.2°).'
                  : 'Right Ascension (RA) is astronomical longitude across the sky (0° to 360°), and Declination (Dec) is latitude (-90° to +90°). SPHEREx QR2 coverage centers around the North Ecliptic Pole (+64.5° to +65.2°).'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInvestigatePanel(false)}
              className="self-end sm:self-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Guided Target Presets */}
          <div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1.5 font-medium">
              {isRtl ? 'أهداف معتمدة في نطاق SPHEREx QR2:' : 'Guided Target Presets (Verified SPHEREx Footprint):'}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { name: isRtl ? 'متغير NEP عميق' : 'NEP Deep Variable', desc: '7.8σ flare', ra: 276.2614, dec: 64.8258 },
                { name: isRtl ? 'معيار استقرار NEP' : 'NEP Calibration Standard', desc: 'Null 0.0σ', ra: 275.9265, dec: 64.9585 },
                { name: isRtl ? 'نجم NEP متحرك' : 'NEP Proper Motion Star', desc: '14.2″ dipole', ra: 276.1389, dec: 64.8361 },
                { name: isRtl ? 'حقل NEP هادئ' : 'NEP Quiet Field', desc: 'Deep background', ra: 275.8512, dec: 65.0998 },
              ].map((tgt) => (
                <button
                  key={tgt.name}
                  type="button"
                  onClick={() => {
                    setCustomRa(tgt.ra.toString());
                    setCustomDec(tgt.dec.toString());
                    onSearchTarget(tgt.ra, tgt.dec, selectedFovSize);
                  }}
                  className="p-2.5 rounded-xl text-left bg-white dark:bg-white/[0.04] hover:bg-amber-500/10 border border-slate-200 dark:border-white/[0.08] hover:border-amber-500/40 transition-all cursor-pointer group"
                >
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition-colors">
                    {tgt.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {tgt.desc} · RA {tgt.ra}°
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual RA / Dec inputs & Primary Start Investigation Button */}
          <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                  {isRtl ? 'المطلع المستقيم (RA بالدرجات):' : 'Right Ascension (RA in degrees):'}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={customRa}
                  onChange={(e) => setCustomRa(e.target.value)}
                  placeholder="276.2614"
                  className="w-full bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex-1 min-w-[140px]">
                <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                  {isRtl ? 'الميل الفلكي (Dec بالدرجات):' : 'Declination (Dec in degrees):'}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={customDec}
                  onChange={(e) => setCustomDec(e.target.value)}
                  placeholder="64.8258"
                  className="w-full bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const raNum = parseFloat(customRa);
                const decNum = parseFloat(customDec);
                if (!Number.isNaN(raNum) && !Number.isNaN(decNum)) {
                  onSearchTarget(raNum, decNum, selectedFovSize);
                  setShowInvestigatePanel(false);
                }
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span>{isRtl ? 'بدء التحقيق في الإحداثيات' : 'Start Investigation'}</span>
            </button>
          </div>
        </div>
      )}

      {/* B. Observation Availability Summary Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 text-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/[0.06] pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-800 dark:text-slate-200 font-['Outfit']">
              {isRtl ? 'حالة توفر الرصد الفلكي:' : 'Observation Availability:'}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[11px]">
              {currentResult?.epochs && currentResult.epochs.length >= 3
                ? (isRtl ? '3 رصدات متوفرة (تسلسل زمني)' : '3 Survey Visits Available (Multi-Epoch)')
                : (isRtl ? 'رصدتان مستقلتان متوفرتان (مقارنة تفاضلية)' : '2 Independent Visits Available (Epoch Pair)')}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
              NASA SPHEREx QR2 Archive
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="text-slate-500">Calibrated Level-2B FITS</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
              {isRtl ? 'الرصدة الأولى (Epoch 1):' : 'Visit 1 Timestamp:'}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {currentResult?.epoch1.metadata.date_obs?.split('T')[0] || '2025-04-28'}{' '}
              <span className="text-[10px] text-slate-500 font-normal">
                {currentResult?.epoch1.metadata.date_obs?.split('T')[1]?.slice(0, 8) || '13:00:15'} UTC
              </span>
            </span>
          </div>

          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
              {isRtl ? 'الرصدة الثانية (Epoch 2):' : 'Visit 2 Timestamp:'}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {currentResult?.epoch2.metadata.date_obs?.split('T')[0] || '2025-04-28'}{' '}
              <span className="text-[10px] text-slate-500 font-normal">
                {currentResult?.epoch2.metadata.date_obs?.split('T')[1]?.slice(0, 8) || '13:02:24'} UTC
              </span>
            </span>
          </div>

          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
              {isRtl ? 'الأداة والنطاق الطيفي:' : 'Instrument & Bandpass:'}
            </span>
            <span className="font-semibold text-cyan-600 dark:text-cyan-400">
              SPHEREx 0.75–5.0 µm (6 Arrays)
            </span>
          </div>

          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
              {isRtl ? 'منطقة المسح والحجم:' : 'Survey Footprint:'}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              NEP Deep · {currentResult?.fovArcmin ? `${currentResult.fovArcmin}′ FOV` : '2.0′ FOV'}
            </span>
          </div>
        </div>

        {/* Explain requirement if fewer than 2 observations are present */}
        {(!currentResult || !currentResult.epoch1 || !currentResult.epoch2) && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              {isRtl
                ? 'تنبيه: يتطلب اكتشاف التغيرات الفلكية وجود رصدتين على الأقل لنفس المنطقة في أوقات مختلفة لإجراء الطرح التفاضلي.'
                : 'Notice: Detecting transient changes requires at least 2 distinct observations of the same sky coordinates separated in time.'}
            </span>
          </div>
        )}
      </div>

      {/* C. Collapsible "What Am I Looking At?" Guide */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setShowWhatAmILookingAt(!showWhatAmILookingAt)}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 font-['Outfit'] font-bold text-slate-800 dark:text-slate-200">
            <HelpCircle className="w-4 h-4 text-cyan-500" />
            <span>{isRtl ? 'ما الذي أشاهده في هذه الشاشة؟ (دليل المبتدئين)' : 'What Am I Looking At? (Plain-Language Guide)'}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
            <span>{showWhatAmILookingAt ? (isRtl ? 'إخفاء' : 'Hide') : (isRtl ? 'عرض الشرح' : 'Explain')}</span>
            {showWhatAmILookingAt ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {showWhatAmILookingAt && (
          <div className="p-4 pt-1 border-t border-slate-100 dark:border-white/[0.06] grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                <span>1. {isRtl ? 'ما هي الرصدة (Observation)؟' : 'What is an observation?'}</span>
              </h4>
              <p className="text-[11px]">
                {isRtl
                  ? 'لقطة تحت حمراء عالية الحساسية التقطها تلسكوب SPHEREx الفضائي في لحظة زمنية معينة، تسجل الضوء الصادر عن النجوم والغبار وسحب الغاز في السماء.'
                  : 'A calibrated infrared snapshot captured by the NASA SPHEREx space telescope at a specific moment, recording light emitted by stars, dust, and cosmic gas.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>2. {isRtl ? 'ماذا يعني السطوع (Brightness)؟' : 'What does brightness mean?'}</span>
              </h4>
              <p className="text-[11px]">
                {isRtl
                  ? 'يقاس السطوع بوحدة MJy/sr (ميغاجانسكي لكل ستيراديان)، وهي كمية الطاقة الإشعاعية تحت الحمراء المتدفقة من كل مساحة صغيرة في الفضاء.'
                  : 'Surface brightness is measured in MJy/sr (MegaJanskys per steradian), measuring the flux of infrared photons flowing from each region of the celestial sphere.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>3. {isRtl ? 'ما هي صورة الطرح الفلكي (Difference Image)؟' : 'What is a difference image (D = I₂ - I₁)?'}</span>
              </h4>
              <p className="text-[11px]">
                {isRtl
                  ? 'عند طرح لقطة الزيارة الأولى من لقطة الزيارة الثانية بعد محاذاتهما رياضياً بدقة، تختفي ملايين النجوم الثابتة لتصبح صفراً (لون محايد)، ولا يتبقى إلا الأجرام التي تغير سطوعها أو تحركت من مكانها!'
                  : 'By mathematically subtracting visit 1 from visit 2, all static background stars cancel out completely to zero, leaving only objects that flared, dimmed, or moved!'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>4. {isRtl ? 'ما هو المرشح (Candidate)؟' : 'What is a candidate?'}</span>
              </h4>
              <p className="text-[11px]">
                {isRtl
                  ? 'إشارة تغير إحصائية ذات دلالة (>5σ) تجاوزت مرشحات التحقق الآلية لضمان أنها ليست ضربة أشعة كونية أو عيباً في حساس الكاميرا.'
                  : 'A statistically robust signal (>5σ significance) that passed rigorous data quality masking to exclude cosmic-ray hits, camera jitter, or saturated pixels.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* D. Human-Readable Results Summary (Before Raw Metrics) */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 text-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-['Outfit']">
                {isRtl ? 'ملخص نتائج التحقيق' : 'Investigation Results Summary'}
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
                {filteredCandidates.length} {isRtl ? 'مرشحاً مرصوداً' : 'Candidate Changes'}
              </span>
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
              {filteredCandidates.length > 0 ? (
                strongestCandidate ? (
                  isRtl ? (
                    <>
                      تم رصد <strong className="text-amber-600 dark:text-amber-400">{filteredCandidates.length}</strong> تغيراً فلكياً في هذه المنطقة. أقوى إشارة تقع عند الإحداثيات (RA {strongestCandidate.ra.toFixed(4)}°، Dec {strongestCandidate.dec.toFixed(4)}°) وتظهر {strongestCandidate.deltaFlux > 0 ? 'ارتفاعاً في السطوع' : 'انخفاضاً في السطوع'} بمقدار <strong className="font-mono text-emerald-600 dark:text-emerald-400">{strongestCandidate.deltaFlux > 0 ? '+' : ''}{strongestCandidate.deltaFlux.toFixed(2)} MJy/sr</strong> وبمستوى ثقة إحصائية <strong className="font-mono text-amber-600 dark:text-amber-400">{strongestCandidate.peakSignificance.toFixed(1)}σ</strong>.
                    </>
                  ) : (
                    <>
                      We found <strong className="text-amber-600 dark:text-amber-400">{filteredCandidates.length}</strong> candidate changes in this region. The strongest change is at <strong className="font-mono">RA {strongestCandidate.ra.toFixed(4)}°, Dec {strongestCandidate.dec.toFixed(4)}°</strong>, showing a {strongestCandidate.deltaFlux > 0 ? 'brightening surge' : 'fading drop'} of <strong className="font-mono text-emerald-600 dark:text-emerald-400">{strongestCandidate.deltaFlux > 0 ? '+' : ''}{strongestCandidate.deltaFlux.toFixed(2)} MJy/sr</strong> at <strong className="font-mono text-amber-600 dark:text-amber-400">{strongestCandidate.peakSignificance.toFixed(1)}σ</strong> significance.
                    </>
                  )
                ) : null
              ) : (
                isRtl
                  ? 'لم يتم رصد أي تغيرات تفوق عتبة الضوضاء في هذه الرقعة، مما يدل على استقرار شديد في السطوع بين الزيارتين.'
                  : 'No significant changes detected above the background noise threshold. This patch exhibits remarkable photometric stability.'
              )}
            </p>
          </div>

          {/* Toggle Collapsible Scientific Evidence Drawer */}
          <button
            type="button"
            onClick={() => setShowScientificEvidenceDrawer(!showScientificEvidenceDrawer)}
            className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-xs font-mono text-slate-700 dark:text-slate-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
            <span>{isRtl ? 'الأدلة العلمية والقياسات' : 'Scientific Evidence & WCS'}</span>
            {showScientificEvidenceDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible Scientific Evidence Drawer */}
        {showScientificEvidenceDrawer && currentResult && (
          <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-mono text-slate-600 dark:text-slate-400 animate-in fade-in duration-150">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">WCS & Matrix Parameters</span>
              <div>Sampling: 6.15″ / pixel</div>
              <div>Matrix Size: {currentResult.sizePix} × {currentResult.sizePix} pixels</div>
              <div>Solid Angle: ~{(currentResult.fovArcmin ? Number(currentResult.fovArcmin) : 2.0).toFixed(2)}′ arcmin²</div>
              <div>Projection: TAN-SIP (Gnomonic)</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Variance & Photometry</span>
              <div>Intensity Unit: MJy/sr</div>
              <div>Noise Prop: σ_D = √(σ₁² + σ₂²)</div>
              <div>Significance Cut: 5.0σ</div>
              <div>DQ Bitmask: Flags saturated & cosmic ray hits</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">FITS Provenance & Archive</span>
              <div>Source: NASA/IPAC IRSA QR2</div>
              <div>Target: {currentResult.caseId || 'North Ecliptic Pole'}</div>
              <div>Registration: Rigid Subpixel Alignment</div>
              <div>Audit Status: Verified FITS Execution</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Primary Observation Perspective Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Core Stage Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleSelectViewMode('epoch1')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              viewMode === 'epoch1'
                ? 'bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <span>{t.step1FirstObs}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectViewMode('epoch2')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              viewMode === 'epoch2'
                ? 'bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <span>{t.step2SecondObs}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectViewMode('difference')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              viewMode === 'difference'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{t.step3WhatChanged}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectViewMode('significance')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              viewMode === 'significance'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <span>{t.step4HowStrong}</span>
          </button>

          {/* Sequential playback mode if multi-epoch available */}
          {currentResult?.epochs && currentResult.epochs.length >= 3 && (
            <button
              type="button"
              onClick={() => {
                handleSelectViewMode('sequence');
                setIsSequencePlaying(true);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'sequence'
                  ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-500" />
              <span>{isRtl ? 'تسلسل زمني (3 رصدات)' : '3-Epoch Sequence'}</span>
            </button>
          )}
        </div>

        {/* Secondary Comparison Tools: Split Slider & Fast Blink */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => handleSelectViewMode('split')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
              viewMode === 'split'
                ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 font-semibold'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Split swipe slider between observation 1 and 2"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{t.btnSplitSwipe}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectViewMode('blink')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
              viewMode === 'blink'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-semibold'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Fast automatic blink cadence between epochs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t.btnFastBlink}</span>
          </button>
        </div>
      </div>

      {/* 3. Multi-Epoch Sequence Controller (When Sequence mode or 3 epochs active) */}
      {currentResult?.epochs && currentResult.epochs.length >= 3 && (
        <div className="p-3.5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-cyan-600 dark:text-cyan-400">{t.labelMultiEpochTimeline}</span>
            <div className="flex gap-1.5">
              {currentResult.epochs.map((ep, idx) => (
                <button
                  key={ep.obsId}
                  type="button"
                  onClick={() => {
                    setActiveEpochIdx(idx);
                    if (viewMode !== 'sequence') setViewMode('sequence');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    activeEpochIdx === idx && (viewMode === 'sequence' || viewMode === 'epoch1')
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Exposure {idx + 1} ({ep.date.split(/[T ]/)[0]})
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (viewMode !== 'sequence') setViewMode('sequence');
                setIsSequencePlaying(!isSequencePlaying);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
            >
              {isSequencePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSequencePlaying ? t.btnTimelinePause : t.btnTimelinePlay}</span>
            </button>

            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-500">Speed:</span>
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSequenceSpeed(s)}
                  className={`px-1.5 py-0.5 rounded ${
                    sequenceSpeed === s ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Difference Pair Selector */}
            <div className="flex items-center gap-1 text-[11px] border-l border-slate-200 dark:border-white/10 pl-2">
              <span className="text-slate-500">{t.labelEpochPair}</span>
              {['1-3', '1-2', '2-3'].map((pair) => {
                const [i1, i2] = pair.split('-').map((n) => parseInt(n, 10) - 1);
                const eA = currentResult.epochs?.[i1];
                const eB = currentResult.epochs?.[i2];
                let deltaLabel = '';
                if (eA && eB && Number.isFinite(eA.mjd) && Number.isFinite(eB.mjd)) {
                  const dtSec = Math.abs(eB.mjd - eA.mjd) * 86400;
                  if (dtSec < 3600) {
                    deltaLabel = ` (${dtSec.toFixed(1)}s)`;
                  } else if (dtSec < 86400) {
                    deltaLabel = ` (${(dtSec / 60).toFixed(1)}m)`;
                  } else {
                    deltaLabel = ` (${(dtSec / 86400).toFixed(1)}d)`;
                  }
                }
                return (
                  <button
                    key={pair}
                    type="button"
                    onClick={() => {
                      setSelectedEpochPair(pair);
                      onSelectCase(currentResult.caseId, { sizePix: selectedFovSize, epochPair: pair });
                    }}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      selectedEpochPair === pair
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pair.replace('-', ' vs ')}
                    {deltaLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Split Slider Bar (when in Split mode) */}
      {viewMode === 'split' && (
        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center gap-4 text-xs">
          <span className="font-mono text-indigo-700 dark:text-indigo-300 font-semibold whitespace-nowrap">
            Epoch 1 (Left)
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={sliderPos}
            onChange={(e) => setSliderPos(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-ew-resize"
          />
          <span className="font-mono text-indigo-700 dark:text-indigo-300 font-semibold whitespace-nowrap">
            Epoch 2 (Right)
          </span>
        </div>
      )}

      {/* 5. Mobile Tab Switcher */}
      <div className="lg:hidden flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
        <button
          type="button"
          onClick={() => setMobileTab('canvas')}
          className={`flex-1 py-2 text-xs font-medium rounded-xl text-center transition-all ${
            mobileTab === 'canvas'
              ? 'bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {isRtl ? 'الصورة الفلكية' : 'Canvas Viewport'}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('findings')}
          className={`flex-1 py-2 text-xs font-medium rounded-xl text-center transition-all ${
            mobileTab === 'findings'
              ? 'bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {isRtl ? `المرشحون (${filteredCandidates.length})` : `Findings (${filteredCandidates.length})`}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('spex')}
          className={`flex-1 py-2 text-xs font-medium rounded-xl text-center transition-all ${
            mobileTab === 'spex'
              ? 'bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {isRtl ? 'مرشد SPEX' : 'SPEX Guide'}
        </button>
      </div>

      {/* 6. Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Canvas Viewport */}
        <div
          className={`lg:col-span-7 xl:col-span-8 space-y-3 ${
            mobileTab !== 'canvas' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="relative rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-slate-950 overflow-hidden shadow-xl aspect-square sm:aspect-[4/3] flex items-center justify-center select-none group">
            {isLoading && (
              <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-slate-300">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                <span className="text-xs font-mono tracking-wider">
                  {isRtl ? 'جارٍ تحميل مقطع FITS الحقيقي وتحليله...' : 'Querying & Processing Real NASA FITS...'}
                </span>
              </div>
            )}

            {/* Panning & Zooming Viewport Container */}
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={(e) => {
                handleMouseMovePan(e);
                handleCanvasMouseMove(e);
              }}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                handleMouseUp();
                handleCanvasMouseLeave();
              }}
              className={`w-full h-full flex items-center justify-center overflow-hidden ${
                isDragging ? 'cursor-grabbing' : 'cursor-crosshair'
              }`}
            >
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                }}
                className="relative inline-block select-none"
              >
                <canvas
                  ref={canvasRef}
                  className={`w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] rounded-xl shadow-2xl block ${
                    displayMode === 'science' ? 'image-rendering-pixelated' : 'image-rendering-auto'
                  }`}
                />

                {/* Subtle Astronomical Candidate Reticle Markers */}
                {markerVisibility !== 'hidden' &&
                  currentResult &&
                  filteredCandidates.map((cand) => {
                    const isSelected = selectedCandidate?.id === cand.id;
                    const isHovered = hoveredCandidate?.id === cand.id;
                    const isMoving =
                      cand.scientificClassification === 'POSSIBLE_MOVING_OBJECT' ||
                      cand.motion?.isMoving === true ||
                      cand.status === 'Moving object candidate';
                    const isArtifact =
                      cand.scientificClassification === 'REGISTRATION_OR_PSF_ARTIFACT' ||
                      cand.status === 'Possible artifact' ||
                      (cand.artifactScore ?? 0) >= 0.5;

                    const origW = currentResult.epoch1.width || 64;
                    const origH = currentResult.epoch1.height || 64;
                    const pctX = (((cand.centroidX ?? cand.x) + 0.5) / origW) * 100;
                    const pctY = (((cand.centroidY ?? cand.y) + 0.5) / origH) * 100;

                    const colorClass = isMoving
                      ? 'stroke-cyan-400 text-cyan-300'
                      : isArtifact
                      ? 'stroke-rose-400 text-rose-300'
                      : 'stroke-amber-400 text-amber-300';

                    return (
                      <div
                        key={cand.id}
                        style={{
                          left: `${pctX}%`,
                          top: `${pctY}%`,
                        }}
                        className="absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                        onMouseEnter={() => setHoveredCandidate(cand)}
                        onMouseLeave={() => setHoveredCandidate(null)}
                      >
                        {/* Interactive Clickable Reticle Target */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCandidate(cand);
                          }}
                          className="relative flex items-center justify-center w-6 h-6 -m-1 focus:outline-none cursor-pointer group"
                          aria-label={`Select candidate ${cand.id}`}
                        >
                          {/* Subtle Astronomical Reticle Ring with Crosshair Notches */}
                          <svg
                            viewBox="0 0 24 24"
                            className={`w-4 h-4 fill-none transition-transform duration-150 ${colorClass} ${
                              isSelected ? 'scale-125 stroke-[2.5]' : 'group-hover:scale-110 stroke-[1.5]'
                            }`}
                          >
                            <circle cx="12" cy="12" r="5" />
                            <line x1="12" y1="2" x2="12" y2="5" />
                            <line x1="12" y1="19" x2="12" y2="22" />
                            <line x1="2" y1="12" x2="5" y2="12" />
                            <line x1="19" y1="12" x2="22" y2="12" />
                          </svg>

                          {/* Selected High-Contrast Targeting Bracket */}
                          {isSelected && (
                            <div className="absolute inset-[-4px] rounded-xs pointer-events-none border border-amber-400/90 shadow-[0_0_12px_rgba(245,158,11,0.7)] animate-pulse" />
                          )}
                        </button>

                        {/* Floating Tooltip / Permanent Label Mode */}
                        {(isHovered || markerVisibility === 'labels' || isSelected) && (
                          <div
                            className={`absolute left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap z-30 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shadow-lg backdrop-blur-md transition-all ${
                              isSelected
                                ? 'bottom-full mb-2 bg-amber-500 text-slate-950 ring-1 ring-white/50'
                                : 'top-full mt-1.5 bg-slate-950/90 text-slate-200 border border-white/20'
                            }`}
                          >
                            <span>#{cand.id}</span>
                            <span className="mx-1 opacity-60">·</span>
                            <span className={isMoving ? 'text-cyan-300' : isArtifact ? 'text-rose-300' : 'text-amber-400'}>
                              {cand.peakSignificance >= 0 ? `+${cand.peakSignificance.toFixed(1)}σ` : `${cand.peakSignificance.toFixed(1)}σ`}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Viewport Floating HUD Readout */}
              <div className="absolute bottom-3 left-3 z-30 pointer-events-none bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-3">
                {cursorPos ? (
                  <>
                    <span>
                      X:{cursorPos.x} Y:{cursorPos.y}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-amber-300">
                      RA {cursorPos.ra?.toFixed(4)}° Dec {cursorPos.dec?.toFixed(4)}°
                    </span>
                    {cursorPos.val != null && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="tabular-nums font-semibold text-emerald-400">
                          {cursorPos.val.toFixed(2)}{' '}
                          {viewMode === 'significance' ? 'σ' : 'MJy/sr'}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500">
                    {t.hudHoverPrompt}
                  </span>
                )}
              </div>

              {/* Viewport Zoom & Reset Controls */}
              <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 4.0))}
                  title={t.btnZoomIn}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.75))}
                  title={t.btnZoomOut}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1.1);
                    setPan({ x: 0, y: 0 });
                  }}
                  title={t.btnResetView}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Observation Status Watermark Badge */}
              <div className="absolute top-3 left-3 z-30 pointer-events-none">
                <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-mono text-amber-400 font-semibold">
                  {viewMode === 'epoch1' && `${t.statusVisit1}: ${currentResult?.epoch1.metadata.date_obs || '2025-04-28T13:00:15.755'}`}
                  {viewMode === 'epoch2' && `${t.statusVisit2}: ${currentResult?.epoch2.metadata.date_obs || '2025-04-28T13:02:24.686'}`}
                  {viewMode === 'sequence' && `Exposure ${activeEpochIdx + 1}/${currentResult?.epochs?.length || 3}: ${currentResult?.epochs?.[activeEpochIdx]?.date || '2025-04-28'}`}
                  {viewMode === 'difference' && t.statusDifference}
                  {viewMode === 'significance' && t.statusSignificance}
                  {viewMode === 'split' && t.statusSplit}
                  {viewMode === 'blink' && t.statusBlink}
                </span>
              </div>

              {/* Toggle Markers & Provenance triggers */}
              <div className="absolute bottom-3 right-3 z-30 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMarkerVisibility((prev) =>
                      prev === 'reticles' ? 'labels' : prev === 'labels' ? 'hidden' : 'reticles'
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-black/80 backdrop-blur-md border border-white/10 transition-colors cursor-pointer text-amber-400 hover:text-amber-300 font-semibold"
                  title="Cycle marker display: subtle reticles -> all labels -> hide markers"
                >
                  {markerVisibility === 'reticles'
                    ? t.markerModeReticle
                    : markerVisibility === 'labels'
                    ? t.markerModeLabels
                    : t.markerModeHidden}
                </button>

                <button
                  type="button"
                  onClick={() => setShowProvenance(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-black/80 backdrop-blur-md border border-white/10 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.btnProvenance}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Physical Intensity Colorbar & Authentic Sampling Legend */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{t.labelIntensityScale}</span>
                <span className="text-slate-500 font-normal hidden sm:inline">
                  ({viewMode === 'significance' ? 'Signal Significance' : 'Infrared Surface Brightness'})
                </span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Native sampling: 6.15″/px · {displayMode === 'science' ? 'Raw Detector Grid' : 'DS9 Bilinear'}
              </span>
            </div>

            {/* Gradient Bar */}
            <div className="relative">
              <div
                style={{
                  background:
                    activeDataInfo.colormap === 'diff_diverging'
                      ? 'linear-gradient(to right, #00e5ff 0%, #0077b6 25%, #050a14 50%, #d97706 75%, #fbbf24 100%)'
                      : activeDataInfo.colormap === 'grayscale'
                      ? 'linear-gradient(to right, #000000 0%, #888888 50%, #ffffff 100%)'
                      : activeDataInfo.colormap === 'heat'
                      ? 'linear-gradient(to right, #000000 0%, #800020 30%, #e65100 65%, #ffea00 90%, #ffffff 100%)'
                      : activeDataInfo.colormap === 'inferno'
                      ? 'linear-gradient(to right, #000004 0%, #57106e 35%, #bb3754 65%, #f98e09 85%, #fcffa4 100%)'
                      : 'linear-gradient(to right, #440154 0%, #3b528b 33%, #21918c 66%, #5ec962 85%, #fde725 100%)',
                }}
                className="h-3 w-full rounded-md shadow-inner border border-white/10"
              />
              {/* Center Reference Mark for Difference Maps */}
              {activeDataInfo.isDiff && (
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/80 shadow-[0_0_4px_black]" />
              )}
            </div>

            {/* Intensity Tick Numbers */}
            <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {activeDataInfo.stats.min.toFixed(2)} {viewMode === 'significance' ? 'σ' : 'MJy/sr'}
              </span>
              <span className="text-slate-500 font-bold">
                {activeDataInfo.isDiff ? `0.00 (Null)` : `${activeDataInfo.stats.median.toFixed(2)} (Median)`}
              </span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                +{activeDataInfo.stats.max.toFixed(2)} {viewMode === 'significance' ? 'σ' : 'MJy/sr'}
              </span>
            </div>
          </div>

          {/* Astronomical Contrast, Stretch & Display Mode Settings */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {t.settingsTitle}
              </span>
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="text-amber-600 dark:text-amber-400 hover:underline text-xs cursor-pointer"
              >
                {showAdvancedSettings ? t.btnHideContrast : t.btnAdjustContrast}
              </button>
            </div>

            {showAdvancedSettings && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Display Interpolation Toggle */}
                  <div>
                    <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                      {t.labelDisplayMode}
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setDisplayMode('science')}
                        className={`flex-1 px-2 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                          displayMode === 'science'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400'
                        }`}
                        title="Display raw detector pixels honestly without artificial sub-pixel smoothing"
                      >
                        {t.modeNative}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDisplayMode('presentation')}
                        className={`flex-1 px-2 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                          displayMode === 'presentation'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400'
                        }`}
                        title="Astronomical bilinear interpolation (DS9 publication display)"
                      >
                        {t.modeBilinear}
                      </button>
                    </div>
                  </div>

                  {/* Contrast Multiplier */}
                  <div>
                    <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                      {t.labelContrast} ({contrastFactor.toFixed(1)}x)
                    </label>
                    <div className="flex gap-1">
                      {[0.5, 1.0, 1.5, 2.0].map((cf) => (
                        <button
                          key={cf}
                          type="button"
                          onClick={() => setContrastFactor(cf)}
                          className={`flex-1 px-2 py-1 rounded-lg text-xs font-mono cursor-pointer ${
                            Math.abs(contrastFactor - cf) < 0.05
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {cf === 1.0 ? '1.0x (Norm)' : `${cf}x`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                      {t.labelStretch}
                    </label>
                    <div className="flex gap-1">
                      {(['asinh', 'linear', 'sqrt', 'log'] as StretchMode[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStretch(st)}
                          className={`flex-1 px-2 py-1 rounded-lg text-xs font-mono uppercase cursor-pointer ${
                            stretch === st
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                      {t.labelColormap}
                    </label>
                    <div className="flex gap-1">
                      {(['diff_diverging', 'grayscale', 'heat', 'inferno', 'viridis'] as ColormapMode[]).map((cm) => (
                        <button
                          key={cm}
                          type="button"
                          onClick={() => setColormap(cm)}
                          className={`flex-1 px-1.5 py-1 rounded-lg text-xs font-mono capitalize cursor-pointer truncate ${
                            colormap === cm
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {cm === 'diff_diverging' ? 'Diverging' : cm}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: SPEX Companion & Findings List */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5">
          {/* Active, Grounded SPEX Companion */}
          <div className={mobileTab === 'findings' ? 'hidden lg:block' : 'block'}>
            <SpexCompanion
              currentResult={currentResult}
              selectedCandidate={selectedCandidate}
              externalPrompt={externalSpexPrompt}
              onClearExternalPrompt={() => setExternalSpexPrompt(null)}
              language={language}
            />
          </div>

          {/* Findings & Candidate Evidence Cards */}
          <div
            className={`space-y-3 ${
              mobileTab === 'spex' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold font-['Outfit'] text-slate-900 dark:text-slate-100">
                  {t.findingsTitle}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400">
                  {filteredCandidates.length}
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 text-[11px] font-mono">
                {(['all', 'candidates', 'known', 'artifacts'] as CandidateFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setCandidateFilter(f);
                      setCandidatePage(1);
                    }}
                    className={`px-2 py-0.5 rounded-md capitalize transition-colors cursor-pointer ${
                      candidateFilter === f
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidate Cards List */}
            <div className="space-y-3">
              {paginatedCandidates.length > 0 ? (
                paginatedCandidates.map((cand) => (
                  <FindingCard
                    key={cand.id}
                    candidate={cand}
                    isSelected={selectedCandidate?.id === cand.id}
                    onSelect={(c) => setSelectedCandidate(c)}
                    onLocate={(c) => centerOnCandidate(c)}
                    onAskSpex={(prompt) => setExternalSpexPrompt(prompt)}
                    onOpenPassport={(c) => {
                      setSelectedCandidate(c);
                      setShowDiscoveryReport(true);
                    }}
                    language={language}
                  />
                ))
              ) : (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] text-xs text-slate-500 font-mono">
                  {t.noFindings}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                <span>
                  {t.pageOf} {candidatePage} / {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={candidatePage <= 1}
                    onClick={() => setCandidatePage((p) => Math.max(p - 1, 1))}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={candidatePage >= totalPages}
                    onClick={() => setCandidatePage((p) => Math.min(p + 1, totalPages))}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coordinate Search Modal */}
      {isSearchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsSearchOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0c1220] shadow-2xl p-6 space-y-4 ${
              isRtl ? 'font-cairo' : 'font-sans'
            }`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base font-['Outfit'] text-slate-900 dark:text-slate-100">
                {t.searchModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Coverage Explanation Notice */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-700 dark:text-amber-200 space-y-1">
              <div className="font-bold text-amber-700 dark:text-amber-300">
                {t.searchCoverageNoticeTitle}
              </div>
              <p className="leading-relaxed">
                {t.searchCoverageNoticeText}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">
                  {t.searchLabelRa}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={customRa}
                  onChange={(e) => setCustomRa(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-500 dark:text-slate-400 block mb-1">
                  {t.searchLabelDec}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={customDec}
                  onChange={(e) => setCustomDec(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Verified SPHEREx QR2 Targets */}
            <div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1.5 font-medium">
                {t.searchVerifiedTargetsTitle}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: t.searchTargetNepVar, ra: 276.2614, dec: 64.8258 },
                  { name: t.searchTargetNepCal, ra: 275.9265, dec: 64.9585 },
                  { name: t.searchTargetNepMotion, ra: 276.1389, dec: 64.8361 },
                  { name: t.searchTargetNepField, ra: 275.8512, dec: 65.0998 },
                ].map((tgt) => (
                  <button
                    key={tgt.name}
                    type="button"
                    onClick={() => {
                      setCustomRa(tgt.ra.toString());
                      setCustomDec(tgt.dec.toString());
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-white/[0.05] hover:bg-amber-500/15 border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    {tgt.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                {t.searchBtnCancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  const raNum = parseFloat(customRa);
                  const decNum = parseFloat(customDec);
                  if (!Number.isNaN(raNum) && !Number.isNaN(decNum)) {
                    setIsSearchOpen(false);
                    onSearchTarget(raNum, decNum, selectedFovSize);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all cursor-pointer"
              >
                {t.searchBtnSubmit}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sky Coverage Explorer Modal */}
      {showSkyCoverage && (
        <SkyCoverageModal
          onClose={() => setShowSkyCoverage(false)}
          onSelectTarget={(tgt: ChallengeTarget) => {
            setCustomRa(tgt.ra.toString());
            setCustomDec(tgt.dec.toString());
          }}
          onSelectBenchmark={(benchId: string) => {
            onSelectCase(benchId, { sizePix: selectedFovSize, epochPair: selectedEpochPair });
          }}
          currentCoords={currentResult?.targetCoords}
          language={language}
        />
      )}

      {/* 102 Spectral Channels & SED Modal */}
      {showSpectralExplorer && (
        <SpectralExplorerModal
          onClose={() => setShowSpectralExplorer(false)}
          selectedCandidate={selectedCandidate}
          language={language}
        />
      )}

      {/* Discovery Passport Report Modal */}
      {showDiscoveryReport && selectedCandidate && currentResult && (
        <DiscoveryReportModal
          candidate={selectedCandidate}
          investigation={currentResult}
          onClose={() => setShowDiscoveryReport(false)}
          language={language}
        />
      )}

      {/* Candidate Comparison Modal */}
      {showCandidateComparison && currentResult && (
        <CandidateComparisonModal
          candidates={currentResult.candidates}
          investigation={currentResult}
          selectedCandidate={selectedCandidate}
          onSelectCandidate={(c) => {
            setSelectedCandidate(c);
            centerOnCandidate(c);
          }}
          onClose={() => setShowCandidateComparison(false)}
          language={language}
        />
      )}

      {/* Provenance Record Modal */}
      {showProvenance && currentResult?.provenance && (
        <ProvenanceModal
          provenance={currentResult.provenance}
          compatibility={currentResult.compatibility}
          evidence={currentResult.evidence}
          onClose={() => setShowProvenance(false)}
          language={language}
        />
      )}
    </div>
  );
};
