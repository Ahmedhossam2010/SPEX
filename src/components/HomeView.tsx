import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Gamepad2,
  GraduationCap,
  Search,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Language, translations } from '../utils/translations';
import { usePrefersReducedMotion } from '../design/motionKit';
import { gameAudio } from '../game/utils/gameAudio';
import { parseCoordinateInput } from '../science/coordinates';
import { drawPsfStar, getCanvasDpr } from '../utils/smoothCanvas';

interface HomeViewProps {
  onStartAcademy: () => void;
  onStartExplore: (caseId?: string) => void;
  onSearchCoords?: (ra: number, dec: number) => void;
  onPlayGame?: () => void;
  language: Language;
  // Retained optional props for caller compatibility
  onQuickDemoWise?: () => void;
  onFlySelection?: unknown;
  onOpenAbout?: () => void;
  onOpenCases?: () => void;
  onOpenCommunity?: () => void;
  cases?: Array<{ id: string; title: string; category?: string; ra: number; dec: number }>;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartAcademy,
  onStartExplore,
  onSearchCoords,
  onPlayGame,
  language,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  const reducedMotion = usePrefersReducedMotion();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [coordInput, setCoordInput] = useState<string>('');
  const [coordError, setCoordError] = useState<string | null>(null);

  // Pointer parallax listener
  useEffect(() => {
    if (reducedMotion) return;
    const handlePointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetOffsetRef.current = { x: nx * 18, y: ny * 14 };
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [reducedMotion]);

  // High-DPR smooth PSF starfield backdrop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = getCanvasDpr();

    const syncCanvasSize = () => {
      dpr = getCanvasDpr();
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    };
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);

