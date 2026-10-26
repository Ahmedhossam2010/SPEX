import React, { useState, useEffect, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Sparkles,
  Layers,
  Info,
  Send,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Eye,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Flame,
  Palette,
  Play,
  Pause,
  Telescope,
} from 'lucide-react';
import {
  CandidateDetection,
  InvestigationResult,
} from '../science/types';
import { AstronomyRenderer, ColormapMode, StretchMode } from '../utils/astronomyRender';
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
  const [stretch, setStretch] = useState<StretchMode>('asinh');
  const [colormap, setColormap] = useState<ColormapMode>('heat');
  const [zoom, setZoom] = useState<number>(3.6);
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
  const [isWhyOpen, setIsWhyOpen] = useState<boolean>(true);
  const [isCandidateDrawerCollapsed, setIsCandidateDrawerCollapsed] = useState<boolean>(false);
  const [isSpexCollapsed, setIsSpexCollapsed] = useState<boolean>(false);

  // Search input state
  const [searchRa, setSearchRa] = useState<string>('276.2614');
  const [searchDec, setSearchDec] = useState<string>('64.8258');

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
      if (currentResult.targetCoords?.ra != null) {
        setSearchRa(currentResult.targetCoords.ra.toFixed(4));
      }
      if (currentResult.targetCoords?.dec != null) {
        setSearchDec(currentResult.targetCoords.dec.toFixed(4));
      }

      // Reset pan and zoom to center
      setPan({ x: 0, y: 0 });
      setZoom(3.6);

      // Default SPEX greeting based on classification and language
      if (currentResult.evidence.classification === 'SIGNIFICANT CHANGE DETECTED') {
        setSpexMood('eureka');
        setSpexReply(
          language === 'ar'
            ? `يا خبر كوني! 🚀 رصدنا إشارة حقيقية واضحة بنسبة S/N = ${currentResult.evidence.maxSignificance}σ عبر فارق زمني ${currentResult.compatibility.timeBaselineDays.toFixed(1)} يوم. افحص المرشح في الجدول!`
            : `Astrophysical flux excursion detected! 🚀 Peak residual significance S/N = ${currentResult.evidence.maxSignificance}σ across ${currentResult.compatibility.timeBaselineDays.toFixed(1)} days. Check the candidate card!`
        );
      } else if (currentResult.evidence.classification === 'NO SIGNIFICANT CHANGE DETECTED') {
        setSpexMood('serious');
        setSpexReply(
          language === 'ar'
            ? 'ثبات ضوئي ممتاز! 🔭 الفروق بين الحقبتين تقع بالكامل داخل نطاق الضوضاء الجاوسية للأجهزة. دي نتيجة أساسية لمعايرة سماء SPHEREx.'
            : 'Photometric baseline verified stable! 🔭 Difference residuals are strictly consistent with the Gaussian instrumental noise floor.'
        );
      } else if (currentResult.evidence.classification === 'POSSIBLE ARTIFACT') {
        setSpexMood('sassy');
        setSpexReply(
          language === 'ar'
            ? 'استنى هنا! ده مش كائن فضائي يا باشا 😂 ده مجرد Artifact/Persistence في المستشعر وتم كشفه بدقة عبر FITS Quality Bitmask (0x200000) عشان نمنع الاكتشافات الوهمية.'
            : 'Hold your horses! That 208σ spike is not an alien beacon—it is a detector persistence excursion (bit 0x200000) cleanly caught by our quality bitmask!'
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

  // Render to canvas
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
      { stretch, colormap: cm }
    );
  }, [currentResult, viewMode, blinkEpoch, stretch, colormap, sliderPos]);

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
          ? 'عفوًا يا نجم، السيرفر مهنج ثانية بس البيانات واضحة قدامك في الجدول!'
          : 'Telemetry glitch, astronomer! Please try again in a second.'
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
    // Normalized offset from center
    const offsetX = (w / 2 - cand.x) * (zoom * 5);
    const offsetY = (h / 2 - cand.y) * (zoom * 5);
    setPan({ x: offsetX, y: offsetY });
  };

  const getStatusBadge = (classification: string) => {
    switch (classification) {
      case 'SIGNIFICANT CHANGE DETECTED':
        return {
          label: t.statusSignificant,
          border: 'border-emerald-500/40',
          bg: 'bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
          dot: 'bg-emerald-400',
        };
      case 'NO SIGNIFICANT CHANGE DETECTED':
        return {
          label: t.statusStable,
          border: 'border-cyan-500/40',
          bg: 'bg-cyan-500/10 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]',
          dot: 'bg-cyan-400',
        };
      case 'POSSIBLE ARTIFACT':
        return {
          label: t.statusArtifact,
          border: 'border-amber-500/40',
          bg: 'bg-amber-500/10 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
          dot: 'bg-amber-400',
        };
      case 'INSUFFICIENT DATA':
        return {
          label: t.statusIncompatible,
          border: 'border-rose-500/40',
          bg: 'bg-rose-500/10 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]',
          dot: 'bg-rose-400',
        };
      default:
        return {
          label: t.statusUnknown,
          border: 'border-slate-500/40',
          bg: 'bg-slate-800 text-slate-300',
          dot: 'bg-slate-400',
        };
    }
  };

  if (isLoading || !currentResult) {
    return (
      <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#02040a] text-slate-200">
        <div className="relative flex flex-col items-center gap-4 p-8 rounded-3xl border border-white/[0.08] bg-black/60 backdrop-blur-2xl shadow-2xl max-w-md text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/20 via-sky-500/10 to-indigo-500/20 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <Telescope className="h-8 w-8 animate-pulse" />
            <div className="absolute inset-0 rounded-2xl border border-amber-400 animate-ping opacity-25" />
          </div>
          <div>
            <h3 className="font-['Outfit'] text-lg font-bold text-slate-100">
              {language === 'ar' ? 'جاري الاتصال بأرشيف IRSA ومرصد SPHEREx...' : 'Connecting to NASA/IPAC IRSA...'}
            </h3>
            <p className="text-xs font-mono text-slate-400 mt-1">
              {language === 'ar'
                ? 'تحميل بيانات FITS الأصلية، محاذاة WCS، وحساب خريطة الفروق الضوئية...'
                : 'Streaming Level-2B FITS cutouts, computing sub-pixel WCS registration & difference maps...'}
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
          1. DOMINANT CANVAS BACKGROUND (85%+ VIEWPORT PRESENCE)
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
          className="relative transition-transform duration-75 ease-out shadow-2xl rounded-lg overflow-hidden border border-white/[0.06]"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            imageRendering: 'pixelated',
          }}
        >
          <canvas
            ref={canvasRef}
            className="block w-[640px] h-[640px] pointer-events-auto"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* Interactive Candidate Reticle Overlay */}
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
                          ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_12px_#f59e0b]'
                          : 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_12px_#10b981]'
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
                      className={`absolute inset-0 rounded-full border animate-ping opacity-40 ${
                        isArtifact ? 'border-amber-400' : 'border-emerald-400'
                      }`}
                    />
                  </div>

                  {/* Hover Tag */}
                  <div className="absolute left-8 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-black/85 backdrop-blur-md border border-white/[0.1] text-[9px] font-mono text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="font-bold text-amber-300">{cand.id}</span> ·{' '}
                    <span>{cand.peakSignificance.toFixed(1)}σ</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* =========================================================================
          2. TOP FLOATING SPATIAL GLASS HUD BAR
          ========================================================================= */}
      <div className="absolute top-4 inset-x-4 pointer-events-none z-30 flex items-center justify-between gap-3">
        {/* Left: Scientific Status & Target Quick-Switch */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Classification Badge */}
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
              className="appearance-none px-3.5 py-1.5 pr-8 rounded-2xl border border-white/[0.1] bg-black/60 hover:bg-black/80 backdrop-blur-2xl text-xs font-mono text-slate-200 transition-colors cursor-pointer outline-none focus:border-amber-400/50 shadow-lg"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-white/[0.1] bg-black/60 hover:bg-white/[0.08] backdrop-blur-2xl text-xs font-mono text-slate-300 hover:text-amber-300 transition-colors shadow-lg active:scale-95"
            title={t.ctrlProvenance}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline font-semibold">Audit Provenance</span>
          </button>
        </div>

        {/* Right: Telemetry Readouts (Baseline, MAD Noise, Pixel Scale) */}
        {currentResult && (
          <div className="pointer-events-auto hidden md:flex items-center gap-3 px-4 py-1.5 rounded-2xl border border-white/[0.08] bg-black/50 backdrop-blur-2xl text-[11px] font-mono text-slate-300 shadow-xl">
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
              <span className="text-slate-500">Scale:</span>
              <span className="text-slate-200">~6.15"/px</span>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          3. FLOATING TOP-CENTER VIEW MODE PILL DOCK
          ========================================================================= */}
      <div className="absolute top-16 inset-x-0 pointer-events-none z-30 flex justify-center">
        <div className="pointer-events-auto flex items-center p-1 rounded-2xl border border-white/[0.08] bg-black/70 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] gap-1">
          <button
            onClick={() => setViewMode('difference')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-xl transition-all ${
              viewMode === 'difference'
                ? 'bg-gradient-to-r from-amber-500/25 to-sky-500/25 border border-amber-400/40 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            {t.viewDifference}
          </button>
          <button
            onClick={() => setViewMode('significance')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-xl transition-all ${
              viewMode === 'significance'
                ? 'bg-white/[0.12] border border-white/[0.2] text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            {t.viewSignificance}
          </button>
          <button
            onClick={() => setViewMode('epoch1')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-xl transition-all ${
              viewMode === 'epoch1'
                ? 'bg-white/[0.12] border border-white/[0.2] text-sky-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            {t.viewEpoch1}
          </button>
          <button
            onClick={() => setViewMode('epoch2')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-xl transition-all ${
              viewMode === 'epoch2'
                ? 'bg-white/[0.12] border border-white/[0.2] text-sky-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            {t.viewEpoch2}
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-xl transition-all ${
              viewMode === 'split'
                ? 'bg-white/[0.12] border border-white/[0.2] text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            {t.viewSplit}
          </button>
          <button
            onClick={() => setViewMode('blink')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-xl transition-all ${
              viewMode === 'blink'
                ? 'bg-white/[0.12] border border-white/[0.2] text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            {t.viewBlink}
          </button>
        </div>
      </div>

      {/* Special Context Slider for Split Wipe */}
      {viewMode === 'split' && (
        <div className="absolute top-28 inset-x-0 pointer-events-none z-30 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-2xl border border-white/[0.08] bg-black/80 backdrop-blur-2xl shadow-xl text-xs font-mono text-slate-300">
            <span className="text-sky-300 font-semibold">{t.viewEpoch1}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sliderPos}
              onChange={(e) => setSliderPos(parseFloat(e.target.value))}
              className="w-48 accent-amber-400 cursor-pointer"
            />
            <span className="text-amber-300 font-semibold">{t.viewEpoch2}</span>
          </div>
        </div>
      )}

      {/* Special Context Control for Blink Cadence */}
      {viewMode === 'blink' && (
        <div className="absolute top-28 inset-x-0 pointer-events-none z-30 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-2xl border border-white/[0.08] bg-black/80 backdrop-blur-2xl shadow-xl text-xs font-mono text-slate-300">
            <button
              onClick={() => setIsBlinking(!isBlinking)}
              className="p-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-amber-300"
            >
              {isBlinking ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <span className="px-2 py-0.5 rounded bg-white/[0.06] text-amber-300 font-bold uppercase text-[10px]">
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
              className="w-32 accent-emerald-400 cursor-pointer"
            />
            <span className="text-slate-400">{blinkSpeedMs}ms</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. FLOATING CANDIDATE HUD (LEFT / TOP-LEFT)
          ========================================================================= */}
      <div
        className={`absolute top-20 left-4 z-30 pointer-events-auto transition-all duration-300 max-w-sm w-full ${
          isCandidateDrawerCollapsed ? 'h-10 overflow-hidden' : ''
        }`}
      >
        <div className="rounded-3xl border border-white/[0.08] bg-black/75 backdrop-blur-2xl shadow-2xl overflow-hidden p-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-mono font-bold tracking-wider text-slate-100 uppercase">
                {t.candidateTitle}
              </h3>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[10px] font-mono font-bold">
                {currentResult?.candidates.length || 0}
              </span>
            </div>
            <button
              onClick={() => setIsCandidateDrawerCollapsed(!isCandidateDrawerCollapsed)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              {isCandidateDrawerCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Candidate selector pills if multiple */}
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
                            ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                            : 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                          : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                      }`}
                    >
                      {cand.id} ({cand.peakSignificance.toFixed(1)}σ)
                    </button>
                  );
                })}
              </div>

              {selectedCandidate && (
                <div className="space-y-3 pt-1">
                  {/* Selected Candidate Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Peak Significance</span>
                      <span
                        className={`text-sm font-bold ${
                          selectedCandidate.artifactScore >= 0.5
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {selectedCandidate.peakSignificance.toFixed(2)}σ
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Net ΔFlux (MJy/sr)</span>
                      <span className="text-sm font-bold text-slate-200">
                        {selectedCandidate.deltaFlux.toFixed(3)} ±{' '}
                        {selectedCandidate.deltaFluxUncertainty.toFixed(3)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">RA / Dec</span>
                      <span className="text-[11px] text-slate-300 truncate block">
                        {selectedCandidate.ra.toFixed(4)}°, {selectedCandidate.dec.toFixed(4)}°
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Pixel (x, y)</span>
                      <span className="text-[11px] text-slate-300 block">
                        ({selectedCandidate.x}, {selectedCandidate.y})
                      </span>
                    </div>
                  </div>

                  {/* Progressive Disclosure: Why Does This Matter? */}
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden text-xs font-mono">
                    <button
                      onClick={() => setIsWhyOpen(!isWhyOpen)}
                      className="w-full flex items-center justify-between p-2.5 text-slate-300 hover:text-amber-300 transition-colors"
                    >
                      <span className="font-semibold">{t.whyMattersTitle}</span>
                      {isWhyOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                    {isWhyOpen && (
                      <div className="p-2.5 pt-0 text-[11px] text-slate-400 space-y-2 border-t border-white/[0.04]">
                        {selectedCandidate.artifactScore >= 0.5 ? (
                          <div className="space-y-1">
                            <p className="text-amber-300 font-medium">
                              {language === 'ar'
                                ? '⚠️ كشف تشويش المستشعر (Detector Artifact):'
                                : '⚠️ Instrumental Artifact Rejected:'}
                            </p>
                            <p>
                              {selectedCandidate.whyFlagged ||
                                (language === 'ar'
                                  ? 'هذه الإشارة ناتجة عن تشبع المستشعر أو تأثير استمرار الصورة (Persistence) بدلاً من جرم فلكي حقيقي.'
                                  : 'Flagged as detector persistence or saturation spike rather than an astronomical point source.')}
                            </p>
                          </div>
                        ) : selectedCandidate.catalogMatches.length > 0 ? (
                          <div className="space-y-1">
                            <p className="text-emerald-300 font-medium">
                              {language === 'ar'
                                ? '⭐ نجم متغير معروف في كتالوج Gaia DR3:'
                                : '⭐ Matched to known Gaia DR3 catalog star:'}
                            </p>
                            <p>
                              {language === 'ar'
                                ? `يتطابق الموقع السماوي ضمن نطاق ${selectedCandidate.catalogMatches[0].separationArcsec}" مع ${selectedCandidate.catalogMatches[0].identifier}. التغير في التدفق يشير لتغير ضوئي حقيقي.`
                                : `Centroid matches ${selectedCandidate.catalogMatches[0].identifier} within ${selectedCandidate.catalogMatches[0].separationArcsec}". Physical flux slope indicates authentic stellar variability.`}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-sky-300 font-medium">
                              {language === 'ar'
                                ? '🌌 مرشح عابر غير مفهرس (Uncataloged Transient):'
                                : '🌌 Uncataloged Transient Candidate:'}
                            </p>
                            <p>
                              {language === 'ar'
                                ? 'الإشارة تتجاوز العتبة الإحصائية بدون أعلام تشويش ولا توجد نجوم معروفة في غايا عند هذه النقطة.'
                                : 'Significant flux residual with no detector artifact flags and no prior Gaia catalog counterpart.'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Gaia DR3 Crossmatch Table */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                      {t.gaiaTitle}
                    </span>
                    {selectedCandidate.catalogMatches.length > 0 ? (
                      <div className="space-y-1">
                        {selectedCandidate.catalogMatches.map((m, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between text-[11px] font-mono"
                          >
                            <div>
                              <span className="text-amber-300 font-semibold block">
                                {m.identifier}
                              </span>
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
                      <p className="text-[10px] font-mono text-slate-500 italic p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
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
          5. FLOATING BOTTOM GLASS PILL-DOCK (CANVAS TOOLS & CURSOR READOUT)
          ========================================================================= */}
      <div className="absolute bottom-4 inset-x-4 pointer-events-none z-30 flex items-end justify-between gap-4">
        {/* Left: Pixel & Celestial Inspector */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-3 px-4 py-2 rounded-2xl border border-white/[0.08] bg-black/70 backdrop-blur-2xl shadow-2xl text-[11px] font-mono text-slate-300">
          <Crosshair className="h-4 w-4 text-amber-400" />
          {cursorPos ? (
            <div className="flex items-center gap-3">
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
                Val: <strong className="text-sky-300">{cursorPos.val?.toFixed(3)}</strong>
              </span>
            </div>
          ) : (
            <span className="text-slate-500">Hover canvas to inspect pixel astrometry</span>
          )}
        </div>

        {/* Center: Image Controls (Zoom, Reticles, Palette, Stretch) */}
        <div className="pointer-events-auto flex items-center p-1.5 rounded-2xl border border-white/[0.08] bg-black/75 backdrop-blur-2xl shadow-2xl gap-1">
          {/* Zoom Out */}
          <button
            onClick={() => setZoom((z) => Math.max(1.0, z - 0.5))}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
            title={t.ctrlZoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 px-1">{zoom.toFixed(1)}x</span>
          {/* Zoom In */}
          <button
            onClick={() => setZoom((z) => Math.min(10.0, z + 0.5))}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
            title={t.ctrlZoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          {/* Reset Pan/Zoom */}
          <button
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setZoom(3.6);
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
            title={t.ctrlReset}
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <span className="h-4 w-[1px] bg-white/[0.1] mx-1" />

          {/* Toggle Markers */}
          <button
            onClick={() => setShowMarkers(!showMarkers)}
            className={`p-1.5 rounded-xl transition-colors ${
              showMarkers
                ? 'text-amber-400 bg-amber-400/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
            }`}
            title={t.ctrlMarkers}
          >
            <Crosshair className="h-4 w-4" />
          </button>

          {/* Stretch Mode Select */}
          <select
            value={stretch}
            onChange={(e) => setStretch(e.target.value as StretchMode)}
            className="px-2 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-[11px] font-mono border border-white/[0.06] outline-none cursor-pointer"
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
            className="px-2 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-[11px] font-mono border border-white/[0.06] outline-none cursor-pointer"
            title={t.ctrlColormap}
          >
            <option value="heat" className="bg-slate-900">Heat (Standard)</option>
            <option value="cyan_gold" className="bg-slate-900">Cyan-Gold (SPEX)</option>
            <option value="inferno" className="bg-slate-900">Inferno</option>
            <option value="grayscale" className="bg-slate-900">Grayscale</option>
          </select>
        </div>

        {/* Right: SPEX AI Floating Companion Dock */}
        <div
          className={`pointer-events-auto transition-all duration-300 max-w-sm w-full ${
            isSpexCollapsed ? 'w-auto' : ''
          }`}
        >
          <div className="rounded-3xl border border-white/[0.1] bg-black/85 backdrop-blur-2xl shadow-2xl p-3.5 overflow-hidden">
            {/* SPEX Header & Mood Avatar */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="relative h-10 w-10 rounded-2xl overflow-hidden border border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-sky-500/20 flex-shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                  <img
                    src={SPEX_ASSETS[spexMood]?.imagePath || SPEX_ASSETS.explaining.imagePath}
                    alt={spexMood}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-black shadow-[0_0_6px_#34d399]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-['Outfit'] text-xs font-bold tracking-wide text-slate-100">
                      {t.spexTitle}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 font-semibold">
                      {spexMood}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
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
              <div className="space-y-2.5">
                {/* Speech Bubble */}
                <div className="max-h-36 overflow-y-auto pr-1 text-xs font-mono text-slate-200 leading-relaxed p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  {spexReply}
                </div>

                {/* Prompt Chips */}
                <div className="flex flex-wrap gap-1">
                  {t.spexChips.slice(0, 2).map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => askSpex(chip)}
                      disabled={isSpexThinking}
                      className="px-2 py-0.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-[10px] font-mono text-slate-300 hover:text-amber-300 transition-colors text-left"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
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
                    className="flex-1 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400/50 transition-colors"
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
    </div>
  );
};
