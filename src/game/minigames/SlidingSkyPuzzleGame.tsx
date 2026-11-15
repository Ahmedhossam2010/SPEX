import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, RotateCcw, Sparkles, Grid3X3, Star } from 'lucide-react';
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

interface SnapshotCutout {
  width: number;
  height: number;
  flux: number[];
}

const LOGICAL_SIZE = 324;

function renderSkyMosaicToCanvas(
  canvas: HTMLCanvasElement,
  sizeCss: number,
  realCutout: SnapshotCutout | null
): void {
  const dpr = getCanvasDpr();
  canvas.width = Math.round(sizeCss * dpr);
  canvas.height = Math.round(sizeCss * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

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

  // Paint genuine SPHEREx cached sky cutout smoothly underneath calibration guides
  if (realCutout && realCutout.width > 0 && realCutout.height > 0 && realCutout.flux.length > 0) {
    const off = document.createElement('canvas');
    off.width = realCutout.width;
    off.height = realCutout.height;
    const octx = off.getContext('2d');
    if (octx) {
      const sorted = realCutout.flux.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
      const p10 = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
      const p99 = sorted[Math.floor(sorted.length * 0.992)] ?? 1;
      const span = Math.max(1e-4, p99 - p10);
      const img = octx.createImageData(realCutout.width, realCutout.height);
      for (let i = 0; i < realCutout.width * realCutout.height; i++) {
        const val = realCutout.flux[i];
        const norm = Number.isFinite(val)
          ? Math.max(0, Math.min(1, Math.asinh(((val - p10) / span) * 4.5) / Math.asinh(4.5)))
          : 0;
        img.data[i * 4 + 0] = Math.round(12 + norm * 235);
        img.data[i * 4 + 1] = Math.round(16 + norm * 185);
        img.data[i * 4 + 2] = Math.round(35 + Math.pow(norm, 0.7) * 195);
        img.data[i * 4 + 3] = 225;
      }
      octx.putImageData(img, 0, 0);
      ctx.drawImage(off, 0, 0, sizeCss, sizeCss);
    }
  } else {
    // Smooth fallback nebula gradient while snapshot loads
    const ribbon = ctx.createLinearGradient(0, sizeCss * 0.15, sizeCss, sizeCss * 0.85);
    ribbon.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
    ribbon.addColorStop(0.45, 'rgba(245, 158, 11, 0.22)');
    ribbon.addColorStop(1, 'rgba(56, 189, 248, 0.06)');
    ctx.fillStyle = ribbon;
    ctx.beginPath();
    ctx.ellipse(sizeCss * 0.5, sizeCss * 0.5, sizeCss * 0.44, sizeCss * 0.17, -0.45, 0, Math.PI * 2);
    ctx.fill();

    const stars: Array<[number, number, number, string]> = [
      [0.17, 0.18, 4.2, '125, 211, 252'],
      [0.49, 0.16, 3.8, '248, 250, 252'],
      [0.83, 0.21, 5.0, '251, 191, 36'],
      [0.19, 0.51, 4.6, '251, 191, 36'],
      [0.52, 0.48, 6.4, '245, 158, 11'],
      [0.84, 0.52, 3.6, '56, 189, 248'],
      [0.18, 0.79, 4.5, '56, 189, 248'],
      [0.51, 0.83, 4.0, '226, 232, 240'],
    ];
    for (const [rx, ry, r, rgb] of stars) {
      drawPsfStar(ctx, rx * sizeCss, ry * sizeCss, r, rgb, 0.92);
    }
  }

  // Calibration reticle & dashed proper-motion track for unmistakable orientation cues
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.48)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(sizeCss * 0.5, sizeCss * 0.5, sizeCss * 0.3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(sizeCss * 0.2, sizeCss * 0.72);
  ctx.lineTo(sizeCss * 0.5, sizeCss * 0.5);
  ctx.lineTo(sizeCss * 0.8, sizeCss * 0.28);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

export const SlidingSkyPuzzleGame: React.FC<SlidingSkyPuzzleGameProps> = ({
  language,
  onComplete,
  onAttemptWrong,
}) => {
  const t = translations[language];
  const isAr = language === 'ar';
  const [gridSize, setGridSize] = useState<3 | 4>(3);
  const [board, setBoard] = useState<PuzzleBoard>(() => createShuffledBoard(28, 3));
  const [moves, setMoves] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [stage2Done, setStage2Done] = useState(false);
  const [finished, setFinished] = useState(false);
  const [earnedStars, setEarnedStars] = useState(3);
  const [realCutout, setRealCutout] = useState<SnapshotCutout | null>(null);

  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tileCanvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);

  // Fetch cached real SPHEREx cutout once cleanly
  useEffect(() => {
    let active = true;
    fetch('/api/spherex/timeseries?caseId=case-barnards-star&sizePix=64&offline=1')
      .then((r) => (r.ok && r.headers.get('content-type')?.includes('application/json') ? r.json() : null))
      .then((data) => {
        if (!active || !data?.frames?.length) return;
        const f = data.frames[0];
        if (Array.isArray(f?.flux) && f.width > 0 && f.height > 0) {
          setRealCutout({ width: f.width, height: f.height, flux: f.flux });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Render master high-DPR sky mosaic & reference thumbnail whenever cutout updates
  useEffect(() => {
    const master = document.createElement('canvas');
    renderSkyMosaicToCanvas(master, LOGICAL_SIZE, realCutout);
    sourceCanvasRef.current = master;

    if (previewCanvasRef.current) {
      renderSkyMosaicToCanvas(previewCanvasRef.current, 96, realCutout);
    }
  }, [realCutout]);

  // Blit exact high-DPR slices onto visible board tiles
  useEffect(() => {
    const master = sourceCanvasRef.current;
    if (!master) return;
    const dpr = getCanvasDpr();
    const sliceCss = LOGICAL_SIZE / gridSize;
    const slicePx = master.width / gridSize;

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
      const sx = (srcIdx % gridSize) * slicePx;
      const sy = Math.floor(srcIdx / gridSize) * slicePx;
      ctx.drawImage(master, sx, sy, slicePx, slicePx, 0, 0, targetPx, targetPx);
    });
  }, [board, gridSize, realCutout]);

  const startBoard = useCallback((size: 3 | 4, keepTotalMoves = false) => {
    setGridSize(size);
    setBoard(createShuffledBoard(size === 3 ? 28 : 44, size));
    setMoves(0);
    if (!keepTotalMoves) {
      setTotalMoves(0);
      setStage2Done(false);
    }
    setFinished(false);
  }, []);

  const handleTileClick = useCallback(
    (tileIdx: number) => {
      if (finished) return;
      if (!canMoveTile(board, tileIdx, gridSize)) {
        gameAudio.playClick();
        onAttemptWrong?.();
        return;
      }

      gameAudio.playClick();
      const next = moveTile(board, tileIdx, gridSize);
      const nextMoves = moves + 1;
      const nextTotal = totalMoves + 1;
      setBoard(next);
      setMoves(nextMoves);
      setTotalMoves(nextTotal);

      if (isPuzzleSolved(next, gridSize)) {
        gameAudio.playSuccess();
        if (gridSize === 3 && !stage2Done) {
          // Advance automatically into Stage 2 (4x4 mosaic)!
          setStage2Done(true);
          setTimeout(() => {
            startBoard(4, true);
          }, 700);
        } else {
          setFinished(true);
          const stars = nextTotal <= 65 ? 3 : nextTotal <= 110 ? 2 : 1;
          setEarnedStars(stars);
          onComplete(85, stars);
        }
      }
    },
    [finished, board, gridSize, moves, totalMoves, stage2Done, onAttemptWrong, startBoard, onComplete]
  );

  // Keyboard arrow control for accessibility
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (finished) return;
      const emptyIdx = board.indexOf(0);
      const r = Math.floor(emptyIdx / gridSize);
      const c = emptyIdx % gridSize;
      let targetIdx = -1;
      if (e.key === 'ArrowUp' && r < gridSize - 1) targetIdx = emptyIdx + gridSize;
      if (e.key === 'ArrowDown' && r > 0) targetIdx = emptyIdx - gridSize;
      if (e.key === 'ArrowLeft' && c < gridSize - 1) targetIdx = emptyIdx + 1;
      if (e.key === 'ArrowRight' && c > 0) targetIdx = emptyIdx - 1;
      if (targetIdx !== -1) {
        e.preventDefault();
        handleTileClick(targetIdx);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [board, gridSize, finished, handleTileClick]);

  const alignedCount = countAlignedTiles(board);
  const totalTiles = gridSize * gridSize - 1;

  return (
    <div
      className="rounded-2xl bg-[#070B16] border border-sky-400/25 p-4 sm:p-5 space-y-4"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-sky-400 font-bold flex flex-wrap items-center gap-1.5 tabular-nums">
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>
              {gridSize === 3
                ? isAr
                  ? 'المرحلة ١: ٣×٣'
                  : 'STAGE 1: 3×3'
                : isAr
                ? 'المرحلة ٢: ٤×٤'
                : 'STAGE 2: 4×4'}
            </span>
            <span className="text-slate-600">·</span>
            <span>
              {t.gamePuzzleMovesLabel}: <span className="text-white">{moves}</span> ·{' '}
              <span className="text-emerald-300">
                {alignedCount}/{totalTiles}
              </span>
            </span>
          </div>
          <h3 className="font-display text-lg font-bold text-white">{t.gamePuzzleTitle}</h3>
          <p className="text-xs text-slate-300 mt-0.5">{t.gamePuzzleSubtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => startBoard(3)}
              className={`px-2 py-1 rounded-lg cursor-pointer ${
                gridSize === 3 ? 'bg-sky-400 text-slate-950 font-bold' : 'text-slate-300'
              }`}
            >
              3×3
            </button>
            <button
              type="button"
              onClick={() => startBoard(4)}
              className={`px-2 py-1 rounded-lg cursor-pointer ${
                gridSize === 4 ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300'
              }`}
            >
              4×4
            </button>
          </div>

          <button
            type="button"
            data-testid="puzzle-reset-btn"
            onClick={() => {
              gameAudio.playClick();
              startBoard(gridSize);
            }}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.gamePuzzleResetBtn}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        <div
          dir="ltr"
          data-testid="sliding-puzzle-grid"
          className={`grid ${gridSize === 4 ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 p-2 rounded-2xl bg-[#02040A] border border-white/15 w-[306px] sm:w-[342px]`}
        >
          {board.map((tileVal, idx) => {
            const movable = tileVal !== 0 && canMoveTile(board, idx, gridSize);
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
                  className={`absolute top-1 left-1 w-5 h-5 rounded-md font-mono text-[10px] font-bold flex items-center justify-center tabular-nums ${
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

        <div className="flex flex-col items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-slate-400">
            {realCutout
              ? isAr
                ? 'مرجع SPHEREx الحقيقي'
                : 'SPHEREx Cutout Reference'
              : isAr
              ? 'الإطار المرجعي المعاير'
              : 'Calibrated Reference'}
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
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm text-emerald-200">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>
              {isAr
                ? `تمت محاذاة لوحة سبيراكس (${totalMoves} حركة إجمالاً)! ربحت +85 XP.`
                : `SPHEREx mosaic calibrated in ${totalMoves} total moves! +85 XP awarded.`}
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
