/**
 * SPHEREx: THE COSMIC DETECTIVE — EDUCATIONAL SYNTHETIC DATA
 * 
 * STRICT SCIENTIFIC ISOLATION NOTICE:
 * All data structures, image matrices, and astronomical parameters in this file
 * are purely synthetic educational models constructed for public learning.
 * They are NEVER to be routed into the scientific pipeline or mixed with real
 * NASA/IPAC SPHEREx Level-2B observational data.
 */

export const EDUCATIONAL_DISCLAIMER =
  'Educational simulation — not actual SPHEREx observational data.';

export interface SpectrumBand {
  id: string;
  name: string;
  nameAr: string;
  range: string;
  wavelengthUm: number;
  description: string;
  descriptionAr: string;
  whatItReveals: string;
  whatItRevealsAr: string;
  colorHex: string;
  dustTransparency: number; // 0 (opaque) to 1 (transparent)
  features: string[];
  featuresAr: string[];
}

export const EDUCATIONAL_SPECTRUM_BANDS: SpectrumBand[] = [
  {
    id: 'visible',
    name: 'Visible Light',
    nameAr: 'الضوء المرئي',
    range: '0.40 – 0.70 µm',
    wavelengthUm: 0.55,
    description: 'The narrow slice of electromagnetic radiation human eyes can detect.',
    descriptionAr: 'النطاق الضيق من الإشعاع الكهرومغناطيسي الذي تراه العين البشرية.',
    whatItReveals: 'Stellar surfaces, bright reflection nebulae; completely blocked by interstellar dust clouds.',
    whatItRevealsAr: 'أسطح النجوم الساطعة والسدم العاكسة؛ لكنه يُحجب تماماً بسحب الغبار الكوني.',
    colorHex: '#38bdf8',
    dustTransparency: 0.15,
    features: ['Dark dust obscuration', 'Optical stars', 'Reflection nebulae'],
    featuresAr: ['حجب كثيف بالغبار', 'نجوم بصرية', 'سدم عاكسة'],
  },
  {
    id: 'spx_nir_1',
    name: 'SPHEREx Near-IR (Bands 1–2)',
    nameAr: 'نطاق SPHEREx القريب (1–2)',
    range: '0.75 – 1.64 µm',
    wavelengthUm: 1.20,
    description: 'Initial infrared window piercing thin foreground dust veils.',
    descriptionAr: 'النافذة تحت الحمراء الأولى التي تخترق ستائر الغبار الكوني الرقيقة.',
    whatItReveals: 'Cool M-dwarf stars, brown dwarfs, and redshifted galaxy light from cosmic dawn.',
    whatItRevealsAr: 'النجوم القزمة الباردة، الأقزام البنية، وضوء المجرات المنزاح نحو الأحمر من فجر الكون.',
    colorHex: '#818cf8',
    dustTransparency: 0.55,
    features: ['Cool dwarf stars', 'Galaxy light emergence', 'Partial dust transparency'],
    featuresAr: ['نجوم قزمة باردة', 'ظهور ضوء المجرات', 'شفافية جزئية للغبار'],
  },
  {
    id: 'spx_nir_2',
    name: 'SPHEREx Molecular Ice (Bands 3–4)',
    nameAr: 'نطاق الجليد الجزيئي (3–4)',
    range: '1.64 – 3.84 µm',
    wavelengthUm: 3.05,
    description: 'Key biogenic resonance zone for cosmic water ice (H2O) and organic compounds.',
    descriptionAr: 'منطقة الرنين الجزيئي الحاسمة لجليد الماء (H2O) والمركبات العضوية.',
    whatItReveals: 'Deep 3.05 µm absorption from water ice in protoplanetary disks and interstellar clouds.',
    whatItRevealsAr: 'امتصاص عميق عند 3.05 ميكرومتر لجليد الماء في الأقراص الكوكبية والسحب البينجمية.',
    colorHex: '#a855f7',
    dustTransparency: 0.85,
    features: ['H2O Water Ice (3.05 µm)', 'Polycyclic Hydrocarbons', 'Deep stellar penetration'],
    featuresAr: ['جليد الماء H2O (3.05 µm)', 'مركبات هيدروكربونية', 'نفاذ عميق للنجوم'],
  },
  {
    id: 'spx_nir_3',
    name: 'SPHEREx Deep Carbon (Bands 5–6)',
    nameAr: 'نطاق الكربون العميق (5–6)',
    range: '3.82 – 5.00 µm',
    wavelengthUm: 4.45,
    description: 'Longest near-infrared channels mapping carbon dioxide (CO2) and carbon monoxide (CO) ices.',
    descriptionAr: 'أطول قنوات الأشعة تحت الحمراء القريبة لرسم خرائط جليد ثاني أكسيد الكربون وأول أكسيد الكربون.',
    whatItReveals: 'Frozen CO2 at 4.27 µm and CO ice at 4.67 µm inside forming star systems; total dust penetration.',
    whatItRevealsAr: 'جليد CO2 المتجمد عند 4.27 µm وجليد CO عند 4.67 µm داخل الأنظمة النجمية الوليدة؛ اختراق كامل للغبار.',
    colorHex: '#ec4899',
    dustTransparency: 0.98,
    features: ['CO2 Ice Absorption (4.27 µm)', 'CO Ice (4.67 µm)', 'Complete dust transparency'],
    featuresAr: ['امتصاص جليد CO2 (4.27 µm)', 'جليد أول أكسيد الكربون', 'اختراق تام للغبار'],
  },
];

