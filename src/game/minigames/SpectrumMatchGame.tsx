import React, { useState } from 'react';
import { CheckCircle2, Sparkles, RotateCcw, Flame, Star, Info } from 'lucide-react';
import { Language } from '../../utils/translations';
import { gameAudio } from '../utils/gameAudio';

interface MoleculePrompt {
  id: string;
  molecule: string;
  formula: string;
  dipUm: number;
  secondaryDipUm?: number;
  bandLabel: string;
  clue: string;
  clueAr: string;
  whyEn: string;
  whyAr: string;
  hideGuideLine?: boolean;
  options: Array<{ id: string; label: string; labelAr: string }>;
}

const ROUNDS: MoleculePrompt[] = [
  {
    id: 'h2o',
    molecule: 'Water Ice',
    formula: 'H₂O',
    dipUm: 3.05,
    bandLabel: 'D4 · 3.05 µm',
    clue: 'Broad, deep valley centered near 3.05 µm where icy mantles coat dust grains.',
    clueAr: 'وادي امتصاص عريض وعميق متمركز عند ٣.٠٥ ميكرومتر حيث يغلف الجليد حبات الغبار.',
    whyEn: 'O–H stretching vibrations in frozen H₂O ice absorb 3.05 µm infrared photons across protostellar clouds.',
    whyAr: 'اهتزازات رابطة O–H في جليد الماء المتجمد تمتص فوتونات الأشعة تحت الحمراء عند ٣.٠٥ ميكرومتر.',
    options: [
      { id: 'h2o', label: 'H₂O (Water Ice)', labelAr: 'H₂O (جليد الماء)' },
      { id: 'co2', label: 'CO₂ (Carbon Dioxide Ice)', labelAr: 'CO₂ (جليد ثاني أكسيد الكربون)' },
      { id: 'co', label: 'CO (Carbon Monoxide)', labelAr: 'CO (أول أكسيد الكربون)' },
      { id: 'ch4', label: 'CH₄ (Methane)', labelAr: 'CH₄ (الميثان)' },
    ],
  },
  {
    id: 'co2',
    molecule: 'Carbon Dioxide Ice',
    formula: 'CO₂',
    dipUm: 4.27,
    bandLabel: 'D5 · 4.27 µm',
    clue: 'Sharp narrow dip just past 4.2 µm. Classic frozen icy-grain signature.',
    clueAr: 'انخفاض حاد وضيق بعد ٤.٢ ميكرومتر مباشرة — بصمة جليدية كلاسيكية.',
    whyEn: 'Asymmetric stretching of the O=C=O bond in solid CO₂ ice carves a crisp dip right at 4.27 µm.',
    whyAr: 'الاهتزاز غير المتماثل لرابطة O=C=O في جليد ثاني أكسيد الكربون يصنع انخفاضاً حاداً عند ٤.٢٧ ميكرومتر.',
    options: [
      { id: 'ch4', label: 'CH₄ (Methane Gas)', labelAr: 'CH₄ (غاز الميثان)' },
      { id: 'co2', label: 'CO₂ (Carbon Dioxide Ice)', labelAr: 'CO₂ (جليد ثاني أكسيد الكربون)' },
      { id: 'h2o', label: 'H₂O (Water Ice)', labelAr: 'H₂O (جليد الماء)' },
      { id: 'pah', label: 'PAH Dust Grains', labelAr: 'حبيبات غبار PAH' },
    ],
  },
  {
    id: 'ch4',
    molecule: 'Methane',
    formula: 'CH₄',
    dipUm: 3.32,
    bandLabel: 'D4 · 3.3–3.4 µm',
    hideGuideLine: true,
    clue: 'Read the wavelength axis: notice the sharp drop right around 3.3 µm inside a cool dwarf atmosphere.',
    clueAr: 'اقرأ محور الطول الموجي: لاحظ الهبوط الحاد قرب ٣.٣ ميكرومتر في غلاف قزم بارد.',
    whyEn: 'Symmetric C–H bond vibrations in cold methane gas strongly absorb near 3.32 µm—a hallmark of T and Y brown dwarfs.',
    whyAr: 'اهتزازات روابط C–H في غاز الميثان البارد تمتص بقوة عند ٣.٣٢ ميكرومتر وهي علامة فارقة للأقزام البنية.',
    options: [
      { id: 'ch4', label: 'CH₄ (Methane)', labelAr: 'CH₄ (الميثان)' },
      { id: 'co', label: 'CO (Carbon Monoxide)', labelAr: 'CO (أول أكسيد الكربون)' },
      { id: 'h2o', label: 'H₂O (Water Ice)', labelAr: 'H₂O (جليد الماء)' },
      { id: 'co2', label: 'CO₂ (Carbon Dioxide Ice)', labelAr: 'CO₂ (جليد ثاني أكسيد الكربون)' },
    ],
  },
  {
    id: 'co',
    molecule: 'Carbon Monoxide',
    formula: 'CO',
    dipUm: 4.67,
    bandLabel: 'D6 · 4.67 µm',
    hideGuideLine: true,
    clue: 'Look near the far right edge of Detector D6 (4.6–4.8 µm) for a fundamental gas dip.',
    clueAr: 'انظر قرب الطرف الأيمن من الكاشف D6 (٤.٦–٤.٨ ميكرومتر) لاكتشاف امتصاص هذا الغاز.',
    whyEn: 'Carbon monoxide (CO) fundamental ro-vibrational transitions absorb strongly around 4.67 µm inside warm disks and cool atmospheres.',
    whyAr: 'انتقالات الدوران والاهتزاز لغاز أول أكسيد الكربون CO تمتص بشدة قرب ٤.٦٧ ميكرومتر.',
    options: [
      { id: 'co2', label: 'CO₂ (Carbon Dioxide Ice)', labelAr: 'CO₂ (جليد ثاني أكسيد الكربون)' },
      { id: 'ch4', label: 'CH₄ (Methane)', labelAr: 'CH₄ (الميثان)' },
      { id: 'co', label: 'CO (Carbon Monoxide)', labelAr: 'CO (أول أكسيد الكربون)' },
      { id: 'pah', label: 'PAH Dust Emission', labelAr: 'انبعاث غبار PAH' },
    ],
  },
  {
    id: 'pah',
    molecule: 'Polycyclic Aromatic Hydrocarbons (PAH)',
    formula: 'PAH 3.29 µm',
    dipUm: 3.29,
    bandLabel: 'D4 · Emission Spike',
    hideGuideLine: true,
    clue: 'Surprise! Unlike icy absorption dips, ultraviolet-heated dusty disks emit a bright upward SPIKE near 3.29 µm.',
    clueAr: 'مفاجأة! على عكس انخفاضات الجليد، يُصدر الغبار المسخّن بالأشعة فوق البنفسجية قمة ساطعة للأعلى عند ٣.٢٩ ميكرومتر.',
    whyEn: 'Tiny carbon-ring dust grains (PAHs) absorb starlight and re-emit a sharp glowing infrared band at 3.29 µm.',
    whyAr: 'حبيبات الغبار الكربونية الحلقية تمتص ضوء النجوم وتعيد بثه كحزمة متوهجة عند ٣.٢٩ ميكرومتر.',
    options: [
      { id: 'pah', label: 'PAH Carbon Dust Emission (3.29 µm)', labelAr: 'انبعاث غبار كربوني PAH (٣.٢٩ ميكرومتر)' },
      { id: 'co2', label: 'CO₂ Ice Absorption (4.27 µm)', labelAr: 'امتصاص جليد CO₂ (٤.٢٧ ميكرومتر)' },
      { id: 'h2o', label: 'Water Ice Valley (3.05 µm)', labelAr: 'وادي جليد الماء (٣.٠٥ ميكرومتر)' },
      { id: 'co', label: 'CO Fundamental Dip (4.67 µm)', labelAr: 'انخفاض غاز CO (٤.٦٧ ميكرومتر)' },
    ],
  },
  {
    id: 'ydwarf',
    molecule: 'Cold Y-Dwarf Fingerprint (WISE 0855)',
    formula: 'CH₄ + CO Rise',
    dipUm: 3.32,
    secondaryDipUm: 4.67,
    bandLabel: 'D4–D6 · Dual Feature',
    hideGuideLine: true,
    clue: 'Final Boss: Deep methane absorption near 3.32 µm paired with rising 4.5–5.0 µm thermal flux and CO absorption!',
    clueAr: 'التحدي الأخير: امتصاص عميق للميثان عند ٣.٣٢ ميكرومتر مع ارتفاع التوهج الحراري فوق ٤.٥ ميكرومتر!',
    whyEn: 'At ~250 K, WISE 0855 is invisible in optical bands; methane carves 3.3 µm while thermal glow dominates D6 (4.5–5.0 µm).',
    whyAr: 'عند ٢٥٠ كلفن يختفي WISE 0855 عن الضوء المرئي، ويهيمن امتصاص الميثان عند ٣.٣ مع التوهج الحراري في D6.',
    options: [
      { id: 'ydwarf', label: 'Cold Y-Dwarf (~250 K CH₄ + Thermal Glow)', labelAr: 'قزم بني بارد Y (~٢٥٠ كلفن: ميثان + توهج حراري)' },
      { id: 'h2o', label: 'Pure Water Ice Cloud', labelAr: 'سحابة جليد ماء خالص' },
      { id: 'hotstar', label: 'Hot Blue O-Type Star', labelAr: 'نجم أزرق ساخن فئة O' },
      { id: 'co2', label: 'Pure CO₂ Ice Core', labelAr: 'لب جليد CO₂ خالص' },
    ],
  },
];

