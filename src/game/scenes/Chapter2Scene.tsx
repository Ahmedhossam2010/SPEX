import React, { useState, useRef, useEffect } from 'react';
import {
  Waves,
  Sparkles,
  CheckCircle2,
  Compass,
  Layers,
  ArrowRight,
  Info,
  RotateCw,
  Search,
  Filter,
  Check,
} from 'lucide-react';
import { DialogueBox } from '../dialogue/DialogueBox';
import { SpexExpression } from '../../spex/SpexPortrait';
import { ClueItem } from '../evidence/EvidenceNotebook';
import { gameAudio } from '../utils/gameAudio';
import { Language } from '../../utils/translations';

interface Chapter2SceneProps {
  language: Language;
  onUnlockClue: (clue: ClueItem) => void;
  onCompleteChapter: () => void;
  hasClue2: boolean;
}

export const Chapter2Scene: React.FC<Chapter2SceneProps> = ({
  language,
  onUnlockClue,
  onCompleteChapter,
  hasClue2,
}) => {
  const isArabic = language === 'ar';

  // Sub-stages: 'briefing' | 'spectral_lab' | 'sky_cadence' | 'chapter_summary'
  const [subStage, setSubStage] = useState<'briefing' | 'spectral_lab' | 'sky_cadence'>('briefing');
  const [dialogueIndex, setDialogueIndex] = useState<number>(0);

  // Active band selected (1 to 6)
  const [selectedBand, setSelectedBand] = useState<number>(4);
  const [identifiedH2O, setIdentifiedH2O] = useState<boolean>(false);
  const [identifiedCO2, setIdentifiedCO2] = useState<boolean>(false);
  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cadence animation
  const [cadetSkyCoverage, setCadetSkyCoverage] = useState<number>(1); // 1 = 6 months, 2 = 12 months, 3 = 18 months

  const bands = [
    { id: 1, range: '0.75 - 1.11 µm', res: 'R ≈ 41', desc: 'NIR Band 1 (Atomic transitions)' },
    { id: 2, range: '1.11 - 1.64 µm', res: 'R ≈ 41', desc: 'NIR Band 2 (Stellar continuum)' },
    { id: 3, range: '1.64 - 2.42 µm', res: 'R ≈ 41', desc: 'NIR Band 3 (CO bandhead onset)' },
    { id: 4, range: '2.42 - 3.82 µm', res: 'R ≈ 35', desc: 'MIR Band 4 (H2O ice absorption at 3.05 µm)' },
    { id: 5, range: '3.82 - 4.42 µm', res: 'R ≈ 110', desc: 'High-Res Band 5 (CO2 ice dip at 4.27 µm)' },
    { id: 6, range: '4.42 - 5.00 µm', res: 'R ≈ 130', desc: 'High-Res Band 6 (CO ice feature at 4.67 µm)' },
  ];

  const briefingLines = [
    {
      expression: 'explaining' as SpexExpression,
      en: "Regular space telescopes take pictures in 3 broad filters: Red, Green, Blue. But SPHEREx is a hyperspectral revolution! It sees the sky in 102 continuous infrared colors!",
      ar: "التلسكوبات الفضائية العادية تلتقط صوراً بثلاثة مرشحات عريضة فقط: أحمر وأخضر وأزرق. لكن تلسكوب SPHEREx يمثل ثورة مطيافية! فهو يرى السماء عبر 102 لوناً متصلاً من الأشعة تحت الحمراء!",
    },
    {
      expression: 'curious' as SpexExpression,
      en: "Its Linear Variable Filters (LVF) split incoming photons across 6 H2RG detector arrays. By analyzing the absorption dips in each wavelength, we can read the exact chemical ingredients of cosmic bodies!",
      ar: "مرشحاته الخطية المتغيرة (LVF) توزع الفوتونات عبر 6 مصفوفات كاشفة متطورة (H2RG). ومن خلال قياس انخفاضات الامتصاص عند كل طول موجي، نقرأ المكونات الكيميائية الدقيقة للأجرام!",
    },
    {
      expression: 'thinking' as SpexExpression,
      en: "Let's examine the spectrum of our mystery signal in the Spectral Lab. Look for deep absorption dips from water ice and carbon dioxide ice mantles around the protostar!",
      ar: "دعنا نفحص طيف إشارتنا الغامضة في مختبر الأطياف. ابحث عن انخفاضات الامتصاص العميقة الناتجة عن أغطية جليد الماء وثاني أكسيد الكربون حول النجم الوليد!",
    },
  ];

  // Draw interactive spectrum curve
  useEffect(() => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Dark grid background
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 40; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 20; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, height - 25);
    ctx.lineTo(width - 15, height - 25);
    ctx.moveTo(40, height - 25);
    ctx.lineTo(40, 15);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('Flux (mJy)', 10, 20);
    ctx.fillText('Wavelength λ (µm)', width - 110, height - 8);

    // Ticks on X-axis (0.75 to 5.0 µm)
    const tickWavelengths = [1.0, 2.0, 3.0, 4.0, 5.0];
    tickWavelengths.forEach((wl) => {
      const x = 40 + ((wl - 0.75) / (5.0 - 0.75)) * (width - 60);
      ctx.strokeStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(x, height - 25);
      ctx.lineTo(x, height - 20);
      ctx.stroke();
      ctx.fillText(`${wl.toFixed(1)}`, x - 8, height - 10);
    });

    // Highlight selected Band region
    const bandRanges = [
      { start: 0.75, end: 1.11, color: 'rgba(56, 189, 248, 0.15)' },
      { start: 1.11, end: 1.64, color: 'rgba(59, 130, 246, 0.15)' },
      { start: 1.64, end: 2.42, color: 'rgba(99, 102, 241, 0.15)' },
      { start: 2.42, end: 3.82, color: 'rgba(168, 85, 247, 0.18)' },
      { start: 3.82, end: 4.42, color: 'rgba(236, 72, 153, 0.18)' },
      { start: 4.42, end: 5.00, color: 'rgba(244, 63, 94, 0.18)' },
    ];
    const curBand = bandRanges[selectedBand - 1];
    if (curBand) {
      const x1 = 40 + ((curBand.start - 0.75) / (5.0 - 0.75)) * (width - 60);
      const x2 = 40 + ((curBand.end - 0.75) / (5.0 - 0.75)) * (width - 60);
      ctx.fillStyle = curBand.color;
      ctx.fillRect(x1, 15, x2 - x1, height - 40);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(x1, 15, x2 - x1, height - 40);
    }

    // Spectrum function: Baseline thermal blackbody continuum + absorption dips
    const getFluxAtWl = (wl: number) => {
      // Modified modified Planckian shape peaking around 2.5 µm
      let base = 45 * Math.pow(wl, -1.8) * Math.exp(-0.8 / wl);

      // Deep H2O ice absorption at 3.05 µm (width ~0.35 µm)
      const h2oDip = 14 * Math.exp(-Math.pow((wl - 3.05) / 0.22, 2));

      // Sharp CO2 ice absorption at 4.27 µm (width ~0.12 µm)
      const co2Dip = 11 * Math.exp(-Math.pow((wl - 4.27) / 0.08, 2));

      // CO ice absorption at 4.67 µm
      const coDip = 6 * Math.exp(-Math.pow((wl - 4.67) / 0.09, 2));

      return Math.max(2, base - h2oDip - co2Dip - coDip);
    };

    // Draw continuous spectrum line
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;

    for (let px = 40; px < width - 15; px += 2) {
      const wl = 0.75 + ((px - 40) / (width - 60)) * (5.0 - 0.75);
      const flux = getFluxAtWl(wl);
      // Map flux (0 to 30) to Y
      const py = height - 30 - (flux / 26) * (height - 60);
      if (px === 40) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // Callout labels on dips if bands inspected
    const drawAbsorptionMarker = (wl: number, label: string, color: string) => {
      const px = 40 + ((wl - 0.75) / (5.0 - 0.75)) * (width - 60);
      const flux = getFluxAtWl(wl);
      const py = height - 30 - (flux / 26) * (height - 60);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py - 6);
      ctx.lineTo(px, py - 26);
      ctx.stroke();

      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(label, px - 20, py - 30);
    };

    if (identifiedH2O || selectedBand === 4) {
      drawAbsorptionMarker(3.05, 'H2O Ice (3.05 µm)', '#38bdf8');
    }
    if (identifiedCO2 || selectedBand === 5) {
      drawAbsorptionMarker(4.27, 'CO2 Ice (4.27 µm)', '#f43f5e');
    }
  }, [selectedBand, identifiedH2O, identifiedCO2]);

  const handleInspectBand = (bandNum: number) => {
    setSelectedBand(bandNum);
    gameAudio.playClick();

    if (bandNum === 4 && !identifiedH2O) {
      setIdentifiedH2O(true);
    }
    if (bandNum === 5 && !identifiedCO2) {
      setIdentifiedCO2(true);
    }

    // If both major features identified, unlock clue 2!
    if ((bandNum === 4 || identifiedH2O) && (bandNum === 5 || identifiedCO2) && !hasClue2) {
      gameAudio.playClueUnlocked();
      const clue2: ClueItem = {
        id: 'clue_2_ice_mantles',
        chapter: 2,
        title: 'Interstellar Ice Mantle Fingerprint',
        titleAr: 'بصمة أغلفة الجليد الكوني (H2O و CO2)',
        timestamp: 'T+00:38:10',
        category: 'spectroscopy',
        observation: 'Deep absorption dip at 3.05 µm (H2O water ice) and sharp resonant dip at 4.27 µm (CO2 ice) identified across Bands 4 & 5.',
        observationAr: 'انخفاض امتصاص عميق عند 3.05 ميكرومتر (جليد الماء H2O) وانخفاض رنيني حاد عند 4.27 ميكرومتر (جليد ثاني أكسيد الكربون CO2) في النطاقين 4 و 5.',
        scientificDeduction: 'These cryogenic molecular ice absorption troughs prove the emitting source is embedded inside a cold protoplanetary disk or dense protostellar envelope where volatile species freeze into grains.',
        scientificDeductionAr: 'هذه المنخفضات الطيفية لجليد المركبات المتطايرة تثبت علمياً أن الجرم متمركز داخل قرص كوكبي أولي بارد أو غلاف نجمي وليد تتجمد فيه الغازات على حبيبات الغبار.',
        unlocked: true,
        confidence: 98,
      };
      onUnlockClue(clue2);
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* CHAPTER HEADER */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#09101d] border border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
            2
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400">
              {isArabic ? 'الفصل الثاني • التحليل الطيفي' : 'Chapter 2 • Hyperspectral Decoding'}
            </span>
            <h2 className="text-lg font-bold text-white">
              {isArabic ? '102 نافذة لونية: بصمة الجليد الكوني' : 'The 102 Windows: Interstellar Ice Signatures'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasClue2 ? (
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isArabic ? 'الدليل الثاني مؤكد' : 'Clue 2 Secured'}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono flex items-center gap-1.5 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              {isArabic ? 'بانتظار التحليل الطيفي' : 'Spectrum Analysis Active'}
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
                setSubStage('spectral_lab');
              }
            }}
            continueLabel={dialogueIndex === briefingLines.length - 1 ? 'Enter Spectral Lab' : 'Next'}
            continueLabelAr={dialogueIndex === briefingLines.length - 1 ? 'دخول مختبر الأطياف' : 'التالي'}
          />
        </div>
      )}

      {/* SPECTRAL LAB STAGE */}
      {subStage === 'spectral_lab' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#09101d] border border-purple-500/30 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest">
                  {isArabic ? 'مصفوفة الكواشف الستة' : '6 H2RG Linear Variable Filter Arrays'}
                </span>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Waves className="w-5 h-5 text-purple-400" />
                  {isArabic ? 'فك تشفير الطيف: ابحث عن منخفضات الامتصاص' : 'Reconstruct the Spectrum: Find Key Molecules'}
                </h3>
              </div>
              <button
                onClick={() => setSubStage('sky_cadence')}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1.5"
              >
                <span>{isArabic ? 'خريطة مسح السماء (6 أشهر)' : 'Sky Cadence Map'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Spectrum Graph Viewport */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 shadow-inner">
              <canvas
                ref={spectrumCanvasRef}
                width={620}
                height={260}
                className="w-full h-auto aspect-[31/13] block"
              />
            </div>

            {/* 6 Band Selection Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>{isArabic ? 'اختر النطاق الطيفي للفحص:' : 'Select Detector Array to Inspect:'}</span>
                <span className="text-cyan-300">
                  {isArabic ? `النطاق النشط: ${selectedBand}` : `Active Array: Band ${selectedBand}`}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {bands.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleInspectBand(b.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedBand === b.id
                        ? 'bg-purple-950/80 border-purple-400 text-white shadow-lg shadow-purple-950/40 ring-1 ring-purple-400'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">Band {b.id}</span>
                      {((b.id === 4 && identifiedH2O) || (b.id === 5 && identifiedCO2)) && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">{b.range}</div>
                    <div className="text-[10px] text-purple-300/80 mt-1">{b.res}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scientific feedback on active band */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
              <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-0.5">
                  {isArabic ? `تحليل النطاق ${selectedBand}:` : `Analysis for Array ${selectedBand}:`}
                </span>
                <p>
                  {selectedBand === 4 ? (
                    isArabic
                      ? 'التقاط بصمة جليد الماء (H2O) عند 3.05 ميكرومتر! هذا الانخفاض العميق يعني وجود حبيبات جليدية باردة تحيط بالجرم!'
                      : 'H2O Water Ice absorption captured at 3.05 µm! This deep cryogenic trough indicates a cold, ice-rich circumstellar envelope.'
                  ) : selectedBand === 5 ? (
                    isArabic
                      ? 'التقاط رنين جليد ثاني أكسيد الكربون (CO2) عند 4.27 ميكرومتر بدقة مطيافية عالية (R ≈ 110)!'
                      : 'CO2 Carbon Dioxide Ice resonant dip confirmed at 4.27 µm with high resolving power (R ≈ 110)!'
                  ) : selectedBand === 6 ? (
                    isArabic
                      ? 'النطاق 6 (4.42 - 5.00 ميكرومتر): يوضح استمرار الامتصاص عند 4.67 ميكرومتر لأول أكسيد الكربون (CO).'
                      : 'Array 6 (4.42 - 5.00 µm): Displays baseline recovery and 4.67 µm CO ice absorption.'
                  ) : (
                    isArabic
                      ? `النطاق ${selectedBand} (${bands[selectedBand - 1].range}): يوضح انبعاث استمراري ضوئي بدون انخفاضات جليدية مميزة. افحص النطاقين 4 و 5!`
                      : `Array ${selectedBand} (${bands[selectedBand - 1].range}): Displays continuum emission without characteristic ice troughs. Inspect Bands 4 and 5!`
                  )}
                </p>
              </div>
            </div>
          </div>

          <DialogueBox
            speakerName="SPEX"
            speakerNameAr="سبيكس"
            expression={hasClue2 ? 'eureka' : identifiedH2O || identifiedCO2 ? 'curious' : 'explaining'}
            text={
              hasClue2
                ? "Fascinating! We've proved the beacon is encased in cold interstellar ice mantles (H2O and CO2). Now let's explore the 6-month orbital cadence and see what happened when SPHEREx looked again!"
                : identifiedH2O || identifiedCO2
                ? "You found one of the key molecular absorption dips! Now check the other high-resolution array (Band 4 or 5) to complete the chemical profile!"
                : "Click on Band 4 (2.42 - 3.82 µm) and Band 5 (3.82 - 4.42 µm). Watch the spectrum curve plunge where ice absorbs the infrared light!"
            }
            textAr={
              hasClue2
                ? "مذهل للغاية! أثبتنا أن المنارة محاطة بأغلفة جليد كوني باردة (ماء وثاني أكسيد كربون). دعنا نتفقد دورة المسح كل 6 أشهر لنرى ماذا حدث عندما عاد SPHEREx للرصد مرة أخرى!"
                : identifiedH2O || identifiedCO2
                ? "لقد عثرت على أحد انخفاضات الامتصاص الجزيئي الرئيسية! افحص الآن النطاق عالي الدقة الآخر (النطاق 4 أو 5) لاكتمال البصمة!"
                : "انقر على النطاق 4 (2.42 - 3.82 ميكرومتر) والنطاق 5 (3.82 - 4.42 ميكرومتر). راقب كيف يهبط منحنى الطيف حيث يمتص الجليد الفوتونات!"
            }
            language={language}
            onContinue={hasClue2 ? () => setSubStage('sky_cadence') : undefined}
            continueLabel={hasClue2 ? 'Proceed to Sky Cadence' : undefined}
            continueLabelAr={hasClue2 ? 'الانتقال إلى وتيرة المسح' : undefined}
          />
        </div>
      )}

      {/* SKY CADENCE STAGE */}
      {subStage === 'sky_cadence' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#09101d] border border-cyan-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                {isArabic ? 'وتيرة مسح السماء كل 6 أشهر' : '6-Month All-Sky Orbital Cadence'}
              </h3>
              <button
                onClick={() => setSubStage('spectral_lab')}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                {isArabic ? 'العودة لمختبر الأطياف' : 'Back to Spectral Lab'}
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isArabic
                ? 'يكمل تلسكوب SPHEREx مسحاً كاملاً لقبة السماء بزاوية 360 درجة كل 6 أشهر. على مدار مهمته، يزور كل رقعة في السماء 4 مرات على الأقل، ويزور القطبين (NEP و SEP) مئات المرات! هذا التحرك المستمر يمنحنا "فيلماً كونياً" يرصد التغير مع الزمن.'
                : 'SPHEREx executes an all-sky map every 6 months. Over its baseline nominal mission, it observes every patch of sky at least 4 times, with 100+ visits concentrated at the Ecliptic Poles. This temporal cadence turns static snapshots into a dynamic cosmic time-lapse!'}
            </p>

            {/* Interactive Cadence Cycle Slider */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400">{isArabic ? 'دورة الرصد:' : 'Survey Epoch:'}</span>
                <span className="text-amber-300 font-bold">
                  {cadetSkyCoverage === 1 ? 'Epoch 1 (Month 0-6) - Baseline' : 'Epoch 2 (Month 6-12) - Temporal Revisit'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setCadetSkyCoverage(1);
                    gameAudio.playClick();
                  }}
                  className={`p-3 rounded-xl border text-center transition ${
                    cadetSkyCoverage === 1
                      ? 'bg-cyan-950/80 border-cyan-400 text-white font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-xs">Epoch 1: Baseline Visit</div>
                  <div className="text-[10px] text-slate-400 mt-1">April 2025 • Scan 1</div>
                </button>

                <button
                  onClick={() => {
                    setCadetSkyCoverage(2);
                    gameAudio.playClick();
                  }}
                  className={`p-3 rounded-xl border text-center transition ${
                    cadetSkyCoverage === 2
                      ? 'bg-amber-950/80 border-amber-400 text-white font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-xs">Epoch 2: Revisit 6 Months Later</div>
                  <div className="text-[10px] text-slate-400 mt-1">October 2025 • Scan 2</div>
                </button>
              </div>
            </div>
          </div>

          <DialogueBox
            speakerName="SPEX"
            speakerNameAr="سبيكس"
            expression="serious"
            text="Look at that! In Epoch 1, our protostar was steady. But in Epoch 2, six months later... its brightness exploded! It's time for Chapter 3: What Changed? Let's bring out the difference imaging pipeline!"
            textAr="انظر إلى ذلك! في دورة الرصد الأولى كان النجم مستقراً، لكن في الدورة الثانية بعد 6 أشهر... انفجر سطوعه بحدة غير مسبوقة! حان وقت الفصل الثالث: ماذا تغير؟ دعنا نشغل خط أنابيب التصوير التفاضلي!"
            language={language}
            onContinue={onCompleteChapter}
            continueLabel="Enter Chapter 3: What Changed?"
            continueLabelAr="دخول الفصل الثالث: ماذا تغير؟"
          />
        </div>
      )}
    </div>
  );
};
