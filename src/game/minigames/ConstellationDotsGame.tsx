import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';
import { Language } from '../../utils/translations';
import { gameAudio } from '../utils/gameAudio';
import { drawPsfStar, getCanvasDpr } from '../../utils/smoothCanvas';

interface StarNode {
  id: number;
  x: number;
  y: number;
  label: string;
}

interface ConstellationStage {
  name: string;
  nameAr: string;
  hint: string;
  hintAr: string;
  nodes: StarNode[];
}

const STAGES: ConstellationStage[] = [
  {
    name: 'Beacon 1 · Cold Dwarf Pointer (Cassiopeia W)',
    nameAr: 'المنارة ١ · مؤشر الكوكبة (ذات الكرسي)',
    hint: 'Click stars 1 → 2 → 3 → 4 → 5 in numerical order to trace the survey guide.',
    hintAr: 'اضغط على النجوم بالترتيب ١ → ٢ → ٣ → ٤ → ٥ لرسم المسار الدليلي.',
    nodes: [
      { id: 1, x: 55, y: 78, label: 'α' },
      { id: 2, x: 115, y: 158, label: 'β' },
      { id: 3, x: 185, y: 105, label: 'γ' },
      { id: 4, x: 250, y: 175, label: 'δ' },
      { id: 5, x: 325, y: 92, label: 'ε' },
    ],
  },
  {
    name: 'Beacon 2 · North Ecliptic Pole Relay (SPHEREx Deep Field)',
    nameAr: 'المنارة ٢ · حقل القطب البروجي العميق لـ SPHEREx',
    hint: 'Connect nodes 1 → 2 → 3 → 4 → 5 → 6 to triangulate the lost NEP sky sector.',
    hintAr: 'صلِ النقاط من ١ إلى ٦ لتحديد مثلث البحث في الحقل العميق.',
    nodes: [
      { id: 1, x: 190, y: 40, label: 'N1' },
      { id: 2, x: 285, y: 88, label: 'N2' },
      { id: 3, x: 265, y: 178, label: 'N3' },
      { id: 4, x: 185, y: 205, label: 'N4' },
      { id: 5, x: 100, y: 158, label: 'N5' },
      { id: 6, x: 120, y: 72, label: 'N6' },
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
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const stage = STAGES[stageIdx];
  const nextExpectedId = connectedCount + 1;

  // High-DPR soft PSF starfield backdrop
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const dpr = getCanvasDpr();
    const w = 640;
    const h = 280;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.5, w * 0.7);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.6, '#050814');
    grad.addColorStop(1, '#02040a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 48; i++) {
      const rx = ((i * 137.5) % 100) / 100;
      const ry = ((i * 73.1 + 19) % 100) / 100;
      const radius = 0.8 + (i % 4) * 0.4;
      const rgb = i % 5 === 0 ? '251, 191, 36' : i % 3 === 0 ? '125, 211, 252' : '226, 232, 240';
      drawPsfStar(ctx, rx * w, ry * h, radius, rgb, 0.35 + (i % 5) * 0.1);
    }
    ctx.restore();
  }, [stageIdx]);

  const handleStarClick = (node: StarNode) => {
    if (finished) return;
    if (node.id === nextExpectedId) {
      gameAudio.playClick();
      const nextCount = connectedCount + 1;
      setConnectedCount(nextCount);
      setWrongId(null);

      if (nextCount >= stage.nodes.length) {
        gameAudio.playSuccess();
        if (stageIdx + 1 < STAGES.length) {
          setTimeout(() => {
            setStageIdx((s) => s + 1);
            setConnectedCount(0);
          }, 500);
        } else {
          setFinished(true);
          const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
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
    setWrongId(null);
    setFinished(false);
  };

  const connectedNodes = stage.nodes.slice(0, connectedCount);

  return (
    <div
      className="rounded-2xl bg-[#070B16] border border-sky-400/25 p-4 sm:p-5 space-y-4"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-mono text-sky-400 font-bold tabular-nums">
            {isAr ? `المرحلة ${stageIdx + 1} / ${STAGES.length}` : `STAGE ${stageIdx + 1} / ${STAGES.length}`}
          </div>
          <h3 className="font-display text-lg font-bold text-white">
            {isAr ? stage.nameAr : stage.name}
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">{isAr ? stage.hintAr : stage.hint}</p>
        </div>

        <button
          type="button"
          onClick={resetAll}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{isAr ? 'إعادة' : 'Reset'}</span>
        </button>
      </div>

      <div className="relative rounded-2xl bg-[#02040A] border border-white/10 overflow-hidden">
        <canvas
          ref={bgCanvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
        <svg viewBox="0 0 380 235" className="relative z-10 w-full max-w-xl mx-auto h-64 block select-none">
          {/* Connected Starlight Path */}
          {connectedNodes.length > 1 && (
            <polyline
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2.5"
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

            return (
              <g
                key={node.id}
                onClick={() => handleStarClick(node)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Star ${node.id}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleStarClick(node);
                }}
              >
                {isNext && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={18}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isConnected ? 11 : 12}
                  fill={isWrong ? '#F43F5E' : isConnected ? '#38BDF8' : isNext ? '#F59E0B' : '#1E293B'}
                  stroke="#E2E8F0"
                  strokeWidth="1.5"
                />
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="monospace"
                  fill={isConnected || isNext ? '#020617' : '#F8FAFC'}
                  pointerEvents="none"
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {finished && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-4 py-3 flex items-center justify-between gap-3 text-sm text-emerald-200">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>
              {isAr
                ? 'تم رسم المنارة بنجاح! حصلت على +75 XP وتحددت منطقة الإشارة المفقودة.'
                : 'Constellation beacon locked! +75 XP awarded and lost patch triangulated.'}
            </span>
          </span>
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
        </div>
      )}
    </div>
  );
};