export interface DetectorArrayInfo {
  array: string;
  wavelengthRange: string;
  channels: number;
  primaryScience: string;
  primaryScienceAr: string;
  color: string;
}

export const EDUCATIONAL_DETECTOR_ARRAYS: DetectorArrayInfo[] = [
  {
    array: 'Array 1',
    wavelengthRange: '0.75 – 1.11 µm',
    channels: 17,
    primaryScience: 'High-redshift cosmological clustering & stellar baselines',
    primaryScienceAr: 'التكتل الكوني عالي الانزياح الأحمر ومعايير النجوم',
    color: '#38bdf8',
  },
  {
    array: 'Array 2',
    wavelengthRange: '1.11 – 1.64 µm',
    channels: 17,
    primaryScience: 'Extragalactic Background Light (EBL) fluctuation tomograms',
    primaryScienceAr: 'توموجرام تقلبات ضوء الخلفية خارج المجرة (EBL)',
    color: '#6366f1',
  },
  {
    array: 'Array 3',
    wavelengthRange: '1.64 – 2.42 µm',
    channels: 17,
    primaryScience: 'Stellar spectral energy distributions (SEDs) & Brown Dwarf characterization',
    primaryScienceAr: 'توزيعات الطاقة الطيفية النجمية وتصنيف الأقزام البنية',
    color: '#8b5cf6',
  },
  {
    array: 'Array 4',
    wavelengthRange: '2.40 – 3.84 µm',
    channels: 17,
    primaryScience: 'Interstellar Water Ice (3.05 µm) & Prebiotic Hydrocarbon absorption',
    primaryScienceAr: 'جليد الماء البينجمي (3.05 µm) وامتصاص الهيدروكربونات العضوية',
    color: '#a855f7',
  },
  {
    array: 'Array 5',
    wavelengthRange: '3.82 – 4.42 µm',
    channels: 17,
    primaryScience: 'Carbon Dioxide (CO2) ices & Interplanetary Dust emission',
    primaryScienceAr: 'جليد ثاني أكسيد الكربون (CO2) وانبعاثات الغبار بين الكواكب',
    color: '#d946ef',
  },
  {
    array: 'Array 6',
    wavelengthRange: '4.42 – 5.00 µm',
    channels: 17,
    primaryScience: 'Carbon Monoxide (CO, 4.67 µm) & Redshifted primordial hydrogen',
    primaryScienceAr: 'أول أكسيد الكربون (CO, 4.67 µm) وهيدروجين الكون المبكر',
    color: '#f43f5e',
  },
];

export interface PipelineStep {
  step: number;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  inputDescription: string;
  inputDescriptionAr: string;
  outputDescription: string;
  outputDescriptionAr: string;
  whyItMatters: string;
  whyItMattersAr: string;
  iconName: string;
}

