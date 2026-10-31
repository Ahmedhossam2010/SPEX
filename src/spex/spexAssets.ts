export type SPEXMood =
  | 'greeting'
  | 'explaining'
  | 'thinking'
  | 'curious'
  | 'investigator'
  | 'eureka'
  | 'sassy'
  | 'sarcastic'
  | 'joker'
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
  label: string;
}

export const SPEX_ASSETS: Record<SPEXMood, SPEXAsset> = {
  curious: {
    mood: 'curious',
    imagePath: '/assets/aistudio/03_face_curious_cfd683b2.png',
    label: 'فضول فلكي',
  },
  greeting: {
    mood: 'greeting',
    imagePath: '/assets/aistudio/10_pose_friendly_greeting_d504707f.png',
    label: 'ترحيب SPEX',
  },
  explaining: {
    mood: 'explaining',
    imagePath: '/assets/aistudio/08_pose_explaining_536bdeda.png',
    label: 'SPEX بيشرح الدليل',
  },
  thinking: {
    mood: 'thinking',
    imagePath: '/assets/aistudio/07_pose_thinking_17f0c6f3.png',
    label: 'SPEX بيفكر ويحسب',
  },
  investigator: {
    mood: 'investigator',
    imagePath: '/assets/aistudio/14_pose_confused_investigator_17aeebd5.png',
    label: 'فحص فلكي دقيق',
  },
  eureka: {
    mood: 'eureka',
    imagePath: '/assets/aistudio/13_pose_eureka_aa077563.png',
    label: 'إشارة حقيقية واضحة!',
  },
  sassy: {
    mood: 'sassy',
    imagePath: '/assets/aistudio/12_pose_unimpressed_sassy_77457b2d.png',
    label: 'مستغرب من الـArtifact',
  },
  sarcastic: {
    mood: 'sarcastic',
    imagePath: '/assets/aistudio/06_face_sarcastic_f9950fc1.png',
    label: 'تهكم علمي لطيف',
  },
  joker: {
    mood: 'joker',
    imagePath: '/assets/aistudio/09_pose_playful_joker_c412f1b7.png',
    label: 'دعابة فلكية',
  },
  laughter: {
    mood: 'laughter',
    imagePath: '/assets/aistudio/11_pose_amused_laughter_7e7dc5fb.png',
    label: 'ضحك ساخر علمي',
  },
  serious: {
    mood: 'serious',
    imagePath: '/assets/aistudio/04_face_serious_a6a11712.png',
    label: 'جدية إحصائية',
  },
  surprised: {
    mood: 'surprised',
    imagePath: '/assets/aistudio/05_face_surprised_52226baf.png',
    label: 'انبهار كوني',
  },
  happy: {
    mood: 'happy',
    imagePath: '/assets/aistudio/02_face_happy_be4401ce.png',
    label: 'مبسوط بالنتيجة',
  },
  facepalm: {
    mood: 'facepalm',
    imagePath: '/assets/aistudio/16_pose_facepalm_comic_disbelief_8d0d15f9.png',
    label: 'يخرب بيت الـArtifacts 😂',
  },
  normal: {
    mood: 'normal',
    imagePath: '/assets/aistudio/01_face_normal_4a907552.png',
    label: 'وضع المراقبة العادي',
  },
  success: {
    mood: 'success',
    imagePath: '/assets/aistudio/15_pose_proud_success_b2b0dd6c.png',
    label: 'اكتمل التحليل العلمي',
  },
};

export const SPEX_HERO_IMAGE = '/assets/aistudio/character_transparent_fa4756c1.png';
