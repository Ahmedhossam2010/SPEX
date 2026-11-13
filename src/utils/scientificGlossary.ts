export type GlossaryCategoryId =
  | 'astronomy_basics'
  | 'telescopes_observatories'
  | 'infrared_astronomy'
  | 'spherex_mission'
  | 'space_exploration'
  | 'light_spectroscopy'
  | 'stars_galaxies'
  | 'scientific_imaging'
  | 'data_analysis'
  | 'time_domain'
  | 'scientific_evidence';

export interface GlossaryCategoryInfo {
  id: GlossaryCategoryId;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export const GLOSSARY_CATEGORIES: GlossaryCategoryInfo[] = [
  {
    id: 'astronomy_basics',
    nameEn: 'Astronomy Basics',
    nameAr: 'أساسيات علم الفلك',
    descriptionEn: 'Core concepts, celestial mapping coordinates, and cosmic distances.',
    descriptionAr: 'المفاهيم الأساسية، إحداثيات القبة السماوية، والمسافات الكونية.',
  },
  {
    id: 'telescopes_observatories',
    nameEn: 'Telescopes & Observatories',
    nameAr: 'التلسكوبات والمراصد',
    descriptionEn: 'How instruments collect light from distant space and maintain space operations.',
    descriptionAr: 'كيف تجمع المراصد الضوء من أعماق الفضاء وتعمل في البيئة الفضائية القاسية.',
  },
  {
    id: 'infrared_astronomy',
    nameEn: 'Infrared Astronomy',
    nameAr: 'علم الفلك تحت الأحمر',
    descriptionEn: 'Observing thermal glow through cosmic dust to reveal hidden worlds.',
    descriptionAr: 'رصد التوهج الحراري عبر سحب الغبار الكوني لكشف العوالم الخفية.',
  },
  {
    id: 'spherex_mission',
    nameEn: 'SPHEREx Mission',
    nameAr: 'مهمة سبيراكس',
    descriptionEn: 'NASA’s all-sky spectral survey mission mapping the universe in 102 infrared bands.',
    descriptionAr: 'مهمة ناسا لمسح كامل السماء طيفياً عبر 102 نطاق من الأشعة تحت الحمراء.',
  },
  {
    id: 'space_exploration',
    nameEn: 'Space Exploration',
    nameAr: 'استكشاف الفضاء',
    descriptionEn: 'Deep-field survey strategy, spacecraft orbits, and observation footprints.',
    descriptionAr: 'استراتيجيات المسح العميق، مدارات المركبات الفضائية، وبصمات الرصد في السماء.',
  },
  {
    id: 'light_spectroscopy',
    nameEn: 'Light & Spectroscopy',
    nameAr: 'الضوء والتحليل الطيفي',
    descriptionEn: 'Breaking light into colors to decode chemical composition and cosmic motion.',
    descriptionAr: 'تفكيك الضوء إلى ألوانه الطيفية لمعرفة التركيب الكيميائي وسرعة الأجرام.',
  },
  {
    id: 'stars_galaxies',
    nameEn: 'Stars & Galaxies',
    nameAr: 'النجوم والمجرات',
    descriptionEn: 'Variable stars, cold brown dwarfs, pulsating giants, and cosmic explosions.',
    descriptionAr: 'النجوم المتغيرة، الأقزام البنية الباردة، العمالقة النابضة، والانفجارات الكونية.',
  },
  {
    id: 'scientific_imaging',
    nameEn: 'Scientific Imaging',
    nameAr: 'التصوير الفلكي العلمي',
    descriptionEn: 'Calibrated digital FITS files, pixel scales, and quantitative photon counting.',
    descriptionAr: 'ملفات FITS المعايرة، مقاييس البكسل، وعد فوتونات الضوء بدقة رقمية مطلقة.',
  },
  {
    id: 'data_analysis',
    nameEn: 'Data Analysis',
    nameAr: 'تحليل البيانات الفلكية',
    descriptionEn: 'Difference imaging, aperture photometry, WCS alignment, and variance estimation.',
    descriptionAr: 'طرح الصور الفلكية، القياس الضوئي الدائري، محاذاة الإحداثيات، وحساب تباين الحساس.',
  },
  {
    id: 'time_domain',
    nameEn: 'Time-Domain Astronomy',
    nameAr: 'علم الفلك الزمني والمتغيرات',
    descriptionEn: 'Tracking motions, flaring objects, and dynamic changes across time baselines.',
    descriptionAr: 'تتبع حركة الأجرام وتغير سطوعها والظواهر الديناميكية عبر فترات زمنية متعاقبة.',
  },
  {
    id: 'scientific_evidence',
    nameEn: 'Scientific Evidence',
    nameAr: 'الأدلة العلمية والاكتشاف',
    descriptionEn: 'Statistical confidence (sigma), catalog cross-matching, and artifact rejection.',
    descriptionAr: 'درجات الثقة الإحصائية (سيجما)، مضاهاة الفهارس، وتصفية عيوب الكاميرات والأجهزة.',
  },
];

export interface GlossaryTerm {
  id: string;
  category: GlossaryCategoryId;
  symbol?: string;
  nameEn: string;
  nameAr: string;
  simpleNameEn: string;
  simpleNameAr: string;
  simpleExplanationEn: string; // Level 1 (Simple beginner)
  simpleExplanationAr: string;
  whyItMattersEn: string; // Level 2 (Why it matters in exploration)
  whyItMattersAr: string;
  practicalExampleEn: string; // Practical real-world / SPHEREx example
  practicalExampleAr: string;
  technicalDetailsEn: string; // Level 3 (Deep scientific / mathematical)
  technicalDetailsAr: string;
  relatedTerms: string[];
}

export const SCIENTIFIC_GLOSSARY: Record<string, GlossaryTerm> = {
  // --- ASTRONOMY BASICS ---
  ra_dec: {
    id: 'ra_dec',
    category: 'astronomy_basics',
    symbol: 'RA / Dec',
    nameEn: 'Right Ascension & Declination',
    nameAr: 'المطلع المستقيم والميل السماوي',
    simpleNameEn: 'Celestial GPS Coordinates',
    simpleNameAr: 'إحداثيات الملاحة في السماء',
    simpleExplanationEn: 'Right Ascension and Declination are the universal longitude and latitude of the night sky used by all astronomers to pinpoint any cosmic object.',
    simpleExplanationAr: 'المطلع المستقيم والميل هما خطوط الطول والعرض السماوية التي يستخدمها علماء الفلك لتحديد موقع أي جرم كوني في السماء بدقة.',
    whyItMattersEn: 'Without standardized sky coordinates, space telescopes would not know where to aim or how to return to the exact same star weeks later.',
    whyItMattersAr: 'بدون هذه الإحداثيات الموحدة، لن يتمكن أي تلسكوب فضائي من تصويب كاميراته أو العودة لنفس النجم لمقارنته بعد أسابيع.',
    practicalExampleEn: "Barnard's Star is located at RA 269.45208° (17h 57m 48.5s) and Dec +04.69339° (+04° 41′ 36″).",
    practicalExampleAr: 'يقع نجم بارنارد عند مطلع مستقيم 269.45208° وميل سماوي +04.69339° في كوكبة الحواء.',
    technicalDetailsEn: 'Right Ascension (α) is measured eastward along the celestial equator from the vernal equinox (0°–360° or 0h–24h). Declination (δ) measures angular distance north (+90°) or south (-90°) of the celestial equator.',
    technicalDetailsAr: 'المطلع المستقيم (α) يُقاس باتجاه الشرق على طول خط الاستواء السماوي من نقطة الاعتدال الربيعي (0°–360° أو 0–24 ساعة). والميل (δ) يقيس المسافة الزاوية شمالاً (+90°) أو جنوباً (-90°).',
    relatedTerms: ['wcs', 'arcsecond', 'proper_motion'],
  },

  arcsecond: {
    id: 'arcsecond',
    category: 'astronomy_basics',
    symbol: '″',
    nameEn: 'Arcsecond',
    nameAr: 'الثانية القوسية',
    simpleNameEn: 'Tiny Angle Measurement',
    simpleNameAr: 'أصغر وحدة قياس زاوية في السماء',
    simpleExplanationEn: 'An arcsecond is an extremely tiny slice of angle—equal to 1/3,600th of one single degree on the sky.',
    simpleExplanationAr: 'الثانية القوسية هي جزء بالغ الصغر من الزاوية؛ تعادل 1 من 3600 من الدرجة الواحدة في قبة السماء.',
    whyItMattersEn: 'Astronomers use arcseconds to describe telescope sharpness, field sizes, and the slow drift of distant stars across decades.',
    whyItMattersAr: 'يستخدمها الفلكيون لقياس دقة وضوح التلسكوبات، وحجم الرقع المصورة، ومعدل حركة النجوم السريعة عبر السنوات.',
    practicalExampleEn: 'One SPHEREx camera detector pixel covers approximately 6.2 arcseconds of the night sky (~0.00172 degrees).',
    practicalExampleAr: 'بكسل واحد في مستشعر تلسكوب SPHEREx يغطي حوالي 6.2 ثانية قوسية من السماء (~0.00172 درجة).',
    technicalDetailsEn: '1 circle = 360 degrees = 21,600 arcminutes (′) = 1,296,000 arcseconds (″). In radians: 1 arcsec = π / (180 × 3600) ≈ 4.8481 × 10⁻⁶ rad.',
    technicalDetailsAr: 'الدائرة الكاملة = 360 درجة = 21600 دقيقة قوسية = 1296000 ثانية قوسية. بالراديان: 1 ثانية قوسية ≈ 4.8481 × 10⁻⁶ راديان.',
    relatedTerms: ['ra_dec', 'pixel_scale', 'proper_motion'],
  },

  light_year: {
    id: 'light_year',
    category: 'astronomy_basics',
    symbol: 'ly',
    nameEn: 'Light-Year',
    nameAr: 'السنة الضوئية',
    simpleNameEn: 'Cosmic Distance Unit',
    simpleNameAr: 'مسافة السفر بسرعة الضوء في عام',
    simpleExplanationEn: 'A light-year is the vast distance that a beam of light travels through empty space in one Earth year—about 9.46 trillion kilometers.',
    simpleExplanationAr: 'السنة الضوئية هي المسافة الهائلة التي يقطعها شعاع الضوء في الفراغ خلال سنة أرضية كاملة، وتساوي حوالي 9.46 تريليون كيلومتر.',
    whyItMattersEn: 'Because light takes time to travel, looking at an object 10 light-years away means we are seeing how it looked 10 years in the past.',
    whyItMattersAr: 'لأن الضوء يستغرق وقتاً ليسافر، فإن النظر إلى جرم يبعد 10 سنوات ضوئية يعني رؤيته كما كان قبل 10 سنوات في الماضي.',
    practicalExampleEn: "Barnard's Star is only 5.96 light-years from Earth, making it the second-closest known stellar system after Alpha Centauri.",
    practicalExampleAr: 'يبعد نجم بارنارد 5.96 سنة ضوئية فقط عن الأرض، وهو ثاني أقرب نظام نجمي إلينا بعد رجل القنطور.',
    technicalDetailsEn: '1 ly = c × 1 Julian year (31,557,600 s) = 9.460730472 × 10¹⁵ meters ≈ 63,241.1 Astronomical Units (AU) ≈ 0.3066 parsecs (pc).',
    technicalDetailsAr: 'السنة الضوئية = سرعة الضوء × سنة يوليانية = 9.46 × 10¹⁵ متر ≈ 63241 وحدة فلكية ≈ 0.3066 فرسخ فلكي.',
    relatedTerms: ['redshift', 'proper_motion', 'stars_galaxies'],
  },

  // --- TELESCOPES & OBSERVATORIES ---
  space_telescope: {
    id: 'space_telescope',
    category: 'telescopes_observatories',
    symbol: 'Sat',
    nameEn: 'Space Telescope',
    nameAr: 'التلسكوب الفضائي',
    simpleNameEn: 'Orbiting Eye in Space',
    simpleNameAr: 'مرصد فلكي في مدار الفضاء',
    simpleExplanationEn: 'A telescope launched into orbit above Earth’s atmosphere to observe the cosmos without atmospheric distortion or weather blockage.',
    simpleExplanationAr: 'تلسكوب يُطلق في مدار حول الأرض ليرصد الكون من خارج الغلاف الجوي دون أي تشويش هوائي أو حجب بالغيوم والحرارة.',
    whyItMattersEn: 'Earth’s atmosphere absorbs most infrared light and emits its own blinding heat glow. Placing SPHEREx in space enables crystal-clear infrared vision.',
    whyItMattersAr: 'الغلاف الجوي للأرض يمتص معظم الأشعة تحت الحمراء ويشع حرارته الخاصة؛ إطلاق التلسكوب للفضاء يسمح برؤية تحت حمراء فائقة النقاء.',
    practicalExampleEn: 'SPHEREx operates in a Sun-synchronous low Earth orbit at ~700 km altitude, always looking outward along the day-night terminator.',
    practicalExampleAr: 'يعمل SPHEREx في مدار متزامن مع الشمس على ارتفاع ~700 كم، موجهاً عينه دائماً نحو الفضاء العميق بعيداً عن حرارة الشمس.',
    technicalDetailsEn: 'Free of Rayleigh scattering, atmospheric water vapor (H₂O) absorption bands, and telluric ozone (O₃) glow, allowing photon-limited astronomical sensitivity.',
    technicalDetailsAr: 'يتفادى تشتت رايلي، وامتصاص بخار الماء الجوي، وتوهج الأوزون، مما يحقق حساسية رصد قصوى محدودة فقط بفوتونات الجرم السماوي.',
    relatedTerms: ['cryogenic_cooling', 'infrared', 'spherex_all_sky'],
  },

  cryogenic_cooling: {
    id: 'cryogenic_cooling',
    category: 'telescopes_observatories',
    symbol: 'Kelvin',
    nameEn: 'Cryogenic & Radiative Cooling',
    nameAr: 'التبريد الإشعاعي الفائق',
    simpleNameEn: 'Deep Freezing the Camera',
    simpleNameAr: 'تجميد حساسات الكاميرا في الفضاء',
    simpleExplanationEn: 'Cooling the telescope optics and infrared detectors down to near absolute zero so the camera’s own heat doesn’t blind its sensitive sensors.',
    simpleExplanationAr: 'تبريد عدسات ومستشعرات التلسكوب الفضائي لدرجات حرارة تقترب من الصفر المطلق حتى لا تعمي حرارة التلسكوب نفسه كاميراته الحساسة.',
    whyItMattersEn: 'Any warm telescope radiates infrared light. Without cryogenic cooling, thermal noise would drown out faint signals from distant cold stars.',
    whyItMattersAr: 'أي جسم دافئ يشع حرارة وأشعة تحت حمراء؛ وبدون التبريد، ستغرق أضواء النجوم الباردة في بحر من التشويش الحراري للحساس نفسه.',
    practicalExampleEn: 'SPHEREx uses passive V-groove thermal radiators and shields to chill its infrared detector arrays down to below 80 Kelvin (-193°C) without heavy liquid coolants.',
    practicalExampleAr: 'يستخدم SPHEREx ألواح تبريد إشعاعية بتصميم حرف V لتبريد كواشفه لأقل من 80 كلفن (-193 مئوية) دون الحاجة لحمل سوائل تبريد ثقيلة.',
    technicalDetailsEn: 'Minimizes thermal dark current (I_dark ∝ T^(3/2) exp(-E_g / 2kT)) and instrumental background photon noise to achieve sub-electron read-noise equivalence.',
    technicalDetailsAr: 'يخفض تيار الظلام الحراري المتناسب مع درجة الحرارة وضوضاء فوتونات الخلفية، مما يسمح بالتقاط الإشارات الخافتة جداً بدقة الإلكترون الفردي.',
    relatedTerms: ['infrared', 'variance', 'space_telescope'],
  },

  irsa: {
    id: 'irsa',
    category: 'telescopes_observatories',
    symbol: 'IRSA',
    nameEn: 'NASA/IPAC Infrared Science Archive',
    nameAr: 'أرشيف ناسا لعلوم الأشعة تحت الحمراء',
    simpleNameEn: 'NASA Space Data Vault',
    simpleNameAr: 'خزنة ناسا لبيانات الفضاء',
    simpleExplanationEn: 'The official NASA scientific repository operated at Caltech that permanently curates and distributes calibrated data from infrared missions.',
    simpleExplanationAr: 'المركز العلمي الرسمي لوكالة ناسا ومعهد كالتيك لتخزين وأرشفة بيانات تلسكوبات الأشعة تحت الحمراء وإتاحتها للعلماء والجمهور.',
    whyItMattersEn: 'Every pixel examined in SPEX is retrieved directly from certified IRSA Level-2B archives, ensuring authentic scientific reproducibility.',
    whyItMattersAr: 'كل بكسل تفحصه في منصتنا مستخرج مباشرة من السجلات الرسمية الموثقة لوكالة ناسا لضمان المصداقية العلمية الكاملة.',
    practicalExampleEn: 'IRSA delivers SPHEREx calibrated science frames via IVOA Table Access Protocol (TAP) and Image Cutout services.',
    practicalExampleAr: 'يوفر أرشيف IRSA لقطات سبيراكس العلمية المعايرة عبر بروتوكولات TAP وخدمات القص الفلكي.',
    technicalDetailsEn: 'Implements IVOA standards including TAP (Table Access Protocol), SIA (Simple Image Access), and ObsCore data models for petabyte-scale infrared astronomy.',
    technicalDetailsAr: 'يطبق معايير التحالف الدولي للمراصد الافتراضية IVOA لتمكين الاستعلام البرمجي المباشر عن البيانات والصور الفلكية الضخمة.',
    relatedTerms: ['fits', 'spherex_mission', 'data_analysis'],
  },

  // --- INFRARED ASTRONOMY ---
  infrared: {
    id: 'infrared',
    category: 'infrared_astronomy',
    symbol: 'IR / λ',
    nameEn: 'Infrared Astronomy',
    nameAr: 'علم الفلك تحت الأحمر',
    simpleNameEn: 'Seeing Heat in Space',
    simpleNameAr: 'رؤية التوهج الحراري في الفضاء',
    simpleExplanationEn: 'Infrared light is a type of electromagnetic radiation with wavelengths longer than visible red light, allowing us to see cool worlds and heat sources invisible to human eyes.',
    simpleExplanationAr: 'الأشعة تحت الحمراء هي موجات ضوئية أطول من الضوء الأحمر المرئي، تمكننا من رؤية العوالم الباردة ومصادر الحرارة التي تعجز أعيننا عن رؤيتها.',
    whyItMattersEn: 'Infrared light effortlessly passes through dense cosmic dust clouds that block visible light, revealing baby stars forming inside molecular nurseries.',
    whyItMattersAr: 'تخترق الأشعة تحت الحمراء سحب الغبار الكوني الكثيفة التي تحجب الضوء العادي، كاشفة عن النجوم الوليدة داخل السدم المظلمة.',
    practicalExampleEn: 'WISE 0855-0714 is completely pitch-black and invisible in normal optical light, but blazes like a cosmic beacon in infrared at 2.76 µm and 4.6 µm.',
    practicalExampleAr: 'الجرم WISE 0855-0714 مظلم تماماً ولا يُرى في الضوء العادي، لكنه يتوهج بوضوح تام في الأشعة تحت الحمراء عند 2.76 و 4.6 ميكرومتر.',
    technicalDetailsEn: 'Spans wavelengths from 0.75 µm to ~350 µm (near-IR: 0.75–2.5 µm, mid-IR: 2.5–25 µm, far-IR: 25–350 µm), tracing blackbody peaks of cool thermal emitters (T ≈ 10–3000 K).',
    technicalDetailsAr: 'يمتد من 0.75 إلى 350 ميكرومتر، ويتبع قمم إشعاع الجسم الأسود للأجرام الباردة بدرجات حرارة تتراوح بين 10 إلى 3000 كلفن.',
    relatedTerms: ['mid_infrared', 'spectroscopy', 'brown_dwarf'],
  },

  mid_infrared: {
    id: 'mid_infrared',
    category: 'infrared_astronomy',
    symbol: 'MIR',
    nameEn: 'Mid-Infrared Spectrum',
    nameAr: 'طيف الأشعة تحت الحمراء المتوسطة',
    simpleNameEn: 'Room-Temperature Universe Glow',
    simpleNameAr: 'طيف الأجرام معتدلة الحرارة والجليد',
    simpleExplanationEn: 'The portion of infrared light (roughly 2.5 to 25 microns) where cold dust grains, planetary atmospheres, and cosmic water ices glow and absorb light.',
    simpleExplanationAr: 'جزء من الأشعة تحت الحمراء (بين 2.5 و 25 ميكرومتر) تتوهج فيه حبيبات الغبار البارد وأغلفة الكواكب وسحب الجليد الكوني.',
    whyItMattersEn: 'Key organic molecules, water ice (H₂O at 3.0 µm), carbon dioxide ice (CO₂ at 4.2 µm), and methane (CH₄ at 3.3 µm) have their strongest spectral fingerprints in the mid-infrared.',
    whyItMattersAr: 'تتميز جزيئات الماء المتجمد وثاني أكسيد الكربون والميثان ببصمات طيفية كيميائية مميزة جداً في هذا النطاق، مما يكشف أسرار نشأة الحياة.',
    practicalExampleEn: 'SPHEREx Bands 3 to 6 (2.4 to 5.0 µm) measure cosmic water ice and CO₂ ice along sightlines across our Milky Way galaxy.',
    practicalExampleAr: 'تقيس نطاقات SPHEREx من 3 إلى 6 جليد الماء وثاني أكسيد الكربون عبر آلاف المسارات داخل مجرتنا درب التبانة.',
    technicalDetailsEn: 'Probes fundamental vibrational modes (stretch and bend transitions) of prebiotic biogenic ices in interstellar grains and protoplanetary disks.',
    technicalDetailsAr: 'يرصد الترددات الاهتزازية الأساسية لروابط جزيئات الجليد الحيوية في الغبار بين النجمي وأقراص تشكل الكواكب حول النجوم.',
    relatedTerms: ['infrared', '102_channels', 'spectroscopy'],
  },

  // --- SPHEREx MISSION ---
  spherex_all_sky: {
    id: 'spherex_all_sky',
    category: 'spherex_mission',
    symbol: 'SPHEREx',
    nameEn: 'SPHEREx All-Sky Spectral Survey',
    nameAr: 'مسح سبيراكس الطيفي لكامل السماء',
    simpleNameEn: 'The All-Sky Color Camera',
    simpleNameAr: 'كاميرا مسح ألوان الكون الشاملة',
    simpleExplanationEn: 'A NASA space mission designed to survey the entire sky four times in 102 infrared colors, mapping hundreds of millions of galaxies, stars, and icy worlds.',
    simpleExplanationAr: 'مهمة فلكية تابعة لناسا لمسح قبة السماء بأكملها أربع مرات متعاقبة بـ 102 لون تحت أحمر، لإنشاء أضخم خريطة طيفية ثلاثية الأبعاد للكون.',
    whyItMattersEn: 'Most observatories study narrow pinpoints of the sky; SPHEREx is creating a complete, unbroken color atlas of the entire celestial sphere.',
    whyItMattersAr: 'معظم التلسكوبات تركز على بقع ضيقة وصغيرة جداً؛ بينما يقدم SPHEREx أطلساً شمولياً متكاملاً لكل شبر في السماء دون استثناء.',
    practicalExampleEn: 'Every 6 months, SPHEREx completes an all-sky map, producing sequential multi-epoch visits that make detecting changes and moving objects possible.',
    practicalExampleAr: 'يكمل SPHEREx خريطة كاملة للسماء كل 6 أشهر، مما يولد لقطات متعاقبة تسمح باكتشاف الأجرام المتغيرة والمتحركة بسهولة.',
    technicalDetailsEn: 'Equipped with a 20-cm wide-angle telescope (3.5° × 11.3° total instantaneous FOV) covering 0.75 to 5.00 µm with spectral resolving power R = 35 to 130.',
    technicalDetailsAr: 'مزود بتلسكوب بقطر 20 سم ومجال رؤية عريض (3.5° × 11.3°) يغطي الأطوال الموجية من 0.75 إلى 5.00 ميكرومتر بدقة طيفية R بين 35 و 130.',
    relatedTerms: ['linear_variable_filter', '102_channels', 'nep_deep_field'],
  },

  linear_variable_filter: {
    id: 'linear_variable_filter',
    category: 'spherex_mission',
    symbol: 'LVF',
    nameEn: 'Linear Variable Filter',
    nameAr: 'المرشح الطيفي الخطي المتغير',
    simpleNameEn: 'Rainbow Filter Glass',
    simpleNameAr: 'شريحة قوس قزح الطيفية',
    simpleExplanationEn: 'A specialized optical filter placed right on top of the camera sensors whose color transmission changes smoothly from one side of the detector to the other.',
    simpleExplanationAr: 'مرشح زجاجي بصري مبتكر يوضع فوق مستشعر الكاميرا مباشرة؛ يتغير لونه الطيفي بنعومة وتدرج من طرف الحساس إلى الطرف الآخر.',
    whyItMattersEn: 'Instead of using heavy spinning filter wheels or complex moving gratings, SPHEREx simply steps its telescope across the sky to capture every color.',
    whyItMattersAr: 'بدلاً من استخدام عجلات مرشحات ميكانيكية ثقيلة قابلة للأعطال، يغير التلسكوب زاويته قليلاً ليمر الجرم عبر كل ألوان الطيف تلقائياً.',
    practicalExampleEn: 'As SPHEREx slews its pointing between exposures, a target star drifts across different columns of the LVF, recording its complete 102-point spectrum.',
    practicalExampleAr: 'بينما يدور التلسكوب برفق بين التعريضات، يتحرك النجم عبر أعمدة المرشح لنسجل طيفه الكامل عبر 102 نقطة لونية مختلفة.',
    technicalDetailsEn: 'Fabry-Pérot dielectric thin-film resonance cavity where dielectric spacing varies linearly along one spatial axis: λ_res(x) ∝ 2n·d(x).',
    technicalDetailsAr: 'تجويف رنيني كهربي تتغير سماكة طبقاته خطياً، مما يسمح بمرور طول موجي محدد يزداد تدريجياً مع المسافة على سطح الكاشف.',
    relatedTerms: ['spherex_all_sky', '102_channels', 'spectroscopy'],
  },

  '102_channels': {
    id: '102_channels',
    category: 'spherex_mission',
    symbol: '102λ',
    nameEn: '102 Spectral Channels',
    nameAr: '102 قناة طيفية للأشعة تحت الحمراء',
    simpleNameEn: '102 Cosmic Colors',
    simpleNameAr: '102 لوناً كونياً',
    simpleExplanationEn: 'SPHEREx divides infrared light into 102 ultra-precise wavelength bands, creating a detailed color fingerprint for every pixel in the sky.',
    simpleExplanationAr: 'يقسم تلسكوب SPHEREx الأشعة تحت الحمراء إلى 102 نطاق طيفي دقيق، ليرسم بصمة لونية فريدة ومفصلة لكل بكسل في السماء.',
    whyItMattersEn: 'Standard cameras only take 3 colors (Red, Green, Blue). Having 102 colors allows scientists to measure exact cosmic distances and chemical fingerprints.',
    whyItMattersAr: 'الكاميرات العادية تلتقط 3 ألوان فقط (أحمر، أخضر، أزرق)؛ امتلاك 102 لون يسمح بحساب مسافات المجرات والتركيب الكيميائي الدقيق.',
    practicalExampleEn: 'When you activate the Hidden Colors lens in SPEX, you can step through these discrete infrared bands from 0.75 µm out to 5.0 µm.',
    practicalExampleAr: 'عند تفعيل عدسة «الألوان الخفية» في المنصة، يمكنك التنقل بين هذه النطاقات من 0.75 وحتى 5.0 ميكرومتر ومشاهدة تغير مظهر الأجرام.',
    technicalDetailsEn: 'Array 1 (0.75–1.11 µm, R=41), Array 2 (1.11–1.64 µm, R=41), Array 3 (1.64–2.42 µm, R=41), Array 4 (2.42–3.82 µm, R=35), Array 5 (3.82–4.42 µm, R=110), Array 6 (4.42–5.00 µm, R=130).',
    technicalDetailsAr: 'تتوزع عبر 6 مصفوفات كواشف لتغطي كامل الطيف بدقة تفريق تتراوح بين R=35 عند الموجات المتوسطة إلى R=130 عند أطول الموجات.',
    relatedTerms: ['linear_variable_filter', 'spectroscopy', 'mid_infrared'],
  },

  // --- SPACE EXPLORATION ---
  space_exploration: {
    id: 'space_exploration',
    category: 'space_exploration',
    symbol: 'Orbit',
    nameEn: 'Space Exploration & Orbital Cadence',
    nameAr: 'استكشاف الفضاء ومسارات الرصد',
    simpleNameEn: 'How Telescopes Map the Sky',
    simpleNameAr: 'كيف ترسم المراصد خرائط الكون',
    simpleExplanationEn: 'The systematic science of moving a satellite through space to repeatedly photograph the universe over days, months, and years.',
    simpleExplanationAr: 'العلم المنظم لتحريك الأقمار الصناعية والتلسكوبات لرصد وتصوير الكون بشكل دوري متكرر عبر الأيام والشهور والسنوات.',
    whyItMattersEn: 'The universe is not static; stars explode, asteroids tumble, and brown dwarfs race across our view. Repeating scans turn still photos into a dynamic movie.',
    whyItMattersAr: 'الكون ليس ساكناً؛ فالنجوم تنفجر والكويكبات تدور والأقزام البنية تتحرك؛ تكرار المسح يحول الصور الثابتة إلى فيلم كوني متحرك.',
    practicalExampleEn: 'SPHEREx observes adjacent sky tiles in ~2.1 minute steps (115s integration + ~14s slew), returning to deep survey regions every orbit.',
    practicalExampleAr: 'يلتقط SPHEREx الصور بتتابع كل ~2.1 دقيقة (115 ثانية تصوير + 14 ثانية دوران)، ويعود لمناطق المسح العميق في كل دورة مدارية.',
    technicalDetailsEn: 'Governed by spacecraft orbital mechanics, sun-avoidance constraints, Earth-limb exclusion zones, and reaction-wheel slew settling times.',
    technicalDetailsAr: 'تحكمها قوانين الميكانيكا المدارية، وتجنب حرارة الشمس، والابتعاد عن حافة الأرض المضيئة، وأوقات استقرار عجلات التوجيه.',
    relatedTerms: ['nep_deep_field', 'cadence', 'spherex_all_sky'],
  },

  nep_deep_field: {
    id: 'nep_deep_field',
    category: 'space_exploration',
    symbol: 'NEP',
    nameEn: 'North Ecliptic Pole Deep Survey',
    nameAr: 'حقل القطب الكسوفي الشمالي العميق',
    simpleNameEn: 'The Sky’s Infinite Pivot Point',
    simpleNameAr: 'نقطة الارتكاز الأبدية في السماء',
    simpleExplanationEn: 'A special point on the sky around which Earth’s orbit circles; telescopes can stare at this field continuously during almost every single orbit.',
    simpleExplanationAr: 'نقطة محورية فريدة في السماء يدور حولها مدار الأرض، وتستطيع التلسكوبات الفضائية تصويرها ورصدها باستمرار في كل دورة تقريباً.',
    whyItMattersEn: 'Because satellites revisit the ecliptic poles dozens of times each week, the North Ecliptic Pole provides the deepest and most sensitive time-series data.',
    whyItMattersAr: 'لأن مدار القمر الصناعي يمر بالقطبين في كل دورة، يوفر القطب الكسوفي أعمق وأدق رصد فلكي متتابع للبحث عن التغيرات الضوئية الخافتة.',
    practicalExampleEn: 'The benchmark field in SPEX (RA 276.2614°, Dec +64.8258°) is located inside the SPHEREx North Ecliptic Pole deep survey footprint.',
    practicalExampleAr: 'الحقل المرجعي الأساسي في منصتنا يقع في قلب مسح القطب الكسوفي الشمالي لمهمة SPHEREx.',
    technicalDetailsEn: 'The poles of the ecliptic coordinate system (β = ±90°) lie at the orbital convergence nodes of all-sky scanning geometries, maximizing total accumulated integration time.',
    technicalDetailsAr: 'تقع أقطاب النظام الكسوفي عند نقاط التقاء المسح المداري، مما يحقق أعلى زمن تعرض تراكمي ممكن عبر كامل عمر المهمة الفضائية.',
    relatedTerms: ['space_exploration', 'cadence', 'time_domain'],
  },

  // --- LIGHT & SPECTROSCOPY ---
  spectroscopy: {
    id: 'spectroscopy',
    category: 'light_spectroscopy',
    symbol: 'SED',
    nameEn: 'Spectroscopy & Spectral Energy Distribution',
    nameAr: 'التحليل الطيفي وتوزيع الطاقة الإشعاعية',
    simpleNameEn: 'Cosmic Barcode Reader',
    simpleNameAr: 'قارئ الباركود الكوني للضوء',
    simpleExplanationEn: 'Splitting an object’s light into individual wavelengths to identify what elements it is made of, how hot it is, and whether it is moving toward or away from us.',
    simpleExplanationAr: 'تحليل ضوء الجرم السماوي وفصله إلى ألوانه وموجاته المختلفة لمعرفة عناصره الكيميائية ودرجة حرارته وسرعة ابتعاده عنا.',
    whyItMattersEn: 'A photo only shows where something is; a spectrum tells you what it is made of, its temperature, its age, and its physics.',
    whyItMattersAr: 'الصورة العادية تخبرك فقط بمكان الجرم؛ أما طيف الضوء فيخبرك بمكوناته، وحرارته، وعمره، وفيزياء تكوينه بالكامل.',
    practicalExampleEn: 'A water-ice cloud leaves a sharp dip in the infrared spectrum at 3.0 microns because ice molecules absorb light at that specific wavelength.',
    practicalExampleAr: 'تترك سحب الجليد الكوني انخفاضاً حاداً في طيف الضوء عند 3.0 ميكرومتر لأن جزيئات الجليد تمتص الضوء عند هذا الطول الموجي تحديداً.',
    technicalDetailsEn: 'Measures specific flux density F_λ or F_ν across wavelength; absorption and emission lines correspond to quantum electron or rovibrational molecular transitions.',
    technicalDetailsAr: 'يقيس كثافة التدفق عبر الأطوال الموجية؛ وتمثل خطوط الامتصاص والانبعاث الانتقالات الكمية للإلكترونات والروابط الجزيئية المهتزة.',
    relatedTerms: ['102_channels', 'infrared', 'redshift'],
  },

  redshift: {
    id: 'redshift',
    category: 'light_spectroscopy',
    symbol: 'z',
    nameEn: 'Cosmological Redshift',
    nameAr: 'الانزياح نحو الأحمر الكوني',
    simpleNameEn: 'Light Stretched by Space',
    simpleNameAr: 'تمدد الضوء بسبب اتساع الكون',
    simpleExplanationEn: 'The stretching of light toward longer, redder wavelengths as it travels through the expanding fabric of the universe over billions of years.',
    simpleExplanationAr: 'تمدد موجات الضوء لتصبح أطول وأكثر احمراراً أثناء سفرها عبر نسيج الكون المتسع لمليارات السنين.',
    whyItMattersEn: 'The higher an object’s redshift, the farther away it is in space and the further back we are looking in cosmic time.',
    whyItMattersAr: 'كلما زاد انزياح ضوء المجرة نحو الأحمر، دل ذلك على أنها أبعد عنا في المكان وأقدم زمناً في تاريخ الكون.',
    practicalExampleEn: 'Visible light emitted by the first stars and galaxies 13 billion years ago has been stretched by cosmic expansion into SPHEREx’s infrared bands today.',
    practicalExampleAr: 'الضوء المرئي الذي أطلقته أولى النجوم والمجرات قبل 13 مليار سنة تمدد بفعل اتساع الكون ليصبح اليوم أشعة تحت حمراء يرصدها SPHEREx.',
    technicalDetailsEn: 'Defined as z = (λ_obs - λ_emit) / λ_emit = a(t_obs)/a(t_emit) - 1. For distant cosmological sources, z directly determines lookback time and comoving distance.',
    technicalDetailsAr: 'يُعرّف بـ z = (الطول المرصود - الطول الأصلي) / الطول الأصلي، ويرتبط مباشرة بعامل تحجيم الكون وزمن العودة إلى الوراء.',
    relatedTerms: ['spectroscopy', 'light_year', 'stars_galaxies'],
  },

  mjy_sr: {
    id: 'mjy_sr',
    category: 'light_spectroscopy',
    symbol: 'MJy/sr',
    nameEn: 'MegaJanskys per Steradian',
    nameAr: 'ميجا يانسكي لكل ستريديان',
    simpleNameEn: 'Cosmic Surface Brightness Unit',
    simpleNameAr: 'وحدة قياس السطوع السطحي الكوني',
    simpleExplanationEn: 'The standard cosmic yardstick astronomers use to measure infrared glow and surface brightness across a patch of the night sky.',
    simpleExplanationAr: 'المسطرة القياسية المعتمدة عالمياً بين علماء الفلك لقياس شدة التوهج والسطوع تحت الأحمر في رقعة من السماء.',
    whyItMattersEn: 'Ensures measurements can be calibrated and compared across different space missions like SPHEREx, Spitzer, and JWST without ambiguity.',
    whyItMattersAr: 'يضمن إمكانية مقارنة قياسات SPHEREx بدقة متناهية مع تلسكوبات جيمس ويب وسبيتزر ووايز كقيم فيزيائية مطلقة.',
    practicalExampleEn: 'The background sky brightness in the North Ecliptic Pole deep survey is typically around 0.1 to 0.4 MJy/sr at 1.0 micron.',
    practicalExampleAr: 'سطوع خلفية السماء المعتاد في حقل القطب الكسوفي يبلغ حوالي 0.1 إلى 0.4 ميجا يانسكي/ستريديان عند طول موجي 1.0 ميكرومتر.',
    technicalDetailsEn: '1 Jansky (Jy) = 10⁻²⁶ W·m⁻²·Hz⁻¹. A steradian (sr) is the SI unit of solid angle (~3,282.8 sq deg). 1 MJy/sr = 10⁶ Jy / sr = 10⁻²⁰ W·m⁻²·Hz⁻¹·sr⁻¹.',
    technicalDetailsAr: 'اليانسكي = 10⁻²⁶ واط/م²·هرتز. الستريديان وحدة الزاوية الفضائية المجسمة (~3283 درجة مربعة). 1 ميجا يانسكي/ستريديان = 10⁻²⁰ واط/م²·هرتز·ستريديان.',
    relatedTerms: ['flux', 'aperture_photometry', 'fits'],
  },

  // --- STARS & GALAXIES ---
  variable_star: {
    id: 'variable_star',
    category: 'stars_galaxies',
    symbol: 'Var',
    nameEn: 'Variable Star',
    nameAr: 'النجم المتغير',
    simpleNameEn: 'Pulsating or Flaring Star',
    simpleNameAr: 'نجم ينبض ويتغير لمعانه',
    simpleExplanationEn: 'A star whose apparent brightness changes noticeably over hours, days, weeks, or months due to internal pulsations or eclipses.',
    simpleExplanationAr: 'نجم يتغير لمعانه وسطوعه الظاهري بشكل ملحوظ عبر ساعات أو أيام أو شهور بسبب نبضات داخلية أو كسوف نجم رفيق له.',
    whyItMattersEn: 'Variable stars allow astronomers to measure distances across the universe and study how dying stars shed their outer atmospheres.',
    whyItMattersAr: 'تعتبر النجوم المتغيرة منارات كونية تسمح بحساب المسافات في الكون وفهم المراحل الأخيرة لموت النجوم العملاقة.',
    practicalExampleEn: 'R Draconis (one of the SPEX challenge targets) is a Mira-type pulsating red giant that brightens and dims dramatically over a 245-day cycle.',
    practicalExampleAr: 'نجم آر التنين (أحد أهداف تحدي SPEX) هو عملاق أحمر نابض من نوع ميرا يتغير سطوعه بشكل هائل كل 245 يوماً.',
    technicalDetailsEn: 'Variability arises from radial pulsation mechanisms (such as the kappa opacity valve in stellar envelopes) or geometric eclipsing binary orbits.',
    technicalDetailsAr: 'ينشأ التغير إما من آليات النبض الإشعاعي (مثل صمام العتامة كابا في الغلاف النجمي) أو من حجب هندسي في الأنظمة النجمية الثنائية.',
    relatedTerms: ['supernova', 'flux', 'time_domain'],
  },

  brown_dwarf: {
    id: 'brown_dwarf',
    category: 'stars_galaxies',
    symbol: 'Y/T',
    nameEn: 'Brown Dwarf',
    nameAr: 'القزم البني',
    simpleNameEn: 'Failed Star / Super-Jupiter',
    simpleNameAr: 'نجم بارد لم يكتمل اشتعاله',
    simpleExplanationEn: 'An astronomical object heavier than giant gas planets like Jupiter, but not massive enough to ignite nuclear fusion in its core.',
    simpleExplanationAr: 'جرم كوني كتلته أكبر من كواكب المشتري الغازية الضخمة، لكنه لم يبلغ الكتلة الكافية لإشعال الاندماج النووي في قلبه كنجم حقيقي.',
    whyItMattersEn: 'Because brown dwarfs produce almost no visible light, SPHEREx’s infrared sensors are the primary tool to discover them in our solar neighborhood.',
    whyItMattersAr: 'لأن الأقزام البنية لا تصدر ضوءاً مرئياً، فإن تلسكوبات الأشعة تحت الحمراء مثل SPHEREx هي أداتنا الأساسية لاكتشافها بالقرب منا.',
    practicalExampleEn: 'WISE 0855-0714 is a Y-type sub-brown dwarf with a freezing temperature near -10°C, floating alone just 7.2 light-years from Earth.',
    practicalExampleAr: 'الجرم WISE 0855-0714 هو قزم بني فائق البرودة بحرارة تقارب -10 درجات مئوية فقط، ويسبح وحيداً على بعد 7.2 سنة ضوئية من الأرض.',
    technicalDetailsEn: 'Masses range between 13 and 80 Jupiter masses (M_J), unable to sustain steady hydrogen fusion, cooling perpetually from spectral types L to T and frigid Y.',
    technicalDetailsAr: 'تتراوح كتلته بين 13 و 80 ضعف كتلة المشتري، ويبرد باستمرار عبر مليارات السنين ليتحول من التصنيف الطيفي L إلى T و Y فائق البرودة.',
    relatedTerms: ['infrared', 'proper_motion', 'mid_infrared'],
  },

  supernova: {
    id: 'supernova',
    category: 'stars_galaxies',
    symbol: 'SN',
    nameEn: 'Supernova Explosion',
    nameAr: 'المستعر الأعظم (سوبرنوفا)',
    simpleNameEn: 'Cosmic Star Blast',
    simpleNameAr: 'انفجار نجمي مروع',
    simpleExplanationEn: 'The colossal, blinding explosion marking the violent death of a massive star, briefly outshining entire galaxies of billions of stars.',
    simpleExplanationAr: 'الانفجار المروع والهائل الذي يختم به النجم العملاق حياته، حيث يطلق ضوءاً يفوق في بريقه مجرة كاملة تحوي مليارات النجوم لأيام معدودة.',
    whyItMattersEn: 'Supernovae forge and scatter heavy chemical elements like carbon, iron, and gold throughout the universe, which later form rocky planets and life.',
    whyItMattersAr: 'تصنع المستعرات العظمى العناصر الكيميائية الثقيلة كالحديد والذهب وتنثرها في الفضاء، وهي التي كونت كوكب الأرض وأجسادنا لاحقاً.',
    practicalExampleEn: 'In multi-epoch difference imaging, a newborn supernova appears as an intense, uncataloged positive brightness spike that was absent in the prior epoch.',
    practicalExampleAr: 'في صور الطرح الفلكي، يظهر المستعر الأعظم كنقطة ضوئية ساطعة ومفاجئة لم تكن موجودة في الصورة السابقة لنفس المنطقة.',
    technicalDetailsEn: 'Classified into core-collapse (Types II, Ib/Ic from stars M > 8 M_☉) and thermonuclear runaway (Type Ia Chandrasekhar limit white dwarf detonations).',
    technicalDetailsAr: 'تنقسم إلى انهيار قلب النجوم الضخمة (النوع الثاني)، أو انفجارات نووية حرارية للأقزام البيضاء عند بلوغ حد تشاندراسيخار (النوع Ia).',
    relatedTerms: ['variable_star', 'flux', 'time_domain'],
  },

  // --- SCIENTIFIC IMAGING ---
  fits: {
    id: 'fits',
    category: 'scientific_imaging',
    symbol: 'FITS',
    nameEn: 'Flexible Image Transport System',
    nameAr: 'نظام نقل الصور الفلكية المرن (FITS)',
    simpleNameEn: 'Scientific Raw Image File',
    simpleNameAr: 'ملف الصور الفلكية الخام',
    simpleExplanationEn: 'The universal digital file format used by all astronomical observatories, preserving exact photon counts instead of compressed pictures.',
    simpleExplanationAr: 'الصيغة الرقمية المعتمدة عالمياً بين مراصد الفضاء؛ تحفظ قيم قياسات الفوتونات الحقيقية دون أي ضغط أو تعديل تشويهي.',
    whyItMattersEn: 'Unlike phone JPEGs or PNGs, FITS files store 32-bit floating-point numbers and complete telescope coordinate maps required for authentic science.',
    whyItMattersAr: 'على عكس صور الهواتف، تخزن ملفات FITS أرقاماً علمية فائقة الدقة بفاصلة عائمة ومعادلات الملاحة السماوية الكاملة.',
    practicalExampleEn: 'Every cutout loaded into the SPEX telescope viewport is parsed directly from an authentic NASA Level-2B FITS file containing calibrated image and variance arrays.',
    practicalExampleAr: 'كل صورة تشاهدها في نافذة SPEX يتم استخراجها مباشرة من ملف FITS حقيقي معتمد من وكالة ناسا يشمل قياسات الضوء وضوضاء الحساس.',
    technicalDetailsEn: 'Standard IAU astronomical format containing multi-extension Header Data Units (HDUs): Primary flux array, Variance extension, and Bitmask Quality array.',
    technicalDetailsAr: 'معيار الاتحاد الفلكي الدولي، يحفظ ترويسات الإحداثيات، وصور التدفق، ومصفوفات التباين وأعلام الجودة كطبقات بيانات مستقلة بدقة 32-بت.',
    relatedTerms: ['wcs', 'variance', 'dq_flags'],
  },

  pixel_scale: {
    id: 'pixel_scale',
    category: 'scientific_imaging',
    symbol: 's_pix',
    nameEn: 'Pixel Scale & Spatial Sampling',
    nameAr: 'مقياس البكسل والدقة المكانية',
    simpleNameEn: 'Sky Coverage per Pixel',
    simpleNameAr: 'حجم الرقعة التي يراها كل بكسل',
    simpleExplanationEn: 'The angular size of the night sky represented by a single square pixel on the camera sensor.',
    simpleExplanationAr: 'المسافة أو المساحة الزاوية في قبة السماء التي يغطيها بكسل واحد مربع على سطح مستشعر الكاميرا.',
    whyItMattersEn: 'Determines whether two close stars will appear as separate sharp points or merge into a single fuzzy blob.',
    whyItMattersAr: 'يحدد ما إذا كان النجمان المتقاربان سيظهران كنقطتين منفصلتين تماماً أم سيندمجان في بقعة ضوئية واحدة مشوشة.',
    practicalExampleEn: 'SPHEREx has a 6.2″/pixel scale, meaning a 64×64 pixel cutout covers approximately 6.6 arcminutes (~0.11 degrees) across.',
    practicalExampleAr: 'يمتلك SPHEREx مقياس 6.2 ثانية قوسية/بكسل؛ مما يعني أن نافذة 64×64 بكسل تغطي مساحة 6.6 دقيقة قوسية (~0.11 درجة).',
    technicalDetailsEn: 'Derived from telescope focal length f and physical detector pixel pitch p: s = 206265 × (p / f) arcsec/pixel.',
    technicalDetailsAr: 'يُحسب من البعد البؤري للتلسكوب وحجم البكسل الميكانيكي على شريحة السيليكون: s = 206265 × (حجم البكسل / البعد البؤري).',
    relatedTerms: ['arcsecond', 'fits', 'wcs'],
  },

  false_color: {
    id: 'false_color',
    category: 'scientific_imaging',
    symbol: 'Colormap',
    nameEn: 'Scientific False-Color Mapping',
    nameAr: 'التلوين العلمي التوضيحي (الألوان البديلة)',
    simpleNameEn: 'Coloring the Invisible',
    simpleNameAr: 'تلوين ما لا تراه العين البشرية',
    simpleExplanationEn: 'Assigning visible colors (like blue, amber, and red) to invisible infrared wavelengths so human eyes can see heat patterns and temperature variations.',
    simpleExplanationAr: 'إعطاء ألوان مرئية (كالأزرق والعنبري والأرجواني) لموجات الأشعة تحت الحمراء غير المرئية لتتمكن أعيننا من تمييز الفروق الحرارية.',
    whyItMattersEn: 'Since human eyes are blind to infrared, scientific colormaps make subtle physical differences immediately obvious without changing the underlying data.',
    whyItMattersAr: 'لأن العين البشرية لا ترى الأشعة تحت الحمراء، يساعد التلوين العلمي علماء الفلك في قراءة البيانات المعقدة بالعين المجردة وبشكل فوري.',
    practicalExampleEn: 'In SPEX, the "Infrared Warm" palette renders faint space dust in deep dark blue, medium stars in golden amber, and intense infrared cores in pure white.',
    practicalExampleAr: 'في SPEX، تعرض لوحة الألوان العنبرية الغبار البارد بالأزرق الداكن، والنجوم بالأصفر الذهبي، والبؤر الحرارية الساخنة بالأبيض الناصع.',
    technicalDetailsEn: 'Applies monotonic or diverging transfer functions (such as viridis, inferno, and signed diverging colormaps) mapped across normalized flux values.',
    technicalDetailsAr: 'يطبق معادلات نقل لونية مستمرة أو متباعدة تحول الأرقام الفيزيائية بدقة إلى قنوات ألوان RGB ثلاثية دون خداع بصري.',
    relatedTerms: ['infrared', '102_channels', 'scientific_imaging'],
  },

  // --- DATA ANALYSIS ---
  wcs: {
    id: 'wcs',
    category: 'data_analysis',
    symbol: 'WCS',
    nameEn: 'World Coordinate System',
    nameAr: 'نظام الإحداثيات العالمي (WCS)',
    simpleNameEn: 'Cosmic GPS Formula',
    simpleNameAr: 'معادلة الملاحة الفلكية الكونية',
    simpleExplanationEn: 'The mathematical formula embedded in the image that turns pixel row and column numbers (X, Y) into exact celestial coordinates (RA and Dec).',
    simpleExplanationAr: 'المعادلة الرياضية المدمجة في ملف الصورة التي تحول أرقام الصفوف والأعمدة للبكسل إلى إحداثيات سماوية حقيقية (مطلع مستقيم وميل).',
    whyItMattersEn: 'Allows images taken months apart with different telescope rotations to be aligned to within a fraction of a single pixel.',
    whyItMattersAr: 'يسمح بمحاذاة صور التقطت بفارق شهور مع زوايا دوران مختلفة بدقة متناهية لأجزاء من البكسل الواحد قبل مقارنتها.',
    practicalExampleEn: 'SPEX uses the FITS WCS header keywords to calculate the exact RA and Dec of any point you hover or tap on the canvas in real time.',
    practicalExampleAr: 'يستخدم SPEX ترويسة WCS لحساب إحداثيات RA و Dec لأي نقطة تمرر عليها مؤشر الفأرة أو تلمسها على الشاشة فورياً.',
    technicalDetailsEn: 'Uses standard FITS astrometric parameters (CRVAL1/2, CRPIX1/2, CD matrix, TAN gnomonic projection) to project celestial sphere angles onto a flat plane.',
    technicalDetailsAr: 'تعتمد على معايير FITS الفلكية ومصفوفة التحويل الإسقاطي لتسطيح القبة السماوية الكروية على مستوى الحساس بدقة فلكية معتمدة.',
    relatedTerms: ['ra_dec', 'arcsecond', 'fits'],
  },

  image_subtraction: {
    id: 'image_subtraction',
    category: 'data_analysis',
    symbol: 'D = I₂ - I₁',
    nameEn: 'Difference Imaging (Image Subtraction)',
    nameAr: 'طرح الصور الفلكية (صورة الفارق)',
    simpleNameEn: 'Spot-the-Difference Math',
    simpleNameAr: 'معادلة كشف الاختلاف بين الصورتين',
    simpleExplanationEn: 'Subtracting a previous sky observation (Visit 1) from a later one (Visit 2) to erase all unchanging stars and leave only what changed or moved.',
    simpleExplanationAr: 'طرح صورة قديمة للسماء من صورة أحدث لنفس البقعة لمحو كل النجوم الثابتة، فيتبقى فقط ما تغير لمعانه أو تحرك من مكانه.',
    whyItMattersEn: 'Searching millions of unchanged background stars by eye is impossible. Subtraction makes new supernovas, flaring stars, or moving asteroids pop out instantly.',
    whyItMattersAr: 'البحث اليدوي بين مليارات النجوم الثابتة مستحيل؛ وعملية الطرح تجعل أي انفجار نجمي جديد أو كويكب متحرك يبرز فوراً كالبرق.',
    practicalExampleEn: 'In the SPEX Time Lens, selecting "Difference (2 - 1)" performs pixel-by-pixel aligned subtraction, highlighting genuine variability in purple and amber.',
    practicalExampleAr: 'في عدسة الزمن، يؤدي اختيار «خريطة الفارق» إلى طرح الصورتين بكسل ببكسل بعد المحاذاة، لتبرز التغيرات الحقيقية بالألوان المتوهجة.',
    technicalDetailsEn: 'D(x,y) = I₂(x,y) - I₁(x,y). Constant static background flux cancels to zero; flux increases leave positive residuals, and flux decreases leave negative residuals.',
    technicalDetailsAr: 'الفرق = الصورة 2 - الصورة 1؛ يلغى الضوء الثابت ليكون صفراً؛ الزيادة في الضوء تترك قيمة موجبة، والنقصان يترك قيمة سالبة.',
    relatedTerms: ['dipole', 'flux', 'sigma'],
  },

  aperture_photometry: {
    id: 'aperture_photometry',
    category: 'data_analysis',
    symbol: 'Phot',
    nameEn: 'Circular Aperture Photometry',
    nameAr: 'القياس الضوئي بالفتحة الدائرية',
    simpleNameEn: 'Cosmic Photon Counting Ring',
    simpleNameAr: 'حلقة عد فوتونات الضوء',
    simpleExplanationEn: 'Drawing an imaginary circular ring around an astronomical source to add up all its light particles, while subtracting background space noise from an outer ring.',
    simpleExplanationAr: 'رسم دائرة وهمية حول مصدر الضوء لجمع فوتوناته بدقة، مع طرح ضوضاء الفضاء المحيط به من حلقة خارجية.',
    whyItMattersEn: 'Provides an objective, repeatable scientific measurement of exact brightness changes that is completely unaffected by nearby stray light.',
    whyItMattersAr: 'يوفر قياساً علمياً دقيقاً ومحايداً لا يتأثر بأي ضوء مشتت قادم من النجوم المجاورة في الخلفية.',
    practicalExampleEn: 'SPEX uses an aperture radius of r = 2.5 pixels to measure candidate source flux and an annulus from r = 4.0 to 6.0 pixels for sky background subtraction.',
    practicalExampleAr: 'يستخدم SPEX دائرة بنصف قطر 2.5 بكسل لقياس لمعان المرشح، وحلقة خارجية بين 4.0 و 6.0 بكسل لطرح ضوضاء السماء.',
    technicalDetailsEn: 'Net source flux F_net = ∑_(r ≤ r_ap) I(x,y) - N_ap × median(Annulus). Propagated uncertainty includes Poisson source photon noise and background variance.',
    technicalDetailsAr: 'التدفق الصافي = مجموع الضوء داخل الفتحة - (مساحة الفتحة × وسيط ضوضاء الحلقة المحيطة)، مع حساب الارتياب الإحصائي بدقة.',
    relatedTerms: ['flux', 'mjy_sr', 'variance'],
  },

  flux: {
    id: 'flux',
    category: 'data_analysis',
    symbol: 'ΔF',
    nameEn: 'Aperture Flux Variation',
    nameAr: 'تغير التدفق الإشعاعي',
    simpleNameEn: 'Brightness Change Amount',
    simpleNameAr: 'مقدار تغير السطوع والضوء',
    simpleExplanationEn: 'The physical amount of infrared light emitted by the object that increased or dimmed between two observation visits.',
    simpleExplanationAr: 'كمية الأشعة تحت الحمراء التي زادت أو خفتت من الجرم السماوي بين لقطتي الرصد.',
    whyItMattersEn: 'Detecting flux variation is the fundamental signature of dynamic cosmic events like eclipses, stellar flares, and pulsating atmospheres.',
    whyItMattersAr: 'رصد تغير التدفق هو الدليل الأساسي على حدوث ظواهر كونية حية ونشطة كالكسوفات والنبضات والتوهجات النجمية.',
    practicalExampleEn: 'A candidate with ΔF = +0.85 MJy/sr grew substantially brighter in Visit 2 compared to Visit 1.',
    practicalExampleAr: 'المرشح ذو التغير ΔF = +0.85 ميجا يانسكي/ستريديان زاد سطوعه بشكل ملحوظ في الزيارة الثانية مقارنة بالأولى.',
    technicalDetailsEn: 'ΔF = F_epoch2 - F_epoch1. Uncertainty σ_ΔF is calculated by propagating the independent variances of both observations in quadrature: √(σ₁² + σ₂²).',
    technicalDetailsAr: 'تغير التدفق = تدفق اللقطة 2 - تدفق اللقطة 1، ويُحسب الارتياب بجمع مربعي التباين للرصدتين تحت الجذر التربيعي.',
    relatedTerms: ['aperture_photometry', 'sigma', 'image_subtraction'],
  },

  variance: {
    id: 'variance',
    category: 'data_analysis',
    symbol: 'σ²',
    nameEn: 'Detector Variance Map',
    nameAr: 'خريطة التباين والضوضاء',
    simpleNameEn: 'Sensor Noise Map',
    simpleNameAr: 'خريطة ضوضاء الكاميرا',
    simpleExplanationEn: 'A map recording how noisy or uncertain each individual camera pixel was during the scientific exposure.',
    simpleExplanationAr: 'خريطة رقمية تسجل مدى دقة أو تشويش كل بكسل في الكاميرا لحظة التقاط الصورة الفضائية.',
    whyItMattersEn: 'If a bright pixel is also in an extremely noisy area of the camera, the software immediately lowers its confidence so we don’t mistake noise for a real star.',
    whyItMattersAr: 'إذا كانت النقطة المضيئة تقع في بكسل مشوش جداً، يقلل البرنامج من ثقته بها فوراً حتى لا نعتبر الضوضاء نجماً حقيقياً.',
    practicalExampleEn: 'SPHEREx Level-2B FITS files include an explicit VARIANCE extension containing per-pixel noise estimates derived from multi-read ramp fitting.',
    practicalExampleAr: 'تحتوي ملفات FITS لسبيراكس على امتداد خاص للتباين يسجل الضوضاء الإحصائية لكل بكسل بدقة متناهية.',
    technicalDetailsEn: 'σ²_total = σ²_read + σ²_shot + σ²_dark. Quantifies the variance of the sample mean for every pixel under Poisson-Gaussian mixed statistics.',
    technicalDetailsAr: 'يشمل التباين الإحصائي ضوضاء قراءة الدوائر الإلكترونية، وضوضاء فوتونات الضوء (بواسون)، وتيار الظلام الحراري للحساس.',
    relatedTerms: ['sigma', 'fits', 'dq_flags'],
  },

  // --- TIME-DOMAIN ASTRONOMY ---
  proper_motion: {
    id: 'proper_motion',
    category: 'time_domain',
    symbol: 'μ',
    nameEn: 'Proper Motion',
    nameAr: 'الحركة الذاتية للأجرام',
    simpleNameEn: 'Speed Across the Sky',
    simpleNameAr: 'سرعة تحرك النجم عبر السماء',
    simpleExplanationEn: 'How fast an astronomical object actually moves across our field of view over time, measured in arcseconds per year.',
    simpleExplanationAr: 'مدى انتقال الجرم وتحركه الفعلي عبر قبة السماء بمرور الوقت، وتُقاس بأجزاء من الثانية القوسية سنوياً.',
    whyItMattersEn: 'Helps astronomers distinguish nearby fast-moving stars and brown dwarfs from millions of motionless, distant background stars.',
    whyItMattersAr: 'يساعد علماء الفلك على تمييز النجوم والأقزام البنية القريبة منا عن مليارات النجوم البعيدة التي تبدو ثابتة كالجدار.',
    practicalExampleEn: "Barnard's Star has the fastest known proper motion in the entire sky, racing across 10.36 arcseconds every single year.",
    practicalExampleAr: 'يمتلك نجم بارنارد أسرع حركة ذاتية معروفة في السماء، حيث يقطع 10.36 ثانية قوسية في كل عام.',
    technicalDetailsEn: 'Total proper motion μ = √(μ_α*² + μ_δ²), where μ_α* = μ_α × cos(δ). Combined with distance d, it reveals the star’s physical transverse velocity: v_t = 4.74 × μ × d.',
    technicalDetailsAr: 'السرعة الزاوية الإجمالية = جذر تربيعي لمربعي الحركة في المطلع والميل، وتكشف السرعة العرضية الحقيقية للنجم بالكيلومتر في الثانية.',
    relatedTerms: ['dipole', 'arcsecond', 'cadence'],
  },

  dipole: {
    id: 'dipole',
    category: 'time_domain',
    symbol: '±',
    nameEn: 'Difference Dipole Residual',
    nameAr: 'نمط ثنائي القطب المتبقي',
    simpleNameEn: 'The Motion Fingerprint',
    simpleNameAr: 'بصمة حركة النجم (نقطة مظلمة بجوار مضيئة)',
    simpleExplanationEn: 'A paired bright spot and dark spot side-by-side that appears in a difference image when an object moves between the two photographs.',
    simpleExplanationAr: 'نقطة مضيئة بجوار نقطة مظلمة تظهر في صورة الفرق عندما يتحرك جسم من مكان لآخر بين الصورتين.',
    whyItMattersEn: 'The dipole is the definitive proof that an object physically moved across the sky rather than just brightening or dimming in place.',
    whyItMattersAr: 'ثنائي القطب هو الدليل البصري القاطع على أن الجرم تحرك فيزيائياً في السماء ولم يتغير لمعانه وهو في مكانه فقط.',
    practicalExampleEn: 'Subtracting Barnard’s Star between Visit 1 and Visit 2 leaves a classic dipole: the old position turns dark (negative) and the new position turns bright (positive).',
    practicalExampleAr: 'طرح لقطتي نجم بارنارد يترك ثنائي قطب كلاسيكياً: الموقع القديم يصبح مظلماً وسالباً، والموقع الجديد يبرز مضيئاً وموجباً.',
    technicalDetailsEn: 'Created when subtracting two point-spread functions (PSFs) with offset centroids: D(r) = PSF(r - r₂) - PSF(r - r₁). Separation vector yields velocity and position angle.',
    technicalDetailsAr: 'يتكون من طرح دالتي توزيع النقطتين الضوئيتين ذات المركزين المزاحين؛ والمسافة بين البؤرتين تحدد اتجاه وسرعة الحركة.',
    relatedTerms: ['proper_motion', 'image_subtraction', 'variable_star'],
  },

  cadence: {
    id: 'cadence',
    category: 'time_domain',
    symbol: 'Δt',
    nameEn: 'Observation Cadence & Baseline',
    nameAr: 'تتابع وفترات الرصد الزمني',
    simpleNameEn: 'Time Between Photos',
    simpleNameAr: 'الوقت الفاصل بين الصورتين',
    simpleExplanationEn: 'The amount of time that passes between two astronomical exposures of the exact same patch of sky.',
    simpleExplanationAr: 'مقدار الوقت المنقضي بين التقاط صورتين لنفس الرقعة الفلكية في السماء.',
    whyItMattersEn: 'Different cosmic events happen at different speeds: minutes catch asteroid sweeps, days reveal variable flares, and years track slow proper motion.',
    whyItMattersAr: 'الظواهر الكونية تحدث بسرعات متباينة: دقائق تكشف حركة الكويكبات، وأيام تكشف ومضات النجوم، وسنوات تكشف حركة النجوم البطيئة.',
    practicalExampleEn: 'SPHEREx provides both rapid intra-visit pairs (~2.1 minutes apart) and multi-month survey visits (~6 months apart).',
    practicalExampleAr: 'يوفر أرشيف SPHEREx لقطات سريعة خلال الزيارة الواحدة (~2.1 دقيقة) ولقطات مسحية تفصل بينها 6 أشهر كاملة.',
    technicalDetailsEn: 'Start-to-start cadence Δt = t_obs2 - t_obs1, while inter-exposure gap = t_obs2 - t_end1, determining the temporal frequency filter of detected transients.',
    technicalDetailsAr: 'الفترة بين بدايتي التعريضين والفاصل بين نهاية الأول وبداية الثاني يحددان حساسية التلسكوب للظواهر العابرة والسريعة.',
    relatedTerms: ['proper_motion', 'variable_star', 'nep_deep_field'],
  },

  // --- SCIENTIFIC EVIDENCE ---
  sigma: {
    id: 'sigma',
    category: 'scientific_evidence',
    symbol: 'σ',
    nameEn: 'Statistical Significance Threshold (Sigma)',
    nameAr: 'مستوى الدلالة الإحصائية (سيجما)',
    simpleNameEn: 'Discovery Confidence Score',
    simpleNameAr: 'درجة الثقة الإحصائية بالاكتشاف',
    simpleExplanationEn: 'A mathematical score showing how certain scientists are that a detected signal is a genuine astronomical event and not random camera static.',
    simpleExplanationAr: 'مقياس رياضي يوضح مدى تأكد العلماء من أن الإشارة المرصودة هي حدث فلكي حقيقي في السماء وليست مجرد تشويش عشوائي في الكاميرا.',
    whyItMattersEn: 'Filters out thousands of false detector noise blips so astronomers only invest telescope time investigating genuine cosmic discoveries.',
    whyItMattersAr: 'يستبعد آلاف الومضات الكاذبة والشوائب ليركز العلماء فقط على التغيرات الكونية الحقيقية الموثوقة.',
    practicalExampleEn: 'A candidate with a significance of 5.8σ has less than a 1-in-a-million probability of being random camera static.',
    practicalExampleAr: 'المرشح ذو الدلالة 5.8σ تكون نسبة احتمال أن يكون مجرد ضوضاء عشوائية أقل من واحد في المليون!',
    technicalDetailsEn: 'Significance S = ΔF / σ_local. Under Gaussian noise, ≥ 3.0σ gives 99.73% confidence, ≥ 5.0σ gives 99.99994% (the standard physics threshold for discovery).',
    technicalDetailsAr: 'الدلالة = التغير في التدفق / انحراف الضوضاء الموضعية. عند 5.0σ فأكثر تكون الثقة 99.99994%، وهو المعيار الفيزيائي الرسمي لإعلان الاكتشافات.',
    relatedTerms: ['variance', 'flux', 'artifact'],
  },

  artifact: {
    id: 'artifact',
    category: 'scientific_evidence',
    symbol: 'Glitch',
    nameEn: 'Detector Artifact & False Positives',
    nameAr: 'عيوب الكاشف والشوائب الخادعة',
    simpleNameEn: 'Camera Glitch or Ghost Signal',
    simpleNameAr: 'عيب في الحساس أو إشارة خادعة',
    simpleExplanationEn: 'A false signal created by cosmic ray strikes, saturated sensor pixels, electrical glitches, or internal optical reflections rather than a real star.',
    simpleExplanationAr: 'إشارة خادعة سببها ارتطام جسيم كوني بالحساس، أو بكسل متضرر، أو انعكاس ضوئي داخل الكاميرا، وليست جرماً حقيقياً في السماء.',
    whyItMattersEn: 'Without rigorous artifact filtering, telescopes would report thousands of "fake supernovas" that are actually just sensor noise.',
    whyItMattersAr: 'بدون تصفية دقيقة لعيوب الأجهزة، ستعلن التلسكوبات عن آلاف الاكتشافات الكاذبة التي ليست سوى عيوب تقنية في الكاميرا.',
    practicalExampleEn: 'A single pixel showing an extreme brightness spike without the smooth bell-curve spread of a real telescope lens is flagged as a cosmic ray hit.',
    practicalExampleAr: 'البكسل الفردي الذي يلمع بشدة دون أن ينتشر ضوؤه على شكل جرس طبيعي كبقية النجوم يتم استبعاده فوراً كضربة أشعة كونية.',
    technicalDetailsEn: 'Identified via bitmask quality flags, sub-pixel sharpness ratios (PSF width vs pixel response), and local variance anomalies.',
    technicalDetailsAr: 'يُكشف عبر أعلام الجودة الرقمية، واختبار عرض دالة النقطة الضوئية، ومقارنة التباين الموضعي.',
    relatedTerms: ['dq_flags', 'sigma', 'variance'],
  },

  dq_flags: {
    id: 'dq_flags',
    category: 'scientific_evidence',
    symbol: 'DQ',
    nameEn: 'Data Quality Bitmask Flags',
    nameAr: 'أعلام جودة البيانات (DQ Bitmask)',
    simpleNameEn: 'Sensor Warning Flags',
    simpleNameAr: 'علامات تحذير جودة الحساس',
    simpleExplanationEn: 'Automated digital labels attached to each pixel noting if it was hit by cosmic radiation, blinded by overpowering light, or malfunctioning.',
    simpleExplanationAr: 'علامات رقمية تسجل لكل بكسل ما إذا كان قد تعرض لجسيم كوني، أو تشبع بضوء مبهر زائد، أو تعرض لخلل إلكتروني.',
    whyItMattersEn: 'Allows algorithms to instantly discard bad pixels while preserving nominal measurements from clean detector regions.',
    whyItMattersAr: 'تسمح للخوارزميات باستبعاد البكسلات المعطوبة فوراً والحفاظ على القياسات العلمية النقية دون تلويث النتائج.',
    practicalExampleEn: 'SPHEREx marks saturated pixels with bit 0x02 (OVERFLOW) and cosmic ray hits with bit 0x01 (TRANSIENT), visible in the SPEX Doubt Lens.',
    practicalExampleAr: 'يميز SPHEREx البكسل المشبع بالرمز 0x02 (OVERFLOW) والأشعة الكونية بالرمز 0x01، ويمكنك رؤيتها في عدسة الشك.',
    technicalDetailsEn: 'Bitwise integer bitmask: 0x01 = Transient/Cosmic Ray, 0x02 = Saturated/Overflow, 0x04 = Non-Linear Response, 0x80000 = Statistical Outlier.',
    technicalDetailsAr: 'أقنعة بت ثنائية: 0x01 أشعة كونية، 0x02 تشبع ضوئي، 0x04 استجابة غير خطية، 0x80000 شذوذ إحصائي.',
    relatedTerms: ['artifact', 'fits', 'variance'],
  },

  cross_match: {
    id: 'cross_match',
    category: 'scientific_evidence',
    symbol: 'X-Match',
    nameEn: 'Star Catalog Cross-Matching',
    nameAr: 'مضاهاة ومطابقة الفهارس الفلكية',
    simpleNameEn: 'Checking the Cosmic Census',
    simpleNameAr: 'الفحص في سجلات النجوم الرسمية',
    simpleExplanationEn: 'Comparing the exact coordinates of our detected light source against official international catalogs of known stars to see if it has been recorded before.',
    simpleExplanationAr: 'مقارنة إحداثيات الإشارة المكتشفة مع السجلات وقواعد البيانات الفلكية المعتمدة لمعرفة هل هي لنجم مسجل مسبقاً أم اكتشاف جديد.',
    whyItMattersEn: 'Instantly tells us whether a detected signal is an already known variable star or an exciting uncataloged discovery.',
    whyItMattersAr: 'يميز فوراً بين النجوم المتغيرة المعروفة مسبقاً وبين الأجرام الجديدة غير المسجلة التي قد تكون كويكبات أو مستعرات مجهولة.',
    practicalExampleEn: 'When you open the Neighbors Lens in SPEX, candidates within 3.5 arcseconds of a Gaia or AllWISE star are automatically cross-matched.',
    practicalExampleAr: 'عند فتح عدسة الجيران، يتم مطابقة أي مرشح يقع ضمن 3.5 ثانية قوسية من نجوم فهارس جايا أو وايز وعرض بياناته فوراً.',
    technicalDetailsEn: 'Performs spherical cone search: d = 2 arcsin√(sin²(Δδ/2) + cos(δ₁)cos(δ₂)sin²(Δα/2)) ≤ r_match, linking astrometry and proper motion history.',
    technicalDetailsAr: 'يجري بحثاً مخروطياً كروياً لمطابقة المسافة الزاوية مع مراعاة الحركة الذاتية وهوامش الخطأ القياسية.',
    relatedTerms: ['gaia_dr3', 'allwise', 'ra_dec'],
  },

  gaia_dr3: {
    id: 'gaia_dr3',
    category: 'scientific_evidence',
    symbol: 'Gaia',
    nameEn: 'ESA Gaia DR3 Star Catalog',
    nameAr: 'فهرس جايا الفلكي الثالث (ESA Gaia DR3)',
    simpleNameEn: 'The Ultimate 3D Star Map',
    simpleNameAr: 'أدق خريطة ثلاثية الأبعاد للنجوم',
    simpleExplanationEn: 'The European Space Agency’s official catalog of nearly 2 billion stars, with ultra-precise positions, distances, and velocities across the Milky Way.',
    simpleExplanationAr: 'أدق خريطة كونية في التاريخ من وكالة الفضاء الأوروبية، تحتوي على ملياري نجم ببيانات حركتها وسرعتها وبعدها عنا.',
    whyItMattersEn: 'Serves as the absolute spatial reference grid for the modern astronomical world, against which all new telescope detections are calibrated.',
    whyItMattersAr: 'يمثل الشبكة المرجعية المطلقة لعلم الفلك الحديث، والتي تُعاير بموجبها مواقع كل التلسكوبات والأجرام المكتشفة حديثاً.',
    practicalExampleEn: 'SPEX uses Gaia DR3 to anchor celestial positions and confirm if a candidate matches a known star with recorded parallax and motion.',
    practicalExampleAr: 'يستخدم SPEX فهرس جايا لتأكيد ما إذا كان المرشح يطابق نجماً معروفاً مسجلاً في درب التبانة.',
    technicalDetailsEn: 'ESA Gaia Data Release 3 astrometric catalog providing sub-milliarcsecond positions, parallaxes, and proper motions (Gaia EDR3/DR3).',
    technicalDetailsAr: 'يوفر مواقع وحركات فلكية بدقة أجزاء من الألف من الثانية القوسية (ميلي ثانية قوسية) لملياري نجم.',
    relatedTerms: ['cross_match', 'allwise', 'proper_motion'],
  },

  allwise: {
    id: 'allwise',
    category: 'scientific_evidence',
    symbol: 'WISE',
    nameEn: 'NASA AllWISE Infrared Catalog',
    nameAr: 'فهرس أول وايز للأشعة تحت الحمراء',
    simpleNameEn: 'NASA’s Infrared Sky Directory',
    simpleNameAr: 'سجل ناسا الشامل للأشعة تحت الحمراء',
    simpleExplanationEn: 'NASA’s complete infrared atlas of cold stars, brown dwarfs, and interstellar dust clouds across the entire sky.',
    simpleExplanationAr: 'أطلس ناسا الشامل لأجرام الفضاء الباردة والأقزام البنية وسحب الغبار في الأشعة تحت الحمراء لكامل السماء.',
    whyItMattersEn: 'Reveals ultra-cool brown dwarfs and dust-shrouded sources that are completely invisible in optical catalogs like Gaia, but shine in SPHEREx.',
    whyItMattersAr: 'يكشف الأقزام البنية الباردة والأجرام المحجوبة بالغبار التي لا تراها التلسكوبات الضوئية، لكنها تلمع في أشعة SPHEREx.',
    practicalExampleEn: 'WISE 0855-0714 was originally pinpointed in the AllWISE catalog thanks to its distinct thermal colors at 3.4 and 4.6 microns.',
    practicalExampleAr: 'تم اكتشاف القزم البارد WISE 0855-0714 في فهرس وايز بفضل لونه الحراري المميز عند 3.4 و 4.6 ميكرومتر.',
    technicalDetailsEn: 'NASA Wide-field Infrared Survey Explorer mid-infrared catalog covering W1 (3.4 µm), W2 (4.6 µm), W3 (12 µm), and W4 (22 µm) down to W1 ~ 17.1 mag.',
    technicalDetailsAr: 'فهرس تلسكوب وايز المداري لناسا عند أربعة نطاقات رئيسية، يوفر قياسات ضوئية دقيقة لمئات الملايين من المصادر الحرارية.',
    relatedTerms: ['cross_match', 'gaia_dr3', 'infrared'],
  },
};

export function getGlossaryTerm(id: string): GlossaryTerm | undefined {
  return SCIENTIFIC_GLOSSARY[id];
}

export function getTermsByCategory(category: GlossaryCategoryId): GlossaryTerm[] {
  return Object.values(SCIENTIFIC_GLOSSARY).filter((t) => t.category === category);
}

export function searchGlossaryTerms(query: string, lang: 'en' | 'ar'): GlossaryTerm[] {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return Object.values(SCIENTIFIC_GLOSSARY);

  return Object.values(SCIENTIFIC_GLOSSARY).filter((t) => {
    return (
      t.nameEn.toLowerCase().includes(cleanQ) ||
      t.nameAr.toLowerCase().includes(cleanQ) ||
      t.simpleNameEn.toLowerCase().includes(cleanQ) ||
      t.simpleNameAr.toLowerCase().includes(cleanQ) ||
      t.simpleExplanationEn.toLowerCase().includes(cleanQ) ||
      t.simpleExplanationAr.toLowerCase().includes(cleanQ) ||
      t.whyItMattersEn.toLowerCase().includes(cleanQ) ||
      t.whyItMattersAr.toLowerCase().includes(cleanQ) ||
      t.practicalExampleEn.toLowerCase().includes(cleanQ) ||
      t.practicalExampleAr.toLowerCase().includes(cleanQ) ||
      t.technicalDetailsEn.toLowerCase().includes(cleanQ) ||
      t.technicalDetailsAr.toLowerCase().includes(cleanQ) ||
      (t.symbol && t.symbol.toLowerCase().includes(cleanQ))
    );
  });
}
