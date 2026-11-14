import React, { useState } from 'react';
import { CheckCircle2, Sparkles, RotateCcw } from 'lucide-react';
import { Language } from '../../utils/translations';
import { gameAudio } from '../utils/gameAudio';

interface MoleculePrompt {
  id: string;
  molecule: string;
  formula: string;
  dipUm: number;
  clue: string;
  clueAr: string;
  options: Array<{ id: string; label: string; labelAr: string }>;
}

const ROUNDS: MoleculePrompt[] = [
  {
    id: 'h2o',
    molecule: 'Water Ice',
    formula: 'H₂O',
    dipUm: 3.05,
    clue: 'Deep broad absorption valley centered right near 3.05 µm (Detector D4).',
    clueAr: 'وادي امتصاص عريض وعميق متمركز عند ٣.٠٥ ميكرومتر (الكاشف D4).',
    options: [
      { id: 'h2o', label: 'H₂O (Water Ice)', labelAr: 'H₂O (جليد الماء)' },
      { id: 'co2', label: 'CO₂ (Carbon Dioxide Ice)', labelAr: 'CO₂ (جليد ثاني أكسيد الكربون)' },
      { id: 'co', label: 'CO (Carbon Monoxide)', labelAr: 'CO (أول أكسيد الكربون)' },
    ],
  },
  {
    id: 'co2',
    molecule: 'Carbon Dioxide Ice',
    formula: 'CO₂',
    dipUm: 4.27,
    clue: 'Sharp narrow dip near 4.27 µm (Detector D5). Classic icy-grain marker.',
    clueAr: 'انخفاض حاد وضيق عند ٤.٢٧ ميكرومتر (الكاشف D5) — علامة الحبيبات الجليدية.',
    options: [
      { id: 'ch4', label: 'CH₄ (Methane Gas)', labelAr: 'CH₄ (غاز الميثان)' },
      { id: 'co2', label: 'CO₂ (Carbon Dioxide Ice)', labelAr: 'CO₂ (جليد ثاني أكسيد الكربون)' },
      { id: 'h2o', label: 'H₂O (Water Ice)', labelAr: 'H₂O (جليد الماء)' },
    ],
  },
  {
    id: 'ch4',
    molecule: 'Methane',
    formula: 'CH₄',
    dipUm: 3.32,
    clue: 'Strong notch around 3.32 µm seen in cold brown dwarf atmospheres.',
    clueAr: 'ثلمة امتصاص مميزة قرب ٣.٣٢ ميكرومتر في أغلفة الأقزام البنية الباردة.',
    options: [
      { id: 'ch4', label: 'CH₄ (Methane)', labelAr: 'CH₄ (الميثان)' },
      { id: 'co', label: 'CO (Carbon Monoxide)', labelAr: 'CO (أول أكسيد الكربون)' },
      { id: 'h2o', label: 'H₂O (Water Ice)', labelAr: 'H₂O (جليد الماء)' },
    ],
  },
  {
    id: 'co',
    molecule: 'Carbon Monoxide',
    formula: 'CO',
    dipUm: 4.67,
    clue: 'Fundamental ro-vibrational dip near 4.67 µm (Detector D6).',
    clueAr: 'بصمة امتصاص قرب ٤.٦٧ ميكرومتر في أقصى نطاق الكاشف D6.',
    options: [
      { id: 'co2', label: 'CO₂ (Carbon Dioxide Ice)', labelAr: 'CO₂ (جليد ثاني أكسيد الكربون)' },
      { id: 'ch4', label: 'CH₄ (Methane)', labelAr: 'CH₄ (الميثان)' },
      { id: 'co', label: 'CO (Carbon Monoxide)', labelAr: 'CO (أول أكسيد الكربون)' },
    ],
  },
];

function buildSpectrumPolyline(dipUm: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 50; i++) {
    const wl = 2.4 + (i / 50) * 2.6; // 2.4 .. 5.0 um
    const depth = Math.exp(-Math.pow((wl - dipUm) / 0.14, 2)) * 0.72;
    const ripple = Math.sin(i * 1.7) * 0.025;
    const flux = Math.max(0.12, Math.min(0.95, 0.86 - depth + ripple));
    const px = 30 + (i / 50) * 330;
    const py = 140 - flux * 110;
    pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
  }
  return pts.join(' ');
}

