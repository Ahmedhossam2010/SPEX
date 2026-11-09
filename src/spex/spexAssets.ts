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

// Authentic SPEX original character assets (using verified existing SVG files)
export const SPEX_HERO_IMAGE = '/assets/spex/Egyptian_Mech_Cat_Guardian.svg';
export const SPEX_WAVING_HERO = '/assets/spex/10_pose_friendly_greeting.svg';
export const SPEX_AVATAR_GREETING = '/assets/spex/spex_avatar_greeting.svg';
export const SPEX_AVATAR_INVESTIGATOR = '/assets/spex/spex_avatar_investigator.svg';
export const SPEX_EYE_LOGO = '/assets/eye_logo.svg';

export const SPEX_ASSETS: Record<SPEXMood, SPEXAsset> = {
  // 1. Greeting
  greeting: {
    mood: 'greeting',
    imagePath: '/assets/spex/10_pose_friendly_greeting.svg',
    labelEn: 'Welcome Greeting',
    labelAr: 'ترحيب SPEX',
  },
  // 2. Explaining
  explaining: {
    mood: 'explaining',
    imagePath: '/assets/spex/08_pose_explaining.svg',
    labelEn: 'Explaining Evidence',
    labelAr: 'SPEX يشرح الدليل',
  },
  // 3. Thinking
  thinking: {
    mood: 'thinking',
    imagePath: '/assets/spex/07_pose_thinking.svg',
    labelEn: 'Analyzing Data',
    labelAr: 'SPEX يفكر ويحسب',
  },
  // 4. Interesting Discovery
  discovery: {
    mood: 'discovery',
    imagePath: '/assets/spex/13_pose_eureka.svg',
    labelEn: 'Interesting Discovery',
    labelAr: 'اكتشاف فلكي مثير',
  },
  // 5. Possible Moving Object (Cautious investigator)
  moving_object: {
    mood: 'moving_object',
    imagePath: '/assets/spex/14_pose_confused_investigator.svg',
    labelEn: 'Investigating Possible Motion',
    labelAr: 'فحص حركة محتملة',
  },
  // 6. Artifact Detected
  artifact: {
    mood: 'artifact',
    imagePath: '/assets/spex/16_pose_facepalm_comic_disbelief.svg',
    labelEn: 'Detector Glitch / Artifact',
    labelAr: 'عيب حساس مستبعد',
  },
  // 7. Strong Evidence / Eureka
  eureka: {
    mood: 'eureka',
    imagePath: '/assets/spex/13_pose_eureka.svg',
    labelEn: 'Strong Signal Found!',
    labelAr: 'إشارة مؤكدة واضحة!',
  },
  // 8. No Significant Change (Calm Field)
  calm: {
    mood: 'calm',
    imagePath: '/assets/spex/01_face_normal.svg',
    labelEn: 'Calm & Stable Field',
    labelAr: 'حقل سماوي مستقر',
  },
  // 9. Error
  error: {
    mood: 'error',
    imagePath: '/assets/spex/16_pose_facepalm_comic_disbelief.svg',
    labelEn: 'Query Issue / Warning',
    labelAr: 'تنبيه في الاتصال أو الإحداثيات',
  },
  // 10. Playful / Joking
  joking: {
    mood: 'joking',
    imagePath: '/assets/spex/09_pose_playful_joker.svg',
    labelEn: 'Astronomy Humor',
    labelAr: 'دعابة فلكية لطيفة',
  },

  // Aliases for compatibility
  curious: {
    mood: 'curious',
    imagePath: '/assets/spex/03_face_curious.svg',
    labelEn: 'Curious',
    labelAr: 'فضول فلكي',
  },
  investigator: {
    mood: 'investigator',
    imagePath: '/assets/spex/14_pose_confused_investigator.svg',
    labelEn: 'Investigating',
    labelAr: 'فحص دقيق',
  },
  sassy: {
    mood: 'sassy',
    imagePath: '/assets/spex/12_pose_unimpressed_sassy.svg',
    labelEn: 'Sassy',
    labelAr: 'تهكم علمي',
  },
  sarcastic: {
    mood: 'sarcastic',
    imagePath: '/assets/spex/06_face_sarcastic.svg',
    labelEn: 'Sarcastic',
    labelAr: 'تهكم لطيف',
  },
  laughter: {
    mood: 'laughter',
    imagePath: '/assets/spex/11_pose_amused_laughter.svg',
    labelEn: 'Amused',
    labelAr: 'ضحك ساخر',
  },
  serious: {
    mood: 'serious',
    imagePath: '/assets/spex/04_face_serious.svg',
    labelEn: 'Serious',
    labelAr: 'جدية إحصائية',
  },
  surprised: {
    mood: 'surprised',
    imagePath: '/assets/spex/05_face_surprised.svg',
    labelEn: 'Surprised',
    labelAr: 'انبهار كوني',
  },
  happy: {
    mood: 'happy',
    imagePath: '/assets/spex/02_face_happy.svg',
    labelEn: 'Happy',
    labelAr: 'مبسوط بالنتيجة',
  },
  facepalm: {
    mood: 'facepalm',
    imagePath: '/assets/spex/16_pose_facepalm_comic_disbelief.svg',
    labelEn: 'Facepalm',
    labelAr: 'عيب حساس',
  },
  normal: {
    mood: 'normal',
    imagePath: '/assets/spex/01_face_normal.svg',
    labelEn: 'Normal',
    labelAr: 'مراقبة عادية',
  },
  success: {
    mood: 'success',
    imagePath: '/assets/spex/15_pose_proud_success.svg',
    labelEn: 'Success',
    labelAr: 'اكتمل التحليل',
  },
  proud: {
    mood: 'proud',
    imagePath: '/assets/spex/15_pose_proud_success.svg',
    labelEn: 'Proud',
    labelAr: 'فخور بالإنجاز',
  },
};
