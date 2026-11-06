export type SPEXMood =
  | 'greeting'
  | 'explaining'
  | 'thinking'
  | 'discovery'
  | 'moving_object'
  | 'artifact'
  | 'eureka'
  | 'calm'
  | 'error'
  | 'joking'
  // Backward compatibility aliases
  | 'curious'
  | 'investigator'
  | 'sassy'
  | 'sarcastic'
  | 'laughter'
  | 'serious'
  | 'surprised'
  | 'happy'
  | 'facepalm'
  | 'normal'
  | 'success'
  | 'proud';

export interface SPEXAsset {
  mood: SPEXMood;
  imagePath: string;
  labelEn: string;
  labelAr: string;
}

// Authentic SPEX original character assets
export const SPEX_HERO_IMAGE = '/assets/spex_hero_standing.png';
export const SPEX_WAVING_HERO = '/assets/spex_hero_waving.png';
export const SPEX_AVATAR_GREETING = '/assets/spex_avatar_greeting.png';
export const SPEX_AVATAR_INVESTIGATOR = '/assets/spex_avatar_investigator.png';

export const SPEX_ASSETS: Record<SPEXMood, SPEXAsset> = {
  // 1. Greeting
  greeting: {
    mood: 'greeting',
    imagePath: SPEX_AVATAR_GREETING,
    labelEn: 'Welcome Greeting',
    labelAr: 'ترحيب SPEX',
  },
  // 2. Explaining
  explaining: {
    mood: 'explaining',
    imagePath: SPEX_AVATAR_INVESTIGATOR,
    labelEn: 'Explaining Evidence',
    labelAr: 'SPEX يشرح الدليل',
  },
  // 3. Thinking
  thinking: {
    mood: 'thinking',
    imagePath: SPEX_AVATAR_INVESTIGATOR,
    labelEn: 'Analyzing Data',
    labelAr: 'SPEX يفكر ويحسب',
  },
  // 4. Interesting Discovery
  discovery: {
    mood: 'discovery',
    imagePath: SPEX_AVATAR_GREETING,
    labelEn: 'Interesting Discovery',
    labelAr: 'اكتشاف فلكي مثير',
  },
  // 5. Possible Moving Object (Cautious investigator)
  moving_object: {
    mood: 'moving_object',
    imagePath: SPEX_AVATAR_INVESTIGATOR,
    labelEn: 'Investigating Possible Motion',
    labelAr: 'فحص حركة محتملة',
  },
  // 6. Artifact Detected
  artifact: {
    mood: 'artifact',
    imagePath: SPEX_AVATAR_INVESTIGATOR,
    labelEn: 'Detector Glitch / Artifact',
    labelAr: 'عيب حساس مستبعد',
  },
  // 7. Strong Evidence / Eureka
  eureka: {
    mood: 'eureka',
    imagePath: SPEX_AVATAR_GREETING,
    labelEn: 'Strong Signal Found!',
    labelAr: 'إشارة مؤكدة واضحة!',
  },
  // 8. No Significant Change (Calm Field)
  calm: {
    mood: 'calm',
    imagePath: SPEX_AVATAR_INVESTIGATOR,
    labelEn: 'Calm & Stable Field',
    labelAr: 'حقل سماوي مستقر',
  },
  // 9. Error
  error: {
    mood: 'error',
    imagePath: SPEX_AVATAR_INVESTIGATOR,
    labelEn: 'Query Issue / Warning',
    labelAr: 'تنبيه في الاتصال أو الإحداثيات',
  },
  // 10. Playful / Joking
  joking: {
    mood: 'joking',
    imagePath: SPEX_AVATAR_GREETING,
    labelEn: 'Astronomy Humor',
    labelAr: 'دعابة فلكية لطيفة',
  },

  // Aliases for compatibility
  curious: {
    mood: 'curious',
    imagePath: SPEX_AVATAR_INVESTIGATOR,
    labelEn: 'Curious',
    labelAr: 'فضول فلكي',
  },
  investigator: {
    mood: 'investigator',
    imagePath: SPEX_AVATAR_INVESTIGATOR,
    labelEn: 'Investigating',
    labelAr: 'فحص دقيق',
  },
  sassy: {
    mood: 'sassy',
    imagePath: SPEX_AVATAR_INVESTIGATOR,
    labelEn: 'Sassy',
    labelAr: 'تهكم علمي',
  },
  sarcastic: {
    mood: 'sarcastic',
    imagePath: SPEX_AVATAR_INVESTIGATOR,
    labelEn: 'Sarcastic',
    labelAr: 'تهكم لطيف',
  },
  laughter: {
    mood: 'laughter',
    imagePath: SPEX_AVATAR_GREETING,
    labelEn: 'Amused',
    labelAr: 'ضحك ساخر',
  },
  serious: {
    mood: 'serious',
    imagePath: SPEX_AVATAR_INVESTIGATOR,
    labelEn: 'Serious',
    labelAr: 'جدية إحصائية',
  },
  surprised: {
    mood: 'surprised',
    imagePath: SPEX_AVATAR_GREETING,
    labelEn: 'Surprised',
    labelAr: 'انبهار كوني',
  },
  happy: {
    mood: 'happy',
    imagePath: SPEX_AVATAR_GREETING,
    labelEn: 'Happy',
    labelAr: 'مبسوط بالنتيجة',
  },
  facepalm: {
    mood: 'facepalm',
    imagePath: SPEX_AVATAR_INVESTIGATOR,
    labelEn: 'Facepalm',
    labelAr: 'عيب حساس',
  },
  normal: {
    mood: 'normal',
    imagePath: SPEX_AVATAR_INVESTIGATOR,
    labelEn: 'Normal',
    labelAr: 'مراقبة عادية',
  },
  success: {
    mood: 'success',
    imagePath: SPEX_AVATAR_GREETING,
    labelEn: 'Success',
    labelAr: 'اكتمل التحليل',
  },
  proud: {
    mood: 'proud',
    imagePath: SPEX_AVATAR_GREETING,
    labelEn: 'Proud',
    labelAr: 'فخور بالإنجاز',
  },
};

