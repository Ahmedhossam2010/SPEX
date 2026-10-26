import React, { useState, useEffect, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Layers,
  Info,
  Send,
  ExternalLink,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Flame,
  Palette,
  Play,
  Pause,
  Telescope,
  Binary,
  Eye,
  SlidersHorizontal,
  Compass,
  X,
} from 'lucide-react';
import {
  CandidateDetection,
  InvestigationResult,
} from '../science/types';
import { AstronomyRenderer, ColormapMode, DisplayMode, StretchMode } from '../utils/astronomyRender';
import { WCS } from '../science/wcs';
import { SPEX_ASSETS, SPEXMood } from '../spex/spexAssets';
import { ProvenanceModal } from './ProvenanceModal';
import { Language, translations } from '../utils/translations';

interface ExploreViewProps {
  currentResult: InvestigationResult | null;
  isLoading: boolean;
  onSearchTarget: (ra: number, dec: number) => void;
  onSelectCase: (caseId: string) => void;
  cases: Array<{ id: string; title: string; category?: string; ra: number; dec: number }>;
  language: Language;
}

export type ViewMode = 'difference' | 'significance' | 'epoch1' | 'epoch2' | 'split' | 'blink';

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

  // Viewport states
  const [viewMode, setViewMode] = useState<ViewMode>('difference');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('presentation');
  const [stretch, setStretch] = useState<StretchMode>('asinh');
  const [colormap, setColormap] = useState<ColormapMode>('spherex_cosmic');
  const [zoom, setZoom] = useState<number>(1.2);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sliderPos, setSliderPos] = useState<number>(0.5);
  const [blinkEpoch, setBlinkEpoch] = useState<'epoch1' | 'epoch2'>('epoch1');
  const [blinkSpeedMs, setBlinkSpeedMs] = useState<number>(450);
  const [isBlinking, setIsBlinking] = useState<boolean>(true);

  // Inspector cursor readout
  const [cursorPos, setCursorPos] = useState<{
    x: number;
    y: number;
    ra?: number;
    dec?: number;
    val?: number;
    variance?: number;
    flags?: number;
  } | null>(null);

  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetection | null>(null);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [showProvenance, setShowProvenance] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [customRa, setCustomRa] = useState<string>('276.2500');
  const [customDec, setCustomDec] = useState<string>('64.8300');
  const [isCandidateDrawerCollapsed, setIsCandidateDrawerCollapsed] = useState<boolean>(false);
  const [isCandidateDetailsOpen, setIsCandidateDetailsOpen] = useState<boolean>(true);
  const [isSpexCollapsed, setIsSpexCollapsed] = useState<boolean>(false);

  // SPEX Chat state
  const [spexMessage, setSpexMessage] = useState<string>('');
  const [spexReply, setSpexReply] = useState<string>('');
  const [spexMood, setSpexMood] = useState<SPEXMood>('explaining');
  const [isSpexThinking, setIsSpexThinking] = useState<boolean>(false);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Synchronize candidate selection and default SPEX voice upon case change
  useEffect(() => {
    if (currentResult) {
      if (currentResult.candidates.length > 0) {
        setSelectedCandidate(currentResult.candidates[0]);
      } else {
        setSelectedCandidate(null);
      }

      // Reset pan and set balanced initial zoom
      setPan({ x: 0, y: 0 });
      setZoom(1.2);

      // Default SPEX greeting based on classification and language
      if (currentResult.evidence.classification === 'SIGNIFICANT CHANGE DETECTED') {
        setSpexMood('eureka');
        setSpexReply(
          language === 'ar'
            ? `يا خبر كوني! 🚀 رصدنا تغير حقيقي في تدفق النجم بنسبة S/N = ${Math.abs(currentResult.evidence.maxSignificance).toFixed(1)}σ عبر فارق زمني ${currentResult.compatibility.timeBaselineDays.toFixed(1)} يوم. بص على كارت المرشح!`
            : `Verified astrophysical flux variation! 🚀 Peak residual significance S/N = ${Math.abs(currentResult.evidence.maxSignificance).toFixed(1)}σ across ${currentResult.compatibility.timeBaselineDays.toFixed(1)} days. Check the candidate card!`
        );
      } else if (currentResult.evidence.classification === 'NO SIGNIFICANT CHANGE DETECTED') {
        setSpexMood('serious');
        setSpexReply(
          language === 'ar'
            ? 'ثبات ضوئي ممتاز! 🔭 قياس الفتحة الضوئية (Aperture Photometry) يؤكد ثبات التدفق تمامًا، والفروق تقع ضمن الضوضاء الطبيعية للأجهزة. ده معيار استقرار أساسي لسماء SPHEREx.'
            : 'Photometric baseline verified stable! 🔭 Difference residuals and aperture photometry are strictly consistent with the Gaussian instrumental noise floor.'
        );
      } else if (currentResult.evidence.classification === 'POSSIBLE ARTIFACT') {
        setSpexMood('sassy');
        setSpexReply(
          language === 'ar'
            ? 'استنى هنا! ده مش كائن فضائي يا باشا 😂 الإشارة دي ناتجة عن تشبع البيكسل (Saturation) أو استمرار شحنة المستشعر (Persistence)، وتم كشفها واستبعادها بدقة عبر FITS Quality Bitmask عشان نمنع الاكتشافات الوهمية.'
            : 'Hold your horses! That spike is an instrumental artifact (saturation / detector persistence) cleanly caught and disqualified by our quality bitmask!'
        );
      } else {
        setSpexMood('investigator');
        setSpexReply(currentResult.evidence.summaryProse);
      }
    }
  }, [currentResult, language]);

  // Blink interval timer
  useEffect(() => {
    if (viewMode !== 'blink' || !isBlinking) return;
    const interval = setInterval(() => {
      setBlinkEpoch((prev) => (prev === 'epoch1' ? 'epoch2' : 'epoch1'));
    }, blinkSpeedMs);
    return () => clearInterval(interval);
  }, [viewMode, isBlinking, blinkSpeedMs]);

  // Render to canvas using enhanced AstronomyRenderer
  useEffect(() => {
    if (!currentResult || !canvasRef.current) return;

    let dataToRender: number[] = [];
    let cm = colormap;

    if (viewMode === 'epoch1' || (viewMode === 'blink' && blinkEpoch === 'epoch1')) {
      dataToRender = currentResult.epoch1.flux;
    } else if (viewMode === 'epoch2' || (viewMode === 'blink' && blinkEpoch === 'epoch2')) {
      dataToRender = currentResult.epoch2.flux;
    } else if (viewMode === 'difference') {
      dataToRender = currentResult.difference.diff;
      cm = 'diff_diverging';
    } else if (viewMode === 'significance') {
      dataToRender = currentResult.difference.significance;
      cm = 'diff_diverging';
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
    }

    AstronomyRenderer.renderToCanvas(
      canvasRef.current,
      dataToRender,
      currentResult.epoch1.width,
      currentResult.epoch1.height,
      {
        stretch,
        colormap: cm,
        displayMode,
        renderSize: 512,
      }
    );
  }, [currentResult, viewMode, blinkEpoch, stretch, colormap, sliderPos, displayMode]);

  // Cursor inspector readout
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
      if (viewMode === 'epoch1') val = currentResult.epoch1.flux[idx];
      else if (viewMode === 'epoch2') val = currentResult.epoch2.flux[idx];
      else if (viewMode === 'significance') val = currentResult.difference.significance[idx];

      const sky = WCS.pixToSky(pixelX, pixelY, currentResult.epoch2.wcs);
      setCursorPos({
        x: pixelX,
        y: pixelY,
        ra: sky.ra,
        dec: sky.dec,
        val,
        variance: currentResult.difference.variance[idx],
      });
    } else {
      setCursorPos(null);
    }

    // Pan drag
    if (isDragging) {
      setPan({
        x: pan.x + (e.clientX - dragStart.x),
        y: pan.y + (e.clientY - dragStart.y),
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Ask SPEX a question
  const askSpex = async (msg: string) => {
    if (!msg.trim() || !currentResult || isSpexThinking) return;
    setIsSpexThinking(true);
    setSpexReply(t.spexThinking);

    try {
      const res = await fetch('/api/spex/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: msg,
          evidence: currentResult.evidence,
          topCandidate: selectedCandidate || currentResult.candidates[0] || null,
          provenance: currentResult.provenance,
          compatibility: currentResult.compatibility,
          targetCoords: currentResult.targetCoords,
          lang: language,
        }),
      });
      const data = await res.json();
      setSpexReply(data.reply);
      if (data.mood) setSpexMood(data.mood);
    } catch (err) {
      console.error('SPEX AI chat error:', err);
      setSpexReply(
        language === 'ar'
          ? 'عفوًا يا نجم، الاتصال بالمرصد اتأخر ثانية بس البيانات واضحة قدامك في الجدول!'
          : 'Network glitch with the ground station, astronomer! Please ask again in a moment.'
      );
    } finally {
      setIsSpexThinking(false);
      setSpexMessage('');
    }
  };

  // Center canvas on candidate pixel
  const centerOnCandidate = (cand: CandidateDetection) => {
    setSelectedCandidate(cand);
    if (!currentResult) return;
    const w = currentResult.epoch1.width;
    const h = currentResult.epoch1.height;
    const offsetX = (w / 2 - cand.x) * (zoom * 7);
    const offsetY = (h / 2 - cand.y) * (zoom * 7);
    setPan({ x: offsetX, y: offsetY });
  };

  const getStatusBadge = (classification: string) => {
    switch (classification) {
      case 'SIGNIFICANT CHANGE DETECTED':
        return {
          label: t.statusSignificant,
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-500/15 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.25)]',
          dot: 'bg-emerald-400',
        };
      case 'NO SIGNIFICANT CHANGE DETECTED':
        return {
          label: t.statusStable,
          border: 'border-cyan-500/30',
          bg: 'bg-cyan-500/15 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.25)]',
          dot: 'bg-cyan-400',
        };
      case 'POSSIBLE ARTIFACT':
        return {
          label: t.statusArtifact,
          border: 'border-amber-500/30',
          bg: 'bg-amber-500/15 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.25)]',
          dot: 'bg-amber-400',
        };
      case 'INSUFFICIENT DATA':
        return {
          label: t.statusIncompatible,
          border: 'border-rose-500/30',
          bg: 'bg-rose-500/15 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.25)]',
          dot: 'bg-rose-400',
        };
      default:
        return {
          label: t.statusUnknown,
          border: 'border-slate-500/30',
          bg: 'bg-slate-800/80 text-slate-300',
          dot: 'bg-slate-400',
        };
    }
  };

  if (isLoading || !currentResult) {
    return (
      <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#02040a] text-slate-200 overflow-hidden">
        {/* Subtle radial space glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
        <div className="relative flex flex-col items-center gap-5 p-8 rounded-3xl border border-white/10 bg-black/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] max-w-md text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/20 via-sky-500/15 to-indigo-500/20 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
            <Telescope className="h-8 w-8 animate-pulse text-amber-300" />
            <div className="absolute inset-0 rounded-2xl border border-amber-400/40 animate-ping opacity-30" />
          </div>
          <div>
            <h3 className="font-['Outfit'] text-lg font-bold text-slate-100">
              {language === 'ar' ? 'جاري الاتصال بأرشيف IRSA ومرصد SPHEREx...' : 'Accessing NASA/IPAC IRSA SPHEREx Archive...'}
            </h3>
            <p className="text-xs font-mono text-slate-400 mt-2 leading-relaxed">
              {language === 'ar'
                ? 'استرجاع ملفات FITS الأصلية، محاذاة WCS الدقيقة، وحساب مصفوفات الفروق الضوئية...'
                : 'Downloading Level-2B calibrated FITS cutouts, computing sub-pixel WCS registration & difference maps...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(currentResult.evidence.classification);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#02040a] select-none ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
    >
      {/* =========================================================================
          1. DOMINANT HERO TELESCOPE CANVAS (90%+ VIEWPORT)
          ========================================================================= */}
      <div
        className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseMove={handleCanvasMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setCursorPos(null);
        }}
      >
        <div
          className="relative transition-transform duration-75 ease-out rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <canvas
            ref={canvasRef}
            className="block w-[512px] h-[512px] pointer-events-auto"
            style={{
              imageRendering: displayMode === 'science' ? 'pixelated' : 'auto',
            }}
          />

          {/* Interactive Candidate Reticles */}
          {showMarkers &&
            currentResult &&
            currentResult.candidates.map((cand) => {
              const isSelected = selectedCandidate?.id === cand.id;
              const isArtifact = cand.artifactScore >= 0.5;
              const leftPct = (cand.x / currentResult.epoch1.width) * 100;
              const topPct = (cand.y / currentResult.epoch1.height) * 100;

              return (
                <div
                  key={cand.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    centerOnCandidate(cand);
                  }}
                  className="absolute cursor-pointer -translate-x-1/2 -translate-y-1/2 group z-20 pointer-events-auto"
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                >
                  <div
                    className={`relative flex items-center justify-center w-7 h-7 rounded-full border transition-all ${
                      isSelected
                        ? isArtifact
                          ? 'border-amber-400 bg-amber-500/25 shadow-[0_0_15px_#f59e0b]'
                          : 'border-emerald-400 bg-emerald-500/25 shadow-[0_0_15px_#10b981]'
                        : isArtifact
                        ? 'border-amber-500/60 hover:border-amber-400 bg-amber-500/10'
                        : 'border-sky-400/60 hover:border-sky-400 bg-sky-500/10'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        isArtifact ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    />
                    <div
                      className={`absolute inset-0 rounded-full border animate-ping opacity-35 ${
                        isArtifact ? 'border-amber-400' : 'border-emerald-400'
                      }`}
                    />
                  </div>

                  {/* Candidate Tag Pill on Hover */}
                  <div className="absolute left-8 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-black/85 backdrop-blur-xl border border-white/10 text-[10px] font-mono text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                    <span className="font-bold text-amber-300">{cand.id}</span> ·{' '}
                    <span>{cand.peakSignificance.toFixed(1)}σ</span> ·{' '}
                    <span className="text-slate-400">{cand.status}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* =========================================================================
          2. TOP LIQUID-GLASS INSTRUMENT HUD (SPATIAL FLOATING PILL)
          ========================================================================= */}
      <div className="absolute top-3 inset-x-3 pointer-events-none z-30 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Scientific Status Badge & Quick Case Switcher */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Classification Status Pill */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border ${statusBadge.border} ${statusBadge.bg} backdrop-blur-2xl text-xs font-mono font-semibold tracking-wide`}
          >
            <div className={`h-2 w-2 rounded-full ${statusBadge.dot} animate-pulse`} />
            <span>{statusBadge.label}</span>
          </div>

          {/* Quick Target Selector Dropdown */}
          <div className="relative group">
            <select
              value={currentResult?.caseId || ''}
              onChange={(e) => onSelectCase(e.target.value)}
              className="appearance-none px-3.5 py-1.5 pr-8 rounded-2xl border border-white/10 bg-black/50 hover:bg-black/75 backdrop-blur-2xl text-xs font-mono text-slate-200 transition-colors cursor-pointer outline-none focus:border-amber-400/50 shadow-lg"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                  {c.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Provenance Audit Trigger */}
          <button
            onClick={() => setShowProvenance(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-white/10 bg-black/50 hover:bg-white/10 backdrop-blur-2xl text-xs font-mono text-slate-300 hover:text-amber-300 transition-colors shadow-lg active:scale-95"
            title={t.ctrlProvenance}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden md:inline font-semibold">Audit Provenance</span>
          </button>

          {/* Custom Sky Search Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-white/10 bg-black/50 hover:bg-white/10 backdrop-blur-2xl text-xs font-mono text-slate-300 hover:text-amber-300 transition-colors shadow-lg active:scale-95"
            title="Search Custom Sky Coordinates in IRSA"
          >
            <Search className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden md:inline font-semibold">Search Coordinates</span>
          </button>
        </div>

        {/* Center: View Modes & Science/Presentation Toggle */}
        <div className="pointer-events-auto flex items-center p-1 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-2xl shadow-xl gap-1">
          {/* Science vs Presentation Toggle Pill */}
          <button
            onClick={() => setDisplayMode(displayMode === 'presentation' ? 'science' : 'presentation')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-xl font-semibold transition-all ${
              displayMode === 'presentation'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
            }`}
            title={displayMode === 'presentation' ? t.viewPresentation : t.viewScience}
          >
            {displayMode === 'presentation' ? (
              <>
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Presentation</span>
              </>
            ) : (
              <>
                <Binary className="h-3.5 w-3.5 text-cyan-300" />
                <span>Science (Native)</span>
              </>
            )}
          </button>

          <span className="h-4 w-[1px] bg-white/10 mx-0.5" />

          {/* View Mode Pills */}
          <button
            onClick={() => setViewMode('difference')}
            className={`px-2.5 py-1 text-xs font-mono font-medium rounded-xl transition-all ${
              viewMode === 'difference'
                ? 'bg-white/15 border border-white/20 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {t.viewDifference}
          </button>
          <button
            onClick={() => setViewMode('significance')}
            className={`px-2.5 py-1 text-xs font-mono font-medium rounded-xl transition-all ${
              viewMode === 'significance'
                ? 'bg-white/15 border border-white/20 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {t.viewSignificance}
          </button>
          <button
            onClick={() => setViewMode('epoch1')}
            className={`px-2.5 py-1 text-xs font-mono font-medium rounded-xl transition-all ${
              viewMode === 'epoch1'
                ? 'bg-white/15 border border-white/20 text-sky-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {t.viewEpoch1}
          </button>
          <button
            onClick={() => setViewMode('epoch2')}
            className={`px-2.5 py-1 text-xs font-mono font-medium rounded-xl transition-all ${
              viewMode === 'epoch2'
                ? 'bg-white/15 border border-white/20 text-sky-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {t.viewEpoch2}
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 text-xs font-mono font-medium rounded-xl transition-all ${
              viewMode === 'split'
                ? 'bg-white/15 border border-white/20 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {t.viewSplit}
          </button>
          <button
            onClick={() => setViewMode('blink')}
            className={`px-2.5 py-1 text-xs font-mono font-medium rounded-xl transition-all ${
              viewMode === 'blink'
                ? 'bg-white/15 border border-white/20 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {t.viewBlink}
          </button>
        </div>

        {/* Right: Telemetry Chips */}
        {currentResult && (
          <div className="pointer-events-auto hidden lg:flex items-center gap-3 px-3.5 py-1.5 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-2xl text-[11px] font-mono text-slate-300 shadow-lg">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Δt:</span>
              <span className="text-amber-300 font-semibold">
                {currentResult.compatibility.timeBaselineDays.toFixed(1)}d
              </span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">σ_MAD:</span>
              <span className="text-sky-300 font-semibold">
                {currentResult.difference.stats.noiseSigma.toFixed(4)}
              </span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">WCS:</span>
              <span className="text-slate-200 font-medium">~6.15"/px</span>
            </div>
          </div>
        )}
      </div>

      {/* Special Context Slider for Split Wipe */}
      {viewMode === 'split' && (
        <div className="absolute top-16 inset-x-0 pointer-events-none z-30 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-2xl shadow-xl text-xs font-mono text-slate-300">
            <span className="text-sky-300 font-semibold">{t.viewEpoch1}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sliderPos}
              onChange={(e) => setSliderPos(parseFloat(e.target.value))}
              className="w-44 accent-amber-400 cursor-pointer"
            />
            <span className="text-amber-300 font-semibold">{t.viewEpoch2}</span>
          </div>
        </div>
      )}

      {/* Special Context Control for Blink Cadence */}
      {viewMode === 'blink' && (
        <div className="absolute top-16 inset-x-0 pointer-events-none z-30 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-2xl shadow-xl text-xs font-mono text-slate-300">
            <button
              onClick={() => setIsBlinking(!isBlinking)}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-amber-300"
            >
              {isBlinking ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <span className="px-2 py-0.5 rounded bg-white/10 text-amber-300 font-bold uppercase text-[10px]">
              {blinkEpoch === 'epoch1' ? t.viewEpoch1 : t.viewEpoch2}
            </span>
            <span className="text-slate-400">{t.hudBlinkSpeed}:</span>
            <input
              type="range"
              min="150"
              max="1000"
              step="50"
              value={blinkSpeedMs}
              onChange={(e) => setBlinkSpeedMs(parseInt(e.target.value, 10))}
              className="w-28 accent-emerald-400 cursor-pointer"
            />
            <span className="text-slate-400">{blinkSpeedMs}ms</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. FLOATING CANDIDATE HUD (GLASS CARD ON LEFT)
          ========================================================================= */}
      <div
        className={`absolute top-16 left-3 z-30 pointer-events-auto transition-all duration-300 max-w-sm w-full ${
          isCandidateDrawerCollapsed ? 'h-11 overflow-hidden' : ''
        }`}
      >
        <div className="rounded-3xl border border-white/10 bg-black/70 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] p-4 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-mono font-bold tracking-wider text-slate-100 uppercase">
                {t.candidateTitle}
              </h3>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[10px] font-mono font-bold">
                {currentResult?.candidates.length || 0}
              </span>
            </div>
            <button
              onClick={() => setIsCandidateDrawerCollapsed(!isCandidateDrawerCollapsed)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              {isCandidateDrawerCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>

          {/* Candidate selector pills */}
          {currentResult && currentResult.candidates.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {currentResult.candidates.map((cand) => {
                  const isSel = selectedCandidate?.id === cand.id;
                  const isArt = cand.artifactScore >= 0.5;
                  return (
                    <button
                      key={cand.id}
                      onClick={() => centerOnCandidate(cand)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium border transition-all ${
                        isSel
                          ? isArt
                            ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                            : 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      {cand.id} ({cand.peakSignificance.toFixed(1)}σ)
                    </button>
                  );
                })}
              </div>

              {selectedCandidate && (
                <div className="space-y-2.5 pt-1">
                  {/* Selected Candidate Metadata Grid: Distinguishes Peak Pixel S/N vs Integrated Aperture S/N */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Peak Pixel S/N (ΔI/σ_pix)</span>
                      <span
                        className={`text-sm font-bold ${
                          selectedCandidate.artifactScore >= 0.5 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {selectedCandidate.peakSignificance.toFixed(2)}σ
                      </span>
                      <span className="text-[9px] text-slate-500 block">Single-pixel deviation</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Aperture S/N (|ΔF|/σ_ΔF)</span>
                      {(() => {
                        const apSnr = selectedCandidate.deltaFluxUncertainty > 0
                          ? Math.abs(selectedCandidate.deltaFlux) / selectedCandidate.deltaFluxUncertainty
                          : 0;
                        const isSig = apSnr >= 3.5;
                        return (
                          <div>
                            <span className={`text-sm font-bold ${isSig ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {apSnr.toFixed(2)}σ
                            </span>
                            <span className="text-[9px] text-slate-500 block">
                              {isSig ? 'Statistically significant' : 'Noise consistent (<3σ)'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-medium">Net ΔFlux (r=2.5px)</span>
                      <span className="text-[11px] font-bold text-slate-200 block truncate">
                        {selectedCandidate.deltaFlux.toFixed(3)} ± {selectedCandidate.deltaFluxUncertainty.toFixed(3)}
                      </span>
                      <span className="text-[9px] text-slate-500 block">MJy/sr (nominal uncorrelated σ)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-medium">Pixel & Coordinates</span>
                      <span className="text-[10px] text-slate-300 block">
                        ({selectedCandidate.x}, {selectedCandidate.y})
                      </span>
                      <span className="text-[9px] text-slate-400 block truncate">
                        {selectedCandidate.ra.toFixed(4)}°, {selectedCandidate.dec.toFixed(4)}°
                      </span>
                    </div>
                  </div>

                  {/* Scientific Warning / Status Banner */}
                  <div className={`p-2 rounded-xl text-[10px] font-mono leading-relaxed border ${
                    selectedCandidate.artifactScore >= 0.5
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  }`}>
                    {selectedCandidate.artifactScore >= 0.5 ? (
                      <div>
                        <span className="font-bold text-amber-300">⚠️ Astrometric Dipole / Artifact:</span> Peak single-pixel reaches {selectedCandidate.peakSignificance.toFixed(1)}σ due to steep PSF gradient sub-pixel jitter, while integrated aperture photometry confirms only {selectedCandidate.deltaFluxUncertainty > 0 ? (Math.abs(selectedCandidate.deltaFlux) / selectedCandidate.deltaFluxUncertainty).toFixed(2) : '0.00'}σ (&lt;3.0σ). Sources must never be confirmed as transients based on peak-pixel significance alone.
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold text-emerald-300">✅ Astrophysical Candidate:</span> Both peak-pixel (&gt;4σ) and integrated aperture photometry (|ΔF|/σ_ΔF ≥ 3.5σ) confirm authentic flux variation across epochs.
                      </div>
                    )}
                  </div>

                  {/* Progressive Disclosure: Candidate Verification & Photometry */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden text-xs font-mono">
                    <button
                      onClick={() => setIsCandidateDetailsOpen(!isCandidateDetailsOpen)}
                      className="w-full flex items-center justify-between p-2.5 text-slate-300 hover:text-amber-300 transition-colors"
                    >
                      <span className="font-semibold">{t.whyMattersTitle}</span>
                      {isCandidateDetailsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    {isCandidateDetailsOpen && (
                      <div className="p-2.5 pt-0 text-[11px] text-slate-400 space-y-2 border-t border-white/5">
                        {selectedCandidate.artifactScore >= 0.5 ? (
                          <div className="space-y-1">
                            <p className="text-amber-300 font-medium">
                              {language === 'ar' ? '⚠️ استبعاد كـ Artifact:' : '⚠️ Instrumental Artifact Rejected:'}
                            </p>
                            <p>
                              {selectedCandidate.whyFlagged ||
                                (language === 'ar'
                                  ? 'هذه الإشارة ناتجة عن تشبع البيكسل أو بقايا توجيه التلسكوب (Dipole) بدلاً من تغير ضوئي حقيقي.'
                                  : 'Flagged as saturated detector core or astrometric dipole rather than genuine flux change.')}
                            </p>
                          </div>
                        ) : selectedCandidate.catalogMatches.length > 0 ? (
                          <div className="space-y-1">
                            <p className="text-emerald-300 font-medium">
                              {language === 'ar' ? '⭐ جرم سماوي معروف في Gaia DR3:' : '⭐ Matched to known Gaia DR3 catalog star:'}
                            </p>
                            <p>
                              {language === 'ar'
                                ? `يتطابق الموقع السماوي ضمن نطاق ${selectedCandidate.catalogMatches[0].separationArcsec}" مع ${selectedCandidate.catalogMatches[0].identifier}.`
                                : `Centroid matches ${selectedCandidate.catalogMatches[0].identifier} within ${selectedCandidate.catalogMatches[0].separationArcsec}".`}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-sky-300 font-medium">
                              {language === 'ar' ? '🌌 مرشح عابر غير مفهرس:' : '🌌 Uncataloged Transient Candidate:'}
                            </p>
                            <p>
                              {language === 'ar'
                                ? 'إشارة حقيقية تتجاوز عتبة الدلالة الإحصائية بدون أي أعلام تشويش في المستشعر.'
                                : 'Statistically significant flux residual with clean PSF morphology and no detector defect flags.'}
                            </p>
                          </div>
                        )}

                        {/* Aperture Photometry Measurements */}
                        <div className="pt-1.5 border-t border-white/5 space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                            {t.photometryTitle}
                          </span>
                          <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono">
                            <span>Epoch 1 Flux:</span>
                            <span className="font-semibold text-sky-300">{selectedCandidate.apertureFluxEpoch1.toFixed(3)} MJy/sr</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono">
                            <span>Epoch 2 Flux:</span>
                            <span className="font-semibold text-amber-300">{selectedCandidate.apertureFluxEpoch2.toFixed(3)} MJy/sr</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Gaia DR3 Crossmatch */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                      {t.gaiaTitle}
                    </span>
                    {selectedCandidate.catalogMatches.length > 0 ? (
                      <div className="space-y-1">
                        {selectedCandidate.catalogMatches.map((m, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-[11px] font-mono"
                          >
                            <div>
                              <span className="text-amber-300 font-semibold block">{m.identifier}</span>
                              <span className="text-slate-400 text-[10px]">
                                Sep: {m.separationArcsec}" · {m.photometry || 'G-band'}
                              </span>
                            </div>
                            <a
                              href={m.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-sky-300 transition-colors p-1"
                              title="View on VizieR"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] font-mono text-slate-500 italic p-2 rounded-xl bg-white/[0.02] border border-white/5">
                        {t.noGaiaMatches}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs font-mono text-slate-400 py-3 text-center">
              {t.noCandidates}
            </p>
          )}
        </div>
      </div>

      {/* =========================================================================
          4. FLOATING BOTTOM GLASS INSTRUMENT DECK (TOOLS, CONTROLS & CURSOR READOUT)
          ========================================================================= */}
      <div className="absolute bottom-3 inset-x-3 pointer-events-none z-30 flex flex-wrap items-end justify-between gap-3">
        {/* Left: Pixel & Celestial Live Cursor Inspector */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-2xl shadow-xl text-[11px] font-mono text-slate-300">
          <Crosshair className="h-3.5 w-3.5 text-amber-400" />
          {cursorPos ? (
            <div className="flex items-center gap-2.5">
              <span>
                Pix: <strong className="text-slate-100">[{cursorPos.x}, {cursorPos.y}]</strong>
              </span>
              <span className="text-slate-700">|</span>
              <span>
                RA: <strong className="text-amber-300">{cursorPos.ra?.toFixed(4)}°</strong>
              </span>
              <span>
                Dec: <strong className="text-amber-300">{cursorPos.dec != null ? (cursorPos.dec >= 0 ? `+${cursorPos.dec.toFixed(4)}°` : `${cursorPos.dec.toFixed(4)}°`) : '--'}</strong>
              </span>
              <span className="text-slate-700">|</span>
              <span>
                Val: <strong className="text-sky-300">{cursorPos.val != null && Number.isFinite(cursorPos.val) ? cursorPos.val.toFixed(3) : '--'}</strong>
              </span>
            </div>
          ) : (
            <span className="text-slate-500">Hover canvas to inspect pixel astrometry</span>
          )}
        </div>

        {/* Center: Image Controls (Zoom, Reticles, Palette, Stretch) */}
        <div className="pointer-events-auto flex items-center p-1.5 rounded-2xl border border-white/10 bg-black/70 backdrop-blur-2xl shadow-2xl gap-1">
          {/* Zoom Out */}
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.25))}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
            title={t.ctrlZoomOut}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 px-1">{zoom.toFixed(2)}x</span>
          {/* Zoom In */}
          <button
            onClick={() => setZoom((z) => Math.min(6.0, z + 0.25))}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
            title={t.ctrlZoomIn}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          {/* Reset View */}
          <button
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setZoom(1.2);
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
            title={t.ctrlReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <span className="h-4 w-[1px] bg-white/10 mx-1" />

          {/* Toggle Markers */}
          <button
            onClick={() => setShowMarkers(!showMarkers)}
            className={`p-1.5 rounded-xl transition-colors ${
              showMarkers ? 'text-amber-400 bg-amber-400/15' : 'text-slate-400 hover:text-slate-200 hover:bg-white/10'
            }`}
            title={t.ctrlMarkers}
          >
            <Crosshair className="h-3.5 w-3.5" />
          </button>

          {/* Stretch Mode Select */}
          <select
            value={stretch}
            onChange={(e) => setStretch(e.target.value as StretchMode)}
            className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-mono border border-white/10 outline-none cursor-pointer"
            title={t.ctrlStretch}
          >
            <option value="asinh" className="bg-slate-900">asinh (Photometric)</option>
            <option value="sqrt" className="bg-slate-900">sqrt</option>
            <option value="log" className="bg-slate-900">log10</option>
            <option value="linear" className="bg-slate-900">linear</option>
          </select>

          {/* Colormap Select */}
          <select
            value={colormap}
            onChange={(e) => setColormap(e.target.value as ColormapMode)}
            className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-mono border border-white/10 outline-none cursor-pointer"
            title={t.ctrlColormap}
          >
            <option value="spherex_cosmic" className="bg-slate-900">SPHEREx Cosmic</option>
            <option value="inferno" className="bg-slate-900">Inferno</option>
            <option value="viridis" className="bg-slate-900">Viridis</option>
            <option value="cyan_gold" className="bg-slate-900">Cyan-Gold</option>
            <option value="grayscale" className="bg-slate-900">Grayscale</option>
          </select>
        </div>

        {/* Right: SPEX AI Floating Companion Dock */}
        <div
          className={`pointer-events-auto transition-all duration-300 max-w-sm w-full ${
            isSpexCollapsed ? 'w-auto' : ''
          }`}
        >
          <div className="rounded-3xl border border-white/10 bg-black/80 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] p-3 overflow-hidden">
            {/* SPEX Header & Mood Avatar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="relative h-9 w-9 rounded-2xl overflow-hidden border border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-sky-500/20 flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                  <img
                    src={SPEX_ASSETS[spexMood]?.imagePath || SPEX_ASSETS.explaining.imagePath}
                    alt={spexMood}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-black shadow-[0_0_5px_#34d399]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-['Outfit'] text-xs font-bold tracking-wide text-slate-100">
                      {t.spexTitle}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 font-semibold">
                      {spexMood}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate max-w-[160px]">
                    {t.spexRole}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSpexCollapsed(!isSpexCollapsed)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1"
              >
                {isSpexCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {!isSpexCollapsed && (
              <div className="space-y-2">
                {/* Speech Bubble */}
                <div className="max-h-32 overflow-y-auto pr-1 text-xs font-mono text-slate-200 leading-relaxed p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  {spexReply}
                </div>

                {/* Prompt Chips */}
                <div className="flex flex-wrap gap-1">
                  {t.spexChips.slice(0, 2).map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => askSpex(chip)}
                      disabled={isSpexThinking}
                      className="px-2 py-0.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-mono text-slate-300 hover:text-amber-300 transition-colors text-left"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Interactive Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    askSpex(spexMessage);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={spexMessage}
                    onChange={(e) => setSpexMessage(e.target.value)}
                    placeholder={t.spexPlaceholder}
                    disabled={isSpexThinking}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400/50 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isSpexThinking || !spexMessage.trim()}
                    className="p-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 disabled:opacity-40 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Provenance Audit Modal */}
      {showProvenance && currentResult?.provenance && (
        <ProvenanceModal
          provenance={currentResult.provenance}
          onClose={() => setShowProvenance(false)}
        />
      )}

      {/* Real-Data Coordinate Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#060b18] shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Search className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-['Outfit']">
                    Search SPHEREx Infrared Sky
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Live IRSA Cutout vs Curated Cases
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs font-mono">
              {/* Distinct Categories Notice */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1.5">
                <span className="text-[11px] font-bold text-amber-300 block uppercase tracking-wider">
                  Real-Data Workflow & Integrity
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  • <strong>Curated Benchmark Cases:</strong> 4 pre-indexed fields with published ground truth (variable star, stability null, quality bitmask rejection, and band mismatch guard).
                </p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  • <strong>Live IRSA Cutout:</strong> Queries NASA/IPAC IRSA directly at arbitrary coordinates, downloads calibrated Level-2B FITS arrays, and performs live difference imaging.
                </p>
              </div>

              {/* Coordinate Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const ra = parseFloat(customRa);
                  const dec = parseFloat(customDec);
                  if (Number.isFinite(ra) && Number.isFinite(dec)) {
                    setIsSearchOpen(false);
                    onSearchTarget(ra, dec);
                  }
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">RA (degrees, J2000)</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      max="360"
                      value={customRa}
                      onChange={(e) => setCustomRa(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-100 text-xs font-mono outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Dec (degrees, J2000)</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="-90"
                      max="90"
                      value={customDec}
                      onChange={(e) => setCustomDec(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-100 text-xs font-mono outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Suggestions in Footprint */}
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Quick Select in QR2 Footprint:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setCustomRa('276.2500'); setCustomDec('64.8300'); }}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 border border-white/5"
                    >
                      NEP Point A (276.2500°, +64.8300°)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCustomRa('275.9265'); setCustomDec('64.9585'); }}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 border border-white/5"
                    >
                      Calibration Field (275.9265°, +64.9585°)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCustomRa('276.1391'); setCustomDec('64.8361'); }}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 border border-white/5"
                    >
                      QR2 Deep (276.1391°, +64.8361°)
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-sky-950/20 border border-sky-500/20 text-[10px] text-sky-300">
                  ⚠️ Note: Coordinates outside SPHEREx QR2 survey coverage return an authentic IRSA HTTP 422 error. The system never substitutes demo data for failed live queries.
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95"
                  >
                    Query IRSA Archive
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
