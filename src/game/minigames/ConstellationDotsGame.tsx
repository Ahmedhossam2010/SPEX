import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, CheckCircle2, RotateCcw, Lightbulb, Timer, Star } from 'lucide-react';
import { Language } from '../../utils/translations';
import { gameAudio } from '../utils/gameAudio';
import { drawPsfStar, getCanvasDpr } from '../../utils/smoothCanvas';

interface StarNode {
  id: number;
  x: number;
  y: number;
  bayer: string;
  mag: number;
}

interface ConstellationStage {
  name: string;
  nameAr: string;
  skyNote: string;
  skyNoteAr: string;
  hint: string;
  hintAr: string;
  nodes: StarNode[];
}

const STAGES: ConstellationStage[] = [
  {
    name: 'Cassiopeia (The W Pointer)',
    nameAr: 'ذات الكرسي (حرف W السماوي)',
    skyNote: 'Northern Milky Way guide stars used to align SPHEREx wide-field scans.',
    skyNoteAr: 'نجوم دليلية في شمال درب التبانة لضبط توجيه المسح الواسع لـ SPHEREx.',
    hint: 'Trace the famous W shape left → right: Caph → Schedar → Gamma → Ruchbah → Segin.',
    hintAr: 'تتبّع شكل W الشهير من اليسار لليمين بالترتيب من ١ إلى ٥.',
    nodes: [
      { id: 1, x: 58, y: 78, bayer: 'β Caph', mag: 2.3 },
      { id: 2, x: 118, y: 158, bayer: 'α Schedar', mag: 2.2 },
      { id: 3, x: 185, y: 102, bayer: 'γ Cas', mag: 2.1 },
      { id: 4, x: 252, y: 175, bayer: 'δ Ruchbah', mag: 2.7 },
      { id: 5, x: 322, y: 90, bayer: 'ε Segin', mag: 3.3 },
    ],
  },
  {
    name: 'Orion (Belt & Giant Shoulders)',
    nameAr: 'الجبار (الحزام والمنكبان)',
    skyNote: 'Home to dusty star-forming nurseries where infrared light pierces dark clouds.',
    skyNoteAr: 'موطن سحب ولادة النجوم المغبرة حيث تنفذ الأشعة تحت الحمراء عبر الغبار.',
    hint: 'Connect shoulders → three belt stars → feet (1 → 7).',
    hintAr: 'صلِ المنكبين ثم نجوم الحزام الثلاثة ثم القدمين (١ → ٧).',
    nodes: [
      { id: 1, x: 118, y: 48, bayer: 'α Betelgeuse', mag: 0.5 },
      { id: 2, x: 255, y: 58, bayer: 'γ Bellatrix', mag: 1.6 },
      { id: 3, x: 215, y: 118, bayer: 'δ Mintaka', mag: 2.2 },
      { id: 4, x: 185, y: 128, bayer: 'ε Alnilam', mag: 1.7 },
      { id: 5, x: 155, y: 138, bayer: 'ζ Alnitak', mag: 1.8 },
      { id: 6, x: 120, y: 196, bayer: 'κ Saiph', mag: 2.1 },
      { id: 7, x: 262, y: 190, bayer: 'β Rigel', mag: 0.1 },
    ],
  },
  {
    name: 'Ursa Major (The Big Dipper)',
    nameAr: 'الدب الأكبر (بنات نعش)',
    skyNote: 'Classic northern asterism pointing toward the North Celestial Pole.',
    skyNoteAr: 'مجموعة نجمية شهيرة في السماء الشمالية تشير نحو القطب السماوي.',
    hint: 'Trace from the handle tip (Alkaid) into the 4-star bowl (1 → 7).',
    hintAr: 'ابدأ من طرف المقبض وتابع إلى الكأس الرباعي (١ → ٧).',
    nodes: [
      { id: 1, x: 52, y: 82, bayer: 'η Alkaid', mag: 1.9 },
      { id: 2, x: 112, y: 74, bayer: 'ζ Mizar', mag: 2.2 },
      { id: 3, x: 162, y: 98, bayer: 'ε Alioth', mag: 1.8 },
      { id: 4, x: 212, y: 118, bayer: 'δ Megrez', mag: 3.3 },
      { id: 5, x: 222, y: 174, bayer: 'γ Phecda', mag: 2.4 },
      { id: 6, x: 304, y: 170, bayer: 'β Merak', mag: 2.4 },
      { id: 7, x: 312, y: 108, bayer: 'α Dubhe', mag: 1.8 },
    ],
  },
  {
    name: 'Draco · North Ecliptic Pole',
    nameAr: 'التنين · القطب البروجي الشمالي (NEP)',
    skyNote: 'SPHEREx crosses the North Ecliptic Pole on every orbit, building deep infrared stacks.',
    skyNoteAr: 'يعبر SPHEREx القطب البروجي الشمالي في كل دورة مدارية لبناء رصدات عميقة.',
    hint: 'Trace Draco’s dragon head toward the NEP calibration target (1 → 6).',
    hintAr: 'تتبّع رأس التنين نحو نقطة المعايرة في القطب البروجي الشمالي (١ → ٦).',
    nodes: [
      { id: 1, x: 84, y: 168, bayer: 'δ Draco', mag: 3.1 },
      { id: 2, x: 145, y: 142, bayer: 'ε Draco', mag: 3.8 },
      { id: 3, x: 196, y: 98, bayer: 'ζ Draco', mag: 3.2 },
      { id: 4, x: 256, y: 66, bayer: 'β Rastaban', mag: 2.8 },
      { id: 5, x: 306, y: 92, bayer: 'γ Eltanin', mag: 2.2 },
      { id: 6, x: 248, y: 126, bayer: 'NEP Core', mag: 1.5 },
    ],
  },
];

