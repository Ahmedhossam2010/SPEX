import React, { useState, useEffect } from 'react';
import {
  Compass,
  Telescope,
  Sparkles,
  Layers,
  CheckCircle2,
  Clock,
  Palette,
  ShieldCheck,
  ShieldAlert,
  Users,
  Eye,
  X,
  ChevronRight,
  Award,
  BookOpen,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Language } from '../../utils/translations';
import { useModalBehavior } from '../../hooks/useModalBehavior';

export interface SpaceMilestone {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  titleEn: string;
  titleAr: string;
  badgeEn: string;
  badgeAr: string;
  level1En: string;
  level1Ar: string;
  level2En: string;
  level2Ar: string;
  level3En: string;
  level3Ar: string;
  actionLens?: 'time' | 'colors' | 'doubt' | 'neighbors';
  actionLabelEn: string;
  actionLabelAr: string;
}

export const SPACE_MILESTONES: SpaceMilestone[] = [
  {
    id: 'first_look',
    icon: Compass,
    titleEn: '1. First Look at the Sky',
    titleAr: '1. نظرة أولى على قبة السماء',
    badgeEn: 'Sky Mapping',
    badgeAr: 'الملاحة السماوية',
    level1En: 'Telescopes map the sky using celestial coordinates called Right Ascension and Declination (RA & Dec), which act like latitude and longitude on the starry sphere.',
    level1Ar: 'ترسم التلسكوبات خرائط السماء باستخدام إحداثيات فلكية تسمى المطلع المستقيم والميل السماوي (RA و Dec)، والتي تعمل مثل خطوط الطول والعرض على الكرة السماوية.',
    level2En: 'When looking at a patch of sky, the telescope has a specific "Field of View" (FOV). A typical SPHEREx cutout is 64×64 pixels, spanning about 6.6 arcminutes across.',
    level2Ar: 'عند النظر لأي رقعة، يمتلك التلسكوب «مجال رؤية» محدد (FOV). رقعة SPHEREx المعتادة حجمها 64×64 بكسل وتغطي مسافة 6.6 دقيقة قوسية عبر السماء.',
    level3En: 'Astrometric coordinates project from spherical (α, δ) to tangential pixel coordinates (X, Y) via standard FITS World Coordinate System (WCS) CD matrix rotation.',
    level3Ar: 'تُسقط الإحداثيات الفلكية من القبة الكروية إلى بكسلات المستشعر عبر مصفوفة CD لنظام الإحداثيات العالمي WCS مع تصحيح زوايا الدوران.',
    actionLabelEn: 'Explore Sky Coordinates',
    actionLabelAr: 'استكشف إحداثيات السماء',
  },
  {
    id: 'infrared_light',
    icon: Palette,
    titleEn: '2. Understanding Infrared Light',
    titleAr: '2. فهم الأشعة تحت الحمراء',
    badgeEn: 'Thermal Vision',
    badgeAr: 'الرؤية الحرارية',
    level1En: 'Infrared light is heat radiation with wavelengths longer than red light; our eyes cannot see it, but space telescopes use it to penetrate dusty space clouds.',
    level1Ar: 'الأشعة تحت الحمراء هي إشعاع حراري بأطوال موجية أطول من الضوء الأحمر؛ تعجز أعيننا عن رؤيته، لكن تلسكوبات الفضاء تستخدمه لاختراق سحب الغبار الكوني.',
    level2En: 'Cosmic dust scatters visible blue and red light, but infrared waves slip right through, revealing newborn stars and cold brown dwarfs that are invisible to optical telescopes.',
    level2Ar: 'يشتت الغبار الكوني الضوء المرئي الأزرق والأحمر، بينما تمر موجات الأشعة تحت الحمراء بسلاسة عبره لتكشف النجوم الوليدة والأقزام البنية الباردة.',
    level3En: 'Rayleigh scattering cross-section drops dramatically with wavelength (σ_scat ∝ λ⁻⁴), dramatically reducing optical depth τ_IR in the 0.75–5.0 µm regime.',
    level3Ar: 'ينخفض تشتت رايلي بشكل هائل مع زيادة الطول الموجي (متناسباً مع معكوس القوة الرابعة لطول الموجة)، مما يتيح الرؤية النقية لأعماق السدم.',
    actionLens: 'colors',
    actionLabelEn: 'Try Hidden Colors Lens',
    actionLabelAr: 'جرب عدسة الألوان الخفية',
  },
  {
    id: 'reading_sky_image',
    icon: Telescope,
    titleEn: '3. Reading a Scientific Sky Image',
    titleAr: '3. قراءة خريطة فلكية علمية',
    badgeEn: 'FITS & Photons',
    badgeAr: 'الفوتونات وملفات FITS',
    level1En: 'Astronomical images are not compressed phone JPEGs; they are scientific FITS files where every pixel contains an exact count of photons collected from that star.',
    level1Ar: 'الصور الفلكية ليست صور JPEG عادية؛ بل ملفات FITS علمية يسجل فيها كل بكسل العدد الفعلي الدقيق لفوتونات الضوء القادمة من ذلك النجم.',
    level2En: 'Brightness is measured in MegaJanskys per steradian (MJy/sr). Nonlinear stretches (like arcsinh) are applied so faint nebulae and blazing stars can be seen together.',
    level2Ar: 'يُقاس السطوع بوحدة ميجا يانسكي لكل ستريديان (MJy/sr). ونطبق معادلات تمدد غير خطية كدالة الجيب الزائدي العكسي لإظهار الغبار الخافت والنجوم الساطعة معاً.',
    level3En: 'Calibrated surface brightness I_ν (MJy/sr) preserves absolute linear response. High-dynamic-range display uses arcsinh stretch: y = asinh(x / β) / asinh(1 / β).',
    level3Ar: 'يحافظ السطوع السطحي المعاير على استجابة خطية مطلقة، وتستخدم معادلة arcsinh لعرض المدى الديناميكي الهائل دون تشويه القياسات.',
    actionLabelEn: 'Inspect FITS Image',
    actionLabelAr: 'افحص قياسات الصورة',
  },
  {
    id: 'finding_objects',
    icon: Users,
    titleEn: '4. Finding an Astronomical Object',
    titleAr: '4. تحديد وتوثيق جرم فلكي',
    badgeEn: 'Star Catalogs',
    badgeAr: 'فهارس النجوم العالمية',
    level1En: 'When an astronomer spots a light source, they compare its coordinates against official star catalogs (like Gaia and AllWISE) to see if it is already known.',
    level1Ar: 'عندما يرصد الفلكي مصدراً ضوئياً، يقارن إحداثياته فوراً مع فهارس النجوم الرسمية المعتمدة (مثل جايا ووايز) ليعرف هل هو نجم مسجل مسبقاً أم لا.',
    level2En: 'Matching within 3.5 arcseconds verifies whether the object is an ordinary known star, an infrared brown dwarf, or a brand-new uncataloged discovery.',
    level2Ar: 'البحث في نطاق 3.5 ثانية قوسية يكشف ما إذا كان الجرم نجماً عادياً معروفاً، أو قزماً بنياً بارداً، أو اكتشافاً فلكياً جديداً لم يُسجل من قبل.',
    level3En: 'Astrometric cone searches combine positional offsets with proper motion vectors propagated from Gaia DR3 epoch J2016.0 to observation epoch 2025+.',
    level3Ar: 'يطبق البحث المخروطي إزاحة الإحداثيات مع مراعاة متجهات الحركة الذاتية المنقولة من حقبة جايا J2016.0 إلى حقبة رصد سبيراكس 2025 وما بعدها.',
    actionLens: 'neighbors',
    actionLabelEn: 'Try Neighbors Lens',
    actionLabelAr: 'جرب عدسة الجيران',
  },
  {
    id: 'comparing_observations',
    icon: Clock,
    titleEn: '5. Comparing Observations Over Time',
    titleAr: '5. مقارنة رصدتين زمنيتين',
    badgeEn: 'Time Domain',
    badgeAr: 'علم الفلك الزمني',
    level1En: 'By subtracting an older photograph of the sky from a newer one, all unchanging stars disappear, leaving only what moved, brightened, or dimmed.',
    level1Ar: 'من خلال طرح صورة قديمة للسماء من صورة أحدث لنفس البقعة، تختفي كل النجوم الثابتة تلقائياً، ويتبقى فقط ما تحرك أو ازداد لمعاناً أو خفت.',
    level2En: 'If a star physically moved across the sky, subtraction leaves a "dipole" (a dark spot next to a bright spot). If a star flared up, it leaves a pure bright spot.',
    level2Ar: 'إذا تحرك النجم في السماء، يترك الطرح «ثنائي قطب» (نقطة مظلمة بجوار مضيئة). وإذا انفجر أو زاد توهجه وهو في مكانه، يترك نقطة مضيئة فقط.',
    level3En: 'Subpixel bilinear registration aligns Visit 1 and Visit 2: D(x,y) = I₂(x,y) - I₁(x,y). Dipole vector separation directly yields transverse angular velocity.',
    level3Ar: 'تجري المحاذاة بدقة تحت البكسل قبل الطرح: D = I₂ - I₁. والمسافة بين بؤرتي ثنائي القطب تكشف السرعة الزاوية العرضية بدقة متناهية.',
    actionLens: 'time',
    actionLabelEn: 'Try Time Lens & Curtain',
    actionLabelAr: 'جرب عدسة الزمن والستارة',
  },
  {
    id: 'scientific_evidence',
    icon: ShieldAlert,
    titleEn: '6. Understanding Evidence & Noise',
    titleAr: '6. فهم الأدلة واستبعاد الشكوك',
    badgeEn: 'Significance & DQ',
    badgeAr: 'الدلالة وجودة الحساس',
    level1En: 'Astronomers never rely on a single bright pixel; they calculate statistical confidence (Sigma) and check sensor flags to prove it isn’t a camera glitch.',
    level1Ar: 'لا يعتمد علماء الفلك أبداً على بكسل مضيء بمفرده؛ بل يحسبون الثقة الإحصائية (سيجما) ويفحصون علامات الحساس للتأكد أنه ليس عيباً في الكاميرا.',
    level2En: 'A real star spreads light across multiple pixels according to the telescope lens shape. If only one pixel spikes, it is almost certainly a cosmic ray strike.',
    level2Ar: 'النجم الحقيقي ينتشر ضوؤه على عدة بكسلات متجاورة بنعومة كالجرس؛ أما إذا لمع بكسل واحد بمفرده فجأة، فهو بالتأكيد ضربة أشعة كونية في الحساس.',
    level3En: 'Pipeline applies bitmask DQ flags (0x01 cosmic ray, 0x02 saturation). Candidates require peak significance S = ΔF / σ_local ≥ 5.0σ to qualify for discovery.',
    level3Ar: 'يفحص النظام أقنعة الجودة الرقمية ويشترط دلالة إحصائية S ≥ 5.0σ لضمان استبعاد الضوضاء العشوائية بنسبة تفوق 99.99994%.',
    actionLens: 'doubt',
    actionLabelEn: 'Try Doubt Lens',
    actionLabelAr: 'جرب عدسة الشك والشوائب',
  },
  {
    id: 'thinking_like_astronomer',
    icon: Award,
    titleEn: '7. Thinking Like an Astronomer',
    titleAr: '7. التفكير كعالم فلك محترف',
    badgeEn: 'Discovery Synthesis',
    badgeAr: 'إعلان الاكتشاف العلمي',
    level1En: 'Becoming a space explorer means gathering all the evidence: checking coordinates, analyzing the spectrum, measuring the time change, and ruling out glitches.',
    level1Ar: 'أن تصبح مستكشفاً حقيقياً للفضاء يعني جمع الأدلة العلمية كاملة: التحقق من الموقع، وفحص الطيف، ومقارنة الزمن، واستبعاد عيوب الأجهزة.',
    level2En: 'Once all four lenses agree—the signal is significant, verified by quality masks, matched with known catalogs, and documented—it becomes a true discovery.',
    level2Ar: 'عندما تتكامل نتائج العدسات الأربع معاً: إشارة قوية، وجودة بيانات نقية، ومضاهاة دقيقة مع الفهارس، وتوثيق محكم، يتحول الرصد إلى اكتشاف رسمي موثق.',
    level3En: 'Evidence synthesis compiles complete provenance records, calibrated fluxes with formal propagation errors, and photometric spectral energy distributions (SED).',
    level3Ar: 'يجمع التوثيق العلمي سجلات المصدر الرسمية، والتدفق المعاير مع هوامش الخطأ المشتقة، ومنحنى توزيع الطاقة الطيفية لاكتمال النشر العلمي.',
    actionLabelEn: 'Review Discovery Postcard',
    actionLabelAr: 'راجع بطاقة الاكتشاف',
  },
];

