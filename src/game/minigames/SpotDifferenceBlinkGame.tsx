import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Eye,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Heart,
  Star,
  AlertTriangle,
} from 'lucide-react';
import { Language } from '../../utils/translations';
import { gameAudio } from '../utils/gameAudio';
import { drawPsfStar, getCanvasDpr } from '../../utils/smoothCanvas';

interface SnapshotFrame {
  width: number;
  height: number;
  flux: number[];
  dateObs?: string;
}

interface BlinkRound {
  caseId: string;
  title: string;
  titleAr: string;
  motionNote: string;
  motionNoteAr: string;
  fixedStars: Array<{ x: number; y: number; r: number }>;
  epochA: { x: number; y: number };
  epochB: { x: number; y: number };
}

const ROUNDS: BlinkRound[] = [
  {
    caseId: 'case-barnards-star',
    title: 'Barnard’s Star · 10.4″/yr Fast Red Dwarf',
    titleAr: 'نجم برنارد · قزم أحمر سريع (١٠.٤″/سنة)',
    motionNote: 'Proper motion shifts ~1.7 pixels per year across SPHEREx sky frames.',
    motionNoteAr: 'تُظهر الحركة الذاتية إزاحة بنحو ١.٧ بكسل سنوياً عبر إطارات SPHEREx.',
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
    caseId: 'case-epsilon-indi',
    title: 'Epsilon Indi · 4.7″/yr Binary Brown Dwarfs',
    titleAr: 'إبسيلون إندي · ثنائي أقزام بنية (٤.٧″/سنة)',
    motionNote: 'Background stars twinkle slightly while the nearby brown dwarf pair drifts smoothly.',
    motionNoteAr: 'تومض نجوم الخلفية قليلاً بينما ينزلق الجرم القريب بثبات بين التمريرتين.',
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
    caseId: 'case-wise-0855',
    title: 'WISE 0855 · Faint ~250 K Neighbor (8.15″/yr)',
    titleAr: 'WISE 0855 · الجار المتجمد الخافت (٨.١٥″/سنة)',
    motionNote: 'Coldest known brown dwarf near the noise floor—track its expected catalog hop!',
    motionNoteAr: 'أبرد قزم بني معروف قرب حد الضجيج—تتبّع قفزته المتوقعة بين التمريرتين!',
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

type Difficulty = 'normal' | 'hard';

function renderSnapshotUnderlay(
  frame: SnapshotFrame,
  w: number,
  h: number
): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = frame.width;
  off.height = frame.height;
  const octx = off.getContext('2d');
  if (!octx) return off;

  const valid = frame.flux.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const p10 = valid[Math.floor(valid.length * 0.1)] ?? 0;
  const p99 = valid[Math.floor(valid.length * 0.992)] ?? 1;
  const span = Math.max(1e-4, p99 - p10);

  const img = octx.createImageData(frame.width, frame.height);
  for (let i = 0; i < frame.width * frame.height; i++) {
    const val = frame.flux[i];
    const norm = Number.isFinite(val) ? Math.max(0, Math.min(1, Math.asinh(((val - p10) / span) * 4) / Math.asinh(4))) : 0;
    img.data[i * 4 + 0] = Math.round(norm * 55);
    img.data[i * 4 + 1] = Math.round(norm * 105);
    img.data[i * 4 + 2] = Math.round(14 + norm * 165);
    img.data[i * 4 + 3] = 175;
  }
  octx.putImageData(img, 0, 0);

  const scaled = document.createElement('canvas');
  scaled.width = w;
  scaled.height = h;
  const sctx = scaled.getContext('2d');
  if (sctx) {
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(off, 0, 0, w, h);
  }
  return scaled;
}

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
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [epoch, setEpoch] = useState<'A' | 'B'>('A');
  const [blinking, setBlinking] = useState(true);
  const [guessesLeft, setGuessesLeft] = useState(3);
  const [mistakes, setMistakes] = useState(0);
  const [revealRound, setRevealRound] = useState(false);
  const [failed, setFailed] = useState(false);
  const [missNote, setMissNote] = useState(false);
  const [finished, setFinished] = useState(false);
  const [earnedStars, setEarnedStars] = useState(3);
  const [realFrames, setRealFrames] = useState<Record<string, SnapshotFrame[]>>({});
  const fieldCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const round = ROUNDS[roundIdx];

  // Fetch cached real SPHEREx snapshot frames (offline=1 instant local lookup, never throws UI errors)
  useEffect(() => {
    if (realFrames[round.caseId]) return;
    let active = true;
    fetch(`/api/spherex/timeseries?caseId=${encodeURIComponent(round.caseId)}&sizePix=64&offline=1`)
      .then((r) => (r.ok && r.headers.get('content-type')?.includes('application/json') ? r.json() : null))
      .then((data) => {
        if (!active || !data?.frames?.length) return;
        const frames: SnapshotFrame[] = data.frames
          .filter((f: any) => Array.isArray(f.flux) && f.width > 0 && f.height > 0)
          .slice(0, 2);
        if (frames.length > 0) {
          setRealFrames((prev) => ({ ...prev, [round.caseId]: frames }));
        }
      })
      .catch(() => {
        // Fallback to calibrated PSF sky rendering seamlessly
      });
    return () => {
      active = false;
    };
  }, [round.caseId, realFrames]);

  useEffect(() => {
    if (!blinking || finished || failed || revealRound) return;
    const cadence = difficulty === 'hard' ? 430 : 700;
    const id = setInterval(() => {
      setEpoch((e) => (e === 'A' ? 'B' : 'A'));
    }, cadence);
    return () => clearInterval(id);
  }, [blinking, finished, failed, revealRound, difficulty]);

  const activeMover = epoch === 'A' ? round.epochA : round.epochB;

  // Render crisp high-DPR PSF starfield + cached SPHEREx pixel texture & motion reveal vector
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

    // Paint cached real SPHEREx sky frame subtly behind the PSF field when available
    const cached = realFrames[round.caseId];
    if (cached && cached.length > 0) {
      const f = epoch === 'B' && cached[1] ? cached[1] : cached[0];
      const underlay = renderSnapshotUnderlay(f, w, h);
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.drawImage(underlay, 0, 0);
      ctx.restore();
    }

    // Subtle background field micro-stars
    const jitter = difficulty === 'hard' ? 0.9 : 0.4;
    for (let i = 0; i < 36; i++) {
      const sx = ((i * 97 + 13) % 360) + 10;
      const sy = ((i * 53 + 29) % 210) + 10;
      drawPsfStar(ctx, sx, sy, 0.7 + (i % 3) * 0.3, '148, 163, 184', 0.28);
    }

    // Fixed reference stars (tiny survey pointing jitter)
    for (const st of round.fixedStars) {
      drawPsfStar(ctx, st.x + (epoch === 'B' ? jitter : -jitter), st.y, st.r, '241, 245, 249', 0.92);
    }

    // Moving target (slightly dimmer in hard mode)
    const moverAlpha = difficulty === 'hard' ? 0.78 : 0.95;
    drawPsfStar(ctx, activeMover.x, activeMover.y, 3.6, '251, 191, 36', moverAlpha);

    // Reveal ring & motion vector when caught or at game end
    if (revealRound || finished) {
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(round.epochA.x, round.epochA.y);
      ctx.lineTo(round.epochB.x, round.epochB.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = '#34D399';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(round.epochB.x, round.epochB.y, 16, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }, [round, epoch, activeMover.x, activeMover.y, finished, revealRound, difficulty, realFrames]);

  const handleFieldClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (finished || failed || revealRound) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 380;
    const y = ((e.clientY - rect.top) / rect.height) * 230;

    const dist = Math.hypot(x - activeMover.x, y - activeMover.y);
    const distAny = Math.min(
      Math.hypot(x - round.epochA.x, y - round.epochA.y),
      Math.hypot(x - round.epochB.x, y - round.epochB.y)
    );

    const hitRadius = difficulty === 'hard' ? 21 : 27;
    if (dist <= hitRadius || distAny <= hitRadius - 3) {
      gameAudio.playSuccess();
      setMissNote(false);
      setRevealRound(true);

      setTimeout(() => {
        setRevealRound(false);
        if (roundIdx + 1 < ROUNDS.length) {
          setRoundIdx((r) => r + 1);
          setGuessesLeft(3);
        } else {
          setFinished(true);
          setBlinking(false);
          const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
          setEarnedStars(stars);
          onComplete(100, stars);
        }
      }, 950);
    } else {
      gameAudio.playError();
      setMistakes((m) => m + 1);
      setMissNote(true);
      onAttemptWrong?.();
      setGuessesLeft((g) => {
        const next = g - 1;
        if (next <= 0) {
          setFailed(true);
          setBlinking(false);
        }
        return next;
      });
    }
  };

  const reset = () => {
    gameAudio.playClick();
    setRoundIdx(0);
    setEpoch('A');
    setBlinking(true);
    setGuessesLeft(3);
    setMistakes(0);
    setRevealRound(false);
    setFailed(false);
    setMissNote(false);
    setFinished(false);
    setEarnedStars(3);
  };

  const cachedDates = realFrames[round.caseId];
  const passLabel =
    epoch === 'A'
      ? `PASS A · ${cachedDates?.[0]?.dateObs?.slice(0, 10) || '2025-05'}`
      : `PASS B · ${cachedDates?.[1]?.dateObs?.slice(0, 10) || '2025-11'}`;

  return (
    <div
      className="rounded-2xl bg-[#070B16] border border-emerald-400/25 p-4 sm:p-5 space-y-4"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
            <span className="text-emerald-300 font-bold">
              {isAr ? `الجولة ${roundIdx + 1} / ${ROUNDS.length}` : `ROUND ${roundIdx + 1} / ${ROUNDS.length}`}
            </span>
            <span className="text-slate-600">·</span>
            <span className="inline-flex items-center gap-1 text-rose-300">
              {[1, 2, 3].map((i) => (
                <Heart
                  key={i}
                  className={`w-3.5 h-3.5 ${i <= guessesLeft ? 'text-rose-400 fill-rose-400' : 'text-slate-700'}`}
                />
              ))}
            </span>
          </div>
          <h3 className="font-display text-lg font-bold text-white">
            {isAr ? round.titleAr : round.title}
          </h3>
          <p className="text-xs text-slate-300">
            {isAr ? round.motionNoteAr : round.motionNote}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setDifficulty('normal')}
              className={`px-2 py-1 rounded-lg cursor-pointer ${
                difficulty === 'normal' ? 'bg-sky-400 text-slate-950 font-bold' : 'text-slate-300'
              }`}
            >
              {isAr ? 'عادي' : 'Normal'}
            </button>
            <button
              type="button"
              onClick={() => setDifficulty('hard')}
              className={`px-2 py-1 rounded-lg cursor-pointer ${
                difficulty === 'hard' ? 'bg-rose-400 text-slate-950 font-bold' : 'text-slate-300'
              }`}
            >
              {isAr ? 'صعب' : 'Hard'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              gameAudio.playClick();
              setBlinking((b) => !b);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            {blinking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{blinking ? (isAr ? 'إيقاف الوميض' : 'Pause Blink') : isAr ? 'تشغيل الوميض' : 'Play Blink'}</span>
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
          {passLabel}
        </div>
        {cachedDates && cachedDates.length > 0 && (
          <div className="absolute top-2 end-3 z-10 font-mono text-[10px] text-sky-300/80 pointer-events-none">
            SPHEREx Cutout
          </div>
        )}
        <canvas
          ref={fieldCanvasRef}
          onClick={handleFieldClick}
          className="w-full max-w-xl mx-auto h-64 block cursor-crosshair select-none"
        />
      </div>

      {revealRound && !finished && (
        <div className="text-xs font-mono text-emerald-300">
          {isAr
            ? 'أصبت! هذا هو الجرم المتحرك ومسار حركته بين التمريرتين.'
            : 'Target locked! Vector arrow marks the genuine sky jump between passes.'}
        </div>
      )}

      {missNote && !finished && !failed && !revealRound && (
        <div className="text-xs font-mono text-rose-300">
          {isAr
            ? `هذا النجم ثابت! متبقي ${guessesLeft} محاولات في هذه الجولة.`
            : `That star stayed fixed! ${guessesLeft} guess(es) remaining this round.`}
        </div>
      )}

      {failed && (
        <div className="rounded-xl bg-rose-500/15 border border-rose-400/40 px-4 py-3 flex items-center justify-between gap-3 text-sm text-rose-200">
          <span className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
            <span>
              {isAr
                ? 'نفدت المحاولات الثلاث في هذه الجولة! أعد ضبط الوميض وحاول مجدداً.'
                : 'Out of guesses in this field! Reset and watch closely between Pass A and Pass B.'}
            </span>
          </span>
          <button
            type="button"
            onClick={reset}
            className="px-3 py-1.5 rounded-xl bg-rose-500 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
          >
            {isAr ? 'حاول مجدداً' : 'Retry'}
          </button>
        </div>
      )}

      {finished && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm text-emerald-200">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>
              {isAr
                ? 'بصر ثاقب! التقطت الأجرام المتحركة الثلاثة وحصلت على +100 XP!'
                : 'Sharp eyes! All 3 SPHEREx moving targets spotted. +100 XP awarded.'}
            </span>
          </span>
          <div className="flex items-center gap-1" aria-label={`${earnedStars}/3 stars`}>
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${s <= earnedStars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
              />
            ))}
            <Sparkles className="w-4 h-4 text-amber-300 ms-1" />
          </div>
        </div>
      )}
    </div>
  );
};