function buildSpectrumPolyline(round: MoleculePrompt): string {
  const pts: string[] = [];
  const isEmission = round.id === 'pah';
  const isYDwarf = round.id === 'ydwarf';

  for (let i = 0; i <= 60; i++) {
    const wl = 2.4 + (i / 60) * 2.6; // 2.4 .. 5.0 um
    const ripple = Math.sin(i * 1.7) * 0.02;
    let flux = isYDwarf ? 0.38 + ((wl - 2.4) / 2.6) * 0.48 : 0.84;

    if (isEmission) {
      const peak = Math.exp(-Math.pow((wl - round.dipUm) / 0.1, 2)) * 0.52;
      flux = 0.36 + peak + ripple;
    } else {
      const depth = Math.exp(-Math.pow((wl - round.dipUm) / (round.id === 'h2o' ? 0.2 : 0.12), 2)) * 0.62;
      const depth2 = round.secondaryDipUm
        ? Math.exp(-Math.pow((wl - round.secondaryDipUm) / 0.11, 2)) * 0.28
        : 0;
      flux = flux - depth - depth2 + ripple;
    }

    flux = Math.max(0.1, Math.min(0.95, flux));
    const px = 30 + (i / 60) * 330;
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
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [solvedInsight, setSolvedInsight] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [finished, setFinished] = useState(false);
  const [earnedStars, setEarnedStars] = useState(3);

  const round = ROUNDS[roundIdx];
  const dipPx = 30 + ((round.dipUm - 2.4) / 2.6) * 330;

  const handlePick = (optId: string) => {
    if (finished || solvedInsight) return;
    if (optId === round.id) {
      gameAudio.playSuccess();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBestStreak((b) => Math.max(b, nextStreak));
      setScore((s) => s + 100 * nextStreak);
      setFeedback('correct');
      setSolvedInsight(true);
    } else {
      gameAudio.playError();
      setMistakes((m) => m + 1);
      setStreak(0);
      setFeedback('wrong');
      onAttemptWrong?.();
    }
  };

  const handleNextRound = () => {
    gameAudio.playClick();
    setFeedback(null);
    setSolvedInsight(false);
    if (roundIdx + 1 < ROUNDS.length) {
      setRoundIdx((r) => r + 1);
    } else {
      setFinished(true);
      const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
      setEarnedStars(stars);
      onComplete(90, stars);
    }
  };

  const reset = () => {
    gameAudio.playClick();
    setRoundIdx(0);
    setMistakes(0);
    setStreak(0);
    setBestStreak(0);
    setScore(0);
    setSolvedInsight(false);
    setFeedback(null);
    setFinished(false);
    setEarnedStars(3);
  };

  return (
    <div className="rounded-2xl bg-[#070B16] border border-amber-400/25 p-4 sm:p-5 space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
            <span className="text-amber-300 font-bold">
              {isAr ? `الطيف ${roundIdx + 1} / ${ROUNDS.length}` : `SPECTRUM ${roundIdx + 1} / ${ROUNDS.length}`}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-sky-300">{round.bandLabel}</span>
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-200 font-bold">
                <Flame className="w-3 h-3 text-amber-400" />
                {streak}× {isAr ? 'سلسلة' : 'Streak'}
              </span>
            )}
            <span className="text-emerald-300 font-semibold">{score} pts</span>
          </div>
          <h3 className="font-display text-lg font-bold text-white">
            {isAr ? 'طابق البصمة الطيفية مع الجزيء' : 'Match the Infrared Spectrum to Its Physics'}
          </h3>
          <p className="text-xs text-slate-300">{isAr ? round.clueAr : round.clue}</p>
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
          {/* Detector bands subtle backdrop */}
          <text x="105" y="136" textAnchor="middle" fill="#334155" fontSize="9" fontFamily="monospace">
            D4 (2.4–3.8µm)
          </text>
          <text x="245" y="136" textAnchor="middle" fill="#334155" fontSize="9" fontFamily="monospace">
            D5 (3.8–4.4µm)
          </text>
          <text x="335" y="136" textAnchor="middle" fill="#334155" fontSize="9" fontFamily="monospace">
            D6
          </text>

          <line x1="30" y1="20" x2="30" y2="142" stroke="rgba(255,255,255,0.2)" />
          <line x1="30" y1="142" x2="365" y2="142" stroke="rgba(255,255,255,0.2)" />

          {/* Dip Marker Line (shown in guided rounds or after solving) */}
          {(!round.hideGuideLine || solvedInsight) && (
            <>
              <line x1={dipPx} y1="22" x2={dipPx} y2="142" stroke="#F59E0B" strokeDasharray="3 3" strokeWidth="1.3" />
              <text x={dipPx} y="16" textAnchor="middle" fill="#FBBF24" fontSize="10" fontFamily="monospace" fontWeight="bold">
                {round.dipUm.toFixed(2)} µm
              </text>
            </>
          )}

          {/* Spectrum Curve */}
          <polyline
            fill="none"
            stroke={round.id === 'pah' ? '#FBBF24' : '#38BDF8'}
            strokeWidth="2.6"
            points={buildSpectrumPolyline(round)}
          />

          {/* Axis Labels */}
          {[2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((wl) => {
            const x = 30 + ((wl - 2.4) / 2.6) * 330;
            return (
              <g key={wl}>
                <line x1={x} y1="142" x2={x} y2="146" stroke="#64748b" />
                <text x={x} y="159" textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="monospace">
                  {wl.toFixed(1)}µm
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Molecule Answer Choices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {round.options.map((opt) => {
          const isCorrectChoice = solvedInsight && opt.id === round.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={finished || solvedInsight}
              onClick={() => handlePick(opt.id)}
              className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition text-center ${
                isCorrectChoice
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-white/[0.04] hover:bg-sky-500/15 border-white/15 hover:border-sky-400 text-white cursor-pointer disabled:opacity-60'
              }`}
            >
              {isAr ? opt.labelAr : opt.label}
            </button>
          );
        })}
      </div>

      {feedback === 'wrong' && !solvedInsight && (
        <div className="text-xs font-mono text-rose-300">
          {isAr
            ? 'تحقق من موقع القمة أو الوادي على محور الطول الموجي (µm) وحاول مجدداً!'
            : 'Check where the dip or spike sits along the wavelength axis (µm) and try again!'}
        </div>
      )}

      {solvedInsight && !finished && (
        <div className="rounded-xl bg-sky-500/12 border border-sky-400/35 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 text-xs">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Info className="w-4 h-4 shrink-0" />
              <span>{isAr ? 'لماذا يمتص أو يبعث هنا؟' : 'Why this wavelength reacts:'}</span>
            </div>
            <p className="text-slate-200 leading-relaxed">{isAr ? round.whyAr : round.whyEn}</p>
          </div>
          <button
            type="button"
            data-testid="spectrum-next-btn"
            onClick={handleNextRound}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs whitespace-nowrap cursor-pointer shrink-0"
          >
            {roundIdx + 1 < ROUNDS.length
              ? isAr
                ? 'الطيف التالي'
                : 'Next Spectrum'
              : isAr
              ? 'إنهاء الجولة'
              : 'Finish'}
          </button>
        </div>
      )}

      {finished && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm text-emerald-200">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>
              {isAr
                ? `رائع! طابقت جميع الأطياف الستة (أفضل سلسلة ${bestStreak}×) وحصلت على +90 XP!`
                : `All 6 infrared signatures decoded! Best streak ${bestStreak}× · +90 XP awarded.`}
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
