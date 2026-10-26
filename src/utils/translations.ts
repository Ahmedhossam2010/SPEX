export type Language = 'en' | 'ar';

export interface TranslationDictionary {
  appName: string;
  tagline: string;
  subtagline: string;
  navHome: string;
  navExplore: string;
  navCases: string;
  navAbout: string;
  langToggle: string;
  
  // Classification
  statusSignificant: string;
  statusStable: string;
  statusArtifact: string;
  statusIncompatible: string;
  statusUnknown: string;

  // View modes
  viewDifference: string;
  viewSignificance: string;
  viewEpoch1: string;
  viewEpoch2: string;
  viewSplit: string;
  viewBlink: string;

  // Canvas HUD
  hudCoords: string;
  hudPixel: string;
  hudFlux: string;
  hudSignificance: string;
  hudBaseline: string;
  hudScale: string;
  hudNoise: string;
  hudBlinkSpeed: string;

  // Candidate
  candidateTitle: string;
  noCandidates: string;
  candidateStatusCandidate: string;
  candidateStatusKnown: string;
  candidateStatusArtifact: string;
  candidateStatusInsufficient: string;
  whyMattersTitle: string;
  photometryTitle: string;
  gaiaTitle: string;
  noGaiaMatches: string;
  artifactFlagsTitle: string;
  allClearArtifacts: string;

  // Controls
  ctrlStretch: string;
  ctrlColormap: string;
  ctrlZoomIn: string;
  ctrlZoomOut: string;
  ctrlReset: string;
  ctrlMarkers: string;
  ctrlProvenance: string;
  ctrlSearch: string;
  ctrlSearchPlaceholderRa: string;
  ctrlSearchPlaceholderDec: string;
  ctrlLoadCase: string;

  // SPEX
  spexTitle: string;
  spexRole: string;
  spexThinking: string;
  spexPlaceholder: string;
  spexSend: string;
  spexChips: string[];

  // About & Provenance
  auditBadge: string;
  provenanceTitle: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    appName: 'SPHEREx',
    tagline: 'THE CHANGING SKY',
    subtagline: 'NASA Space Apps · Verified IRSA Science Engine',
    navHome: 'HOME',
    navExplore: 'EXPLORE',
    navCases: 'CURATED CASES',
    navAbout: 'AUDIT & SCIENCE',
    langToggle: 'عربي',

    statusSignificant: 'SIGNIFICANT CHANGE DETECTED',
    statusStable: 'NO SIGNIFICANT CHANGE DETECTED',
    statusArtifact: 'POSSIBLE ARTIFACT',
    statusIncompatible: 'PHYSICALLY INCOMPATIBLE',
    statusUnknown: 'EVALUATING DATA...',

    viewDifference: 'Difference (I₂ - I₁)',
    viewSignificance: 'Significance (S/N)',
    viewEpoch1: 'Epoch 1',
    viewEpoch2: 'Epoch 2',
    viewSplit: 'Split Wipe',
    viewBlink: 'Blink Comparison',

    hudCoords: 'Celestial Position',
    hudPixel: 'Pixel Coordinate',
    hudFlux: 'Flux Density',
    hudSignificance: 'Significance',
    hudBaseline: 'Time Baseline',
    hudScale: 'Native Scale: ~6.15"/px',
    hudNoise: 'Noise Floor (MAD σ)',
    hudBlinkSpeed: 'Blink Cadence',

    candidateTitle: 'Candidate Detections',
    noCandidates: 'No statistically significant residual peaks detected above 3.5σ threshold.',
    candidateStatusCandidate: 'Candidate Transient',
    candidateStatusKnown: 'Known Catalog Source',
    candidateStatusArtifact: 'Instrumental Artifact',
    candidateStatusInsufficient: 'Marginal Signal',
    whyMattersTitle: 'Why does this matter?',
    photometryTitle: 'Aperture Photometry (r=2.5px)',
    gaiaTitle: 'Gaia DR3 Cross-Match (3.5" cone)',
    noGaiaMatches: 'No catalog point sources within 3.5" astrometric radius (unmatched celestial excursion).',
    artifactFlagsTitle: 'Data Quality & Morphology Checks',
    allClearArtifacts: 'Passed all artifact rejection checks (nominal PSF morphology, unflagged detector bits).',

    ctrlStretch: 'Display Stretch',
    ctrlColormap: 'Color Palette',
    ctrlZoomIn: 'Zoom In',
    ctrlZoomOut: 'Zoom Out',
    ctrlReset: 'Center View',
    ctrlMarkers: 'Candidate Reticles',
    ctrlProvenance: 'Provenance & Audit',
    ctrlSearch: 'Investigate Coordinates',
    ctrlSearchPlaceholderRa: 'RA (deg)',
    ctrlSearchPlaceholderDec: 'Dec (deg)',
    ctrlLoadCase: 'Select Investigation Target',