export const EDUCATIONAL_PIPELINE_STEPS: PipelineStep[] = [
  {
    step: 1,
    title: 'Space Observation',
    titleAr: 'الرصد الفضائي',
    subtitle: 'Infrared Photons from Orbit',
    subtitleAr: 'فوتونات تحت حمراء من مدار فضائي',
    inputDescription: 'Cosmic photons focused by SPHEREx aluminum telescope onto 6 Hawaii-2RG detectors.',
    inputDescriptionAr: 'فوتونات كونية تركزها مرآة تلسكوب SPHEREx المصنوعة من الألومنيوم على 6 مستشعرات H2RG.',
    outputDescription: 'Analog electron accumulations collected in non-destructive readouts.',
    outputDescriptionAr: 'تراكم إلكترونات تمثيلية مُجمعة بقراءات غير متلفة.',
    whyItMatters: 'Operating above Earth’s atmosphere avoids atmospheric absorption and thermal glow.',
    whyItMattersAr: 'العمل فوق الغلاف الجوي للأرض يتجنب امتصاص بخار الماء والتوهج الحراري الجوي.',
    iconName: 'Telescope',
  },
  {
    step: 2,
    title: 'Detector Calibration',
    titleAr: 'معايرة المستشعرات',
    subtitle: 'Removing Instrumental Signatures',
    subtitleAr: 'إزالة بصمات وأخطاء الأجهزة',
    inputDescription: 'Raw digitized detector pixel counts (DN / sampling ramp).',
    inputDescriptionAr: 'قراءات المستشعر الرقمية الخام (DN / منحدرات القراءة).',
    outputDescription: 'Calibrated surface brightness flux rates in MJy/sr with bad-pixel mask flags.',
    outputDescriptionAr: 'معدلات تدفق سطوع معايرة بوحدة MJy/sr مع مصفوفة جودة البكسلات.',
    whyItMatters: 'Corrects non-linearity, dark current, and pixel sensitivity variations across linear filters.',
    whyItMattersAr: 'يصحح اللاخطية، التيار المظلم، وتفاوت حساسية البكسلات عبر المرشحات الطيفية المتغيرة.',
    iconName: 'Sliders',
  },
  {
    step: 3,
    title: 'WCS Astrometry & Reprojection',
    titleAr: 'المطابقة الفلكية WCS',
    subtitle: 'Aligning Pixels to the Sky',
    subtitleAr: 'محاذاة البكسلات مع إحداثيات السماء',
    inputDescription: 'Detector coordinate frames (x, y) with spacecraft star-tracker pointing telemetry.',
    inputDescriptionAr: 'إحداثيات المستشعر (x, y) مع بيانات تتبع النجوم لمركبة الفضاء.',
    outputDescription: 'Accurately projected FITS frames on celestial Right Ascension & Declination (ICRS).',
    outputDescriptionAr: 'صور FITS مسقطة بدقة على إحداثيات المطلع المستقيم والميل السماوي.',
    whyItMatters: 'Subpixel astrometric precision is required so static stars match exactly between epochs.',
    whyItMattersAr: 'دقة المحاذاة دون البكسلية ضرورية حتى تنطبق النجوم الثابتة تماماً بين التعريضات.',
    iconName: 'Compass',
  },
  {
    step: 4,
    title: 'Difference Imaging & Photometry',
    titleAr: 'طرح الصور والقياس الضوئي',
    subtitle: 'Subtracting Static Background: D = I2 - I1',
    subtitleAr: 'طرح السماء الثابتة: D = I2 - I1',
    inputDescription: 'Aligned observations from Epoch 1 and Epoch 2 with native variance maps.',
    inputDescriptionAr: 'تعريضان متطابقان هندسياً من زمنين مختلفين مع مصفوفات التباين الإحصائي.',
    outputDescription: 'Residual flux map D, propagated variance map, and significance map S = D / sqrt(var).',
    outputDescriptionAr: 'خريطة الفرق D، ومصفوفة التباين المركب، وخريطة الأهمية الإحصائية S = D / sqrt(var).',
    whyItMatters: 'Removes billions of unchanging stars to reveal only genuine celestial changes and transients.',
    whyItMattersAr: 'يزيل مليارات النجوم الثابتة ليكشف فقط عن التغيرات الفلكية الحقيقية والأجرام العابرة.',
    iconName: 'Layers',
  },
  {
    step: 5,
    title: 'Evidence Verification & Classification',
    titleAr: 'فحص الأدلة والتصنيف الفلكي',
    subtitle: 'Distinguishing Discoveries from Artifacts',
    subtitleAr: 'تمييز الاكتشافات الحقيقية عن تشويش الأجهزة',
    inputDescription: 'Significant difference peaks with aperture photometry and catalog cross-matches.',
    inputDescriptionAr: 'قمم الفروق الإحصائية مع القياس الضوئي الحلقي ومطابقة الكتالوجات (Gaia/AllWISE).',
    outputDescription: 'Verified astrophysical candidate classifications backed by rigorous provenance.',
    outputDescriptionAr: 'تصنيفات فلكية محققة مدعومة بمسار أدلة إحصائية كامل.',
    whyItMatters: 'Prevents false alarms from detector saturation, cosmic rays, and pointing jitter.',
    whyItMattersAr: 'يمنع الإنذارات الكاذبة الناتجة عن تشبع المستشعر، الأشعة الكونية، واهتزاز التوجيه.',
    iconName: 'ShieldCheck',
  },
];

