import { ExplorerRank } from '../progress/progressStore';

export type ChapterActivityType =
  | 'constellation'
  | 'spectrum_match'
  | 'sliding_puzzle'
  | 'spot_difference'
  | '3d'
  | 'explore';

export interface StoryChapter {
  chapterNumber: number;
  requiredRank: ExplorerRank;
  requiredXp: number;
  xpReward: number;
  title: string;
  titleAr: string;
  briefing: string;
  briefingAr: string;
  spexQuote: string;
  spexQuoteAr: string;
  activityType: ChapterActivityType;
  targetCaseId?: string;
}

export const STORY_CHAPTERS: readonly StoryChapter[] = [
  {
    chapterNumber: 1,
    requiredRank: 'Cadet',
    requiredXp: 0,
    xpReward: 75,
    title: 'Chapter 1: The Vanished Beacon',
    titleAr: 'الفصل ١: المنارة المفقودة',
    briefing:
      'A faint distress ping popped up near a starfield edge before fading into background noise. Connect the bright guide stars to lock SPHEREx onto the lost patch.',
    briefingAr:
      'ظهر وميض إشارة خافت قرب حافة حقل نجمي ثم اختفى في الضجيج. صلِ النجوم الدليلية لتوجيه SPHEREx نحو الرقعة المفقودة.',
    spexQuote:
      '“Wait—my faint infrared signal slipped behind those stars! Connect the beacon pattern first!”',
    spexQuoteAr:
      '«لحظة! لقد أفلتت الإشارة الخافتة خلف هذه النجوم! لنصل خريطة الكوكبة الدليلية أولاً!»',
    activityType: 'constellation',
  },
  {
    chapterNumber: 2,
    requiredRank: 'Observer',
    requiredXp: 100,
    xpReward: 90,
    title: 'Chapter 2: Colors Beyond Sight',
    titleAr: 'الفصل ٢: ألوان خارج نطاق الرؤية',
    briefing:
      'We re-centered the sky patch, yet normal visible cameras see empty black sky. Match the infrared molecular dips to tell whether our quarry is icy dust or a freezing dwarf.',
    briefingAr:
      'أعدنا ضبط التلسكوب، لكن الكاميرات المرئية ترى ظلاماً فقط! طابق انخفاضات الطيف تحت الأحمر لمعرفة الجزيئات داخل الجرم.',
    spexQuote:
      '“Zero photons in visible light... let’s read the 102 infrared bands and spot the molecules!”',
    spexQuoteAr:
      '«لا شيء في الضوء المرئي... لنقرأ الأطياف تحت الحمراء ونكتشف البصمات الجزيئية!»',
    activityType: 'spectrum_match',
  },
  {
    chapterNumber: 3,
    requiredRank: 'Observer',
    requiredXp: 180,
    xpReward: 85,
    title: 'Chapter 3: Scramble in Downlink Mosaic',
    titleAr: 'الفصل ٣: إعادة تجميع إطار السماء',
    briefing:
      'Mid-downlink, our 3×3 infrared frame mosaic arrived scrambled! Slide the 8 sky tiles back into calibrated alignment so the moving target path connects cleanly.',
    briefingAr:
      'أثناء الإرسال الفضائي تبعثرت مربعات الإطار تحت الأحمر! حرّك المربعات الثمانية لإعادة بناء لوحة السماء المعايرة.',
    spexQuote:
      '“Our detector tiles got shuffled in transmission—slide them home to restore the dashed trail!”',
    spexQuoteAr:
      '«تبعثرت شرائح الكاشف أثناء الإرسال! رتّبها لاستعادة مسار الجرم الخافت!»',
    activityType: 'sliding_puzzle',
  },
  {
    chapterNumber: 4,
    requiredRank: 'Navigator',
    requiredXp: 250,
    xpReward: 100,
    title: 'Chapter 4: Between the Survey Passes',
    titleAr: 'الفصل ٤: بين تمريرات المسح',
    briefing:
      'Background stars twinkle slightly with detector jitter, yet only ONE faint dot truly jumps between survey passes. Blink Pass A and Pass B to pinpoint the real mover!',
    briefingAr:
      'ترتعش النجوم الثابتة قليلاً بسبب ضجيج الكاشف، لكن نقطة خافتة واحدة فقط تقفز فعلاً بين التمريرات. بدّل بين الحقبتين لتحديدها!',
    spexQuote:
      '“Don’t be fooled by twinkling fixed stars—blink the two passes and tag the true jumper!”',
    spexQuoteAr:
      '«لا تنخدع بارتعاش النجوم الثابتة—شغّل الوميض بين التمريرتين وحدد النقطة المتحركة الحقيقية!»',
    activityType: 'spot_difference',
  },
  {
    chapterNumber: 5,
    requiredRank: 'Analyst',
    requiredXp: 450,
    xpReward: 120,
    title: 'Chapter 5: Deep Calibration Sweep',
    titleAr: 'الفصل ٥: جولة المعايرة المدارية',
    briefing:
      'Board the orbital calibration bay in 3D or inspect Detector D5 inside the observatory deck to finalize sub-pixel alignment before viewing raw NASA cutouts.',
    briefingAr:
      'ادخل محطة المعايرة المدارية ثلاثية الأبعاد لضبط المبرد الحراري والكاشف D5 قبل المعاينة النهائية لإطارات ناسا.',
    spexQuote:
      '“Almost locked! Calibrate the cooling radiator and D5 array inside the orbital station!”',
    spexQuoteAr:
      '«اقتربنا جداً! لنعاير المبرد الحراري ومصفوفة D5 داخل محطة الفضاء!»',
    activityType: '3d',
  },
  {
    chapterNumber: 6,
    requiredRank: 'Discoverer',
    requiredXp: 700,
    xpReward: 150,
    title: 'Chapter 6: The Frozen Neighbor (WISE 0855)',
    titleAr: 'الفصل ٦: الجار المتجمد (WISE 0855)',
    briefing:
      'Signal traced! Inspect real NASA SPHEREx archive frames of WISE 0855 in Explorer, verify the dashed expected track honestly, and claim your Discovery Card.',
    briefingAr:
      'تم تتبع الإشارة! عاين إطارات ناسا SPHEREx الحقيقية للجرم WISE 0855 في المستكشف، وتأكد من المسار المتوقع المتقطع بأمانة علمية.',
    spexQuote:
      '“There it is—WISE 0855! Still near the noise floor, so let’s inspect the real NASA frames honestly!”',
    spexQuoteAr:
      '«ها هو—WISE 0855! لا يزال قريباً من حد الضجيج، لذا فلنعاين بيانات ناسا الحقيقية بكل أمانة علمية!»',
    activityType: 'explore',
    targetCaseId: 'case-wise-0855',
  },
];