interface Props {
  language: Language;
  onComplete: (xpAwarded: number, stars?: number) => void;
  onAttemptWrong?: () => void;
}

export const SpectrumMatchGame: React.FC<Props> = ({
  language,
  onComplete,
  onAttemptWrong,
}) => {
  const isAr = language === 'ar';
  const [roundIdx, setRoundIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [finished, setFinished] = useState(false);

  const round = ROUNDS[roundIdx];
  const dipPx = 30 + ((round.dipUm - 2.4) / 2.6) * 330;

  const handlePick = (optId: string) => {
    if (finished) return;
    if (optId === round.id) {
      gameAudio.playSuccess();
      setFeedback('correct');
      setTimeout(() => {
        setFeedback(null);
        if (roundIdx + 1 < ROUNDS.length) {
          setRoundIdx((r) => r + 1);
        } else {
          setFinished(true);
          const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
          onComplete(90, stars);
        }
      }, 450);
    } else {
      gameAudio.playError();
      setMistakes((m) => m + 1);
      setFeedback('wrong');
      onAttemptWrong?.();
    }
  };

  const reset = () => {
    gameAudio.playClick();
    setRoundIdx(0);
    setFeedback(null);
    setFinished(false);
  };

  return (
    <div className="rounded-2xl bg-[#070B16] border border-amber-400/25 p-4 sm:p-5 space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-mono text-amber-300 font-bold">
            {isAr ? `الطيف ${roundIdx + 1} / ${ROUNDS.length}` : `SPECTRUM ${roundIdx + 1} / ${ROUNDS.length}`}
          </div>
          <h3 className="font-display text-lg font-bold text-white">
            {isAr ? 'طابق البصمة الطيفية مع الجزيء' : 'Match the Infrared Absorption Dip to Its Molecule'}
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">{isAr ? round.clueAr : round.clue}</p>
        </div>

        <button
          type="button"
          onClick={reset}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{isAr ? 'إعادة' : 'Reset'}</span>
        </button>
      </div>

      {/* Interactive SVG Infrared Spectrum Curve */}
      <div className="rounded-2xl bg-[#02040A] border border-white/10 p-3">
        <svg viewBox="0 0 385 170" className="w-full max-w-xl mx-auto h-48 block">
          <line x1="30" y1="20" x2="30" y2="142" stroke="rgba(255,255,255,0.2)" />
          <line x1="30" y1="142" x2="365" y2="142" stroke="rgba(255,255,255,0.2)" />

          {/* Dip Marker Line */}
          <line x1={dipPx} y1="22" x2={dipPx} y2="142" stroke="#F59E0B" strokeDasharray="3 3" strokeWidth="1.3" />
          <text x={dipPx} y="16" textAnchor="middle" fill="#FBBF24" fontSize="10" fontFamily="monospace" fontWeight="bold">
            {round.dipUm.toFixed(2)} µm
          </text>

          {/* Spectrum Curve */}
          <polyline
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.5"
            points={buildSpectrumPolyline(round.dipUm)}
          />

          {/* Axis Labels */}
          {[2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((wl) => {
            const x = 30 + ((wl - 2.4) / 2.6) * 330;
            return (
              <text key={wl} x={x} y="158" textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="monospace">
                {wl.toFixed(1)}µm
              </text>
            );
          })}
        </svg>
      </div>

      {/* Molecule Answer Choices */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {round.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={finished}
            onClick={() => handlePick(opt.id)}
            className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-sky-500/15 border border-white/15 hover:border-sky-400 text-sm font-semibold text-white cursor-pointer transition text-center"
          >
            {isAr ? opt.labelAr : opt.label}
          </button>
        ))}
      </div>

      {feedback === 'wrong' && (
        <div className="text-xs font-mono text-rose-300">
          {isAr
            ? 'تحقق من موقع الانخفاض في الطول الموجي (µm) وحاول مجدداً!'
            : 'Check the wavelength (µm) of that dip and try again!'}
        </div>
      )}

      {finished && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-4 py-3 flex items-center justify-between gap-3 text-sm text-emerald-200">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>
              {isAr
                ? 'رائع! طابقت جميع الجزيئات بنجاح وحصلت على +90 XP!'
                : 'All 4 molecular dips matched! +90 XP awarded.'}
            </span>
          </span>
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
        </div>
      )}
    </div>
  );
};