interface Props {
  language: Language;
  onComplete: (xpAwarded: number, stars?: number) => void;
  onAttemptWrong?: () => void;
}

export const ConstellationDotsGame: React.FC<Props> = ({
  language,
  onComplete,
  onAttemptWrong,
}) => {
  const isAr = language === 'ar';
  const [stageIdx, setStageIdx] = useState(0);
  const [connectedCount, setConnectedCount] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showNextHint, setShowNextHint] = useState(false);
  const [timedMode, setTimedMode] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [timedOut, setTimedOut] = useState(false);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [earnedStars, setEarnedStars] = useState(3);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const stage = STAGES[stageIdx];
  const nextExpectedId = connectedCount + 1;

  // Optional timed challenge countdown
  useEffect(() => {
    if (!timedMode || finished || timedOut) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setTimedOut(true);
          gameAudio.playError();
          onAttemptWrong?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timedMode, finished, timedOut, onAttemptWrong]);

  // High-DPR soft PSF starfield backdrop
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const dpr = getCanvasDpr();
    const w = 640;
    const h = 300;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const grad = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.5, w * 0.72);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.6, '#050814');
    grad.addColorStop(1, '#02040a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 64; i++) {
      const rx = ((i * 137.5 + stageIdx * 29) % 100) / 100;
      const ry = ((i * 73.1 + 19 + stageIdx * 17) % 100) / 100;
      const radius = 0.7 + (i % 4) * 0.4;
      const rgb = i % 5 === 0 ? '251, 191, 36' : i % 3 === 0 ? '125, 211, 252' : '226, 232, 240';
      drawPsfStar(ctx, rx * w, ry * h, radius, rgb, 0.3 + (i % 5) * 0.1);
    }
    ctx.restore();
  }, [stageIdx]);

  const handleStarClick = (node: StarNode) => {
    if (finished || timedOut) return;
    if (node.id === nextExpectedId) {
      gameAudio.playClick();
      const nextCount = connectedCount + 1;
      setConnectedCount(nextCount);
      setWrongId(null);
      setShowNextHint(false);

      if (nextCount >= stage.nodes.length) {
        gameAudio.playSuccess();
        if (stageIdx + 1 < STAGES.length) {
          setTimeout(() => {
            setStageIdx((s) => s + 1);
            setConnectedCount(0);
            setShowNextHint(false);
          }, 550);
        } else {
          setFinished(true);
          const penalty = mistakes + Math.floor(hintsUsed / 2);
          const stars = penalty === 0 ? 3 : penalty <= 2 ? 2 : 1;
          setEarnedStars(stars);
          onComplete(75, stars);
        }
      }
    } else if (node.id > nextExpectedId) {
      gameAudio.playError();
      setMistakes((m) => m + 1);
      setWrongId(node.id);
      onAttemptWrong?.();
      setTimeout(() => setWrongId(null), 400);
    }
  };

  const resetAll = () => {
    gameAudio.playClick();
    setStageIdx(0);
    setConnectedCount(0);
    setMistakes(0);
    setHintsUsed(0);
    setShowNextHint(false);
    setSecondsLeft(45);
    setTimedOut(false);
    setWrongId(null);
    setFinished(false);
    setEarnedStars(3);
  };

  const connectedNodes = stage.nodes.slice(0, connectedCount);

  return (
    <div
      className="rounded-2xl bg-[#070B16] border border-sky-400/25 p-4 sm:p-5 space-y-4"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-sky-400 font-bold tabular-nums">
            <span>
              {isAr ? `الكوكبة ${stageIdx + 1} / ${STAGES.length}` : `CONSTELLATION ${stageIdx + 1} / ${STAGES.length}`}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">
              {connectedCount}/{stage.nodes.length} {isAr ? 'نجوم' : 'stars'}
            </span>
          </div>
          <h3 className="font-display text-lg font-bold text-white">
            {isAr ? stage.nameAr : stage.name}
          </h3>
          <p className="text-xs text-slate-300">{isAr ? stage.skyNoteAr : stage.skyNote}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              gameAudio.playClick();
              setTimedMode((t) => !t);
              setSecondsLeft(45);
              setTimedOut(false);
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 cursor-pointer transition ${
              timedMode
                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>
              {timedMode ? `${secondsLeft}s` : isAr ? 'تحدي مؤقت' : 'Timer Off'}
            </span>
          </button>

          <button
            type="button"
            disabled={finished || timedOut}
            onClick={() => {
              gameAudio.playClick();
              if (!showNextHint) setHintsUsed((h) => h + 1);
              setShowNextHint(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/35 text-xs text-amber-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>{isAr ? 'تلميح' : 'Hint'}</span>
          </button>

          <button
            type="button"
            onClick={resetAll}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAr ? 'إعادة' : 'Reset'}</span>
          </button>
        </div>
      </div>

      <p className="text-xs text-amber-200/90 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2">
        {isAr ? stage.hintAr : stage.hint}
      </p>

      <div className="relative rounded-2xl bg-[#02040A] border border-white/10 overflow-hidden">
        <canvas
          ref={bgCanvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
        <svg viewBox="0 0 380 235" className="relative z-10 w-full max-w-xl mx-auto h-64 block select-none">
          {/* Faint star-map guide lines after hint is triggered or stage finishes */}
          {(showNextHint || connectedCount === stage.nodes.length) && (
            <polyline
              fill="none"
              stroke="rgba(245, 158, 11, 0.25)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              points={stage.nodes.map((n) => `${n.x},${n.y}`).join(' ')}
            />
          )}

          {/* Connected Starlight Path */}
          {connectedNodes.length > 1 && (
            <polyline
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={connectedNodes.map((n) => `${n.x},${n.y}`).join(' ')}
            />
          )}

          {/* Target Stars */}
          {stage.nodes.map((node) => {
            const isConnected = node.id <= connectedCount;
            const isNext = node.id === nextExpectedId && !finished;
            const isWrong = wrongId === node.id;
            const starRadius = node.mag < 1 ? 13 : node.mag < 2.2 ? 11.5 : 10;

            return (
              <g
                key={node.id}
                onClick={() => handleStarClick(node)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Star ${node.id} ${node.bayer}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleStarClick(node);
                }}
              >
                {showNextHint && isNext && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={starRadius + 7}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={starRadius}
                  fill={isWrong ? '#F43F5E' : isConnected ? '#38BDF8' : showNextHint && isNext ? '#F59E0B' : '#1E293B'}
                  stroke="#E2E8F0"
                  strokeWidth="1.5"
                />
                <text
                  x={node.x}
                  y={node.y + 3.5}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                  fill={isConnected || (showNextHint && isNext) ? '#020617' : '#F8FAFC'}
                  pointerEvents="none"
                >
                  {node.id}
                </text>
                <text
                  x={node.x}
                  y={node.y + starRadius + 12}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fill="#94A3B8"
                  pointerEvents="none"
                >
                  {node.bayer}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {timedOut && !finished && (
        <div className="rounded-xl bg-rose-500/15 border border-rose-400/40 px-4 py-3 flex items-center justify-between gap-3 text-sm text-rose-200">
          <span>
            {isAr
              ? 'انتهى الوقت قبل تثبيت المنارة! اضغط إعادة للمحاولة.'
              : 'Time expired before locking the sky pattern! Click Reset to try again.'}
          </span>
          <button
            type="button"
            onClick={resetAll}
            className="px-3 py-1 rounded-lg bg-rose-500 text-slate-950 font-bold text-xs cursor-pointer"
          >
            {isAr ? 'حاول مجدداً' : 'Try Again'}
          </button>
        </div>
      )}

      {finished && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm text-emerald-200">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>
              {isAr
                ? 'تم رسم جميع الكوكبات الأربع! حصلت على +75 XP وتحددت منطقة الإشارة المفقودة.'
                : 'All 4 constellations locked! +75 XP awarded and SPEX beacon aligned.'}
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
