import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle, AlertTriangle, Sparkles, Compass, 
  Activity, Eye, Layers, ShieldCheck, Award, ArrowRight, RefreshCw, Zap,
  BookOpen, Telescope, Filter, FileText
} from 'lucide-react';
import { gameAudio } from '../utils/gameAudio';
import { SpexPortrait } from '../../spex/SpexPortrait';

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

  // Mission 1 State: Subsystem telemetry power
  const [m1Subsystems, setM1Subsystems] = useState({
    cryoCooler: false,
    lvfDetectors: false,
    diffEngine: false,
  });

  // Mission 2 State: The Journey of SPHEREx Timeline exhibits
  const [m2ExhibitsRead, setM2ExhibitsRead] = useState<{ [key: string]: boolean }>({
    origins: false,
    ices: false,
    galaxies: false,
  });

  // Mission 3 State: The Invisible Universe (Visible vs IR demo)
  const [m3Mode, setM3Mode] = useState<'visible' | 'infrared'>('visible');
  const [m3FoundHiddenStar, setM3FoundHiddenStar] = useState<boolean>(false);

  // Mission 4 State: The Moving Sky Mystery (Temporal Alignment & Blink)
  const [m4Offset, setM4Offset] = useState<number>(12); // target is 0
  const [m4BlinkActive, setM4BlinkActive] = useState<boolean>(true);
  const [m4BlinkFrame, setM4BlinkFrame] = useState<number>(0);
  const [m4IdentifiedMotion, setM4IdentifiedMotion] = useState<boolean>(false);

  // Mission 5 State: The 102-Band Secret (Spectral Wavelength Slider & Ice Dip)
  const [m5Wavelength, setM5Wavelength] = useState<number>(0.75);
  const [m5SelectedDip, setM5SelectedDip] = useState<string | null>(null);

  // Mission 6 State: The Investigation Report (Artifacts vs Real PSF + Final Report)
  const [m6SelectedCandidate, setM6SelectedCandidate] = useState<number>(0);
  const [m6Classifications, setM6Classifications] = useState<{ [key: number]: string }>({});
  const [m6Diagnosis, setM6Diagnosis] = useState<string | null>(null);

  // Completion & feedback state
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Blink interval for Mission 4
  useEffect(() => {
    if (!m4BlinkActive) return;
    const interval = setInterval(() => {
      setM4BlinkFrame((prev) => (prev === 0 ? 1 : 0));
    }, 400);
    return () => clearInterval(interval);
  }, [m4BlinkActive]);

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

  // --- SUBMISSIONS ---
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

  const handleMission2Submit = () => {
    if (m2ExhibitsRead.origins && m2ExhibitsRead.ices && m2ExhibitsRead.galaxies) {
      gameAudio.playSuccess();
      setIsSuccess(true);
      onCompleteMission(2, 120);
    } else {
      gameAudio.playError();
      setErrorMessage(
        isAr
          ? 'يرجى مراجعة وتأكيد المحاور العلمية الثلاثة لمهمة SPHEREx.'
          : 'Please review and confirm all 3 scientific pillars of the SPHEREx mission.'
      );
    }
  };

  const handleMission3Submit = () => {
    if (m3Mode === 'infrared' && m3FoundHiddenStar) {
      gameAudio.playSuccess();
      setIsSuccess(true);
      onCompleteMission(3, 150);
    } else {
      gameAudio.playError();
      setErrorMessage(
        isAr
          ? 'قم بالتبديل إلى الأشعة تحت الحمراء وانقر على النجم المتخفي خلف سحابة الغبار الكونية.'
          : 'Switch to Infrared mode and locate the hidden protostar embedded behind the cosmic dust cloud.'
      );
    }
  };

  const handleMission4Submit = () => {
    if (Math.abs(m4Offset) <= 1 && m4IdentifiedMotion) {
      gameAudio.playSuccess();
      setIsSuccess(true);
      onCompleteMission(4, 200);
    } else {
      gameAudio.playError();
      setErrorMessage(
        isAr
          ? 'قم بمحاذاة الصورتين بدقة (< 1 بكسل) وتأكيد رصد النجم سريع الحركة.'
          : 'Align the two epochs accurately (< 1px offset) and confirm the moving proper motion star.'
      );
    }
  };

  const handleMission5Submit = () => {
    if (m5SelectedDip === 'water_ice' || (m5Wavelength >= 2.95 && m5Wavelength <= 3.2)) {
      gameAudio.playSuccess();
      setIsSuccess(true);
      onCompleteMission(5, 250);
    } else {
      gameAudio.playError();
      setErrorMessage(
        isAr
          ? 'حدد موقع امتصاص جليد الماء الكوني (3.05 ميكرومتر H₂O).'
          : 'Locate the cosmic water ice absorption feature (3.05 µm H₂O dip).'
      );
    }
  };

  const handleMission6Submit = () => {
    const isCorrectClass =
      m6Classifications[0] === 'artifact' &&
      m6Classifications[1] === 'artifact' &&
      m6Classifications[2] === 'moving_object' &&
      m6Classifications[3] === 'true_transient';

    if (isCorrectClass && m6Diagnosis === 'fu_orionis') {
      gameAudio.playSuccess();
      setIsSuccess(true);
      onCompleteMission(6, 300);
    } else {
      gameAudio.playError();
      setErrorMessage(
        isAr
          ? 'هناك خطأ في تصنيف الأجرام أو التشخيص النهائي. تأكد من فرز عيوب الحساس وتأكيد ثوران FU Orionis.'
          : 'Review classifications: reject 1-pixel cosmic ray artifacts, identify the asteroid, and certify the FU Orionis outburst.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0b1120] border-2 border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100 overflow-hidden"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400">
                {isAr ? 'غرفة عمليات مرصد SPHEREx التفاعلية' : 'SPHEREx MISSION CONTROL CONSOLE'} • {cadetName}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide font-['Outfit']">
                {missionNumber === 1 && (isAr ? 'المهمة 01: وصول المستكشف وتفعيل المنظومة' : 'Mission 01: A New Explorer Arrives & Telemetry Initialization')}
                {missionNumber === 2 && (isAr ? 'المهمة 02: تاريخ ورحلة مرصد SPHEREx الفضائي' : 'Mission 02: The Journey & Purpose of SPHEREx (NASA All-Sky Survey)')}
                {missionNumber === 3 && (isAr ? 'المهمة 03: الكون غير المرئي بالأشعة تحت الحمراء' : 'Mission 03: The Invisible Universe (Visible vs Infrared)')}
                {missionNumber === 4 && (isAr ? 'المهمة 04: لغز السماء المتحركة ومقارنة الرصدات' : 'Mission 4: The Moving Sky Mystery (Proper Motion & Blink)')}
                {missionNumber === 5 && (isAr ? 'المهمة 05: سر النطاقات الطيفية الـ 102 وبصمات الجليد' : 'Mission 5: The 102-Band Secret (Cosmic Ice Fingerprints)')}
                {missionNumber === 6 && (isAr ? 'المهمة 06: تقرير التحقيق النهائي واعتماد ناسا' : 'Mission 6: The Final Investigation Report & NASA Certification')}
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              gameAudio.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SPEX Dialogue Guidance with Authentic Cat Portrait */}
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-700/60">
            <div className="shrink-0 bg-slate-950 p-1 rounded-2xl border border-amber-400/30">
              <SpexPortrait 
                mood={isSuccess ? 'proud' : missionNumber === 1 ? 'greeting' : missionNumber === 3 ? 'curious' : 'explaining'} 
                size={64}
              />
            </div>
            <div className="flex-1 text-xs text-slate-300 leading-relaxed">
              <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider block mb-1">
                SPEX AI GUARDIAN • {isSuccess ? (isAr ? 'تم التحقق بنجاح!' : 'Investigation Verified!') : (isAr ? 'توجيهات المحقق' : 'Mission Briefing')}
              </span>
              {missionNumber === 1 && (
                isAr
                  ? 'أهلاً بك في محطة SPEX المدارية! أنا رفيقك الفلكي. لتجهيز التلسكوب للرصد، قم بتشغيل مبرد الحساسات (80K)، وتفعيل كواشف المرشحات الطيفية الخطية (LVF)، وبدء تشغيل محرك الطرح الفلكي.'
                  : 'Welcome aboard SPEX Station! I am your space exploration companion. To prepare SPHEREx for active sky discovery, power the cryogenic cooler (80K), initialize the 102 Linear Variable Filter channels, and boot the difference engine.'
              )}
              {missionNumber === 2 && (
                isAr
                  ? 'منذ 2025، يمسح تلسكوب SPHEREx التابع لناسا قبة السماء بالكامل كل ستة أشهر في 102 نطاق من الأشعة تحت الحمراء القريبة. افحص الركائز العلمية الثلاث للمهمة لفهم أهدافها الكونية.'
                  : 'Since 2025, NASA’s SPHEREx mission has been mapping the entire sky every six months in 102 bands of near-infrared light across 6 detector arrays. Review its 3 scientific pillars to understand its cosmic journey.'
              )}
              {missionNumber === 3 && (
                isAr
                  ? 'عيوننا البشرية ترى الضوء المرئي فقط، لكن سحب الغبار الكونية تحجبه! تخترق الأشعة تحت الحمراء الغبار البارد لتكشف النجوم الوليدة. بدّل وضع العرض واكتشف النجم المختبئ.'
                  : 'Human eyes only perceive visible light, which is blocked by interstellar dust! Near-infrared light slips straight through cosmic clouds. Switch to Infrared mode to discover the hidden newborn star.'
              )}
              {missionNumber === 4 && (
                isAr
                  ? 'الأجرام القريبة في مجرتنا تتحرك بمرور الوقت! قارن بين لقطتين زمنيتين لنفس الحقل. قم بمحاذاة النجوم المرجعية حتى تصبح الإزاحة صفراً، ثم استخدم الوميض السريع لكشف النجم المتحرك.'
                  : 'Nearby stars and asteroids shift over time! Compare two snapshots of the same sky patch. Align the WCS offset to zero, then use the blink comparator to spot the moving proper motion star.'
              )}
              {missionNumber === 5 && (
                isAr
                  ? 'تلسكوب SPHEREx يمتلك 102 نطاقاً طيفياً! عندما يمر الضوء عبر السحب الجزيئية، يمتص جليد الماء الضوء عند 3.05 ميكرومتر. حرك المؤشر الطيفي واعثر على بصمة جليد الماء.'
                  : 'SPHEREx provides 102 distinct spectral channels! When light passes through cold interstellar clouds, cosmic water ice leaves an absorption trough at 3.05 µm. Sweep the slider to identify the water ice dip.'
              )}
              {missionNumber === 6 && (
                isAr
                  ? 'المحطة الأخيرة: أصدر تقرير التحقيق النهائي! استبعد آثار بكسلات الأشعة الكونية واهتزازات التوجيه، وميز النجم المتغير الحقيقي (FU Orionis) لتحصل على اعتماد ناسا الرسمي.'
                  : 'The final mission: Review the evidence, reject 1-pixel cosmic ray hits and jitter streaks, identify the authentic flare, and certify the FU Orionis protostellar accretion report.'
              )}
            </div>
          </div>

          {/* MISSION 1: SUBSYSTEM POWER */}
          {missionNumber === 1 && !isSuccess && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wider">
                {isAr ? 'أنظمة مرصد SPHEREx الأساسية:' : 'SPHEREx Core Instrument Telemetry Grid:'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    setM1Subsystems(prev => ({ ...prev, cryoCooler: !prev.cryoCooler }));
                  }}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
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
                    <div className="font-semibold text-xs">{isAr ? 'المبرد فائق التبريد' : 'Cryogenic Cooler'}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{isAr ? 'خفض حرارة الكواشف إلى 80 كلفن' : 'Chills sensors to 80K'}</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    setM1Subsystems(prev => ({ ...prev, lvfDetectors: !prev.lvfDetectors }));
                  }}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
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
                    <div className="font-semibold text-xs">{isAr ? 'كواشف LVF الـ 102' : 'LVF 102 Detectors'}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{isAr ? 'مرشحات متغيرة 0.75–5.0 µm' : '0.75–5.0 µm channels'}</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    setM1Subsystems(prev => ({ ...prev, diffEngine: !prev.diffEngine }));
                  }}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
                    m1Subsystems.diffEngine 
                      ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Compass className={`w-5 h-5 ${m1Subsystems.diffEngine ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-mono">{m1Subsystems.diffEngine ? 'READY (D = I₂ - I₁)' : 'OFFLINE'}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-xs">{isAr ? 'محرك الطرح الفلكي' : 'Difference Engine'}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{isAr ? 'طرح الصورتين وانتشار التباين' : 'Calculates D = I₂ - I₁'}</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* MISSION 2: THE JOURNEY OF SPHEREx */}
          {missionNumber === 2 && !isSuccess && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                {isAr
                  ? 'مهمة SPHEREx هي أول مسح طيفي بالأشعة تحت الحمراء لكامل السماء. انقر على الركائز العلمية الثلاث لتأكيد دراستها:'
                  : 'SPHEREx is NASA’s first near-infrared all-sky spectral survey. Click each scientific pillar to review:'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    setM2ExhibitsRead(prev => ({ ...prev, origins: !prev.origins }));
                  }}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                    m2ExhibitsRead.origins
                      ? 'bg-indigo-950/60 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="text-xs font-bold text-indigo-400 font-mono mb-1">PILLAR 1: COSMIC ORIGINS</div>
                  <div className="font-semibold text-xs text-white">{isAr ? 'أصل الكون والتضخم الكوني' : 'Cosmic Inflation & Big Bang'}</div>
                  <div className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                    {isAr
                      ? 'قياس توزيع مئات الملايين من المجرات عبر 102 نطاق لاختبار التضخم الكوني الأول بعد الانفجار العظيم.'
                      : 'Mapping hundreds of millions of galaxies in 3D to test cosmic inflation during the first fractions of a second.'}
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-emerald-400">
                    {m2ExhibitsRead.origins ? '✓ VERIFIED' : 'CLICK TO REVIEW'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    setM2ExhibitsRead(prev => ({ ...prev, ices: !prev.ices }));
                  }}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                    m2ExhibitsRead.ices
                      ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="text-xs font-bold text-cyan-400 font-mono mb-1">PILLAR 2: WATER & ICES</div>
                  <div className="font-semibold text-xs text-white">{isAr ? 'جليد الماء ومركبات الحياة' : 'Interstellar Water & Biogenic Ices'}</div>
                  <div className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                    {isAr
                      ? 'الكشف عن جليد الماء (3.05µm) وثاني أكسيد الكربون (4.27µm) وأول أكسيد الكربون في السحب المنجبة للكواكب.'
                      : 'Identifying water ice (3.05 µm) and biogenic ices in cold star-forming clouds that will form future planetary systems.'}
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-emerald-400">
                    {m2ExhibitsRead.ices ? '✓ VERIFIED' : 'CLICK TO REVIEW'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    setM2ExhibitsRead(prev => ({ ...prev, galaxies: !prev.galaxies }));
                  }}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                    m2ExhibitsRead.galaxies
                      ? 'bg-amber-950/60 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="text-xs font-bold text-amber-400 font-mono mb-1">PILLAR 3: GALAXY EVOLUTION</div>
                  <div className="font-semibold text-xs text-white">{isAr ? 'تطور المجرات وضوء النجوم الكوني' : 'Extragalactic Background Light'}</div>
                  <div className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                    {isAr
                      ? 'قياس الضوء التراكمي لجميع النجوم والمجرات الأولى التي أضاءت الكون منذ حقبة عودة التأين.'
                      : 'Measuring total light produced across cosmic time by the earliest stars and galaxies during cosmic reionization.'}
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-emerald-400">
                    {m2ExhibitsRead.galaxies ? '✓ VERIFIED' : 'CLICK TO REVIEW'}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* MISSION 3: THE INVISIBLE UNIVERSE */}
          {missionNumber === 3 && !isSuccess && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 uppercase font-bold">
                  {isAr ? 'مختبر مقارنة الأطوال الموجية الكونية:' : 'Cosmic Wavelength Laboratory:'}
                </span>

                <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playClick();
                      setM3Mode('visible');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      m3Mode === 'visible' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isAr ? 'الضوء المرئي (Visible 0.5 µm)' : 'Visible Light (0.5 µm)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playClick();
                      setM3Mode('infrared');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      m3Mode === 'infrared' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isAr ? 'الأشعة تحت الحمراء (SPHEREx 3.0 µm)' : 'Near-Infrared (SPHEREx 3.0 µm)'}
                  </button>
                </div>
              </div>

              {/* Interactive Visualizer Canvas Box */}
              <div className="relative aspect-[16/9] w-full rounded-2xl bg-black border border-slate-700 overflow-hidden flex items-center justify-center select-none">
                {m3Mode === 'visible' ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-black">
                    {/* Background stars */}
                    <div className="absolute top-8 left-12 w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                    <div className="absolute bottom-12 right-20 w-2 h-2 rounded-full bg-cyan-200 opacity-90" />
                    <div className="absolute top-16 right-36 w-1 h-1 rounded-full bg-white opacity-60" />

                    {/* Dark Interstellar Dust Cloud blocking visible light */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-64 h-48 rounded-full bg-slate-950/95 blur-xl border border-slate-800/40 flex items-center justify-center text-center p-4">
                        <span className="text-[11px] font-mono text-slate-500">
                          {isAr ? 'سحابة غبار باردة تحجب الضوء المرئي بالكامل' : 'Cold Interstellar Dust Cloud (Visible Extinction: 100%)'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-tr from-[#050a16] via-[#09152b] to-black">
                    {/* Infrared penetration: Dust becomes transparent, glowing warm infrared emission */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-64 h-48 rounded-full bg-cyan-900/25 blur-2xl border border-cyan-500/20" />
                    </div>

                    {/* Hidden Protostar Revealed */}
                    <button
                      type="button"
                      onClick={() => {
                        gameAudio.playSuccess();
                        setM3FoundHiddenStar(true);
                      }}
                      className="relative z-20 group cursor-pointer p-4"
                      title="Click to identify newborn protostar!"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-400 animate-pulse shadow-[0_0_30px_#f59e0b] flex items-center justify-center" />
                      <span className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono font-bold text-amber-300 bg-slate-950/90 px-2 py-0.5 rounded border border-amber-500/40">
                        {m3FoundHiddenStar ? (isAr ? '✓ تم اكتشاف النجم الأولي!' : '✓ Protostar Locked!') : (isAr ? 'انقر على النجم المتخفي' : 'Click to Identify Protostar')}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MISSION 4: THE MOVING SKY MYSTERY */}
          {missionNumber === 4 && !isSuccess && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-400 font-bold uppercase">
                    {isAr ? 'محاذاة الرصدات الزمنية WCS:' : 'WCS Spatial Alignment & Sub-Pixel Offset:'}
                  </span>
                  <span className="font-mono text-amber-400">
                    Offset: {m4Offset} px {m4Offset === 0 ? (isAr ? '(محاذاة تامة ✓)' : '(Perfect Alignment ✓)') : ''}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400">-15 px</span>
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="1"
                    value={m4Offset}
                    onChange={(e) => setM4Offset(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 cursor-ew-resize"
                  />
                  <span className="text-xs font-mono text-slate-400">+15 px</span>
                </div>

                {/* Blink Comparator Simulation */}
                <div className="relative aspect-[16/9] w-full rounded-2xl bg-black border border-slate-700 flex items-center justify-center overflow-hidden">
                  <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded bg-slate-900/90 border border-slate-700 text-[10px] font-mono text-cyan-300">
                    {m4BlinkFrame === 0 ? 'Visit 1 (2025-04-28)' : 'Visit 2 (Later Epoch)'}
                  </div>

                  {/* Stationary reference stars */}
                  <div className="absolute top-12 left-16 w-2 h-2 rounded-full bg-white" style={{ transform: `translateX(${m4BlinkFrame === 1 ? m4Offset : 0}px)` }} />
                  <div className="absolute bottom-12 right-24 w-2 h-2 rounded-full bg-white" style={{ transform: `translateX(${m4BlinkFrame === 1 ? m4Offset : 0}px)` }} />

                  {/* Moving Target Star (Proper Motion) */}
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playSuccess();
                      setM4IdentifiedMotion(true);
                    }}
                    className="relative cursor-pointer p-4 group"
                    style={{
                      transform: m4BlinkFrame === 0 ? 'translate(-30px, 0px)' : 'translate(30px, 0px)',
                      transition: 'transform 0.1s ease',
                    }}
                  >
                    <div className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_15px_#f59e0b]" />
                    <span className="absolute top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-mono bg-black/80 px-1.5 py-0.5 rounded text-amber-300 border border-amber-500/40">
                      {m4IdentifiedMotion ? (isAr ? '✓ نجم ذو حركة خاصة مؤكد' : '✓ Proper Motion Star Confirmed') : (isAr ? 'انقر على النجم المتحرك' : 'Click to Target Moving Star')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MISSION 5: THE 102-BAND SECRET */}
          {missionNumber === 5 && !isSuccess && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-cyan-400 font-bold uppercase">
                  {isAr ? 'مسح الأطوال الموجية الـ 102 (0.75 إلى 5.0 µm):' : 'Sweep 102 Spectral Channels (0.75 to 5.0 µm):'}
                </span>
                <span className="font-mono text-amber-300 font-bold">
                  λ = {m5Wavelength.toFixed(2)} µm
                </span>
              </div>

              <input
                type="range"
                min="0.75"
                max="5.0"
                step="0.05"
                value={m5Wavelength}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setM5Wavelength(val);
                  if (val >= 2.95 && val <= 3.2) {
                    setM5SelectedDip('water_ice');
                  }
                }}
                className="w-full accent-amber-500 cursor-ew-resize"
              />

              {/* Simulated Spectral Curve */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Photometric Transmission Profile</span>
                  <span>{m5SelectedDip === 'water_ice' ? (isAr ? '✓ تم رصد امتصاص جليد الماء H₂O عند 3.05µm' : '✓ Water Ice H₂O Absorption Found at 3.05 µm!') : 'Searching for Absorption Feature...'}</span>
                </div>

                <div className="h-24 w-full bg-black rounded-xl p-3 flex items-end gap-1 relative overflow-hidden border border-slate-800">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const wave = 0.75 + (i / 29) * 4.25;
                    // Absorption dip near 3.05 um
                    const dip = Math.exp(-Math.pow((wave - 3.05) / 0.25, 2)) * 0.75;
                    const heightPercent = Math.max(15, (1 - dip) * 85);
                    const isCurrent = Math.abs(wave - m5Wavelength) < 0.15;
                    return (
                      <div
                        key={i}
                        style={{ height: `${heightPercent}%` }}
                        className={`flex-1 rounded-t transition-all ${
                          isCurrent ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b]' : 'bg-cyan-500/40'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* MISSION 6: THE FINAL INVESTIGATION REPORT */}
          {missionNumber === 6 && !isSuccess && (
            <div className="space-y-4">
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase block">
                {isAr ? '1. تصنيف الإشارات الفلكية واستبعاد عيوب الحساس:' : '1. Classify Signals & Reject Detector Artifacts:'}
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 0, label: 'Spike A', desc: '1-pixel Dirac delta (Cosmic Ray)' },
                  { id: 1, label: 'Streak B', desc: 'Linear smear (Gyro jitter drift)' },
                  { id: 2, label: 'Dipole C', desc: 'Adjacent + / - lobes (Asteroid)' },
                  { id: 3, label: 'Source D', desc: '2D Gaussian PSF (>7.8σ Flare)' },
                ].map((cand) => (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => {
                      gameAudio.playClick();
                      setM6SelectedCandidate(cand.id);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                      m6SelectedCandidate === cand.id
                        ? 'bg-cyan-950/80 border-cyan-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">{cand.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{cand.desc}</div>
                    <div className="text-[9px] font-mono mt-1 text-cyan-300">
                      {m6Classifications[cand.id] ? m6Classifications[cand.id].toUpperCase() : 'PENDING'}
                    </div>
                  </button>
                ))}
              </div>

              {/* Candidate Decision Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    setM6Classifications({ ...m6Classifications, [m6SelectedCandidate]: 'artifact' });
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    m6Classifications[m6SelectedCandidate] === 'artifact'
                      ? 'bg-rose-950/80 border-rose-400 text-rose-200'
                      : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}
                >
                  {isAr ? 'استبعاد كأثر زائف (Artifact)' : 'Reject as Artifact'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick();
                    const tag = m6SelectedCandidate === 2 ? 'moving_object' : 'true_transient';
                    setM6Classifications({ ...m6Classifications, [m6SelectedCandidate]: tag });
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    m6Classifications[m6SelectedCandidate] === 'moving_object' || m6Classifications[m6SelectedCandidate] === 'true_transient'
                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                      : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}
                >
                  {m6SelectedCandidate === 2
                    ? (isAr ? 'تأكيد كجرم متحرك (كويكب)' : 'Confirm Moving Object')
                    : (isAr ? 'تأكيد كإشارة فلكية حقيقية' : 'Confirm True Astronomical Signal')}
                </button>
              </div>

              {/* Final Verdict Radio */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-xs font-mono text-amber-400 font-bold uppercase block">
                  {isAr ? '2. التشخيص الفيزيائي النهائي للتقرير:' : '2. Final Astrophysical Verdict:'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playClick();
                      setM6Diagnosis('fu_orionis');
                    }}
                    className={`p-3 rounded-xl border text-xs text-left transition cursor-pointer ${
                      m6Diagnosis === 'fu_orionis'
                        ? 'bg-amber-950/80 border-amber-400 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-bold">{isAr ? 'ثوران تراكمي لنجم أولي (FU Orionis)' : 'FU Orionis Protostellar Accretion Outburst'}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{isAr ? 'تسارع تراكم المادة من القرص النجمي الأولي' : 'Runaway disk accretion onto protostar (Δm > 4 mag)'}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playClick();
                      setM6Diagnosis('supernova');
                    }}
                    className={`p-3 rounded-xl border text-xs text-left transition cursor-pointer ${
                      m6Diagnosis === 'supernova'
                        ? 'bg-slate-800 border-slate-600 text-slate-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-bold">{isAr ? 'مستعر أعظم كوني (Supernova)' : 'Thermonuclear Supernova'}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{isAr ? 'انفجار قزم أبيض بالكامل' : 'Cataclysmic stellar disruption'}</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {isSuccess && (
            <div className="p-6 rounded-3xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white font-['Outfit']">
                  {isAr ? 'اكتملت المهمة بنجاح!' : 'Mission Completed Successfully!'}
                </h3>
                <p className="text-xs text-emerald-200/90 mt-1 font-mono">
                  {isAr 
                    ? `تم تسجيل التحليل العلمي في سجل الملاحة الفضائية الخاص بالمحقق ${cadetName}.`
                    : `Scientific telemetry registered in the cosmic logbook for Investigator ${cadetName}.`}
                </p>
              </div>

              {missionNumber === 6 && (
                <div className="p-5 rounded-2xl bg-[#070b16] border-2 border-amber-400/50 text-left max-w-lg mx-auto shadow-2xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Award className="w-5 h-5" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider">
                      NASA SPACE APPS CHALLENGE 2026 • SPEX CERTIFICATION
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {isAr 
                      ? `بموجبه يُمنح المحقق (${cadetName}) وسام شرف التحقيق في تغيرات السماء واكتشاف ثوران FU Orionis النجمي بالأشعة تحت الحمراء.`
                      : `Hereby certifies that Investigator (${cadetName}) has mastered 102-band infrared transient discovery, distinguished true astrophysical signals from sensor artifacts, and diagnosed FU Orionis protostellar accretion.`}
                  </p>
                  <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-cyan-400">
                    <span>Rank: Lead Space Investigator</span>
                    <span>SPHEREx QR2 Certified</span>
                  </div>
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
          <div className="text-[11px] text-slate-400 font-mono">
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
                  if (missionNumber === 6) handleMission6Submit();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-2 transition cursor-pointer active:scale-95"
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
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 transition cursor-pointer active:scale-95"
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