    spexTitle: 'SPEX',
    spexRole: 'Space-Cat Astrophysicist AI Guide',
    spexThinking: 'Calculating aperture variance & checking Gaia catalogs...',
    spexPlaceholder: 'Ask SPEX about this sky field, candidate, or physics...',
    spexSend: 'Ask',
    spexChips: [
      'What changed in this field?',
      'Is this a real astrophysical transient?',
      'Why was this candidate flagged as an artifact?',
      'Explain the difference formula & WCS astrometry',
    ],

    auditBadge: 'SCIENTIFICALLY AUDITED · ZERO SYNTHETIC INJECTIONS',
    provenanceTitle: 'Astronomical Data Provenance & Chain of Custody',
  },
  ar: {
    appName: 'سفيركس',
    tagline: 'السماء المتغيرة',
    subtagline: 'تحدي تطبيقات الفضاء NASA · محرك بيانات IRSA الحقيقي',
    navHome: 'الرئيسية',
    navExplore: 'المستكشف الفلكي',
    navCases: 'حالات موثقة',
    navAbout: 'التدقيق العلمي',
    langToggle: 'English',

    statusSignificant: 'رصد تغير ضوئي حقيقي',
    statusStable: 'ثبات كوني تام (ضمن حدود الضوضاء)',
    statusArtifact: 'عامل تشويش رصدي (Artifact)',
    statusIncompatible: 'نطاقات طيفية غير متوافقة فيزيائيًا',
    statusUnknown: 'جاري فحص البيانات...',

    viewDifference: 'خريطة الفروق (I₂ - I₁)',
    viewSignificance: 'مستوى الدلالة الإحصائية (S/N)',
    viewEpoch1: 'الحقبة الأولى',
    viewEpoch2: 'الحقبة الثانية',
    viewSplit: 'المقارنة التفاعلية (Split)',
    viewBlink: 'الوميض التبادلي (Blink)',

    hudCoords: 'الإحداثيات السماوية',
    hudPixel: 'إحداثيات البيكسل',
    hudFlux: 'كثافة التدفق الضوئي',
    hudSignificance: 'نسبة الإشارة إلى الضوضاء',
    hudBaseline: 'الفارق الزمني',
    hudScale: 'المقياس الزاوي: ~6.15 ثانية قوسية/بيكسل',
    hudNoise: 'مستوى ضوضاء الخلفية (MAD)',
    hudBlinkSpeed: 'سرعة الوميض',

    candidateTitle: 'المرشحات الفلكية المرصودة',
    noCandidates: 'لم يتم رصد أي قمم تدفق تتجاوز عتبة الضوضاء الإحصائية (3.5σ).',
    candidateStatusCandidate: 'مرشح فلكي حقيقي',
    candidateStatusKnown: 'جرم سماوي معروف بالكتالوج',
    candidateStatusArtifact: 'تشويش مستشعر / بقايا رصد',
    candidateStatusInsufficient: 'إشارة ضعيفة غير حاسمة',
    whyMattersTitle: 'ليه ده مهم علميًا؟',
    photometryTitle: 'قياس التدفق الضوئي الفلكي (Aperture Photometry)',
    gaiaTitle: 'المطابقة مع مرصد غايا (Gaia DR3)',
    noGaiaMatches: 'لا يوجد نجوم معروفة في كتالوج غايا ضمن نطاق 3.5 ثانية قوسية (جرم غير مفهرس).',
    artifactFlagsTitle: 'فحص جودة البيكسل وشكل الإشارة',
    allClearArtifacts: 'اجتاز جميع اختبارات تصفية التشويش (شكل PSF سليم، لا توجد أعلام بييركس تالفة).',

    ctrlStretch: 'تدريج التباين (Stretch)',
    ctrlColormap: 'لوحة الألوان (Colormap)',
    ctrlZoomIn: 'تكبير',
    ctrlZoomOut: 'تصغير',
    ctrlReset: 'إعادة ضبط الإطار',
    ctrlMarkers: 'علامات المرشحات',
    ctrlProvenance: 'سجل التدقيق والمصدر (Provenance)',
    ctrlSearch: 'فحص إحداثيات سماوية',
    ctrlSearchPlaceholderRa: 'المطلع المستقيم (RA)',
    ctrlSearchPlaceholderDec: 'الميل السماوي (Dec)',
    ctrlLoadCase: 'اختيار هدف من الأرشيف',

    spexTitle: 'سبيكس (SPEX)',
    spexRole: 'الرفيق الفلكي الذكي والقط الفضائي المشاغب',
    spexThinking: 'بيحسب التباين الضوئي ويفحص كتالوج غايا...',
    spexPlaceholder: 'اسأل سبيكس عن اللي اتغير في السما أو كواليس الحسابات...',
    spexSend: 'إرسال',
    spexChips: [
      'إيه اللي اتغير في الجزء ده من السما؟',
      'هل ده انفجار كوني حقيقي ولا مجرد صدفة؟',
      'ليه تم تصنيف المرشح ده كـ Artifact؟',
      'اشرحلي إزاي الـWCS بيحدد مكان النجم في السما بالضبط',
    ],

    auditBadge: 'خاضع للتدقيق العلمي الصارم · بيانات حقيقية بنسبة 100%',
    provenanceTitle: 'سلسلة الموثوقية ومصادر البيانات الفلكية',
  },
};
