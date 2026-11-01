export type Language = 'en' | 'ar';

export interface TranslationDictionary {
  // Brand & Top Navigation
  appName: string;
  tagline: string;
  subtagline: string;
  workspaceSubtitle: string;
  navHome: string;
  navExplore: string;
  navCases: string;
  navAbout: string;
  langToggle: string;
  themeToggleDark: string;
  themeToggleLight: string;

  // 10-Second Explainer Banner
  explainerTitle: string;
  explainerBadge: string;
  explainerText: string;
  btnSearchCoordinates: string;

  // 4-Stage Observation Progression
  step1FirstObs: string;
  step2SecondObs: string;
  step3WhatChanged: string;
  step4HowStrong: string;
  btnSplitSwipe: string;
  btnFastBlink: string;

  // View Mode Status Labels
  statusVisit1: string;
  statusVisit2: string;
  statusDifference: string;
  statusSignificance: string;
  statusSplit: string;
  statusBlink: string;

  // Canvas Viewport Controls & HUD
  btnZoomIn: string;
  btnZoomOut: string;
  btnResetView: string;
  btnShowMarkers: string;
  btnHideMarkers: string;
  btnProvenance: string;
  hudHoverPrompt: string;
  hudCoordX: string;
  hudCoordY: string;
  hudRA: string;
  hudDec: string;
  hudFlux: string;
  hudSignificance: string;
  hudUnitMjySr: string;
  hudUnitSigma: string;

  // Contrast & Stretch Controls
  settingsTitle: string;
  btnAdjustContrast: string;
  btnHideContrast: string;
  labelStretch: string;
  labelColormap: string;
  stretchAsinh: string;
  stretchLinear: string;
  stretchSqrt: string;
  stretchLog: string;
  colormapDiverging: string;
  colormapGrayscale: string;
  colormapHeat: string;

  // Candidate Findings Panel
  findingsTitle: string;
  findingsCount: string;
  filterAll: string;
  filterReal: string;
  filterGlitches: string;
  noFindings: string;
  pageOf: string;

  // Finding Card Details
  findingMovingHeadline: string;
  findingArtifactHeadline: string;
  findingKnownStarHeadline: string;
  findingSignalHeadline: string;
  findingDipoleBadge: string;
  findingArtifactBadge: string;
  findingCatalogBadge: string;
  btnLocateCanvas: string;
  btnAskSpex: string;
  btnShowData: string;
  btnHideData: string;
  labelPixelPos: string;
  labelCelestialCoords: string;
  labelFluxUncertainty: string;
  labelAperturePhotometry: string;
  labelGaiaMatch: string;
  labelAllWiseMatch: string;
  labelDqFlags: string;
  labelSeparation: string;
  labelUncataloged: string;

  // SPEX Companion
  spexName: string;
  spexTitle: string;
  spexRole: string;
  spexTagline: string;
  spexChatButton: string;
  spexChatTitle: string;
  spexChatSubtitle: string;
  spexThinking: string;
  spexInputPlaceholder: string;
  spexPlaceholder: string;
  spexSendButton: string;
  spexPromptWhatSpot: string;
  spexPromptIsAsteroid: string;
  spexPromptGlitchOrReal: string;
  spexPromptAstroJoke: string;
  spexPromptWhatSpotQuery: string;
  spexPromptIsAsteroidQuery: string;
  spexPromptGlitchOrRealQuery: string;
  spexPromptAstroJokeQuery: string;
  spexDefaultGreeting: string;
  spexMovingObjectThought: string;
  spexArtifactThought: string;
  spexEurekaThought: string;
  spexDiscoveryThought: string;
  spexCalmFieldThought: string;

  // Coordinate Search Modal
  searchModalTitle: string;
  searchModalClose: string;
  searchCoverageNoticeTitle: string;
  searchCoverageNoticeText: string;
  searchLabelRa: string;
  searchLabelDec: string;
  searchVerifiedTargetsTitle: string;
  searchTargetNepVar: string;
  searchTargetNepCal: string;
  searchTargetNepMotion: string;
  searchTargetNepField: string;
  searchBtnCancel: string;
  searchBtnSubmit: string;

  // Error & Notice Banner
  noticeSurveyCoverage: string;
  noticeGeneral: string;
  btnInspectNepBenchmark: string;
  btnDismissNotice: string;

