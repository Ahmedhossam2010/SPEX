import { ViewerActionsState } from '../progress/progressStore';
import { AcademyDiagramType } from './AcademyDiagram';

export type QuestionDifficulty = 'easy' | 'medium' | 'challenge';

export interface AcademyMcqQuestion {
  id: string;
  type: 'mcq';
  difficulty: QuestionDifficulty;
  prompt: string;
  promptAr: string;
  options: string[];
  optionsAr: string[];
  correctIndex: number;
  explanation: string;
  explanationAr: string;
}

export interface AcademyViewerActionQuestion {
  id: string;
  type: 'viewer_action';
  difficulty: QuestionDifficulty;
  prompt: string;
  promptAr: string;
  actionKey: keyof ViewerActionsState;
  suggestedTargetCaseId: string;
  actionInstruction: string;
  actionInstructionAr: string;
  explanation: string;
  explanationAr: string;
}

export type AcademyQuestion = AcademyMcqQuestion | AcademyViewerActionQuestion;

export interface AcademyLessonSection {
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  keyFact: string;
  keyFactAr: string;
  termKey?: string;
}

export interface AcademyPracticeCheck {
  prompt: string;
  promptAr: string;
  options: string[];
  optionsAr: string[];
  correctIndex: number;
  hint: string;
  hintAr: string;
}

export interface AcademyLevel {
  levelId: number;
  slug: string;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  durationMinutes: number;
  xpReward: number;
  diagramType: AcademyDiagramType;
  exploreCaseId: string;
  spexMood: 'explaining' | 'curious' | 'eureka' | 'happy';
  spexIntro: string;
  spexIntroAr: string;
  sections: AcademyLessonSection[];
  practice: AcademyPracticeCheck;
  takeaways: string[];
  takeawaysAr: string[];
  questions: AcademyQuestion[];
}

