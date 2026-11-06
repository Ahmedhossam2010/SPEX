import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Sliders,
  Crosshair,
  Award,
  FileText,
  Printer,
  Copy,
  Check,
  RotateCcw,
  ShieldAlert,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { DialogueBox } from '../dialogue/DialogueBox';
import { SpexPortrait, SpexExpression } from '../../spex/SpexPortrait';
import { ClueItem } from '../evidence/EvidenceNotebook';
import { gameAudio } from '../utils/gameAudio';
import { Language } from '../../utils/translations';
import { SpherexLogo } from '../../components/SpherexLogo';

interface Chapter3SceneProps {
  language: Language;
  onUnlockClue: (clue: ClueItem) => void;
  onCompleteGame: () => void;
  hasClue3: boolean;
  cadetName: string;
  onUpdateCadetName: (name: string) => void;
  onExitToExplore: () => void;
}

export const Chapter3Scene: React.FC<Chapter3SceneProps> = ({
  language,
  onUnlockClue,
  onCompleteGame,
  hasClue3,
  cadetName,
  onUpdateCadetName,
  onExitToExplore,
}) => {
  const isArabic = language === 'ar';

  // Sub-stages: 'investigation' | 'verdict' | 'certificate'
  const [stage, setStage] = useState<'investigation' | 'verdict' | 'certificate'>('investigation');

  // Interactive Viewport controls
  const [compareMode, setCompareMode] = useState<'split' | 'blink' | 'side' | 'diff'>('split');
  const [splitPos, setSplitPos] = useState<number>(0.5);
  const [blinkEpoch, setBlinkEpoch] = useState<1 | 2>(1);
  const [isPlayingBlink, setIsPlayingBlink] = useState<boolean>(true);
  const [blinkSpeedHz, setBlinkSpeedHz] = useState<number>(2); // 1, 2, 4
  const [probe, setProbe] = useState<{ x: number; y: number; val1: number; val2: number; diff: number; snr: number } | null>(null);

  // Verdict selection
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string | null>(null);
  const [spexReaction, setSpexReaction] = useState<SpexExpression>('explaining');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Blink interval timer
  useEffect(() => {
    if (compareMode !== 'blink' || !isPlayingBlink) return;
    const intervalMs = 1000 / blinkSpeedHz;
    const timer = setInterval(() => {
      setBlinkEpoch((prev) => (prev === 1 ? 2 : 1));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [compareMode, isPlayingBlink, blinkSpeedHz]);

  // Render Synthetic Astronomical Viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background cosmic space
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    // Coordinate grid overlay
    ctx.strokeStyle = '#0e172a';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Static background reference stars (constant between Epoch 1 and Epoch 2)
    const refStars = [
      { x: 70, y: 50, r: 2.2, f: 120 },
      { x: 380, y: 60, r: 2.8, f: 180 },
      { x: 100, y: 220, r: 1.8, f: 90 },
      { x: 390, y: 230, r: 2.5, f: 160 },
      { x: 230, y: 40, r: 1.5, f: 80 },
      { x: 40, y: 140, r: 2.0, f: 110 },
      { x: 440, y: 150, r: 1.9, f: 105 },
    ];

    // Mystery target coords
    const tx = width / 2;
    const ty = height / 2;

    const drawEpoch = (epoch: 1 | 2, clipLeft: number, clipRight: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(clipLeft, 0, clipRight - clipLeft, height);
      ctx.clip();

      // Draw reference stars
      refStars.forEach((st) => {
        const radGrad = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, st.r * 3);
        radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        radGrad.addColorStop(0.5, 'rgba(180, 220, 255, 0.5)');
        radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Target star: faint in Epoch 1 (quiescent), exploding 8x brighter in Epoch 2 (outburst!)
      const targetRadius = epoch === 1 ? 2.5 : 9.0;
      const targetGlow = epoch === 1 ? 12 : 45;

      const tGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, targetGlow);
      if (epoch === 1) {
        tGrad.addColorStop(0, 'rgba(255, 220, 180, 0.7)');
        tGrad.addColorStop(0.5, 'rgba(200, 130, 60, 0.25)');
        tGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        tGrad.addColorStop(0, 'rgba(255, 255, 240, 1)');
        tGrad.addColorStop(0.2, 'rgba(255, 200, 80, 0.9)');
        tGrad.addColorStop(0.6, 'rgba(240, 90, 40, 0.5)');
        tGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.arc(tx, ty, targetGlow, 0, Math.PI * 2);
      ctx.fill();

      // Core point
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(tx, ty, targetRadius, 0, Math.PI * 2);
      ctx.fill();

      // Epoch Label
      ctx.fillStyle = epoch === 1 ? '#38bdf8' : '#fbbf24';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        epoch === 1 ? 'EPOCH 1: 2025-04 (QUIESCENT)' : 'EPOCH 2: 2025-10 (+6 MONTHS)',
        clipLeft + 12,
        24
      );

      ctx.restore();
    };

    if (compareMode === 'split') {
      const splitX = width * splitPos;
      drawEpoch(1, 0, splitX);
      drawEpoch(2, splitX, width);

      // Split line divider
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, height);
      ctx.stroke();

      // Handle marker
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(splitX, height / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (compareMode === 'blink') {
      drawEpoch(blinkEpoch, 0, width);
    } else if (compareMode === 'diff') {
      // Draw Difference Image: D = I2 - I1
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, width, height);

      // In difference image, static stars cancel out to noise ~ 0
      refStars.forEach((st) => {
        ctx.fillStyle = 'rgba(100, 116, 139, 0.15)';
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Central transient has HUGE positive residual!
      const diffGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, 42);
      diffGrad.addColorStop(0, '#f43f5e'); // Intense red/magenta positive residual
      diffGrad.addColorStop(0.4, 'rgba(244, 63, 94, 0.6)');
      diffGrad.addColorStop(0.8, 'rgba(236, 72, 153, 0.2)');
      diffGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = diffGrad;
      ctx.beginPath();
      ctx.arc(tx, ty, 42, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(tx, ty, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('DIFFERENCE: D = I2 - I1 (SNR = +14.8σ)', 14, 24);
    } else {
      // Side by side
      drawEpoch(1, 0, width / 2);
      drawEpoch(2, width / 2, width);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
    }

    // Reticle on target
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(tx, ty, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [compareMode, splitPos, blinkEpoch]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const tx = canvas.width / 2;
    const ty = canvas.height / 2;
    const dist = Math.hypot(x - tx, y - ty);

    if (dist < 40) {
      // Hit target!
      gameAudio.playClueUnlocked();
      setProbe({
        x: Math.round(x),
        y: Math.round(y),
        val1: 18.4,
        val2: 152.6,
        diff: 134.2,
        snr: 14.8,
      });

      if (!hasClue3) {
        const clue3: ClueItem = {
          id: 'clue_3_accretion_burst',
          chapter: 3,
          title: 'Episodic Protostellar Accretion Outburst',
          titleAr: 'ثوران تراكمي نيزكي نجمي هائل (FU Orionis)',
          timestamp: 'T+01:12:05',
          category: 'temporal_difference',
          observation: 'Flux surged by +730% between April 2025 and October 2025 (ΔI = 134.2 mJy, SNR = +14.8σ). Stationary point source residual without dipole movement.',
          observationAr: 'قفز التدفق الضوئي بنسبة +730% بين أبريل وأكتوبر 2025 (فارق سطوع 134.2 ملي جانسكي، ومستوى دلالة إحصائية +14.8 انحراف معياري). المصدر ثابت مكانياً بدون إزاحة حركية.',
          scientificDeduction: 'A stationary +14.8σ residual embedded in an ice-rich envelope proves an episodic FU Orionis-type mass accretion outburst, where a circumstellar disk feeds rapid material onto the nascent infant star.',
          scientificDeductionAr: 'المتبقي الثابت بمستوى دلالة +14.8σ والمحاط بجليد كوني يثبت علمياً حدوث ثوران تراكمي من نوع (FU Orionis)، حيث يغذي القرص الكوكبي النجم الرضيع بكتلة هائلة تدفعه للتوهج فجأة.',
          unlocked: true,
          confidence: 99,
        };
        onUnlockClue(clue3);
      }
    } else {
      gameAudio.playClick();
      setProbe({
        x: Math.round(x),
        y: Math.round(y),
        val1: 14.1,
        val2: 14.3,
        diff: 0.2,
        snr: 0.25,
      });
    }
  };

  const handleSelectVerdict = (id: string) => {
    setSelectedDiagnosis(id);
    gameAudio.playClick();
    if (id === 'fu_orionis') {
      setSpexReaction('success');
      gameAudio.playSuccess();
    } else if (id === 'cosmic_ray') {
      setSpexReaction('facepalm');
    } else {
      setSpexReaction('sarcastic');
    }
  };

  const copyCertificate = () => {
    const text = `SPHEREx COSMIC DETECTIVE CERTIFICATE\nCadet: ${cadetName}\nVerdict: FU Orionis Protostellar Accretion Outburst\nSignificance: +14.8σ Difference Detection\nMolecular Markers: 3.05 µm H2O & 4.27 µm CO2 Ice Mantles\nVerified by SPEX Mech Cat Guardian`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* CHAPTER HEADER */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#09101d] border border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
            3
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
              {isArabic ? 'الفصل الثالث • المقارنة الزمنية والتصوير التفاضلي' : 'Chapter 3 • Temporal Difference Forensics'}
            </span>
            <h2 className="text-lg font-bold text-white">
              {isArabic ? 'ماذا تغير؟ كشف الثوران الكوني الخفي' : 'What Changed? Exposing the Cosmic Outburst'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasClue3 ? (
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isArabic ? 'الدليل الثالث مؤكد (+14.8σ)' : 'Clue 3 Secured (+14.8σ)'}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-1.5 animate-pulse">
              <Crosshair className="w-3.5 h-3.5" />
              {isArabic ? 'انقر على المصدر للفحص' : 'Probe Target Source'}
            </span>
          )}
        </div>
      </div>

      {/* SYNTHETIC DATA MANDATORY DISCLAIMER */}
      <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-[11px] text-amber-200/90 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {isArabic
              ? 'تنبيه الشفافية العلمية: هذه البيانات تمثيل تركيبي تعليمي (Synthetic Benchmark Simulation) مصمم لتدريب المحققين على استخراج الفوارق الزمنية دون خلطها بالأرشيف الأصلي.'
              : 'Scientific Transparency Notice: This imagery is a controlled Synthetic Benchmark Simulation designed to train investigators in astronomical difference imaging without altering the genuine NASA archive.'}
          </span>
        </div>
        <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/50 shrink-0">
          SIMULATION DATA
        </span>
      </div>

      {/* MAIN INVESTIGATION STAGE */}
      {stage === 'investigation' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#09101d] border border-cyan-500/30 shadow-2xl space-y-4">
            {/* Viewport Mode Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => {
                    setCompareMode('split');
                    gameAudio.playClick();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    compareMode === 'split' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isArabic ? 'ستارة منزلقة (Split)' : 'Split Swipe'}
                </button>
                <button
                  onClick={() => {
                    setCompareMode('blink');
                    gameAudio.playClick();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    compareMode === 'blink' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isArabic ? 'وميض سريع (Blink)' : 'Fast Blink'}
                </button>
                <button
                  onClick={() => {
                    setCompareMode('diff');
                    gameAudio.playClick();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    compareMode === 'diff' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isArabic ? 'صورة الفارق (D = I2 - I1)' : 'Difference Image'}
                </button>
              </div>

              {/* Blink controls if in blink mode */}
              {compareMode === 'blink' && (
                <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setIsPlayingBlink(!isPlayingBlink)}
                    className="p-1 rounded text-cyan-300 hover:bg-slate-800"
                  >
                    {isPlayingBlink ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-slate-400">Speed:</span>
                  {[1, 2, 4].map((hz) => (
                    <button
                      key={hz}
                      onClick={() => setBlinkSpeedHz(hz)}
                      className={`px-2 py-0.5 rounded ${
                        blinkSpeedHz === hz ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {hz}Hz
                    </button>
                  ))}
                </div>
              )}

              {/* Split slider if in split mode */}
              {compareMode === 'split' && (
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span>Epoch 1</span>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.01"
                    value={splitPos}
                    onChange={(e) => setSplitPos(Number(e.target.value))}
                    className="w-24 sm:w-32 accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                  <span>Epoch 2</span>
                </div>
              )}
            </div>

            {/* Astronomical Canvas */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black flex justify-center shadow-inner cursor-crosshair">
              <canvas
                ref={canvasRef}
                width={560}
                height={320}
                onClick={handleCanvasClick}
                className="w-full max-w-[560px] h-auto aspect-[7/4] block"
              />
            </div>

            {/* Live Pixel Flux & SNR Probe Display */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-400">{isArabic ? 'مسبار السطوع المباشر:' : 'Live Forensic Probe:'}</span>
                {probe ? (
                  <span className="text-cyan-300 font-bold">
                    X: {probe.x}, Y: {probe.y}
                  </span>
                ) : (
                  <span className="text-slate-500 italic">
                    {isArabic ? 'انقر على الصورة لقياس السطوع' : 'Click canvas to measure flux'}
                  </span>
                )}
              </div>

              {probe && (
                <div className="flex items-center gap-4 text-slate-300">
                  <div>Epoch 1: <span className="text-white font-bold">{probe.val1} mJy</span></div>
                  <div>Epoch 2: <span className="text-amber-300 font-bold">{probe.val2} mJy</span></div>
                  <div>ΔI: <span className="text-rose-400 font-bold">+{probe.diff} mJy</span></div>
                  <div className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                    SNR: +{probe.snr}σ
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogueBox
            speakerName="SPEX"
            speakerNameAr="سبيكس"
            expression={hasClue3 ? 'eureka' : 'thinking'}
            text={
              hasClue3
                ? "BINGO! Look at that difference residual: +134.2 mJy with a statistical significance of +14.8σ! All three forensic clues are now secured in our notebook. Ready to deliver the official verdict?"
                : "Switch to 'Difference Image' or drag the 'Split Swipe' over the center! Click directly on the target to measure its astronomical flux change and calculate the signal-to-noise ratio!"
            }
            textAr={
              hasClue3
                ? "أصبنا الهدف بدقة! انظر إلى المتبقي التفاضلي: فارق سطوع +134.2 ملي جانسكي وبمستوى دلالة إحصائية +14.8σ! اكتملت الأدلة الثلاثة في سجلنا. هل أنت مستعد لإصدار الحكم العلمي النهائي؟"
                : "انتقل إلى 'صورة الفارق' أو حرّك 'الستارة المنزلقة' فوق المنتصف! انقر مباشرة على الجرم لقياس تغير سطوعه وحساب نسبة الإشارة إلى الضوضاء (SNR)!"
            }
            language={language}
            onContinue={hasClue3 ? () => setStage('verdict') : undefined}
            continueLabel="Deliver Final Verdict"
            continueLabelAr="إصدار الحكم والتشخيص النهائي"
          />
        </div>
      )}

      {/* FINAL VERDICT STAGE */}
      {stage === 'verdict' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#09101d] border border-cyan-500/30 shadow-2xl space-y-5">
            <div className="pb-3 border-b border-slate-800">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                {isArabic ? 'المجلس العلمي للتحقيق الفلكي' : 'Astrophysical Board of Inquiry'}
              </span>
              <h3 className="text-xl font-bold text-white mt-1">
                {isArabic ? 'ما هو التشخيص الفيزيائي لهذا الحدث الكوني؟' : 'Forensic Diagnosis: Classify the Changing Sky Event'}
              </h3>
            </div>

            <div className="space-y-3">
              {/* Option A */}
              <button
                onClick={() => handleSelectVerdict('cosmic_ray')}
                className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                  selectedDiagnosis === 'cosmic_ray'
                    ? 'bg-rose-950/40 border-rose-500 text-white'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                  {selectedDiagnosis === 'cosmic_ray' && <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white">
                    {isArabic ? 'ضربة أشعة كونية (Cosmic Ray Artifact)' : 'Cosmic Ray Hit (Detector Artifact)'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {isArabic
                      ? 'جسيم عالي الطاقة أصاب مستشعر الكاميرا وسبب توهجاً مفاجئاً في بكسل منفرد.'
                      : 'A high-energy charged particle strike depositing spurious charge on a single pixel.'}
                  </p>
                </div>
              </button>

              {/* Option B */}
              <button
                onClick={() => handleSelectVerdict('asteroid')}
                className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                  selectedDiagnosis === 'asteroid'
                    ? 'bg-rose-950/40 border-rose-500 text-white'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                  {selectedDiagnosis === 'asteroid' && <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white">
                    {isArabic ? 'كويكب متحرك في النظام الشمسي (Moving Asteroid)' : 'Near-Earth Asteroid / Moving Solar System Object'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {isArabic
                      ? 'جرم صخري قريب تحرك عبر قبة السماء بين الدورتين الرصديتين.'
                      : 'A Solar System rock whose orbital motion caused apparent displacement across visits.'}
                  </p>
                </div>
              </button>

              {/* Option C (Correct!) */}
              <button
                onClick={() => handleSelectVerdict('fu_orionis')}
                className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                  selectedDiagnosis === 'fu_orionis'
                    ? 'bg-emerald-950/60 border-emerald-400 text-white ring-1 ring-emerald-400'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="w-5 h-5 rounded-full border border-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  {selectedDiagnosis === 'fu_orionis' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                    <span>
                      {isArabic
                        ? 'ثوران تراكمي لنجم وليد (FU Orionis Protostellar Accretion Outburst)'
                        : 'FU Orionis Protostellar Accretion Outburst'}
                    </span>
                    {selectedDiagnosis === 'fu_orionis' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {isArabic
                      ? 'نجم أولي محاط بغلاف جليدي كثيف (H2O و CO2) ابتلع فجأة كمية هائلة من مادة قرصه المحيط، مما رفع سطوعه بالأشعة تحت الحمراء بمقدار 8 أضعاف بشكل ثابت مكانياً.'
                      : 'An infant protostar shrouded in dense interstellar ice mantles (H2O & CO2) experiencing a massive accretion instability from its protoplanetary disk, driving a stationary +14.8σ infrared surge.'}
                  </p>
                </div>
              </button>
            </div>
          </div>

          <DialogueBox
            speakerName="SPEX"
            speakerNameAr="سبيكس"
            expression={spexReaction}
            text={
              selectedDiagnosis === 'fu_orionis'
                ? "GENIUS WORK, DETECTIVE! That matches every single piece of evidence: optical extinction, 3.05 µm / 4.27 µm ice signatures, and a stationary +14.8σ difference surge! Let's mint your Official Cosmic Detective Certificate!"
                : selectedDiagnosis === 'cosmic_ray'
                ? "Hold your paws! A cosmic ray hit only affects 1 or 2 pixels and vanishes in the next exposure. Our source has a proper telescope point spread function across 9 pixels and persists for months!"
                : selectedDiagnosis === 'asteroid'
                ? "Not quite! Moving asteroids leave a 'dipole' in difference images: a bright positive peak where it is now, and a dark negative hole where it used to be. Our source stayed right where it was!"
                : "Review the evidence in your notebook and select the diagnosis that explains all 3 clues."
            }
            textAr={
              selectedDiagnosis === 'fu_orionis'
                ? "عمل عبقري أيها المحقق! هذا التفسير يطابق كل دليل جمعناه بدقة متناهية: حجب الضوء المرئي، بصمات الجليد عند 3.05 و 4.27 ميكرومتر، وتوهج تفاضلي ثابت بمستوى +14.8σ! حان وقت إصدار شهادتك الرسمية!"
                : selectedDiagnosis === 'cosmic_ray'
                ? "تمهل قليلاً! ضربة الأشعة الكونية تصيب بكسلاً واحداً وتختفي فوراً، بينما جرمنا يمتلك دالة انتشار نقطية (PSF) لـ 9 بكسلات واستمر لشهور!"
                : selectedDiagnosis === 'asteroid'
                ? "ليس تماماً! الكويكبات المتحركة تترك أثر 'ثنائي القطب' (Dipole) في صور الفوارق: بقعة موجبة وبقعة سالبة في الموقع القديم. بينما جرمنا بقي ثابتاً في مكانه!"
                : "راجع الأدلة في مذكرتك واختر التشخيص العلمي الذي يفسر كل المشاهدات."
            }
            language={language}
            onContinue={selectedDiagnosis === 'fu_orionis' ? () => setStage('certificate') : undefined}
            continueLabel="View Official Certificate"
            continueLabelAr="عرض الشهادة الرسمية والملف التوثيقي"
          />
        </div>
      )}

      {/* CERTIFICATE & SCIENTIFIC DOSSIER */}
      {stage === 'certificate' && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0e1629] via-[#09101d] to-[#060a12] border-2 border-cyan-400/40 shadow-2xl relative overflow-hidden">
            {/* Watermark Logo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none w-96 h-96">
              <SpherexLogo size={384} />
            </div>

            <div className="relative space-y-6">
              {/* Certificate Header */}
              <div className="text-center space-y-2 border-b border-cyan-500/20 pb-6">
                <div className="flex justify-center mb-2">
                  <SpherexLogo size={56} />
                </div>
                <span className="text-[11px] font-mono tracking-widest uppercase text-cyan-400">
                  {isArabic ? 'وكالة ناسا • تحدي تطبيقات الفضاء 2026' : 'NASA Space Apps Challenge 2026 • SPHEREx Mission'}
                </span>
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
                  {isArabic ? 'شهادة المحقق الفلكي الكوني' : 'Official Cosmic Detective Certificate'}
                </h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  {isArabic
                    ? 'يُمنح هذا التكريم تقديراً للإنجاز العلمي المتميز في فك شفرات التصوير التفاضلي والتحليل الطيفي متعدد القنوات لمهمة SPHEREx الفضائية.'
                    : 'Awarded for extraordinary forensic diligence in decoding celestial transients, hyperspectral ice envelopes, and temporal difference imaging.'}
                </p>
              </div>

              {/* Cadet Name Input Field */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <span className="text-xs text-slate-400 font-mono">
                  {isArabic ? 'اسم المحقق المعتمد:' : 'Accredited Investigator:'}
                </span>
                <input
                  type="text"
                  value={cadetName}
                  onChange={(e) => onUpdateCadetName(e.target.value)}
                  placeholder="Cadet Detective"
                  className="px-4 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-200 font-bold text-center text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>

              {/* Verified Scientific Dossier Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-cyan-400 font-mono text-[10px] uppercase mb-1">
                    {isArabic ? 'الجرم المشخص:' : 'Classified Object:'}
                  </div>
                  <div className="font-bold text-white text-sm">FU Orionis Outburst</div>
                  <div className="text-slate-400 text-[11px] mt-1">Protostellar accretion surge</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-purple-400 font-mono text-[10px] uppercase mb-1">
                    {isArabic ? 'البصمة الطيفية:' : 'Spectral Markers:'}
                  </div>
                  <div className="font-bold text-white text-sm">3.05 µm & 4.27 µm</div>
                  <div className="text-slate-400 text-[11px] mt-1">H2O & CO2 Ice Mantles</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-amber-400 font-mono text-[10px] uppercase mb-1">
                    {isArabic ? 'الدلالة الإحصائية:' : 'Statistical Significance:'}
                  </div>
                  <div className="font-bold text-white text-sm">+14.8σ Detection</div>
                  <div className="text-slate-400 text-[11px] mt-1">ΔI = +134.2 mJy Surge</div>
                </div>
              </div>

              {/* Cat Endorsement */}
              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-amber-500/40 shrink-0">
                  <SpexPortrait expression="proud" size={64} />
                </div>
                <div className="text-xs text-slate-300">
                  <div className="font-bold text-cyan-300 flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {isArabic ? 'توقيع واعتماد الحارس سبيكس' : 'Certified by SPEX Guardian'}
                  </div>
                  <p className="italic font-serif">
                    "{isArabic
                      ? 'لقد أثبتّ قدرة فائقة على ربط البيانات الفيزيائية الحقيقية. السماء تتغير باستمرار، والآن أنت جاهز لاستكشاف سماء SPHEREx الحقيقية!'
                      : 'You demonstrated true scientific acumen. The sky is never quiet—it breathes, pulses, and changes. You are now officially cleared to explore real SPHEREx flight data!'}"
                  </p>
                </div>
              </div>

              {/* Actions: Copy Dossier, Print, Launch Real Exploration */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyCertificate}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied to Clipboard' : 'Copy Dossier'}</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Certificate</span>
                  </button>
                </div>

                <button
                  onClick={onExitToExplore}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 hover:from-cyan-500 hover:to-blue-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-950/50 flex items-center gap-2 transition group"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                  <span>
                    {isArabic ? 'الانتقال إلى أرشيف ناسا الحقيقي (Explore)' : 'Launch Real NASA Archive Explorer'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
