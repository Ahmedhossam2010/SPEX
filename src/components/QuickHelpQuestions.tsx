import React, { useState } from 'react';
import { HelpCircle, ChevronRight, X, MessageSquare, Sparkles } from 'lucide-react';
import { SPEX_ASSETS, SPEXMood } from '../spex/spexAssets';
import { InvestigationResult, CandidateDetection } from '../science/types';
import { Language } from '../utils/translations';

interface QuickHelpQuestionsProps {
  currentResult: InvestigationResult | null;
  selectedCandidate: CandidateDetection | null;
  viewMode: string;
  language: Language;
  onAskSpex?: (question: string) => void;
}

interface PredefinedQuestion {
  id: string;
  questionEn: string;
  questionAr: string;
  mood: SPEXMood;
  getAnswer: (result: InvestigationResult | null, candidate: CandidateDetection | null, viewMode: string, isAr: boolean) => string;
}

export const QuickHelpQuestions: React.FC<QuickHelpQuestionsProps> = ({
  currentResult,
  selectedCandidate,
  viewMode,
  language,
  onAskSpex,
}) => {
  const isAr = language === 'ar';
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const questions: PredefinedQuestion[] = [
    {
      id: 'what-am-i-looking-at',
      questionEn: 'What am I looking at?',
      questionAr: 'ما الذي أشاهده هنا؟',
      mood: 'greeting',
      getAnswer: (res, _, vm, ar) => {
        if (!res) {
          return ar
            ? 'أنت تشاهد مرصد SPHEREx الفضائي التابع لناسا، الذي يمسح سماء الكون بالكامل في 102 حزمة ضوئية تحت حمراء لاكتشاف التغيرات الزمنية.'
            : 'You are viewing NASA’s SPHEREx space observatory, surveying the entire sky across 102 infrared bands to discover how the universe changes over time.';
        }
        return ar
          ? `أنت تشاهد رقعة حقيقية من السماء في أرشيف SPHEREx العام (DR1 / QR3 / QR2، تحديثات أسبوعية) عند (RA ${res.targetCoords.ra.toFixed(2)}°، Dec ${res.targetCoords.dec.toFixed(2)}°). الصورة تعرض ${vm === 'difference' ? 'صورة الفرق (ما تغير فقط)' : vm === 'epoch1' ? 'الرصدة الأولى' : vm === 'epoch2' ? 'الرصدة الثانية' : 'قوة الإشارة الإحصائية'}.`
          : `You are looking at a real patch of sky from the SPHEREx public archive (DR1 / QR3 / QR2, weekly updates) at (RA ${res.targetCoords.ra.toFixed(2)}°, Dec ${res.targetCoords.dec.toFixed(2)}°). The canvas is currently showing the ${vm === 'difference' ? 'difference image (what changed only)' : vm === 'epoch1' ? 'first snapshot' : vm === 'epoch2' ? 'second snapshot' : 'statistical significance map'}.`;
      },
    },
    {
      id: 'what-is-infrared-light',
      questionEn: 'What is infrared light?',
      questionAr: 'ما هو الضوء تحت الأحمر؟',
      mood: 'explaining',
      getAnswer: (_, __, ___, ar) => {
        return ar
          ? 'الضوء تحت الأحمر هو نوع من الضوء لا تراه عيوننا لكننا نشعر به كحرارة. موجاته الطويلة تعبر بسهولة عبر سحب الغبار الكوني، مما يسمح لتلسكوب SPHEREx برؤية النجوم والكواكب المتخفية خلف الغبار!'
          : 'Infrared light is electromagnetic radiation invisible to our eyes but felt as heat. Its longer wavelengths pass straight through cosmic dust clouds that block visible light, revealing hidden stars and cool objects!';
      },
    },
    {
      id: 'what-does-this-image-show',
      questionEn: 'What does this image show?',
      questionAr: 'ماذا تعرض هذه الصورة تحديداً؟',
      mood: 'thinking',
      getAnswer: (res, _, vm, ar) => {
        if (!res) return ar ? 'اختر هدفاً من القائمة لرؤية بياناته.' : 'Select a target from the list to see its data.';
        if (vm === 'difference') {
          return ar
            ? 'هذه صورة الفرق: قمنا بطرح الرصدة الأولى من الثانية. النجوم الثابتة تم إلغاؤها وأصبحت صفراً، والأشياء المضيئة هنا هي أجرام توهجت أو تحركت خلال هذا الفاصل الزمني!'
            : 'This is the difference image: we subtracted the earlier snapshot from the later snapshot. Everything that remained static vanished to zero; bright spots show objects that flared or moved!';
        }
        if (vm === 'significance') {
          return ar
            ? 'هذه خريطة قوة الإشارة (السيجما σ). تعرض كل بكسل مقسوماً على نسبة الضوضاء والخطأ. الإشارات فوق 5.0σ تعتبر اكتشافات فلكية حقيقية وليست مجرد تشويش.'
            : 'This is the signal-to-noise significance map (σ). Every pixel is scaled against detector noise. Signals ≥ 5.0σ represent genuine astronomical detections rather than random instrumental noise.';
        }
        return ar
          ? `هذه صورة رصدة فلكية ملتقطة بواسطة SPHEREx في تاريخ ${res.epoch1.metadata.date_obs || '2025-04-28'}. السطوع يقاس بوحدة سطحية حقيقية (MJy/sr).`
          : `This is a calibrated SPHEREx infrared science exposure captured on ${res.epoch1.metadata.date_obs || '2025-04-28'}. Brightness is measured in physical surface brightness units (MJy/sr).`;
      },
    },
    {
      id: 'why-are-there-two-pictures',
      questionEn: 'Why are there two pictures?',
      questionAr: 'لماذا توجد صورتان (رصدتان)؟',
      mood: 'explaining',
      getAnswer: (res, _, __, ar) => {
        const date1 = res?.epoch1.metadata.date_obs || 'Visit 1';
        const date2 = res?.epoch2.metadata.date_obs || 'Visit 2';
        return ar
          ? `لأن الكون يتغير عبر الزمن! نحتاج إلى صورة مبكرة (${date1}) وصورة لاحقة (${date2}) للمقارنة بينهما واكتشاف هل ظهر كويكب جديد أو اشتعل وميض نجمي.`
          : `Because the universe is dynamic! We need an earlier snapshot (${date1}) and a later snapshot (${date2}) to compare them and detect whether an asteroid traversed the field or a star brightened.`;
      },
    },
    {
      id: 'what-changed',
      questionEn: 'What changed in this field?',
      questionAr: 'ما الذي تغير في هذا الحقل؟',
      mood: 'discovery',
      getAnswer: (res, cand, _, ar) => {
        if (!res) return ar ? 'اختر هدفاً لاستعراض التغيرات.' : 'Select a target to see changes.';
        const n = res.candidates?.length || 0;
        const top = cand || res.candidates?.[0];
        if (n === 0) {
          return ar
            ? 'لم نرصد أي تغير ذي دلالة إحصائية في هذا الحقل. السماء هنا مستقرة وثابتة تماماً وتطابق الضوضاء الطبيعية للتلسكوب.'
            : 'No statistically significant change was detected in this field. The sky here is stable and consistent with the telescope noise floor.';
        }
        if (top?.status === 'Possible artifact') {
          return ar
            ? `اكتشفنا إشارة قوية لكنها ناتجة عن خلل تقني في الحساس (أشعة كونية أو تشبع). قمنا بتحديدها (${top.id}) واستبعادها كعيب حساس.`
            : `Detected a signal, but it was flagged as an instrumental artifact (cosmic ray or detector saturation). It was filtered out to ensure scientific integrity.`;
        }
        return ar
          ? `رصدنا ${n} تغير(ات) مرشح(ة)! المرشح الأبرز (${top?.id || 'CAND-01'}) أظهر تغير تدفق بمستوى تأكيد إحصائي بلغ ${top?.peakSignificance?.toFixed(1) || '5.0'}σ.`
          : `Detected ${n} candidate change(s)! Top candidate ${top?.id || 'CAND-01'} exhibits a flux residual confirmed at ${top?.peakSignificance?.toFixed(1) || '5.0'}σ significance.`;
      },
    },
    {
      id: 'what-is-a-candidate',
      questionEn: 'What is a candidate?',
      questionAr: 'ما هو المرشح الفلكي (Candidate)؟',
      mood: 'curious',
      getAnswer: (_, cand, __, ar) => {
        const id = cand ? ` (${cand.id})` : '';
        return ar
          ? `المرشح${id} هو بقعة ضوئية في صورة الفرق تجاوزت حد التأكيد الإحصائي (5.0σ). نسميه "مرشحاً" لأننا علماء حذرون: لا نعلن اكتشافاً مؤكداً حتى نتأكد أنه ليس عيباً في الحساس ونطابقه مع الكتالوجات الفلكية!`
          : `A candidate${id} is a localized flux difference exceeding our statistical threshold (5.0σ). We call it a "candidate" out of scientific honesty: we never claim a confirmed discovery until verifying it isn't an artifact!`;
      },
    },
    {
      id: 'why-cant-i-compare-these-observations',
      questionEn: "Why can't I compare some observations?",
      questionAr: 'لماذا لا يمكن مقارنة بعض الرصدات أحياناً؟',
      mood: 'investigator',
      getAnswer: (res, _, __, ar) => {
        if (res?.compatibility && !res.compatibility.isCompatible) {
          return ar
            ? `سبب عدم التوافق هنا: ${res.compatibility.reason || 'اختلاف النطاقات الطيفية'}. لا يجوز فيزيائياً طرح صور ملتقطة بأطوال موجية مختلفة (مثلاً 0.93µm ضد 3.12µm) لأن الفرق سيعكس لون النجوم لا تغيرها الزمني!`
            : `Incompatibility reason: ${res.compatibility.reason || 'spectral band mismatch'}. Mathematically subtracting exposures from different infrared bands measures spectral color slope, not temporal variability!`;
        }
        return ar
          ? 'تتطلب المقارنة العلمية الصحيحة رصدتين من نفس النطاق الطيفي الأشعة تحت الحمراء ونفس المعايرة المكانية. إذا كانت التغطية مفقودة أو النطاقات مختلفة، يمنع النظام الطرح لحماية النزاهة العلمية.'
          : 'Valid scientific differencing requires observations in matching infrared channels and registered spatial coordinates. If bands mismatch or coverage is missing, differencing is guarded to prevent misleading results.';
      },
    },
    {
      id: 'what-do-these-numbers-mean',
      questionEn: 'What do these numbers mean?',
      questionAr: 'ماذا تعني هذه الأرقام الفلكية؟',
      mood: 'serious',
      getAnswer: (res, cand, _, ar) => {
        const sig = cand?.peakSignificance ? `${cand.peakSignificance.toFixed(1)}σ` : '5.0σ';
        const flux = cand?.deltaFlux ? `${cand.deltaFlux.toFixed(2)} MJy/sr` : 'MJy/sr';
        return ar
          ? `الأرقام تقيس الفيزياء: RA و Dec هما إحداثيات المكان في السماء. السيجما (${sig}) تقيس مدى تأكيدنا الإحصائي. وحدة MJy/sr (${flux}) تقيس كمية الطاقة الضوئية التي استقبلها التلسكوب.`
          : `These numbers measure physical reality: RA and Dec are celestial coordinates. Sigma (${sig}) measures statistical certainty against noise. MJy/sr (${flux}) measures the calibrated surface brightness received by SPHEREx.`;
      },
    },
  ];

  const activeQuestion = questions.find((q) => q.id === activeQuestionId);

  return (
    <div
      className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] p-4 sm:p-5 shadow-sm space-y-3.5"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
              {isAr ? 'اسأل SPEX: أسئلة شائعة وفهم النتائج' : 'Ask SPEX: Instant Understanding'}
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              {isAr ? 'إجابات علمية سريعة ومبسطة لأي مبتدئ' : 'Short, verified explanations in plain language'}
            </span>
          </div>
        </div>

        {activeQuestion && (
          <button
            type="button"
            onClick={() => setActiveQuestionId(null)}
            className="text-xs font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            {isAr ? 'إغلاق الإجابة' : 'Close answer'}
          </button>
        )}
      </div>

      {/* 8 Instant Question Chips */}
      <div className="flex flex-wrap gap-2">
        {questions.map((q) => {
          const isActive = activeQuestionId === q.id;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                const next = isActive ? null : q.id;
                setActiveQuestionId(next);
                if (next && onAskSpex) {
                  onAskSpex(isAr ? q.questionAr : q.questionEn);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border flex items-center gap-1.5 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:border-amber-400/50'
              }`}
            >
              <MessageSquare className="w-3 h-3 text-amber-500" />
              <span>{isAr ? q.questionAr : q.questionEn}</span>
            </button>
          );
        })}
      </div>

      {/* Answer Display with Authentic Cat Reaction */}
      {activeQuestion && (
        <div className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-amber-500/30 flex items-start gap-3.5 animate-in fade-in">
          <img
            src={SPEX_ASSETS[activeQuestion.mood]?.imagePath || SPEX_ASSETS.explaining.imagePath}
            alt="SPEX Reaction"
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
          />
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                SPEX ({activeQuestion.mood}):
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {isAr ? 'إجابة مبسطة وموثقة' : 'Verified Plain Explanation'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {activeQuestion.getAnswer(currentResult, selectedCandidate, viewMode, isAr)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