export const ACADEMY_LEVELS: readonly AcademyLevel[] = [
  {
    levelId: 0,
    slug: 'what-is-spherex',
    title: 'Level 0: What Is SPHEREx?',
    titleAr: 'المستوى ٠: ما هو تلسكوب SPHEREx؟',
    subtitle: 'Mapping the entire infrared sky roughly every 6 months.',
    subtitleAr: 'مسح السماء بالأشعة تحت الحمراء بالكامل كل نحو ٦ أشهر.',
    durationMinutes: 2,
    xpReward: 80,
    diagramType: 'allsky',
    exploreCaseId: 'case-barnards-star',
    spexMood: 'explaining',
    spexIntro:
      'Welcome to SPEX Academy! I am Mr. SPEX. Let us discover how NASA’s SPHEREx surveys the whole infrared sky without cutting corners.',
    spexIntroAr:
      'أهلاً بك في أكاديمية سبيكس! أنا الأستاذ سبيكس. هيا نتعلم كيف يمسح تلسكوب SPHEREx السماء بالكامل بأمانة علمية.',
    sections: [
      {
        title: 'An All-Sky Survey Machine',
        titleAr: 'آلة مسح شاملة لكل السماء',
        body: 'Unlike Hubble or JWST that zoom tightly onto one tiny patch, SPHEREx sweeps across the entire sky over about 6 months, gathering multiple exposures during each local pass.',
        bodyAr:
          'على عكس هابل وجيمس ويب اللذين يركزان على بقعة صغيرة، يمسح SPHEREx السماء بأكملها خلال نحو ٦ أشهر مع التقاط عدة تعريضات أثناء كل تمريرة.',
        keyFact: 'Full sky pass ≈ every 6 months (~6.2″ per pixel)',
        keyFactAr: 'مسح شامل للسماء كل نحو ٦ أشهر (~٦.٢ ثانية قوسية لكل بكسل)',
      },
      {
        title: 'Real Survey Timing',
        titleAr: 'التوقيت الواقعي للتمريرات',
        body: 'Inside one local survey pass, exposures arrive minutes or hours apart; months later, another pass returns. SPEX never fabricates fake even spacing.',
        bodyAr:
          'داخل التمريرة الواحدة تتوالى اللقطات خلال دقائق أو ساعات، وبعد أشهر تأتي تمريرة جديدة. سبيكس يحافظ على التواريخ الحقيقية دون أي تزييف.',
        keyFact: 'Use Survey-pass mode to group clustered visits honestly',
        keyFactAr: 'استخدم وضع «تمريرة المسح» لتجميع اللقطات المتقاربة بأمانة',
      },
    ],
    practice: {
      prompt: 'Quick Check: Suppose a star has 5 frames inside April 2025 and 5 more in October 2025. How many sky passes is that?',
      promptAr: 'تحقق سريع: إذا وُجدت ٥ لقطات في أبريل ٢٠٢٥ و٥ في أكتوبر ٢٠٢٥، فكم تمريرة مسح يمثل ذلك؟',
      options: ['10 passes', '2 survey passes (~6 months apart)', '1 pass'],
      optionsAr: ['١٠ تمريرات', 'تمريرتا مسح (تفصلهما نحو ٦ أشهر)', 'تمريرة واحدة'],
      correctIndex: 1,
      hint: 'Visits clustered in the same week belong to one sky pass.',
      hintAr: 'اللقطات المتقاربة في الأسبوع نفسه تنتمي إلى تمريرة واحدة.',
    },
    takeaways: [
      'SPHEREx surveys the entire sky approximately every 6 months.',
      'Each detector pixel spans ~6.2 arcseconds on the sky.',
      'All dates in SPEX reflect authentic MJD archive timestamps.',
    ],
    takeawaysAr: [
      'يمسح SPHEREx السماء كلها كل نحو ٦ أشهر تقريباً.',
      'يمتد البكسل الواحد على نحو ٦.٢ ثانية قوسية في السماء.',
      'تعكس جميع التواريخ في سبيكس التوقيت الحقيقي من أرشيف ناسا.',
    ],
    questions: [
      {
        id: 'l0-q1',
        type: 'mcq',
        difficulty: 'easy',
        prompt: 'Roughly how often does SPHEREx map the full sky?',
        promptAr: 'كل كم تقريباً يمسح تلسكوب SPHEREx السماء بالكامل؟',
        options: ['Every 24 hours', 'About every 6 months', 'Once every 20 years'],
        optionsAr: ['كل ٢٤ ساعة', 'كل نحو ٦ أشهر', 'مرة كل ٢٠ عاماً'],
        correctIndex: 1,
        explanation: 'SPHEREx completes an all-sky survey roughly every 6 months as Earth orbits the Sun.',
        explanationAr: 'يكمل تلسكوب SPHEREx مسحاً شاملاً للسماء كل نحو ٦ أشهر مع دوران الأرض حول الشمس.',
      },
      {
        id: 'l0-q2',
        type: 'mcq',
        difficulty: 'medium',
        prompt: 'What is the angular width of one SPHEREx detector pixel on the sky?',
        promptAr: 'ما العرض الزاوي لبكسل واحد من كواشف SPHEREx في السماء؟',
        options: ['0.05 arcseconds', 'About 6.2 arcseconds', '1 full degree'],
        optionsAr: ['٠.٠٥ ثانية قوسية', 'نحو ٦.٢ ثوانٍ قوسية', 'درجة كاملة'],
        correctIndex: 1,
        explanation: 'SPHEREx pixels are ~6.2″ wide, enabling wide-field mapping paired with sub-pixel centroiding.',
        explanationAr: 'يبلغ عرض بكسل SPHEREx نحو ٦.٢ ثانية قوسية مع قياس مركز الضوء بدقة تحت-بكسلية.',
      },
      {
        id: 'l0-q3',
        type: 'mcq',
        difficulty: 'challenge',
        prompt: 'Why does SPEX keep real irregular timestamps instead of forcing a fake 6-month grid?',
        promptAr: 'لماذا يحافظ سبيكس على التوقيتات الواقعية بدلاً من فرض فاصل مصطنع كل ٦ أشهر؟',
        options: [
          'A single sky pass contains clustered visits over hours/days, and never fabricating data preserves truth',
          'Because space telescopes reset their clocks weekly',
          'To slow down browser animations',
        ],
        optionsAr: [
          'لأن التمريرة الواحدة تضم رصدات متجمعة خلال ساعات أو أيام وعدم اختلاق البيانات يحفظ الصدق العلمي',
          'لأن ساعات التلسكوب تُعاد ضبطها كل أسبوع',
          'لإبطاء الرسوم المتحركة فقط',
        ],
        correctIndex: 0,
        explanation: 'Survey-pass mode groups real visits by pass cleanly while displaying true MJD dates.',
        explanationAr: 'وضع تمريرة المسح يجمع الزيارات الفعلية دون اختلاق إطارات غير حقيقية.',
      },
    ],
  },
  {
    levelId: 1,
    slug: 'infrared-light',
    title: 'Level 1: Seeing Infrared Light',
    titleAr: 'المستوى ١: رؤية الضوء تحت الأحمر',
    subtitle: 'Why cool brown dwarfs and dusty stars shine brightest past 3 µm.',
    subtitleAr: 'لماذا تتوهج الأقزام البنية الباردة والنجوم المغبرة بقوة فوق ٣ ميكرومتر؟',
    durationMinutes: 2,
    xpReward: 100,
    diagramType: 'infrared',
    exploreCaseId: 'case-rw-aur',
    spexMood: 'curious',
    spexIntro:
      'Human eyes only see a tiny sliver of light. SPHEREx observes infrared wavelengths from 0.75 to 5.0 micrometers!',
    spexIntroAr:
      'العين البشرية لا ترى سوى شريط ضيق من الضوء. يراقب SPHEREx الأشعة تحت الحمراء من ٠.٧٥ إلى ٥.٠ ميكرومتر!',
    sections: [
      {
        title: 'Heat Glows in Infrared',
        titleAr: 'الحرارة تتوهج في الأشعة تحت الحمراء',
        body: 'Cool brown dwarfs like WISE 0855 (~250 K, room temperature) emit almost zero visible light, yet glow brightly between 3 and 5 µm.',
        bodyAr:
          'الأقزام البنية الباردة مثل WISE 0855 (~٢٥٠ كلفن) لا تكاد تصدر ضوءاً مرئياً، لكنها تتوهج بوضوح بين ٣ و٥ ميكرومتر.',
        keyFact: 'SPHEREx spans 0.75–5.0 µm across detector arrays D1–D6',
        keyFactAr: 'يغطي SPHEREx النطاق ٠.٧٥–٥.٠ ميكرومتر عبر الكواشف D1–D6',
      },
      {
        title: 'Cross-Checking Other Telescopes',
        titleAr: 'المقارنة مع التلسكوبات الأخرى',
        body: 'In the Explore panel "Other telescopes", Gaia DR3 overlays optical stars while AllWISE overlays older archival infrared measurements—helpful when visible light disappears.',
        bodyAr:
          'في قائمة «تلسكوبات أخرى» بالعارض، يحدد Gaia DR3 النجوم المرئية بينما يحدد AllWISE المصادر تحت الحمراء القديمة.',
        keyFact: 'Dust-enshrouded YSOs & cold dwarfs show up in AllWISE even if faint in Gaia',
        keyFactAr: 'الأجرام المغبرة والباردة تظهر في AllWISE حتى لو غابت عن Gaia',
      },
    ],
    practice: {
      prompt: 'Quick Check: You spot a bright spot at 4.5 µm (D6) with no Gaia DR3 blue circle nearby. What could explain it?',
      promptAr: 'تحقق سريع: رصدت نقطة مضيئة عند ٤.٥ ميكرومتر (D6) دون دائرة Gaia قريبة. ما التفسير المرجح؟',
      options: [
        'It is a cool infrared source or obscured behind dust',
        'Infrared telescopes cannot see stars',
        'Blue stars always vanish above 2 µm',
      ],
      optionsAr: [
        'قد يكون جرماً بارداً بالأشعة تحت الحمراء أو محجوباً بالغبار',
        'تلسكوبات الأشعة تحت الحمراء لا ترى النجوم',
        'النجوم الزرقاء تختفي فوق ٢ ميكرومتر',
      ],
      correctIndex: 0,
      hint: 'Cold brown dwarfs and dusty stars evade visible cameras like Gaia.',
      hintAr: 'الأقزام الباردة والنجوم المغبرة تختفي غالباً عن الكاميرات المرئية.',
    },
    takeaways: [
      'Infrared light penetrates interstellar dust clouds effortlessly.',
      'Detector D6 (4.42–5.00 µm) captures the coolest thermal glow.',
      'Gaia DR3 (optical) + AllWISE (infrared) overlays prevent false discoveries.',
    ],
    takeawaysAr: [
      'الأشعة تحت الحمراء تخترق سحب الغبار الكوني بسهولة.',
      'الكاشف D6 (٤.٤٢–٥.٠٠ ميكرومتر) يلتقط أبرد الإشعاعات الحرارية.',
      'دمج Gaia DR3 وAllWISE يمنع الاكتشافات الكاذبة.',
    ],
    questions: [
      {
        id: 'l1-q1',
        type: 'mcq',
        difficulty: 'easy',
        prompt: 'Which wavelength range does SPHEREx observe?',
        promptAr: 'ما نطاق الأطوال الموجية الذي يرصده SPHEREx؟',
        options: ['0.75 to 5.0 µm (Infrared)', '1 to 10 meters (Radio)', 'X-rays only'],
        optionsAr: ['٠.٧٥ إلى ٥.٠ ميكرومتر (تحت الحمراء)', '١ إلى ١٠ أمتار (راديو)', 'أشعة سينية فقط'],
        correctIndex: 0,
        explanation: 'SPHEREx covers 0.75–5.0 µm across six detector arrays (D1–D6).',
        explanationAr: 'يغطي SPHEREx النطاق ٠.٧٥–٥.٠ ميكرومتر عبر ستة كواشف.',
      },
      {
        id: 'l1-q2',
        type: 'mcq',
        difficulty: 'medium',
        prompt: 'Why can a cool brown dwarf appear in SPHEREx/AllWISE yet vanish from Gaia DR3?',
        promptAr: 'لماذا يظهر قزم بني بارد في SPHEREx/AllWISE ويغيب عن Gaia DR3؟',
        options: [
          'Gaia measures optical visible light, nearly absent from ~250 K objects',
          'Gaia points exclusively toward Earth’s Moon',
          'Brown dwarfs only reflect AM radio waves',
        ],
        optionsAr: [
          'يرصد Gaia الضوء المرئي الذي يكاد ينعدم عند الأجرام الباردة (~٢٥٠ كلفن)',
          'يتجه Gaia نحو القمر فقط',
          'الأقزام البنية تعكس موجات الراديو فقط',
        ],
        correctIndex: 0,
        explanation: 'Gaia sees optical wavelengths; cool brown dwarfs emit overwhelmingly at 3–5 µm.',
        explanationAr: 'يعمل Gaia في الضوء المرئي بينما يتركز توهج الأقزام الباردة عند ٣–٥ ميكرومتر.',
      },
      {
        id: 'l1-q3',
        type: 'mcq',
        difficulty: 'challenge',
        prompt: 'Which SPHEREx detector array looks furthest into mid-infrared thermal emission?',
        promptAr: 'أي كاشف في SPHEREx ينفذ أبعد إلى الأشعة تحت الحمراء الحرارية؟',
        options: ['D1 (0.75–1.11 µm)', 'D3 (1.65–2.42 µm)', 'D6 (4.42–5.00 µm)'],
        optionsAr: ['D1 (٠.٧٥–١.١١ ميكرومتر)', 'D3 (١.٦٥–٢.٤٢ ميكرومتر)', 'D6 (٤.٤٢–٥.٠٠ ميكرومتر)'],
        correctIndex: 2,
        explanation: 'Detector D6 covers the longest SPHEREx wavelengths: 4.42–5.00 µm.',
        explanationAr: 'يغطي الكاشف D6 أطول أطوال موجية من ٤.٤٢ إلى ٥.٠٠ ميكرومتر.',
      },
    ],
  },
  {
    levelId: 2,
    slug: 'motion-and-blinking',
    title: 'Level 2: Motion & Blinking',
    titleAr: 'المستوى ٢: الحركة والوميض الزمني',
    subtitle: 'Catch fast neighbors in blink movies—and tell solid trails from expected ones.',
    subtitleAr: 'التقاط الأجرام المتحركة بالوميض والتمييز بين المسار المؤكد والمتوقع.',
    durationMinutes: 3,
    xpReward: 120,
    diagramType: 'blinking',
    exploreCaseId: 'case-barnards-star',
    spexMood: 'eureka',
    spexIntro:
      'Distant galaxies sit frozen in space while nearby stars zip past! Blinking epochs reveals proper motion cleanly.',
    spexIntroAr:
      'المجرات البعيدة تبدو ثابتة بينما تنزلق النجوم القريبة! الوميض بين الحقبات يكشف الحركة الذاتية بوضوح.',
    sections: [
      {
        title: 'Proper Motion & Difference Frames',
        titleAr: 'الحركة الذاتية وطرح الإطارات',
        body: 'Blinking between Epoch 1 and later visits makes stationary background stars stand still while fast nearby stars like Barnard’s Star (10.4″/yr) visibly hop.',
        bodyAr:
          'الوميض بين الحقبة الأولى والزيارات اللاحقة يثبت الخلفية ويجعل نجم برنارد (١٠.٤″/سنة) يقفز بوضوح.',
        keyFact: 'Difference mode turns moving stars into bright/dark pairs',
        keyFactAr: 'وضع الفارق يحوّل النجم المتحرك إلى ثنائي قطب ساطع ومعتم',
        termKey: 'proper_motion',
      },
      {
        title: 'Solid vs. Dashed "expected" Trails',
        titleAr: 'المسار المتصل مقابل المتقطع «المتوقع»',
        body: 'SPEX renders a solid trail only when measured motion beats the statistical significance gate. Otherwise it renders a dashed track labeled "expected".',
        bodyAr:
          'يرسم سبيكس مساراً متصلاً فقط عند تجاوز الدلالة الإحصائية، وإلا فيرسم خطاً متقطعاً بعنوان «متوقع».',
        keyFact: 'Dashed + "expected" prevents false discoveries from noise',
        keyFactAr: 'الخط المتقطع يمنع اعتبار الضجيج اكتشافاً مؤكداً',
        termKey: 'sigma',
      },
    ],
    practice: {
      prompt: 'Quick Check: You toggle "Show changes" and see stationary stars vanish into neutral gray, while one star turns bright/dark. Why?',
      promptAr: 'تحقق سريع: عند تفعيل «اعرض ما تغير» اختفت النجوم الثابتة وظهرت بقعة ساطعة/معتمة. لماذا؟',
      options: [
        'Subtracting Epoch 1 removes unchanging stars and isolates what shifted or brightened',
        'Only one star existed in the second image',
        'The monitor brightness dropped automatically',
      ],
      optionsAr: [
        'طرح الحقبة الأولى يزيل النجوم الثابتة ويُبرز ما تحرك أو تغير سطوعه',
        'النجم وحده هو الموجود في اللقطة الثانية',
        'انخفض سطوع الشاشة تلقائياً',
      ],
      correctIndex: 0,
      hint: 'Think about subtracting identical brightness values: StarB - StarA ≈ 0.',
      hintAr: 'عند طرح قيمتين متساويتين يصبح الناتج صفراً رمادياً.',
    },
    takeaways: [
      'Blinking passes quickly reveals proper-motion objects.',
      'Subtracting Epoch 1 removes constant stars cleanly.',
      'Solid trail = statistically significant motion; dashed + expected = below threshold.',
    ],
    takeawaysAr: [
      'الوميض بين التمريرات يكشف الأجرام ذات الحركة الذاتية بسرعة.',
      'طرح الحقبة الأولى يمحو النجوم الثابتة.',
      'المسار المتصل = حركة دالة إحصائياً؛ المتقطع = دون حد الدلالة بعد.',
    ],
    questions: [
      {
        id: 'l2-q1',
        type: 'viewer_action',
        difficulty: 'easy',
        prompt: 'Hands-on Check: Open the Sky Viewer and press Play to blink Barnard’s Star.',
        promptAr: 'اختبار عملي: افتح عارض السماء واضغط تشغيل لعرض الوميض لنجم برنارد.',
        actionKey: 'playedBlink',
        suggestedTargetCaseId: 'case-barnards-star',
        actionInstruction: 'Click "Try it in Explore", then press Play Sky Movie.',
        actionInstructionAr: 'اضغط «جرّبها في الاستكشاف» ثم شغّل عرض السماء.',
        explanation: 'Blinking frames in real time is the fastest way to catch proper-motion sources.',
        explanationAr: 'الوميض بين الإطارات أسرع طريقة لرصد الأجرام المتحركة.',
      },
      {
        id: 'l2-q2',
        type: 'mcq',
        difficulty: 'medium',
        prompt: 'In SPEX, what does a dashed trail labeled "expected" tell you?',
        promptAr: 'ماذا يعني المسار المتقطع الموسوم بـ «expected / متوقع» في سبيكس؟',
        options: [
          'The telescope broke during observation',
          'Measured motion is not statistically significant yet, so it shows predicted catalog drift',
          'The star exploded',
        ],
        optionsAr: [
          'توقف التلسكوب عن العمل أثناء الرصد',
          'الحركة المقاسة غير دالة إحصائياً بعد، لذا يظهر المسار الفلكي المتوقع فقط',
          'انفجر النجم وتحول إلى سديم',
        ],
        correctIndex: 1,
        explanation: 'SPEX never fakes significant motion where uncertainty dominates.',
        explanationAr: 'يلتزم سبيكس بالأمانة العلمية ولا يزيّف دلالة إحصائية غير موجودة.',
      },
      {
        id: 'l2-q3',
        type: 'viewer_action',
        difficulty: 'challenge',
        prompt: 'Hands-on Check: Activate "Show changes" (Difference view) in the Explorer.',
        promptAr: 'اختبار عملي: فعّل وضع الفارق («اعرض ما تغير») في العارض.',
        actionKey: 'toggledDiff',
        suggestedTargetCaseId: 'case-barnards-star',
        actionInstruction: 'Click "Show what changed" on Barnard’s Star in Explore.',
        actionInstructionAr: 'اضغط «اعرض ما تغير» على نجم برنارد في العارض.',
        explanation: 'Subtracting Epoch 1 cancels stationary background stars cleanly.',
        explanationAr: 'طرح الحقبة الأولى يعزل الأجرام التي تغير موضعها أو سطوعها.',
      },
    ],
  },
  {
    levelId: 3,
    slug: 'spectra-102-bands',
    title: 'Level 3: Spectra Across 102 Colors',
    titleAr: 'المستوى ٣: الأطياف عبر ١٠٢ لوناً',
    subtitle: 'Read molecular fingerprints of water ice, methane, CO₂, and CO.',
    subtitleAr: 'قراءة البصمات الجزيئية لجليد الماء والميثان وثاني أكسيد الكربون.',
    durationMinutes: 3,
    xpReward: 140,
    diagramType: 'spectra',
    exploreCaseId: 'case-rw-aur',
    spexMood: 'explaining',
    spexIntro:
      'Every sky patch in SPHEREx acts like an infrared spectrograph across 102 channels—letting us read chemistry from afar!',
    spexIntroAr:
      'كل بقعة في خرائط SPHEREx تحمل طيفاً مكوناً من ١٠٢ قناة تقرأ كيمياء الأجرام عن بُعد!',
    sections: [
      {
        title: '102 Spectral Channels',
        titleAr: '١٠٢ قناة طيفية دقيقة',
        body: 'Linear Variable Filters split 0.75–5.0 µm into 102 smooth channels spanning detectors D1–D6, revealing brightness slopes and dips across wavelength.',
        bodyAr:
          'تقسم المرشحات المتغيرة خطياً النطاق ٠.٧٥–٥.٠ ميكرومتر إلى ١٠٢ قناة عبر الكواشف D1–D6.',
        keyFact: 'Wavelength climbs from D1 (~0.9 µm) to D6 (~4.7 µm)',
        keyFactAr: 'يرتفع الطول الموجي من D1 (~٠.٩ ميكرومتر) حتى D6 (~٤.٧ ميكرومتر)',
      },
      {
        title: 'Molecular Absorption Dips',
        titleAr: 'انخفاضات الامتصاص الجزيئي',
        body: 'Water ice dips at 3.05 µm, methane at 3.32 µm, CO₂ ice at 4.27 µm, and CO gas at 4.67 µm—creating unmistakable valleys in a spectrum.',
        bodyAr:
          'يمتص الجليد المائي عند ٣.٠٥ ميكرومتر، والميثان عند ٣.٣٢، وجليد CO₂ عند ٤.٢٧، وأول أكسيد الكربون عند ٤.٦٧.',
        keyFact: 'Deep valleys near 3.3 µm + bright 4.7 µm glow scream cold brown dwarf',
        keyFactAr: 'الانخفاض عند ٣.٣ ميكرومتر مع السطوع عند ٤.٧ ميكرومتر بصمة واضحة للأقزام الباردة',
      },
    ],
    practice: {
      prompt: 'Quick Check: Where on the wavelength axis would you inspect for CO₂ ice absorption?',
      promptAr: 'تحقق سريع: عند أي طول موجي تبحث عن بصمة جليد ثاني أكسيد الكربون CO₂؟',
      options: ['Near 0.85 µm (D1)', 'Near 4.27 µm (D5)', 'Near 12.0 µm'],
      optionsAr: ['قرب ٠.٨٥ ميكرومتر (D1)', 'قرب ٤.٢٧ ميكرومتر (D5)', 'قرب ١٢.٠ ميكرومتر'],
      correctIndex: 1,
      hint: 'Check the green/red valley labeled CO₂ on the diagram above.',
      hintAr: 'راجع المنحنى الطيفي في الرسم التوضيحي أعلاه.',
    },
    takeaways: [
      'SPHEREx measures 102 wavelengths across every pixel.',
      'Ice & gas molecules carve sharp absorption dips at specific micrometers.',
      'Detector switching compares visible-edge stars vs thermal dust glow.',
    ],
    takeawaysAr: [
      'يقيس SPHEREx ١٠٢ طولاً موجياً لكل بكسل.',
      'الجزيئات الباردة تصنع انخفاضات مميزة عند أطوال موجية محددة.',
      'التنقل بين الكواشف يقارن بين النجوم القريبة والغبار الحراري.',
    ],
    questions: [
      {
        id: 'l3-q1',
        type: 'mcq',
        difficulty: 'easy',
        prompt: 'Which molecule creates a sharp infrared absorption feature near 4.27 µm?',
        promptAr: 'أي جزيء يترك بصمة امتصاص قوية قرب ٤.٢٧ ميكرومتر؟',
        options: ['Solid Carbon Dioxide (CO₂ ice)', 'Helium', 'Iron'],
        optionsAr: ['ثاني أكسيد الكربون المتجمد (CO₂)', 'غاز الهيليوم', 'الحديد'],
        correctIndex: 0,
        explanation: 'CO₂ ice produces a strong absorption band centered near 4.27 µm.',
        explanationAr: 'يمتلك جليد CO₂ حزمة امتصاص شهيرة عند ٤.٢٧ ميكرومتر.',
      },
      {
        id: 'l3-q2',
        type: 'viewer_action',
        difficulty: 'medium',
        prompt: 'Hands-on Check: Switch detector band (D1–D6) in the Explorer viewer.',
        promptAr: 'اختبار عملي: غيّر الكاشف (D1–D6) داخل عارض السماء.',
        actionKey: 'changedBand',
        suggestedTargetCaseId: 'case-rw-aur',
        actionInstruction: 'Pick a detector button (D1–D6) in the Time panel or drag the right wavelength edge.',
        actionInstructionAr: 'اختر كاشفاً (D1–D6) من لوحة الزمن أو اسحب شريط الطول الموجي.',
        explanation: 'Comparing bands shows how dusty disks and cool sources change across 0.75–5 µm.',
        explanationAr: 'المقارنة بين الكواشف تكشف تغير سطوع الأجرام عبر الأشعة تحت الحمراء.',
      },
      {
        id: 'l3-q3',
        type: 'mcq',
        difficulty: 'challenge',
        prompt: 'A cold object dims sharply at 3.3 µm and brightens near 4.6–4.8 µm. What is it likely?',
        promptAr: 'جرم بارد يخفت عند ٣.٣ ميكرومتر ويسطع قرب ٤.٦–٤.٨ ميكرومتر. ماذا يرجح أنه؟',
        options: [
          'Methane absorption + thermal glow from a cold brown dwarf',
          'A blue supergiant star',
          'An optical camera glitch',
        ],
        optionsAr: [
          'امتصاص الميثان مع توهج حراري من قزم بني بارد',
          'نجم عملاق أزرق شديد الحرارة',
          'خلل في كاميرا الضوء المرئي',
        ],
        correctIndex: 0,
        explanation: 'Methane (CH₄) absorbs 3.3 µm light while 4.7 µm thermal flux peaks in T/Y dwarfs.',
        explanationAr: 'الميثان يمتص عند ٣.٣ ميكرومتر بينما يبلغ التوهج الحراري ذروته قرب ٤.٧ ميكرومتر.',
      },
    ],
  },
  {
    levelId: 4,
    slug: 'brown-dwarfs',
    title: 'Level 4: Hunting Brown Dwarfs (WISE 0855)',
    titleAr: 'المستوى ٤: صيد الأقزام البنية (WISE 0855)',
    subtitle: 'Failed stars as cold as a winter night—only ~7.4 light-years away.',
    subtitleAr: 'نجوم لم تكتمل ببرودة ليلة شتوية على بُعد ٧.٤ سنوات ضوئية فقط.',
    durationMinutes: 3,
    xpReward: 160,
    diagramType: 'browndwarf',
    exploreCaseId: 'case-wise-0855',
    spexMood: 'happy',
    spexIntro:
      'Our coolest target is WISE 0855 (~250 K)! Let us examine why honest error bars matter when signals hug the noise floor.',
    spexIntroAr:
      'أبرد أهدافنا هو القزم البني WISE 0855 (~٢٥٠ كلفن)! لنرَ لماذا تحمي هوامش الخطأ الصدق العلمي.',
    sections: [
      {
        title: 'Neither Planet Nor Full Star',
        titleAr: 'ليس كوكباً ولا نجماً مكتملاً',
        body: 'Brown dwarfs lack the mass to sustain hydrogen fusion. WISE 0855 zips across our sky at 8.15″/yr—nearly 1.3 SPHEREx pixels every year—just 7.4 light-years away.',
        bodyAr:
          'تفتقر الأقزام البنية للكتلة الكافية لإشعال اندماج الهيدروجين. يتحرك WISE 0855 بسرعة ٨.١٥″/سنة على بُعد ٧.٤ سنوات ضوئية فقط.',
        keyFact: 'Coldest known Y-dwarf at ~250 K',
        keyFactAr: 'أبرد قزم بني معروف من فئة Y عند نحو ٢٥٠ كلفن',
      },
      {
        title: 'Honest Limits: "motion not significant"',
        titleAr: 'الأمانة العلمية: «الحركة غير دالة إحصائياً»',
        body: 'Over a short baseline with faint flux, measured uncertainty (±4.4″) keeps confidence below 3σ (~1.4σ). So SPEX reports "motion not significant" alongside a dashed expected track.',
        bodyAr:
          'مع الفاصل الزمني القصير وهامش الخطأ (±٤.٤″)، تبقى الثقة دون ٣ سيغما، لذا يذكر سبيكس بصدق «motion not significant» مع مسار متوقع متقطع.',
        keyFact: 'Wait for >3σ or multi-pass stacks before declaring discovery',
        keyFactAr: 'انتظر دلالة تفوق ٣ سيغما أو تمريرات إضافية قبل إعلان الاكتشاف',
        termKey: 'sigma',
      },
    ],
    practice: {
      prompt: 'Quick Check: Why does SPEX draw WISE 0855’s trail dashed and labeled "expected"?',
      promptAr: 'تحقق سريع: لماذا يرسم سبيكس مسار WISE 0855 متقطعاً بكلمة «expected»؟',
      options: [
        'Measured proper-motion significance (~1.4σ) is below the threshold, so dashed shows catalog expectation without faking proof',
        'Because WISE 0855 stopped moving in 2025',
        'To save battery on your browser',
      ],
      optionsAr: [
        'لأن الدلالة المقاسة (~١.٤ سيغما) دون الحد الإحصائي، فيُعرض المسار المتوقع فلكياً دون افتعال تأكيد',
        'لأن الجرم توقف عن الحركة تماماً',
        'لتوفير طاقة البطارية في المتصفح',
      ],
      correctIndex: 0,
      hint: 'Compare 6.1″ measured offset vs ±4.4″ error (< 3σ).',
      hintAr: 'قارن الإزاحة المقاسة ٦.١″ بهامش الخطأ ±٤.٤″.',
    },
    takeaways: [
      'WISE 0855 is ~250 K and only 7.4 light-years away.',
      'Real astronomy depends on signal-to-noise (S/N) and uncertainty bars.',
      'Never overclaim motion when σ < 3; show "motion not significant" honestly.',
    ],
    takeawaysAr: [
      'درجة حرارة WISE 0855 نحو ٢٥٠ كلفن ويبعد ٧.٤ سنوات ضوئية.',
      'الفلك الحقيقي يعتمد على نسبة الإشارة للضجيج وهوامش الخطأ.',
      'لا تبالغ في ادعاء حركة مؤكدة عندما تكون الدلالة دون ٣ سيغما.',
    ],
    questions: [
      {
        id: 'l4-q1',
        type: 'viewer_action',
        difficulty: 'easy',
        prompt: 'Hands-on Check: Open WISE 0855 in the Explore viewer.',
        promptAr: 'اختبار عملي: افتح هدف WISE 0855 داخل عارض الاستكشاف.',
        actionKey: 'visitedWise0855',
        suggestedTargetCaseId: 'case-wise-0855',
        actionInstruction: 'Click "Try it in Explore" to load WISE 0855.',
        actionInstructionAr: 'اضغط «جرّبها في الاستكشاف» لتحميل حقل WISE 0855.',
        explanation: 'Inspecting real frames makes the noise vs faint-source challenge crystal clear.',
        explanationAr: 'معاينة اللقطات الحقيقية توضح تحدي رصد الأجرام الخافتة وسط الضجيج.',
      },
      {
        id: 'l4-q2',
        type: 'viewer_action',
        difficulty: 'medium',
        prompt: 'Hands-on Check: Toggle Survey-pass mode in the Time panel.',
        promptAr: 'اختبار عملي: جرّب زر «تمريرة المسح» في لوحة الزمن.',
        actionKey: 'toggledSurveyPass',
        suggestedTargetCaseId: 'case-wise-0855',
        actionInstruction: 'Click the Survey-pass button in the floating Time panel.',
        actionInstructionAr: 'اضغط زر تمريرة المسح في لوحة الزمن الجانبية.',
        explanation: 'Survey-pass grouping organizes clustered visits cleanly pass by pass.',
        explanationAr: 'تجميع تمريرات المسح يرتب الزيارات المتقاربة بموضوعية.',
      },
      {
        id: 'l4-q3',
        type: 'mcq',
        difficulty: 'challenge',
        prompt: 'If WISE 0855 shows 6.1″ ± 4.4″ (~1.4σ), what is the right scientific conclusion?',
        promptAr: 'إذا كانت إزاحة WISE 0855 هي ٦.١″ ± ٤.٤″ (~١.٤ سيغما)، فما الخلاصة العلمية الصادقة؟',
        options: [
          'Announce a 100% confirmed planet immediately',
          'Label "motion not significant" and gather longer-baseline passes',
          'Remove the error bars from the chart',
        ],
        optionsAr: [
          'إعلان اكتشاف كوكب مؤكد بنسبة ١٠٠٪ فوراً',
          'توصيف النتيجة كـ «حركة غير دالة إحصائياً» وانتظار تمريرات أطول زمنياً',
          'حذف هوامش الخطأ من المخطط',
        ],
        correctIndex: 1,
        explanation: 'At ~1.4σ, noise alone can mimic a shift. Honest limits build real science.',
        explanationAr: 'عند نحو ١.٤ سيغما يمكن للضجيج محاكاة الحركة، والصدق في الحدود هو أساس العلم.',
      },
    ],
  },
  {
    levelId: 5,
    slug: 'discover-on-your-own',
    title: 'Level 5: Discover on Your Own',
    titleAr: 'المستوى ٥: اكتشف بنفسك',
    subtitle: 'Run a complete citizen-science check: blink, filter bad pixels, cross-match, and report.',
    subtitleAr: 'طبّق خطوات العالم المواطن كاملة: وميض، فحص جودة البيانات، مقارنة التلسكوبات، والمشاركة.',
    durationMinutes: 3,
    xpReward: 180,
    diagramType: 'discovery',
    exploreCaseId: 'case-epsilon-indi',
    spexMood: 'eureka',
    spexIntro:
      'You are ready to run your own sky check! Combine blinking, DQ quality badges, Other telescopes, and Citizen reporting.',
    spexIntroAr:
      'أنت الآن جاهز لإجراء فحصك السماوي الخاص! اجمع بين الوميض وفحص جودة البيانات والتلسكوبات الأخرى.',
    sections: [
      {
        title: 'Four-Step Citizen Checklist',
        titleAr: 'قائمة الفحص ذات الخطوات الأربع',
        body: '1) Blink pass-to-pass frames. 2) Check red DQ markers ("Why is this marked?") to rule out cosmic-ray spikes. 3) Toggle Gaia DR3 / AllWISE. 4) Flag glitches or share discoveries!',
        bodyAr:
          '١) وميض التمريرات. ٢) فحص علامات الجودة الحمراء لاستبعاد الأشعة الكونية. ٣) مقارنة Gaia DR3 وAllWISE. ٤) الإبلاغ عن الخلل أو مشاركة الاكتشاف.',
        keyFact: 'Every verified flag or discovery boosts your Explorer Rank',
        keyFactAr: 'كل بلاغ دقيق أو اكتشاف يرفع رتبتك في المنصة',
      },
      {
        title: 'Why Larger FOV Takes Longer',
        titleAr: 'لماذا يستغرق مجال الرؤية الواسع وقتاً أطول؟',
        body: 'Switching FOV from 3.3′ to 16.5′ quadruples the sky patch pixels fetched from IRSA—great for hunting neighbors, though it carries a larger download cost.',
        bodyAr:
          'توسيع مجال الرؤية إلى ١٦.٥′ يزيد حجم البيانات المجلوبة من أرشيف ناسا عدة أضعاف، مما يتيح رؤية جيران أكثر مع وقت تحميل أطول.',
        keyFact: 'Use 6.6′ for crisp fast inspections; expand to 16.5′ to survey fields',
        keyFactAr: 'استخدم ٦.٦′ للفحص السريع، ووسّع إلى ١٦.٥′ لمسح الجوار السماوي',
      },
    ],
    practice: {
      prompt: 'Quick Check: You see a sharp 1-pixel spike on only ONE single frame, outlined by a rose DQ marker. Is it a moving star?',
      promptAr: 'تحقق سريع: ظهرت نقطة حادة بحجم بكسل واحد في إطار واحد فقط ومعلمة بمؤشر DQ الأحمر. هل هي نجم متحرك؟',
      options: [
        'Likely a cosmic-ray hit or detector glitch—click Report bad data or skip it',
        'A supernova traveling faster than light',
        'Guaranteed to be a planet orbiting Jupiter',
      ],
      optionsAr: [
        'يرجح أنها ضربة شعاع كوني أو خلل حساس — أبلغ عنها كبيانات تالفة أو تجاهلها',
        'مستعر أعظم يتحرك أسرع من الضوء',
        'كوكب يدور حول المشتري بالتأكيد',
      ],
      correctIndex: 0,
      hint: 'Real celestial objects appear cleanly across frames without DQ artifact bits.',
      hintAr: 'الأجرام الحقيقية تظهر بثبات عبر الإطارات دون أعلام خلل في الحساس.',
    },
    takeaways: [
      'Always verify DQ flags before celebrating a bright blip.',
      'Cross-checking Gaia DR3 & AllWISE confirms whether a source is newly spotted.',
      'Share deep links (?target=&fov=&pass=) or report bad pixels in Community.',
    ],
    takeawaysAr: [
      'تحقق دائماً من أعلام الجودة قبل إعلان أي ومضة كاكتشاف.',
      'مقارنة Gaia وAllWISE تؤكد هوية الجرم وهل هو معروف مسبقاً.',
      'شارك الروابط المباشرة أو أبلغ عن البكسلات التالفة في صفحة المجتمع.',
    ],
    questions: [
      {
        id: 'l5-q1',
        type: 'mcq',
        difficulty: 'easy',
        prompt: 'What should you inspect first if a bright dot appears in only one exposure inside a pass?',
        promptAr: 'ما أول ما ينبغي فحصه إذا ظهرت نقطة ساطعة في تعريض واحد فقط داخل التمريرة؟',
        options: [
          'The DQ (Data Quality) flags and warning badges to rule out cosmic-ray spikes',
          'Change your browser wallpaper',
          'Ignore timestamps completely',
        ],
        optionsAr: [
          'أعلام جودة البيانات DQ وشارات التحذير لاستبعاد الأشعة الكونية',
          'تغيير خلفية المتصفح',
          'تجاهل التواريخ تماماً',
        ],
        correctIndex: 0,
        explanation: 'Single-frame bright spikes are classic cosmic rays or hot pixels, tagged in SPHEREx DQ bitmasks.',
        explanationAr: 'النقاط الأحادية الإطار غالباً ما تكون أشعة كونية يلتقطها قناع جودة البيانات.',
      },
      {
        id: 'l5-q2',
        type: 'viewer_action',
        difficulty: 'medium',
        prompt: 'Hands-on Check: Tap any spot on the sky image to read its exact flux & sky coordinates.',
        promptAr: 'اختبار عملي: انقر فوق أي بقعة في صورة السماء لقراءة سطوعها وإحداثياتها الحقيقية.',
        actionKey: 'inspectedSpot',
        suggestedTargetCaseId: 'case-epsilon-indi',
        actionInstruction: 'Click any star on the Epsilon Indi sky patch to inspect its raw FITS reading.',
        actionInstructionAr: 'انقر على أي نجم في رقعة إبسيلون إندي لقراءة التدفق الفعلي.',
        explanation: 'Every tap inspects original raw calibrated pixels directly.',
        explanationAr: 'كل نقرة تقرأ القيم الحقيقية من ملف FITS المعاير مباشرة.',
      },
      {
        id: 'l5-q3',
        type: 'mcq',
        difficulty: 'challenge',
        prompt: 'Which combination represents the complete citizen-scientist discovery workflow?',
        promptAr: 'أي تسلسل يمثل خطوات الاكتشاف العلمي الكاملة في المنصة؟',
        options: [
          'Blink passes → Check DQ flags → Cross-match Gaia/AllWISE → Report glitches or share deep link',
          'Zoom to 1x → Turn off overlays → Guess star names randomly',
          'Delete all FITS metadata',
        ],
        optionsAr: [
          'وميض التمريرات ← فحص أعلام DQ ← مقارنة Gaia وAllWISE ← الإبلاغ أو مشاركة الرابط',
          'إطفاء الطبقات وتخمين الأسماء عشوائياً',
          'حذف البيانات الوصفية تماماً',
        ],
        correctIndex: 0,
        explanation: 'Disciplined multi-pass blinking + DQ vetting + multi-catalog checks catch real discoveries cleanly!',
        explanationAr: 'الجمع بين الوميض وفحص الجودة ومقارنة الكتالوجات يقود لاكتشافات موثوقة!',
      },
    ],
  },
];