export interface InvestigationScenario {
  id: string;
  title: string;
  titleAr: string;
  targetName: string;
  epoch1Date: string;
  epoch2Date: string;
  timeBaseline: string;
  timeBaselineAr: string;
  description: string;
  descriptionAr: string;
  epoch1Appearance: string;
  epoch1AppearanceAr: string;
  epoch2Appearance: string;
  epoch2AppearanceAr: string;
  differenceAppearance: string;
  differenceAppearanceAr: string;
  snr: number;
  deltaFlux: string;
  options: Array<{
    id: string;
    text: string;
    textAr: string;
    isCorrect: boolean;
    explanation: string;
    explanationAr: string;
  }>;
  syntheticImagePattern: 'brightened' | 'faded' | 'moving' | 'jitter_dipole' | 'noise_spike';
}

export const EDUCATIONAL_SCENARIOS: InvestigationScenario[] = [
  {
    id: 'scen-brightened-01',
    title: 'Surge in Mid-Infrared Luminosity',
    titleAr: 'طفرة مفاجئة في السطوع تحت الأحمر',
    targetName: 'SIM-VAR-001',
    epoch1Date: '2025-05-10',
    epoch2Date: '2025-11-12',
    timeBaseline: '186 days (6-month survey cadence)',
    timeBaselineAr: '186 يوماً (دورة المسح السداسية)',
    description: 'A stationary stellar source exhibits a massive, isolated flux surge between survey passes.',
    descriptionAr: 'جرم نجمي ثابت يظهر قفزة هائلة ومعزولة في التدفق بين دورتي مسح متعاقبتين.',
    epoch1Appearance: 'Faint point source at (32, 32) with flux ~12.0 MJy/sr.',
    epoch1AppearanceAr: 'جرم نقطي خافت عند (32, 32) بتدفق ~12.0 MJy/sr.',
    epoch2Appearance: 'Brilliant point source at (32, 32) with flux ~58.4 MJy/sr.',
    epoch2AppearanceAr: 'جرم نقطي ساطع جداً عند نفس الإحداثيات بتدفق ~58.4 MJy/sr.',
    differenceAppearance: 'Pure positive point-like Gaussian peak (+46.4 MJy/sr, S/N = +14.2σ) with no negative trough.',
    differenceAppearanceAr: 'قمة إيجابية نقطية نقية (+46.4 MJy/sr، أهمية إحصائية +14.2σ) دون أي انخفاض سلبي.',
    snr: 14.2,
    deltaFlux: '+46.4 ± 3.2 MJy/sr',
    syntheticImagePattern: 'brightened',
    options: [
      {
        id: 'opt_1',
        text: 'Genuine Astrophysical Flux Increase (Variable Star / Transient)',
        textAr: 'زيادة فلكية حقيقية في التدفق (نجم متغير / انفجار كوني عابر)',
        isCorrect: true,
        explanation: 'Correct! The source is stationary, confirmed by aperture photometry across both epochs, with a strong single-polarity residual (>14σ) and nominal PSF morphology.',
        explanationAr: 'صحيح تماماً! الجرم ثابت في موكزه، مؤكد بالقياس الضوئي الحلقي في كلا التعريضين، مع فرق موجب قوي (>14σ) ومورفولوجيا متطابقة مع دالة انتشار النقطة.',
      },
      {
        id: 'opt_2',
        text: 'Fast-Moving Solar System Asteroid',
        textAr: 'كويكب سريع من النظام الشمسي',
        isCorrect: false,
        explanation: 'Incorrect. A moving asteroid leaves an opposite-sign dipole (negative trough where it was, positive peak where it went). Here, the source remained at the exact same coordinates.',
        explanationAr: 'غير صحيح. الكويكب المتحرك يترك خلفه ثنائي قطب متعاكس الإشارة (انخفاض سالب مكانه السابق، وقمة موجبة مكانه الجديد). هنا الجرم ظل في نفس المكان تماماً.',
      },
      {
        id: 'opt_3',
        text: 'Detector Pointing Jitter Artifact',
        textAr: 'تشويش ناتج عن اهتزاز توجيه المستشعر',
        isCorrect: false,
        explanation: 'Incorrect. Pointing jitter produces a characteristic tight dipole with adjacent positive and negative lobes cancelling each other out in integrated flux.',
        explanationAr: 'غير صحيح. اهتزاز التوجيه ينتج ثنائي قطب متلاصق بفصين موجب وسالب يلغيان بعضهما في القياس الضوئي المتكامل.',
      },
    ],
  },
  {
    id: 'scen-faded-02',
    title: 'Extinction of Infrared Source',
    titleAr: 'خفوت مفاجئ لمصدر تحت أحمر',
    targetName: 'SIM-ECL-002',
    epoch1Date: '2025-04-28',
    epoch2Date: '2025-04-29',
    timeBaseline: '1.2 days',
    timeBaselineAr: '1.2 يوم',
    description: 'A bright point source drops substantially in brightness in subsequent follow-up.',
    descriptionAr: 'جرم نقطي ساطع ينخفض لمعانه بشكل حاد في متابعة لاحقة.',
    epoch1Appearance: 'Clear bright star at (28, 40) with flux ~44.0 MJy/sr.',
    epoch1AppearanceAr: 'نجم ساطع وواضح عند (28, 40) بتدفق ~44.0 MJy/sr.',
    epoch2Appearance: 'Significantly fainter star at (28, 40) with flux ~11.5 MJy/sr.',
    epoch2AppearanceAr: 'نجم أخفت بكثير عند نفس الموضع بتدفق ~11.5 MJy/sr.',
    differenceAppearance: 'Pure negative Gaussian trough (-32.5 MJy/sr, S/N = -11.8σ) centered at the star coordinates.',
    differenceAppearanceAr: 'انخفاض غاوسي سالب نقي (-32.5 MJy/sr، أهمية إحصائية -11.8σ) متمركز تماماً على النجم.',
    snr: -11.8,
    deltaFlux: '-32.5 ± 2.7 MJy/sr',
    syntheticImagePattern: 'faded',
    options: [
      {
        id: 'opt_1',
        text: 'Genuine Astrophysical Flux Decrease (Eclipsing Binary / Fading Flare)',
        textAr: 'انخفاض فلكي حقيقي في التدفق (ثنائي كسوفي / خفوت وميض نجمي)',
        isCorrect: true,
        explanation: 'Correct! The negative difference indicates the source was brighter in Epoch 1 than Epoch 2 (D = I2 - I1 < 0), representing a genuine dimming event.',
        explanationAr: 'صحيح! الإشارة السالبة في صورة الفرق تعني أن الجرم كان أسطع في الزمن 1 مقارنة بالزمن 2 (D = I2 - I1 < 0)، وهو خفوت فلكي حقيقي.',
      },
      {
        id: 'opt_2',
        text: 'Cosmic Ray Hit on Epoch 2',
        textAr: 'ضربة شعاع كوني في التعريض الثاني',
        isCorrect: false,
        explanation: 'Incorrect. A cosmic ray hit adds sharp positive charge to a frame, creating a positive spike (+D), not a broad symmetric negative trough.',
        explanationAr: 'غير صحيح. ضربة الأشعة الكونية تضيف شحنة موجبة حادة للصورة فتنتج قمة موجبة (+D)، وليس انخفاضاً سالباً متناسقاً.',
      },
    ],
  },
  {
    id: 'scen-moving-03',
    title: 'Displaced Complementary Dipole',
    titleAr: 'ثنائي قطب متباعد ومتكامل الإشارة',
    targetName: 'SIM-AST-003',
    epoch1Date: '2025-06-01',
    epoch2Date: '2025-06-03',
    timeBaseline: '2.0 days',
    timeBaselineAr: '2.0 يوم',
    description: 'Two complementary opposite-sign residuals separated by 8.5 pixels (52.3 arcseconds).',
    descriptionAr: 'إشارتان متعاكستان ومتكاملتان تفصل بينهما 8.5 بكسل (52.3 ثانية قوسية).',
    epoch1Appearance: 'Point source at (20, 24) with flux ~25.0 MJy/sr; blank sky at (28, 27).',
    epoch1AppearanceAr: 'جرم نقطي عند (20, 24) بتدفق ~25.0 MJy/sr؛ وسماء فارغة تماماً عند (28, 27).',
    epoch2Appearance: 'Blank sky at (20, 24); new point source at (28, 27) with flux ~24.8 MJy/sr.',
    epoch2AppearanceAr: 'سماء فارغة عند (20, 24)؛ وظهور جرم نقطي جديد عند (28, 27) بتدفق ~24.8 MJy/sr.',
    differenceAppearance: 'Negative trough at (20, 24) of -23.0 MJy/sr paired with positive peak at (28, 27) of +22.8 MJy/sr.',
    differenceAppearanceAr: 'انخفاض سالب عند (20, 24) بقيمة -23.0 MJy/sr مقترن بقمة موجبة عند (28, 27) بقيمة +22.8 MJy/sr.',
    snr: 9.6,
    deltaFlux: '+22.8 / -23.0 MJy/sr (balanced dipole)',
    syntheticImagePattern: 'moving',
    options: [
      {
        id: 'opt_1',
        text: 'Candidate Moving Object (Solar System Asteroid / Kuiper Belt Object)',
        textAr: 'مرشح جرم متحرك (كويكب من النظام الشمسي / جرم من حزام كايبر)',
        isCorrect: true,
        explanation: 'Correct! A source vanished from position 1 (leaving a negative residual) and appeared at position 2 (leaving an equal positive residual), with an apparent speed of 26.1"/day consistent with orbital motion.',
        explanationAr: 'رائع وصحيح! اختفى الجرم من الموقع 1 (تاركاً فرقاً سالباً) وظهر في الموقع 2 (تاركاً فرقاً موجباً مساوياً)، بسرعة ظاهرية 26.1 ثانية قوسية/يوم تتوافق مع مدارات كويكبات النظام الشمسي.',
      },
      {
        id: 'opt_2',
        text: 'Independent Supernova and Vanishing Star Coincidence',
        textAr: 'صدفة متزامنة لمستعر أعظم ونجم يختفي بجانبه',
        isCorrect: false,
        explanation: 'Astrophysically implausible. Two independent events with identical flux magnitudes separated by arcseconds over 48 hours is overwhelmingly explained by a single moving object.',
        explanationAr: 'تفسير غير منطقي فلكياً. حدوث ظاهرتين مستقلتين بنفس التدفق تماماً على مسافة ثوان قوسية خلال 48 ساعة يفسره وجود جرم متحرك واحد.',
      },
      {
        id: 'opt_3',
        text: 'Instrumental Subpixel Pointing Jitter',
        textAr: 'اهتزاز توجيه دون بكسلي للأجهزة',
        isCorrect: false,
        explanation: 'Incorrect. Pointing jitter produces displacements of < 1.5 pixels where positive and negative lobes touch. A separation of 8.5 pixels far exceeds telescope pointing errors.',
        explanationAr: 'غير صحيح. اهتزاز التوجيه ينتج إزاحة أقل من 1.5 بكسل تتلامس فيها الإشارتان، أما تباعد 8.5 بكسل فيتجاوز تماماً خطأ توجيه التلسكوب.',
      },
    ],
  },
  {
    id: 'scen-jitter-04',
    title: 'Tightly Paired Opposite-Sign Lobes on Bright Star',
    titleAr: 'فصان متعاكسان متلاصقان حول نجم ساطع',
    targetName: 'SIM-CAL-004',
    epoch1Date: '2025-04-28T13:00',
    epoch2Date: '2025-04-28T13:02',
    timeBaseline: '128 seconds (intra-visit exposure)',
    timeBaselineAr: '128 ثانية (تعريضان متتاليان في نفس الزيارة)',
    description: 'A bright 8th-magnitude calibration star shows a positive lobe directly adjacent to a negative lobe.',
    descriptionAr: 'نجم معايرة ساطع يظهر فصاً موجباً ملاصقاً مباشرة لفص سالب في صورة الفرق.',
    epoch1Appearance: 'Bright saturated core star at (32.0, 32.0) with flux 180.0 MJy/sr.',
    epoch1AppearanceAr: 'نجم ساطع جداً مشبع المركز عند (32.0, 32.0) بتدفق 180.0 MJy/sr.',
    epoch2Appearance: 'Bright star slightly shifted by 0.3 pixels to (32.3, 32.0) with identical integrated flux.',
    epoch2AppearanceAr: 'نجم ساطع منزاح طفيفاً بمقدار 0.3 بكسل إلى (32.3, 32.0) مع تطابق التدفق الإجمالي.',
    differenceAppearance: 'Classic zero-crossing registration dipole: +35 MJy/sr adjacent to -34 MJy/sr (|dx| < 1 px). Net aperture flux = 0.4 ± 1.1 MJy/sr.',
    differenceAppearanceAr: 'ثنائي قطب كلاسيكي لتسجيل الإحداثيات: +35 ملاصق لـ -34 (|dx| < 1 بكسل). صافي التدفق الحلقي = 0.4 ± 1.1 MJy/sr.',
    snr: 8.9,
    deltaFlux: '+0.4 ± 1.1 MJy/sr (net aperture consistent with zero)',
    syntheticImagePattern: 'jitter_dipole',
    options: [
      {
        id: 'opt_1',
        text: 'Astrometric Pointing Jitter / Registration Artifact (Reject)',
        textAr: 'تشويش اهتزاز التوجيه / عدم دقة التسجيل الفلكي (يُستبعد)',
        isCorrect: true,
        explanation: 'Correct! The opposing lobes cancel out over an aperture, proving total flux is unchanged. The feature is caused by microscopic subpixel telescope motion between exposures.',
        explanationAr: 'ممتاز! الفصان المتعاكسان يلغيان بعضهما داخل دائرة القياس الضوئي، مما يثبت أن التدفق الكلي لم يتغير. هذه الظاهرة ناتجة عن اهتزاز ميكروسكوبي للتلسكوب.',
      },
      {
        id: 'opt_2',
        text: 'Binary Star Orbital Motion Discovery',
        textAr: 'اكتشاف حركة مدارية لنجم ثنائي',
        isCorrect: false,
        explanation: 'Incorrect. Stellar orbits take months to centuries. Moving 0.3 pixels in 128 seconds would imply a physical speed faster than light!',
        explanationAr: 'غير صحيح. المدارات النجمية تستغرق شهوراً أو قروناً. التحرك بمقدار 0.3 بكسل في 128 ثانية يعني سرعة فيزيائية أسرع من الضوء!',
      },
    ],
  },
  {
    id: 'scen-noise-05',
    title: 'Isolated Single-Pixel Difference Spike',
    titleAr: 'قفزة مفردة في بكسل واحد معزول',
    targetName: 'SIM-NOI-005',
    epoch1Date: '2025-05-15',
    epoch2Date: '2025-05-18',
    timeBaseline: '3.0 days',
    timeBaselineAr: '3.0 أيام',
    description: 'A single pixel shows an apparent +4.3σ difference, but surrounding pixels remain completely flat.',
    descriptionAr: 'بكسل واحد فقط يظهر فرقاً ظاهرياً +4.3σ، بينما تظل جميع البكسلات المجاورة له مستوية تماماً.',
    epoch1Appearance: 'Uniform background noise ~0.2 MJy/sr across the region.',
    epoch1AppearanceAr: 'ضوضاء خلفية منتظمة ~0.2 MJy/sr في كامل المنطقة.',
    epoch2Appearance: 'Sharp single-pixel hit at (45, 18) with flux 4.8 MJy/sr; FWHM = 0.6 pixels.',
    epoch2AppearanceAr: 'إشارة حادة في بكسل واحد عند (45, 18) بتدفق 4.8 MJy/sr؛ وعرض نصف أقصى FWHM = 0.6 بكسل.',
    differenceAppearance: 'Sharp needle peak at one pixel. Aperture photometry S/N = 1.4σ (below detection threshold).',
    differenceAppearanceAr: 'قمة إبرية حادة في بكسل واحد فقط. القياس الضوئي الحلقي S/N = 1.4σ (أقل من عتبة الكشف).',
    snr: 4.3,
    deltaFlux: '+1.1 ± 0.8 MJy/sr (Aperture S/N = 1.4σ)',
    syntheticImagePattern: 'noise_spike',
    options: [
      {
        id: 'opt_1',
        text: 'Insufficient Evidence / Transient Cosmic Ray Artifact (Reject)',
        textAr: 'أدلة غير كافية / شعاع كوني عابر (يُستبعد كمرشح)',
        isCorrect: true,
        explanation: 'Correct! Real telescope optics blur every point source across multiple pixels according to the Point Spread Function (PSF, FWHM ~ 2.2 px). A single-pixel spike is an unphysical cosmic ray hit or detector noise spike.',
        explanationAr: 'صحيح تماماً! البصريات الحقيقية لأي تلسكوب توزع ضوء النجم النقطي على عدة بكسلات وفق دالة انتشار النقطة (PSF، بعرض ~2.2 بكسل). الإشارة المحصورة في بكسل واحد هي ضربة شعاع كوني وليست جرماً فلكياً.',
      },
      {
        id: 'opt_2',
        text: 'New Exoplanet Candidate Discovery',
        textAr: 'اكتشاف كوكب خارجي مرشح جديد',
        isCorrect: false,
        explanation: 'Exoplanets cannot be detected as single-pixel difference spikes. All genuine astronomical sources obey the optical point spread function.',
        explanationAr: 'الكواكب الخارجية لا تكتشف كإبرة في بكسل واحد. جميع الأجرام الفلكية الحقيقية تخضع بالضرورة لدالة انتشار الضوء البصري للتلسكوب.',
      },
    ],
  },
];