  // Homepage
  homeMissionBadge: string;
  homeHeroTitlePrefix: string;
  homeHeroTitleHighlight: string;
  homeHeroSubtitle: string;
  homeStep1Title: string;
  homeStep1Desc: string;
  homeStep2Title: string;
  homeStep2Desc: string;
  homeStep3Title: string;
  homeStep3Desc: string;
  homeBtnStartExplore: string;
  homeBtnBrowseCases: string;
  homeBtnScientificAudit: string;
  homeBenchmarksHeader: string;
  homeBenchmark1: string;
  homeBenchmark2: string;
  homeBenchmark3: string;
  homeSpexSpeechGreeting: string;
  homeSpexSpeechText: string;
  homeProvenanceNoteTitle: string;
  homeProvenanceNoteText: string;

  // Cases View
  casesHeaderBadge: string;
  casesHeaderTitle: string;
  casesHeaderDesc: string;
  casesBtnInvestigate: string;
  casesClassificationLabel: string;

  // About & Scientific Audit View
  aboutHeaderBadge: string;
  aboutHeaderTitle: string;
  aboutHeaderSubtitle: string;
  aboutAnomalyTitle: string;
  aboutAnomalyText: string;
  aboutArchTitle: string;
  aboutArch1Title: string;
  aboutArch1Desc: string;
  aboutArch2Title: string;
  aboutArch2Desc: string;
  aboutArch3Title: string;
  aboutArch3Desc: string;
  aboutArch4Title: string;
  aboutArch4Desc: string;
  aboutAuditTableTitle: string;
  aboutAuditTableSubtitle: string;
  aboutTableColComponent: string;
  aboutTableColImplemented: string;
  aboutTableColTested: string;
  aboutTableColArchiveStatus: string;
  aboutStatusYes: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    // Brand & Top Navigation
    appName: 'SPHEREx',
    tagline: 'THE CHANGING SKY',
    subtagline: 'NASA Space Apps Challenge 2026',
    workspaceSubtitle: 'Astronomical Transient & Variability Workspace',
    navHome: 'Home',
    navExplore: 'Explore Sky',
    navCases: 'Benchmarks',
    navAbout: 'Science & Audit',
    langToggle: 'عربي',
    themeToggleDark: 'Switch to Light Theme',
    themeToggleLight: 'Switch to Dark Theme',

    // 10-Second Explainer Banner
    explainerTitle: 'Comparing SPHEREx Observations Over Time',
    explainerBadge: 'NASA Calibrated FITS',
    explainerText:
      'We take two authentic NASA SPHEREx infrared visits of the same sky patch taken at different times and subtract them. Residual bright or dark spots instantly reveal moving objects (asteroids), variable stars, or detector issues.',
    btnSearchCoordinates: 'Search Coordinates',

    // 4-Stage Observation Progression
    step1FirstObs: '1. First Observation',
    step2SecondObs: '2. Second Observation',
    step3WhatChanged: '3. What Changed?',
    step4HowStrong: '4. How Strong? (σ)',
    btnSplitSwipe: 'Split Swipe',
    btnFastBlink: 'Fast Blink',

    // View Mode Status Labels
    statusVisit1: 'Visit 1 (Original Calibrated FITS)',
    statusVisit2: 'Visit 2 (Original Calibrated FITS)',
    statusDifference: 'Difference Image (Flux Residuals)',
    statusSignificance: 'Significance Map (Signal-to-Noise σ)',
    statusSplit: 'Interactive Split Slider',
    statusBlink: 'Rapid Cadence Blink',

    // Canvas Viewport Controls & HUD
    btnZoomIn: 'Zoom In',
    btnZoomOut: 'Zoom Out',
    btnResetView: 'Reset Viewport',
    btnShowMarkers: 'Show Markers',
    btnHideMarkers: 'Hide Markers',
    btnProvenance: 'Provenance',
    hudHoverPrompt: 'Hover over image for coordinates & flux',
    hudCoordX: 'X',
    hudCoordY: 'Y',
    hudRA: 'RA',
    hudDec: 'Dec',
    hudFlux: 'Flux',
    hudSignificance: 'Significance',
    hudUnitMjySr: 'MJy/sr',
    hudUnitSigma: 'σ',

    // Contrast & Stretch Controls
    settingsTitle: 'Astronomical Contrast & Stretch',
    btnAdjustContrast: 'Adjust Contrast',
    btnHideContrast: 'Hide',
    labelStretch: 'Mathematical Stretch:',
    labelColormap: 'Color Palette (Colormap):',
    stretchAsinh: 'Asinh',
    stretchLinear: 'Linear',
    stretchSqrt: 'Sqrt',
    stretchLog: 'Log',
    colormapDiverging: 'Diverging (Cyan-Amber)',
    colormapGrayscale: 'Grayscale',
    colormapHeat: 'Heat (Infrared)',

