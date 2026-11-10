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
  Maximize2,
  Calendar,
  Clock,
  Filter,
  BarChart3,
  Check,
  Database,
  Share2,
  Download,
  History,
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
import { DataReleaseModal } from './DataReleaseModal';
import { VisualScienceExplainer } from './VisualScienceExplainer';
import { ExploreWelcomeCard } from './ExploreWelcomeCard';
import { InteractiveConceptExplainerModal } from './InteractiveConceptExplainerModal';
import { ChallengeTargetsBar } from './ChallengeTargetsBar';
import { QuickHelpQuestions } from './QuickHelpQuestions';
import { SpexInteractiveGuide } from './SpexInteractiveGuide';
import { EvidenceExportModal } from './EvidenceExportModal';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { Language, translations } from '../utils/translations';
import { SkySphereEntry } from './TimeLens/SkySphereEntry';
import { FramePlayer } from './TimeLens/FramePlayer';
import { CurtainDivider } from './TimeLens/CurtainDivider';
import { DiscoveryCard } from './TimeLens/DiscoveryCard';
import { PostcardModal } from './TimeLens/PostcardModal';
import { LensButton } from '../design/components/LensButton';

interface ExploreViewProps {
  currentResult: InvestigationResult | null;
  isLoading: boolean;
  onSearchTarget: (ra: number, dec: number, sizePix?: number) => void;
  onSelectCase: (caseId: string, options?: { sizePix?: number; epochPair?: string }) => void;
  cases: Array<{ id: string; title: string; category?: string; ra: number; dec: number }>;
  language: Language;
  fallbackQuery?: { ra: number; dec: number } | null;
  onClearFallback?: () => void;
}

export type ViewMode = 'difference' | 'significance' | 'epoch1' | 'epoch2' | 'split' | 'blink' | 'sequence';
export type CandidateFilter = 'all' | 'candidates' | 'known' | 'artifacts';
export type PresentationLevel = 'simple' | 'science';

