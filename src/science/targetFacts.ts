export interface VerifiedTargetFact {
  id: string;
  aliases: string[];
  nameEn: string;
  nameAr: string;
  objectTypeEn: string;
  objectTypeAr: string;
  factsEn: string[];
  factsAr: string[];
  analogyEn: string;
  analogyAr: string;
}

export const SPHEREX_MISSION_FACTS = {
  factsEn: [
    'SPHEREx is a NASA infrared space telescope that scans the entire sky every 6 months.',
    'It sees infrared heat glow across 102 wavelengths from 0.75 to 5.0 micrometers using 6 detectors (D1 to D6).',
    'Each SPHEREx camera pixel covers about 6.2 arcseconds of sky.',
  ],
  factsAr: [
    'سبيراكس تلسكوب فضائي تابع لناسا يمسح كامل السماء بالأشعة تحت الحمراء كل 6 أشهر.',
    'يرصد التوهج الحراري عبر 102 طول موجي من 0.75 إلى 5.0 ميكرومتر باستخدام 6 كواشف (D1 إلى D6).',
    'كل بكسل في كاميرا سبيراكس يغطي حوالي 6.2 ثانية قوسية من السماء.',
  ],
};

export const VERIFIED_TARGET_FACTS: VerifiedTargetFact[] = [
  {
    id: 'case-barnards-star',
    aliases: ['barnard', "barnard's star", 'gj 699', 'case-barnards-star'],
    nameEn: "Barnard's Star",
    nameAr: 'نجم بارنارد',
    objectTypeEn: 'Nearby red dwarf star (~6 light-years away)',
    objectTypeAr: 'نجم قزم أحمر قريب (يبعد نحو 6 سنوات ضوئية)',
    factsEn: [
      "Barnard's Star is one of the closest stars to our Sun (~6 light-years away).",
      'It has the fastest proper motion of any star in Earth’s sky (~10.4 arcseconds per year).',
      'Because it is very bright in infrared light, the center pixels saturate in some SPHEREx frames, so its position is estimated from the outer glow ring (wing fit) with lower confidence.',
    ],
    factsAr: [
      'نجم بارنارد من أقرب النجوم لشمسنا (يبعد حوالي 6 سنوات ضوئية).',
      'يمتلك أسرع حركة ظاهرية عبر السماء لأي نجم معروف (حوالي 10.4 ثانية قوسية كل سنة).',
      'لأنه ساطع جداً في الأشعة تحت الحمراء، تتشبع بكسلات المركز في بعض اللقطات، لذا يُقدّر موقعه من الهالة المحيطة به بدرجة يقين أقل.',
    ],
    analogyEn: 'Like watching a car drive past in front of faraway mountains—it shifts noticeably compared to distant background stars.',
    analogyAr: 'يشبه سيارة تتحرك أمام جبال بعيدة جداً؛ تلاحظ تغير مكانها مقارنة بالنجوم الثابتة في الخلفية.',
  },
  {
    id: 'case-wise-0855',
    aliases: ['wise 0855', 'wise0855', '0855', 'case-wise-0855'],
    nameEn: 'WISE 0855',
    nameAr: 'القزم البارد WISE 0855',
    objectTypeEn: 'Coldest known Y-type brown dwarf (~7.4 light-years away)',
    objectTypeAr: 'أبرد قزم بني معروف من الفئة Y (يبعد نحو 7.4 سنوات ضوئية)',
    factsEn: [
      'WISE 0855 is the coldest known brown dwarf, with chilly temperatures around 250 K and water-ice clouds.',
      'It moves across the sky at ~8.1 arcseconds per year (~1.3 SPHEREx pixels per year).',
      'In this SPHEREx detector baseline, its measured motion is below 3 sigma, so motion is not statistically proven here—it is tracked at its predicted position alongside its measured offset.',
    ],
    factsAr: [
      'الجرم WISE 0855 هو أبرد قزم بني معروف، بدرجة حرارة قريبة من التجمد (~250 كلفن) وسحب من جليد الماء.',
      'يتحرك عبر السماء بنحو 8.1 ثانية قوسية سنوياً (حوالي 1.3 بكسل في السنة بكاميرا سبيراكس).',
      'في هذه البيانات، لا تزال الثقة الإحصائية لحركته أقل من 3 سيجما، لذا لا نثبت الحركة هنا إحصائياً بل نعرض الموضع المتوقع مقارنة بالمقاس.',
    ],
    analogyEn: 'Like a faint ember gliding behind a foggy window: we know where it should be, and only big multi-year steps prove it moved.',
    analogyAr: 'مثل جمرة خافتة تتحرك ببطء خلف نافذة ضبابية: نعرف أين نتوقعها، لكن الضوضاء تجعل إثبات خطوتها الصغيرة صعباً في سنة واحدة.',
  },
  {
    id: 'case-epsilon-indi',
    aliases: ['epsilon indi', 'eps indi', 'indi', 'case-epsilon-indi'],
    nameEn: 'Epsilon Indi B',
    nameAr: 'إبسيلون إندي B',
    objectTypeEn: 'Binary pair of cool brown dwarfs (~12 light-years away)',
    objectTypeAr: 'توأم من الأقزام البنية الباردة (يبعد نحو 12 سنة ضوئية)',
    factsEn: [
      'Epsilon Indi B is a pair of cool brown dwarfs orbiting a nearby star about 12 light-years away.',
      'It drifts across the sky at roughly 4.7 arcseconds per year.',
      'Across SPHEREx detector D3 frames spanning over 500 days, its position change stands out clearly above 3 sigma.',
    ],
    factsAr: [
      'إبسيلون إندي B هو ثنائي من الأقزام البنية الباردة يدور حول نجم قريب على بعد نحو 12 سنة ضوئية.',
      'ينجرف عبر السماء بسرعة تقارب 4.7 ثانية قوسية في السنة.',
      'عبر لقطات الكاشف D3 الممتدة لأكثر من 500 يوم، تظهر حركته بوضوح فوق عتبة الثقة 3 سيجما.',
    ],
    analogyEn: 'Like two cool embers orbiting each other while strolling slowly across a stadium of stationary streetlights.',
    analogyAr: 'مثل جمرتين باردتين تدوران حول بعضهما أثناء سيرهما ببطء أمام أضواء شوارع ثابتة.',
  },
  {
    id: 'case-rw-aur',
    aliases: ['rw aur', 'rw aurigae', 'case-rw-aur'],
    nameEn: 'RW Aurigae',
    nameAr: 'نجم RW Aurigae',
    objectTypeEn: 'Young star surrounded by dusty gas (~500 light-years away)',
    objectTypeAr: 'نجم شاب محاط بقرص غبار وغاز (يبعد نحو 500 سنة ضوئية)',
    factsEn: [
      'RW Aurigae is a young star wrapped in a dusty disk that makes its infrared brightness dip and flare.',
      'Because it is far away (~500 light-years), it does not visibly drift across the sky over months.',
      'In SPEX, it acts as a still control star to check how steady SPHEREx position measurements are.',
    ],
    factsAr: [
      'نجم RW Aurigae نجم فتي يحيط به قرص من الغبار يسبب تغيراً في سطوعه بالأشعة تحت الحمراء.',
      'لأنه بعيد جداً (نحو 500 سنة ضوئية)، لا يظهر له تحرك في مكانه خلال شهور.',
      'نستخدمه في سبيكس كنجم مرجعي ثابت للتأكد من دقة استقرار قياسات الكاميرا.',
    ],
    analogyEn: 'Like a porch light flickering behind drifting dust: the bulb stays bolted to the wall even when the glow dims and brightens.',
    analogyAr: 'مثل مصباح شرفة يومض خلف غبار عابر: المصباح نفسه ثابت في مكانه حتى لو تغيرت شدة إضاءته.',
  },
  {
    id: 'case-r-dra',
    aliases: ['r dra', 'r draconis', 'case-r-dra'],
    nameEn: 'R Draconis',
    nameAr: 'نجم R Draconis',
    objectTypeEn: 'Pulsating Mira red giant star (~1,400+ light-years away)',
    objectTypeAr: 'نجم عملاق أحمر نابض من نوع ميرا (يبعد أكثر من 1400 سنة ضوئية)',
    factsEn: [
      'R Draconis is an aging red giant star that swells and shrinks in brightness over a cycle of about 245 days.',
      'Because it is so bright in infrared light, its core saturates SPHEREx pixels and its position uses outer wing estimates.',
      'It is far away and serves as a stationary control target—not moving across the sky.',
    ],
    factsAr: [
      'نجم R Draconis عملاق أحمر مسن يتمدد وينكمش ويتغير سطوعه في دورة تقارب 245 يوماً.',
      'شدة سطوعه في الأشعة تحت الحمراء تشبع قلب الكاشف، لذا يُقاس موضعه من الهالة المحيطة به.',
      'لأنه بعيد جداً، يبقى ثابتاً في موضعه ويعمل كهدف مرجعي ثابت لا ينجرف عبر السماء.',
    ],
    analogyEn: 'Like a glowing balloon slowly breathing in and out in one spot—changing brightness without walking across the room.',
    analogyAr: 'مثل بالون مضيء يتنفس ببطء في نفس المكان: يتغير توهجه دون أن ينتقل من موضعه.',
  },
];

