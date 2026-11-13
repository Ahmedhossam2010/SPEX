import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Sparkles, Compass, Share2, ArrowRight, Snowflake, Activity } from 'lucide-react';
import { Language, translations } from '../../utils/translations';

export type ExplorerMissionId = 'motion' | 'brown_dwarf' | 'noise_check';

export interface TargetActionProgress {
  played: boolean;
  diffShown: boolean;
  spotOrSpex: boolean;
}

export interface ExplorerMissionsProps {
  language: Language;
  activeCaseId: string;
  progressByCase: Record<string, TargetActionProgress>;
  onSelectTargetCase: (caseId: string) => void;
  onOpenPostcard: () => void;
  canOpenPostcard: boolean;
}

interface MissionSpec {
  id: ExplorerMissionId;
  milestoneId: string;
  acceptedCaseIds: string[];
  defaultCaseId: string;
  icon: React.ComponentType<{ className?: string }>;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  jumpLabelEn: string;
  jumpLabelAr: string;
  step1En: string;
  step1Ar: string;
  step2En: string;
  step2Ar: string;
  step3En: string;
  step3Ar: string;
  learnedEn: [string, string, string];
  learnedAr: [string, string, string];
}

const MISSIONS: MissionSpec[] = [
  {
    id: 'motion',
    milestoneId: 'comparing_observations',
    acceptedCaseIds: ['case-barnards-star', 'case-epsilon-indi'],
    defaultCaseId: 'case-barnards-star',
    icon: Sparkles,
    titleEn: 'Catch a moving star',
    titleAr: 'اصطد نجماً متحركاً',
    summaryEn: 'Watch a fast neighbor shift across months of real NASA sky frames.',
    summaryAr: 'شاهد نجماً جاراً سريعاً يغير مكانه عبر شهور من صور ناسا الحقيقية.',
    jumpLabelEn: "Go to Barnard's Star",
    jumpLabelAr: 'انتقل إلى نجم برنارد',
    step1En: "Pick Barnard's Star or Epsilon Indi above",
    step1Ar: 'اختر نجم برنارد أو إبسيلون إندي من الأعلى',
    step2En: 'Press Play the sky or Show what changed',
    step2Ar: 'اضغط شغّل السماء أو اعرض ما تغير',
    step3En: 'Tap the star on the image or press Ask SPEX',
    step3Ar: 'اضغط على النجم في الصورة أو اضغط اسأل سبيكس',
    learnedEn: [
      'Nearby stars drift slightly across months while faraway background stars stay still.',
      'Playing frames like a flipbook or showing changes makes small shifts easier to notice.',
      'Very bright stars can flood the camera center, so SPHEREx flags lower-confidence frames honestly.',
    ],
    learnedAr: [
      'النجوم القريبة تنزاح قليلاً عبر الشهور بينما تبقى النجوم البعيدة في الخلفية ثابتة.',
      'تشغيل الإطارات أو عرض ما تغير يجعل ملاحظة الانتقالات الصغيرة أسهل.',
      'النجوم الشديدة السطوع قد تملأ وسط الكاميرا، لذا يوضح سبيراكس متى تقل الثقة بصدق.',
    ],
  },
  {
    id: 'brown_dwarf',
    milestoneId: 'infrared_light',
    acceptedCaseIds: ['case-wise-0855'],
    defaultCaseId: 'case-wise-0855',
    icon: Snowflake,
    titleEn: 'Meet a freezing brown dwarf',
    titleAr: 'تعرّف على قزم بني متجمد',
    summaryEn: 'Explore WISE 0855 — colder than an ice cube, glowing faintly in infrared.',
    summaryAr: 'استكشف WISE 0855 — أبرد من مكعب ثلج ويشع بخفوت في الأشعة تحت الحمراء.',
    jumpLabelEn: 'Go to WISE 0855',
    jumpLabelAr: 'انتقل إلى WISE 0855',
    step1En: 'Pick WISE 0855 above',
    step1Ar: 'اختر WISE 0855 من الأعلى',
    step2En: 'Press Play the sky or Show what changed',
    step2Ar: 'اضغط شغّل السماء أو اعرض ما تغير',
    step3En: 'Tap the center spot or ask SPEX "Is it really moving?"',
    step3Ar: 'اضغط على البقعة الوسطى أو اسأل سبيكس: هل يتحرك فعلاً؟',
    learnedEn: [
      'WISE 0855 is so cold (~250 K) that ordinary visible-light cameras barely see it.',
      'SPHEREx infrared eyes detect its faint heat glow across wavelengths.',
      'Its shift between passes is tiny and below 3 sigma here, so we show where motion is expected instead of overclaiming.',
    ],
    learnedAr: [
      'الجرم WISE 0855 بارد جداً (~250 كلفن) لدرجة أن كاميرات الضوء المرئي بالكاد تراه.',
      'عيون سبيراكس تحت الحمراء تلتقط توهجه الحراري الخافت.',
      'انزياحه في هذه اللقطات صغير وأقل من 3 سيجما، لذا نعرض موقعه المتوقع دون ادعاء قياس غير مؤكد.',
    ],
  },
  {
    id: 'noise_check',
    milestoneId: 'scientific_evidence',
    acceptedCaseIds: ['case-rw-aur'],
    defaultCaseId: 'case-rw-aur',
    icon: Activity,
    titleEn: 'Moving or just noise?',
    titleAr: 'حركة حقيقية أم مجرّد ضجيج؟',
    summaryEn: 'Test a still star that flickers in brightness so you can trust real error bars.',
    summaryAr: 'اختبر نجماً ثابتاً يتغير سطوعه لتتعلم كيف نفرق بين الحركة الحقيقية والضجيج.',
    jumpLabelEn: 'Go to RW Aurigae',
    jumpLabelAr: 'انتقل إلى RW Aurigae',
    step1En: 'Pick RW Aurigae above',
    step1Ar: 'اختر RW Aurigae من الأعلى',
    step2En: 'Press Show what changed to test if it drifts',
    step2Ar: 'اضغط اعرض ما تغير لاختبار هل يتحرك مكانه',
    step3En: 'Ask SPEX what "how sure we are" means',
    step3Ar: 'اسأل سبيكس ماذا يعني مدى تأكدنا',
    learnedEn: [
      'RW Aurigae flickers in brightness over time, yet its sky position stays still.',
      'Camera noise and bright glare create error bars around every measurement.',
      'Scientists need high certainty (at least 3 sigma) before calling a shift real motion.',
    ],
    learnedAr: [
      'نجم RW Aurigae يتغير لمعانه مع الوقت لكن موقعه في السماء يبقى ثابتاً.',
      'ضجيج الحساس ووهج النجوم يصنعان هامش خطأ حول كل قياس.',
      'يحتاج العلماء إلى ثقة عالية (3 سيجما على الأقل) قبل إعلان أي حركة حقيقية.',
    ],
  },
];

