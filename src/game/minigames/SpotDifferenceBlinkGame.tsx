import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Eye, CheckCircle2, Sparkles, RotateCcw } from 'lucide-react';
import { Language } from '../../utils/translations';
import { gameAudio } from '../utils/gameAudio';
import { drawPsfStar, getCanvasDpr } from '../../utils/smoothCanvas';

interface BlinkRound {
  title: string;
  titleAr: string;
  fixedStars: Array<{ x: number; y: number; r: number }>;
  epochA: { x: number; y: number };
  epochB: { x: number; y: number };
}

const ROUNDS: BlinkRound[] = [
  {
    title: 'Pass 1 → Pass 2 · Catch the Fast Star',
    titleAr: 'التمريرة ١ → ٢ · التقط النجم السريع',
    fixedStars: [
      { x: 64, y: 48, r: 3.1 },
      { x: 145, y: 185, r: 2.6 },
      { x: 255, y: 65, r: 3.4 },
      { x: 310, y: 165, r: 2.4 },
      { x: 88, y: 150, r: 2.2 },
    ],
    epochA: { x: 175, y: 98 },
    epochB: { x: 205, y: 78 },
  },
  {
    title: 'Pass 1 → Pass 2 · Faint Brown Dwarf Hop',
    titleAr: 'التمريرة ١ → ٢ · قفزة القزم البني الخافت',
    fixedStars: [
      { x: 52, y: 95, r: 3.6 },
      { x: 118, y: 46, r: 2.5 },
      { x: 200, y: 185, r: 3.2 },
      { x: 298, y: 82, r: 2.8 },
      { x: 332, y: 182, r: 2.3 },
      { x: 140, y: 120, r: 2.0 },
    ],
    epochA: { x: 245, y: 126 },
    epochB: { x: 222, y: 142 },
  },
  {
    title: 'Pass 1 → Pass 2 · Crowded Infrared Field',
    titleAr: 'التمريرة ١ → ٢ · حقل تحت أحمر مزدحم',
    fixedStars: [
      { x: 45, y: 50, r: 2.8 },
      { x: 96, y: 178, r: 3.5 },
      { x: 165, y: 60, r: 2.2 },
      { x: 228, y: 112, r: 3.0 },
      { x: 278, y: 190, r: 2.6 },
      { x: 325, y: 52, r: 3.1 },
      { x: 188, y: 162, r: 2.1 },
    ],
    epochA: { x: 120, y: 115 },
    epochB: { x: 102, y: 98 },
  },
];

interface Props {
  language: Language;
  onComplete: (xpAwarded: number, stars?: number) => void;
  onAttemptWrong?: () => void;
}

