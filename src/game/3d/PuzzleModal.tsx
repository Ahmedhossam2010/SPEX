import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle, AlertTriangle, Sparkles, Compass, 
  Activity, Eye, Layers, ShieldCheck, Award, ArrowRight, RefreshCw, Zap
} from 'lucide-react';
import { gameAudio } from '../utils/gameAudio';
import { SPEX_IMAGES } from '../utils/spexAssets';

interface PuzzleModalProps {
  missionNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onCompleteMission: (missionNumber: number, scoreAward: number) => void;
  language: 'en' | 'ar';
  cadetName: string;
}

export const PuzzleModal: React.FC<PuzzleModalProps> = ({
  missionNumber,
  isOpen,
  onClose,
  onCompleteMission,
  language,
  cadetName,
}) => {
  const isAr = language === 'ar';

  // Mission 1 State (Telemetry / Power router)
  const [m1Subsystems, setM1Subsystems] = useState({
    cryoCooler: false,
    lvfDetectors: false,
    diffEngine: false,
  });

  // Mission 2 State (Spectral Slider & Ice Feature Detection)
  const [m2Wavelength, setM2Wavelength] = useState<number>(0.75); // 0.75 to 5.0 um
  const [m2SelectedDip, setM2SelectedDip] = useState<string | null>(null);

  // Mission 3 State (Alignment & Difference Calculator)
  const [m3Offset, setM3Offset] = useState<number>(14); // target is 0
  const [m3BlinkActive, setM3BlinkActive] = useState<boolean>(true);
  const [m3BlinkFrame, setM3BlinkFrame] = useState<number>(0);
  const [m3ThresholdApplied, setM3ThresholdApplied] = useState<boolean>(false);

  // Mission 4 State (Signal vs Artifact Diagnostic)
  const [m4SelectedCandidate, setM4SelectedCandidate] = useState<number>(0);
  const [m4Classifications, setM4Classifications] = useState<{ [key: number]: string }>({});

  // Mission 5 State (FU Orionis Forensic Target)
  const [m5CheckedItems, setM5CheckedItems] = useState<{ [key: string]: boolean }>({});
  const [m5Diagnosis, setM5Diagnosis] = useState<string | null>(null);

  // Completion & feedback state
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Blink interval for Mission 3
  useEffect(() => {
    if (!m3BlinkActive) return;
    const interval = setInterval(() => {
      setM3BlinkFrame((prev) => (prev === 0 ? 1 : 0));
    }, 400);
    return () => clearInterval(interval);
  }, [m3BlinkActive]);

  // Reset local state when modal opens
  useEffect(() => {
    setIsSuccess(false);
    setErrorMessage(null);
  }, [missionNumber, isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // --- MISSION 1 CHECK ---
  const handleMission1Submit = () => {
    if (m1Subsystems.cryoCooler && m1Subsystems.lvfDetectors && m1Subsystems.diffEngine) {
      gameAudio.playSuccess();
      setIsSuccess(true);
      onCompleteMission(1, 100);
    } else {
      gameAudio.playError();
      setErrorMessage(
        isAr
          ? 'يرجى تفعيل جميع الأنظمة الفرعية الثلاثة لبدء مرحلة المعايرة.'
          : 'All 3 subsystems must be calibrated and powered online.'
      );
    }
  };

  // --- MISSION 2 CHECK ---
  const handleMission2Submit = () => {
    if (m2SelectedDip === 'both_ices' || (m2Wavelength >= 2.9 && m2Wavelength <= 4.4)) {
      gameAudio.playSuccess();
      setIsSuccess(true);
      onCompleteMission(2, 150);
    } else {
      gameAudio.playError();
      setErrorMessage(
        isAr
          ? 'حدد موقع امتصاص الجليد الكوني (3.05 ميكرومتر لجليد H₂O أو 4.27 ميكرومتر لجليد CO₂).'
          : 'Locate the cosmic ice absorption bands (3.05 µm H₂O or 4.27 µm CO₂).'
      );
    }
  };

  // --- MISSION 3 CHECK ---
  const handleMission3Submit = () => {
    if (Math.abs(m3Offset) <= 1 && m3ThresholdApplied) {
      gameAudio.playSuccess();
      setIsSuccess(true);
      onCompleteMission(3, 200);
    } else {
      gameAudio.playError();
      setErrorMessage(
        isAr
          ? 'قم بمحاذاة الحقبتين الزمنيتين (إزاحة < 1 بكسل) وطبق عتبة التباين الاحتمالي.'
          : 'Align the two observation epochs (< 1px offset) and activate variance subtraction.'
      );
    }
  };

  // --- MISSION 4 CHECK ---
  const handleMission4Submit = () => {
    // 0: cosmic ray (artifact), 1: pointing jitter (artifact), 2: asteroid dipole (moving object), 3: infrared flare (true transient)
    const isCorrect =
      m4Classifications[0] === 'artifact' &&
      m4Classifications[1] === 'artifact' &&
      m4Classifications[2] === 'moving_object' &&
      m4Classifications[3] === 'true_transient';

    if (isCorrect) {
      gameAudio.playSuccess();
      setIsSuccess(true);
      onCompleteMission(4, 250);
    } else {
      gameAudio.playError();
      setErrorMessage(
        isAr
          ? 'هناك تصنيف غير دقيق. انتبه للفرق بين نبضة بكسل الأشعة الكونية والملف النجمي الحقيقي.'
          : 'Classification mismatch. Distinguish sharp 1px cosmic rays from authentic 2D PSF profiles.'
      );
    }
  };

  // --- MISSION 5 CHECK ---
  const handleMission5Submit = () => {
    if (m5Diagnosis === 'fu_orionis' && m5CheckedItems['spectrum'] && m5CheckedItems['photometry']) {
      gameAudio.playSuccess();
      setIsSuccess(true);
      onCompleteMission(5, 300);
    } else {
      gameAudio.playError();
      setErrorMessage(
        isAr
          ? 'راجع الأدلة الطيفية (امتصاص غاز CO عند 2.3 ميكرومتر) واعتمد التشخيص الصحيح.'
          : 'Inspect the spectral evidence (CO bandhead at 2.3 µm) and select the validated diagnostic.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0b1120] border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100 overflow-hidden"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400">
                {isAr ? 'محطة التحكم التفاعلية' : 'SPHEREx INTERACTIVE CONSOLE'} • {cadetName}
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {missionNumber === 1 && (isAr ? 'المهمة 01: تنشيط أجهزة الاستشعار' : 'Mission 01: Subsystem Initialization')}
                {missionNumber === 2 && (isAr ? 'المهمة 02: استكشاف أطياف الجليد' : 'Mission 02: 102-Band Spectral Lab')}
                {missionNumber === 3 && (isAr ? 'المهمة 03: المحاذاة الزمنية والطرح الفلكي' : 'Mission 03: Temporal Alignment & Difference')}
                {missionNumber === 4 && (isAr ? 'المهمة 04: فحص الإشارات الزائفة' : 'Mission 04: False Signal Discrimination')}
                {missionNumber === 5 && (isAr ? 'المهمة 05: التحقيق الكوني النهائي' : 'Mission 05: Deep Cosmic Investigation')}
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              gameAudio.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SPEX Dialogue Guidance */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/70 border border-slate-700/60">
            <img 
              src={isSuccess ? SPEX_IMAGES.proudSuccess : SPEX_IMAGES.explaining} 
              alt="SPEX"
              className="w-16 h-16 rounded-xl object-contain bg-slate-800/80 p-1 border border-amber-400/30 flex-shrink-0"
            />
            <div className="flex-1 text-sm text-slate-300 leading-relaxed">
              <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                SPEX AI Agent • {isSuccess ? (isAr ? 'تم التحقق بنجاح!' : 'Signal Validated!') : (isAr ? 'توجيه الملاحة' : 'Flight Director Guidance')}
              </span>
              {missionNumber === 1 && (
                isAr
                  ? 'مرحباً بك في المحطة! لتجهيز تلسكوب SPHEREx، يجب تفعيل مبرد النيتروجين المفرغ، وتشغيل منظومة المرشحات الطيفية الخطية المتغيرة (LVF)، ومعالج الطرح الزمني.'
                  : 'Welcome aboard Cadet! To prepare SPHEREx, we must initialize the cryogenic cooler (80K), power on the Linear Variable Filter detectors, and warm up the temporal difference engine.'
              )}
              {missionNumber === 2 && (
                isAr
                  ? 'يخترق ضوء الأشعة تحت الحمراء سحب الغبار النجمي. يمتلك SPHEREx مئة واثنين (102) من الحزم الطيفية. اسحب المؤشر لاكتشاف امتصاص جليد الماء عند 3.05 ميكرومتر وجليد ثاني أكسيد الكربون عند 4.27 ميكرومتر!'
                  : 'Infrared penetrates cosmic dust where optical telescopes see blackness. SPHEREx records 102 spectral channels. Sweep across wavelengths to detect interstellar water ice (3.05 µm) and CO₂ ice (4.27 µm)!'
              )}
              {missionNumber === 3 && (
                isAr
                  ? 'لكشف النجوم المتغيرة، نقارن بين صورتين متباعدتين زمنياً. اضبط إزاحة البكسل لتطابق النجوم المرجعية تماماً، ثم شغل طرح التباين D = I₂ - I₁ لاستخراج التغير النجمي.'
                  : 'To find transient signals, we compare two visits. Slide the spatial offset until reference stars align, then activate difference subtraction D = I₂ - I₁ with variance propagation!'
              )}
              {missionNumber === 4 && (
                isAr
                  ? 'تحذير: الفضاء مليء بالخدع البصرية! نبضات الأشعة الكونية تضرب بكسلاً واحداً فقط، بينما النجم الحقيقي يتبع توزيع دالة انتشار النقطة (PSF). صنف العينات الأربعة بدقة.'
                  : 'Warning: Not every spike is a real star! Cosmic rays hit single pixels instantly, whereas genuine astronomical sources obey the 2D Point Spread Function (PSF). Categorize all 4 candidates.'
              )}
              {missionNumber === 5 && (
                isAr
                  ? 'هذا هو الاختبار النهائي! رصدنا ثوراناً ضوئياً حاداً في سحابة ولادة النجوم. افحص منحنى الضوء والأطياف عند 2.3 ميكرومتر وحدد التشخيص الفيزيائي لإصدار شهادة التحقيق الرسمية.'
                  : 'The master challenge: A sudden infrared flare inside a protostellar envelope. Analyze the lightcurve and the 2.3 µm CO absorption to deliver the final astrophysical verdict.'
              )}
            </div>
          </div>

          {/* MISSION 1: SUBSYSTEM POWER */}
          {missionNumber === 1 && !isSuccess && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200">
                {isAr ? 'شبكة طاقة وتبريد SPHEREx الأساسية:' : 'SPHEREx Core Instrument Telemetry Grid:'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    setM1Subsystems(prev => ({ ...prev, cryoCooler: !prev.cryoCooler }));
                  }}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition ${
                    m1Subsystems.cryoCooler 
                      ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Activity className={`w-5 h-5 ${m1Subsystems.cryoCooler ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-mono">{m1Subsystems.cryoCooler ? 'ONLINE (80K)' : 'OFFLINE'}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{isAr ? 'المبرد فائق التبريد' : 'Cryogenic Cooler'}</div>
                    <div className="text-xs text-slate-400 mt-1">{isAr ? 'خفض حرارة الكواشف إلى 80 كلفن' : 'Chills sensors to 80K'}</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    setM1Subsystems(prev => ({ ...prev, lvfDetectors: !prev.lvfDetectors }));
                  }}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition ${
                    m1Subsystems.lvfDetectors 
                      ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Layers className={`w-5 h-5 ${m1Subsystems.lvfDetectors ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-mono">{m1Subsystems.lvfDetectors ? 'ACTIVE (102 BANDS)' : 'STANDBY'}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{isAr ? 'كواشف LVF الطيفية' : 'LVF 102 Detectors'}</div>
                    <div className="text-xs text-slate-400 mt-1">{isAr ? 'المرشحات الطيفية 0.75 - 5.0µm' : '0.75–5.0 µm channels'}</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    setM1Subsystems(prev => ({ ...prev, diffEngine: !prev.diffEngine }));
                  }}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition ${
                    m1Subsystems.diffEngine 
                      ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Zap className={`w-5 h-5 ${m1Subsystems.diffEngine ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-mono">{m1Subsystems.diffEngine ? 'READY (WCS SYNC)' : 'OFF'}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{isAr ? 'محرك الطرح الرياضي' : 'Variance Diff Engine'}</div>
                    <div className="text-xs text-slate-400 mt-1">{isAr ? 'حساب الفروق ونسب الإشارة' : 'Bilinear WCS & SNR math'}</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* MISSION 2: 102 SPECTRAL LAB */}
          {missionNumber === 2 && !isSuccess && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono text-cyan-400">
                    {isAr ? 'الطول الموجي المستعرض:' : 'Current Wavelength:'} {m2Wavelength.toFixed(2)} µm
                  </span>
                  <span className="text-xs text-slate-400">
                    {m2Wavelength < 1.0 ? 'Visible / Near-IR' : m2Wavelength < 2.5 ? 'Short-Wave IR' : 'Mid-Wave IR'}
                  </span>
                </div>
                <input 
                  type="range"
                  min="0.75"
                  max="5.0"
                  step="0.05"
                  value={m2Wavelength}
                  onChange={(e) => setM2Wavelength(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />

                {/* Simulated Spectral Curve */}
                <div className="mt-4 relative h-36 bg-[#070a12] rounded-lg border border-slate-800 p-2 overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="0" y1="30" x2="500" y2="30" stroke="#1e293b" strokeDasharray="4 4" />
                    <line x1="0" y1="60" x2="500" y2="60" stroke="#1e293b" strokeDasharray="4 4" />
                    <line x1="0" y1="90" x2="500" y2="90" stroke="#1e293b" strokeDasharray="4 4" />

                    {/* Continuum spectrum with H2O dip at 3.05um and CO2 dip at 4.27um */}
                    <path
                      d="M 0,50 Q 80,45 150,55 T 220,50 Q 250,50 265,100 Q 280,50 330,55 Q 390,55 405,105 Q 420,55 500,60"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                    />

                    {/* Indicator vertical line */}
                    {(() => {
                      const xPos = ((m2Wavelength - 0.75) / (5.0 - 0.75)) * 500;
                      return (
                        <g>
                          <line x1={xPos} y1="0" x2={xPos} y2="120" stroke="#f59e0b" strokeWidth="2" strokeDasharray="2 2" />
                          <circle cx={xPos} cy="60" r="4" fill="#f59e0b" />
                        </g>
                      );
                    })()}

                    {/* Labels for ice features */}
                    <text x="265" y="115" fill="#f43f5e" fontSize="10" textAnchor="middle">3.05µm H₂O Ice</text>
                    <text x="405" y="115" fill="#a855f7" fontSize="10" textAnchor="middle">4.27µm CO₂ Ice</text>
                  </svg>
                </div>
              </div>

              {/* Identification buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    setM2SelectedDip('both_ices');
                  }}
                  className={`p-3 rounded-lg border text-sm text-left transition ${
                    m2SelectedDip === 'both_ices'
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="font-semibold">{isAr ? 'امتصاص جليد الماء وثاني أكسيد الكربون' : 'Identify H₂O & CO₂ Ice Signatures'}</div>
                  <div className="text-xs text-slate-400 mt-1">{isAr ? 'انخفاض الشدة عند 3.05 و 4.27 ميكرومتر' : 'Key dips at 3.05 µm and 4.27 µm'}</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    setM2SelectedDip('optical_dust');
                  }}
                  className={`p-3 rounded-lg border text-sm text-left transition ${
                    m2SelectedDip === 'optical_dust'
                      ? 'bg-red-950/80 border-red-400 text-red-200'
                      : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="font-semibold">{isAr ? 'عتامة الغبار البصري العادي' : 'Pure Optical Dust Extinction'}</div>
                  <div className="text-xs text-slate-400 mt-1">{isAr ? 'حجب كامل لجميع الأطوال' : 'Total blockage without features'}</div>
                </button>
              </div>
            </div>
          )}

          {/* MISSION 3: TEMPORAL ALIGNMENT & DIFFERENCE */}
          {missionNumber === 3 && !isSuccess && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Visual Canvas Simulator */}
                <div className="relative aspect-square max-h-56 bg-slate-950 rounded-xl border border-slate-800 p-3 flex items-center justify-center overflow-hidden">
                  <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400 bg-slate-900/80 px-2 py-0.5 rounded">
                    {m3BlinkActive 
                      ? (m3BlinkFrame === 0 ? 'EPOCH 1 (2024-03-15)' : 'EPOCH 2 (2024-09-20)')
                      : 'STATIC VIEW'}
                  </div>

                  {/* Reference Stars (aligned or offset) */}
                  <div 
                    className="relative w-40 h-40 border border-slate-700/50 rounded-lg transition-transform duration-100"
                    style={{
                      transform: m3BlinkFrame === 1 ? `translate(${m3Offset}px, ${m3Offset * 0.5}px)` : 'none'
                    }}
                  >
                    {/* Star 1 */}
                    <div className="absolute top-6 left-8 w-3 h-3 bg-white rounded-full blur-[1px] shadow-[0_0_6px_#fff]" />
                    {/* Star 2 */}
                    <div className="absolute bottom-10 right-10 w-2.5 h-2.5 bg-cyan-200 rounded-full blur-[1px]" />
                    {/* Star 3 */}
                    <div className="absolute top-12 right-8 w-2 h-2 bg-amber-200 rounded-full" />
                    {/* Flare Transient (appears only in epoch 2) */}
                    {m3BlinkFrame === 1 && (
                      <div className="absolute top-20 left-20 w-4 h-4 bg-amber-400 rounded-full blur-[1.5px] shadow-[0_0_12px_#f59e0b] animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Alignment Controls */}
                <div className="flex flex-col justify-between space-y-3">
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      {isAr ? 'محاذاة بكسل WCS الفلكية:' : 'Sub-pixel WCS Registration Offset:'} {m3Offset}px
                    </label>
                    <input 
                      type="range"
                      min="-20"
                      max="20"
                      value={m3Offset}
                      onChange={(e) => setM3Offset(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isAr ? 'حرك المؤشر حتى تتطابق النجوم المرجعية تماماً عند الصفر (0px).' : 'Tune until reference stars freeze in place at 0px offset.'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setM3BlinkActive(!m3BlinkActive)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                        m3BlinkActive ? 'bg-cyan-900/50 border-cyan-400 text-cyan-200' : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${m3BlinkActive ? 'animate-spin' : ''}`} />
                      {m3BlinkActive ? (isAr ? 'وميض سريع 2Hz نشط' : 'Blink 2Hz Active') : (isAr ? 'إيقاف الوميض' : 'Pause Blink')}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playClick();
                        setM3ThresholdApplied(!m3ThresholdApplied);
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                        m3ThresholdApplied ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200' : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      {m3ThresholdApplied ? (isAr ? 'عتبة التباين مفعلة' : 'D=I₂-I₁ Active') : (isAr ? 'تطبيق الطرح الرياضي' : 'Apply Diff')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MISSION 4: SIGNAL VS ARTIFACT DISCRIMINATION */}
          {missionNumber === 4 && !isSuccess && (
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {['Candidate A', 'Candidate B', 'Candidate C', 'Candidate D'].map((name, idx) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      gameAudio.playClick();
                      setM4SelectedCandidate(idx);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border whitespace-nowrap transition ${
                      m4SelectedCandidate === idx
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {name}: {m4Classifications[idx] ? (isAr ? 'تم التصنيف' : 'CLASSIFIED') : (isAr ? 'قيد الفحص' : 'PENDING')}
                  </button>
                ))}
              </div>

              {/* Inspector View */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-32 h-32 rounded-lg bg-black border border-slate-700 flex items-center justify-center relative overflow-hidden flex-shrink-0">
                  {m4SelectedCandidate === 0 && (
                    <div className="w-1.5 h-1.5 bg-white shadow-[0_0_8px_#fff]" />
                  )}
                  {m4SelectedCandidate === 1 && (
                    <div className="w-16 h-1 bg-cyan-300/60 rotate-45 blur-[0.5px]" />
                  )}
                  {m4SelectedCandidate === 2 && (
                    <div className="flex gap-2 items-center">
                      <div className="w-4 h-4 rounded-full bg-emerald-400/80 blur-[1px]" />
                      <div className="w-4 h-4 rounded-full bg-red-400/80 blur-[1px]" />
                    </div>
                  )}
                  {m4SelectedCandidate === 3 && (
                    <div className="w-8 h-8 rounded-full bg-amber-400/80 blur-[2px] shadow-[0_0_16px_#f59e0b]" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="text-xs font-mono text-cyan-400">
                    {m4SelectedCandidate === 0 && (isAr ? 'الملف: عرض 1 بكسل حاد، لا انتشار غاوسي' : 'Profile: 1-pixel Dirac spike, zero PSF Gaussian dispersion')}
                    {m4SelectedCandidate === 1 && (isAr ? 'الملف: أثر خطي ممتد متزامن عبر الحقل' : 'Profile: Elongated streak matching telescope jitter gyro drift')}
                    {m4SelectedCandidate === 2 && (isAr ? 'الملف: قطبان متجاوران موجب وسالب في صورة الفرق' : 'Profile: Adjacent positive & negative lobes in difference image')}
                    {m4SelectedCandidate === 3 && (isAr ? 'الملف: تماثل نصف قطري 2D موفات متطابق مع PSF التلسكوب' : 'Profile: Radial symmetric 2D Moffat profile matching SPHEREx PSF')}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playClick();
                        setM4Classifications({ ...m4Classifications, [m4SelectedCandidate]: 'artifact' });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                        m4Classifications[m4SelectedCandidate] === 'artifact'
                          ? 'bg-rose-950/80 border-rose-400 text-rose-200'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      {isAr ? 'أثر بصري زائف (Artifact)' : 'Reject as Artifact'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playClick();
                        const tag = m4SelectedCandidate === 2 ? 'moving_object' : 'true_transient';
                        setM4Classifications({ ...m4Classifications, [m4SelectedCandidate]: tag });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                        m4Classifications[m4SelectedCandidate] === 'moving_object' || m4Classifications[m4SelectedCandidate] === 'true_transient'
                          ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      {m4SelectedCandidate === 2
                        ? (isAr ? 'جرم متحرك (كويكب)' : 'Moving Object (Asteroid)')
                        : (isAr ? 'إشارة فلكية حقيقية' : 'Confirm True Astronomical Signal')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MISSION 5: FINAL INVESTIGATION & VERDICT */}
          {missionNumber === 5 && !isSuccess && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-3">
                <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                  Target: SPX-NEP-2026-X1 (RA 18h00m, Dec +66°33')
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                  <label className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={!!m5CheckedItems['spectrum']}
                      onChange={(e) => setM5CheckedItems({ ...m5CheckedItems, spectrum: e.target.checked })}
                      className="accent-cyan-400"
                    />
                    <span>{isAr ? 'فحص امتصاص حافة حزمة CO عند 2.3µm' : 'Inspect CO Bandhead Absorption at 2.3 µm'}</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={!!m5CheckedItems['photometry']}
                      onChange={(e) => setM5CheckedItems({ ...m5CheckedItems, photometry: e.target.checked })}
                      className="accent-cyan-400"
                    />
                    <span>{isAr ? 'تأكيد الارتفاع الضوئي بمقدار 4.5 قدر فلكي' : 'Verify Δm = 4.5 Mag Infrared Outburst'}</span>
                  </label>
                </div>

                <div className="pt-2">
                  <span className="text-xs font-semibold text-slate-200 block mb-2">
                    {isAr ? 'التشخيص الفيزيائي النهائي:' : 'Final Astrophysical Diagnosis:'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playClick();
                        setM5Diagnosis('fu_orionis');
                      }}
                      className={`p-3 rounded-lg border text-xs text-left transition ${
                        m5Diagnosis === 'fu_orionis'
                          ? 'bg-amber-950/80 border-amber-400 text-amber-200'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      <div className="font-bold">{isAr ? 'ثوران تراكمي لنجم أولي (FU Orionis)' : 'FU Orionis Protostellar Accretion Outburst'}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{isAr ? 'تسارع تراكم المادة من القرص النجمي' : 'Rapid runaway accretion from circumstellar disk'}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playClick();
                        setM5Diagnosis('type_ia');
                      }}
                      className={`p-3 rounded-lg border text-xs text-left transition ${
                        m5Diagnosis === 'type_ia'
                          ? 'bg-slate-900 border-slate-700 text-slate-300'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      <div className="font-bold">{isAr ? 'مستعر أعظم من النوع Ia' : 'Type Ia Thermonuclear Supernova'}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{isAr ? 'انفجار قزم أبيض بالكامل' : 'Cataclysmic white dwarf destruction'}</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {isSuccess && (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {isAr ? 'اكتملت المهمة بنجاح!' : 'Mission Completed Successfully!'}
                </h3>
                <p className="text-sm text-emerald-200/90 mt-1">
                  {isAr 
                    ? `تم تسجيل التحليل العلمي في سجل الملاحة الفضائية الخاص بالمحقق ${cadetName}.`
                    : `Scientific telemetry registered in the cosmic logbook for Investigator ${cadetName}.`}
                </p>
              </div>

              {missionNumber === 5 && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-400/40 text-left max-w-md mx-auto">
                  <div className="flex items-center gap-2 text-amber-400 mb-2">
                    <Award className="w-5 h-5" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider">
                      NASA SPACE APPS CHALLENGE 2026 • SPEX CERTIFICATION
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {isAr 
                      ? `بموجبه يُمنح المحقق (${cadetName}) وسام شرف التحقيق في تغيرات السماء واكتشاف ثوران FU Orionis النجمي بالأشعة تحت الحمراء.`
                      : `Hereby confirms that Investigator (${cadetName}) has mastered 102-band infrared transient discovery and diagnosed FU Orionis protostellar accretion.`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            {isAr ? 'محاكاة تعليمية — لا تُعد بيانات SPHEREx الفعلية' : 'EDUCATIONAL SIMULATION — NOT REAL SPHEREx DATA'}
          </div>

          <div>
            {!isSuccess ? (
              <button
                type="button"
                onClick={() => {
                  if (missionNumber === 1) handleMission1Submit();
                  if (missionNumber === 2) handleMission2Submit();
                  if (missionNumber === 3) handleMission3Submit();
                  if (missionNumber === 4) handleMission4Submit();
                  if (missionNumber === 5) handleMission5Submit();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 transition"
              >
                <span>{isAr ? 'تحقق واعتماد النتيجة' : 'Verify & Submit'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick();
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 transition"
              >
                <span>{isAr ? 'العودة إلى المحطة الفضائية' : 'Return to Station'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
