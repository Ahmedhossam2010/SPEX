import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  Compass,
  Palette,
  ShieldAlert,
  Clock,
  Share2,
  Download,
  Info,
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  SplitSquareVertical,
  HelpCircle,
  Eye,
  X,
  Gauge,
  Film,
} from 'lucide-react';
import {
  CandidateDetection,
  InvestigationResult,
  SPHERExObservation,
} from '../science/types';
import { AstronomyRenderer, StretchMode, ColormapMode } from '../utils/astronomyRender';
import { WCS } from '../science/wcs';
import { Language, translations } from '../utils/translations';
import { SPEX_HERO_IMAGE, SPEX_AVATAR_INVESTIGATOR } from '../spex/spexAssets';
import { PostcardModal } from './TimeLens/PostcardModal';
import { SpectralExplorerModal } from './SpectralExplorerModal';
import { InteractiveConceptExplainerModal } from './InteractiveConceptExplainerModal';
import { Meter } from '../design/components/Meter';
import { Badge } from '../design/components/Badge';

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
  onToggleScientistMode?: () => void;
}

export type ActiveLens = 'TIME' | 'COLORS' | 'DOUBT' | 'NEIGHBORS' | null;

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
  onToggleScientistMode,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  // 1. Lens state & Presentation Mode
  const [activeLens, setActiveLens] = useState<ActiveLens>('TIME');
  const [showToolsDrawer, setShowToolsDrawer] = useState<boolean>(true);

  // 2. Playback & Temporal State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5x, 1x, 2x
  const [currentEpochIdx, setCurrentEpochIdx] = useState<number>(0);
  const [timeMode, setTimeMode] = useState<'video' | 'curtain'>('video');
  const [curtainPos, setCurtainPos] = useState<number>(0.5); // 0.0 to 1.0
  const [isCurtainDragging, setIsCurtainDragging] = useState<boolean>(false);

  // 3. Hidden Colors Lens State
  const [selectedBand, setSelectedBand] = useState<number>(1); // Band 1-6 or 0 for composite
  const [show102Modal, setShow102Modal] = useState<boolean>(false);

  // 4. Doubt Lens State
  const [showDoubtOverlay, setShowDoubtOverlay] = useState<boolean>(true);
  const [selectedGlitchPixel, setSelectedGlitchPixel] = useState<{ x: number; y: number; flag: number; name: string } | null>(null);

  // 5. Neighbors Lens State
  const [showNeighborsOverlay, setShowNeighborsOverlay] = useState<boolean>(true);
  const [selectedCatalogNeighbor, setSelectedCatalogNeighbor] = useState<any | null>(null);

  // 6. Interactive Spot & Candidate Selection
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetection | null>(null);
  const [tapPosition, setTapPosition] = useState<{ x: number; y: number; screenX: number; screenY: number } | null>(null);
  const [tappedEmptySpace, setTappedEmptySpace] = useState<boolean>(false);
  const [showSpexCard, setShowSpexCard] = useState<boolean>(false);
  const [showScientistDetails, setShowScientistDetails] = useState<boolean>(false);

  // 7. Modals
  const [showPostcardModal, setShowPostcardModal] = useState<boolean>(false);
  const [showExplainerModal, setShowExplainerModal] = useState<boolean>(false);

  // 8. Canvas Viewport (Zoom & Pan)
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 9. Guided Coach Marks (Step 0: None, 1: Play, 2: Tap, 3: SPEX)
  const [coachStep, setCoachStep] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('spex_coach_completed');
      return seen === 'true' ? 0 : 1;
    }
    return 1;
  });

  const handleNextCoach = () => {
    if (coachStep < 3) {
      setCoachStep((prev) => prev + 1);
    } else {
      setCoachStep(0);
      if (typeof window !== 'undefined') {
        localStorage.setItem('spex_coach_completed', 'true');
      }
    }
  };

  const handleSkipCoach = () => {
    setCoachStep(0);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spex_coach_completed', 'true');
    }
  };

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Target subtitle kicker
  const targetKicker = useMemo(() => {
    if (!currentResult) return '';
    const id = currentResult.caseId || '';
    if (id.includes('barnard')) {
      return isRtl ? 'نجم قزم أحمر سريع يركض عبر أرجاء الفضاء.' : 'A tiny red star racing across space.';
    }
    if (id.includes('wise')) {
      return isRtl ? 'عالم متجمد شبه نجمي على بعد 7 سنوات ضوئية.' : 'A frozen sub-stellar world 7 light years away.';
    }
    if (id.includes('rw-aur')) {
      return isRtl ? 'نجم فتي مضطرب محاط بأقراص غبارية دوامة.' : 'A violent young star with swirling dust discs.';
    }
    if (id.includes('dra')) {
      return isRtl ? 'عملاق أحمر نابض كنبضات قلب في الفضاء.' : 'A red giant that pulses like a beating heart.';
    }
    return isRtl ? 'نافذة عميقة في الكون المتغير بالأشعة تحت الحمراء.' : 'A deep window into the distant changing cosmos.';
  }, [currentResult?.caseId, isRtl]);

  // Authenticity badge variant
  const authenticityVariant = useMemo((): 'REAL' | 'SAVED' | 'TRAINING' => {
    if (!currentResult) return 'SAVED';
    if (currentResult.sourceMode === 'live') return 'REAL';
    if (currentResult.sourceMode === 'saved_benchmark') return 'SAVED';
    return 'SAVED';
  }, [currentResult?.sourceMode]);

  // Observations available for sequence
  const availableEpochs = useMemo(() => {
    if (!currentResult) return [];
    if (currentResult.epochs && currentResult.epochs.length > 0) {
      return currentResult.epochs;
    }
    const epList: any[] = [];
    if (currentResult.epoch1) {
      epList.push({
        epochIndex: 1,
        obsId: currentResult.epoch1.metadata?.obs_id || '2025W18_1B_0001_1',
        date: currentResult.epoch1.metadata?.date_obs || '2025-04-28T13:00:15 UTC',
        mjd: currentResult.epoch1.metadata?.t_min || 60793.5418,
        flux: currentResult.epoch1.flux,
        width: currentResult.epoch1.width,
        height: currentResult.epoch1.height,
        flags: currentResult.epoch1.flags,
      });
    }
    if (currentResult.epoch2) {
      epList.push({
        epochIndex: 2,
        obsId: currentResult.epoch2.metadata?.obs_id || '2025W18_1B_0001_2',
        date: currentResult.epoch2.metadata?.date_obs || '2025-04-28T13:02:24 UTC',
        mjd: currentResult.epoch2.metadata?.t_min || 60793.5433,
        flux: currentResult.epoch2.flux,
        width: currentResult.epoch2.width,
        height: currentResult.epoch2.height,
        flags: currentResult.epoch2.flags,
      });
    }
    return epList;
  }, [currentResult]);

  // Sync selected candidate when case loads
  useEffect(() => {
    if (currentResult && currentResult.candidates && currentResult.candidates.length > 0) {
      setSelectedCandidate(currentResult.candidates[0]);
      setShowSpexCard(true);
      setTappedEmptySpace(false);
    } else {
      setSelectedCandidate(null);
    }
  }, [currentResult?.caseId]);

  // Animation Loop for Video Mode
  useEffect(() => {
    if (!isPlaying || timeMode !== 'video' || availableEpochs.length < 2) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }

    const intervalMs = Math.round(900 / Math.max(0.2, playbackSpeed));
    playTimerRef.current = setInterval(() => {
      setCurrentEpochIdx((prev) => (prev + 1) % availableEpochs.length);
    }, intervalMs);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, timeMode, availableEpochs.length, playbackSpeed]);

  // Keyboard navigation for Curtain
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (timeMode !== 'curtain') return;
      if (e.key === 'ArrowLeft') {
        setCurtainPos((prev) => Math.max(0.02, prev - 0.04));
      } else if (e.key === 'ArrowRight') {
        setCurtainPos((prev) => Math.min(0.98, prev + 0.04));
      } else if (e.key === 'Home' || e.key === ' ') {
        setCurtainPos(0.5);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timeMode]);

  // Main Canvas Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentResult) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 512;
    const height = 512;
    canvas.width = width;
    canvas.height = height;

    const img1 = currentResult.epoch1;
    const img2 = currentResult.epoch2;
    const diff = currentResult.difference?.diff;

    // Helper: render single epoch flux to offscreen imageData
    const renderEpochData = (fluxData: Float32Array | number[] | undefined, bandMultiplier = 1.0): ImageData => {
      const imgData = ctx.createImageData(width, height);
      if (!fluxData || fluxData.length === 0) return imgData;

      const srcW = Math.round(Math.sqrt(fluxData.length)) || 64;
      const srcH = srcW;

      // Extract stats for optimal stretch
      const stats = AstronomyRenderer.computeDataStats(fluxData);
      const minVal = stats.min;
      const maxVal = Math.max(stats.max, minVal + 1e-4);
      const range = maxVal - minVal;

      for (let y = 0; y < height; y++) {
        const srcY = Math.min(srcH - 1, Math.floor((y / height) * srcH));
        for (let x = 0; x < width; x++) {
          const srcX = Math.min(srcW - 1, Math.floor((x / width) * srcW));
          const val = fluxData[srcY * srcW + srcX] ?? 0;

          // Asinh stretch
          let norm = Math.max(0, Math.min(1, (val - minVal) / range));
          norm = Math.asinh(norm * 4) / Math.asinh(4);

          const idx = (y * width + x) * 4;

          // Hidden Colors Band tinting
          if (activeLens === 'COLORS' && selectedBand > 0) {
            // Apply spectral tint according to band
            if (selectedBand === 1) { // 0.93 um - cool cyan/blue
              imgData.data[idx] = Math.round(norm * 180 * bandMultiplier);
              imgData.data[idx + 1] = Math.round(norm * 230 * bandMultiplier);
              imgData.data[idx + 2] = Math.round(norm * 255 * bandMultiplier);
            } else if (selectedBand === 2) { // 1.48 um - bright cyan
              imgData.data[idx] = Math.round(norm * 100 * bandMultiplier);
              imgData.data[idx + 1] = Math.round(norm * 220 * bandMultiplier);
              imgData.data[idx + 2] = Math.round(norm * 240 * bandMultiplier);
            } else if (selectedBand === 3) { // 2.0 um - emerald green
              imgData.data[idx] = Math.round(norm * 120 * bandMultiplier);
              imgData.data[idx + 1] = Math.round(norm * 240 * bandMultiplier);
              imgData.data[idx + 2] = Math.round(norm * 180 * bandMultiplier);
            } else if (selectedBand === 4) { // 3.1 um - warm amber
              imgData.data[idx] = Math.round(norm * 255 * bandMultiplier);
              imgData.data[idx + 1] = Math.round(norm * 185 * bandMultiplier);
              imgData.data[idx + 2] = Math.round(norm * 40 * bandMultiplier);
            } else if (selectedBand === 5) { // 4.1 um - orange red
              imgData.data[idx] = Math.round(norm * 255 * bandMultiplier);
              imgData.data[idx + 1] = Math.round(norm * 120 * bandMultiplier);
              imgData.data[idx + 2] = Math.round(norm * 30 * bandMultiplier);
            } else { // 4.7 um - deep magenta/rose
              imgData.data[idx] = Math.round(norm * 255 * bandMultiplier);
              imgData.data[idx + 1] = Math.round(norm * 80 * bandMultiplier);
              imgData.data[idx + 2] = Math.round(norm * 150 * bandMultiplier);
            }
          } else if (activeLens === 'COLORS' && selectedBand === 0) {
            // Infrared False-Color Composite (RGB)
            imgData.data[idx] = Math.round(norm * 245);
            imgData.data[idx + 1] = Math.round(norm * 160);
            imgData.data[idx + 2] = Math.round(norm * 210);
          } else {
            // Default deep space palette
            imgData.data[idx] = Math.round(norm * 240);
            imgData.data[idx + 1] = Math.round(norm * 220);
            imgData.data[idx + 2] = Math.round(norm * 180);
          }
          imgData.data[idx + 3] = 255;
        }
      }
      return imgData;
    };

    ctx.clearRect(0, 0, width, height);

    if (timeMode === 'curtain') {
      // Hero Feature: DRAGGABLE BEFORE / AFTER CURTAIN
      const splitPx = Math.round(curtainPos * width);

      // Render Epoch 1 (Left)
      const data1 = img1?.flux;
      if (data1) {
        const off1 = document.createElement('canvas');
        off1.width = width;
        off1.height = height;
        const ctx1 = off1.getContext('2d');
        if (ctx1) {
          ctx1.putImageData(renderEpochData(data1), 0, 0);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, splitPx, height);
          ctx.clip();
          ctx.drawImage(off1, 0, 0);
          ctx.restore();
        }
      }

      // Render Epoch 2 (Right)
      const data2 = img2?.flux || data1;
      if (data2) {
        const off2 = document.createElement('canvas');
        off2.width = width;
        off2.height = height;
        const ctx2 = off2.getContext('2d');
        if (ctx2) {
          ctx2.putImageData(renderEpochData(data2, 1.05), 0, 0);
          ctx.save();
          ctx.beginPath();
          ctx.rect(splitPx, 0, width - splitPx, height);
          ctx.clip();
          ctx.drawImage(off2, 0, 0);
          ctx.restore();
        }
      }

      // Dividing vertical line
      ctx.strokeStyle = '#FFB900';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(255, 185, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(splitPx, 0);
      ctx.lineTo(splitPx, height);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      // TIME VIDEO MODE: Display active epoch
      const activeData =
        currentEpochIdx === 0
          ? img1?.flux
          : currentEpochIdx === 1
          ? img2?.flux
          : availableEpochs[currentEpochIdx]?.flux || img1?.flux;

      if (activeData) {
        ctx.putImageData(renderEpochData(activeData), 0, 0);
      }
    }

    // LENS 3: DOUBT OVERLAY (Quality Mask & Artifacts)
    if (activeLens === 'DOUBT' && showDoubtOverlay && img1?.flags) {
      const flags = img1.flags;
      const srcW = Math.round(Math.sqrt(flags.length)) || 64;
      const srcH = srcW;

      ctx.save();
      for (let sy = 0; sy < srcH; sy++) {
        for (let sx = 0; sx < srcW; sx++) {
          const flg = flags[sy * srcW + sx];
          if (flg && flg > 0) {
            const dx = (sx / srcW) * width;
            const dy = (sy / srcH) * height;
            const dw = width / srcW;
            const dh = height / srcH;

            // Cosmic ray = magenta glow; Bad pixel = red; Saturation = amber
            if ((flg & 2) !== 0) {
              // Cosmic ray
              ctx.strokeStyle = '#FF637E';
              ctx.fillStyle = 'rgba(255, 99, 126, 0.35)';
            } else if ((flg & 4) !== 0) {
              // Saturation
              ctx.strokeStyle = '#FFB900';
              ctx.fillStyle = 'rgba(255, 185, 0, 0.35)';
            } else {
              // Bad pixel
              ctx.strokeStyle = '#F43F5E';
              ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
            }

            ctx.lineWidth = 1;
            ctx.strokeRect(dx, dy, dw, dh);
            ctx.fillRect(dx, dy, dw, dh);
          }
        }
      }
      ctx.restore();
    }

    // LENS 4: NEIGHBORS OVERLAY (Catalog-Matched Sources)
    if (activeLens === 'NEIGHBORS' && showNeighborsOverlay && currentResult.candidates) {
      ctx.save();
      currentResult.candidates.forEach((cand) => {
        if (cand.catalogMatches && cand.catalogMatches.length > 0) {
          const px = (cand.x / (img1?.width || 64)) * width;
          const py = (cand.y / (img1?.height || 64)) * height;

          // Catalog reticle
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, 14, 0, Math.PI * 2);
          ctx.stroke();

          // Reticle tick marks
          ctx.beginPath();
          ctx.moveTo(px - 18, py); ctx.lineTo(px - 14, py);
          ctx.moveTo(px + 14, py); ctx.lineTo(px + 18, py);
          ctx.moveTo(px, py - 18); ctx.lineTo(px, py - 14);
          ctx.moveTo(px, py + 14); ctx.lineTo(px, py + 18);
          ctx.stroke();

          // Label
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillStyle = '#6EE7B7';
          ctx.fillText(cand.catalogMatches[0].catalog, px + 18, py - 4);
          ctx.font = '8px "JetBrains Mono", monospace';
          ctx.fillStyle = '#CBD5E1';
          ctx.fillText(cand.catalogMatches[0].identifier.slice(0, 14), px + 18, py + 8);
        }
      });
      ctx.restore();
    }

    // CANDIDATE MOTION ARROW / RETICLE
    if (selectedCandidate) {
      const cx = (selectedCandidate.x / (img1?.width || 64)) * width;
      const cy = (selectedCandidate.y / (img1?.height || 64)) * height;

      ctx.save();
      // Animated glowing target ring
      ctx.strokeStyle = '#FFB900';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255, 185, 0, 0.8)';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - 26, cy); ctx.lineTo(cx - 20, cy);
      ctx.moveTo(cx + 20, cy); ctx.lineTo(cx + 26, cy);
      ctx.moveTo(cx, cy - 26); ctx.lineTo(cx, cy - 20);
      ctx.moveTo(cx, cy + 20); ctx.lineTo(cx, cy + 26);
      ctx.stroke();

      // Motion Trail (if moving)
      if (selectedCandidate.motion?.isMoving || selectedCandidate.scientificClassification === 'POSSIBLE_MOVING_OBJECT') {
        ctx.strokeStyle = '#00D3F3';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 18, cy - 14);
        ctx.stroke();
        ctx.setLineDash([]);

        // Small end point
        ctx.fillStyle = '#00D3F3';
        ctx.beginPath();
        ctx.arc(cx + 18, cy - 14, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }, [
    currentResult,
    timeMode,
    curtainPos,
    currentEpochIdx,
    activeLens,
    selectedBand,
    showDoubtOverlay,
    showNeighborsOverlay,
    selectedCandidate,
    availableEpochs,
  ]);

  // Curtain Drag Handlers
  const handleCurtainPointerDown = (e: React.PointerEvent) => {
    if (timeMode !== 'curtain') return;
    setIsCurtainDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handleCurtainMove(e.clientX);
  };

  const handleCurtainMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const raw = (clientX - rect.left) / rect.width;
    let clamped = Math.max(0.02, Math.min(0.98, raw));
    // Magnetic snap at 50%
    if (Math.abs(clamped - 0.5) < 0.035) {
      clamped = 0.5;
    }
    setCurtainPos(clamped);
  };

  const handleCurtainPointerMove = (e: React.PointerEvent) => {
    if (isCurtainDragging) {
      handleCurtainMove(e.clientX);
    }
  };

  const handleCurtainPointerUp = (e: React.PointerEvent) => {
    setIsCurtainDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Interactive Spot Tap on Sky Image
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCurtainDragging) return;
    if (!containerRef.current || !currentResult) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const normX = clickX / rect.width;
    const normY = clickY / rect.height;

    const imgW = currentResult.epoch1?.width || 64;
    const imgH = currentResult.epoch1?.height || 64;

    const pixX = Math.floor(normX * imgW);
    const pixY = Math.floor(normY * imgH);

    setTapPosition({ x: clickX, y: clickY, screenX: e.clientX, screenY: e.clientY });

    // Check if clicked near a candidate (within 8 image pixels)
    const match = currentResult.candidates?.find(
      (c) => Math.hypot(c.x - pixX, c.y - pixY) <= 8
    );

    if (match) {
      setSelectedCandidate(match);
      setTappedEmptySpace(false);
      setShowSpexCard(true);
    } else {
      // Check if Doubt Lens is active and user clicked a flagged pixel
      const flags = currentResult.epoch1?.flags;
      if (activeLens === 'DOUBT' && flags) {
        const flg = flags[pixY * imgW + pixX] || 0;
        if (flg > 0) {
          setSelectedGlitchPixel({
            x: pixX,
            y: pixY,
            flag: flg,
            name: (flg & 2) !== 0 ? 'Cosmic Ray Hit' : (flg & 4) !== 0 ? 'Saturated Detector Pixel' : 'Bad Detector Pixel',
          });
          setShowSpexCard(true);
          return;
        }
      }

      // Empty background clicked
      setSelectedCandidate(null);
      setTappedEmptySpace(true);
      setShowSpexCard(true);
    }

    // Progress coach marks if on step 2
    if (coachStep === 2) {
      handleNextCoach();
    }
  };

  // Plain-Language SPEX Verdict
  const spexVerdict = useMemo(() => {
    if (selectedGlitchPixel) {
      return isRtl
        ? 'احذر: هذا بكسل مشوش أو خلل في الكاشف، وليس جرماً حقيقياً.'
        : 'Warning: Instrument glitch detected in quality mask. Do not trust this difference.';
    }
    if (tappedEmptySpace) {
      return isRtl
        ? 'السماء هنا ثابتة تماماً—لم نرصد أي حركة أو وميض في هذه البقعة.'
        : 'The sky is steady here — no moving dots or flaring stars detected in this spot.';
    }
    if (selectedCandidate) {
      if (
        selectedCandidate.scientificClassification === 'POSSIBLE_MOVING_OBJECT' ||
        selectedCandidate.motion?.isMoving
      ) {
        return isRtl
          ? 'هذه النقطة تحركت وتغير موقعها بين اللقطتين!'
          : 'This dot moved between the pictures!';
      }
      if (
        selectedCandidate.scientificClassification === 'SIGNIFICANT_FLUX_CHANGE' ||
        selectedCandidate.status === 'Significant flux change'
      ) {
        return isRtl
          ? 'هذا الجرم ومض وازداد سطوعه بشكل ملحوظ!'
          : 'This celestial source flared and changed brightness!';
      }
      if (
        selectedCandidate.scientificClassification === 'REGISTRATION_OR_PSF_ARTIFACT' ||
        selectedCandidate.status === 'Possible artifact'
      ) {
        return isRtl
          ? 'احذر: هذا بكسل مشوش أو خلل في الكاشف، وليس جرماً حقيقياً.'
          : 'Warning: Instrument glitch detected in quality mask. Do not trust this difference.';
      }
      return isRtl
        ? 'رصدنا تغيراً ضوئياً حقيقياً هنا!'
        : 'A genuine infrared change detected here!';
    }
    return isRtl
      ? 'المس أي نقطة في السماء وسأخبرك بما رصدته كاميرا سفيركس!'
      : 'Tap any spot in the sky and I will tell you what SPHEREx detected!';
  }, [selectedCandidate, tappedEmptySpace, selectedGlitchPixel, isRtl]);

  // Plain language "What could this be?"
  const whatItCouldBe = useMemo(() => {
    if (selectedGlitchPixel) {
      return isRtl
        ? `${selectedGlitchPixel.name} (قناع الجودة SPHEREx Bitmask ${selectedGlitchPixel.flag})`
        : `${selectedGlitchPixel.name} (Flagged in SPHEREx Quality Bitmask ${selectedGlitchPixel.flag})`;
    }
    if (tappedEmptySpace) {
      return isRtl ? 'خلفية فضائية ثابتة هادئة' : 'Steady interstellar background';
    }
    if (selectedCandidate) {
      if (selectedCandidate.catalogMatches && selectedCandidate.catalogMatches.length > 0) {
        const m = selectedCandidate.catalogMatches[0];
        return `${m.catalog}: ${m.identifier} (${m.objectType || (isRtl ? 'نجم معروف' : 'Known star')})`;
      }
      if (selectedCandidate.status === 'Likely known source') {
        return isRtl ? 'نجم مرجعي معروف في الفهارس' : 'Known stellar reference source';
      }
      if (selectedCandidate.status === 'Possible artifact') {
        return isRtl ? 'خلل في الكاشف أو أثر أشعة كونية' : 'Detector artifact or cosmic ray strike';
      }
      return isRtl ? 'مرشح لجرم سماوي متحرك أو قزم أحمر سريع الحركة' : 'Unknown moving sub-stellar candidate or high proper-motion dwarf';
    }
    return isRtl ? 'انقر على جرم سماوي للبدء' : 'Tap a celestial source to begin';
  }, [selectedCandidate, tappedEmptySpace, selectedGlitchPixel, isRtl]);

  // Loading State (Themed Detector Scan)
  if (isLoading) {
    return (
      <div className="relative w-full min-h-[85vh] flex flex-col items-center justify-center bg-[#02040A] text-slate-100 p-6 overflow-hidden select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-[#FFB900]/40 flex items-center justify-center text-[#FFB900] mb-5 shadow-[0_0_30px_rgba(255,185,0,0.3)] animate-pulse">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="font-serif text-lg sm:text-2xl font-bold text-white mb-2 tracking-wide text-center">
          {isRtl ? 'جاري فحص كواشف SPHEREx ومطابقة اللقطات...' : 'Scanning SPHEREx detector arrays & aligning frames...'}
        </h3>
        <p className="font-mono text-xs text-[#00D3F3] tracking-widest uppercase text-center max-w-md">
          {isRtl ? 'نظام التحليل الزمني يقرأ ملفات FITS الحقيقية من أرشيف ناسا' : 'Calibrating sub-pixel WCS and reading authentic infrared FITS cutouts'}
        </p>
      </div>
    );
  }

  // Unavailable Data / Empty State
  if (!currentResult || !currentResult.epoch1) {
    return (
      <div className="relative w-full min-h-[85vh] flex flex-col items-center justify-center bg-[#02040A] text-slate-100 p-6 overflow-hidden select-none">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-[#FF637E]/40 flex items-center justify-center text-[#FF637E] mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="font-serif text-lg sm:text-xl font-bold text-white mb-2 text-center">
          {isRtl ? 'لم يقم أحد بفحص هذه الرقعة في هذا الإصدار بعد' : 'Nobody has looked at this patch in this release yet'}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 text-center max-w-md mb-6">
          {isRtl
            ? 'الإحداثيات الحالية تقع خارج النطاق الفوري لبيانات QR2. يمكنك تجربة أهدافنا المرجعية المحققة مثل نجم برنارد أو رقعة القطب الشمالي.'
            : 'Coordinates lie outside current verification coverage. Explore our verified benchmark cases like Barnard’s Star or NEP Deep Survey.'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBackToSky}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer"
          >
            {t.backToSky}
          </button>
          <button
            type="button"
            onClick={() => onSelectCase('case-barnards-star')}
            className="px-4 py-2 rounded-xl bg-[#FFB900] hover:bg-[#FFB900]/90 text-slate-950 font-bold text-xs transition cursor-pointer shadow-[0_0_15px_rgba(255,185,0,0.3)]"
          >
            {isRtl ? 'فحص نجم برنارد (GJ 699)' : "Inspect Barnard's Star"}
          </button>
        </div>
      </div>
    );
  }

  const targetCoords = currentResult.targetCoords || { ra: 276.2614, dec: 64.8258 };
  const targetTitle = currentResult.title || "Barnard's Star";

  return (
    <div
      className="relative w-full min-h-[92vh] flex flex-col bg-[#02040A] text-slate-100 select-none overflow-hidden"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* =========================================================================
          SECTION B: COMPACT TOP NAVIGATION (Slim & Honest)
         ========================================================================= */}
      <header className="relative z-30 w-full px-3 sm:px-6 py-2.5 flex items-center justify-between border-b border-white/[0.08] bg-[#02040A]/80 backdrop-blur-md">
        {/* Left: Back to Sky & Target Name */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToSky}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-200 transition cursor-pointer active:scale-95"
            title={t.backToSky}
          >
            {isRtl ? <ChevronRight className="w-4 h-4 text-[#FFB900]" /> : <ChevronLeft className="w-4 h-4 text-[#FFB900]" />}
            <span>{t.backToSky}</span>
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-sm sm:text-base font-bold text-white truncate leading-tight">
                {targetTitle}
              </h2>
              <Badge variant={authenticityVariant} size="sm" />
            </div>
            <p className="text-[11px] text-slate-400 font-sans truncate hidden sm:block">
              {targetKicker}
            </p>
          </div>
        </div>

        {/* Right: Scientist Mode & Postcard Share */}
        <div className="flex items-center gap-2">
          {/* Postcard Share Button */}
          <button
            type="button"
            onClick={() => setShowPostcardModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#FFB900]/30 bg-[#FFB900]/10 hover:bg-[#FFB900]/20 text-xs font-semibold text-[#FFB900] transition cursor-pointer active:scale-95"
            title={t.btnExportPostcard}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isRtl ? 'بطاقة الاكتشاف' : 'Postcard'}</span>
          </button>

          {/* Scientist Mode Toggle */}
          <button
            type="button"
            onClick={onToggleScientistMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-[#00D3F3] transition cursor-pointer active:scale-95"
            title="Switch to Full Scientist Mode"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.scientistMode}</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          SECTION A: MAIN SKY VIEWPORT (>= 70% Viewport Height)
         ========================================================================= */}
      <main className="relative flex-1 w-full min-h-[68vh] sm:min-h-[72vh] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        {/* Subtle Cosmic Background Dust & Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/40 via-transparent to-black" />

        {/* The Frame Container */}
        <div
          ref={containerRef}
          onClick={handleCanvasClick}
          onPointerDown={handleCurtainPointerDown}
          onPointerMove={handleCurtainPointerMove}
          onPointerUp={handleCurtainPointerUp}
          onPointerCancel={handleCurtainPointerUp}
          className={`relative w-full max-w-2xl aspect-square sm:aspect-square rounded-2xl bg-black border border-white/15 overflow-hidden shadow-2xl flex items-center justify-center select-none ${
            timeMode === 'curtain' ? 'cursor-ew-resize touch-none' : 'cursor-crosshair'
          }`}
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transition: isCurtainDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          {/* Authentic Crop Marks */}
          <div className="crop-mark-tl" />
          <div className="crop-mark-tr" />
          <div className="crop-mark-bl" />
          <div className="crop-mark-br" />

          {/* Faint Detector Pixel Grid Overlay */}
          <div className="absolute inset-0 detector-grid opacity-30 pointer-events-none" />

          {/* Main FITS Canvas */}
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain image-rendering-pixelated"
          />

          {/* HUD Top Left: Coordinates */}
          <div className="absolute top-3 left-3 pointer-events-none bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 font-mono text-[10px] text-[#00D3F3]">
            RA {targetCoords.ra.toFixed(4)}° · DEC {targetCoords.dec >= 0 ? '+' : ''}{targetCoords.dec.toFixed(4)}° · FOV ~6.6′
          </div>

          {/* HUD Bottom Left: Observation Date & Wavelength */}
          <div className="absolute bottom-3 left-3 pointer-events-none bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 font-mono text-[10px] text-slate-300">
            {timeMode === 'curtain' ? (
              <span>
                <span className="text-[#00D3F3]">E1: {currentResult.epoch1?.metadata?.date_obs?.split('T')[0] || '2025-04-28'}</span>
                {' · '}
                <span className="text-[#FFB900]">E2: {currentResult.epoch2?.metadata?.date_obs?.split('T')[0] || '2025-04-28'}</span>
              </span>
            ) : (
              <span>
                {availableEpochs[currentEpochIdx]?.date?.split('T')[0] || '2025-04-28'} · λ ={' '}
                {activeLens === 'COLORS' ? `${[0.93, 1.48, 2.0, 3.1, 4.1, 4.7][selectedBand - 1] || 1.48} µm` : '1.48 µm'}
              </span>
            )}
          </div>

          {/* Curtain Mode: Draggable Handle */}
          {timeMode === 'curtain' && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-14 rounded-xl bg-[#FFB900] text-slate-950 flex flex-col items-center justify-center shadow-[0_0_25px_rgba(255,185,0,0.6)] pointer-events-none z-20"
              style={{ left: `${curtainPos * 100}%` }}
            >
              <SplitSquareVertical className="w-4 h-4" />
            </div>
          )}

          {/* Animated Tap Ping Indicator */}
          {tapPosition && (
            <div
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full border-2 border-[#00D3F3] animate-ping"
              style={{ left: tapPosition.x, top: tapPosition.y }}
            />
          )}

          {/* Curtain Drag Prompt Hint */}
          {timeMode === 'curtain' && (
            <div className="absolute top-3 right-3 pointer-events-none bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 font-mono text-[10px] text-[#FFB900]">
              {t.curtainDragPrompt}
            </div>
          )}
        </div>

        {/* =========================================================================
            COACH MARKS OVERLAY (3 Steps, Skippable)
           ========================================================================= */}
        {coachStep > 0 && (
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#0C0E14] border border-[#FFB900]/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#FFB900] uppercase tracking-wider font-semibold">
                  {isRtl ? `خطوة إرشادية ${coachStep} من 3` : `STEP ${coachStep} OF 3`}
                </span>
                <button
                  type="button"
                  onClick={handleSkipCoach}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  {t.coachSkip}
                </button>
              </div>

              <h4 className="font-serif text-base font-bold text-white leading-snug">
                {coachStep === 1
                  ? t.coachPlayTitle
                  : coachStep === 2
                  ? t.coachTapTitle
                  : t.coachSpexTitle}
              </h4>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {coachStep === 1
                  ? (isRtl ? 'اضغط زر التشغيل بالأسفل لترى كيف تتغير السماء بين اللقطات الزمنية.' : 'Press play in the bottom bar to watch celestial dots change between observation passes.')
                  : coachStep === 2
                  ? (isRtl ? 'المس أي نجم أو بكسل تشك في قفزته وسيقوم سبيكس بفحصه فوراً.' : 'Tap any source on the astronomical frame that appears to move or blink.')
                  : (isRtl ? 'سبيكس يخبرك هل الجرم كويكب متحرك، أم نجم متغير، أم مجرد خلل في الكاشف.' : 'SPEX will analyze whether the spot is a real moving body, a variable star, or an instrument glitch.')}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleNextCoach}
                  className="px-4 py-1.5 rounded-xl bg-[#FFB900] hover:bg-[#FFB900]/90 text-slate-950 font-bold text-xs transition cursor-pointer shadow-sm"
                >
                  {coachStep === 3 ? t.coachGotIt : t.coachNext}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 9 & 10: SPEX CAT CONTEXTUAL DISCOVERY CARD (Slide-up Glass)
           ========================================================================= */}
        {showSpexCard && (
          <div className="absolute bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-30 animate-in slide-in-from-bottom duration-200">
            <div className="relative rounded-2xl bg-[#0C0E14]/90 border border-white/15 backdrop-blur-xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowSpexCard(false)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                aria-label="Close SPEX Card"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header: Cat avatar + Verdict */}
              <div className="flex items-start gap-3">
                <div className="relative shrink-0 w-12 h-12 rounded-xl bg-amber-500/10 border border-[#FFB900]/30 overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(255,185,0,0.25)]">
                  <img
                    src={SPEX_HERO_IMAGE}
                    alt="SPEX Cat Guide"
                    className="w-full h-full object-contain p-1"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <span className="font-mono text-[10px] text-[#FFB900] uppercase tracking-wider font-semibold block">
                    SPEX VERDICT
                  </span>
                  <h4 className="text-sm sm:text-base font-serif font-bold text-white leading-snug mt-0.5">
                    {spexVerdict}
                  </h4>
                </div>
              </div>

              {/* Level 2: What it could be */}
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <span className="text-[10px] font-mono uppercase text-[#00D3F3] tracking-wider block mb-1">
                  {isRtl ? 'الهوية الفلكية المحتملة' : 'Astronomical Context'}
                </span>
                <p className="text-xs sm:text-sm text-slate-200 font-sans font-medium">
                  {whatItCouldBe}
                </p>
              </div>

              {/* 5-Level Confidence Meter */}
              {selectedCandidate && (
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>{t.confidenceMeterLabel}</span>
                    <span className="text-[#00D3F3]">{selectedCandidate.peakSignificance.toFixed(1)}σ</span>
                  </div>
                  <Meter
                    level={Math.max(1, Math.min(5, Math.round((selectedCandidate.peakSignificance / 10) * 5)))}
                    significanceSigma={selectedCandidate.peakSignificance}
                  />
                </div>
              )}

              {/* Level 3: Collapsible Scientist Details */}
              {selectedCandidate && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowScientistDetails(!showScientistDetails)}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-slate-400 hover:text-white transition cursor-pointer font-mono"
                  >
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#00D3F3]" />
                      <span>{showScientistDetails ? (isRtl ? 'إخفاء الأرقام' : 'Hide Technical Details') : t.spexExploreScience}</span>
                    </span>
                    <span className="text-[10px] text-[#FFB900]">{showScientistDetails ? '▲' : '▼'}</span>
                  </button>

                  {showScientistDetails && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col gap-1.5 font-mono text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span>RA / DEC:</span>
                        <span className="text-white">{selectedCandidate.ra.toFixed(5)}°, {selectedCandidate.dec.toFixed(5)}°</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DELTA FLUX:</span>
                        <span className="text-[#00D3F3]">{selectedCandidate.deltaFlux.toFixed(3)} MJy/sr</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PEAK SIGMA:</span>
                        <span className="text-[#FFB900]">{selectedCandidate.peakSignificance.toFixed(2)}σ</span>
                      </div>
                      {selectedCandidate.artifactFlags && selectedCandidate.artifactFlags.length > 0 && (
                        <div className="flex justify-between">
                          <span>FLAGS:</span>
                          <span className="text-rose-400">{selectedCandidate.artifactFlags.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions: Export Postcard */}
              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowExplainerModal(true)}
                  className="text-xs text-[#00D3F3] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'كيف نميز الحركة؟' : 'How does SPEX spot motion?'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPostcardModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#FFB900] hover:bg-[#FFB900]/90 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'مشاركة البطاقة' : 'Share Postcard'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          SECTION 4: LENS ONE — TIME (Bottom Scrubber & Video Controls)
         ========================================================================= */}
      <section className="relative z-20 w-full px-3 sm:px-6 py-2.5 bg-[#05070E]/90 border-t border-white/[0.08] backdrop-blur-md flex flex-col gap-2">
        <div className="max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Big Amber Play Button + Previous / Next */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const prev = (currentEpochIdx - 1 + availableEpochs.length) % availableEpochs.length;
                setCurrentEpochIdx(prev);
              }}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition cursor-pointer"
              aria-label="Previous frame"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(!isPlaying);
                if (coachStep === 1) handleNextCoach();
              }}
              className="px-5 py-2.5 min-h-[48px] rounded-xl bg-[#FFB900] hover:bg-[#FFB900]/90 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(255,185,0,0.35)] transition cursor-pointer active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950" />}
              <span>{isPlaying ? t.framePlayerPause : t.framePlayerPlay}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = (currentEpochIdx + 1) % availableEpochs.length;
                setCurrentEpochIdx(next);
              }}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition cursor-pointer"
              aria-label="Next frame"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Curtain vs Video Mode Switcher */}
            <div className="flex items-center p-1 bg-black/60 rounded-xl border border-white/10 text-xs font-mono ml-2">
              <button
                type="button"
                onClick={() => setTimeMode('video')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  timeMode === 'video' ? 'bg-[#FFB900] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.playerMode}
              </button>
              <button
                type="button"
                onClick={() => setTimeMode('curtain')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  timeMode === 'curtain' ? 'bg-[#00D3F3] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.curtainMode}
              </button>
            </div>
          </div>

          {/* Center: Timeline Scrubber */}
          <div className="flex-1 w-full flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={Math.max(1, availableEpochs.length - 1)}
              value={currentEpochIdx}
              onChange={(e) => setCurrentEpochIdx(parseInt(e.target.value, 10))}
              className="flex-1 accent-[#FFB900] cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              aria-label="Epoch timeline scrubber"
            />
            <span className="font-mono text-xs text-slate-400 shrink-0">
              {currentEpochIdx + 1} / {availableEpochs.length}
            </span>
          </div>

          {/* Right: Reset Curtain Button (if curtain mode) or Speed */}
          {timeMode === 'curtain' ? (
            <button
              type="button"
              onClick={() => setCurtainPos(0.5)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-mono transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#FFB900]" />
              <span>{t.resetCurtain}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
              <Gauge className="w-3.5 h-3.5 text-[#00D3F3]" />
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                    playbackSpeed === spd ? 'bg-[#00D3F3]/20 text-[#00D3F3] font-bold' : 'hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cadence Plain Honesty Line */}
        <p className="text-[11px] text-slate-400 font-sans text-center max-w-2xl mx-auto">
          {t.timeCadenceHonesty}
        </p>
      </section>

      {/* =========================================================================
          SECTION C: BOTTOM LENS DOCK (Four Interactive Scientific Lenses)
         ========================================================================= */}
      <footer className="relative z-30 w-full px-3 sm:px-6 py-2.5 bg-[#02040A] border-t border-white/[0.08] flex flex-col items-center gap-2">
        {/* The 4 Lens Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {/* LENS 1: TIME */}
          <button
            type="button"
            onClick={() => {
              setActiveLens(activeLens === 'TIME' ? null : 'TIME');
              setShowToolsDrawer(true);
            }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 min-h-[44px] rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer select-none active:scale-95 ${
              activeLens === 'TIME'
                ? 'border-[#FFB900] bg-[#FFB900]/15 text-[#FFB900] shadow-[0_0_15px_rgba(255,185,0,0.3)]'
                : 'border-white/10 bg-[#0C0E14] text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{t.lensTime}</span>
          </button>

          {/* LENS 2: HIDDEN COLORS */}
          <button
            type="button"
            onClick={() => {
              setActiveLens(activeLens === 'COLORS' ? null : 'COLORS');
              setShowToolsDrawer(true);
            }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 min-h-[44px] rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer select-none active:scale-95 ${
              activeLens === 'COLORS'
                ? 'border-[#00D3F3] bg-[#00D3F3]/15 text-[#00D3F3] shadow-[0_0_15px_rgba(0,211,243,0.3)]'
                : 'border-white/10 bg-[#0C0E14] text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>{t.lensColors}</span>
          </button>

          {/* LENS 3: DOUBT */}
          <button
            type="button"
            onClick={() => {
              setActiveLens(activeLens === 'DOUBT' ? null : 'DOUBT');
              setShowToolsDrawer(true);
            }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 min-h-[44px] rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer select-none active:scale-95 ${
              activeLens === 'DOUBT'
                ? 'border-[#FF637E] bg-[#FF637E]/15 text-[#FF637E] shadow-[0_0_15px_rgba(255,99,126,0.3)]'
                : 'border-white/10 bg-[#0C0E14] text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{t.lensDoubt}</span>
          </button>

          {/* LENS 4: NEIGHBORS */}
          <button
            type="button"
            onClick={() => {
              setActiveLens(activeLens === 'NEIGHBORS' ? null : 'NEIGHBORS');
              setShowToolsDrawer(true);
            }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 min-h-[44px] rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer select-none active:scale-95 ${
              activeLens === 'NEIGHBORS'
                ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'border-white/10 bg-[#0C0E14] text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>{t.lensNeighbors}</span>
          </button>
        </div>

        {/* LENS DRAWER CONTENT (Contextual Controls for Active Lens) */}
        {activeLens && showToolsDrawer && (
          <div className="w-full max-w-3xl rounded-xl bg-[#0C0E14]/90 border border-white/10 p-3 mt-1 animate-in fade-in duration-150">
            {/* LENS 2 TRAY: HIDDEN COLORS */}
            {activeLens === 'COLORS' && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-[#00D3F3] font-semibold">
                    {isRtl ? 'الأطوال الموجية الـ 6 لكاشف SPHEREx:' : 'SPHEREx 6 Infrared Detector Bands:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShow102Modal(true)}
                    className="text-xs text-[#FFB900] hover:underline font-mono cursor-pointer"
                  >
                    {isRtl ? 'استعراض الـ 102 قناة طيفية' : 'Explore 102 Channels'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { b: 1, label: 'Band 1 (0.93 µm)' },
                    { b: 2, label: 'Band 2 (1.48 µm)' },
                    { b: 3, label: 'Band 3 (2.00 µm)' },
                    { b: 4, label: 'Band 4 (3.10 µm)' },
                    { b: 5, label: 'Band 5 (4.10 µm)' },
                    { b: 6, label: 'Band 6 (4.70 µm)' },
                    { b: 0, label: 'False-Color Composite' },
                  ].map(({ b, label }) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBand(b)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                        selectedBand === b
                          ? 'bg-[#00D3F3] text-slate-950 font-bold'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                  {t.hiddenColorsExplain}
                </p>
              </div>
            )}

            {/* LENS 3 TRAY: DOUBT */}
            {activeLens === 'DOUBT' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#FF637E] font-semibold">
                    {isRtl ? 'قناع الجودة وشوائب الكاشف:' : 'Detector Quality Mask & Artifacts:'}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showDoubtOverlay}
                      onChange={(e) => setShowDoubtOverlay(e.target.checked)}
                      className="accent-[#FF637E]"
                    />
                    <span>{isRtl ? 'إظهار أعلام التحذير' : 'Show Mask Overlay'}</span>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-[#FF637E]">
                    <span className="w-2 h-2 rounded-full bg-[#FF637E]" />
                    <span>Cosmic Ray</span>
                  </span>
                  <span className="flex items-center gap-1 text-[#FFB900]">
                    <span className="w-2 h-2 rounded-full bg-[#FFB900]" />
                    <span>Saturation</span>
                  </span>
                  <span className="flex items-center gap-1 text-rose-500">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Bad Pixel</span>
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                  {isRtl
                    ? 'شكك في الأجرام المشبوهة: ليس كل تغير في الصورة جرماً سماوياً حقيقياً! ضربات الأشعة الكونية وعيوب الكاشف قد تبدو كنجوم متغيرة.'
                    : 'Question suspicious jumps: Not every dot in a difference image is a real celestial body! Cosmic rays and detector glitches can mimic new stars.'}
                </p>
              </div>
            )}

            {/* LENS 4 TRAY: NEIGHBORS */}
            {activeLens === 'NEIGHBORS' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-emerald-400 font-semibold">
                    {isRtl ? 'مطابقة الفهارس الفلكية العالمية:' : 'Catalog Cross-Matches (Gaia DR3 & AllWISE):'}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showNeighborsOverlay}
                      onChange={(e) => setShowNeighborsOverlay(e.target.checked)}
                      className="accent-emerald-400"
                    />
                    <span>{isRtl ? 'إظهار علامات الفهارس' : 'Show Catalog Reticles'}</span>
                  </label>
                </div>

                <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                  {isRtl
                    ? 'الدوائر الخضراء توضح النجوم المسجلة مسبقاً في كتالوجات الفضاء. الأجرام المتحركة غير المطابقة قد تكون مرشحات جديدة للتحقيق!'
                    : 'Green reticles indicate stars already mapped by space telescopes. Unmatched moving dots are candidates for investigation!'}
                </p>
              </div>
            )}

            {/* LENS 1 TRAY: TIME HELP */}
            {activeLens === 'TIME' && (
              <p className="text-[11px] text-slate-300 font-sans">
                {isRtl
                  ? 'عدسة الزمن تعرض لك اللقطات المتتابعة لنفس الحقل. اسحب الفاصل بين اللقطة الأولى والثانية لترى بوضوح حركة الأجرام السريعة.'
                  : 'The Time lens shows sequential frames of this patch. Drag the before/after curtain divider to visually reveal celestial movement.'}
              </p>
            )}
          </div>
        )}
      </footer>

      {/* =========================================================================
          MODALS & EXPLANATION DIALOGS
         ========================================================================= */}
      {/* 1. Postcard Modal */}
      {showPostcardModal && (
        <PostcardModal
          isOpen={showPostcardModal}
          onClose={() => setShowPostcardModal(false)}
          result={currentResult}
          candidate={selectedCandidate}
          language={language}
        />
      )}

      {/* 2. Spectral 102 Explorer Modal */}
      {show102Modal && (
        <SpectralExplorerModal
          onClose={() => setShow102Modal(false)}
          selectedCandidate={selectedCandidate}
          targetCoords={targetCoords}
          language={language}
        />
      )}

      {/* 3. Interactive Concept Explainer Modal */}
      {showExplainerModal && (
        <InteractiveConceptExplainerModal
          isOpen={showExplainerModal}
          onClose={() => setShowExplainerModal(false)}
          language={language}
        />
      )}
    </div>
  );
};
export default ExploreView;