export const SpotDifferenceBlinkGame: React.FC<Props> = ({
  language,
  onComplete,
  onAttemptWrong,
}) => {
  const isAr = language === 'ar';
  const [roundIdx, setRoundIdx] = useState(0);
  const [epoch, setEpoch] = useState<'A' | 'B'>('A');
  const [blinking, setBlinking] = useState(true);
  const [mistakes, setMistakes] = useState(0);
  const [missNote, setMissNote] = useState(false);
  const [finished, setFinished] = useState(false);
  const fieldCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const round = ROUNDS[roundIdx];

  useEffect(() => {
    if (!blinking || finished) return;
    const id = setInterval(() => {
      setEpoch((e) => (e === 'A' ? 'B' : 'A'));
    }, 650);
    return () => clearInterval(id);
  }, [blinking, finished]);

  const activeMover = epoch === 'A' ? round.epochA : round.epochB;

  // Render crisp high-DPR PSF starfield & moving target glow on canvas
  useEffect(() => {
    const canvas = fieldCanvasRef.current;
    if (!canvas) return;
    const dpr = getCanvasDpr();
    const w = 380;
    const h = 230;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, w * 0.7);
    grad.addColorStop(0, '#0a1222');
    grad.addColorStop(1, '#02040a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle background field dust & micro-stars
    for (let i = 0; i < 32; i++) {
      const sx = ((i * 97 + 13) % 360) + 10;
      const sy = ((i * 53 + 29) % 210) + 10;
      drawPsfStar(ctx, sx, sy, 0.7 + (i % 3) * 0.3, '148, 163, 184', 0.28);
    }

    // Fixed reference stars (tiny 0.4px subpixel jitter matching survey pointing)
    for (const st of round.fixedStars) {
      drawPsfStar(ctx, st.x + (epoch === 'B' ? 0.45 : -0.45), st.y, st.r, '241, 245, 249', 0.92);
    }

    // Moving faint target (smooth amber PSF)
    drawPsfStar(ctx, activeMover.x, activeMover.y, 3.6, '251, 191, 36', 0.95);

    if (finished) {
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(round.epochA.x, round.epochA.y);
      ctx.lineTo(round.epochB.x, round.epochB.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [round, epoch, activeMover.x, activeMover.y, finished]);

  const handleFieldClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (finished) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 380;
    const y = ((e.clientY - rect.top) / rect.height) * 230;

    const dist = Math.hypot(x - activeMover.x, y - activeMover.y);
    const distAny = Math.min(
      Math.hypot(x - round.epochA.x, y - round.epochA.y),
      Math.hypot(x - round.epochB.x, y - round.epochB.y)
    );

    if (dist <= 26 || distAny <= 22) {
      gameAudio.playSuccess();
      setMissNote(false);
      if (roundIdx + 1 < ROUNDS.length) {
        setRoundIdx((r) => r + 1);
      } else {
        setFinished(true);
        setBlinking(false);
        const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
        onComplete(100, stars);
      }
    } else {
      gameAudio.playError();
      setMistakes((m) => m + 1);
      setMissNote(true);
      onAttemptWrong?.();
    }
  };

  const reset = () => {
    gameAudio.playClick();
    setRoundIdx(0);
    setEpoch('A');
    setBlinking(true);
    setMistakes(0);
    setMissNote(false);
    setFinished(false);
  };

  return (
    <div
      className="rounded-2xl bg-[#070B16] border border-emerald-400/25 p-4 sm:p-5 space-y-4"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-mono text-emerald-300 font-bold tabular-nums">
            {isAr ? `الجولة ${roundIdx + 1} / ${ROUNDS.length}` : `ROUND ${roundIdx + 1} / ${ROUNDS.length}`}
          </div>
          <h3 className="font-display text-lg font-bold text-white">
            {isAr ? round.titleAr : round.title}
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            {isAr
              ? 'انقر مباشرة فوق النقطة الخافتة التي تقفز بين التمريرة A وB.'
              : 'Click directly on the faint object that shifts position between Pass A and Pass B.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              gameAudio.playClick();
              setBlinking((b) => !b);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            {blinking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{blinking ? (isAr ? 'إيقاف الوميض' : 'Pause Blink') : (isAr ? 'تشغيل الوميض' : 'Play Blink')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBlinking(false);
              setEpoch((e) => (e === 'A' ? 'B' : 'A'));
            }}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white font-mono cursor-pointer flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5 text-sky-300" />
            <span>{isAr ? `حقبة ${epoch}` : `Pass ${epoch}`}</span>
          </button>

          <button
            type="button"
            onClick={reset}
            aria-label="Reset"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-[#02040A] border border-white/10 overflow-hidden relative">
        <div className="absolute top-2 start-3 z-10 font-mono text-[11px] text-amber-300 pointer-events-none">
          {epoch === 'A' ? 'PASS A · 2025-05' : 'PASS B · 2025-11'}
        </div>
        <canvas
          ref={fieldCanvasRef}
          onClick={handleFieldClick}
          className="w-full max-w-xl mx-auto h-64 block cursor-crosshair select-none"
        />
      </div>

      {missNote && !finished && (
        <div className="text-xs font-mono text-rose-300">
          {isAr
            ? 'هذا النجم ثابت في مكانه! ابحث عن النقطة التي تقفز بين A وB.'
            : 'That star stayed stationary! Watch for the star jumping between Pass A and Pass B.'}
        </div>
      )}

      {finished && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-4 py-3 flex items-center justify-between gap-3 text-sm text-emerald-200">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>
              {isAr
                ? 'بصر ثاقب! التقطت الأجرام المتحركة الثلاثة وحصلت على +100 XP!'
                : 'Sharp eyes! All 3 moving targets spotted. +100 XP awarded.'}
            </span>
          </span>
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
        </div>
      )}
    </div>
  );
};