const MISSIONS_STORAGE_KEY = 'spex_explorer_missions';
const MILESTONES_STORAGE_KEY = 'spex_explorer_milestones';

function readStoredIds(key: string, fallback: string[] = []): string[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : fallback;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : fallback;
  } catch {
    return fallback;
  }
}

export const ExplorerMissions: React.FC<ExplorerMissionsProps> = ({
  language,
  activeCaseId,
  progressByCase,
  onSelectTargetCase,
  onOpenPostcard,
  canOpenPostcard,
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];
  const [selectedMissionId, setSelectedMissionId] = useState<ExplorerMissionId>('motion');
  const [completedMissions, setCompletedMissions] = useState<ExplorerMissionId[]>(() =>
    readStoredIds(MISSIONS_STORAGE_KEY, []) as ExplorerMissionId[]
  );

  // Compute live step flags per mission from real actions on matching targets
  const missionStates = useMemo(() => {
    const result: Record<ExplorerMissionId, { step1: boolean; step2: boolean; step3: boolean; done: boolean }> = {
      motion: { step1: false, step2: false, step3: false, done: false },
      brown_dwarf: { step1: false, step2: false, step3: false, done: false },
      noise_check: { step1: false, step2: false, step3: false, done: false },
    };

    for (const m of MISSIONS) {
      const hasActiveMatch = m.acceptedCaseIds.includes(activeCaseId);
      const anyProgressOnTarget = m.acceptedCaseIds.some((cid) => Boolean(progressByCase[cid]));
      const step1 = hasActiveMatch || anyProgressOnTarget;
      const step2 = m.acceptedCaseIds.some((cid) => {
        const p = progressByCase[cid];
        if (!p) return false;
        return m.id === 'noise_check' ? p.diffShown : p.played || p.diffShown;
      });
      const step3 = m.acceptedCaseIds.some((cid) => Boolean(progressByCase[cid]?.spotOrSpex));
      const alreadySaved = completedMissions.includes(m.id);
      const done = alreadySaved || (step1 && step2 && step3);
      result[m.id] = {
        step1: alreadySaved || step1,
        step2: alreadySaved || step2,
        step3: alreadySaved || step3,
        done,
      };
    }
    return result;
  }, [activeCaseId, progressByCase, completedMissions]);

  // Persist mission completions + sync Space Explorer's Log milestones
  useEffect(() => {
    const newlyCompleted = MISSIONS.filter(
      (m) => missionStates[m.id].done && !completedMissions.includes(m.id)
    );
    if (newlyCompleted.length === 0) return;

    const nextMissions = Array.from(
      new Set([...completedMissions, ...newlyCompleted.map((m) => m.id)])
    ) as ExplorerMissionId[];
    setCompletedMissions(nextMissions);

    try {
      localStorage.setItem(MISSIONS_STORAGE_KEY, JSON.stringify(nextMissions));
      const existingMilestones = readStoredIds(MILESTONES_STORAGE_KEY, ['first_look']);
      const nextMilestones = Array.from(
        new Set([...existingMilestones, ...newlyCompleted.map((m) => m.milestoneId)])
      );
      localStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify(nextMilestones));
      window.dispatchEvent(new Event('spex-missions-updated'));
    } catch {
      // Ignore storage quota errors
    }
  }, [missionStates, completedMissions]);

  const activeMission = MISSIONS.find((m) => m.id === selectedMissionId) || MISSIONS[0];
  const activeState = missionStates[activeMission.id];
  const isViewingActiveMissionTarget = activeMission.acceptedCaseIds.includes(activeCaseId);
  const completedCount = MISSIONS.filter((m) => missionStates[m.id].done).length;

  const steps = [
    {
      num: 1,
      done: activeState.step1,
      label: isRtl ? activeMission.step1Ar : activeMission.step1En,
    },
    {
      num: 2,
      done: activeState.step2,
      label: isRtl ? activeMission.step2Ar : activeMission.step2En,
    },
    {
      num: 3,
      done: activeState.step3,
      label: isRtl ? activeMission.step3Ar : activeMission.step3En,
    },
  ];

  return (
    <section
      data-testid="explorer-missions-section"
      aria-label={t.missionsHeading}
      className="obs-glass rounded-2xl p-3 sm:p-4 border border-white/10 space-y-3"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Compass className="w-4 h-4 text-[#FFB900] shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-slate-100">
            {t.missionsHeading}
          </h2>
        </div>
        <span className="text-xs font-mono font-semibold text-emerald-300">
          {completedCount} / {MISSIONS.length} {t.missionsDoneLabel}
        </span>
      </div>

      {/* 3 Mission Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {MISSIONS.map((m, idx) => {
          const IconComp = m.icon;
          const st = missionStates[m.id];
          const isSelected = m.id === activeMission.id;
          return (
            <button
              key={m.id}
              type="button"
              data-testid={`mission-tab-${m.id}`}
              onClick={() => setSelectedMissionId(m.id)}
              className={`p-2.5 rounded-xl border text-start transition cursor-pointer flex items-start gap-2.5 min-w-0 ${
                isSelected
                  ? 'bg-[#00D3F3]/15 border-[#00D3F3]/60 text-white'
                  : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07]'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  st.done
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : isSelected
                    ? 'bg-[#00D3F3]/20 text-[#00D3F3]'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {st.done ? <CheckCircle2 className="w-4 h-4" /> : <IconComp className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-mono text-slate-400">
                  {t.missionLabelPrefix} {idx + 1}
                </div>
                <div className="text-xs sm:text-sm font-bold leading-snug">
                  {isRtl ? m.titleAr : m.titleEn}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Mission Interactive Steps */}
      <div className="rounded-xl bg-black/40 border border-white/10 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-100">
              {isRtl ? activeMission.titleAr : activeMission.titleEn}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {isRtl ? activeMission.summaryAr : activeMission.summaryEn}
            </p>
          </div>
          {!isViewingActiveMissionTarget && (
            <button
              type="button"
              data-testid={`mission-jump-${activeMission.id}`}
              onClick={() => onSelectTargetCase(activeMission.defaultCaseId)}
              className="px-3 py-1.5 rounded-xl bg-[#FFB900] hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <span>{isRtl ? activeMission.jumpLabelAr : activeMission.jumpLabelEn}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* 3 Reactive Steps */}
        <ol className="space-y-2">
          {steps.map((step) => (
            <li
              key={step.num}
              data-testid={`mission-step-${step.num}`}
              data-complete={step.done ? 'true' : 'false'}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs sm:text-sm transition ${
                step.done
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-100'
                  : 'bg-white/[0.03] border-white/10 text-slate-300'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-mono text-xs font-bold ${
                  step.done
                    ? 'bg-emerald-400 text-slate-950'
                    : 'bg-white/10 text-slate-300 border border-white/15'
                }`}
              >
                {step.done ? <CheckCircle2 className="w-4 h-4" /> : step.num}
              </span>
              <span className="min-w-0 flex-1 leading-snug">{step.label}</span>
            </li>
          ))}
        </ol>

        {/* Completion Card: What you learned + Postcard button */}
        {activeState.done && (
          <div
            data-testid="mission-learned-card"
            className="rounded-xl bg-emerald-950/35 border border-emerald-400/40 p-3.5 space-y-2.5"
          >
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t.missionWhatYouLearned}</span>
            </div>
            <ul className="space-y-1.5 text-xs sm:text-sm text-slate-100 list-disc ps-5">
              {(isRtl ? activeMission.learnedAr : activeMission.learnedEn).map((bullet, idx) => (
                <li key={idx} className="leading-relaxed">
                  {bullet}
                </li>
              ))}
            </ul>
            {canOpenPostcard && (
              <div className="pt-1">
                <button
                  type="button"
                  data-testid="mission-postcard-btn"
                  onClick={onOpenPostcard}
                  className="px-3.5 py-2 rounded-xl bg-[#00D3F3] hover:bg-cyan-300 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  <span>{t.missionMakePostcard}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
