import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, RotateCcw, Sparkles, Grid3X3 } from 'lucide-react';
import { Language, translations } from '../../utils/translations';
import { gameAudio } from '../utils/gameAudio';
import { drawPsfStar, getCanvasDpr } from '../../utils/smoothCanvas';
import {
  PuzzleBoard,
  canMoveTile,
  countAlignedTiles,
  createShuffledBoard,
  isPuzzleSolved,
  moveTile,
} from './slidingPuzzleLogic';

interface SlidingSkyPuzzleGameProps {
  language: Language;
  onComplete: (xpAwarded: number, stars?: number) => void;
  onAttemptWrong?: () => void;
}

const LOGICAL_SIZE = 324; // 3 x 108px high-DPR tiles

function renderSkyMosaicToCanvas(canvas: HTMLCanvasElement, sizeCss: number): void {
  const dpr = getCanvasDpr();
  canvas.width = Math.round(sizeCss * dpr);
  canvas.height = Math.round(sizeCss * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Deep infrared nebula radial gradient
  const bg = ctx.createRadialGradient(
    sizeCss * 0.56,
    sizeCss * 0.44,
    sizeCss * 0.05,
    sizeCss * 0.5,
    sizeCss * 0.5,
    sizeCss * 0.72
  );
  bg.addColorStop(0, '#1e293b');
  bg.addColorStop(0.35, '#0f172a');
  bg.addColorStop(0.75, '#070b16');
  bg.addColorStop(1, '#03050a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, sizeCss, sizeCss);

  // Subtle amber infrared dust ribbon
  ctx.save();
  const ribbon = ctx.createLinearGradient(0, sizeCss * 0.15, sizeCss, sizeCss * 0.85);
  ribbon.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
  ribbon.addColorStop(0.45, 'rgba(245, 158, 11, 0.16)');
  ribbon.addColorStop(1, 'rgba(56, 189, 248, 0.04)');
  ctx.fillStyle = ribbon;
  ctx.beginPath();
  ctx.ellipse(sizeCss * 0.5, sizeCss * 0.5, sizeCss * 0.44, sizeCss * 0.17, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Smooth calibration arcs so tile orientation is immediately intuitive visually
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.38)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(sizeCss * 0.5, sizeCss * 0.5, sizeCss * 0.32, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(sizeCss * 0.18, sizeCss * 0.72);
  ctx.lineTo(sizeCss * 0.52, sizeCss * 0.48);
  ctx.lineTo(sizeCss * 0.82, sizeCss * 0.28);
  ctx.stroke();
  ctx.setLineDash([]);

  // Crisp astronomical PSF stars spread intentionally across all 9 tiles
  const stars: Array<[number, number, number, string]> = [
    [0.17, 0.18, 4.2, '125, 211, 252'],
    [0.49, 0.16, 3.8, '248, 250, 252'],
    [0.83, 0.21, 5.0, '251, 191, 36'],
    [0.19, 0.51, 4.6, '251, 191, 36'],
    [0.52, 0.48, 6.4, '245, 158, 11'],
    [0.84, 0.52, 3.6, '56, 189, 248'],
    [0.18, 0.79, 4.5, '56, 189, 248'],
    [0.51, 0.83, 4.0, '226, 232, 240'],
    [0.77, 0.78, 3.0, '186, 230, 253'],
    [0.34, 0.31, 2.4, '226, 232, 240'],
    [0.67, 0.66, 2.6, '253, 224, 71'],
    [0.32, 0.65, 2.3, '125, 211, 252'],
  ];

  for (const [rx, ry, r, rgb] of stars) {
    drawPsfStar(ctx, rx * sizeCss, ry * sizeCss, r, rgb, 0.92);
  }

  ctx.restore();
}

export const SlidingSkyPuzzleGame: React.FC<SlidingSkyPuzzleGameProps> = ({
  language,
  onComplete,
  onAttemptWrong,
}) => {
  const t = translations[language];
  const isAr = language === 'ar';
  const [board, setBoard] = useState<PuzzleBoard>(() => createShuffledBoard(28));
  const [moves, setMoves] = useState(0);
  const [finished, setFinished] = useState(false);

  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tileCanvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);

  // Render master high-DPR sky mosaic & reference thumbnail once
  useEffect(() => {
    const master = document.createElement('canvas');
    renderSkyMosaicToCanvas(master, LOGICAL_SIZE);
    sourceCanvasRef.current = master;

    if (previewCanvasRef.current) {
      renderSkyMosaicToCanvas(previewCanvasRef.current, 96);
    }
  }, []);

  // Blit exact high-DPR slices of the master mosaic onto visible board tiles
  useEffect(() => {
    const master = sourceCanvasRef.current;
    if (!master) return;
    const dpr = getCanvasDpr();
    const sliceCss = LOGICAL_SIZE / 3;
    const slicePx = master.width / 3;

    board.forEach((tileVal, idx) => {
      if (tileVal === 0) return;
      const tileCanvas = tileCanvasRefs.current[idx];
      if (!tileCanvas) return;

      const targetPx = Math.round(sliceCss * dpr);
      if (tileCanvas.width !== targetPx || tileCanvas.height !== targetPx) {
        tileCanvas.width = targetPx;
        tileCanvas.height = targetPx;
      }
      const ctx = tileCanvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, targetPx, targetPx);

      const srcIdx = tileVal - 1;
      const sx = (srcIdx % 3) * slicePx;
      const sy = Math.floor(srcIdx / 3) * slicePx;
      ctx.drawImage(master, sx, sy, slicePx, slicePx, 0, 0, targetPx, targetPx);
    });
  }, [board]);

  const handleTileClick = (tileIdx: number) => {
    if (finished) return;
    if (!canMoveTile(board, tileIdx)) {
      gameAudio.playClick();
      onAttemptWrong?.();
      return;
    }

    gameAudio.playClick();
    const next = moveTile(board, tileIdx);
    const nextMoves = moves + 1;
    setBoard(next);
    setMoves(nextMoves);

    if (isPuzzleSolved(next)) {
      gameAudio.playSuccess();
      setFinished(true);
      const stars = nextMoves <= 28 ? 3 : nextMoves <= 48 ? 2 : 1;
      onComplete(85, stars);
    }
  };

  // Keyboard arrow control for accessibility
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (finished) return;
      const emptyIdx = board.indexOf(0);
      const r = Math.floor(emptyIdx / 3);
      const c = emptyIdx % 3;
      let targetIdx = -1;
      if (e.key === 'ArrowUp' && r < 2) targetIdx = emptyIdx + 3;
      if (e.key === 'ArrowDown' && r > 0) targetIdx = emptyIdx - 3;
      if (e.key === 'ArrowLeft' && c < 2) targetIdx = emptyIdx + 1;
      if (e.key === 'ArrowRight' && c > 0) targetIdx = emptyIdx - 1;
      if (targetIdx !== -1) {
        e.preventDefault();
        handleTileClick(targetIdx);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleReset = () => {
    gameAudio.playClick();
    setBoard(createShuffledBoard(28));
    setMoves(0);
    setFinished(false);
  };

  const alignedCount = countAlignedTiles(board);

  return (
    <div
      className="rounded-2xl bg-[#070B16] border border-sky-400/25 p-4 sm:p-5 space-y-4"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-sky-400 font-bold flex items-center gap-1.5">
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>
              {t.gamePuzzleMovesLabel}: <span className="tabular-nums text-white">{moves}</span> ·{' '}
              <span className="tabular-nums text-emerald-300">{alignedCount}/8</span>
            </span>
          </div>
          <h3 className="font-display text-lg font-bold text-white">{t.gamePuzzleTitle}</h3>
          <p className="text-xs text-slate-300 mt-0.5">{t.gamePuzzleSubtitle}</p>
        </div>

        <button
          type="button"
          data-testid="puzzle-reset-btn"
          onClick={handleReset}
          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t.gamePuzzleResetBtn}</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* 3x3 Interactive High-DPR Sliding Tile Grid (always LTR spatial order for tile coordinates) */}
        <div
          dir="ltr"
          data-testid="sliding-puzzle-grid"
          className="grid grid-cols-3 gap-1.5 p-2 rounded-2xl bg-[#02040A] border border-white/15 w-[306px] sm:w-[342px]"
        >
          {board.map((tileVal, idx) => {
            const movable = tileVal !== 0 && canMoveTile(board, idx);
            const inCorrectSpot = tileVal !== 0 && tileVal === idx + 1;

            if (tileVal === 0) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="aspect-square rounded-xl border border-dashed border-white/15 bg-white/[0.02]"
                  aria-label="Empty slot"
                />
              );
            }

            return (
              <button
                key={tileVal}
                type="button"
                data-testid={`puzzle-tile-${tileVal}`}
                onClick={() => handleTileClick(idx)}
                className={`relative aspect-square rounded-xl overflow-hidden border transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  finished
                    ? 'border-emerald-400/70'
                    : movable
                    ? 'border-amber-400/70 hover:brightness-110'
                    : inCorrectSpot
                    ? 'border-sky-400/45'
                    : 'border-white/15'
                }`}
              >
                <canvas
                  ref={(el) => {
                    tileCanvasRefs.current[idx] = el;
                  }}
                  className="w-full h-full block"
                />
                <span
                  className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-md font-mono text-[11px] font-bold flex items-center justify-center tabular-nums ${
                    inCorrectSpot
                      ? 'bg-emerald-500/80 text-slate-950'
                      : 'bg-black/70 text-slate-200 border border-white/15'
                  }`}
                >
                  {tileVal}
                </span>
              </button>
            );
          })}
        </div>

        {/* Target Reference Mosaic */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-slate-400">
            {isAr ? 'الإطار المرجعي المعاير' : 'Calibrated Reference'}
          </span>
          <canvas
            ref={previewCanvasRef}
            className="w-24 h-24 rounded-xl border border-white/20 block shadow-lg"
          />
          <span className="text-[11px] text-slate-400 text-center max-w-[140px]">
            {isAr ? 'اضغط أي مربع مجاور للفراغ أو استخدم الأسهم' : 'Click adjacent tiles or use Arrow keys'}
          </span>
        </div>
      </div>

      {finished && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-4 py-3 flex items-center justify-between gap-3 text-sm text-emerald-200">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>
              {isAr
                ? `تمت محاذاة إطار سبيراكس خلال ${moves} حركة! ربحت +85 XP.`
                : `SPHEREx frame mosaic reassembled in ${moves} moves! +85 XP awarded.`}
            </span>
          </span>
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
        </div>
      )}
    </div>
  );
};