export const ExploreView: React.FC<ExploreViewProps> = ({
  currentResult,
  isLoading,
  onSearchTarget,
  onSelectCase,
  cases,
  language,
  fallbackQuery,
  onClearFallback,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  // 1. Presentation Level: Simple Mode (Default) vs Science Details (Optional)
  const [presentationLevel, setPresentationLevel] = useState<PresentationLevel>('simple');

  // Primary Observation Perspective & Sequencer
  const [viewMode, setViewMode] = useState<ViewMode>('difference');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('presentation');
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
  const [blinkSpeed, setBlinkSpeed] = useState<number>(1);

  // Multi-Epoch Sequencer & Observation Selection
  const [activeEpochIdx, setActiveEpochIdx] = useState<number>(0);
  const [isSequencePlaying, setIsSequencePlaying] = useState<boolean>(false);
  const [sequenceSpeed, setSequenceSpeed] = useState<number>(1);
  const [selectedEpochPair, setSelectedEpochPair] = useState<string>('1-3');
  const [selectedFovSize, setSelectedFovSize] = useState<number>(64);
  const [epoch1Idx, setEpoch1Idx] = useState<number>(0);
  const [epoch2Idx, setEpoch2Idx] = useState<number>(1);

  // Sharing, History & Export
  const [shareToast, setShareToast] = useState<boolean>(false);
  const [showEvidenceExport, setShowEvidenceExport] = useState<boolean>(false);
  const [searchHistory, setSearchHistory] = useState<Array<{ ra: number; dec: number; label: string }>>(() => {
    try {
      const s = localStorage.getItem('spex_history');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  // Inspector Cursor Readout
  const [cursorPos, setCursorPos] = useState<{
    x: number;
    y: number;
    ra?: number;
    dec?: number;
    val?: number;
  } | null>(null);

  // Candidate Selection & Markers
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetection | null>(null);
  const [hoveredCandidate, setHoveredCandidate] = useState<CandidateDetection | null>(null);
  const [markerVisibility, setMarkerVisibility] = useState<'reticles' | 'labels' | 'hidden'>('reticles');
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
  const [showDataRelease, setShowDataRelease] = useState<boolean>(false);
  const [isExplainerOpen, setIsExplainerOpen] = useState<boolean>(false);
  const [showSkySphere, setShowSkySphere] = useState<boolean>(false);
  const [showPostcard, setShowPostcard] = useState<boolean>(false);
  const [activeLens, setActiveLens] = useState<'TIME' | 'HIDDEN_COLORS' | 'DOUBT' | 'NEIGHBORS' | null>(null);
  const viewerSectionRef = useRef<HTMLDivElement | null>(null);

  useModalBehavior(isSearchOpen, () => setIsSearchOpen(false));

  // Custom Coordinate Inputs
  const [customRa, setCustomRa] = useState<string>('276.2614');
  const [customDec, setCustomDec] = useState<string>('64.8258');

  // Progressive Disclosure Panels
  const [showInvestigatePanel, setShowInvestigatePanel] = useState<boolean>(false);
  const [showWhatAmILookingAt, setShowWhatAmILookingAt] = useState<boolean>(false);
  const [showScientificEvidenceDrawer, setShowScientificEvidenceDrawer] = useState<boolean>(false);

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mobile View Tab
  const [mobileTab, setMobileTab] = useState<'canvas' | 'findings' | 'spex'>('canvas');

  // Strongest candidate in active field
  const strongestCandidate = useMemo(() => {
    if (!currentResult?.candidates || currentResult.candidates.length === 0) return null;
    return [...currentResult.candidates].sort((a, b) => b.peakSignificance - a.peakSignificance)[0];
  }, [currentResult?.candidates]);

  // Overall detection status for Section 05
  const detectionStatus: 'NO_CLEAR_CHANGE' | 'POSSIBLE_CHANGE' | 'INSUFFICIENT_DATA' = useMemo(() => {
    if (!currentResult || !currentResult.epoch1 || !currentResult.epoch2) {
      return 'INSUFFICIENT_DATA';
    }
    if (currentResult.candidates.length > 0) {
      return 'POSSIBLE_CHANGE';
    }
    return 'NO_CLEAR_CHANGE';
  }, [currentResult]);

  // Precise Temporal Baseline & Observation Pair Analysis
  const timeBaselineInfo = useMemo(() => {
    if (!currentResult) return null;
    const allEpochs = currentResult.epochs || [
      {
        epochIndex: 1,
        obsId: currentResult.epoch1.metadata.obs_id,
        date: currentResult.epoch1.metadata.date_obs || '2025-04-28 13:00:15 UTC',
        mjd: currentResult.epoch1.metadata.t_min || 60793.5418,
      },
      {
        epochIndex: 2,
        obsId: currentResult.epoch2.metadata.obs_id,
        date: currentResult.epoch2.metadata.date_obs || '2025-04-28 13:02:24 UTC',
        mjd: currentResult.epoch2.metadata.t_min || 60793.5433,
      },
    ];

    const visitA = allEpochs[epoch1Idx] || allEpochs[0];
    const visitB = allEpochs[epoch2Idx] || allEpochs[1];
    const mjdA = (visitA as any).mjd || currentResult.epoch1.metadata.t_min || 0;
    const mjdB = (visitB as any).mjd || currentResult.epoch2.metadata.t_min || 0;
    const diffSec = Math.abs(mjdB - mjdA) * 86400;

    let formattedTime = `${diffSec.toFixed(1)}s`;
    if (diffSec >= 60 && diffSec < 3600) {
      formattedTime = `${(diffSec / 60).toFixed(1)} min (${diffSec.toFixed(0)}s)`;
    } else if (diffSec >= 3600 && diffSec < 86400) {
      formattedTime = `${(diffSec / 3600).toFixed(1)} hours`;
    } else if (diffSec >= 86400) {
      formattedTime = `${(diffSec / 86400).toFixed(1)} days`;
    }

    return {
      diffSec,
      formattedTime,
      isSame: epoch1Idx === epoch2Idx,
      dateA: visitA.date || currentResult.epoch1.metadata.date_obs || '',
      dateB: visitB.date || currentResult.epoch2.metadata.date_obs || '',
      obsIdA: (visitA as any).obsId || currentResult.epoch1.metadata.obs_id,
      obsIdB: (visitB as any).obsId || currentResult.epoch2.metadata.obs_id,
      totalVisits: allEpochs.length,
      allEpochs,
    };
  }, [currentResult, epoch1Idx, epoch2Idx]);

  // Sync URL query params with current investigation coordinates and FoV
  useEffect(() => {
    if (typeof window === 'undefined' || !currentResult) return;
    const curRa = currentResult.targetCoords?.ra;
    const curDec = currentResult.targetCoords?.dec;
    if (Number.isFinite(curRa) && Number.isFinite(curDec)) {
      const params = new URLSearchParams(window.location.search);
      params.set('ra', curRa.toFixed(4));
      params.set('dec', curDec.toFixed(4));
      params.set('fov', String(selectedFovSize));
      if (currentResult.caseId) params.set('case', currentResult.caseId);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);

      // Save to investigation history (deduplicated)
      setSearchHistory((prev) => {
        const filtered = prev.filter((h) => Math.abs(h.ra - curRa) > 0.01 || Math.abs(h.dec - curDec) > 0.01);
        const updated = [{ ra: curRa, dec: curDec, label: currentResult.title || `RA ${curRa.toFixed(3)}°` }, ...filtered].slice(0, 5);
        try {
          localStorage.setItem('spex_history', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  }, [currentResult?.caseId, currentResult?.targetCoords, selectedFovSize]);

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

  // Fast blink cadence timer with adjustable speed (0.5x, 1x, 2x)
  useEffect(() => {
    if (viewMode !== 'blink' || !isBlinking) return;
    const intervalMs = Math.round(450 / Math.max(0.2, blinkSpeed));
    const interval = setInterval(() => {
      setBlinkEpoch((prev) => (prev === 'epoch1' ? 'epoch2' : 'epoch1'));
    }, intervalMs);
    return () => clearInterval(interval);
  }, [viewMode, isBlinking, blinkSpeed]);

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

  // Render scientific FITS data onto the canvas
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

  const handleSelectEpoch = (which: 'epoch1' | 'epoch2', newIdx: number) => {
    const next1 = which === 'epoch1' ? newIdx : epoch1Idx;
    const next2 = which === 'epoch2' ? newIdx : epoch2Idx;
    if (which === 'epoch1') setEpoch1Idx(newIdx);
    if (which === 'epoch2') setEpoch2Idx(newIdx);

    if (next1 !== next2 && currentResult?.caseId) {
      const pairStr = `${next1 + 1}-${next2 + 1}`;
      setSelectedEpochPair(pairStr);
      onSelectCase(currentResult.caseId, { sizePix: selectedFovSize, epochPair: pairStr });
    }
  };

  const handleSelectFov = (size: number) => {
    setSelectedFovSize(size);
    if (currentResult?.targetCoords) {
      onSearchTarget(currentResult.targetCoords.ra, currentResult.targetCoords.dec, size);
    }
  };

  const handleShareLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 3000);
  };

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6 space-y-6 select-none" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* =========================================================================
          TOP BAR: Observatory Status, FoV Selector, Actions & Level Switcher
         ========================================================================= */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/95 via-[#0c1220] to-slate-900/95 border border-cyan-500/30 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-wide font-['Outfit']">
                {isRtl ? 'مرصد SPHEREx — سماء الكون المتغيرة' : 'SPHEREx Observatory — The Changing Sky'}
              </h1>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span className="text-cyan-400 font-semibold">
                  RA {currentResult?.targetCoords?.ra?.toFixed(4) ?? '276.2614'}° · Dec {currentResult?.targetCoords?.dec != null && currentResult.targetCoords.dec >= 0 ? '+' : ''}{currentResult?.targetCoords?.dec?.toFixed(4) ?? '+64.8258'}°
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-amber-300">
                  FOV {selectedFovSize}px (~{(selectedFovSize * 6.15 / 60).toFixed(1)}′)
                </span>
                <span className="text-slate-600 hidden sm:inline">·</span>
                <button
                  type="button"
                  onClick={() => setShowDataRelease(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-400 hover:bg-emerald-500/25 transition cursor-pointer font-mono"
                  title="Dataset: NASA/IPAC IRSA QR2 Level-2B Benchmark Cutouts · QR3 Ingestion Engine Ready"
                >
                  <Database className="w-3 h-3 text-emerald-400" />
                  <span>Release: {currentResult?.releaseId || 'SPHEREx-QR2-Level2B'} (Benchmark Cutouts)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Center/Right Controls: FoV Pills, Guide Me, Share, Export & Simple/Science Toggle */}
        <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-auto">
          {/* FoV Selection Pills */}
          <div className="flex items-center p-1 bg-slate-950/80 rounded-2xl border border-slate-800 text-[11px] font-mono">
            <span className="px-2 text-slate-500 hidden sm:inline">FOV:</span>
            {[
              { size: 32, label: '32px (3.3′)' },
              { size: 64, label: '64px (6.6′)' },
              { size: 112, label: '112px (11.6′)' },
              { size: 160, label: '160px (16.5′)' },
            ].map(({ size, label }) => (
              <button
                key={size}
                type="button"
                onClick={() => handleSelectFov(size)}
                className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer ${
                  selectedFovSize === size
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Quick Guide Trigger */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('spex:replay-tour'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 transition cursor-pointer shadow-sm active:scale-95"
            title={isRtl ? 'إعادة تشغيل الجولة الإرشادية' : 'Replay Guided Tour'}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{isRtl ? 'دليل الجولة' : 'Guide Me'}</span>
          </button>

          {/* Sky Sphere Map Toggle */}
          <button
            type="button"
            onClick={() => setShowSkySphere(!showSkySphere)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border active:scale-95 ${
              showSkySphere
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.4)]'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-cyan-500/30'
            }`}
            title={isRtl ? 'فتح خريطة السماء الكروية التفاعلية' : 'Open 3D Interactive Sky Sphere'}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>{showSkySphere ? (isRtl ? 'إخفاء الخريطة' : 'Hide Sky Map') : (isRtl ? 'خريطة السماء' : 'Sky Sphere')}</span>
          </button>

          {/* Share Discovery Postcard Button */}
          <button
            type="button"
            onClick={() => setShowPostcard(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 transition cursor-pointer active:scale-95"
            title={isRtl ? 'تصدير بطاقة اكتشاف مصورة للمشاركة' : 'Generate Shareable Discovery Postcard'}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isRtl ? 'بطاقة الاكتشاف' : 'Postcard'}</span>
          </button>

          {/* Share Link Button */}
          <button
            type="button"
            onClick={handleShareLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer active:scale-95"
            title={isRtl ? 'نسخ رابط الموقع الحالي للمشاركة' : 'Copy link to this exact sky view'}
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isRtl ? 'مشاركة' : 'Share'}</span>
          </button>

          {/* Export Dossier Button */}
          <button
            type="button"
            onClick={() => setShowEvidenceExport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer active:scale-95"
            title={isRtl ? 'تصدير ملف التحقيق الفلكي' : 'Export Discovery Dossier (Markdown)'}
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isRtl ? 'تقرير التحقيق' : 'Export'}</span>
          </button>

          {/* Presentation Switcher Pill */}
          <div className="flex items-center p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setPresentationLevel('simple')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                presentationLevel === 'simple'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{isRtl ? 'مبسط' : 'Simple'}</span>
            </button>

            <button
              type="button"
              onClick={() => setPresentationLevel('science')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                presentationLevel === 'science'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isRtl ? 'علمي' : 'Science'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Share Toast Banner */}
      {shareToast && (
        <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 text-xs font-mono flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>
              {isRtl
                ? 'تم نسخ رابط التحقيق إلى الحافظة! يمكن لأي شخص فتحه لرؤية هذا الموقع السماوي بدقة.'
                : 'Investigation URL copied to clipboard! Anyone opening this link will see this exact sky location.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShareToast(false)}
            className="text-cyan-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Interactive Sky Sphere Modal / Drawer View */}
      {showSkySphere && (
        <div className="p-4 sm:p-6 rounded-3xl bg-slate-950/95 border-2 border-cyan-500/40 shadow-2xl backdrop-blur-xl animate-in fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                <Globe2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-serif">
                  {isRtl ? 'خريطة السماء الكروية التفاعلية — اختر نقطة الرصد' : 'Interactive Sky Sphere — Pick an Observation Point'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {isRtl ? 'انقر على أي جرم أو اسحب الكرة السماوية للاستكشاف' : 'Tap any pulsing target or drag the celestial sphere to navigate'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSkySphere(false)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition"
              aria-label="Close Sky Sphere"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <SkySphereEntry
            language={language}
            onLaunchTarget={(targetId, ra, dec) => {
              setCustomRa(ra.toString());
              setCustomDec(dec.toString());
              onSelectCase(targetId, { sizePix: selectedFovSize, epochPair: selectedEpochPair });
              setShowSkySphere(false);
            }}
            onLaunchCoords={(ra, dec) => {
              setCustomRa(ra.toString());
              setCustomDec(dec.toString());
              onSearchTarget(ra, dec, selectedFovSize);
              setShowSkySphere(false);
            }}
          />
        </div>
      )}

      {/* Reference Benchmark Fallback Banner */}
      {fallbackQuery && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 text-xs shadow-lg space-y-3 backdrop-blur-md animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold uppercase tracking-wider text-[10px]">
                {t.referenceBenchmarkBadge}
              </span>
              <span className="font-mono text-amber-300 font-semibold">
                {isRtl ? 'إحداثيات الهدف المطلوب:' : 'Requested target coordinates:'}{' '}
                RA {fallbackQuery.ra.toFixed(4)}°, Dec {fallbackQuery.dec.toFixed(4)}°
              </span>
            </div>
            {onClearFallback && (
              <button
                type="button"
                onClick={onClearFallback}
                className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>{t.btnReturnToSearch}</span>
              </button>
            )}
          </div>
          <p className="text-amber-200/90 leading-relaxed font-sans">
            {t.referenceBenchmarkNotice}
          </p>
          <div className="text-[11px] font-mono text-amber-300/70 flex items-center gap-2">
            <span>{isRtl ? 'حقل المقارنة المعروض حالياً: مسح القطب الشمالي لمسار الشمس (NEP Benchmark)' : 'Currently displayed reference field: North Ecliptic Pole survey benchmark (RA ~276.15°, Dec ~64.85°)'}</span>
          </div>
        </div>
      )}

      {/* SPEX Interactive 7-Step Guide & Welcome Card */}
      <SpexInteractiveGuide
        language={language}
        onOpenExplainerModal={() => setIsExplainerOpen(true)}
      />

      {/* Welcome Card for First-Time Explorers */}
      <ExploreWelcomeCard
        onStartExploring={() => viewerSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
        onOpenExplainer={() => setIsExplainerOpen(true)}
        language={language}
      />

      {/* =========================================================================
          EXPLORE THE CHANGING SKY: EXACT 6 SECTIONS IN INTUITIVE ORDER
         ========================================================================= */}
      <div ref={viewerSectionRef} className="space-y-6">

        {/* =========================================================================
            SECTION 01 — EXPLORE THE SKY: SEARCH, PRESETS & CELESTIAL COORDINATES
           ========================================================================= */}
        <section id="explore-search-step" className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06] pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-bold text-[11px] tracking-wider uppercase">
                  01
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
                  {isRtl ? '01 — استكشف السماء (Explore the Sky)' : '01 — Explore the Sky'}
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                {isRtl
                  ? 'اختر منطقة في السماء وشاهد ما رصده تلسكوب SPHEREx. يقاس موقع السماء بإحداثيين: المطلع المستقيم (RA) والميل (Dec).'
                  : 'Choose a region of the sky and see what SPHEREx has observed. Coordinates work like GPS for deep space: Right Ascension (RA) and Declination (Dec).'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
              <select
                value={currentResult?.caseId || ''}
                onChange={(e) => onSelectCase(e.target.value, { sizePix: selectedFovSize, epochPair: selectedEpochPair })}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-200 hover:border-amber-400 focus:outline-none transition cursor-pointer"
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-sm active:scale-95"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isRtl ? 'بحث بالإحداثيات' : 'Search Coordinates'}</span>
              </button>
            </div>
          </div>

          {/* Lightweight Search History Chips */}
          {searchHistory.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                <History className="w-3 h-3 text-slate-500" />
                {isRtl ? 'المواقع الأخيرة:' : 'Recent:'}
              </span>
              {searchHistory.map((item, idx) => (
                <button
                  key={`${item.ra}-${item.dec}-${idx}`}
                  type="button"
                  onClick={() => {
                    setCustomRa(item.ra.toString());
                    setCustomDec(item.dec.toString());
                    onSearchTarget(item.ra, item.dec, selectedFovSize);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-amber-500/10 border border-slate-200 dark:border-white/[0.08] hover:border-amber-500/40 text-slate-700 dark:text-slate-300 text-[11px] transition cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Guided Target Presets Cards */}
          <div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-2 font-medium">
              {isRtl ? 'أمثلة ومناطق مقترحة للبدء السريع (حقول SPHEREx الحقيقية):' : 'Quick Starting Suggestions (Authentic SPHEREx Regions):'}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { 
                  name: isRtl ? 'نجم متغير مثير' : 'Interesting Variable Star', 
                  sub: isRtl ? 'توهج قوي بمستوى 7.8σ' : 'NEP Deep Variable (7.8σ flare)', 
                  ra: 276.2614, 
                  dec: 64.8258,
                  badge: isRtl ? 'توهج' : 'Surge'
                },
                { 
                  name: isRtl ? 'منطقة مرجعية هادئة' : 'Calm Reference Region', 
                  sub: isRtl ? 'معيار استقرار ضوئي 0.0σ' : 'Calibration Standard (Null 0.0σ)', 
                  ra: 275.9265, 
                  dec: 64.9585,
                  badge: isRtl ? 'ثابت' : 'Stable'
                },
                { 
                  name: isRtl ? 'نجم سريع الحركة' : 'Fast-Moving Star', 
                  sub: isRtl ? 'بصمة حركة ثنائية 14.2″' : 'Proper Motion Star (14.2″ shift)', 
                  ra: 276.1389, 
                  dec: 64.8361,
                  badge: isRtl ? 'حركة' : 'Motion'
                },
                { 
                  name: isRtl ? 'حقل كوني عميق' : 'Deep Calm Field', 
                  sub: isRtl ? 'خلفية هادئة للمجرة' : 'Deep NEP Quiet Sky', 
                  ra: 275.8512, 
                  dec: 65.0998,
                  badge: isRtl ? 'عميق' : 'Quiet'
                },
              ].map((tgt) => (
                <button
                  key={tgt.name}
                  type="button"
                  onClick={() => {
                    setCustomRa(tgt.ra.toString());
                    setCustomDec(tgt.dec.toString());
                    onSearchTarget(tgt.ra, tgt.dec, selectedFovSize);
                  }}
                  className="p-3 rounded-2xl text-left bg-slate-50 dark:bg-white/[0.03] hover:bg-amber-500/10 border border-slate-200 dark:border-white/[0.08] hover:border-amber-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition-colors">
                      {tgt.name}
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 font-mono font-semibold">
                      {tgt.badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    {tgt.sub}
                  </div>
                  <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono mt-1">
                    RA {tgt.ra}° · Dec +{tgt.dec}°
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Visual Celestial Coordinates Explanation Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/5 via-cyan-500/5 to-transparent border border-slate-200 dark:border-white/[0.08] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0 font-bold font-mono">
                RA
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  {isRtl ? 'المطلع المستقيم (Right Ascension - RA): خط طول السماء' : 'Right Ascension (RA): Sky Longitude (0° to 360°)'}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {isRtl
                    ? 'يقيس الموضع شرقاً وغرباً على طول خط الاستواء السماوي بالدرجات من 0° إلى 360°.'
                    : 'Measures position East-to-West along the celestial equator from 0° to 360°.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 shrink-0 font-bold font-mono">
                Dec
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  {isRtl ? 'الميل السماوي (Declination - Dec): دائرة عرض السماء' : 'Declination (Dec): Sky Latitude (-90° to +90°)'}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {isRtl
                    ? 'يقيس الموضع شمالاً (+) أو جنوباً (-) من خط الاستواء السماوي نحو القطبين.'
                    : 'Measures position North (+) or South (-) from the celestial equator toward the poles.'}
                </p>
              </div>
            </div>
          </div>

          {/* 5 Official NASA Challenge Targets with Honest Footprint & Test Query */}
          <ChallengeTargetsBar
            onSelectTarget={(ra: number, dec: number) => {
              setCustomRa(ra.toString());
              setCustomDec(dec.toString());
              onSearchTarget(ra, dec, selectedFovSize);
            }}
            onLoadBenchmarkAnalogue={(benchId: string) => {
              onSelectCase(benchId, { sizePix: selectedFovSize, epochPair: selectedEpochPair });
            }}
            language={language}
          />
        </section>

        {/* =========================================================================
            SECTION 02 — YOUR OBSERVATIONS: TIMELINE, BASELINE & SEQUENTIAL PLAYBACK
           ========================================================================= */}
        <section id="explore-timeline-step" className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/[0.06] pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-mono font-bold text-[11px] tracking-wider uppercase">
                  02
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
                  {isRtl ? '02 — رصداتك الفلكية (Your Observations)' : '02 — Your Observations'}
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                {isRtl
                  ? 'شاهد الجدول الزمني لرصدات SPHEREx في هذه المنطقة وحدد الزيارات للمقارنة أو شغل التسلسل الزمني.'
                  : 'View the timeline of all SPHEREx observations for this region and select visits to compare or step through.'}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {timeBaselineInfo ? `Δt = ${timeBaselineInfo.formattedTime}` : 'Pair Selected'}
              </span>
            </div>
          </div>

          {/* Visual Timeline Cards of ALL Valid Observations (N >= 1) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                {isRtl ? 'الجدول الزمني لجميع الرصدات المتاحة:' : 'Visual Timeline of All Valid Observations:'}
              </span>
              <span className="text-[11px] font-mono text-cyan-500 font-bold">
                {timeBaselineInfo?.totalVisits || 2} {isRtl ? 'زيارات رصد' : 'Visits'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {timeBaselineInfo?.allEpochs.map((ep, idx) => {
                const isEarlier = epoch1Idx === idx;
                const isLater = epoch2Idx === idx;
                const isPlayingActive = viewMode === 'sequence' && activeEpochIdx === idx;

                return (
                  <div
                    key={`timeline-card-${idx}`}
                    className={`p-2.5 rounded-xl border text-xs font-mono transition-all ${
                      isPlayingActive
                        ? 'bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400'
                        : isEarlier && isLater
                        ? 'bg-purple-500/15 border-purple-400'
                        : isEarlier
                        ? 'bg-cyan-500/15 border-cyan-400'
                        : isLater
                        ? 'bg-amber-500/15 border-amber-400'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Visit {idx + 1}
                      </span>
                      {isPlayingActive && (
                        <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {ep.date ? ep.date.split(' ')[0] : '2025-04-28'}
                    </div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {ep.obsId ? ep.obsId.split('_').slice(-2).join('_') : `Obs ${idx + 1}`}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        type="button"
                        onClick={() => handleSelectEpoch('epoch1', idx)}
                        className={`flex-1 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${
                          isEarlier
                            ? 'bg-cyan-500 text-slate-950'
                            : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-white'
                        }`}
                        title="Set as Visit 1 (Earlier)"
                      >
                        V1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectEpoch('epoch2', idx)}
                        className={`flex-1 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${
                          isLater
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-white'
                        }`}
                        title="Set as Visit 2 (Later)"
                      >
                        V2
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Baseline Interval Suggestions */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            <span className="text-slate-400 text-[11px] font-medium">
              {isRtl ? 'اقتراحات الفاصل الزمني:' : 'Suggested Intervals:'}
            </span>
            <button
              type="button"
              onClick={() => {
                handleSelectEpoch('epoch1', 0);
                handleSelectEpoch('epoch2', 1);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-cyan-500/10 border border-slate-200 dark:border-white/[0.08] hover:border-cyan-500/40 text-cyan-600 dark:text-cyan-400 text-[11px] transition cursor-pointer"
            >
              Short Interval (~128.9s)
            </button>
            {(timeBaselineInfo?.totalVisits || 0) > 2 && (
              <button
                type="button"
                onClick={() => {
                  const mid = Math.floor((timeBaselineInfo?.totalVisits || 3) / 2);
                  handleSelectEpoch('epoch1', 0);
                  handleSelectEpoch('epoch2', mid);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-indigo-500/10 border border-slate-200 dark:border-white/[0.08] hover:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 text-[11px] transition cursor-pointer"
              >
                Medium Interval
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const lastIdx = (timeBaselineInfo?.totalVisits || 2) - 1;
                handleSelectEpoch('epoch1', 0);
                handleSelectEpoch('epoch2', lastIdx);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-amber-500/10 border border-slate-200 dark:border-white/[0.08] hover:border-amber-500/40 text-amber-600 dark:text-amber-400 text-[11px] transition cursor-pointer"
            >
              Longest Interval (Full Baseline)
            </button>
          </div>

          {/* Interactive Observation Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visit A Selector */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {isRtl ? 'الرصدة الأولى (Visit 1 - البداية)' : 'Observation 1 (Visit 1 - Earlier Baseline)'}
                </span>
                <span className="text-[10px] font-mono text-slate-500">I₁(x,y)</span>
              </div>

              <select
                value={epoch1Idx}
                onChange={(e) => handleSelectEpoch('epoch1', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
              >
                {timeBaselineInfo?.allEpochs.map((ep, idx) => (
                  <option key={`ep1-${idx}`} value={idx}>
                    Visit {idx + 1}: {ep.date || `Obs ${idx + 1}`} ({ep.obsId || 'SPHEREx Visit'})
                  </option>
                ))}
              </select>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Timestamp: {timeBaselineInfo?.dateA || '2025-04-28 13:00:15 UTC'}
              </div>
            </div>

            {/* Visit B Selector */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {isRtl ? 'الرصدة الثانية (Visit 2 - المقارنة)' : 'Observation 2 (Visit 2 - Comparison)'}
                </span>
                <span className="text-[10px] font-mono text-slate-500">I₂(x,y)</span>
              </div>

              <select
                value={epoch2Idx}
                onChange={(e) => handleSelectEpoch('epoch2', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {timeBaselineInfo?.allEpochs.map((ep, idx) => (
                  <option key={`ep2-${idx}`} value={idx}>
                    Visit {idx + 1}: {ep.date || `Obs ${idx + 1}`} ({ep.obsId || 'SPHEREx Visit'})
                  </option>
                ))}
              </select>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Timestamp: {timeBaselineInfo?.dateB || '2025-04-28 13:02:24 UTC'}
              </div>
            </div>
          </div>

          {/* Sequential Playback Controls Bar */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setViewMode('sequence');
                  setIsSequencePlaying(!isSequencePlaying);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shadow-sm ${
                  isSequencePlaying
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {isSequencePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isSequencePlaying ? (isRtl ? 'إيقاف التسلسل' : 'Pause Sequence') : (isRtl ? 'تشغيل التسلسل' : 'Play Sequence')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('sequence');
                  setActiveEpochIdx((prev) => (prev - 1 + (timeBaselineInfo?.totalVisits || 1)) % (timeBaselineInfo?.totalVisits || 1));
                }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
                title="Previous Visit"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('sequence');
                  setActiveEpochIdx((prev) => (prev + 1) % (timeBaselineInfo?.totalVisits || 1));
                }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
                title="Next Visit"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="text-slate-400 text-[11px] px-2 py-1 rounded bg-black/40">
                {isRtl ? `الرصدة ${activeEpochIdx + 1} من ${timeBaselineInfo?.totalVisits || 2}` : `Visit ${activeEpochIdx + 1} of ${timeBaselineInfo?.totalVisits || 2}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">{isRtl ? 'السرعة:' : 'Speed:'}</span>
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={`seq-spd-${spd}`}
                  type="button"
                  onClick={() => setSequenceSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    sequenceSpeed === spd
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Warning if Identical Dates Selected */}
          {timeBaselineInfo?.isSame && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {isRtl
                  ? 'تحذير: لقد اخترت نفس الرصدة في الزيارتين! سيكون ناتج الطرح صفراً (D = 0). يرجى اختيار رصدتين بموعدين مختلفين.'
                  : 'Identical observations selected: subtraction will be zero (D = 0). Please select two different observation dates to compare changes.'}
              </span>
            </div>
          )}

          {/* Why the Time Difference Matters (Astronomical Context) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isRtl ? 'لماذا يعد الفارق الزمني حاسماً في علم الفلك؟' : 'Why the Time Separation (Δt) Matters:'}</span>
            </div>
            <p>
              {isRtl
                ? '• الفواصل الزمنية القصيرة (دقائق إلى ساعات): تكشف التوهجات النجمية المفاجئة، والكويكبات السريعة، وتغيرات السطوع السريعة.'
                : '• Short time baselines (minutes to hours): Detect rapid stellar flares, passing asteroids, and variable star pulsations.'}
            </p>
            <p>
              {isRtl
                ? '• الفواصل الزمنية الطويلة (أشهر إلى سنوات): تكشف الحركة الخاصة للنجوم القريبة (مثل نجم برنارد) حيث يظهر النجم متحركاً بالنسبة للنجوم البعيدة.'
                : '• Long time baselines (months to years): Detect proper motion (stellar shift across the sky) for nearby cold stars like Barnard’s Star and brown dwarf WISE 0855.'}
            </p>
          </div>
        </section>

        {/* =========================================================================
            SECTION 03 — SEE THE IMAGE: LARGE ASTRONOMICAL SKY VIEWPORT
           ========================================================================= */}
        <section id="explore-viewer-step" className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-slate-950 p-4 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-mono font-bold text-[11px] tracking-wider uppercase">
                  03
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white font-['Outfit']">
                  {isRtl ? '03 — شاهد الصورة الفلكية (See the Image)' : '03 — See the Image'}
                </h3>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                {isRtl
                  ? 'هذه صورة بالأشعة تحت الحمراء للمنطقة المحددة التقطها تلسكوب SPHEREx. تشير المناطق الأكثر سطوعاً إلى طاقة تحت حمراء أكبر من النجوم والغبار الكوني.'
                  : 'This is an infrared image of the selected region taken by SPHEREx. Brighter areas indicate higher infrared energy from stars, gas, and cosmic dust.'}
              </p>
            </div>

            {/* Detector Pixels vs Presentation Smooth View Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setDisplayMode('presentation')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition cursor-pointer ${
                  displayMode === 'presentation'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Smooth Gaussian PSF presentation resampling"
              >
                {isRtl ? 'عرض فلكي ناعم (DS9)' : 'Smooth View (Default)'}
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('science')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition cursor-pointer ${
                  displayMode === 'science'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Raw un-interpolated detector pixels"
              >
                {isRtl ? 'بكسلات الحساس الحقيقية' : 'Raw Detector Pixels'}
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="relative rounded-2xl border border-white/10 bg-black overflow-hidden aspect-[4/3] max-h-[560px] flex items-center justify-center select-none group">
            {isLoading && (
              <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-slate-300">
                <div className="w-9 h-9 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                <span className="text-xs font-mono tracking-wider">
                  {isRtl ? 'جارٍ معالجة بيانات FITS الحقيقية بدقة...' : 'Processing Real SPHEREx Level-2B FITS...'}
                </span>
              </div>
            )}

            {/* Viewport Pan/Zoom container */}
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
                  className={`w-[360px] h-[360px] sm:w-[500px] sm:h-[500px] rounded-xl shadow-2xl block ${
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCandidate(cand);
                          }}
                          className="relative flex items-center justify-center w-6 h-6 -m-1 focus:outline-none cursor-pointer group"
                          aria-label={`Select candidate ${cand.id}`}
                        >
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

                          {isSelected && (
                            <div className="absolute inset-[-4px] rounded-xs pointer-events-none border border-amber-400/90 shadow-[0_0_12px_rgba(245,158,11,0.7)] animate-pulse" />
                          )}
                        </button>

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

              {/* Top-Right Viewport Tools (Zoom & Reset) */}
              <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 4.0))}
                  title="Zoom in"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.75))}
                  title="Zoom out"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1.1);
                    setPan({ x: 0, y: 0 });
                  }}
                  title="Reset view"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Top-Left Viewport Mode Badge */}
              <div className="absolute top-3 left-3 z-30 pointer-events-none">
                <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-mono text-amber-400 font-semibold">
                  {viewMode === 'epoch1' && `${t.statusVisit1}: ${currentResult?.epoch1.metadata.date_obs || '2025-04-28'}`}
                  {viewMode === 'epoch2' && `${t.statusVisit2}: ${currentResult?.epoch2.metadata.date_obs || '2025-04-28'}`}
                  {viewMode === 'sequence' && (isRtl ? `تسلسل زمني: رصدة ${activeEpochIdx + 1}` : `Sequence: Visit ${activeEpochIdx + 1}`)}
                  {viewMode === 'difference' && (isRtl ? 'صورة الفروقات (ما الذي تغير؟)' : 'Difference Image (What Changed)')}
                  {viewMode === 'significance' && (isRtl ? 'خريطة قوة الإشارة الإحصائية' : 'Signal Significance Map (σ)')}
                  {viewMode === 'split' && (isRtl ? 'المقارنة بالشريط المقسم' : 'Split Swipe Comparison')}
                  {viewMode === 'blink' && (isRtl ? 'الوميض السريع بين الرصدتين' : 'Fast Cadence Blink')}
                </span>
              </div>

              {/* Bottom-Left Cursor Readout */}
              <div className="absolute bottom-3 left-3 z-30 pointer-events-none bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-3">
                {cursorPos ? (
                  <>
                    <span>Pixel ({cursorPos.x}, {cursorPos.y})</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-amber-300">
                      RA {cursorPos.ra?.toFixed(4)}° Dec {cursorPos.dec != null && cursorPos.dec >= 0 ? '+' : ''}{cursorPos.dec?.toFixed(4)}°
                    </span>
                    {cursorPos.val != null && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="font-semibold text-emerald-400">
                          {cursorPos.val.toFixed(2)} {viewMode === 'significance' ? 'σ' : 'MJy/sr'}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500">
                    {isRtl ? 'حرك الفأرة لقراءة السطوع والإحداثيات' : 'Hover over image to inspect pixel brightness'}
                  </span>
                )}
              </div>

              {/* Bottom-Right Markers Toggle */}
              <div className="absolute bottom-3 right-3 z-30">
                <button
                  type="button"
                  onClick={() => {
                    setMarkerVisibility((prev) =>
                      prev === 'reticles' ? 'labels' : prev === 'labels' ? 'hidden' : 'reticles'
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-black/80 backdrop-blur-md border border-white/10 text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                >
                  {markerVisibility === 'reticles' ? 'Markers: Reticles' : markerVisibility === 'labels' ? 'Markers: Labels' : 'Markers: Hidden'}
                </button>
              </div>
            </div>
          </div>

          {/* Physical Brightness Colorbar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="font-semibold text-slate-200">
                {isRtl ? 'مقياس السطوع الإشعاعي:' : 'Image Brightness Scale:'}
              </span>
              <span>
                {activeDataInfo.isDiff
                  ? (isRtl ? 'أزرق = خافت/اختفى | داكن = ثابت | ذهبي = ازداد سطوعاً' : 'Cyan = Dimmed | Dark = Unchanged | Amber = Brightened')
                  : (isRtl ? 'داكن = سماء هادئة | ساطع = نجوم وغاز' : 'Dark = Empty Sky | Bright = Stars & Dust')}
              </span>
            </div>

            <div className="relative">
              <div
                style={{
                  background:
                    activeDataInfo.colormap === 'diff_diverging'
                      ? 'linear-gradient(to right, #00e5ff 0%, #0077b6 25%, #050a14 50%, #d97706 75%, #fbbf24 100%)'
                      : 'linear-gradient(to right, #000000 0%, #888888 50%, #ffffff 100%)',
                }}
                className="h-2.5 w-full rounded-md shadow-inner border border-white/10"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>{activeDataInfo.stats.min.toFixed(2)} {viewMode === 'significance' ? 'σ' : 'MJy/sr'}</span>
              <span>{activeDataInfo.isDiff ? '0.00 (No change)' : `${activeDataInfo.stats.median.toFixed(2)} (Median)`}</span>
              <span>+{activeDataInfo.stats.max.toFixed(2)} {viewMode === 'significance' ? 'σ' : 'MJy/sr'}</span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 04 — COMPARE OBSERVATIONS: PERSPECTIVE BUTTONS, SPLIT & BLINK
           ========================================================================= */}
        <section id="explore-compare-step" className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/[0.06] pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-bold text-[11px] tracking-wider uppercase">
                  04
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
                  {isRtl ? '04 — قارن الرصدات الفلكية (Compare Observations)' : '04 — Compare Observations'}
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                {isRtl
                  ? 'شاهد كيف تغيرت السماء بين موعدي الرصد المحددين عبر الطرح الفلكي أو الوميض السريع أو الشريط المقسم.'
                  : 'See how the sky changed between your selected observation times using subtraction, blink comparison, or split swipe.'}
              </p>
            </div>
            <div className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-white/[0.04] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.08] self-end sm:self-auto">
              Formula: D(x,y) = I₂(x,y) - I₁(x,y)
            </div>
          </div>

          {/* Perspective Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectViewMode('epoch1')}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                viewMode === 'epoch1'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-white'
              }`}
            >
              {isRtl ? '1. الرصدة الأولى (سابقاً)' : '1. Earlier Snapshot (I₁)'}
            </button>

            <button
              type="button"
              onClick={() => handleSelectViewMode('epoch2')}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                viewMode === 'epoch2'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-white'
              }`}
            >
              {isRtl ? '2. الرصدة الثانية (لاحقاً)' : '2. Later Snapshot (I₂)'}
            </button>

            <button
              type="button"
              onClick={() => handleSelectViewMode('difference')}
              className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                viewMode === 'difference'
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-[1.02]'
                  : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isRtl ? '3. ما الذي تغير؟ (D = I₂ - I₁)' : '3. What Changed (D = I₂ - I₁)'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectViewMode('significance')}
              className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                viewMode === 'significance'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-white'
              }`}
            >
              {isRtl ? '4. قوة الإشارة (خريطة σ)' : '4. Signal Strength (σ)'}
            </button>

            <button
              type="button"
              onClick={() => handleSelectViewMode('split')}
              className={`px-3 py-2.5 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'split'
                  ? 'bg-indigo-500 text-white border-indigo-400 font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isRtl ? 'المقارنة بالشريط المقسم' : 'Split Slider'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectViewMode('blink')}
              className={`px-3 py-2.5 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'blink'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isRtl ? 'الوميض السريع (Blink)' : 'Fast Blink'}</span>
            </button>
          </div>

          {/* Time Lens 4-Lens Analytical Switcher */}
          <div className="pt-3 border-t border-slate-200 dark:border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-obs-amber font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {isRtl ? 'عدسات التحليل الفلكي (Observatory Lenses)' : 'Time Lens Analyzers (4 Perspectives)'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {activeLens ? `Active: ${activeLens}` : (isRtl ? 'اختر عدسة للتحليل المتعمق' : 'Select a lens to probe deep data')}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <LensButton
                id="time"
                label={isRtl ? 'الزمن' : 'Time'}
                sublabel={isRtl ? 'سلسلة لقطات' : 'Series'}
                icon={<Clock className="w-3.5 h-3.5" />}
                isActive={activeLens === 'TIME'}
                onClick={() => setActiveLens(activeLens === 'TIME' ? null : 'TIME')}
                color="amber"
              />
              <LensButton
                id="colors"
                label={isRtl ? 'الألوان الخفية' : 'Hidden Colors'}
                sublabel="102 bands"
                icon={<Sparkles className="w-3.5 h-3.5" />}
                isActive={activeLens === 'HIDDEN_COLORS'}
                onClick={() => {
                  setActiveLens(activeLens === 'HIDDEN_COLORS' ? null : 'HIDDEN_COLORS');
                  setShowSpectralExplorer(true);
                }}
                color="cyan"
              />
              <LensButton
                id="doubt"
                label={isRtl ? 'قناع الشك' : 'Doubt'}
                sublabel={isRtl ? 'أخطاء الكاشف' : 'Glitch Mask'}
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                isActive={activeLens === 'DOUBT'}
                onClick={() => {
                  setActiveLens(activeLens === 'DOUBT' ? null : 'DOUBT');
                  setMarkerVisibility(activeLens === 'DOUBT' ? 'reticles' : 'labels');
                }}
                color="rose"
              />
              <LensButton
                id="neighbors"
                label={isRtl ? 'الجيران' : 'Neighbors'}
                sublabel="Gaia / WISE"
                icon={<Layers className="w-3.5 h-3.5" />}
                isActive={activeLens === 'NEIGHBORS'}
                onClick={() => {
                  setActiveLens(activeLens === 'NEIGHBORS' ? null : 'NEIGHBORS');
                  if (candidateFilter === 'all') setCandidateFilter('known');
                  else setCandidateFilter('all');
                }}
                color="emerald"
              />
            </div>
          </div>

          {/* Frame Player when TIME lens is active */}
          {activeLens === 'TIME' && (
            <div className="mt-4 p-4 rounded-2xl bg-black/80 border border-obs-cyan/40 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                <span className="text-xs font-mono text-obs-cyan font-bold">
                  {isRtl ? 'مشغل السلاسل الزمنية الحقيقي — /api/spherex/timeseries' : 'Real-Time Cadence Player — /api/spherex/timeseries'}
                </span>
                <button
                  onClick={() => setActiveLens(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <FramePlayer
                ra={currentResult?.targetCoords?.ra ?? 276.2614}
                dec={currentResult?.targetCoords?.dec ?? 64.8258}
                caseId={currentResult?.caseId}
                language={language}
              />
            </div>
          )}

          {/* Split Slider Control */}
          {viewMode === 'split' && (
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center gap-3 text-xs font-mono animate-in fade-in">
              <span className="text-indigo-600 dark:text-indigo-300 font-bold whitespace-nowrap">
                {isRtl ? 'الرصدة 1 (يسار)' : 'Visit 1 (Left)'}
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
              <span className="text-indigo-600 dark:text-indigo-300 font-bold whitespace-nowrap">
                {isRtl ? 'الرصدة 2 (يمين)' : 'Visit 2 (Right)'}
              </span>
            </div>
          )}

          {/* Fast Blink Cadence Control */}
          {viewMode === 'blink' && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">
                  {blinkEpoch === 'epoch1' ? 'Showing: Visit 1 (Earlier)' : 'Showing: Visit 2 (Later)'}
                </span>
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBlinking(!isBlinking)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold cursor-pointer"
                >
                  {isBlinking ? 'Pause' : 'Play'}
                </button>
                <span className="text-slate-400">Cadence Speed:</span>
                {[0.5, 1, 2].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setBlinkSpeed(spd)}
                    className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                      blinkSpeed === spd
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Display Adjustments: Stretch & Colormap Controls */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px] font-medium">{isRtl ? 'تمديد السطوع:' : 'Stretch:'}</span>
              {(['asinh', 'sqrt', 'linear'] as StretchMode[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStretch(st)}
                  className={`px-2.5 py-1 rounded-lg uppercase text-[11px] font-bold transition cursor-pointer ${
                    stretch === st
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px] font-medium">{isRtl ? 'خريطة الألوان:' : 'Colormap:'}</span>
              {(['diff_diverging', 'grayscale', 'viridis', 'magma'] as ColormapMode[]).map((cm) => (
                <button
                  key={cm}
                  type="button"
                  onClick={() => setColormap(cm)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer capitalize ${
                    colormap === cm
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 hover:text-white'
                  }`}
                >
                  {cm === 'diff_diverging' ? 'Diverging' : cm}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* =========================================================================
          SECTION 05 & 06 & 07: RESULTS, CANDIDATE EVIDENCE & SPEX COMPANION
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Section 05 & Finding Cards */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          {/* SECTION 05 — WHAT DID WE FIND? */}
          <section id="explore-results-step" className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[11px] tracking-wider uppercase">
                  05
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
                  {isRtl ? '05 — ما هي النتائج؟ (What Did We Find?)' : '05 — What Did We Find?'}
                </h3>
              </div>
            </div>

            {/* Exact 3-Status Prominent Banner */}
            {detectionStatus === 'NO_CLEAR_CHANGE' && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>NO CLEAR CHANGE DETECTED</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isRtl
                    ? 'لم يتم رصد أي تغيرات تفوق مستوى ضوضاء الكاميرا. تبدي هذه الرقعة استقراراً ضوئياً نموذجياً بين الزيارتين.'
                    : 'All pixels remain within normal background camera noise. This field shows remarkable photometric stability between visits.'}
                </p>
              </div>
            )}

            {detectionStatus === 'POSSIBLE_CHANGE' && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>POSSIBLE CHANGE DETECTED</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isRtl
                    ? `تم اكتشاف ${filteredCandidates.length} تغيرات ضوئية تفوق عتبة 5σ. انقر على بطاقات المرشحين أدناه لفحص أدلة الرصد.`
                    : `Found ${filteredCandidates.length} candidate changes exceeding the 5σ threshold. Review the evidence cards below.`}
                </p>
              </div>
            )}

            {detectionStatus === 'INSUFFICIENT_DATA' && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>INSUFFICIENT DATA</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isRtl
                    ? 'تتطلب مقارنة الفروقات رصدتين على الأقل لنفس الموقع في أوقات مختلفة.'
                    : 'Difference imaging requires at least two distinct visits of this coordinate at different times.'}
                </p>
              </div>
            )}

            {/* Quick Action Buttons for Modals */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowSkyCoverage(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-amber-500 cursor-pointer"
              >
                <Globe2 className="w-3.5 h-3.5 text-amber-500" />
                <span>Sky Coverage</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSpectralExplorer(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-cyan-500 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-500" />
                <span>102 Bands</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCandidateComparison(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-indigo-500 cursor-pointer"
              >
                <Table className="w-3.5 h-3.5 text-indigo-500" />
                <span>Compare Table</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDataRelease(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-emerald-500 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-emerald-500" />
                <span>Data Ingestion</span>
              </button>
            </div>

              {/* Candidate Filter & Findings List */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] space-y-3">
              {fallbackQuery && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{t.referenceCandidatesNotice}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {isRtl ? 'قائمة المرشحين والأدلة:' : 'Candidate Findings List:'}
                </span>

                <div className="flex items-center gap-1 text-[11px] font-mono">
                  {(['all', 'candidates', 'known', 'artifacts'] as CandidateFilter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setCandidateFilter(f);
                        setCandidatePage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer ${
                        candidateFilter === f
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
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
                {selectedCandidate && (
                  <div className="mb-4">
                    <DiscoveryCard
                      candidate={selectedCandidate}
                      viewMode={presentationLevel === 'science' ? 'scientist' : 'beginner'}
                      language={language}
                      onClose={() => setSelectedCandidate(null)}
                    />
                  </div>
                )}
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
                  <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] text-xs text-slate-500 font-mono">
                    {isRtl ? 'لا توجد مرشحات مطابقة للمرشح المحدد' : 'No candidates matching current filter'}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* STEP 6 — RAW SCIENCE & FITS DETAILS */}
          <section id="explore-science-step" className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 sm:p-5 shadow-sm space-y-3">
            <button
              type="button"
              onClick={() => setShowScientificEvidenceDrawer(!showScientificEvidenceDrawer)}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-xs font-mono text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              <div className="flex items-center gap-2 font-bold">
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-mono font-bold text-[10px] tracking-wider uppercase">06</span>
                <ShieldCheck className="w-4 h-4 text-cyan-500" />
                <span>{isRtl ? '06 — افهم النتيجة وتفاصيل FITS العلمية' : '06 — Understand the Result & FITS Evidence'}</span>
              </div>
              {showScientificEvidenceDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {(showScientificEvidenceDrawer || presentationLevel === 'science') && currentResult && (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 text-[11px] font-mono text-slate-300 space-y-3 animate-in fade-in">
                <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-800">
                  <div>
                    <span className="text-slate-500 block">WCS Projection:</span>
                    <span className="text-cyan-400 font-bold">TAN-SIP Gnomonic (Order 2)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Pixel Scale:</span>
                    <span className="text-slate-200">6.15″ / pixel</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Variance Propagation:</span>
                    <span className="text-slate-200">σ_D = √(σ₁² + σ₂²)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Detection Cutoff:</span>
                    <span className="text-amber-400 font-bold">&gt; 5.0σ MAD-clipped</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500">
                    FITS provenance: NASA/IPAC IRSA QR2 Level-2B Calibrated
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowProvenance(true)}
                    className="text-xs text-cyan-400 hover:underline cursor-pointer"
                  >
                    Audit Record &rarr;
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column (5 cols): STEP 7 — ASK SPEX & Quick Help */}
        <div id="explore-spex-step" className="lg:col-span-5 xl:col-span-5 flex flex-col gap-5">
          {/* Quick Help Questions */}
          <QuickHelpQuestions
            currentResult={currentResult}
            selectedCandidate={selectedCandidate}
            viewMode={viewMode}
            onAskSpex={(prompt) => setExternalSpexPrompt(prompt)}
            language={language}
          />

          {/* SPEX Cat Companion */}
          <SpexCompanion
            currentResult={currentResult}
            selectedCandidate={selectedCandidate}
            externalPrompt={externalSpexPrompt}
            onClearExternalPrompt={() => setExternalSpexPrompt(null)}
            language={language}
          />
        </div>
      </div>

      {/* =========================================================================
          PART 7: VISUAL SCIENCE EXPLANATIONS (Interactive Laboratory)
         ========================================================================= */}
      <section className="pt-2">
        <VisualScienceExplainer
          language={language}
          onSelectCoordinates={(ra, dec) => onSearchTarget(ra, dec, selectedFovSize)}
        />
      </section>

      {/* =========================================================================
          MODALS & OVERLAYS
         ========================================================================= */}
      {/* Search Coordinates Modal */}
      {isSearchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsSearchOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0c1220] shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base font-['Outfit'] text-slate-900 dark:text-slate-100">
                {isRtl ? 'البحث عن إحداثيات سماوية' : 'Search Celestial Coordinates'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-slate-500 block mb-1">
                  {isRtl ? 'المطلع المستقيم (RA بالدرجات):' : 'Right Ascension (RA in degrees 0–360°):'}
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
                <label className="text-xs font-mono text-slate-500 block mb-1">
                  {isRtl ? 'الميل الفلكي (Dec بالدرجات):' : 'Declination (Dec in degrees -90° to +90°):'}
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-white cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
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
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer"
              >
                {isRtl ? 'بدء التحقيق' : 'Inspect Region'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sky Coverage Modal */}
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

      {/* 102 Spectral Explorer Modal */}
      {showSpectralExplorer && (
        <SpectralExplorerModal
          onClose={() => setShowSpectralExplorer(false)}
          selectedCandidate={selectedCandidate}
          language={language}
        />
      )}

      {/* Discovery Report Modal */}
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

      {/* Interactive 4-Step Visual Concept Explainer Modal */}
      <InteractiveConceptExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
        language={language}
      />

      {/* Evidence Export Dossier Modal */}
      {showEvidenceExport && (
        <EvidenceExportModal
          investigation={currentResult}
          selectedCandidate={selectedCandidate}
          language={language}
          onClose={() => setShowEvidenceExport(false)}
        />
      )}

      {/* Discovery Postcard Modal */}
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

export const ScientistExplore = ExploreView;
export default ScientistExplore;