    // Candidate Findings Panel
    findingsTitle: 'Detected Signals',
    findingsCount: 'candidates',
    filterAll: 'All',
    filterReal: 'Real',
    filterGlitches: 'Glitches',
    noFindings: 'No signals match the selected filter.',
    pageOf: 'Page',

    // Finding Card Details
    findingMovingHeadline: 'Moving Object Candidate',
    findingArtifactHeadline: 'Detector Glitch (Filtered)',
    findingKnownStarHeadline: 'Cataloged Variable Star',
    findingSignalHeadline: 'Significant Celestial Signal',
    findingDipoleBadge: 'Dipole Motion',
    findingArtifactBadge: 'Detector Glitch',
    findingCatalogBadge: 'Catalog Match',
    btnLocateCanvas: 'Locate on Canvas',
    btnAskSpex: 'Ask SPEX',
    btnShowData: 'Data',
    btnHideData: 'Hide Data',
    labelPixelPos: 'Pixel Position (X, Y):',
    labelCelestialCoords: 'Celestial (RA, Dec):',
    labelFluxUncertainty: 'Flux Uncertainty (1σ):',
    labelAperturePhotometry: 'Aperture Photometry:',
    labelGaiaMatch: 'Gaia DR3 Match:',
    labelAllWiseMatch: 'AllWISE Match:',
    labelDqFlags: 'DQ Flags:',
    labelSeparation: 'Separation',
    labelUncataloged: 'Uncataloged',

    // SPEX Companion
    spexName: 'SPEX',
    spexTitle: 'SPEX',
    spexRole: 'SPEX Celestial Guide',
    spexTagline: 'Explains cosmic evidence in human language',
    spexChatButton: 'Chat with SPEX',
    spexChatTitle: 'Chat with SPEX',
    spexChatSubtitle: 'Ask about sigma, motion, or astronomy in plain English',
    spexThinking: 'SPEX is cross-matching catalogs & calculating...',
    spexInputPlaceholder: 'Ask SPEX about any signal, motion, or number...',
    spexPlaceholder: 'Ask SPEX about any signal, motion, or number...',
    spexSendButton: 'Send',
    spexPromptWhatSpot: 'What is this spot?',
    spexPromptIsAsteroid: 'Could this be an asteroid?',
    spexPromptGlitchOrReal: 'Glitch or discovery?',
    spexPromptAstroJoke: 'Tell an astro joke',
    spexPromptWhatSpotQuery: 'Explain in plain English what this highlighted signal represents.',
    spexPromptIsAsteroidQuery: 'Is there any evidence of motion or an asteroid in this observation?',
    spexPromptGlitchOrRealQuery: 'How do you tell a detector glitch from a real astronomical discovery?',
    spexPromptAstroJokeQuery: 'Tell me a lighthearted astronomy joke about stars or asteroids!',
    spexDefaultGreeting:
      'Welcome! I am SPEX, your celestial guide for SPHEREx 🐾 Choose an observation or enter coordinates, and we will compare visits to discover what moved or flared in the sky!',
    spexMovingObjectThought:
      'Detected a dipole pattern! A bright peak next to a negative depression with angular separation. Scientifically speaking, this indicates an object shifted position—likely an asteroid or high-proper-motion star.',
    spexArtifactThought:
      'The selected signal looks like a detector artifact! Likely a cosmic-ray hit or saturated pixel. I flagged and filtered it so your research stays pristine 🐾',
    spexEurekaThought:
      'Exceptional discovery! Statistical significance exceeds 8σ with unmistakable flux variation between both visits!',
    spexDiscoveryThought:
      'Discovered variable signals in this patch. Tap any finding below to center and inspect it on the map.',
    spexCalmFieldThought:
      'This sky region is remarkably calm and stable across time! No flares or moving objects found, making it ideal for calibrating SPHEREx detectors.',