export function matchTargetFacts(nameOrCaseId?: string | null): VerifiedTargetFact | null {
  if (!nameOrCaseId) return null;
  const norm = nameOrCaseId.toLowerCase().trim();
  for (const fact of VERIFIED_TARGET_FACTS) {
    if (fact.id === norm || fact.aliases.some((a) => norm.includes(a))) {
      return fact;
    }
  }
  return null;
}

export const BEGINNER_TERMS_MAP = [
  { key: 'proper_motion', termEn: 'proper motion', plainEn: 'how fast it drifts across the sky', plainAr: 'مدى سرعة انجرافه في السماء' },
  { key: 'epoch', termEn: 'epoch', plainEn: 'a snapshot in time', plainAr: 'لقطة زمنية محددة' },
  { key: 'centroid', termEn: 'centroid', plainEn: 'the center of the glowing spot', plainAr: 'مركز النقطة المضيئة' },
  { key: 'sigma', termEn: 'sigma', plainEn: 'how sure we are', plainAr: 'مدى تأكدنا من النتيجة' },
  { key: 'image_subtraction', termEn: 'difference image', plainEn: 'what changed', plainAr: 'ما الذي تغير' },
  { key: 'dq_flags', termEn: 'DQ flags', plainEn: 'bad-pixel warnings', plainAr: 'تحذيرات البكسلات التالفة' },
  { key: 'wing_fit', termEn: 'wing fit', plainEn: 'estimated from the glow around it', plainAr: 'مقدر من الهالة المحيطة به' },
  { key: 'saturated', termEn: 'saturated', plainEn: 'too bright for the detector', plainAr: 'ساطع جداً على الكاشف' },
] as const;
