import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  HelpCircle,
  ExternalLink,
  X,
  Send,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { Language, translations } from '../../utils/translations';
import {
  SPEX_HERO_IMAGE,
  SPEX_WAVING_HERO,
  SPEX_AVATAR_GREETING,
  SPEX_AVATAR_INVESTIGATOR,
  SPEXMood,
} from '../../spex/spexAssets';
import { CandidateDetection, InvestigationResult } from '../../science/types';

export interface SpexContextualGuideProps {
  currentResult: InvestigationResult | null;
  activeLens: 'time' | 'colors' | 'doubt' | 'neighbors' | null;
  currentFrameIdx: number;
  isCurtainActive: boolean;
  selectedCandidate: CandidateDetection | null;
  selectedFlagPixel: { x: number; y: number; flag: number } | null;
  language: Language;
  onOpenScientistMode: () => void;
  className?: string;
}

export const SpexContextualGuide: React.FC<SpexContextualGuideProps> = ({
  currentResult,
  activeLens,
  currentFrameIdx,
  isCurtainActive,
  selectedCandidate,
  selectedFlagPixel,
  language,
  onOpenScientistMode,
  className = '',
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];

  // 3-Level Progressive Disclosure State:
  // Level 1: Simple 1-sentence headline (always visible)
  // Level 2: Expanded context (toggleable)
  // Level 3: Deep scientific parameters (links to Scientist Mode)
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatQuestion, setChatQuestion] = useState<string>('');
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Compute Context-Aware 3-Layer Messages based on active state
  const guidance = useMemo(() => {
    // Priority 1: Suspicious DQ Flag selected in DOUBT lens
    if (selectedFlagPixel) {
      const isOverflow = (selectedFlagPixel.flag & 0x02) !== 0;
      const isTransient = (selectedFlagPixel.flag & 0x01) !== 0;

      return {
        mood: 'sassy' as SPEXMood,
        level1: isRtl
          ? `حاسب هنا! البكسل ده سجل علامة جودة (${isOverflow ? 'تشبع مستشعر' : 'أشعة كونية'})!`
          : `Watch out! This pixel carries an instrument flag (${isOverflow ? 'sensor saturation' : 'cosmic ray transient'}).`,
        level2: isRtl
          ? 'قناع الجودة SPHEREx DQ بيسجل أي بكسل استقبل فوتونات زيادة عن طاقته أو اصطدم بيه جسيم كوني عالي الطاقة عشان نفرق بين الشوائب والتغير الفلكي الحقيقي.'
          : 'The SPHEREx Data Quality mask records pixels that received excessive charge or got struck by high-energy cosmic rays, ensuring artifacts are not mistaken for cosmic transients.',
        level3Metric: `Flag: 0x${selectedFlagPixel.flag.toString(16).toUpperCase()} at (${selectedFlagPixel.x}, ${selectedFlagPixel.y})`,
      };
    }

    // Priority 2: Candidate selected
    if (selectedCandidate) {
      const isKnown = selectedCandidate.status === 'Likely known source';
      const isArtifact = selectedCandidate.status === 'Possible artifact';

      if (isArtifact) {
        return {
          mood: 'sassy' as SPEXMood,
          level1: isRtl
            ? 'المرشح ده تم استبعاده كشائبة ضوئية بسبب تشبع الكاشف.'
            : 'This detection was flagged as an instrument artifact due to pixel saturation.',
          level2: isRtl
            ? 'فحص ثنائي القطب وقناع الجودة استبعدوا هذا الجرم لأنه غير متطابق مع شكل الحيود النجمي الطبيعي.'
            : 'Dipole profile checks and FITS DQ bits verified this spike is caused by pointing jitter or sensor saturation rather than astronomical variability.',
          level3Metric: `Status: Artifact · Peak: ${selectedCandidate.peakSignificance.toFixed(1)}σ · DQ: ${selectedCandidate.artifactFlags?.join(', ') || 'Saturation'}`,
        };
      }

      if (isKnown) {
        const match = selectedCandidate.catalogMatches?.[0];
        return {
          mood: 'eureka' as SPEXMood,
          level1: isRtl
            ? `لقينا جرم فلكي مسجل سابقًا (${match?.catalog || 'Gaia DR3'}) يتطابق مع هذا الموضع!`
            : `A known astronomical catalog source (${match?.catalog || 'Gaia DR3'}) matches this position!`,
          level2: isRtl
            ? `مطابقة الموضع الفلكي أكدت وجود هذا الجرم على بُعد ${match?.separationArcsec.toFixed(2)}″ ثانية قوسية بدقة قياس متناهية.`
            : `Cross-matching confirmed an existing reference source within ${match?.separationArcsec.toFixed(2)}″, validating the astrometric pointing of this observation.`,
          level3Metric: `Catalog: ${match?.catalog} (${match?.identifier || 'Gaia Source'}) · Separation: ${match?.separationArcsec.toFixed(2)}″ · Significance: ${selectedCandidate.peakSignificance.toFixed(1)}σ`,
        };
      }

      return {
        mood: 'eureka' as SPEXMood,
        level1: isRtl
          ? `رصدنا مرشحًا يظهر فارقًا ضوئيًا واضحًا بدلالة إحصائية ${selectedCandidate.peakSignificance.toFixed(1)}σ!`
          : `Detected a candidate with significant flux variation at ${selectedCandidate.peakSignificance.toFixed(1)}σ!`,
        level2: isRtl
          ? 'المرشح يظهر تغيرًا في التدفق الضوئي مع جناحي حيود نجميين سليمين، مما يجعله هدفًا جادًا للمتابعة العلمية.'
          : 'This source exhibits distinct flux excess with nominal PSF wings, making it a compelling candidate for temporal astrophysics.',
        level3Metric: `Candidate: ${selectedCandidate.id} · Significance: ${selectedCandidate.peakSignificance.toFixed(1)}σ · ΔF: ${selectedCandidate.deltaFlux?.toFixed(2) || '0.00'} MJy/sr`,
      };
    }

    // Priority 3: Curtain Mode Active
    if (isCurtainActive) {
      return {
        mood: 'explaining' as SPEXMood,
        level1: isRtl
          ? 'اسحب المقبض يمينًا ويسارًا لمقارنة نفس البقعة الفلكية قبل وبعد!'
          : 'Drag the handle across to compare the exact same sky patch before and after!',
        level2: isRtl
          ? 'كلا الصورتين تتشاركان نفس شبكة الإحداثيات الدقيقة ومستوى التباين، مما يجعل أي حركة أو وميض يظهر بوضوح فوري.'
          : 'Both visits share the identical coordinate grid and intensity scaling, allowing rapid visual verification of any shifting source.',
        level3Metric: `Astrometric grid aligned via TAN-SIP WCS · Zero-scale normalized`,
      };
    }

    // Priority 4: Active Lens Guidance
    if (activeLens === 'time') {
      return {
        mood: 'explaining' as SPEXMood,
        level1: isRtl
          ? 'أنت تتنقل الآن بين لقطات حقيقية التقطها تلسكوب SPHEREx بفارق دقيقتين فقط!'
          : "You're scrubbing through real SPHEREx exposures taken 2.1 minutes apart!",
        level2: isRtl
          ? 'هذا الفاصل الزمني القصير يتيح لنا رصد الأجرام فائقة السرعة كنجم بارنارد ومعايرة استقرار السماء دون الخلط مع التغيرات طويلة الأمد.'
          : 'This short intra-visit cadence reveals rapid proper motion (like Barnard’s Star) and confirms telescope stability without misattributing seasonal shifts.',
        level3Metric: `Visit 1 vs Visit 2: 128.9s cadence · Integration: 115.1s`,
      };
    }

    if (activeLens === 'colors') {
      return {
        mood: 'explaining' as SPEXMood,
        level1: isRtl
          ? 'الأشعة تحت الحمراء تخترق الغبار الكوني وتكشف الأجرام الباردة المستترة.'
          : 'Infrared light penetrates cosmic dust clouds to unveil hidden cool worlds.',
        level2: isRtl
          ? 'تلسكوب SPHEREx يمسح السماء عبر 102 قناة طيفية؛ كل نطاق طيفي يكشف تركيزات جليد الماء والميثان وأغلفة الكواكب.'
          : 'SPHEREx maps the universe across 102 spectral channels; each band isolates key spectral signatures like methane and water ice.',
        level3Metric: `Wavelength: 0.75 – 5.0 µm · Calibrated linear flux in MJy/sr`,
      };
    }

    if (activeLens === 'doubt') {
      return {
        mood: 'sassy' as SPEXMood,
        level1: isRtl
          ? 'العلماء الحقيقيون يشككون أولاً: هل هو وميض كوني أم مجرد عيب في المستشعر؟'
          : 'Real astronomers check for glitches first: is it a cosmic event or detector noise?',
        level2: isRtl
          ? 'قناع الجودة يفحص كل بكسل بحثًا عن التشبع الضوئي وضربات الأشعة الكونية لتفادي البلاغات الكاذبة.'
          : 'The data quality mask flags cosmic ray hits and overflow pixels so you never publish a sensor artifact as a new discovery.',
        level3Metric: `Bitmask HDU 2: 0x02 Overflow, 0x01 Transient, 0x80000 Outlier`,
      };
    }

    if (activeLens === 'neighbors') {
      return {
        mood: 'explaining' as SPEXMood,
        level1: isRtl
          ? 'نطابق مواضع النجوم مع كتالوجات غايا ووايز للتأكد مما كان معروفًا من قبل.'
          : 'We cross-match detected positions against Gaia DR3 and AllWISE references.',
        level2: isRtl
          ? 'الأجرام المحاطة بدائرة زرقاء مسجلة وموثقة بالفعل، بينما الأجرام بدون تطابق قد تمثل اكتشافات جديدة.'
          : 'Reticled sources are confirmed stellar neighbors; uncataloged candidates warrant automated follow-up investigation.',
        level3Metric: `Astrometric matching cone radius: 3.5 arcsec`,
      };
    }

    // Default Baseline
    return {
      mood: 'greeting' as SPEXMood,
      level1: isRtl
        ? 'أهلاً بك في مرصد SPHEREx! استكشف السماء باستخدام العدسات الأربع في الأسفل.'
        : 'Welcome to SPHEREx Observatory! Explore the infrared sky using the four lenses below.',
      level2: isRtl
        ? 'اضغط على عدسة الزمن لمقارنة اللقطات، أو ألوان الأشعة تحت الحمراء، أو فحص الشك والكتالوجات.'
        : 'Tap the Time lens to compare visits, explore infrared spectral colors, or inspect detector flags and catalogs.',
      level3Metric: `NASA/IPAC SPHEREx Public Archive (DR1 / QR3 / QR2, weekly updates)`,
    };
  }, [
    activeLens,
    currentFrameIdx,
    isCurtainActive,
    selectedCandidate,
    selectedFlagPixel,
    isRtl,
  ]);

  // Handle Quick Question to SPEX
  const handleAskQuickQuestion = async (q: string) => {
    setChatQuestion(q);
    setIsChatLoading(true);
    setChatResponse(null);

    try {
      const res = await fetch('/api/spex/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          language,
          evidence: currentResult?.evidence,
          context: {
            activeLens,
            caseId: currentResult?.caseId,
            targetName: currentResult?.title,
            selectedCandidate: selectedCandidate ? selectedCandidate.id : null,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatResponse(data.reply || 'All systems nominal.');
      } else {
        throw new Error('Chat API returned status ' + res.status);
      }
    } catch {
      // Grounded offline fallback
      if (isRtl) {
        setChatResponse(
          'أنا هنا لمساعدتك! التعريضان مأخوذان بفارق دقيقتين بدقة قياس عالية للأشعة تحت الحمراء لتحديد التغيرات الحقيقية واستبعاد عيوب الأجهزة.'
        );
      } else {
        setChatResponse(
          'The two exposures are separated by ~2.1 minutes in calibrated infrared, enabling precise proper motion tracking while ruling out detector saturation artifacts.'
        );
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <>
      <div
        className={`bg-[#0C0E14]/90 backdrop-blur-xl border border-white/15 rounded-2xl p-3 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.85)] max-w-sm sm:max-w-md w-full transition-all duration-300 ${className}`}
      >
        <div className="flex items-start gap-3">
          {/* SPEX Cat Avatar */}
          <div className="relative shrink-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#FFB900]/20 to-[#00D3F3]/20 border border-[#FFB900]/40 p-1 flex items-center justify-center shadow-[0_0_16px_rgba(255,185,0,0.25)]">
              <img
                src={SPEX_AVATAR_GREETING}
                alt="SPEX Cat Guide"
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0C0E14]" />
          </div>

          {/* 3-Level Guidance Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-mono font-bold text-[#FFB900] tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                <span>SPEX AI COMPANION</span>
              </span>
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="text-[10px] font-mono text-[#00D3F3] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <MessageCircle className="w-3 h-3" />
                <span>{isRtl ? 'اسأل سبيكس' : 'Ask Question'}</span>
              </button>
            </div>

            {/* LEVEL 1: Simple Headline */}
            <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-snug">
              {guidance.level1}
            </p>

            {/* LEVEL 2: Context Explanation (Expandable) */}
            {isExpanded && (
              <div className="mt-2 pt-2 border-t border-white/10 text-xs text-slate-300 leading-relaxed animate-fade-in">
                <p>{guidance.level2}</p>
                <div className="mt-1.5 text-[10px] font-mono text-[#00D3F3]">
                  {guidance.level3Metric}
                </div>
              </div>
            )}

            {/* Action Bar: Toggle Level 2 / Open Scientist Mode */}
            <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 transition cursor-pointer"
              >
                <span>{isExpanded ? (isRtl ? 'إخفاء الشرح' : 'Less') : (isRtl ? 'افهم المزيد' : 'Learn More')}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              <button
                type="button"
                onClick={onOpenScientistMode}
                className="text-[11px] font-mono font-semibold text-[#FFB900] hover:text-amber-300 flex items-center gap-1 transition cursor-pointer"
              >
                <span>{isRtl ? 'استكشف العلم (وضع العلماء)' : 'Explore the science'}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK QUESTION POPUP MODAL */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0C0E14] border border-[#FFB900]/40 rounded-2xl shadow-2xl p-5 overflow-hidden space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <img src={SPEX_AVATAR_INVESTIGATOR} alt="SPEX Investigator" className="w-7 h-7 object-contain" />
                <h3 className="font-mono text-sm font-bold text-slate-100">
                  {isRtl ? 'حوار فلكي مع سبيكس' : 'Astronomical Inquiry with SPEX'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                {isRtl ? 'أسئلة مقترحة سريعة:' : 'SUGGESTED QUESTIONS:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  isRtl ? 'ليه الرصدتين بفارق دقيقتين بس؟' : 'Why are the exposures 2 minutes apart?',
                  isRtl ? 'يعني إيه ألوان كاذبة في الأشعة تحت الحمراء؟' : 'What does false color mean in infrared?',
                  isRtl ? 'إزاي نتأكد إنه مش عيب في الكاشف؟' : 'How do we know this is not a detector glitch?',
                ].map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAskQuickQuestion(q)}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#FFB900]/20 hover:text-[#FFB900] text-slate-300 border border-white/10 transition cursor-pointer text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Response Display */}
            {isChatLoading && (
              <div className="flex items-center gap-2 p-3 bg-black/40 rounded-xl border border-white/5 text-xs text-amber-300 font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-[#FFB900]" />
                <span>{isRtl ? 'سبيكس يحلل القياسات الفلكية...' : 'SPEX is analyzing astronomical evidence...'}</span>
              </div>
            )}

            {chatResponse && !isChatLoading && (
              <div className="p-3 bg-black/50 rounded-xl border border-[#FFB900]/30 text-xs text-slate-200 leading-relaxed font-sans space-y-2 animate-fade-in">
                <div className="flex items-center gap-2 text-[10px] font-mono text-[#FFB900] font-bold uppercase">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تفسير سبيكس العلمي' : 'SPEX VERDICT'}</span>
                </div>
                <p>{chatResponse}</p>
              </div>
            )}

            {/* Custom Question Input */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <input
                type="text"
                placeholder={isRtl ? 'اكتب سؤالك الفلكي لسبيكس...' : 'Type a question about this sky image...'}
                value={chatQuestion}
                onChange={(e) => setChatQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && chatQuestion.trim()) {
                    handleAskQuickQuestion(chatQuestion);
                  }
                }}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#FFB900]"
              />
              <button
                type="button"
                onClick={() => chatQuestion.trim() && handleAskQuickQuestion(chatQuestion)}
                disabled={isChatLoading || !chatQuestion.trim()}
                className="p-2 rounded-xl bg-[#FFB900] hover:bg-amber-400 text-slate-950 font-bold transition disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