export interface SpaceExplorerLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onActivateLens?: (lens: 'time' | 'colors' | 'doubt' | 'neighbors') => void;
  onOpenDictionaryTerm?: (termId: string) => void;
}

export const SpaceExplorerLogModal: React.FC<SpaceExplorerLogModalProps> = ({
  isOpen,
  onClose,
  language,
  onActivateLens,
  onOpenDictionaryTerm,
}) => {
  const isRtl = language === 'ar';
  useModalBehavior(isOpen, onClose);

  const [completedMilestones, setCompletedMilestones] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ['first_look'];
    try {
      const saved = localStorage.getItem('spex_explorer_milestones');
      return saved ? JSON.parse(saved) : ['first_look'];
    } catch {
      return ['first_look'];
    }
  });

  const [completedMissionsCount, setCompletedMissionsCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const saved = localStorage.getItem('spex_explorer_missions');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const savedMilestones = localStorage.getItem('spex_explorer_milestones');
        if (savedMilestones) {
          const parsed = JSON.parse(savedMilestones);
          if (Array.isArray(parsed)) setCompletedMilestones(parsed);
        }
        const savedMissions = localStorage.getItem('spex_explorer_missions');
        if (savedMissions) {
          const parsedMissions = JSON.parse(savedMissions);
          if (Array.isArray(parsedMissions)) setCompletedMissionsCount(parsedMissions.length);
        }
      } catch {
        // ignore storage errors
      }
    };
    if (isOpen) syncFromStorage();
    window.addEventListener('spex-missions-updated', syncFromStorage);
    return () => window.removeEventListener('spex-missions-updated', syncFromStorage);
  }, [isOpen]);

  const [activeMilestoneId, setActiveMilestoneId] = useState<string>('first_look');
  const [activeDepth, setActiveDepth] = useState<'level1' | 'level2' | 'level3'>('level2');

  const activeMilestone = SPACE_MILESTONES.find((m) => m.id === activeMilestoneId) || SPACE_MILESTONES[0];
  const IconComponent = activeMilestone.icon;

  const toggleMilestoneComplete = (id: string) => {
    setCompletedMilestones((prev) => {
      const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
      try {
        localStorage.setItem('spex_explorer_milestones', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  if (!isOpen) return null;

  const progressPercent = Math.round((completedMilestones.length / SPACE_MILESTONES.length) * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="explorer-log-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl h-[92vh] max-h-[800px] bg-[#0A0D14] border border-white/15 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-slate-100"
      >
        {/* ================================================================= */}
        {/* HEADER */}
        {/* ================================================================= */}
        <div className="shrink-0 h-16 sm:h-18 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between gap-3 bg-[#0C101A]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_16px_rgba(0,211,243,0.2)]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="explorer-log-title"
                  className="font-bold text-base sm:text-lg text-slate-100 tracking-tight"
                >
                  {isRtl ? 'سجل مستكشف الفضاء' : "Space Explorer's Log"}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                  {completedMilestones.length} / {SPACE_MILESTONES.length} {isRtl ? 'مكتمل' : 'Completed'} ({progressPercent}%)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                  {completedMissionsCount} / 3 {isRtl ? 'مهام' : 'Missions'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans hidden sm:block">
                {isRtl
                  ? 'تعلم كيف يفكر ويستكشف علماء الفضاء عبر 7 محطات تعليمية تفاعلية'
                  : 'Learn how astronomers explore the universe across 7 interactive space milestones'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <span>{isRtl ? 'إغلاق' : 'Close'}</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-[#00D3F3] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* ================================================================= */}
        {/* BODY (2-COLUMN: MILESTONES LIST + ACTIVE LESSON) */}
        {/* ================================================================= */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Milestones List */}
          <div className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto p-2 sm:p-3 space-y-1.5 max-h-48 md:max-h-none bg-[#080B12]">
            {SPACE_MILESTONES.map((m) => {
              const isSelected = m.id === activeMilestoneId;
              const isDone = completedMilestones.includes(m.id);
              const MIcon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMilestoneId(m.id)}
                  className={`w-full p-2.5 rounded-xl text-left transition flex items-center justify-between gap-2 cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#00D3F3]/15 border border-[#00D3F3]/40 text-[#00D3F3] shadow-sm'
                      : 'bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isDone
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isSelected
                          ? 'bg-[#00D3F3]/20 text-[#00D3F3]'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <MIcon className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-xs font-bold truncate">
                      {isRtl ? m.titleAr : m.titleEn}
                    </span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#00D3F3]' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>

          {/* Active Milestone Card & 3 Explanation Levels */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5 bg-[#0A0D14]">
            {/* Header */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00D3F3]/15 border border-[#00D3F3]/30 flex items-center justify-center text-[#00D3F3]">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                      {isRtl ? activeMilestone.badgeAr : activeMilestone.badgeEn}
                    </span>
                    {completedMilestones.includes(activeMilestone.id) && (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isRtl ? 'تم الإنجاز' : 'Completed'}</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                    {isRtl ? activeMilestone.titleAr : activeMilestone.titleEn}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleMilestoneComplete(activeMilestone.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition cursor-pointer select-none flex items-center gap-1.5 ${
                  completedMilestones.includes(activeMilestone.id)
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-white/10 text-slate-300 border border-white/15 hover:bg-white/15 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {completedMilestones.includes(activeMilestone.id)
                    ? (isRtl ? 'تم الإنجاز بنجاح' : 'Marked Complete')
                    : (isRtl ? 'تحديد كمكتمل' : 'Mark as Complete')}
                </span>
              </button>
            </div>

            {/* Depth Selector Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs font-mono">
              <span className="text-slate-500 mr-2">{isRtl ? 'مستوى العمق العلمي:' : 'Learning Level:'}</span>
              <button
                type="button"
                onClick={() => setActiveDepth('level1')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer font-semibold ${
                  activeDepth === 'level1'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? 'المستوى 1: مبسط' : 'Level 1: Simple'}
              </button>
              <button
                type="button"
                onClick={() => setActiveDepth('level2')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer font-semibold ${
                  activeDepth === 'level2'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? 'المستوى 2: مستكشف' : 'Level 2: Explorer'}
              </button>
              <button
                type="button"
                onClick={() => setActiveDepth('level3')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer font-semibold ${
                  activeDepth === 'level3'
                    ? 'bg-[#00D3F3]/20 text-[#00D3F3] border border-[#00D3F3]/40 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? 'المستوى 3: علماء' : 'Level 3: Scientist'}
              </button>
            </div>

            {/* Level 1 Content */}
            {activeDepth === 'level1' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 animate-fade-in">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase">
                  <Sparkles className="w-4 h-4" />
                  <span>{isRtl ? 'المعنى الأساسي البسيط (للمبتدئين):' : 'CORE CONCEPT FOR BEGINNERS:'}</span>
                </div>
                <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-sans font-medium">
                  {isRtl ? activeMilestone.level1Ar : activeMilestone.level1En}
                </p>
              </div>
            )}

            {/* Level 2 Content */}
            {activeDepth === 'level2' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-fade-in">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase">
                  <Compass className="w-4 h-4" />
                  <span>{isRtl ? 'تطبيق المستكشف والمثال العملي:' : 'PRACTICAL EXPLORER APPLICATION:'}</span>
                </div>
                <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-sans">
                  {isRtl ? activeMilestone.level2Ar : activeMilestone.level2En}
                </p>
              </div>
            )}

            {/* Level 3 Content */}
            {activeDepth === 'level3' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#00D3F3]/10 border border-[#00D3F3]/30 space-y-2.5 font-mono animate-fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-[#00D3F3] uppercase">
                  <Layers className="w-4 h-4" />
                  <span>{isRtl ? 'المعادلة والفيزياء الفلكية الدقيقة:' : 'ASTROPHYSICAL FORMULATION (SCIENTIST):'}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5">
                  {isRtl ? activeMilestone.level3Ar : activeMilestone.level3En}
                </p>
              </div>
            )}

            {/* Required Phase 8 Notice: Educational Simulation Banner */}
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/25 flex items-center gap-2.5 text-xs text-purple-300 font-mono">
              <Info className="w-4 h-4 shrink-0 text-purple-400" />
              <span>
                {isRtl
                  ? 'محاكاة تعليمية تفاعلية لتوضيح مبادئ استكشاف الفضاء — البيانات الفلكية الأساسية في المستكشف مستخرجة من أرشيف SPHEREx العام الحالي (DR1 / QR3 / QR2، تحديثات أسبوعية).'
                  : 'EDUCATIONAL SIMULATION FOR CONCEPT LEARNING — All sky data in the main viewer is read from the current SPHEREx public archive (DR1 / QR3 / QR2, weekly updates).'}
              </span>
            </div>

            {/* Interactive Call to Action */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              {activeMilestone.actionLens && onActivateLens && (
                <button
                  type="button"
                  onClick={() => {
                    onActivateLens(activeMilestone.actionLens!);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#00D3F3] hover:bg-[#00c0de] text-slate-950 font-mono text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <span>{isRtl ? activeMilestone.actionLabelAr : activeMilestone.actionLabelEn}</span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              )}

              {onOpenDictionaryTerm && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenDictionaryTerm(activeMilestone.id === 'infrared_light' ? 'infrared' : activeMilestone.id === 'comparing_observations' ? 'image_subtraction' : activeMilestone.id === 'scientific_evidence' ? 'sigma' : 'ra_dec');
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-mono text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isRtl ? 'عرض المصطلحات المرتبطة في القاموس' : 'View Related Terms in Dictionary'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