    // Coordinate Search Modal
    searchModalTitle: 'Investigate Sky Coordinates',
    searchModalClose: 'Close',
    searchCoverageNoticeTitle: 'Available SPHEREx QR2 Coverage:',
    searchCoverageNoticeText:
      'The currently published NASA/IPAC SPHEREx QR2 release covers the North Ecliptic Pole (NEP) deep field (RA 275.5°–276.8°, Dec +64.5°–65.2°). Full all-sky coverage expands in future releases.',
    searchLabelRa: 'Right Ascension (RA in degrees, ~275.5°–276.8°):',
    searchLabelDec: 'Declination (Dec in degrees, ~+64.5°–65.2°):',
    searchVerifiedTargetsTitle: 'Verified Targets within SPHEREx QR2 Footprint:',
    searchTargetNepVar: 'NEP Deep Variable',
    searchTargetNepCal: 'NEP Calibration Standard',
    searchTargetNepMotion: 'NEP Proper Motion Star',
    searchTargetNepField: 'NEP Field Counterpart',
    searchBtnCancel: 'Cancel',
    searchBtnSubmit: 'Query & Compare',

    // Error & Notice Banner
    noticeSurveyCoverage: 'Survey Coverage Notice:',
    noticeGeneral: 'Notice:',
    btnInspectNepBenchmark: 'Inspect Verified NEP Benchmark',
    btnDismissNotice: 'Dismiss',

    // Homepage
    homeMissionBadge: 'NASA SPHEREx Mission · All-Sky Infrared Survey QR2',
    homeHeroTitlePrefix: 'THE SKY ',
    homeHeroTitleHighlight: 'CHANGES.',
    homeHeroSubtitle:
      'Did something actually change in this part of the sky? Compare multi-epoch infrared snapshots from NASA’s SPHEREx space observatory, compute difference maps, and investigate the evidence with SPEX, your astrophysicist companion.',
    homeStep1Title: '01. Two Looks',
    homeStep1Desc: 'SPHEREx observes the same sky months apart in the infrared spectrum.',
    homeStep2Title: '02. Subtract Sky',
    homeStep2Desc: 'Subtracting visits leaves only objects that brightened, dimmed, or moved.',
    homeStep3Title: '03. Verify Facts',
    homeStep3Desc: 'Check signal significance, eliminate detector glitches, and cross-match Gaia.',
    homeBtnStartExplore: 'Start Investigation',
    homeBtnBrowseCases: 'Browse Benchmarks',
    homeBtnScientificAudit: 'Scientific Audit',
    homeBenchmarksHeader: 'Verified Astronomical Benchmarks in SPHEREx QR2:',
    homeBenchmark1: 'NEP Deep Variable (7.8σ Change)',
    homeBenchmark2: 'Stability Standard (Zero Change)',
    homeBenchmark3: 'DQ Mask (Rejects Saturation & Artifacts)',
    homeSpexSpeechGreeting: 'SPEX says hello!',
    homeSpexSpeechText:
      '"I am SPEX, guardian of the SPHEREx infrared sky! I help you subtract observations to see whether a star genuinely fluctuated or if it is just detector noise. Step into the workspace and let’s explore!"',
    homeProvenanceNoteTitle: '100% Real NASA Data Provenance',
    homeProvenanceNoteText:
      'Every pixel originates from calibrated FITS archives at NASA/IPAC IRSA, processed with zero synthetic imagery or mock placeholders.',

    // Cases View
    casesHeaderBadge: 'NASA/IPAC IRSA SPHEREx QR2 · Ground Truth Investigations',
    casesHeaderTitle: 'Verified Astronomical Case Files',
    casesHeaderDesc:
      'Four genuine multi-epoch SPHEREx investigations demonstrating verified variable stars, photometric null stability, and automated bitmask artifact rejection.',
    casesBtnInvestigate: 'Investigate Case',
    casesClassificationLabel: 'Classification:',