    const starCount = Math.min(160, Math.floor((width * height) / 8000));
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      depth: 0.25 + Math.random() * 1.1,
      radius: Math.random() * 2.0 + 0.85,
      alpha: Math.random() * 0.65 + 0.25,
      twinkle: Math.random() * Math.PI * 2,
      warm: Math.random() > 0.72,
    }));

    const render = (now: number) => {
      pointerOffsetRef.current.x += (targetOffsetRef.current.x - pointerOffsetRef.current.x) * 0.06;
      pointerOffsetRef.current.y += (targetOffsetRef.current.y - pointerOffsetRef.current.y) * 0.06;

      ctx.fillStyle = '#040711';
      ctx.fillRect(0, 0, width, height);

      const px = pointerOffsetRef.current.x;
      const py = pointerOffsetRef.current.y;

      const grad1 = ctx.createRadialGradient(
        width * 0.55 + px * 0.4,
        height * 0.35 + py * 0.4,
        40,
        width * 0.55 + px * 0.4,
        height * 0.35 + py * 0.4,
        width * 0.62
      );
      grad1.addColorStop(0, 'rgba(56, 189, 248, 0.11)');
      grad1.addColorStop(0.5, 'rgba(245, 158, 11, 0.05)');
      grad1.addColorStop(1, 'rgba(4, 7, 17, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const tSec = now * 0.001;
      for (const s of stars) {
        const twinkle = reducedMotion ? 1 : 0.72 + 0.28 * Math.sin(tSec * 1.7 + s.twinkle);
        const sx = (s.x + px * s.depth + width) % width;
        const sy = (s.y + py * s.depth + (reducedMotion ? 0 : tSec * 2.4 * s.depth) + height) % height;
        const alpha = Math.min(1, s.alpha * twinkle);
        drawPsfStar(ctx, sx, sy, s.radius, s.warm ? '253, 224, 155' : '226, 232, 240', alpha);
      }

      if (!reducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', syncCanvasSize);
    };
  }, [reducedMotion]);

  const handleCoordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCoordinateInput(coordInput);
    if (!parsed) {
      setCoordError(t.coordSearchError);
      return;
    }
    gameAudio.playClick();
    setCoordError(null);
    if (onSearchCoords) {
      onSearchCoords(parsed.ra, parsed.dec);
    } else {
      onStartExplore();
    }
  };

  return (
    <div
      className={`relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 sm:px-6 py-10 overflow-hidden ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none -z-10 w-full h-full"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-8">
        {/* 1. Short Headline */}
        <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-50 leading-[1.12] text-balance">
          {t.homeHeadlineSimple}
        </h1>

        {/* 2. Three Big Navigation Buttons: Explore, Academy, Play */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          <button
            type="button"
            data-testid="home-btn-explore"
            onClick={() => {
              gameAudio.playClick();
              onStartExplore();
            }}
            className="group min-h-[124px] rounded-2xl border border-sky-400/55 bg-gradient-to-br from-sky-500/25 to-[#091224]/95 hover:border-sky-300 hover:from-sky-500/35 p-5 flex flex-col justify-between text-start shadow-[0_0_28px_rgba(56,189,248,0.18)] transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-sky-400/20 border border-sky-300/40 flex items-center justify-center text-sky-300">
                <Compass className="w-6 h-6" />
              </div>
              <ArrowRight className={`w-5 h-5 text-sky-300 transition-transform group-hover:translate-x-1 ${isRtl ? 'rotate-180' : ''}`} />
            </div>
            <div className="font-display text-xl sm:text-2xl font-extrabold text-white mt-3">
              {t.homeNavExplore}
            </div>
          </button>

          <button
            type="button"
            data-testid="home-btn-academy"
            onClick={() => {
              gameAudio.playClick();
              onStartAcademy();
            }}
            className="group min-h-[124px] rounded-2xl border border-amber-400/45 bg-[#091022]/92 hover:bg-[#101A36] hover:border-amber-300 p-5 flex flex-col justify-between text-start shadow-xl transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-amber-400/15 border border-amber-400/35 flex items-center justify-center text-amber-300">
                <GraduationCap className="w-6 h-6" />
              </div>
              <ArrowRight className={`w-5 h-5 text-amber-300 transition-transform group-hover:translate-x-1 ${isRtl ? 'rotate-180' : ''}`} />
            </div>
            <div className="font-display text-xl sm:text-2xl font-extrabold text-slate-50 mt-3">
              {t.homeNavAcademy}
            </div>
          </button>

          <button
            type="button"
            data-testid="home-btn-play"
            onClick={() => {
              gameAudio.playClick();
              onPlayGame?.();
            }}
            className="group min-h-[124px] rounded-2xl border border-emerald-400/40 bg-[#091022]/92 hover:bg-[#101A36] hover:border-emerald-300 p-5 flex flex-col justify-between text-start shadow-xl transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-emerald-400/15 border border-emerald-400/35 flex items-center justify-center text-emerald-300">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <ArrowRight className={`w-5 h-5 text-emerald-300 transition-transform group-hover:translate-x-1 ${isRtl ? 'rotate-180' : ''}`} />
            </div>
            <div className="font-display text-xl sm:text-2xl font-extrabold text-slate-50 mt-3">
              {t.homeNavPlay}
            </div>
          </button>
        </div>

        {/* 3. One Coordinates Search Box */}
        <div className="max-w-xl mx-auto">
          <form
            onSubmit={handleCoordSubmit}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-2xl bg-[#070B16]/90 backdrop-blur-xl border border-white/15 shadow-2xl"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                data-testid="home-coord-input"
                value={coordInput}
                onChange={(e) => {
                  setCoordInput(e.target.value);
                  if (coordError) setCoordError(null);
                }}
                placeholder={t.coordSearchPlaceholder}
                aria-label={t.homeCoordSearchBtn}
                className="w-full min-h-[46px] ps-10 pe-3 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              data-testid="home-coord-submit"
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition cursor-pointer shrink-0"
            >
              {t.homeCoordSearchBtn}
            </button>
          </form>

          {coordError ? (
            <p
              data-testid="home-coord-error"
              role="alert"
              className="mt-2 text-xs text-rose-300 font-mono flex items-center justify-center gap-1.5"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{coordError}</span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-400 font-mono">{t.homeCoordHint}</p>
          )}
        </div>
      </div>
    </div>
  );
};
