import React, { useState, useRef, useEffect } from 'react';
import {
  Eye,
  Sliders,
  CheckCircle2,
  Compass,
  Radio,
  Sparkles,
  Telescope,
  ChevronRight,
  Info,
  Layers,
  ThermometerSnowflake,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { DialogueBox, DialogueChoice } from '../dialogue/DialogueBox';
import { SpexExpression } from '../../spex/SpexPortrait';
import { ClueItem } from '../evidence/EvidenceNotebook';
import { gameAudio } from '../utils/gameAudio';
import { Language } from '../../utils/translations';

interface Chapter1SceneProps {
  language: Language;
  onUnlockClue: (clue: ClueItem) => void;
  onCompleteChapter: () => void;
  hasClue1: boolean;
}

export const Chapter1Scene: React.FC<Chapter1SceneProps> = ({
  language,
  onUnlockClue,
  onCompleteChapter,
  hasClue1,
}) => {
  const isArabic = language === 'ar';

  // Sub-stages: 'briefing' | 'station_hub' | 'puzzle_invisible_universe' | 'chapter_summary'
  const [subStage, setSubStage] = useState<'briefing' | 'station_hub' | 'puzzle_invisible_universe' | 'chapter_summary'>('briefing');
  const [dialogueIndex, setDialogueIndex] = useState<number>(0);
  const [spexExpression, setSpexExpression] = useState<SpexExpression>('greeting');

  // Interactive station states
  const [activeStationModal, setActiveStationModal] = useState<'cryo' | 'coordinates' | null>(null);

  // Wavelength Slider Puzzle state (0 = 0.5 µm Visible, 50 = 1.6 µm NIR, 100 = 3.6 µm MIR)
  const [wavelengthSlider, setWavelengthSlider] = useState<number>(10);
  const [inspectedStar, setInspectedStar] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Briefing dialogue sequence
  const briefingLines = [
    {
      expression: 'greeting' as SpexExpression,
      en: "Greetings, Detective! I am SPEX, your Mech Cat Guardian. Welcome aboard the orbital data processing center. We have a cosmic mystery on our paws!",
      ar: "تحياتي أيها المحقق! أنا 'سبيكس' (SPEX)، حارسك الميكانيكي. مرحباً بك في مركز معالجة البيانات المدارية. لدينا لغز كوني بانتظارنا!",
    },
    {
      expression: 'serious' as SpexExpression,
      en: "Deep in the North Ecliptic Pole, optical telescopes pointed at coordinates RA 275.85°, Dec +65.12° and saw nothing but pitch-black emptiness. They thought it was dead space.",
      ar: "في أعماق القطب الشمالي لمسار الشمس، وجهت التلسكوبات الضوئية مراياها نحو الإحداثيات (المطلع المستقيم 275.85°، والميل +65.12°) ولم ترَ سوى سواد حالك وفراغ مظلم ظنوا أنه فضاء ميت.",
    },
    {
      expression: 'eureka' as SpexExpression,
      en: "Except, SPHEREx picked up a bizarre thermal whisper! Interstellar dust clouds block optical photons, but infrared light glides right through cosmic dust grains. Let's inspect the observation terminal and expose what's hiding!",
      ar: "لكن تلسكوب SPHEREx التقط همسة حرارية غريبة! سحب الغبار بين النجوم تحجب الضوء المرئي، لكن الأشعة تحت الحمراء تعبر دون عائق. دعنا نفحص محطة الرصد ونكشف ما يخفيه الغبار!",
    },
  ];

  // Draw the Invisible Universe canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background: deep space gradient
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, width);
    bgGrad.addColorStop(0, '#060a17');
    bgGrad.addColorStop(1, '#020409');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Background stars (constant)
    const seedStars = [
      { x: 0.15, y: 0.25, r: 1.5, b: 0.8 },
      { x: 0.85, y: 0.2, r: 2.0, b: 0.9 },
      { x: 0.2, y: 0.78, r: 1.2, b: 0.6 },
      { x: 0.75, y: 0.75, r: 1.8, b: 0.7 },
      { x: 0.35, y: 0.15, r: 1.4, b: 0.5 },
      { x: 0.65, y: 0.3, r: 1.6, b: 0.8 },
      { x: 0.1, y: 0.5, r: 1.1, b: 0.4 },
      { x: 0.88, y: 0.6, r: 1.3, b: 0.7 },
    ];
    seedStars.forEach((star) => {
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 240, 255, ${star.b})`;
      ctx.fill();
    });

    const irProgress = wavelengthSlider / 100; // 0 = visible, 1 = mid-IR

    // Central hidden mystery object (emerges with IR!)
    const cx = width / 2;
    const cy = height / 2;

    if (irProgress > 0.15) {
      const starAlpha = Math.min(1, (irProgress - 0.15) / 0.65);
      const starRadius = 8 + irProgress * 14;

      // Outer accretion glow
      const glowGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 60 * irProgress);
      glowGrad.addColorStop(0, `rgba(255, 200, 100, ${starAlpha * 0.9})`);
      glowGrad.addColorStop(0.4, `rgba(255, 120, 40, ${starAlpha * 0.6})`);
      glowGrad.addColorStop(0.8, `rgba(180, 40, 120, ${starAlpha * 0.3})`);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 60 * irProgress, 0, Math.PI * 2);
      ctx.fill();

      // Sharp stellar core
      ctx.beginPath();
      ctx.arc(cx, cy, starRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 250, 220, ${starAlpha})`;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 15 * irProgress;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Diffraction spikes
      ctx.strokeStyle = `rgba(255, 220, 150, ${starAlpha * 0.8})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 35 * irProgress, cy);
      ctx.lineTo(cx + 35 * irProgress, cy);
      ctx.moveTo(cx, cy - 35 * irProgress);
      ctx.lineTo(cx, cy + 35 * irProgress);
      ctx.stroke();
    }

    // Dense molecular dust cloud (dense at visible, disappears in IR due to Rayleigh scattering drop!)
    const dustOpacity = Math.max(0.04, 0.92 - irProgress * 0.85);

    // Render irregular dust clumps
    const dustClumps = [
      { x: cx - 20, y: cy - 10, r: 85 },
      { x: cx + 30, y: cy + 15, r: 70 },
      { x: cx - 10, y: cy + 35, r: 60 },
      { x: cx + 15, y: cy - 30, r: 75 },
    ];

    dustClumps.forEach((clump) => {
      const dustGrad = ctx.createRadialGradient(clump.x, clump.y, clump.r * 0.2, clump.x, clump.y, clump.r);
      dustGrad.addColorStop(0, `rgba(8, 12, 24, ${dustOpacity * 0.95})`);
      dustGrad.addColorStop(0.6, `rgba(14, 20, 36, ${dustOpacity * 0.8})`);
      dustGrad.addColorStop(1, 'rgba(10, 15, 30, 0)');
      ctx.fillStyle = dustGrad;
      ctx.beginPath();
      ctx.arc(clump.x, clump.y, clump.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Reticle crosshair if revealed
    if (irProgress > 0.6) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = '#22d3ee';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TARGET: UNKNOWN TRANSIENT', cx, cy - 34);
    }
  }, [wavelengthSlider]);

  const handleInspectTarget = () => {
    if (wavelengthSlider >= 60 && !hasClue1) {
      setInspectedStar(true);
      gameAudio.playClueUnlocked();
      const clue1: ClueItem = {
        id: 'clue_1_obscured_beacon',
        chapter: 1,
        title: 'The Obscured Protostellar Beacon',
        titleAr: 'المنارة النجمية المحجوبة بالغبار',
        timestamp: 'T+00:14:22',
        category: 'wavelength',
        observation: 'Object completely absent at optical 0.55 µm due to dust extinction (A_V > 18 mag). Pierces through clearly at 3.6 µm infrared.',
        observationAr: 'الجرم غائب تماماً عند الطول الموجي المرئي 0.55 ميكرومتر بسبب امتصاص الغبار، ويظهر بوضوح ساطع عند 3.6 ميكرومتر بالأشعة تحت الحمراء.',
        scientificDeduction: 'Dense interstellar dust clouds scatter short optical waves via Rayleigh scattering (proportional to λ⁻⁴). Infrared photons have longer wavelengths that penetrate cosmic dust grains without scattering.',
        scientificDeductionAr: 'سحب الغبار بين النجوم تشتت الموجات الضوئية القصيرة بتشتت رايلي (يتناسب مع λ⁻⁴). أما الأشعة تحت الحمراء فلها أطوال موجية أطول تنفذ عبر حبيبات الغبار دون امتصاص.',
        unlocked: true,
        confidence: 96,
      };
      onUnlockClue(clue1);
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* CHAPTER HEADER */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#09101d] border border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
            1
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
              {isArabic ? 'الفصل الأول • الرصد الأولي' : 'Chapter 1 • Primary Detection'}
            </span>
            <h2 className="text-lg font-bold text-white">
              {isArabic ? 'الإشارة المفقودة خلف سحب الغبار' : 'The Lost Signal in the Dust'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasClue1 ? (
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isArabic ? 'الدليل الأول مؤكد' : 'Clue 1 Secured'}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-1.5 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              {isArabic ? 'بانتظار فك الشفرة' : 'Investigation Pending'}
            </span>
          )}
        </div>
      </div>

      {/* BRIEFING STAGE */}
      {subStage === 'briefing' && (
        <div className="space-y-4">
          <DialogueBox
            speakerName="SPEX"
            speakerNameAr="سبيكس"
            expression={briefingLines[dialogueIndex].expression}
            text={briefingLines[dialogueIndex].en}
            textAr={briefingLines[dialogueIndex].ar}
            language={language}
            onContinue={() => {
              if (dialogueIndex < briefingLines.length - 1) {
                setDialogueIndex(dialogueIndex + 1);
              } else {
                setSubStage('station_hub');
              }
            }}
            continueLabel={dialogueIndex === briefingLines.length - 1 ? 'Enter Observation Deck' : 'Next'}
            continueLabelAr={dialogueIndex === briefingLines.length - 1 ? 'دخول محطة الرصد' : 'التالي'}
          />
        </div>
      )}

      {/* STATION HUB */}
      {subStage === 'station_hub' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#09101d] border border-cyan-500/20 text-slate-300">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Telescope className="w-5 h-5 text-cyan-400" />
              {isArabic ? 'محطات الرصد والتحليل المداري' : 'Orbital Operations & Instruments'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              {isArabic
                ? 'تفقد أجهزة رصد SPHEREx وادخل إلى مرسام الأطوال الموجية لكشف الجرم المخفي.'
                : 'Inspect telemetry systems or open the multispectral imager to penetrate the cosmic dust cloud.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Station 1: Coordinates */}
              <button
                onClick={() => setActiveStationModal('coordinates')}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 text-left transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Compass className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  {isArabic ? 'إحداثيات القطب الشمالي (NEP)' : 'North Ecliptic Pole Pointing'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isArabic ? 'RA 275.85°, Dec +65.12°' : 'High cadence redundancy zone.'}
                </p>
              </button>

              {/* Station 2: Cryo cooling */}
              <button
                onClick={() => setActiveStationModal('cryo')}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 text-left transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <ThermometerSnowflake className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  {isArabic ? 'نظام التبريد الفائق (80K)' : 'Passive Cryogenic Cooling'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isArabic ? 'درجة حرارة 80 كلفن لحجب الضوضاء' : 'Eliminates instrument thermal noise.'}
                </p>
              </button>

              {/* Station 3: Deep Imager Puzzle */}
              <button
                onClick={() => setSubStage('puzzle_invisible_universe')}
                className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/60 to-blue-950/40 border border-cyan-500/40 hover:border-cyan-400 text-left transition group relative overflow-hidden shadow-lg shadow-cyan-950/30"
              >
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                  {isArabic ? 'تحدي استكشافي' : 'Active Puzzle'}
                </div>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Eye className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  {isArabic ? 'الكون الخفي: كاشف الأشعة' : 'The Invisible Universe Imager'}
                </h4>
                <p className="text-[11px] text-cyan-200/80">
                  {isArabic ? 'حرّك الطول الموجي لاختراق الغبار' : 'Tune from optical to infrared light.'}
                </p>
              </button>
            </div>
          </div>

          <DialogueBox
            speakerName="SPEX"
            speakerNameAr="سبيكس"
            expression={hasClue1 ? 'proud' : 'explaining'}
            text={
              hasClue1
                ? "Brilliant discovery! That protostar was completely invisible to optical telescopes. Now let's move into Chapter 2 and analyze its 102 color spectral fingerprint!"
                : "Open 'The Invisible Universe Imager' above! Slide the wavelength from visible light to mid-infrared and observe what happens to the dense dark cloud."
            }
            textAr={
              hasClue1
                ? "اكتشاف مذهل! كان هذا النجم الوليد غير مرئي تماماً للتلسكوبات الضوئية العادية. دعنا ننتقل الآن إلى الفصل الثاني لنحلل بصمته الطيفية عبر 102 نافذة لونية!"
                : "افتح 'كاشف الكون الخفي' أعلاه! حرّك الطول الموجي من الضوء المرئي نحو الأشعة تحت الحمراء وشاهد كيف تذوب سحابة الغبار المظلمة!"
            }
            language={language}
            onContinue={hasClue1 ? onCompleteChapter : () => setSubStage('puzzle_invisible_universe')}
            continueLabel={hasClue1 ? 'Proceed to Chapter 2' : 'Launch Wavelength Imager'}
            continueLabelAr={hasClue1 ? 'الانتقال للفصل الثاني' : 'تشغيل مرسام الأطوال الموجية'}
          />
        </div>
      )}

      {/* PUZZLE: THE INVISIBLE UNIVERSE */}
      {subStage === 'puzzle_invisible_universe' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#09101d] border border-cyan-500/30 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                  {isArabic ? 'المختبر الرصدي التفاعلي' : 'Interactive Spectroscopy Lab'}
                </span>
                <h3 className="text-lg font-bold text-white">
                  {isArabic ? 'لغز الكون الخفي: اختراق سحب الغبار' : 'The Invisible Universe: Piercing Cosmic Dust'}
                </h3>
              </div>
              <button
                onClick={() => setSubStage('station_hub')}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                {isArabic ? 'العودة للمحطة' : 'Back to Stations'}
              </button>
            </div>

            {/* Canvas Viewport */}
            <div className="relative my-5 rounded-xl overflow-hidden border border-slate-800 bg-black flex justify-center items-center shadow-inner">
              <canvas
                ref={canvasRef}
                width={560}
                height={320}
                className="w-full max-w-[560px] h-auto aspect-[7/4] block cursor-crosshair"
                onClick={handleInspectTarget}
              />

              {/* Target prompt button */}
              {wavelengthSlider >= 60 && !hasClue1 && (
                <button
                  onClick={handleInspectTarget}
                  className="absolute bottom-4 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg animate-bounce flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  {isArabic ? 'انقر على النجم المتوهج لتوثيق الدليل!' : 'Click the glowing star to collect evidence!'}
                </button>
              )}
            </div>

            {/* Wavelength Slider Controls */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400">
                  {isArabic ? 'الطول الموجي للرصد:' : 'Observation Wavelength:'}
                </span>
                <span className="text-amber-300 font-bold">
                  {(0.5 + (wavelengthSlider / 100) * 3.5).toFixed(2)} µm ({wavelengthSlider < 25 ? 'Visible Light' : wavelengthSlider < 65 ? 'Near-Infrared (NIR)' : 'Mid-Infrared (MIR)'})
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={wavelengthSlider}
                onChange={(e) => {
                  setWavelengthSlider(Number(e.target.value));
                  gameAudio.playClick();
                }}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />

              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>0.50 µm (Optical)</span>
                <span>1.60 µm (H-band)</span>
                <span>4.00 µm (SPHEREx IR)</span>
              </div>

              {/* Scientific principle explanation */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  {wavelengthSlider < 30 ? (
                    isArabic
                      ? 'الضوء المرئي (0.55 ميكرومتر): حبيبات الغبار بحجم ميكرومتر تعترض فوتونات الضوء المرئي وتشتتها (تشتت رايلي). النجم غير مرئي تماماً!'
                      : 'Optical (0.55 µm): Dust grains intercept and scatter short optical wavelengths. The star is completely obscured by darkness.'
                  ) : wavelengthSlider < 65 ? (
                    isArabic
                      ? 'الأشعة تحت الحمراء القريبة (1.6 ميكرومتر): يبدأ الغبار بأن يصبح شبه شفاف، وتظهر هالة خافتة للغاية للمصدر المحجوب.'
                      : 'Near-Infrared (1.6 µm): Optical depth drops significantly. A faint glow begins to pierce through the cloud edges.'
                  ) : (
                    isArabic
                      ? 'الأشعة تحت الحمراء المتوسطة (3.6 ميكرومتر): تنفذ الفوتونات الطويلة بحرية تامة دون أي تشتت! النجم الوليد يتلألأ بوضوح مذهل!'
                      : 'Mid-Infrared (3.6 µm): Rayleigh scattering vanishes (scattering ∝ λ⁻⁴). The obscured protostar radiates brightly!'
                  )}
                </p>
              </div>
            </div>
          </div>

          <DialogueBox
            speakerName="SPEX"
            speakerNameAr="سبيكس"
            expression={hasClue1 ? 'eureka' : wavelengthSlider >= 60 ? 'surprised' : 'thinking'}
            text={
              hasClue1
                ? "Outstanding! You've documented Clue #1 in our Cosmic Evidence Notebook. The hidden source is an active young protostar shrouded in interstellar dust!"
                : wavelengthSlider >= 60
                ? "LOOK! The dark cloud is transparent now! Click on the central glowing star to log this forensic evidence into our notebook!"
                : "Slide that wavelength control to the right! Watch how infrared light unlocks what our eyes could never see."
            }
            textAr={
              hasClue1
                ? "رائع ومبهر! لقد وثقت الدليل الأول في سجل الأدلة الكونية. الجرم المخفي هو نجم وليد نشط محاط بغبار كوني كثيف!"
                : wavelengthSlider >= 60
                ? "انظر! سحابة الغبار أصبحت شفافة تماماً! انقر على النجم المتوهج في المنتصف لتوثيق هذا الدليل في مذكرتنا!"
                : "حرّك شريط الطول الموجي نحو اليمين! راقب كيف تكشف الأشعة تحت الحمراء ما تعجز العيون البشرية عن رؤيته."
            }
            language={language}
            onContinue={hasClue1 ? () => setSubStage('station_hub') : undefined}
            continueLabel={hasClue1 ? 'Return to Operations' : undefined}
            continueLabelAr={hasClue1 ? 'العودة للعمليات' : undefined}
          />
        </div>
      )}

      {/* POPUP MODAL: Coordinates */}
      {activeStationModal === 'coordinates' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setActiveStationModal(null)}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl bg-[#0c1322] border border-cyan-500/40 text-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                {isArabic ? 'القطب الشمالي لمسار الشمس (NEP)' : 'North Ecliptic Pole Footprint'}
              </h4>
              <button
                onClick={() => setActiveStationModal(null)}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isArabic
                ? 'تدور مركبة SPHEREx في مدار قطبي متزامن مع الشمس، مما يعني أنها تمر فوق القطب الشمالي لمسار الشمس مئات المرات كل عام. هذا التكرار العالي يجعل القطب الميدان المثالي لاكتشاف التغيرات النجمية الدقيقة.'
                : 'SPHEREx operates in a Sun-synchronous low-Earth orbit. Its scans converge at the Ecliptic Poles, accumulating hundreds of visits per year. This high temporal redundancy makes the NEP ideal for catching transient phenomena.'}
            </p>
            <div className="p-3 rounded-xl bg-slate-900 font-mono text-xs space-y-1 text-cyan-300">
              <div>RA: 275.8500° (~18h 23m 24s)</div>
              <div>Dec: +65.1200° (+65° 07\' 12")</div>
              <div>Footprint: QR2 Verified Archive Coverage</div>
            </div>
            <button
              onClick={() => setActiveStationModal(null)}
              className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs"
            >
              {isArabic ? 'إغلاق' : 'Close Coordinates'}
            </button>
          </div>
        </div>
      )}

      {/* POPUP MODAL: Cryo */}
      {activeStationModal === 'cryo' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setActiveStationModal(null)}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl bg-[#0c1322] border border-blue-500/40 text-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white flex items-center gap-2">
                <ThermometerSnowflake className="w-5 h-5 text-blue-400" />
                {isArabic ? 'التبريد السلبي الفائق' : 'SPHEREx Passive Cryogenics'}
              </h4>
              <button
                onClick={() => setActiveStationModal(null)}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isArabic
                ? 'لكي تلتقط المستشعرات أضعف إشارات الأشعة تحت الحمراء دون أن تعميها حرارة التلسكوب نفسه، تحمي دروع إشعاعية متحدة المركز المرآة، لتبرد سلبياً في برودة الفضاء إلى 80 كلفن (-193 درجة مئوية).'
                : 'To detect faint cosmic infrared photons without blinding the focal plane arrays with thermal glow from the satellite itself, SPHEREx uses multi-stage conical thermal radiation shields cooling the optics passively to 80 Kelvin (-193°C).'}
            </p>
            <div className="p-3 rounded-xl bg-slate-900 font-mono text-xs space-y-1 text-blue-300">
              <div>Telescope Temp: 80.2 K (-193.0 °C)</div>
              <div>Thermal Dark Current: &lt; 0.05 e⁻/s</div>
              <div>Optical Throughput: &gt; 85%</div>
            </div>
            <button
              onClick={() => setActiveStationModal(null)}
              className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs"
            >
              {isArabic ? 'إغلاق' : 'Close Telemetry'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