export interface SyntheticImageData {
  width: number;
  height: number;
  epoch1: Float32Array;
  epoch2: Float32Array;
  diff: Float32Array;
  targetX: number;
  targetY: number;
  targetX2?: number;
  targetY2?: number;
}

// Deterministic pseudo-random number generator for reproducible synthetic noise
function pseudoRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateSyntheticScenarioImages(pattern: string): SyntheticImageData {
  const width = 48;
  const height = 48;
  const size = width * height;
  const epoch1 = new Float32Array(size);
  const epoch2 = new Float32Array(size);
  const diff = new Float32Array(size);

  const rand = pseudoRandom(12345);

  // Background noise (mean ~5.0, sigma ~0.7)
  for (let i = 0; i < size; i++) {
    const u1 = rand();
    const u2 = rand();
    const gNoise = Math.sqrt(-2 * Math.log(u1 + 1e-9)) * Math.cos(2 * Math.PI * u2) * 0.7;
    epoch1[i] = 5.0 + gNoise;

    const u3 = rand();
    const u4 = rand();
    const gNoise2 = Math.sqrt(-2 * Math.log(u3 + 1e-9)) * Math.cos(2 * Math.PI * u4) * 0.7;
    epoch2[i] = 5.0 + gNoise2;
  }

  // Common background reference stars (stationary)
  const bgStars = [
    { x: 10, y: 12, flux: 32.0 },
    { x: 38, y: 14, flux: 28.0 },
    { x: 12, y: 38, flux: 25.0 },
    { x: 40, y: 36, flux: 35.0 },
    { x: 24, y: 8, flux: 18.0 },
  ];

  const psfSigma = 1.35;
  const twoSigmaSq = 2 * psfSigma * psfSigma;

  const addStar = (arr: Float32Array, cx: number, cy: number, flux: number) => {
    const r = 5;
    const minX = Math.max(0, Math.floor(cx - r));
    const maxX = Math.min(width - 1, Math.ceil(cx + r));
    const minY = Math.max(0, Math.floor(cy - r));
    const maxY = Math.min(height - 1, Math.ceil(cy + r));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d2 = dx * dx + dy * dy;
        const val = flux * Math.exp(-d2 / twoSigmaSq);
        arr[y * width + x] += val;
      }
    }
  };

  // Add stationary background stars to both epochs
  for (const s of bgStars) {
    addStar(epoch1, s.x, s.y, s.flux);
    addStar(epoch2, s.x, s.y, s.flux);
  }

  let targetX = 24;
  let targetY = 24;
  let targetX2: number | undefined;
  let targetY2: number | undefined;

  switch (pattern) {
    case 'brightened':
      targetX = 24;
      targetY = 24;
      addStar(epoch1, targetX, targetY, 12.0);
      addStar(epoch2, targetX, targetY, 58.4);
      break;

    case 'faded':
      targetX = 24;
      targetY = 26;
      addStar(epoch1, targetX, targetY, 44.0);
      addStar(epoch2, targetX, targetY, 11.5);
      break;

    case 'moving':
      targetX = 18;
      targetY = 22;
      targetX2 = 28;
      targetY2 = 26;
      addStar(epoch1, targetX, targetY, 25.0);
      addStar(epoch2, targetX2, targetY2, 24.8);
      break;

    case 'jitter_dipole':
      targetX = 24;
      targetY = 24;
      // 0.35 px subpixel shift produces zero-crossing registration dipole
      addStar(epoch1, targetX, targetY, 80.0);
      addStar(epoch2, targetX + 0.35, targetY, 80.0);
      break;

    case 'noise_spike':
      targetX = 28;
      targetY = 20;
      // Single pixel without PSF spread (cosmic ray or noise spike)
      epoch2[targetY * width + targetX] += 22.0;
      break;

    case 'final_mystery':
    default:
      targetX = 16;
      targetY = 20;
      targetX2 = 26;
      targetY2 = 28;
      addStar(epoch1, targetX, targetY, 30.0);
      addStar(epoch2, targetX2, targetY2, 29.5);
      break;
  }

  // Compute strictly D = I2 - I1
  for (let i = 0; i < size; i++) {
    diff[i] = epoch2[i] - epoch1[i];
  }

  return {
    width,
    height,
    epoch1,
    epoch2,
    diff,
    targetX,
    targetY,
    targetX2,
    targetY2,
  };
}