    // About & Scientific Audit View
    aboutHeaderBadge: 'NASA Space Apps Challenge Submission · Scientific Audit & Architecture',
    aboutHeaderTitle: 'SPHEREx — The Changing Sky',
    aboutHeaderSubtitle:
      'An authentic, evidence-driven astronomical investigation platform that compares multi-epoch infrared sky observations from NASA’s SPHEREx mission to answer the fundamental question: "Did something actually change in this part of the sky?"',
    aboutAnomalyTitle: 'Forensic Audit: Resolution of the ~207.64σ Candidate Anomaly',
    aboutAnomalyText:
      'In initial builds, pixel (49, 57) exhibited a massive flux excursion that was misclassified as a confirmed discovery due to a loose crossmatch. Forensic auditing revealed the physical root cause: unaligned subtraction between mismatched pointings where an authentic catalog star was subtracted against empty sky. Rigid translation registration, dipole artifact rejection, and tightening the Gaia crossmatch radius to 3.5" completely eliminated this false transient.',
    aboutArchTitle: 'End-to-End Scientific Architecture',
    aboutArch1Title: '1. NASA IRSA Data',
    aboutArch1Desc: 'Live TAP ObsCore queries & verified Level-2B cutouts',
    aboutArch2Title: '2. FITS Engine',
    aboutArch2Desc: 'PC-matrix WCS (~6.15"/px) & D = I₂ - I₁ registration',
    aboutArch3Title: '3. Statistical Engine',
    aboutArch3Desc: 'MAD robust noise, aperture photometry & DQ bitmask',
    aboutArch4Title: '4. Bilingual SPEX AI',
    aboutArch4Desc: 'Strictly grounded in computed data',
    aboutAuditTableTitle: 'Feature Verification Table (Audit Record)',
    aboutAuditTableSubtitle: 'Confirmed statuses backed by unit tests and authentic IRSA data execution.',
    aboutTableColComponent: 'Pipeline Component',
    aboutTableColImplemented: 'Implemented',
    aboutTableColTested: 'Tested',
    aboutTableColArchiveStatus: 'Archive Status',
    aboutStatusYes: 'Yes',
  },
  ar: {
    // Brand & Top Navigation
    appName: 'سفيركس',
    tagline: 'السماء المتغيرة',
    subtagline: 'تحدي ناسا لتطبيقات الفضاء 2026',
    workspaceSubtitle: 'منصة استكشاف التغيرات الفلكية والكويكبات',
    navHome: 'الرئيسية',
    navExplore: 'المستكشف الفلكي',
    navCases: 'حالات موثقة',
    navAbout: 'التدقيق العلمي',
    langToggle: 'English',
    themeToggleDark: 'التبديل إلى الوضع الفاتح',
    themeToggleLight: 'التبديل إلى الوضع الداكن',

    // 10-Second Explainer Banner
    explainerTitle: 'مقارنة رصدات SPHEREx عبر الزمن',
    explainerBadge: 'بيانات FITS حقيقية من ناسا',
    explainerText:
      'نأخذ صورتين حقيقيتين لنفس البقعة في السماء التقطهما تلسكوب ناسا في وقتين مختلفين، ثم نطرحهما من بعضهما. أي نقطة مضيئة أو مظلمة متبقية تكشف عن أجرام تحركت (كويكبات)، أو نجوم تغير سطوعها، أو عيوب في الكاميرا تم استبعادها.',
    btnSearchCoordinates: 'بحث بإحداثيات',

    // 4-Stage Observation Progression
    step1FirstObs: '1. الرصدة الأولى',
    step2SecondObs: '2. الرصدة الثانية',
    step3WhatChanged: '3. ما الذي تغير؟',
    step4HowStrong: '4. ما مدى قوة التغير؟ (σ)',
    btnSplitSwipe: 'شريحة مقارنة',
    btnFastBlink: 'وميض سريع',

    // View Mode Status Labels
    statusVisit1: 'الرصدة 1 (FITS أصلي ومعاير)',
    statusVisit2: 'الرصدة 2 (FITS أصلي ومعاير)',
    statusDifference: 'صورة الفرق (طرح التدفق الإشعاعي)',
    statusSignificance: 'خريطة الأهمية الإحصائية (سيجما σ)',
    statusSplit: 'شريحة مقارنة تفاعلية متجاورة',
    statusBlink: 'وميض دوري متكرر بين الصورتين',

    // Canvas Viewport Controls & HUD
    btnZoomIn: 'تكبير',
    btnZoomOut: 'تصغير',
    btnResetView: 'إعادة ضبط الإطار',
    btnShowMarkers: 'إظهار العلامات',
    btnHideMarkers: 'إخفاء العلامات',
    btnProvenance: 'سلسلة التوثيق',
    hudHoverPrompt: 'حرك المؤشر فوق الصورة لمعاينة الإحداثيات والتدفق',
    hudCoordX: 'س',
    hudCoordY: 'ص',
    hudRA: 'المطلع المستقيم',
    hudDec: 'الميل السماوي',
    hudFlux: 'التدفق',
    hudSignificance: 'الأهمية',
    hudUnitMjySr: 'ميجا يانسكي/ستريديان',
    hudUnitSigma: 'سيجما',

    // Contrast & Stretch Controls
    settingsTitle: 'إعدادات التباين والتلوين الفلكي',
    btnAdjustContrast: 'تعديل التباين',
    btnHideContrast: 'إخفاء',
    labelStretch: 'التمدد الرياضي (Stretch):',
    labelColormap: 'لوحة الألوان الطيفية (Colormap):',
    stretchAsinh: 'Asinh (أقواس الجيب)',
    stretchLinear: 'خطي (Linear)',
    stretchSqrt: 'الجذر التربيعي (Sqrt)',
    stretchLog: 'لوغاريتمي (Log)',
    colormapDiverging: 'متباعد (سماوي - كهرماني)',
    colormapGrayscale: 'تدرج رمادي فلكي',
    colormapHeat: 'حراري (أشعة تحت حمراء)',

    // Candidate Findings Panel
    findingsTitle: 'المرشحون المكتشفون',
    findingsCount: 'إشارات',
    filterAll: 'الكل',
    filterReal: 'حقيقي',
    filterGlitches: 'عيوب',
    noFindings: 'لا توجد إشارات مطابقة للتصفية المحددة.',
    pageOf: 'صفحة',

    // Finding Card Details
    findingMovingHeadline: 'جرم متحرك مرصود',
    findingArtifactHeadline: 'عيب في الحساس (مستبعد)',
    findingKnownStarHeadline: 'نجم متغير مسجل',
    findingSignalHeadline: 'إشارة فلكية حقيقية مؤكدة',
    findingDipoleBadge: 'حركة ثنائي القطب',
    findingArtifactBadge: 'عيب حساس',
    findingCatalogBadge: 'مطابق للفهرس',
    btnLocateCanvas: 'تحديد على الخريطة',
    btnAskSpex: 'اسأل SPEX',
    btnShowData: 'القياسات',
    btnHideData: 'إخفاء القياسات',
    labelPixelPos: 'موقع البكسل (س، ص):',
    labelCelestialCoords: 'الإحداثيات السماوية:',
    labelFluxUncertainty: 'ارتياب التدفق (1σ):',
    labelAperturePhotometry: 'القياس الضوئي:',
    labelGaiaMatch: 'تطابق فهرس جايا DR3:',
    labelAllWiseMatch: 'تطابق فهرس وايز AllWISE:',
    labelDqFlags: 'أعلام جودة الحساس (DQ):',
    labelSeparation: 'المسافة الزاوية',
    labelUncataloged: 'غير مسجل بالفهرس',

    // SPEX Companion
    spexName: 'سبيكس (SPEX)',
    spexTitle: 'سبيكس (SPEX)',
    spexRole: 'مرشد SPEX الفلكي الذكي',
    spexTagline: 'يشرح الأدلة الكونية بلغة بشرية بسيطة وممتعة',
    spexChatButton: 'محادثة SPEX',
    spexChatTitle: 'محادثة SPEX الفلكية',
    spexChatSubtitle: 'اسأل عن السيجما، الحركة، أو كويكبات السماء بلغة واضحة',
    spexThinking: 'SPEX يفكر ويقارن النجوم في الفهارس...',
    spexInputPlaceholder: 'اسأل SPEX عن أي نقطة، حركة، أو معنى رقم...',
    spexPlaceholder: 'اسأل SPEX عن أي نقطة، حركة، أو معنى رقم...',
    spexSendButton: 'إرسال',
    spexPromptWhatSpot: 'ما هي هذه النقطة؟',
    spexPromptIsAsteroid: 'هل هذا كويكب؟',
    spexPromptGlitchOrReal: 'خلل أم اكتشاف؟',
    spexPromptAstroJoke: 'نكتة فلكية',
    spexPromptWhatSpotQuery: 'اشرح لي ببساطة ماذا تمثل النقطة المضيئة المحددة هنا؟',
    spexPromptIsAsteroidQuery: 'هل توجد أدلة على حركة أو كويكب في هذه الرصدة؟',
    spexPromptGlitchOrRealQuery: 'كيف تفرق بين الخلل التقني في الحساس والجرم الفلكي الحقيقي؟',
    spexPromptAstroJokeQuery: 'قل لي نكتة فلكية لطيفة ومضحكة عن النجوم أو الكويكبات!',
    spexDefaultGreeting:
      'أهلاً بك! أنا SPEX، مرشدك الفلكي لمهمة SPHEREx 🐾 اختر هدفاً أو أدخل إحداثيات، وسنقارن صور السماء معاً لنرى ما الذي تحرك أو تغير سطوعه!',
    spexMovingObjectThought:
      'رصدنا ثنائي قطب مميز (Dipole)! هناك نقطة مضيئة بجوار فجوة مظلمة بمسافة زاوية واضحة. بلغة العلم الحذرة: هذا مؤشر على جسم تحرك عبر السماء، وقد يكون كويكباً أو نجماً قريباً عالي السرعة.',
    spexArtifactThought:
      'المرشح المحدد يبدو خللاً تقنياً في الحساس (Artifact)! أشعة كونية أو تشبع بكسل. قمت بوسمه واستبعاده حتى تظل نتائجك نقية 🐾',
    spexEurekaThought:
      'إشارة قوية واستثنائية! الأهمية الإحصائية تجاوزت 8σ مع تغير تدفق حقيقي ملحوظ بين الزيارتين!',
    spexDiscoveryThought:
      'وجدنا إشارات متغيرة في هذا الحقل. اضغط على أي مرشح بالأسفل لتكبيره وفحصه على الخريطة مباشرة.',
    spexCalmFieldThought:
      'هذا الحقل السماوي مستقر وهادئ تماماً عبر الزمن! لا توجد ومضات أو أجرام متحركة، وهو ممتاز لمعايرة دقة تلسكوب SPHEREx.',

    // Coordinate Search Modal
    searchModalTitle: 'فحص إحداثيات سماوية في SPHEREx',
    searchModalClose: 'إغلاق',
    searchCoverageNoticeTitle: 'نطاق تغطية SPHEREx QR2 الحالي:',
    searchCoverageNoticeText:
      'يغطي إصدار QR2 المنشور حالياً من ناسا منطقة القطب الشمالي لمسار الشمس (NEP) بين RA 275.5°–276.8° و Dec +64.5°–65.2°. ستتوسع التغطية لتشمل كامل السماء في الإصدارات القادمة.',
    searchLabelRa: 'المطلع المستقيم (RA بالدرجات، ~275.5°–276.8°):',
    searchLabelDec: 'الميل السماوي (Dec بالدرجات، ~+64.5°–65.2°):',
    searchVerifiedTargetsTitle: 'أهداف موثقة في نطاق SPHEREx QR2:',
    searchTargetNepVar: 'متغير NEP العميق',
    searchTargetNepCal: 'معيار المعايرة الضوئية',
    searchTargetNepMotion: 'نجم ذو حركة ذاتية',
    searchTargetNepField: 'نظير الحقل المرجعي',
    searchBtnCancel: 'إلغاء',
    searchBtnSubmit: 'بدء الاستعلام والمقارنة',

    // Error & Notice Banner
    noticeSurveyCoverage: 'تنبيه نطاق التغطية:',
    noticeGeneral: 'تنبيه:',
    btnInspectNepBenchmark: 'معاينة رصدة NEP المعتمدة',
    btnDismissNotice: 'إغلاق التنبيه',

    // Homepage
    homeMissionBadge: 'مهمة NASA SPHEREx · مسح السماء الشامل بالأشعة تحت الحمراء QR2',
    homeHeroTitlePrefix: 'السماء ',
    homeHeroTitleHighlight: 'تتغير.',
    homeHeroSubtitle:
      'هل حدث تغير حقيقي في هذا الجزء من السماء؟ قارن بين لقطتين زمنيتين من مرصد SPHEREx الفضائي التابع لناسا، واحسب خريطة الفروق الضوئية، ودقق في الأدلة الفلكية مع سبيكس (SPEX)، مرشدك الفلكي الذكي.',
    homeStep1Title: '01. لقطتان زمنيتان',
    homeStep1Desc: 'يرصد تلسكوب SPHEREx نفس البقعة في السماء بفاصل شهور في طيف الأشعة تحت الحمراء.',
    homeStep2Title: '02. طرح السماء',
    homeStep2Desc: 'طرح الصورتين يلغي الخلفية الثابتة تماماً ويظهر فقط ما زاد سطوعه، أو خفت، أو تحرك.',
    homeStep3Title: '03. إثبات الدليل',
    homeStep3Desc: 'فحص قوة الإشارة الإحصائية، واستبعاد عيوب الحساس، ومطابقة النجوم مع مرصد جايا ووايز.',
    homeBtnStartExplore: 'بدء الاستكشاف والتحليل',
    homeBtnBrowseCases: 'تصفح الحالات الموثقة',
    homeBtnScientificAudit: 'سجل التدقيق العلمي',
    homeBenchmarksHeader: 'حالات فلكية نموذجية موثقة في أرشيف SPHEREx QR2:',
    homeBenchmark1: 'متغير NEP العميق (تغير بقوة 7.8σ)',
    homeBenchmark2: 'معيار الثبات الضوئي (تغير منعدم 0.0σ)',
    homeBenchmark3: 'قناع الجودة (استبعاد التشبع وعيوب الحساس)',
    homeSpexSpeechGreeting: 'سبيكس يرحب بك!',
    homeSpexSpeechText:
      '«أنا سبيكس، حارس سماء SPHEREx والرفيق الفلكي! بساعدك تطرح صور الأشعة تحت الحمراء، ونعرف سوا لو النجم ومض بجد ولا مجرد بكسل مشوش. ادخل المعمل ويلا نبدأ!»',
    homeProvenanceNoteTitle: 'بيانات حقيقية 100% من وكالة ناسا',
    homeProvenanceNoteText:
      'كل بكسل في المنصة مستخرج مباشرة من أرشيف FITS المعاير في NASA/IPAC IRSA، بدون أي صور تخيلية أو بيانات وهمية.',

    // Cases View
    casesHeaderBadge: 'NASA/IPAC IRSA SPHEREx QR2 · تحقيقات علمية حقيقية',
    casesHeaderTitle: 'ملفات الحالات الفلكية الموثقة',
    casesHeaderDesc:
      'أربعة تحقيقات مبنية على بيانات SPHEREx الحقيقية. من اكتشاف النجوم المتغيرة، إلى إثبات الثبات الضوئي، وتصفية تشويش المستشعر والـ208σ persistence.',
    casesBtnInvestigate: 'افحص هذه الحالة الفلكية',
    casesClassificationLabel: 'التصنيف الفلكي:',

    // About & Scientific Audit View
    aboutHeaderBadge: 'مشروع مسابقة ناسا لتطبيقات الفضاء · التدقيق العلمي والمعمارية',
    aboutHeaderTitle: 'SPHEREx — السماء المتغيرة',
    aboutHeaderSubtitle:
      'منصة تحقيق فلكي أصيلة مبنية على أرصاد مرصد SPHEREx التابع لناسا، تطبق خوارزميات الطرح الصوري وحساب التباين الإحصائي وتصفية التشويش للإجابة على السؤال الأساسي: «هل حدث تغير ضوئي حقيقي في هذا الجزء من السماء؟»',
    aboutAnomalyTitle: 'حل لغز الـ 207.64σ Anomaly والتدقيق الجنائي للبيانات',
    aboutAnomalyText:
      'في الإصدارات الأولية، أظهر فرق البيكسل (49, 57) قفزة ضوئية هائلة صُنفت خطأً كاكتشاف فلكي بسبب مطابقة فضفاضة. كشف التدقيق الجنائي أن السبب كان طرح كتل غير متطابقة الإحداثيات حيث طُرح نجم حقيقي من سماء فارغة. تم حل المشكلة بضبط محاذاة WCS، وتطبيق فحص الديبول، وتضييق نطاق جايا إلى 3.5 ثانية قوسية.',
    aboutArchTitle: 'معمارية المعالجة العلمية المتكاملة',
    aboutArch1Title: '1. بيانات NASA IRSA',
    aboutArch1Desc: 'استعلامات TAP ObsCore حية ومقاطع Level-2B موثقة',
    aboutArch2Title: '2. محرك FITS الفلكي',
    aboutArch2Desc: 'معالجة WCS بدقة (~6.15"/px) ومحاذاة D = I₂ - I₁',
    aboutArch3Title: '3. المحرك الإحصائي',
    aboutArch3Desc: 'ضوضاء MAD الفلكية، والقياس الضوئي وأقنعة DQ',
    aboutArch4Title: '4. مرشد SPEX الذكي',
    aboutArch4Desc: 'مفسر مبسط مرتبط بالبيانات المحسوبة الحقيقية',
    aboutAuditTableTitle: 'جدول التحقق من الميزات (سجل التدقيق الرسمي)',
    aboutAuditTableSubtitle: 'حالات مؤكدة مدعومة باختبارات الوحدة البرمجية وبيانات IRSA الأصلية.',
    aboutTableColComponent: 'عنصر خط المعالجة',
    aboutTableColImplemented: 'تم التنفيذ',
    aboutTableColTested: 'تم الاختبار',
    aboutTableColArchiveStatus: 'حالة الأرشيف',
    aboutStatusYes: 'نعم',
  },
};
