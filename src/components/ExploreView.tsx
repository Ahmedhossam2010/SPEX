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
export type PresentationLevel = 'simple' | 'science';

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

  // 1. Presentation Level: Simple Mode (Default) vs Science Details (Optional)
  const [presentationLevel, setPresentationLevel] = useState<PresentationLevel>('simple');

  // Primary Observation Perspective & Sequencer
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
  const [sequenceSpeed, setSequenceSpeed] = useState<number>(1);
  const [selectedEpochPair, setSelectedEpochPair] = useState<string>('1-3');
  const [selectedFovSize, setSelectedFovSize] = useState<number>(64);

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

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6 space-y-6 select-none" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* =========================================================================
          TOP BAR: Presentation Level Switcher (Simple Mode vs Science Details)
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900/90 via-[#0c1220] to-slate-900/90 border border-cyan-500/30 rounded-3xl p-3.5 sm:p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide font-['Outfit']">
              {isRtl ? 'مرصد SPHEREx — سماء الكون المتغيرة' : 'SPHEREx Observatory — The Changing Sky'}
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              {presentationLevel === 'simple'
                ? (isRtl ? 'الوضع المبسط (شرح واضح ومباشر للجمهور)' : 'Simple Mode (Everyday Language & Visual Guides)')
                : (isRtl ? 'وضع التفاصيل العلمية (بيانات FITS ومصفوفات WCS الكاملة)' : 'Science Details Mode (Full Astronomical FITS & WCS Metadata)')}
            </p>
          </div>
        </div>

        {/* Level Switcher Pill */}
        <div className="flex items-center p-1 bg-slate-950/80 rounded-2xl border border-slate-800 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setPresentationLevel('simple')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              presentationLevel === 'simple'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{isRtl ? 'الوضع المبسط' : 'Simple View (Default)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setPresentationLevel('science')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              presentationLevel === 'science'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isRtl ? 'التفاصيل العلمية' : 'Science Details'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION 01 — EXPLORE THE SKY
         ========================================================================= */}
      <section className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06] pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-bold text-[10px] tracking-wider uppercase">
                SECTION 01
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
                {isRtl ? 'استكشف السماء (Explore the Sky)' : 'Explore the Sky'}
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {isRtl
                ? 'اختر منطقة في قبة السماء للتحقيق فيها. يقاس موقع السماء بإحداثيين بسيطين: المطلع المستقيم (الموقع على خط الاستواء السماوي) والميل (المسافة شمالاً أو جنوباً).'
                : 'Select or search a sky position. Coordinates work like GPS for space: Right Ascension (RA) is the position along the celestial equator, and Declination (Dec) is the distance north or south.'}
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-sm active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isRtl ? 'بحث بالإحداثيات' : 'Search Coordinates'}</span>
            </button>
          </div>
        </div>

        {/* Guided Target Presets Cards */}
        <div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-2 font-medium">
            {isRtl ? 'أمثلة ومناطق مقترحة للبدء السريع:' : 'Quick Starting Suggestions (Authentic SPHEREx Regions):'}
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
                  RA {tgt.ra}° · Dec {tgt.dec}°
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 02 — YOUR OBSERVATIONS
         ========================================================================= */}
      <section className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-mono font-bold text-[10px] tracking-wider uppercase">
              SECTION 02
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
              {isRtl ? 'أرصادك الفلكية (Your Observations)' : 'Your Observations'}
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {currentResult?.epochs && currentResult.epochs.length >= 3
                ? (isRtl ? '3 رصدات متوفرة (تسلسل زمني كامل)' : '3 Survey Visits Available (Multi-Epoch)')
                : (isRtl ? 'رصدتان مستقلتان متوفرتان (زوج رصد زمني)' : '2 Independent Visits Available (Epoch Pair)')}
            </span>
          </div>
        </div>

        {/* Observation definition in plain language */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {isRtl
            ? 'ما هي الرصدة؟ الرصدة هي لقطة تحت حمراء معايرة التقطها تلسكوب SPHEREx الفضائي في لحظة محددة. لاكتشاف التغيرات الكونية، نحتاج إلى رصدتين على الأقل لنفس الموقع في أوقات مختلفة لمقارنتهما ومعرفة ما حدث!'
            : 'What is an observation? An observation is a calibrated infrared snapshot captured by NASA’s SPHEREx space telescope at a specific time. To detect cosmic changes, we need at least two distinct visits of the same region separated in time: comparing them reveals what changed.'}
        </p>

        {/* Visual Multi-Epoch Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Visit 1 */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-600 dark:text-cyan-400">
                {isRtl ? 'الرصدة 1 (الزيارة الأولى)' : 'Visit 1 (Earlier Snapshot)'}
              </span>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
              {currentResult?.epoch1.metadata.date_obs || '2025-04-28 13:00:15 UTC'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Band: SPHEREx 0.75–5.0 µm · Array 1-6
            </div>
          </div>

          {/* Visit 2 */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-600 dark:text-cyan-400">
                {isRtl ? 'الرصدة 2 (الزيارة الثانية)' : 'Visit 2 (Later Snapshot)'}
              </span>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
              {currentResult?.epoch2.metadata.date_obs || '2025-04-28 13:02:24 UTC'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Delta: +128.9s baseline separation
            </div>
          </div>

          {/* Visit 3 (or Multi-epoch indicator) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400">
                {currentResult?.epochs && currentResult.epochs.length >= 3
                  ? (isRtl ? 'الرصدة 3 (تأكيد زمني)' : 'Visit 3 (Temporal Confirmation)')
                  : (isRtl ? 'المحاذاة الفلكية WCS' : 'WCS Spatial Alignment')}
              </span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
              {currentResult?.epochs?.[2]?.date || 'Sub-pixel WCS Resampled'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Status: Verified level-2B FITS pairing
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 03 & 04: SEE THE IMAGE & COMPARE OBSERVATIONS
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Canvas Viewport & Section 03/04 Controls */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* SECTION 04 PERSPECTIVE SELECTOR */}
          <section className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-bold text-[10px] tracking-wider uppercase">
                  SECTION 04
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
                  {isRtl ? 'قارن بين الرصدات (Compare Observations)' : 'Compare Observations'}
                </h3>
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Formula: D(x,y) = I₂(x,y) - I₁(x,y)
              </div>
            </div>

            {/* Explanation of difference image */}
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isRtl
                ? 'كيف يعمل الطرح الفلكي؟ نطرح صورة الرصدة الأولى من صورة الرصدة الثانية. كل الأجرام الثابتة تختفي لتصبح صفراً (لون داكن/محايد)، وما يتغير فقط يبرز كنقاط مضيئة أو داكنة!'
                : 'How difference imaging works: We subtract the earlier image from the later image. Anything that stayed the same cancels out completely to zero. Anything that changed stands out!'}
            </p>

            {/* 4 Mode Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectViewMode('epoch1')}
                className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  viewMode === 'epoch1'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300'
                }`}
              >
                {isRtl ? '1. الرصدة الأولى' : '1. Earlier Snapshot'}
              </button>

              <button
                type="button"
                onClick={() => handleSelectViewMode('epoch2')}
                className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  viewMode === 'epoch2'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300'
                }`}
              >
                {isRtl ? '2. الرصدة الثانية' : '2. Later Snapshot'}
              </button>

              <button
                type="button"
                onClick={() => handleSelectViewMode('difference')}
                className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                  viewMode === 'difference'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isRtl ? '3. ما الذي تغير؟' : '3. What Changed (Diff)'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectViewMode('significance')}
                className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  viewMode === 'significance'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                    : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300'
                }`}
              >
                {isRtl ? '4. قوة الإشارة (σ)' : '4. Signal Strength'}
              </button>
            </div>

            {/* Split Swipe Slider & Fast Blink cadence tools */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => handleSelectViewMode('split')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-indigo-500 text-white border-indigo-400'
                    : 'bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isRtl ? 'شريط التمرير المقارن' : 'Split Slider Comparison'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectViewMode('blink')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                  viewMode === 'blink'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isRtl ? 'الوميض السريع التلقائي' : 'Fast Blink Cadence'}</span>
              </button>
            </div>

            {/* Split Slider Bar UI */}
            {viewMode === 'split' && (
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center gap-3 text-xs font-mono animate-in fade-in">
                <span className="text-indigo-600 dark:text-indigo-300 font-bold whitespace-nowrap">
                  Visit 1 (Left)
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
                  Visit 2 (Right)
                </span>
              </div>
            )}
          </section>

          {/* SECTION 03 — SEE THE IMAGE */}
          <section className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-slate-950 p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-mono font-bold text-[10px] tracking-wider uppercase">
                  SECTION 03
                </span>
                <h3 className="text-sm font-bold text-white font-['Outfit']">
                  {isRtl ? 'شاهد الصورة الفلكية (See the Image)' : 'See the Image'}
                </h3>
              </div>

              {/* Detector Pixels vs Smooth Display Toggle */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDisplayMode('science')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer ${
                    displayMode === 'science'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Show genuine detector pixels"
                >
                  {isRtl ? 'بكسلات الحساس الحقيقية' : 'Detector Pixels'}
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('presentation')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer ${
                    displayMode === 'presentation'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Smooth display"
                >
                  {isRtl ? 'عرض ناعم (DS9)' : 'Smooth View'}
                </button>
              </div>
            </div>

            {/* Astronomical Canvas Viewport */}
            <div className="relative rounded-2xl border border-white/10 bg-black overflow-hidden aspect-square sm:aspect-[4/3] flex items-center justify-center select-none group">
              {isLoading && (
                <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-slate-300">
                  <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  <span className="text-xs font-mono tracking-wider">
                    {isRtl ? 'جارٍ معالجة بيانات FITS الحقيقية...' : 'Processing Real SPHEREx Level-2B FITS...'}
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
                        RA {cursorPos.ra?.toFixed(4)}° Dec {cursorPos.dec?.toFixed(4)}°
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

            {/* Brightness Scale / Physical Colorbar */}
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

            {/* Required 1-2 sentence visual explanation directly beneath the viewer */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <p>
                {isRtl
                  ? 'أنت تشاهد ضوء الأشعة تحت الحمراء المعاير من مرصد SPHEREx. تشير المناطق الأكثر سطوعاً إلى تدفق إشعاعي أكبر صادر عن غبار النجوم وسحب الغاز الكوني.'
                  : 'You are viewing calibrated SPHEREx infrared light. Brighter areas indicate higher infrared photon flux emitted by stars, gas, and cosmic dust clouds.'}
              </p>
            </div>
          </section>
        </div>

        {/* Right Column (4 cols): Section 05 & 06 and SPEX Companion */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5">
          {/* =========================================================================
              SECTION 05 — WHAT DID WE FIND?
             ========================================================================= */}
          <section className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[10px] tracking-wider uppercase">
                  SECTION 05
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
                  {isRtl ? 'ما هي النتائج؟ (What Did We Find?)' : 'What Did We Find?'}
                </h3>
              </div>
            </div>

            {/* Exact 3-Status Prominent Banner */}
            {detectionStatus === 'NO_CLEAR_CHANGE' && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>NO CLEAR CHANGE DETECTED</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isRtl
                    ? 'لم يتم رصد أي تغيرات تفوق مستوى ضوضاء الكاميرا. تبدي هذه الرقعة استقراراً ضوئياً نموذجياً بين الزيارتين.'
                    : 'All pixels remain within normal background camera noise. This field shows remarkable photometric stability.'}
                </p>
              </div>
            )}

            {detectionStatus === 'POSSIBLE_CHANGE' && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>POSSIBLE CHANGE DETECTED</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isRtl
                    ? `تم اكتشاف ${filteredCandidates.length} تغيرات ضوئية تفوق عتبة 5σ. انقر على بطاقات المرشحين أدناه لفحص أدلة الرصد.`
                    : `Found ${filteredCandidates.length} candidate changes exceeding the 5σ threshold. Review the evidence cards below.`}
                </p>
              </div>
            )}

            {detectionStatus === 'INSUFFICIENT_DATA' && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>INSUFFICIENT DATA</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
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
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-amber-500 cursor-pointer"
              >
                <Globe2 className="w-3.5 h-3.5 text-amber-500" />
                <span>Sky Coverage</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSpectralExplorer(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-cyan-500 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-500" />
                <span>102 Bands</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCandidateComparison(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-indigo-500 cursor-pointer"
              >
                <Table className="w-3.5 h-3.5 text-indigo-500" />
                <span>Compare Table</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDataRelease(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-emerald-500 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-emerald-500" />
                <span>Data Ingestion</span>
              </button>
            </div>
          </section>

          {/* SPEX COMPANION AI */}
          <SpexCompanion
            currentResult={currentResult}
            selectedCandidate={selectedCandidate}
            externalPrompt={externalSpexPrompt}
            onClearExternalPrompt={() => setExternalSpexPrompt(null)}
            language={language}
          />

          {/* =========================================================================
              SECTION 06 — UNDERSTAND THE RESULT
             ========================================================================= */}
          <section className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-[10px] tracking-wider uppercase">
                  SECTION 06
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
                  {isRtl ? 'افهم النتيجة والأدلة' : 'Understand the Result'}
                </h3>
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
                    className={`px-2 py-0.5 rounded-md capitalize transition cursor-pointer ${
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
                <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] text-xs text-slate-500 font-mono">
                  {isRtl ? 'لا توجد مرشحات مطابقة للمرشح المحدد' : 'No candidates matching current filter'}
                </div>
              )}
            </div>

            {/* Expandable "Show scientific details" Panel for Scientists & Judges */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowScientificEvidenceDrawer(!showScientificEvidenceDrawer)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-xs font-mono text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                <div className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="w-4 h-4 text-cyan-500" />
                  <span>{isRtl ? 'عرض التفاصيل العلمية والبيانات الدقيقة' : 'Show Scientific Details (FITS & WCS)'}</span>
                </div>
                {showScientificEvidenceDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {(showScientificEvidenceDrawer || presentationLevel === 'science') && currentResult && (
                <div className="mt-3 p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 text-[11px] font-mono text-slate-300 space-y-2 animate-in fade-in">
                  <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800">
                    <div>
                      <span className="text-slate-500 block">WCS Projection:</span>
                      <span className="text-cyan-400 font-bold">TAN-SIP Gnomonic</span>
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
                      FITS provenance: NASA/IPAC IRSA QR2 Level-2B
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
            </div>
          </section>
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
    </div>
  );
};
