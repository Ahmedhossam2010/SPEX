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
  | 'success';

export interface SPEXAsset {
  mood: SPEXMood;
  imagePath: string;
  labelEn: string;
  labelAr: string;
}

export const SPEX_ASSETS: Record<SPEXMood, SPEXAsset> = {
  // 1. Greeting
  greeting: {
    mood: 'greeting',
    imagePath: '/assets/aistudio/10_pose_friendly_greeting_d504707f.png',
    labelEn: 'Welcome Greeting',
    labelAr: 'ترحيب SPEX',
  },
  // 2. Explaining
  explaining: {
    mood: 'explaining',
    imagePath: '/assets/aistudio/08_pose_explaining_536bdeda.png',
    labelEn: 'Explaining Evidence',
    labelAr: 'SPEX يشرح الدليل',
  },
  // 3. Thinking
  thinking: {
    mood: 'thinking',
    imagePath: '/assets/aistudio/07_pose_thinking_17f0c6f3.png',
    labelEn: 'Analyzing Data',
    labelAr: 'SPEX يفكر ويحسب',
  },
  // 4. Interesting Discovery
  discovery: {
    mood: 'discovery',
    imagePath: '/assets/aistudio/03_face_curious_cfd683b2.png',
    labelEn: 'Interesting Discovery',
    labelAr: 'اكتشاف فلكي مثير',
  },
  // 5. Possible Moving Object (Cautious investigator)
  moving_object: {
    mood: 'moving_object',
    imagePath: '/assets/aistudio/14_pose_confused_investigator_17aeebd5.png',
    labelEn: 'Investigating Possible Motion',
    labelAr: 'فحص حركة محتملة',
  },
  // 6. Artifact Detected
  artifact: {
    mood: 'artifact',
    imagePath: '/assets/aistudio/16_pose_facepalm_comic_disbelief_8d0d15f9.png',
    labelEn: 'Detector Glitch / Artifact',
    labelAr: 'عيب حساس مستبعد',
  },
  // 7. Strong Evidence / Eureka
  eureka: {
    mood: 'eureka',
    imagePath: '/assets/aistudio/13_pose_eureka_aa077563.png',
    labelEn: 'Strong Signal Found!',
    labelAr: 'إشارة مؤكدة واضحة!',
  },
  // 8. No Significant Change (Calm Field)
  calm: {
    mood: 'calm',
    imagePath: '/assets/aistudio/01_face_normal_4a907552.png',
    labelEn: 'Calm & Stable Field',
    labelAr: 'حقل سماوي مستقر',
  },
  // 9. Error
  error: {
    mood: 'error',
    imagePath: '/assets/aistudio/06_face_sarcastic_f9950fc1.png',
    labelEn: 'Query Issue / Warning',
    labelAr: 'تنبيه في الاتصال أو الإحداثيات',
  },
  // 10. Playful / Joking
  joking: {
    mood: 'joking',
    imagePath: '/assets/aistudio/09_pose_playful_joker_c412f1b7.png',
    labelEn: 'Astronomy Humor',
    labelAr: 'دعابة فلكية لطيفة',
  },

  // Aliases for compatibility
  curious: {
    mood: 'curious',
    imagePath: '/assets/aistudio/03_face_curious_cfd683b2.png',
    labelEn: 'Curious',
    labelAr: 'فضول فلكي',
  },
  investigator: {
    mood: 'investigator',
    imagePath: '/assets/aistudio/14_pose_confused_investigator_17aeebd5.png',
    labelEn: 'Investigating',
    labelAr: 'فحص دقيق',
  },
  sassy: {
    mood: 'sassy',
    imagePath: '/assets/aistudio/12_pose_unimpressed_sassy_77457b2d.png',
    labelEn: 'Sassy',
    labelAr: 'تهكم علمي',
  },
  sarcastic: {
    mood: 'sarcastic',
    imagePath: '/assets/aistudio/06_face_sarcastic_f9950fc1.png',
    labelEn: 'Sarcastic',
    labelAr: 'تهكم لطيف',
  },
  laughter: {
    mood: 'laughter',
    imagePath: '/assets/aistudio/11_pose_amused_laughter_7e7dc5fb.png',
    labelEn: 'Amused',
    labelAr: 'ضحك ساخر',
  },
  serious: {
    mood: 'serious',
    imagePath: '/assets/aistudio/04_face_serious_a6a11712.png',
    labelEn: 'Serious',
    labelAr: 'جدية إحصائية',
  },
  surprised: {
    mood: 'surprised',
    imagePath: '/assets/aistudio/05_face_surprised_52226baf.png',
    labelEn: 'Surprised',
    labelAr: 'انبهار كوني',
  },
  happy: {
    mood: 'happy',
    imagePath: '/assets/aistudio/02_face_happy_be4401ce.png',
    labelEn: 'Happy',
    labelAr: 'مبسوط بالنتيجة',
  },
  facepalm: {
    mood: 'facepalm',
    imagePath: '/assets/aistudio/16_pose_facepalm_comic_disbelief_8d0d15f9.png',
    labelEn: 'Facepalm',
    labelAr: 'عيب حساس',
  },
  normal: {
    mood: 'normal',
    imagePath: '/assets/aistudio/01_face_normal_4a907552.png',
    labelEn: 'Normal',
    labelAr: 'مراقبة عادية',
  },
  success: {
    mood: 'success',
    imagePath: '/assets/aistudio/15_pose_proud_success_b2b0dd6c.png',
    labelEn: 'Success',
    labelAr: 'اكتمل التحليل',
  },
};

export const SPEX_HERO_IMAGE = '/assets/aistudio/character_transparent_fa4756c1.png';
